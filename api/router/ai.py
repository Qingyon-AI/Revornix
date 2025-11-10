import json
import time
import crud
import schemas
import os
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from openai import OpenAI
from openai.types.chat.chat_completion import ChatCompletion
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from common.dependencies import get_db, get_current_user
from fastapi.responses import StreamingResponse
from common.sql import SessionLocal
from mcp_use import MCPClient, MCPAgent
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage
from common.common import to_serializable, safe_json_loads
from enums.mcp import MCPCategory
from dotenv import load_dotenv
load_dotenv(override=True)

os.environ["TOKENIZERS_PARALLELISM"] = 'false'

ai_router = APIRouter()

def call_llm_stream(ai_client: OpenAI, model: str, message: str):
    stream = ai_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are an intelligent Assistant. You will execute tasks as instructed"},
            {"role": "user", "content": message},
        ],
        stream=True,
    )
    return stream

def call_llm(ai_client: OpenAI, model: str, message: str) -> ChatCompletion:
    completion = ai_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are an intelligent Assistant. You will execute tasks as instructed"},
            {"role": "user", "content": message},
        ]
    )
    return completion
    

@ai_router.post("/model/create", response_model=schemas.ai.ModelCreateResponse)
async def create_model(model_create_request: schemas.ai.ModelCreateRequest,
                       db: Session = Depends(get_db),
                       user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_ai_model = crud.model.create_ai_model(db=db, 
                                             name=model_create_request.name, 
                                             description=model_create_request.description,
                                             provider_id=model_create_request.provider_id)
    db_user_ai_model = crud.model.create_user_ai_model(db=db,
                                                       user_id=user.id,
                                                       ai_model_id=db_ai_model.id,
                                                       api_key=model_create_request.api_key,
                                                       api_url=model_create_request.api_url)
    db.commit()
    return schemas.ai.ModelCreateResponse(id=db_ai_model.id)

@ai_router.post("/model/detail", response_model=schemas.ai.Model)
async def get_ai_model(model_request: schemas.ai.ModelRequest,
                       db: Session = Depends(get_db),
                       user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    data = crud.model.get_ai_model_by_id(db=db,
                                         model_id=model_request.model_id)
    if data is None:
        raise schemas.error.CustomException("The model is not exist", code=404)
    
    db_user_model = crud.model.get_user_ai_model_by_id_decrypted(
        db=db,
        user_id=user.id,
        ai_model_id=model_request.model_id
    )
    
    if db_user_model is None or db_user_model.user_id != user.id:
        raise schemas.error.CustomException("The model is not belong to you", code=403)
    
    provider = crud.model.get_ai_model_provider_by_id(db=db,
                                                      provider_id=data.provider_id)
    db_user_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
        db=db,
        user_id=user.id,
        ai_model_provider_id=data.provider_id
    )
    db_user_model = crud.model.get_user_ai_model_by_id_decrypted(
        db=db,
        user_id=user.id,
        ai_model_id=model_request.model_id
    )
    return schemas.ai.Model(id=data.id,
                            name=data.name,
                            description=data.description,
                            provider=schemas.ai.ModelProvider(id=provider.id,
                                                              name=provider.name,
                                                              description=provider.description,
                                                              api_key=db_user_provider.api_key,
                                                              api_url=db_user_provider.api_url),
                            api_key=db_user_model.api_key,
                            api_url=db_user_model.api_url)

@ai_router.post("/model-provider/detail", response_model=schemas.ai.ModelProvider)
async def get_ai_model(model_provider_request: schemas.ai.ModelProviderRequest,
                       db: Session = Depends(get_db),
                       user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    data = crud.model.get_ai_model_provider_by_id(db=db,
                                                  provider_id=model_provider_request.provider_id)
    if data is None:
        raise schemas.error.CustomException("The model provider is not exist", code=404)
    if data.user_id != user.id:
        raise schemas.error.CustomException("The model provider is not belong to you", code=403)
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
        db=db,
        user_id=user.id,
        ai_model_provider_id=model_provider_request.provider_id
    )
    return schemas.ai.ModelProvider(id=data.id,
                                    name=data.name,
                                    description=data.description,
                                    api_key=db_user_model_provider.api_key,
                                    api_url=db_user_model_provider.api_url)
 
@ai_router.post("/model-provider/create", response_model=schemas.ai.ModelProviderCreateResponse)
async def create_model_provider(model_provider_request: schemas.ai.ModelProviderCreateRequest,
                                db: Session = Depends(get_db),
                                user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_ai_model_provider = crud.model.create_ai_model_provider(db=db, 
                                                               name=model_provider_request.name, 
                                                               description=model_provider_request.description)
    db_user_ai_model_provider = crud.model.create_user_ai_model_provider(db=db,
                                                                         user_id=user.id,
                                                                         ai_model_provider_id=db_ai_model_provider.id,
                                                                         api_key=model_provider_request.api_key,
                                                                         api_url=model_provider_request.api_url)
    db.commit()
    return schemas.ai.ModelProviderCreateResponse(id=db_ai_model_provider.id)
 
@ai_router.post("/model/delete", response_model=schemas.common.NormalResponse)
async def delete_ai_model(delete_model_request: schemas.ai.DeleteModelRequest,
                          db: Session = Depends(get_db),
                          user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.model.delete_ai_models_by_user_id_and_model_ids(
        db=db, 
        user_id=user.id,
        model_ids=delete_model_request.model_ids
    )
    if user.default_revornix_model_id in delete_model_request.model_ids:
        user.default_revornix_model_id = None
    if user.default_document_reader_model_id in delete_model_request.model_ids:
        user.default_document_reader_model_id = None
    db.commit()
    return schemas.common.SuccessResponse()

@ai_router.post("/model-provider/delete", response_model=schemas.common.NormalResponse)
async def delete_ai_model(delete_model_request: schemas.ai.DeleteModelProviderRequest,
                          db: Session = Depends(get_db),
                          user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.model.delete_ai_model_providers(db=db, 
                                         user_id=user.id,
                                         provider_ids=delete_model_request.provider_ids)
    for provider_id in delete_model_request.provider_ids:
        db_models = crud.model.search_ai_models_for_user_ai_model_provider(
            db=db, 
            user_id=user.id, 
            provider_id=provider_id
        )
        db_model_ids = [model.id for model in db_models]
        crud.model.delete_ai_models_by_user_id_and_model_ids(
            db=db, 
            user_id=user.id, 
            model_ids=db_model_ids
        )
    if user.default_revornix_model_id in db_model_ids:
        user.default_revornix_model_id = None
    if user.default_document_reader_model_id in db_model_ids:
        user.default_document_reader_model_id = None
    db.commit()
    return schemas.common.SuccessResponse()
     
@ai_router.post("/model/search", response_model=schemas.ai.ModelSearchResponse)
async def list_ai_model(model_search_request: schemas.ai.ModelSearchRequest,
                        db: Session = Depends(get_db),
                        user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    data = []
    db_ai_models = crud.model.search_ai_models_for_user_ai_model_provider(
        db=db, 
        user_id=user.id, 
        keyword=model_search_request.keyword,
        provider_id=model_search_request.provider_id
    )
    for item in db_ai_models:
        db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, 
                                                                   provider_id=item.provider_id)
        db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
            db=db,
            user_id=user.id,
            ai_model_provider_id=db_model_provider.id
        )
        db_user_ai_model = crud.model.get_user_ai_model_by_id_decrypted(
            db=db,
            user_id=user.id,
            ai_model_id=item.id
        )
        data.append(
            schemas.ai.Model(id=item.id,
                             name=item.name,
                             description=item.description,
                             api_key=db_user_ai_model.api_key,
                             api_url=db_user_ai_model.api_url,
                             provider=schemas.ai.ModelProvider(id=db_model_provider.id,
                                                               name=db_model_provider.name,
                                                               description=db_model_provider.description,
                                                               api_key=db_user_model_provider.api_key,
                                                               api_url=db_user_model_provider.api_url))
        )
    return schemas.ai.ModelSearchResponse(data=data)

@ai_router.post("/model-provider/search", response_model=schemas.ai.ModelProviderSearchResponse)
async def list_ai_model_provider(model_provider_search_request: schemas.ai.ModelProviderSearchRequest,
                                 db: Session = Depends(get_db),
                                 user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    data = []
    db_ai_model_providers = crud.model.search_ai_model_providers_for_user(
        db=db, 
        user_id=user.id,
        keyword=model_provider_search_request.keyword
    )
    for item in db_ai_model_providers:
        db_user_ai_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
            db=db,
            user_id=user.id,
            ai_model_provider_id=item.id
        )
        data.append(
            schemas.ai.ModelProvider(id=item.id,
                                     name=item.name,
                                     description=item.description,
                                     api_key=db_user_ai_model_provider.api_key,
                                     api_url=db_user_ai_model_provider.api_url)
        )
    return schemas.ai.ModelProviderSearchResponse(data=data)

@ai_router.post("/model/update", response_model=schemas.common.NormalResponse)
async def update_ai_model(model_update_request: schemas.ai.ModelUpdateRequest,
                          db: Session = Depends(get_db),
                          user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    db_ai_model = crud.model.get_ai_model_by_id(db=db,
                                                model_id=model_update_request.id)
    if db_ai_model is None:
        raise schemas.error.CustomException("The model is not exist", code=404)
    db_user_ai_model = crud.model.get_user_ai_model_by_id_decrypted(
        db=db,
        user_id=user.id,
        ai_model_id=db_ai_model.id
    )
    if db_user_ai_model is None or db_user_ai_model.user_id != user.id:
        raise schemas.error.CustomException("The model is not belong to you", code=403)
    if model_update_request.name is not None:
        db_ai_model.name = model_update_request.name
    if model_update_request.description is not None:
        db_ai_model.description = model_update_request.description
    if model_update_request.api_key is not None:
        db_ai_model.api_key = model_update_request.api_key
    if model_update_request.api_url is not None:
        db_ai_model.api_url = model_update_request.api_url
    db_ai_model.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()

@ai_router.post("/model-provider/update", response_model=schemas.common.NormalResponse)
async def update_ai_model_provider(model_provider_update_request: schemas.ai.ModelProviderUpdateRequest,
                                   db: Session = Depends(get_db),
                                   user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    db_ai_model_provider = crud.model.get_ai_model_provider_by_id(db=db,
                                                                  provider_id=model_provider_update_request.id)
    if db_ai_model_provider is None:
        raise schemas.error.CustomException("The model provider is not exist", code=404)
    db_user_ai_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
            db=db,
            user_id=user.id,
            ai_model_provider_id=model_provider_update_request.id
        )
    if db_user_ai_model_provider.user_id != user.id:
        raise schemas.error.CustomException("The model provider is not belong to you", code=403)
    if model_provider_update_request.name is not None:
        db_ai_model_provider.name = model_provider_update_request.name
    if model_provider_update_request.description is not None:
        db_ai_model_provider.description = model_provider_update_request.description
    if model_provider_update_request.api_key is not None:
        db_user_ai_model_provider.api_key = model_provider_update_request.api_key
    if model_provider_update_request.api_url is not None:
        db_user_ai_model_provider.api_url = model_provider_update_request.api_url
    db_ai_model_provider.update_time = now
    db_user_ai_model_provider.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()
    
async def create_agent(user_id: int, enable_mcp: bool = False):
    db = SessionLocal()
    user = crud.user.get_user_by_id(db=db, user_id=user_id)
    model_id = user.default_revornix_model_id
    if model_id is None:
        raise schemas.error.CustomException("The user has not set a default model", code=400)
    db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
    if db_model is None:
        raise schemas.error.CustomException("The model is not exist", code=404)
    db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, provider_id=db_model.provider_id)
    if db_model_provider is None:
        raise schemas.error.CustomException("The model provider is not exist", code=404)
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
        db=db, 
        user_id=user.id, 
        ai_model_provider_id=db_model.provider_id
    )
    mcp_client = MCPClient()
    if enable_mcp:
        mcp_servers = crud.mcp.search_mcp_servers(db=db, user_id=user_id)
        for mcp_server in mcp_servers:
            if not mcp_server.enable:
                continue
            else:
                if mcp_server.category == MCPCategory.STD:
                    stdio_mcp_server = crud.mcp.get_std_mcp_server_by_base_server_id(
                        db=db, 
                        base_server_id=mcp_server.id
                    )
                    mcp_client.add_server(name=mcp_server.name,
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
                    mcp_client.add_server(name=mcp_server.name,
                                          server_config={
                                              "url": http_mcp_server.url,
                                              "headers": safe_json_loads(http_mcp_server.headers, {})
                                              }
                                          )
    llm = ChatOpenAI(
        model=db_model.name,
        api_key=db_user_model_provider.api_key,
        base_url=db_user_model_provider.api_url,
    )
    db.close()
    return MCPAgent(llm=llm, client=mcp_client)

async def stream_ops(user_id: int, messages: list, enable_mcp: bool = False):
    agent = await create_agent(user_id=user_id, enable_mcp=enable_mcp)
    agent.clear_conversation_history()
    # 弹出最后一条消息并将其作为query
    query = messages.pop().content
    for message in messages:
        if message.role == "user":
            agent.add_to_history(HumanMessage(content=message.content))
        elif message.role == "assistant":
            agent.add_to_history(AIMessage(content=message.content))
    async for event in agent.stream_events(
        query=f"{query}",
    ):
        event_type = event.get("event")
        data = event.get("data", {})
        run_id = event.get("run_id")
        parent_ids = event.get("parent_ids")
        sse_data = {
            "parent_ids": parent_ids,
            "run_id": run_id,
            "event": event_type,
            "timestamp": time.time(),
            "data": to_serializable(data),
        }
        yield f"{json.dumps(to_serializable(sse_data), ensure_ascii=False)}\n\n"
    sse_data = {
        "event": "done",
        "timestamp": time.time(),
        "data": {},
        "run_id": run_id,
    }
    yield f"{json.dumps(to_serializable(sse_data), ensure_ascii=False)}\n\n"

@ai_router.post("/ask")
async def ask_ai(chat_messages: schemas.ai.ChatMessages, 
                 user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    enable_mcp = chat_messages.enable_mcp
    messages = chat_messages.messages
    
    return StreamingResponse(
        stream_ops(user_id=user.id, messages=messages, enable_mcp=enable_mcp), 
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            }
        )