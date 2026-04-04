from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_current_user_without_throw, get_db
from common.file import get_remote_file_signed_url
from enums.section import UserSectionAuthority, UserSectionRole

section_search_query_router = APIRouter()


async def _build_section_infos(
    *,
    db: Session,
    sections: list[models.section.Section],
    viewer_user_id: int | None,
) -> list[schemas.section.SectionInfo]:
    if not sections:
        return []

    section_ids = [section.id for section in sections]
    documents_count_by_section_id = crud.section.count_documents_for_section_by_section_ids(
        db=db,
        section_ids=section_ids,
    )
    subscribers_count_by_section_id = crud.section.count_users_for_section_by_section_ids(
        db=db,
        section_ids=section_ids,
        filter_roles=[UserSectionRole.SUBSCRIBER],
    )
    podcast_tasks = crud.task.get_section_podcast_tasks_by_section_ids(
        db=db,
        section_ids=section_ids,
    )
    labels_by_section_id = crud.section.get_labels_by_section_ids(db=db, section_ids=section_ids)
    publish_sections = crud.section.get_publish_sections_by_section_ids(
        db=db,
        section_ids=section_ids,
    )
    publish_uuid_by_section_id = {
        item.section_id: item.uuid for item in publish_sections
    }
    podcast_task_by_section_id = {
        task.section_id: task for task in podcast_tasks
    }
    day_sections = crud.section.get_day_sections_by_section_ids(
        db=db,
        section_ids=section_ids,
    )
    is_day_section_by_section_id = {
        item.section_id: True for item in day_sections
    }
    day_section_date_by_section_id = {
        item.section_id: item.date.isoformat() for item in day_sections
    }

    authority_by_section_id: dict[int, UserSectionAuthority | int] = {}
    if viewer_user_id is not None:
        section_users = crud.section.get_section_users_by_section_ids_and_user_id(
            db=db,
            section_ids=section_ids,
            user_id=viewer_user_id,
        )
        authority_by_section_id = {item.section_id: item.authority for item in section_users}

    data: list[schemas.section.SectionInfo] = []
    for section in sections:
        res = schemas.section.SectionInfo.model_validate(section)
        if res.md_file_name is not None:
            res.md_file_name = await get_remote_file_signed_url(
                user_id=res.creator.id,
                file_name=res.md_file_name,
            )
        res.creator = section.creator
        res.labels = [
            schemas.section.SectionLabel(id=label.id, name=label.name)
            for label in labels_by_section_id.get(section.id, [])
        ]
        res.documents_count = documents_count_by_section_id.get(section.id, 0)
        res.subscribers_count = subscribers_count_by_section_id.get(section.id, 0)
        res.publish_uuid = publish_uuid_by_section_id.get(section.id)
        res.is_day_section = is_day_section_by_section_id.get(section.id, False)
        res.day_section_date = day_section_date_by_section_id.get(section.id)
        podcast_task = podcast_task_by_section_id.get(section.id)
        if podcast_task is not None:
            res.podcast_task = schemas.task.SectionPodcastTask(
                status=podcast_task.status,
                podcast_file_name=podcast_task.podcast_file_name,
                create_time=podcast_task.create_time,
                update_time=podcast_task.update_time,
            )
            if podcast_task.podcast_file_name is not None:
                res.podcast_task.podcast_file_name = await get_remote_file_signed_url(
                    user_id=podcast_task.user_id,
                    file_name=podcast_task.podcast_file_name,
                )

        authority = authority_by_section_id.get(section.id)
        if authority is not None:
            res.authority = UserSectionAuthority(authority)

        data.append(res)

    return data


