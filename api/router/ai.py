import json
import crud
import schemas
import os
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from openai import OpenAI
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from common.dependencies import get_db, get_current_user
from schemas.ai import ChatItem, ResponseItem
from dotenv import load_dotenv

load_dotenv(override=True)

os.environ["TOKENIZERS_PARALLELISM"] = 'false'

ai_router = APIRouter()

from openai import OpenAI
from openai.types.chat.chat_completion import ChatCompletion

def call_llm_stream(ai_client: OpenAI, message: str):
    stream = ai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an intelligent Assistant. You will execute tasks as instructed"},
            {"role": "user", "content": message},
        ],
        stream=True,
    )
    return stream

def call_llm(ai_client: OpenAI, message: str) -> ChatCompletion:
    completion = ai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an intelligent Assistant. You will execute tasks as instructed"},
            {"role": "user", "content": message},
        ]
    )
    return completion
    

@ai_router.post("/model/create", response_model=schemas.common.NormalResponse)
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
    return schemas.common.SuccessResponse()

@ai_router.post("/model/detail", response_model=schemas.ai.Model)
async def get_ai_model(model_request: schemas.ai.ModelRequest,
                       db: Session = Depends(get_db),
                       user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    data = crud.model.get_ai_model_by_id(db=db,
                                         model_id=model_request.model_id)
    if data is None:
        raise schemas.error.CustomException("The model is not exist", code=404)
    
    db_user_model = crud.model.get_user_ai_model_by_id(db=db,
                                                       user_id=user.id,
                                                       model_id=model_request.model_id)
    
    if db_user_model is None or db_user_model.user_id != user.id:
        raise schemas.error.CustomException("The model is not belong to you", code=403)
    
    provider = crud.model.get_ai_model_provider_by_id(db=db,
                                                      provider_id=data.provider_id)
    db_user_provider = crud.model.get_user_ai_model_provider_by_id(db=db,
                                                                   user_id=user.id,
                                                                   provider_id=data.provider_id)
    db_user_model = crud.model.get_user_ai_model_by_id(db=db,
                                                       user_id=user.id,
                                                       model_id=model_request.model_id)
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
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id(db=db,
                                                                         user_id=user.id,
                                                                         provider_id=model_provider_request.provider_id)
    return schemas.ai.ModelProvider(id=data.id,
                                    name=data.name,
                                    description=data.description,
                                    api_key=db_user_model_provider.api_key,
                                    api_url=db_user_model_provider.api_url)
 
@ai_router.post("/model-provider/create", response_model=schemas.common.NormalResponse)
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
    return schemas.common.SuccessResponse()
 
@ai_router.post("/model/delete", response_model=schemas.common.NormalResponse)
async def delete_ai_model(delete_model_request: schemas.ai.DeleteModelRequest,
                          db: Session = Depends(get_db),
                          user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.model.delete_ai_models(db=db, 
                                user_id=user.id,
                                model_ids=delete_model_request.model_ids)
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
        db_models = crud.model.search_ai_models(db=db, user_id=user.id, provider_id=provider_id)
        db_model_ids = [model.id for model in db_models]
        crud.model.delete_ai_models(db=db, user_id=user.id, model_ids=db_model_ids)
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
    db_ai_models = crud.model.search_ai_models(db=db, 
                                               user_id=user.id, 
                                               keyword=model_search_request.keyword,
                                               provider_id=model_search_request.provider_id)
    for item in db_ai_models:
        db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, 
                                                                   provider_id=item.provider_id)
        db_user_model_provider = crud.model.get_user_ai_model_provider_by_id(db=db,
                                                                             user_id=user.id,
                                                                             provider_id=db_model_provider.id)
        db_user_ai_model = crud.model.get_user_ai_model_by_id(db=db,
                                                              user_id=user.id,
                                                              model_id=item.id)
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
    db_ai_model_providers = crud.model.search_ai_model_providers(db=db, 
                                                                 user_id=user.id,
                                                                 keyword=model_provider_search_request.keyword)
    for item in db_ai_model_providers:
        db_user_ai_model_provider = crud.model.get_user_ai_model_provider_by_id(db=db,
                                                                                user_id=user.id,
                                                                                provider_id=item.id)
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
    db_user_ai_model = crud.model.get_user_ai_model_by_id(db=db,
                                                          user_id=user.id,
                                                          model_id=db_ai_model.id)
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
    if db_ai_model_provider.user_id != user.id:
        raise schemas.error.CustomException("The model provider is not belong to you", code=403)
    if model_provider_update_request.name is not None:
        db_ai_model_provider.name = model_provider_update_request.name
    if model_provider_update_request.description is not None:
        db_ai_model_provider.description = model_provider_update_request.description
    if model_provider_update_request.api_key is not None:
        db_ai_model_provider.api_key = model_provider_update_request.api_key
    if model_provider_update_request.api_url is not None:
        db_ai_model_provider.api_url = model_provider_update_request.api_url
    db_ai_model_provider.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()

import json
from fastapi.responses import StreamingResponse
from typing import List
from loguru import logger
from common.logger import log_exception
from common.mcp_client_wrapper import MCPClientWrapper
from common.prompts.mcp import get_prompt_to_identify_tool_and_arguments, get_prompt_to_process_tool_response, get_if_down_prompt
from contextlib import AsyncExitStack

max_depth = 5

MCP_SERVERS = [
    "http://localhost:8000/document/mcp",
    "http://localhost:8000/common/mcp"
]

async def stream_ops_stream(ai_client: OpenAI, query: str, memory: List[str]):
    tool_mapping = {}
    all_tools = []

    async with AsyncExitStack() as stack:
        clients = []
        for url in MCP_SERVERS:
            try:
                client = MCPClientWrapper(url)
                client = await stack.enter_async_context(client)
                clients.append(client)
                tools = await client.list_tools()
                for t in tools:
                    tool_mapping[t.name] = client
                    all_tools.append({
                        "name": t.name,
                        "description": t.description,
                        "inputSchema": t.inputSchema
                    })
            except Exception as e:
                logger.warning(f"Failed to connect to {url}: {e}")

        # 1. 选择工具
        prompt = get_prompt_to_identify_tool_and_arguments(query=query, tools=all_tools, context=memory)
        yield ResponseItem(status="Selecting tool...").model_dump_json()
        selection_result = call_llm(ai_client, prompt).choices[0].message.content
        yield ResponseItem(status="Tool Selected", content=selection_result).model_dump_json()
        tool_call = json.loads(selection_result)
        tool_name = tool_call["tool"]

        if tool_name == "none":
            tool_response = "No tool selected"
            yield ResponseItem(status="No tool selected").model_dump_json()
        elif tool_name not in tool_mapping:
            tool_response = "Tool not found"
            yield ResponseItem(status=f"Tool {tool_name} not found.").model_dump_json()
        else:
            # 2. 调用工具
            arguments = tool_call["arguments"]
            client = tool_mapping[tool_name]
            tool_result = await client.call_tool(tool_name, arguments)
            tool_response = tool_result.content[0].text
            yield ResponseItem(status="Tool Result", content=f"{tool_response}").model_dump_json()

        # 3. 再由 LLM 对结果进行总结
        checking_prompt = get_if_down_prompt(query, tool_response, context=memory)
        status = call_llm(ai_client, checking_prompt).choices[0].message.content
        yield ResponseItem(status="Checking continue", content=status).model_dump_json()
        response_prompt = get_prompt_to_process_tool_response(query, tool_response, context=memory)
        yield ResponseItem(status="Generating final response").model_dump_json()

        for chunk in call_llm_stream(ai_client, response_prompt):
            chunk = ChatItem(
                chat_id=chunk.id,
                content=chunk.choices[0].delta.content if hasattr(chunk.choices[0].delta, 'content') else None,
                role='assistant',
                finish_reason=chunk.choices[0].finish_reason
            )
            yield ResponseItem(status="AI Answering", content=chunk.model_dump_json()).model_dump_json()

@ai_router.post("/ask")
async def ask_ai(chat_messages: schemas.ai.ChatMessages, 
                 db: Session = Depends(get_db),
                 user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    memory = [m.content for m in chat_messages.messages[:-1]]
    query = chat_messages.messages[-1].content
    depth = 0
    
    model_id = user.default_revornix_model_id
    db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
    if db_model is None:
        raise schemas.error.CustomException("The model is not exist", code=404)
    db_user_model = crud.model.get_user_ai_model_by_id(db=db, user_id=user.id, model_id=model_id)
    db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, provider_id=db_model.provider_id)
    if db_model_provider is None:
        raise schemas.error.CustomException("The model provider is not exist", code=404)
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id(db=db, 
                                                                         user_id=user.id, 
                                                                         provider_id=db_model.provider_id)
    ai_client = OpenAI(
        api_key=db_user_model.api_key if db_user_model.api_key else db_user_model_provider.api_key,
        base_url=db_user_model.api_url if db_user_model.api_url else db_user_model_provider.api_url,
        timeout=1800,
    )

    async def event_generator():
        nonlocal query, depth

        should_stop = False
        
        while depth <= max_depth:
            try:
                async for chunk in stream_ops_stream(ai_client, query, memory):
                    chunk = json.loads(chunk)
                    status = chunk.get('status')
                    content = chunk.get('content')
                    res = ResponseItem(status=status, content=content).model_dump_json()
                    yield (json.dumps(jsonable_encoder(res), ensure_ascii=False) + "\n").encode("utf-8")
                    if status == "Checking continue" and content is not None and "finish" in content:
                        should_stop = True
                    else:
                        query = content
                        memory.append(query)
                if should_stop:
                    break  # 退出 outer while-loop
                depth += 1
            except Exception as e:
                res = ResponseItem(status=f"Something went wrong", content=str(e)).model_dump_json()
                yield (json.dumps(jsonable_encoder(res), ensure_ascii=False) + "\n").encode("utf-8")
                log_exception()
                break

        if depth > max_depth:
            res = ResponseItem(status="Max depth reached. Terminating.").model_dump_json()
            yield (json.dumps(jsonable_encoder(res), ensure_ascii=False) + "\n").encode("utf-8")

    return StreamingResponse(event_generator(), media_type="text/event-stream")