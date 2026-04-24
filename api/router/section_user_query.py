from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user
from common.file import get_remote_file_signed_urls
from enums.section import UserSectionAuthority, UserSectionRole

section_user_query_router = APIRouter()

@section_user_query_router.post('/mine/role-and-authority', response_model=schemas.section.SectionUserRoleAndAuthorityResponse)
async def get_mine_section_role_and_authority(
    section_user_get_request: schemas.section.MineSectionRoleAndAuthorityRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_section_user = await crud.section.get_section_user_by_section_id_and_user_id_async(
        db=db,
        section_id=section_user_get_request.section_id,
        user_id=user.id
    )
    if db_section_user is None:
        raise schemas.error.CustomException("Section not found", code=404)
    return schemas.section.SectionUserRoleAndAuthorityResponse(
        section_id=section_user_get_request.section_id,
        user_id=user.id,
        role=UserSectionRole(db_section_user.role),
        authority=UserSectionAuthority(db_section_user.authority)
    )

@section_user_query_router.post('/user/role-and-authority', response_model=schemas.section.SectionUserRoleAndAuthorityResponse)
async def get_section_user_role_and_authority(
    section_user_get_request: schemas.section.SectionUserRoleAndAuthorityRequest,
    db: AsyncSession = Depends(get_async_db),
    _user: models.user.User = Depends(get_current_user)
):
    db_section_user = await crud.section.get_section_user_by_section_id_and_user_id_async(
        db=db,
        section_id=section_user_get_request.section_id,
        user_id=section_user_get_request.user_id
    )
    if db_section_user is None:
        raise schemas.error.CustomException("Section not found", code=404)
    return schemas.section.SectionUserRoleAndAuthorityResponse(
        section_id=section_user_get_request.section_id,
        user_id=section_user_get_request.user_id,
        role=UserSectionRole(db_section_user.role),
        authority=UserSectionAuthority(db_section_user.authority)
    )

@section_user_query_router.post('/user', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionUserPublicInfo])
async def section_user_request(
    section_user_request: schemas.section.SectionUserRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=section_user_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)
    db_publish_section = await crud.section.get_publish_section_by_section_id_async(
        db=db,
        section_id=section_user_request.section_id
    )
    if db_publish_section is None:
        # check if the user is in the section
        db_section_user = await crud.section.get_section_user_by_section_id_and_user_id_async(
            db=db,
            user_id=user.id,
            section_id=section_user_request.section_id
        )
        if db_section_user is None or db_section_user.role not in [UserSectionRole.CREATOR, UserSectionRole.MEMBER]:
            raise schemas.error.CustomException("You are forbidden to get the users' info about this section", code=403)

    has_more = False
    next_start = None
    users = []
    db_section_users = await crud.section.search_users_and_section_users_by_section_id_async(
        db=db,
        section_id=section_user_request.section_id,
        filter_roles=section_user_request.filter_roles,
        start=section_user_request.start,
        limit=section_user_request.limit,
        keyword=section_user_request.keyword
    )
    if section_user_request.limit > 0 and len(db_section_users) == section_user_request.limit:
        last_user = db_section_users[-1][0]
        db_next_section_user = await crud.section.search_next_user_and_section_user_by_section_id_async(
            db=db,
            section_id=section_user_request.section_id,
            filter_roles=section_user_request.filter_roles,
            user=last_user,
            keyword=section_user_request.keyword
        )
        has_more = db_next_section_user is not None
        next_start = db_next_section_user[1].id if db_next_section_user is not None else None
    total = await crud.section.count_users_and_section_users_by_section_id_async(
        db=db,
        section_id=section_user_request.section_id,
        filter_roles=section_user_request.filter_roles,
        keyword=section_user_request.keyword
    )
    users_need_avatar_sign = []
    for db_user, db_user_section in db_section_users:
        user_item = schemas.section.SectionUserPublicInfo.model_validate(db_user)
        user_item.authority = db_user_section.authority
        user_item.role = db_user_section.role
        if user_item.avatar is not None:
            users_need_avatar_sign.append(user_item)
        users.append(
            user_item
        )
    if users_need_avatar_sign:
        signed_avatar_urls = await get_remote_file_signed_urls(
            [(item.id, item.avatar) for item in users_need_avatar_sign]
        )
        for item, signed_avatar_url in zip(users_need_avatar_sign, signed_avatar_urls, strict=False):
            item.avatar = signed_avatar_url
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=users,
        start=section_user_request.start,
        limit=section_user_request.limit,
        has_more=has_more,
        next_start=next_start
    )
