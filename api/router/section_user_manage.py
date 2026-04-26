import asyncio

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.celery.app import start_trigger_user_notification_event
from common.dependencies import get_async_db, get_current_user, plan_ability_checked
from enums.ability import Ability
from enums.notification import NotificationTriggerEventUUID
from enums.section import UserSectionRole

section_user_manage_router = APIRouter()

@section_user_manage_router.post('/user/add', response_model=schemas.common.NormalResponse)
async def section_user_add_request(
    section_share_request: schemas.section.SectionUserAddRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
    _ = Depends(plan_ability_checked(Ability.SECTION_COLLABORATION.value)),

):
    section_user = await crud.section.get_section_user_by_section_id_and_user_id_async(
        db=db,
        user_id=user.id,
        section_id=section_share_request.section_id
    )
    if section_user is None or section_user.role not in [UserSectionRole.CREATOR, UserSectionRole.MEMBER]:
        raise schemas.error.CustomException("You don't have permission to share this section", code=403)

    db_exist_user_section = await crud.section.get_section_user_by_section_id_and_user_id_async(
        db=db,
        user_id=section_share_request.user_id,
        section_id=section_share_request.section_id
    )

    if db_exist_user_section is not None:
        raise schemas.error.CustomException("User is already in this section", code=409)

    await crud.section.create_section_user_async(
        db=db,
        section_id=section_share_request.section_id,
        user_id=section_share_request.user_id,
        role=UserSectionRole.MEMBER,
        authority=section_share_request.authority
    )
    await db.commit()

    return schemas.common.SuccessResponse()

@section_user_manage_router.post('/user/modify', response_model=schemas.common.NormalResponse)
async def section_user_modify_request(
    section_user_modify_request: schemas.section.SectionUserModifyRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):

    if user.id == section_user_modify_request.user_id:
        raise schemas.error.CustomException("You can't modify your own authority", code=400)

    section_user = await crud.section.get_section_user_by_section_id_and_user_id_async(
        db=db,
        user_id=user.id,
        section_id=section_user_modify_request.section_id
    )
    if section_user is None or section_user.role not in [UserSectionRole.CREATOR]:
        raise schemas.error.CustomException("You don't have permission to modify member authority", code=403)

    origin_section_user = await crud.section.get_section_user_by_section_id_and_user_id_async(
        db=db,
        user_id=section_user_modify_request.user_id,
        section_id=section_user_modify_request.section_id
    )
    if origin_section_user is None:
        raise schemas.error.CustomException("The user is not a member of this section", code=404)

    # 如果用户是订阅者，那么就不能修改权限，仅支持对专栏的参与者修改权限
    if origin_section_user.role == UserSectionRole.SUBSCRIBER:
        raise schemas.error.CustomException("You can't modify subscriber authority", code=400)

    if section_user_modify_request.authority is not None:
        origin_section_user.authority = section_user_modify_request.authority
    if section_user_modify_request.role is not None:
        origin_section_user.role = section_user_modify_request.role

    await db.commit()

    return schemas.common.SuccessResponse()

@section_user_manage_router.post('/user/delete', response_model=schemas.common.NormalResponse)
async def delete_section_user(
    section_user_delete_request: schemas.section.SectionUserDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    section_user = await crud.section.get_section_user_by_section_id_and_user_id_async(
        db=db,
        user_id=user.id,
        section_id=section_user_delete_request.section_id
    )
    if section_user is None or section_user.role not in [UserSectionRole.CREATOR]:
        raise schemas.error.CustomException("You don't have permission to remove users from this section", code=403)

    if user.id == section_user_delete_request.user_id:
        raise schemas.error.CustomException("As the creator of the section, you can't delete yourself", code=400)

    await crud.section.delete_section_user_by_section_id_and_user_id_async(
        db=db,
        section_id=section_user_delete_request.section_id,
        user_id=section_user_delete_request.user_id
    )

    # 由于删除用户之后就该用户和该专栏的记录就被删除了，后续发送通知的时候无法判断用户专栏关系，所以此处先发送通知再提交事务
    await asyncio.to_thread(
        start_trigger_user_notification_event.delay,
        user_id=section_user_delete_request.user_id,
        trigger_event_uuid=NotificationTriggerEventUUID.REMOVED_FROM_SECTION.value,
        params={
            "section_id": section_user_delete_request.section_id,
            "receiver_id": section_user_delete_request.user_id,
        },
    )

    await db.commit()
    return schemas.common.SuccessResponse()
