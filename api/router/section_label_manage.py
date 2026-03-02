from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_db

section_label_manage_router = APIRouter()

@section_label_manage_router.post('/label/create', response_model=schemas.section.CreateLabelResponse)
def add_label(
    label_add_request: schemas.section.LabelAddRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_label = crud.section.create_section_label(
        db=db,
        name=label_add_request.name,
        user_id=user.id
    )
    db.commit()
    return schemas.section.CreateLabelResponse(id=db_label.id, name=db_label.name)

@section_label_manage_router.post("/label/list", response_model=schemas.section.LabelListResponse)
def list_label(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_labels = crud.section.get_user_labels_by_user_id(
        db=db,
        user_id=user.id
    )
    labels = [
        schemas.section.SectionLabel(id=label.id, name=label.name) for label in db_labels
    ]
    return schemas.section.LabelListResponse(data=labels)

@section_label_manage_router.post('/label/delete', response_model=schemas.common.NormalResponse)
def delete_label(
    label_delete_request: schemas.section.LabelDeleteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    crud.document.delete_labels_by_label_ids(
        db=db,
        label_ids=label_delete_request.label_ids,
        user_id=user.id
    )
    db.commit()
    return schemas.common.SuccessResponse()
