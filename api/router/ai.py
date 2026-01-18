import json
import time
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langfuse import propagate_attributes
from mcp_use import MCPAgent, MCPClient
from pydantic import SecretStr
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.common import safe_json_loads
from common.dependencies import (
    check_deployed_by_official_in_fuc,
    get_current_user,
    get_db,
    plan_ability_checked_in_func,
)
from common.encrypt import encrypt_api_key
from common.interpret_event import EventInterpreter
from common.jwt_utils import create_token
from common.logger import exception_logger
from data.sql.base import SessionLocal
from enums.ability import Ability
from enums.mcp import MCPCategory
from enums.model import UserModelProviderRole
from proxy.ai_model_proxy import AIModelProxy
from schemas.ai import ChatItem

ai_router = APIRouter()

@ai_router.post("/model/create", response_model=schemas.ai.ModelCreateResponse)
def create_model(
    model_create_request: schemas.ai.ModelCreateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_model_provider = crud.model.get_ai_model_provider_by_id(
        db=db,
        provider_id=model_create_request.provider_id
    )
    if db_model_provider is None:
        raise schemas.error.CustomException("The model provider is not exist", code=404)
    if db_model_provider.creator_id != user.id:
        raise schemas.error.CustomException("The model provider is not belong to you, so you can't add model to it", code=403)

    db_ai_model = crud.model.create_ai_model(
        db=db,
        name=model_create_request.name,
        description=model_create_request.description,
        provider_id=model_create_request.provider_id
    )
    db.commit()
    return schemas.ai.ModelCreateResponse(id=db_ai_model.id)

@ai_router.post("/model/detail", response_model=schemas.ai.Model)
def get_ai_model(
    model_request: schemas.ai.ModelRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    ai_model = crud.model.get_ai_model_by_id(
        db=db,
        model_id=model_request.model_id
    )
    if ai_model is None:
        raise schemas.error.CustomException("The model is not exist", code=404)

    ai_model_provider = crud.model.get_ai_model_provider_by_id(
        db=db,
        provider_id=ai_model.provider_id
    )
    if ai_model_provider is None:
        raise schemas.error.CustomException("The model provider of the model is not exist", code=404)

    if ai_model_provider.creator_id == user.id:
        return schemas.ai.Model.model_validate(ai_model)
    else:
        if ai_model_provider.is_public:
            return schemas.ai.Model.model_validate(ai_model)
        else:
            raise schemas.error.CustomException("The model provider of the model is not belong to you", code=403)

@ai_router.post("/model-provider/create", response_model=schemas.ai.ModelProviderCreateResponse)
def create_model_provider(
    model_provider_request: schemas.ai.ModelProviderCreateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_ai_model_provider = crud.model.create_ai_model_provider(
        db=db,
        name=model_provider_request.name,
        description=model_provider_request.description,
        creator_id=user.id,
        api_key=model_provider_request.api_key,
        base_url=model_provider_request.base_url,
        is_public=model_provider_request.is_public
    )
    crud.model.create_user_ai_model_provider(
        db=db,
        user_id=user.id,
        ai_model_provider_id=db_ai_model_provider.id,
        role=UserModelProviderRole.CREATOR
    )
    db.commit()
    return schemas.ai.ModelProviderCreateResponse(id=db_ai_model_provider.id)

# 只有创建者能获取到模型的完整配置 否则即使公开 其他用户也只能获取到除密钥和url以外的信息
@ai_router.post("/model-provider/detail", response_model=schemas.ai.ModelProviderDetail)
def get_ai_model_provider(
    model_provider_request: schemas.ai.ModelProviderRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    ai_model_provider = crud.model.get_ai_model_provider_by_id(
        db=db,
        provider_id=model_provider_request.provider_id
    )
    if ai_model_provider is None:
        raise schemas.error.CustomException("The model provider is not exist", code=404)

    if ai_model_provider.creator_id == user.id:
        return schemas.ai.ModelProviderDetail.model_validate(ai_model_provider)

    if not ai_model_provider.is_public:
        raise schemas.error.CustomException("The private model provider is not belong to you", code=403)

    db_user_ai_model_provider = crud.model.get_user_ai_model_provider_by_user_and_model_provider_id(
        db=db,
        user_id=user.id,
        ai_model_provider_id=ai_model_provider.id,
        filter_role=UserModelProviderRole.FORKER
    )
    if db_user_ai_model_provider is not None:
        return schemas.ai.ModelProviderDetail.model_validate(ai_model_provider).model_copy(update={
            "is_forked": False
        })

    return schemas.ai.ModelProvider.model_validate(ai_model_provider).model_copy(update={
        "is_forked": True
    })

@ai_router.post("/model/delete", response_model=schemas.common.NormalResponse)
def delete_ai_model(
    delete_model_request: schemas.ai.DeleteModelRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)

    for model_id in delete_model_request.model_ids:
        db_model = crud.model.get_ai_model_by_id(
            db=db,
            model_id=model_id
        )
        if db_model is None:
            raise schemas.error.CustomException("The model is not exist", code=404)
        db_model_provider = crud.model.get_ai_model_provider_by_id(
            db=db,
            provider_id=db_model.provider_id
        )
        if db_model_provider is None:
            raise schemas.error.CustomException("The model provider of the model is not exist, please contact the administrator for help", code=500)
        if db_model_provider.creator_id != user.id:
            raise schemas.error.CustomException("The model provider of this model is not belong to you, so you can not delete this model", code=403)
        db_model.delete_at = now

    if user.default_revornix_model_id in delete_model_request.model_ids:
        user.default_revornix_model_id = None
    if user.default_document_reader_model_id in delete_model_request.model_ids:
        user.default_document_reader_model_id = None
    db.commit()
    return schemas.common.SuccessResponse()

@ai_router.post("/model-provider/delete", response_model=schemas.common.NormalResponse)
def delete_ai_model_provider(
    delete_model_request: schemas.ai.DeleteModelProviderRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    now = datetime.now(tz=timezone.utc)

    db_model_provider = crud.model.get_ai_model_provider_by_id(
        db=db,
        provider_id=delete_model_request.provider_id
    )
    if db_model_provider is None:
        raise schemas.error.CustomException("The model provider is not exist", code=404)
    if db_model_provider.creator_id != user.id:
        raise schemas.error.CustomException("The model provider is not belong to you", code=403)

    db_models = crud.model.get_ai_models_for_ai_model_provider(
        db=db,
        provider_id=delete_model_request.provider_id
    )
    for db_model in db_models:
        db_model.delete_at = now

    db_model_provider.delete_at = now

    db_model_ids = [
        model.id for model in db_models
    ]
    if user.default_revornix_model_id in db_model_ids:
        user.default_revornix_model_id = None
    if user.default_document_reader_model_id in db_model_ids:
        user.default_document_reader_model_id = None
    db.commit()
    return schemas.common.SuccessResponse()

# 搜索当前所有我可以使用的模型供应商
@ai_router.post("/model-provider/provided", response_model=schemas.pagination.InifiniteScrollPagnition[schemas.ai.ModelProvider])
def list_ai_model_provider(
    model_provider_search_request: schemas.ai.ModelProviderSearchRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    next_model_provider = None
    db_ai_model_providers = crud.model.search_ai_model_providers_for_user(
        db=db,
        user_id=user.id,
        keyword=model_provider_search_request.keyword
    )
    if len(db_ai_model_providers) < model_provider_search_request.limit or len(db_ai_model_providers) == 0:
        has_more = False
    if len(db_ai_model_providers) == model_provider_search_request.limit:
        next_model_provider = crud.model.search_next_ai_model_providers_for_user(
            db=db,
            user_id=user.id,
            provider=db_ai_model_providers[-1][0],
            keyword=model_provider_search_request.keyword
        )
        has_more = next_model_provider is not None
        next_start = next_model_provider.id if next_model_provider is not None else None
    total = crud.model.count_all_ai_model_providers_for_user(
        db=db,
        user_id=user.id,
        keyword=model_provider_search_request.keyword
    )
    next_start = next_model_provider.id if next_model_provider is not None else None
    data = [
        schemas.ai.ModelProvider.model_validate(item[0]).model_copy(update={
            "is_forked": crud.model.get_user_ai_model_provider_by_user_and_model_provider_id(
                db=db,
                user_id=user.id,
                ai_model_provider_id=item[0].id,
                filter_role=UserModelProviderRole.FORKER
            ) is not None
        })
        for item in db_ai_model_providers
    ]
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=data,
        start=model_provider_search_request.start,
        limit=model_provider_search_request.limit,
        has_more=has_more,
        next_start=next_start
    )

# 将对应的model provider加入自己的备选区
@ai_router.post("/model-provider/fork", response_model=schemas.common.NormalResponse)
def fork_ai_model_provider(
    model_provider_fork_request: schemas.ai.ModelProviderForkRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    db_ai_model_provider = crud.model.get_ai_model_provider_by_id(
        db=db,
        provider_id=model_provider_fork_request.provider_id
    )
    if db_ai_model_provider is None:
        raise schemas.error.CustomException("The model provider is not exist", code=404)
    if db_ai_model_provider.creator_id != user.id and not db_ai_model_provider.is_public:
        raise schemas.error.CustomException("You can't include the private model provider", code=403)

    if db_ai_model_provider.creator_id == user.id:
        raise schemas.error.CustomException("You can't fork your own model provider", code=403)

    db_user_ai_model_provider = crud.model.get_user_ai_model_provider_by_user_and_model_provider_id(
        db=db,
        user_id=user.id,
        ai_model_provider_id=model_provider_fork_request.provider_id,
        filter_role=UserModelProviderRole.FORKER
    )
    if db_user_ai_model_provider is not None:
        if model_provider_fork_request.status:
            raise schemas.error.CustomException("You have already fork the model provider", code=403)
        else:
            db_user_ai_model_provider.delete_at = now
    else:
        if not model_provider_fork_request.status:
            raise schemas.error.CustomException("You have not fork the model provider", code=403)
        else:
            db_user_ai_model_provider = crud.model.create_user_ai_model_provider(
                db=db,
                user_id=user.id,
                ai_model_provider_id=model_provider_fork_request.provider_id,
                role=UserModelProviderRole.FORKER
            )
    db.commit()
    return schemas.common.SuccessResponse()

@ai_router.post("/model/search", response_model=schemas.ai.ModelSearchResponse)
def list_ai_model(
    model_search_request: schemas.ai.ModelSearchRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    data = []
    # 如果传递了provider_id 那么就获取该provider目录下的所有模型
    if model_search_request.provider_id is not None:
        db_ai_model_provider = crud.model.get_ai_model_provider_by_id(
            db=db,
            provider_id=model_search_request.provider_id
        )
        if db_ai_model_provider is None:
            raise schemas.error.CustomException("The model provider is not exist", code=404)
        if db_ai_model_provider.creator_id != user.id and not db_ai_model_provider.is_public:
            raise schemas.error.CustomException("You can't search the private model provider", code=403)
        db_models = crud.model.get_ai_models_for_ai_model_provider(
            db=db,
            provider_id=model_search_request.provider_id
        )
        for db_model in db_models:
            data.append(schemas.ai.Model.model_validate(db_model))
    # 如果没有传递 那就获取当前用户所有可用模型
    else:
        db_ai_model_providers = crud.model.get_ai_model_providers_for_user(
            db=db,
            user_id=user.id,
            keyword=model_search_request.keyword
        )
        for db_ai_model_provider in db_ai_model_providers:
            if not db_ai_model_provider.is_public and db_ai_model_provider.creator_id != user.id:
                continue
            db_models = crud.model.get_ai_models_for_ai_model_provider(
                db=db,
                provider_id=db_ai_model_provider.id
            )
            for db_model in db_models:
                data.append(schemas.ai.Model.model_validate(db_model))

    return schemas.ai.ModelSearchResponse(data=data)

@ai_router.post("/model/update", response_model=schemas.common.NormalResponse)
def update_ai_model(
    model_update_request: schemas.ai.ModelUpdateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    db_ai_model = crud.model.get_ai_model_by_id(
        db=db,
        model_id=model_update_request.id
    )
    if db_ai_model is None:
        raise schemas.error.CustomException("The model is not exist", code=404)
    db_ai_model_provider = crud.model.get_ai_model_provider_by_id(
        db=db,
        provider_id=db_ai_model.provider_id
    )
    if db_ai_model_provider is None:
        raise schemas.error.CustomException("The model provider of the model is not exist, please contact the admin for help", code=500)
    if db_ai_model_provider.creator_id != user.id:
        raise schemas.error.CustomException("The model provider of the model is not belong to you", code=403)

    if model_update_request.name is not None:
        db_ai_model.name = model_update_request.name
    if model_update_request.description is not None:
        db_ai_model.description = model_update_request.description
    db_ai_model.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()

@ai_router.post("/model-provider/update", response_model=schemas.common.NormalResponse)
def update_ai_model_provider(
    model_provider_update_request: schemas.ai.ModelProviderUpdateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    db_ai_model_provider = crud.model.get_ai_model_provider_by_id(
        db=db,
        provider_id=model_provider_update_request.id
    )
    if db_ai_model_provider is None:
        raise schemas.error.CustomException("The model provider is not exist", code=404)
    if db_ai_model_provider.creator_id != user.id:
        raise schemas.error.CustomException("The model provider is not belong to you", code=403)

    if model_provider_update_request.name is not None:
        db_ai_model_provider.name = model_provider_update_request.name
    if model_provider_update_request.description is not None:
        db_ai_model_provider.description = model_provider_update_request.description
    db_ai_model_provider.update_time = now
    if model_provider_update_request.api_key is not None:
        db_ai_model_provider.api_key = encrypt_api_key(model_provider_update_request.api_key)
    if model_provider_update_request.base_url is not None:
        db_ai_model_provider.base_url = model_provider_update_request.base_url
    if model_provider_update_request.is_public is not None:
        db_ai_model_provider.is_public = model_provider_update_request.is_public
    db_ai_model_provider.update_time = now

    db.commit()
    return schemas.common.SuccessResponse()

async def create_agent(
    user_id: int,
    enable_mcp: bool = False
):
    db = SessionLocal()
    try:
        user = crud.user.get_user_by_id(
            db=db,
            user_id=user_id
        )
        if user is None:
            raise schemas.error.CustomException("The user is not exist", code=404)
        model_id = user.default_revornix_model_id
        if model_id is None:
            raise schemas.error.CustomException("The user has not set a default model", code=400)
        model_configuration = (await AIModelProxy.create(
            user_id=user_id,
            model_id=model_id
        )).get_configuration()

        api_key = SecretStr(model_configuration.api_key if model_configuration.api_key is not None else "")
        base_url = model_configuration.base_url

        mcp_client = MCPClient()
        access_token, _ = create_token(
            user=user
        )
        auth_status = await plan_ability_checked_in_func(
            ability=Ability.MCP_CLIENT.value,
            authorization=f'Bearer {access_token}'
        )
        deployed_by_official_in_func = check_deployed_by_official_in_fuc()
        mcp_enabled = False
        if enable_mcp:
            if not deployed_by_official_in_func:
                mcp_enabled = True
            else:
                mcp_enabled = auth_status
        if mcp_enabled:
            mcp_servers = crud.mcp.search_mcp_servers(
                db=db,
                user_id=user_id
            )
            for mcp_server in mcp_servers:
                if not mcp_server.enable:
                    continue
                if mcp_server.category == MCPCategory.STD:
                    stdio_mcp_server = crud.mcp.get_std_mcp_server_by_base_server_id(
                        db=db,
                        base_server_id=mcp_server.id
                    )
                    if stdio_mcp_server is None:
                        continue
                    mcp_client.add_server(
                        name=mcp_server.name,
                        server_config={
                            "command": stdio_mcp_server.cmd,
                            "args": safe_json_loads(stdio_mcp_server.args, []),
                            "env": safe_json_loads(stdio_mcp_server.env, {})
                        }
                    )
                if mcp_server.category == MCPCategory.HTTP:
                    http_mcp_server = crud.mcp.get_http_mcp_server_by_base_server_id(
                        db=db,
                        base_server_id=mcp_server.id
                    )
                    if http_mcp_server is None:
                        continue
                    mcp_client.add_server(
                        name=mcp_server.name,
                        server_config={
                            "url": http_mcp_server.url,
                            "headers": safe_json_loads(http_mcp_server.headers, {})
                        }
                    )
        llm = ChatOpenAI(
            model=model_configuration.model_name,
            api_key=api_key,
            base_url=base_url
        )
        return MCPAgent(llm=llm, client=mcp_client)
    except Exception as e:
        exception_logger.error(f"Failed to create agent: {e}")
        raise
    finally:
        db.close()

async def stream_ops_with_agent(
    user_id: int,
    agent: MCPAgent,
    messages: list[ChatItem],
) -> AsyncGenerator[str, None]:
    interpreter = EventInterpreter()

    try:
        # ==========================
        # 1️⃣ 初始化上下文
        # ==========================
        agent.clear_conversation_history()

        query = messages.pop().content
        for message in messages:
            if message.role == "user":
                agent.add_to_history(HumanMessage(content=message.content))
            elif message.role == "assistant":
                agent.add_to_history(AIMessage(content=message.content))

        # 返回的消息的id
        chat_id = uuid4().hex
        # ==========================
        # 2️⃣ 开始流式执行
        # ==========================
        with propagate_attributes(
            user_id=str(user_id),
            tags=[f"model:{agent._model_name}"],
        ):

            async for raw_event in agent.stream_events(query=query):
                # 🔥 核心：解释 LangGraph / MCP 事件
                for interpreted in interpreter.interpret(
                    event=raw_event,
                    chat_id=chat_id
                ):
                    if not interpreted:
                        continue

                    yield _sse(interpreted)

    except Exception as e:
        # ==========================
        # 3️⃣ 错误事件
        # ==========================
        exception_logger.error(f"Failed to stream ops with agent: {e}")
        yield _sse(
            {
                "chat_id": chat_id,
                "type": "error",
                "timestamp": time.time(),
                "trace": {},
                "payload": {
                    "code": "SERVER_ERROR",
                    "message": str(e)
                },
            }
        )

    # ==========================
    # 4️⃣ 完成事件
    # ==========================
    yield _sse(
        {
            "chat_id": chat_id,
            "type": "done",
            "timestamp": time.time(),
            "trace": {},
            "payload": {"success": True},
        }
    )

def _sse(event: dict) -> str:
    """
    SSE 格式统一出口
    """
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

@ai_router.post("/ask")
async def ask_ai(
    chat_messages: schemas.ai.ChatMessages,
    user: models.user.User = Depends(get_current_user)
):
    enable_mcp = chat_messages.enable_mcp
    messages = chat_messages.messages

    try:
        agent = await create_agent(
            user_id=user.id,
            enable_mcp=enable_mcp
        )
    except Exception as e:
        raise schemas.error.CustomException(
            message=e,
            code=400
        ) from e
    return StreamingResponse(
        stream_ops_with_agent(
            user_id=user.id,
            agent=agent,
            messages=messages
        ),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
