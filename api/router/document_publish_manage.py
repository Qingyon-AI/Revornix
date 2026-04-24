from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user
from router.logic_helpers import resolve_publish_action

document_publish_manage_router = APIRouter()


@document_publish_manage_router.post('/publish', response_model=schemas.common.NormalResponse)
async def document_publish_request(
    document_publish_request: schemas.document.DocumentPublishRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=document_publish_request.document_id,
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    if db_document.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to publish this document", code=403)

    db_publish_document = await crud.document.get_publish_document_by_document_id_async(
        db=db,
        document_id=document_publish_request.document_id,
    )
    action = resolve_publish_action(
        status=document_publish_request.status,
        already_published=db_publish_document is not None,
    )
    if action == "create":
        await crud.document.create_publish_document_async(
            db=db,
            document_id=document_publish_request.document_id,
        )
    elif action == "delete":
        await crud.document.delete_published_document_by_document_id_async(
            db=db,
            document_id=document_publish_request.document_id,
        )

    await db.commit()
    return schemas.common.SuccessResponse()


@document_publish_manage_router.post('/publish/get', response_model=schemas.document.DocumentPublishGetResponse)
async def document_publish_get_request(
    document_publish_get_request: schemas.document.DocumentPublishGetRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=document_publish_get_request.document_id,
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    if db_document.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to get the publish info of this document", code=403)

    db_publish_document = await crud.document.get_publish_document_by_document_id_async(
        db=db,
        document_id=document_publish_get_request.document_id,
    )
    if db_publish_document is None:
        return schemas.document.DocumentPublishGetResponse(
            status=False,
            create_time=None,
            update_time=None,
        )

    return schemas.document.DocumentPublishGetResponse(
        status=True,
        create_time=db_publish_document.create_time,
        update_time=db_publish_document.update_time,
    )
