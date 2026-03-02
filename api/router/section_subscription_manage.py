from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.celery.app import start_trigger_user_notification_event
from common.dependencies import get_current_user, get_db
from enums.notification import NotificationTriggerEventUUID
from enums.section import UserSectionAuthority, UserSectionRole
from router.logic_helpers import resolve_subscribe_action

section_subscription_manage_router = APIRouter()


@section_subscription_manage_router.post('/subscribe', response_model=schemas.common.NormalResponse)
def subscribe_section(
    section_subscribe_request: schemas.section.SectionSubscribeRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_subscribe_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)

    db_user_section = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        section_id=section_subscribe_request.section_id,
        user_id=user.id
    )
    current_role = UserSectionRole(db_user_section.role) if db_user_section is not None else None

    action = resolve_subscribe_action(
        current_role=current_role,
        status=section_subscribe_request.status,
    )

    if action == "create":
        # 免费专栏仅需要订阅一次即可永久生效，TODO：用户如果修改专栏的免费状态，则使其免费订阅失效，需要重新订阅
        crud.section.create_section_user(
            db=db,
            section_id=section_subscribe_request.section_id,
            user_id=user.id,
            role=UserSectionRole.SUBSCRIBER,
            authority=UserSectionAuthority.READ_ONLY
        )
        db_users = crud.section.get_users_for_section_by_section_id(
            db=db,
            section_id=section_subscribe_request.section_id,
            filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR]
        )
        for db_user in db_users:
            start_trigger_user_notification_event.delay(
                user_id=db_user.id,
                trigger_event_uuid=NotificationTriggerEventUUID.SECTION_SUBSCRIBED.value,
                params={
                    "section_id": section_subscribe_request.section_id,
                    "user_id": db_user.id
                }
            )
    elif action == "delete":
        crud.section.delete_section_user_by_section_id_and_user_id(
            db=db,
            section_id=section_subscribe_request.section_id,
            user_id=user.id
        )

    db.commit()
    return schemas.common.SuccessResponse()
