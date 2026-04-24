from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user, plan_ability_checked
from enums.ability import Ability

document_user_manage_router = APIRouter()


async def _load_document_for_management(
    *,
    db: AsyncSession,
    document_id: int,
    user_id: int,
) -> models.document.Document:
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    if db_document.creator_id != user_id:
        raise schemas.error.CustomException("You don't have permission to manage this document", code=403)
    return db_document


@document_user_manage_router.post('/user/add', response_model=schemas.common.NormalResponse)
async def document_user_add_request(
    document_user_add_request: schemas.document.DocumentUserAddRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
    _=Depends(plan_ability_checked(Ability.SECTION_COLLABORATION.value)),
):
    await _load_document_for_management(
        db=db,
        document_id=document_user_add_request.document_id,
        user_id=user.id,
    )
    if document_user_add_request.user_id == user.id:
        raise schemas.error.CustomException("You are already the owner of this document", code=400)

    db_exist_user_document = await crud.document.get_user_document_by_user_id_and_document_id_async(
        db=db,
        user_id=document_user_add_request.user_id,
        document_id=document_user_add_request.document_id,
    )
    if db_exist_user_document is not None:
        raise schemas.error.CustomException("User is already a collaborator of this document", code=409)

    await crud.document.create_user_document_async(
        db=db,
        document_id=document_user_add_request.document_id,
        user_id=document_user_add_request.user_id,
        authority=document_user_add_request.authority,
    )
    await db.commit()
    return schemas.common.SuccessResponse()


@document_user_manage_router.post('/user/modify', response_model=schemas.common.NormalResponse)
async def document_user_modify_request(
    document_user_modify_request: schemas.document.DocumentUserModifyRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    await _load_document_for_management(
        db=db,
        document_id=document_user_modify_request.document_id,
        user_id=user.id,
    )
    if document_user_modify_request.user_id == user.id:
        raise schemas.error.CustomException("You can't modify your own authority", code=400)

    db_user_document = await crud.document.get_user_document_by_user_id_and_document_id_async(
        db=db,
        user_id=document_user_modify_request.user_id,
        document_id=document_user_modify_request.document_id,
    )
    if db_user_document is None:
        raise schemas.error.CustomException("The user is not a collaborator of this document", code=404)

    db_user_document.authority = document_user_modify_request.authority
    await db.commit()
    return schemas.common.SuccessResponse()


@document_user_manage_router.post('/user/delete', response_model=schemas.common.NormalResponse)
async def delete_document_user(
    document_user_delete_request: schemas.document.DocumentUserDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    await _load_document_for_management(
        db=db,
        document_id=document_user_delete_request.document_id,
        user_id=user.id,
    )
    if document_user_delete_request.user_id == user.id:
        raise schemas.error.CustomException("As the owner of the document, you can't delete yourself", code=400)

    db_user_document = await crud.document.get_user_document_by_user_id_and_document_id_async(
        db=db,
        user_id=document_user_delete_request.user_id,
        document_id=document_user_delete_request.document_id,
    )
    if db_user_document is None:
        raise schemas.error.CustomException("The user is not a collaborator of this document", code=404)

    await crud.document.delete_user_document_by_document_id_and_user_id_async(
        db=db,
        document_id=document_user_delete_request.document_id,
        user_id=document_user_delete_request.user_id,
    )
    await db.commit()
    return schemas.common.SuccessResponse()
