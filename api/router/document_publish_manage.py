from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_db
from router.logic_helpers import resolve_publish_action

document_publish_manage_router = APIRouter()


@document_publish_manage_router.post('/publish', response_model=schemas.common.NormalResponse)
def document_publish_request(
    document_publish_request: schemas.document.DocumentPublishRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=document_publish_request.document_id,
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    if db_document.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to publish this document", code=403)

    db_publish_document = crud.document.get_publish_document_by_document_id(
        db=db,
        document_id=document_publish_request.document_id,
    )
    action = resolve_publish_action(
        status=document_publish_request.status,
        already_published=db_publish_document is not None,
    )
    if action == "create":
        crud.document.create_publish_document(
            db=db,
            document_id=document_publish_request.document_id,
        )
    elif action == "delete":
        crud.document.delete_published_document_by_document_id(
            db=db,
            document_id=document_publish_request.document_id,
        )

    db.commit()
    return schemas.common.SuccessResponse()


@document_publish_manage_router.post('/publish/get', response_model=schemas.document.DocumentPublishGetResponse)
def document_publish_get_request(
    document_publish_get_request: schemas.document.DocumentPublishGetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=document_publish_get_request.document_id,
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    if db_document.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to get the publish info of this document", code=403)

    db_publish_document = crud.document.get_publish_document_by_document_id(
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
