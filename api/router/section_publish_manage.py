from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_db
from router.logic_helpers import resolve_publish_action

section_publish_manage_router = APIRouter()


@section_publish_manage_router.post('/publish', response_model=schemas.common.NormalResponse)
def section_publish_request(
    section_publish_request: schemas.section.SectionPublishRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_publish_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)
    if db_section.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to publish this section", code=403)

    db_exist_publish_section = crud.section.get_publish_section_by_section_id(
        db=db,
        section_id=section_publish_request.section_id
    )
    action = resolve_publish_action(
        status=section_publish_request.status,
        already_published=db_exist_publish_section is not None,
    )
    if action == "create":
        crud.section.create_publish_section(
            db=db,
            section_id=section_publish_request.section_id
        )
    elif action == "delete":
        crud.section.delete_published_section_by_section_id(
            db=db,
            section_id=section_publish_request.section_id
        )

    db.commit()
    return schemas.common.SuccessResponse()

@section_publish_manage_router.post('/republish', response_model=schemas.common.NormalResponse)
def section_republish(
    section_republish_request: schemas.section.SectionRePublishRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_republish_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)
    if db_section.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to publish this section", code=403)

    db_publish_section = crud.section.get_publish_section_by_section_id(
        db=db,
        section_id=section_republish_request.section_id
    )
    if db_publish_section is None:
        raise schemas.error.CustomException("Section not published yet", code=404)

    db_publish_section.uuid = uuid4().hex
    db_publish_section.update_time = now

    db.commit()
    return schemas.common.SuccessResponse()

@section_publish_manage_router.post('/publish/get', response_model=schemas.section.SectionPublishGetResponse)
def section_publish_get_request(
    section_publish_get_request: schemas.section.SectionPublishGetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_publish_get_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)
    if db_section.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to get the publish info of this section", code=403)
    db_publish_section = crud.section.get_publish_section_by_section_id(
        db=db,
        section_id=section_publish_get_request.section_id
    )
    if db_publish_section is None:
        return schemas.section.SectionPublishGetResponse(
            status=False,
            uuid=None,
            create_time=None,
            update_time=None
        )
    return schemas.section.SectionPublishGetResponse(
        status=True,
        uuid=db_publish_section.uuid,
        update_time=db_publish_section.update_time,
        create_time=db_publish_section.create_time
    )
