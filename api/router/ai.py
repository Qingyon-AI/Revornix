import json
import crud
import schemas
import os
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from openai import OpenAI
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from fastapi.encoders import jsonable_encoder
from common.dependencies import get_db, get_current_user
from common.vector import milvus_client, process_query, hybrid_search

os.environ["TOKENIZERS_PARALLELISM"] = 'false'

ai_router = APIRouter()

@ai_router.post("/model/create", response_model=schemas.common.NormalResponse)
async def create_model(model_create_request: schemas.ai.ModelCreateRequest,
                       db: Session = Depends(get_db),
                       user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
     crud.model.create_ai_model(db=db, 
                                user_id=user.id, 
                                name=model_create_request.name, 
                                description=model_create_request.description,
                                provider_id=model_create_request.provider_id, 
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
    if data.user_id != user.id:
        raise schemas.error.CustomException("The model is not belong to you", code=403)
    
    provider = crud.model.get_ai_model_provider_by_id(db=db,
                                                      provider_id=data.provider_id)
    data.provider = provider
    return data

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
    return data
 
@ai_router.post("/model-provider/create", response_model=schemas.common.NormalResponse)
async def create_model_provider(model_provider_request: schemas.ai.ModelProviderCreateRequest,
                                db: Session = Depends(get_db),
                                user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
     crud.model.create_ai_model_provider(db=db, 
                                         user_id=user.id,
                                         name=model_provider_request.name, 
                                         description=model_provider_request.description,
                                         api_key=model_provider_request.api_key,
                                         api_url=model_provider_request.api_url)
     db.commit()
     return schemas.common.SuccessResponse()
 
@ai_router.post("/model/delete", response_model=schemas.common.NormalResponse)
async def delete_ai_model(delete_model_request: schemas.ai.DeleteModelRequest,
                          db: Session = Depends(get_db),
                          user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_ai_model = crud.model.get_ai_model_by_id(db=db,
                                              model_id=delete_model_request.model_id)
    if db_ai_model is None:
        raise schemas.error.CustomException("The model is not exist", code=404)
    if db_ai_model.user_id != user.id:
        raise schemas.error.CustomException("The model is not belong to you", code=403)
    crud.model.delete_ai_models(db=db, 
                                model_ids=delete_model_request.model_ids)
    db.commit()
    return schemas.common.SuccessResponse()
     
@ai_router.post("/model/search", response_model=schemas.ai.ModelSearchResponse)
async def list_ai_model(model_search_request: schemas.ai.ModelSearchRequest,
                        db: Session = Depends(get_db),
                        user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    data = crud.model.search_ai_models(db=db, 
                                       user_id=user.id, 
                                       keyword=model_search_request.keyword,
                                       provider_id=model_search_request.provider_id)
    for item in data:
        item.provider = crud.model.get_ai_model_provider_by_id(db=db, 
                                                               provider_id=item.provider_id)
    return schemas.ai.ModelSearchResponse(data=data)

@ai_router.post("/model-provider/search", response_model=schemas.ai.ModelProviderSearchResponse)
async def list_ai_model_provider(model_provider_search_request: schemas.ai.ModelProviderSearchRequest,
                                 db: Session = Depends(get_db),
                                 user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    data = crud.model.search_ai_model_providers(db=db, 
                                                user_id=user.id,
                                                keyword=model_provider_search_request.keyword)
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
    if db_ai_model.user_id != user.id:
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

@ai_router.post("/ask")
async def ask_ai(chat_messages: schemas.ai.ChatMessages, 
                 db: Session = Depends(get_db),
                 user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    query = chat_messages.messages[-1].content
    query_dense_embedding, query_sparse_embedding = process_query(query)
    hybrid_results = hybrid_search(
        milvus_client=milvus_client,
        collection_name='document',
        query_dense_embedding=query_dense_embedding,
        query_sparse_embedding=query_sparse_embedding,
    )
    base_docs = [doc.get('entity').get('text') for doc in hybrid_results]
    temp_messages = [{"role": message.role, "content": message.content} for message in chat_messages.messages[:-1]]
    final_messages = [{"role": "system", "content": "You are Revornix AI，an ai assistant。"}, 
                      *temp_messages, 
                      {"role": "user", "content": f"Using the following info as context: {json.dumps(base_docs, ensure_ascii=False)}, could you help answer this question: {query}?"}]
    model_id = user.default_revornix_model_id
    db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
    if db_model is None:
        raise schemas.error.CustomException("The model is not exist", code=404)
    db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, provider_id=db_model.provider_id)
    if db_model_provider is None:
        raise schemas.error.CustomException("The model provider is not exist", code=404)
    client = OpenAI(
        api_key=db_model_provider.api_key,
        base_url=db_model_provider.api_url,
        timeout=1800,
    )
    try:
        stream = client.chat.completions.create(
                model=db_model.name,
                messages=final_messages,
                temperature=0.3,
                stream=True,
                stream_options={"include_usage": True}
            )
    except Exception as e:
        raise schemas.error.CustomException(str(e), code=500)
    def generate_stream_response():
        for chunk in stream:
            if chunk is None or chunk.choices is None or len(chunk.choices) == 0:
                continue
            choice = chunk.choices[0]
            content = choice.delta.content if hasattr(choice.delta, 'content') else None
            references = chunk.references if hasattr(chunk, 'references') else None
            reasoning_content = choice.delta.reasoning_content if hasattr(choice.delta, 'reasoning_content') else None
            finish_reason = choice.finish_reason
            # 构建响应对象
            res = schemas.ai.ChatItem(
                chat_id=chunk.id,
                reasoning_content=reasoning_content or "",
                content=content or "",  # 处理空内容
                role='assistant',
                finish_reason=finish_reason,
                references=references
            )
            # 添加引用文档信息（仅在首个块处理）
            if choice.finish_reason == 'stop' and len(hybrid_results) > 0:
                document_ids = [doc.get('entity').get('document_id') for doc in hybrid_results]
                documents = [doc for doc in crud.document.get_documents_by_document_ids(db=db,
                                                                                        document_ids=document_ids)]
                if len(documents) > 0:
                    res.quote = [schemas.ai.Document(id=document.id,
                                                     title=document.title if document.title is not None else "无标题",
                                                     description=document.description if document.description is not None else "无描述",
                                                     ai_summary=document.ai_summary if document.ai_summary is not None else "无AI摘要",) for document in documents]
            # 将响应对象转换为 JSON 字符串并编码为字节流
            yield (json.dumps(jsonable_encoder(res), ensure_ascii=False) + "\n").encode("utf-8")
    return StreamingResponse(generate_stream_response(), media_type="text/event-stream")