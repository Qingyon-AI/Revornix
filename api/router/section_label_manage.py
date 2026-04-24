from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user

section_label_manage_router = APIRouter()

@section_label_manage_router.post('/label/create', response_model=schemas.section.CreateLabelResponse)
async def add_label(
    label_add_request: schemas.section.LabelAddRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_label = await crud.section.create_section_label_async(
        db=db,
        name=label_add_request.name,
        user_id=user.id
    )
    await db.commit()
    return schemas.section.CreateLabelResponse(id=db_label.id, name=db_label.name)

@section_label_manage_router.post("/label/list", response_model=schemas.section.LabelListResponse)
async def list_label(
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_labels = await crud.section.get_user_labels_by_user_id_async(
        db=db,
        user_id=user.id
    )
    labels = [
        schemas.section.SectionLabel(id=label.id, name=label.name) for label in db_labels
    ]
    return schemas.section.LabelListResponse(data=labels)

@section_label_manage_router.post('/label/delete', response_model=schemas.common.NormalResponse)
async def delete_label(
    label_delete_request: schemas.section.LabelDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    await crud.section.delete_labels_by_label_ids_async(
        db=db,
        label_ids=label_delete_request.label_ids,
        user_id=user.id
    )
    await db.commit()
    return schemas.common.SuccessResponse()