@section_search_query_router.post('/subscribed', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
async def get_my_subscribed_sections(
    search_subscribed_section_request: schemas.section.SearchSubscribedSectionRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    db_sections = crud.section.search_user_subscribed_sections(
        db=db,
        user_id=user.id,
        start=search_subscribed_section_request.start,
        limit=search_subscribed_section_request.limit,
        keyword=search_subscribed_section_request.keyword,
        label_ids=search_subscribed_section_request.label_ids,
        desc=search_subscribed_section_request.desc,
    )

    sections = await _build_section_infos(
        db=db,
        sections=db_sections,
        viewer_user_id=user.id,
    )

    has_more = False
    next_start = None
    if search_subscribed_section_request.limit > 0 and len(db_sections) == search_subscribed_section_request.limit:
        next_section = crud.section.search_next_user_subscribed_section(
            db=db,
            user_id=user.id,
            section=db_sections[-1],
            keyword=search_subscribed_section_request.keyword,
            label_ids=search_subscribed_section_request.label_ids,
            desc=search_subscribed_section_request.desc,
        )
        has_more = next_section is not None
        next_start = next_section.id if next_section is not None else None

    total = crud.section.count_user_subscribed_sections(
        db=db,
        user_id=user.id,
        keyword=search_subscribed_section_request.keyword,
        label_ids=search_subscribed_section_request.label_ids,
    )
    return schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo](
        total=total,
        elements=sections,
        start=search_subscribed_section_request.start,
        limit=search_subscribed_section_request.limit,
        has_more=has_more,
        next_start=next_start,
    )


@section_search_query_router.post('/public/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
async def public_sections(
    search_public_sections_request: schemas.section.SearchPublicSectionsRequest,
    db: Session = Depends(get_db),
    user: models.user.User | None = Depends(get_current_user_without_throw),
):
    db_sections = crud.section.search_published_sections(
        db=db,
        start=search_public_sections_request.start,
        limit=search_public_sections_request.limit,
        keyword=search_public_sections_request.keyword,
        label_ids=search_public_sections_request.label_ids,
        desc=search_public_sections_request.desc,
    )

    sections = await _build_section_infos(
        db=db,
        sections=db_sections,
        viewer_user_id=user.id if user is not None else None,
    )

    has_more = False
    next_start = None
    if search_public_sections_request.limit > 0 and len(db_sections) == search_public_sections_request.limit:
        next_section = crud.section.search_next_published_section(
            db=db,
            section=db_sections[-1],
            keyword=search_public_sections_request.keyword,
            label_ids=search_public_sections_request.label_ids,
        )
        has_more = next_section is not None
        next_start = next_section.id if next_section is not None else None

    total = crud.section.count_published_sections(
        db=db,
        keyword=search_public_sections_request.keyword,
        label_ids=search_public_sections_request.label_ids,
    )
    return schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo](
        total=total,
        elements=sections,
        start=search_public_sections_request.start,
        limit=search_public_sections_request.limit,
        has_more=has_more,
        next_start=next_start,
    )


@section_search_query_router.post('/mine/all', response_model=schemas.section.AllMySectionsResponse)
def get_all_mine_sections(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    db_sections = crud.section.get_user_sections(
        db=db,
        user_id=user.id,
        filter_roles=[UserSectionRole.CREATOR, UserSectionRole.MEMBER],
    )
    section_ids = [section.id for section in db_sections]
    section_users = crud.section.get_section_users_by_section_ids_and_user_id(
        db=db,
        section_ids=section_ids,
        user_id=user.id,
    )
    authority_by_section_id = {item.section_id: item.authority for item in section_users}
    day_sections = crud.section.get_day_sections_by_section_ids(
        db=db,
        section_ids=section_ids,
    )
    is_day_section_by_section_id = {
        item.section_id: True for item in day_sections
    }
    day_section_date_by_section_id = {
        item.section_id: item.date.isoformat() for item in day_sections
    }

    sections = [
        schemas.section.BaseSectionInfo(
            **db_section.__dict__,
            authority=UserSectionAuthority(authority_by_section_id.get(db_section.id)),
            is_day_section=is_day_section_by_section_id.get(db_section.id, False),
            day_section_date=day_section_date_by_section_id.get(db_section.id),
        )
        for db_section in db_sections
    ]
    return schemas.section.AllMySectionsResponse(data=sections)


@section_search_query_router.post('/user/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
async def search_user_sections(
    search_user_sections_request: schemas.section.SearchUserSectionsRequest,
    db: Session = Depends(get_db),
    user: models.user.User | None = Depends(get_current_user_without_throw),
):
    # 该接口仅在自己获取自己的所有专栏的时候会返回所有专栏，否则仅仅返回对应用户公开的专栏
    only_published = (
        user is None or search_user_sections_request.user_id != user.id
    )
    db_sections = crud.section.search_user_sections(
        db=db,
        user_id=search_user_sections_request.user_id,
        start=search_user_sections_request.start,
        limit=search_user_sections_request.limit,
        keyword=search_user_sections_request.keyword,
        only_published=only_published,
        label_ids=search_user_sections_request.label_ids,
        desc=search_user_sections_request.desc,
    )

    sections = await _build_section_infos(
        db=db,
        sections=db_sections,
        viewer_user_id=user.id if user is not None else None,
    )

    has_more = False
    next_start = None
    if search_user_sections_request.limit > 0 and len(db_sections) == search_user_sections_request.limit:
        next_section = crud.section.search_next_user_section(
            db=db,
            user_id=search_user_sections_request.user_id,
            section=db_sections[-1],
            only_published=only_published,
            keyword=search_user_sections_request.keyword,
            label_ids=search_user_sections_request.label_ids,
        )
        has_more = next_section is not None
        next_start = next_section.id if next_section is not None else None

    total = crud.section.count_user_sections(
        db=db,
        user_id=search_user_sections_request.user_id,
        only_published=only_published,
        keyword=search_user_sections_request.keyword,
        label_ids=search_user_sections_request.label_ids,
    )
    return schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo](
        total=total,
        elements=sections,
        start=search_user_sections_request.start,
        limit=search_user_sections_request.limit,
        has_more=has_more,
        next_start=next_start,
    )


@section_search_query_router.post('/mine/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
async def search_mine_sections(
    search_mine_sections_request: schemas.section.SearchMineSectionsRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    db_sections = crud.section.search_user_sections(
        db=db,
        user_id=user.id,
        start=search_mine_sections_request.start,
        limit=search_mine_sections_request.limit,
        keyword=search_mine_sections_request.keyword,
        label_ids=search_mine_sections_request.label_ids,
        desc=search_mine_sections_request.desc,
    )

    sections = await _build_section_infos(
        db=db,
        sections=db_sections,
        viewer_user_id=user.id,
    )

    has_more = False
    next_start = None
    if search_mine_sections_request.limit > 0 and len(db_sections) == search_mine_sections_request.limit:
        next_section = crud.section.search_next_user_section(
            db=db,
            user_id=user.id,
            section=db_sections[-1],
            keyword=search_mine_sections_request.keyword,
            label_ids=search_mine_sections_request.label_ids,
            desc=search_mine_sections_request.desc,
        )
        has_more = next_section is not None
        next_start = next_section.id if next_section is not None else None

    total = crud.section.count_user_sections(
        db=db,
        user_id=user.id,
        keyword=search_mine_sections_request.keyword,
        label_ids=search_mine_sections_request.label_ids,
    )
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=sections,
        start=search_mine_sections_request.start,
        limit=search_mine_sections_request.limit,
        has_more=has_more,
        next_start=next_start,
    )
