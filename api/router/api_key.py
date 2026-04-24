import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user

api_key_router = APIRouter()

@api_key_router.post("/create", response_model=schemas.api_key.ApiKeyCreateResponse)
async def create_api_key(
    api_key_create_request: schemas.api_key.ApiKeyCreateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_api_key = await crud.api_key.create_api_key_async(
        db=db,
        user_id=user.id,
        api_key=uuid.uuid4().hex ,
        description=api_key_create_request.description
    )
    await db.commit()
    return schemas.api_key.ApiKeyCreateResponse(api_key_id=db_api_key.id)

@api_key_router.post("/search", response_model=schemas.pagination.Pagination[schemas.api_key.ApiKeyInfo])
async def search_api_key(
    search_api_key_request: schemas.api_key.SearchApiKeysRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_api_keys = await crud.api_key.search_api_key_async(
        db=db,
        user_id=user.id,
        page_num=search_api_key_request.page_num,
        page_size=search_api_key_request.page_size,
        keyword=search_api_key_request.keyword
    )
    count = await crud.api_key.count_user_api_key_async(
        db=db,
        user_id=user.id,
        keyword=search_api_key_request.keyword
    )
    total_pages = count // search_api_key_request.page_size if count % search_api_key_request.page_size == 0 else count // search_api_key_request.page_size + 1
    return schemas.pagination.Pagination(
        total_elements=count,
        total_pages=total_pages,
        page_num=search_api_key_request.page_num,
        page_size=search_api_key_request.page_size,
        current_page_elements=len(db_api_keys),
        elements=db_api_keys
    )

@api_key_router.post("/delete", response_model=schemas.common.NormalResponse)
async def delete_api_key(
    api_keys_delete_request: schemas.api_key.ApiKeysDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    await crud.api_key.delete_api_keys_by_api_key_ids_async(
        db=db,
        user_id=user.id,
        api_key_ids=api_keys_delete_request.api_key_ids
    )
    await db.commit()
    return schemas.common.SuccessResponse()
