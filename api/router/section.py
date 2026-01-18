import schemas
import crud
import models
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from uuid import uuid4
from typing import cast
from sqlalchemy.orm import Session
from common.dependencies import get_db, get_current_user, get_current_user_without_throw, plan_ability_checked
from common.common import get_user_remote_file_system
from enums.section import UserSectionAuthority, UserSectionRole, SectionPodcastStatus, SectionProcessStatus, SectionProcessTriggerType
from common.celery.app import start_process_section_podcast, update_section_process_status, start_trigger_user_notification_event, start_process_section
from celery import chain
from enums.notification import NotificationTriggerEventUUID
from enums.ability import Ability
from enums.section import SectionProcessTriggerType
from common.apscheduler.app import scheduler
from apscheduler.triggers.cron import CronTrigger

section_router = APIRouter()

@section_router.post('/podcast/generate', response_model=schemas.common.NormalResponse)
async def generate_podcast(
    generate_podcast_request: schemas.section.GenerateSectionPodcastRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=generate_podcast_request.section_id
    )
    if db_section is None:
        raise Exception('The section you want to generate the podcast is not found')
    if db_section.creator_id != user.id:
        raise Exception('You are not the creator of this section, so you can not generate the podcast')
    
    if user.default_user_file_system is None:
        raise Exception('Please set the default file system for the user first.')
    else:
        remote_file_service = await get_user_remote_file_system(
            user_id=user.id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            user_file_system_id=user.default_user_file_system
        )

    db_exist_podcast_task = crud.task.get_section_podcast_task_by_section_id(
        db=db,
        section_id=generate_podcast_request.section_id
    )
    if db_exist_podcast_task is not None:
        if db_exist_podcast_task.status == SectionPodcastStatus.SUCCESS:
            raise Exception('The podcast task is already finished, please refresh the page')
        if db_exist_podcast_task.status == SectionPodcastStatus.WAIT_TO:
            raise Exception('The podcast task is already in the queue, please wait')
        if db_exist_podcast_task.status == SectionPodcastStatus.GENERATING:
            raise Exception('The podcast task is already processing, please wait')
    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=generate_podcast_request.section_id
    )
    if db_section_process_task is None:
        db_section_process_task = crud.task.create_section_process_task(
            db=db,
            user_id=user.id,
            section_id=generate_podcast_request.section_id
        )
    db_section_process_task.status = SectionProcessStatus.WAIT_TO
    db.commit()
    workflow = chain(
        start_process_section_podcast.si(db_section.id, user.id),
        update_section_process_status.si(db_section.id, SectionProcessStatus.SUCCESS)
    )
    workflow()
    return schemas.common.SuccessResponse()

@section_router.post('/documents', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionDocumentInfo])
def section_document_request(
    section_document_request: schemas.section.SectionDocumentRequest,
    db: Session = Depends(get_db),
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_without_throw)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_document_request.section_id
    )
    if db_section is None:
        raise Exception("Section not found")
    
    has_more = True
    next_start = None
    next_document = None
    db_documents = crud.document.search_section_documents(
        db=db, 
        section_id=section_document_request.section_id,
        start=section_document_request.start,
        limit=section_document_request.limit,
        keyword=section_document_request.keyword,
        desc=section_document_request.desc
    )
    
    document_ids = [document.id for document in db_documents]
    labels_by_document_id = crud.document.get_labels_by_document_ids(
        db=db, 
        document_ids=document_ids
    )
    section_documents = crud.section.get_section_documents_by_section_id_and_document_ids(
        db=db,
        section_id=section_document_request.section_id,
        document_ids=document_ids,
    )
    section_document_by_document_id = {item.document_id: item for item in section_documents}
    documents = []
    for document in db_documents:
        db_section_document = section_document_by_document_id.get(document.id)
        if db_section_document is None:
            continue
        labels = [
            schemas.section.Label(id=label.id, name=label.name)
            for label in labels_by_document_id.get(document.id, [])
        ]
        info = schemas.section.SectionDocumentInfo(
            id=document.id,
            title=document.title,
            status=db_section_document.status,
            category=document.category,
            cover=document.cover,
            description=document.description,
            from_plat=document.from_plat,
            labels=labels,
            create_time=document.create_time,
            update_time=document.update_time,
        )
        documents.append(info)
    if len(documents) < section_document_request.limit or len(documents) == 0:
        has_more = False
    if len(documents) == section_document_request.limit:
        next_document = crud.document.search_next_section_document(
            db=db, 
            section_id=section_document_request.section_id,
            document=db_documents[-1],
            keyword=section_document_request.keyword,
            desc=section_document_request.desc
        )
        has_more = next_document is not None
        next_start = next_document.id if next_document is not None else None
    total = crud.document.count_section_documents(
        db=db,
        section_id=section_document_request.section_id,
        keyword=section_document_request.keyword
    )
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=section_document_request.start,
        limit=section_document_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@section_router.post('/detail/seo', response_model=schemas.section.SectionInfo)
def section_seo_detail_request(
    section_seo_detail_request: schemas.section.SectionSeoDetailRequest,
    db: Session = Depends(get_db),
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_without_throw)
):
    db_section_publish = crud.section.get_publish_sections_by_uuid(
        db=db,
        uuid=section_seo_detail_request.uuid
    )
    
    if db_section_publish is None:
        raise Exception("Section is not published")
    
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=db_section_publish.section_id
    )
    
    if db_section is None:
        raise Exception("Section not found")
    
    documents_count = crud.section.count_documents_for_section_by_section_id(
        db=db, 
        section_id=db_section.id
    )
    subscribers_count = crud.section.count_users_for_section_by_section_id(
        db=db,
        section_id=db_section.id,
        filter_roles=[UserSectionRole.SUBSCRIBER]
    )
    db_labels = crud.section.get_labels_by_section_id(
        db=db,
        section_id=db_section.id
    )
    labels = [
        schemas.section.Label(
            id=label.id,
            name=label.name
        ) for label in db_labels
    ]
    
    res = schemas.section.SectionInfo(
        **db_section.__dict__,
        labels=labels,
        documents_count=documents_count,
        subscribers_count=subscribers_count,
        creator=db_section.creator,
    )
    
    db_section_podcast_task = crud.task.get_section_podcast_task_by_section_id(
        db=db,
        section_id=db_section.id
    )
    if db_section_podcast_task is not None:
        res.podcast_task = schemas.section.SectionPodcastTask(
            creator_id=db_section_podcast_task.user_id,
            status=db_section_podcast_task.status,
            podcast_file_name=db_section_podcast_task.podcast_file_name
        )
    
    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=db_section.id
    )
    if db_section_process_task is not None:
        res.process_task = schemas.section.SectionProcessTask(
            status=db_section_process_task.status
        )

    if user is not None:
        db_section_user = crud.section.get_section_user_by_section_id_and_user_id(
            db=db,
            section_id=db_section.id,
            user_id=user.id
        )
        if db_section_user is not None:
            res.authority = db_section_user.authority
    
    return res

@section_router.post('/publish', response_model=schemas.common.NormalResponse)
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
        raise Exception("Section not found")
    if db_section.creator_id != user.id:
        raise Exception("You are forbidden to publish this section")
    
    db_exist_publish_section = crud.section.get_publish_section_by_section_id(
        db=db,
        section_id=section_publish_request.section_id
    )
    if section_publish_request.status and db_exist_publish_section is None:
        db_publish_section = crud.section.create_publish_section(
            db=db,
            section_id=section_publish_request.section_id
        )
    else:
        crud.section.delete_published_section_by_section_id(
            db=db,
            section_id=section_publish_request.section_id
        )

    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/republish', response_model=schemas.common.NormalResponse)
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
        raise Exception("Section not found")
    if db_section.creator_id != user.id:
        raise Exception("You are forbidden to publish this section")

    db_publish_section = crud.section.get_publish_section_by_section_id(
        db=db,
        section_id=section_republish_request.section_id
    )
    if db_publish_section is None:
        raise Exception("Section not published yet")
    
    db_publish_section.uuid = uuid4().hex
    db_publish_section.update_time = now
    
    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/publish/get', response_model=schemas.section.SectionPublishGetResponse)
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
        raise Exception("Section not found")
    if db_section.creator_id != user.id:
        raise Exception("You are forbidden to get the publish info of this section")
    db_publish_section = crud.section.get_publish_section_by_section_id(
        db=db,
        section_id=section_publish_get_request.section_id
    )
    if db_publish_section is None:
        raise Exception("Section not published yet")
    return schemas.section.SectionPublishGetResponse(
        status=True,
        uuid=db_publish_section.uuid,
        update_time=db_publish_section.update_time,
        create_time=db_publish_section.create_time
    )

@section_router.post('/mine/role-and-authority', response_model=schemas.section.SectionUserRoleAndAuthorityResponse)
def get_mine_section_role_and_authority(
    section_user_get_request: schemas.section.MineSectionRoleAndAuthorityRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        section_id=section_user_get_request.section_id,
        user_id=user.id
    )
    if db_section_user is None:
        raise Exception("Section not found")
    return schemas.section.SectionUserRoleAndAuthorityResponse(
        section_id=section_user_get_request.section_id,
        user_id=user.id,
        role=db_section_user.role,
        authority=db_section_user.authority
    )

@section_router.post('/user/role-and-authority', response_model=schemas.section.SectionUserRoleAndAuthorityResponse)
def get_section_user_role_and_authority(
    section_user_get_request: schemas.section.SectionUserRoleAndAuthorityRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        section_id=section_user_get_request.section_id,
        user_id=section_user_get_request.user_id
    )
    if db_section_user is None:
        raise Exception("Section not found")
    return schemas.section.SectionUserRoleAndAuthorityResponse(
        section_id=section_user_get_request.section_id,
        user_id=section_user_get_request.user_id,
        role=db_section_user.role,
        authority=db_section_user.authority
    )

@section_router.post('/user', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionUserPublicInfo])
def section_user_request(
    section_user_request: schemas.section.SectionUserRequest,
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_user_request.section_id
    )
    if db_section is None:
        raise Exception("Section not found")
    db_publish_section = crud.section.get_publish_section_by_section_id(
        db=db,
        section_id=section_user_request.section_id
    )
    if db_publish_section is not None:
        pass
    else:
        # check if the user is in the section
        db_section_user = crud.section.get_section_user_by_section_id_and_user_id(
            db=db,
            user_id=user.id,
            section_id=section_user_request.section_id
        )
        if db_section_user is None or db_section_user.role not in [UserSectionRole.CREATOR, UserSectionRole.MEMBER]:
            raise Exception("You are forbidden to get the users' info about this section")
        
    has_more = True
    next_start = None
    db_next_section_user = None
    users = []
    db_section_users = crud.section.search_users_and_section_users_by_section_id(
        db=db, 
        section_id=section_user_request.section_id,
        filter_roles=section_user_request.filter_roles,
        start=section_user_request.start,
        limit=section_user_request.limit,
        keyword=section_user_request.keyword
    )
    if len(db_section_users) < section_user_request.limit or len(db_section_users) == 0:
        has_more = False
    if len(db_section_users) == section_user_request.limit:
        last_user = db_section_users[-1][0]
        db_next_section_user = crud.section.search_next_user_and_section_user_by_section_id(
            db=db,
            section_id=section_user_request.section_id,
            filter_roles=section_user_request.filter_roles,
            user=last_user,
            keyword=section_user_request.keyword
        )
        has_more = db_next_section_user is not None
        next_start = db_next_section_user[1].id if db_next_section_user is not None else None
    next_start = cast(int, db_next_section_user[1].id) if db_next_section_user is not None else None
    total = crud.section.count_users_and_section_users_by_section_id(
        db=db,
        section_id=section_user_request.section_id,
        filter_roles=section_user_request.filter_roles,
        keyword=section_user_request.keyword
    )
    for db_user, db_user_section in db_section_users:
        user_item = schemas.section.SectionUserPublicInfo.model_validate(db_user)
        user_item.authority = db_user_section.authority
        user_item.role = db_user_section.role
        users.append(
            user_item   
        )
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=users,
        start=section_user_request.start,
        limit=section_user_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@section_router.post('/user/add', response_model=schemas.common.NormalResponse)
def section_user_add_request(
    section_share_request: schemas.section.SectionUserAddRequest,
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user),
    _ = Depends(plan_ability_checked(Ability.SECTION_COLLABORATION.value)),
    
):
    section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        user_id=user.id,
        section_id=section_share_request.section_id
    )
    if section_user is None or section_user.role not in [UserSectionRole.CREATOR, UserSectionRole.MEMBER]:
        raise Exception("You are forbidden to share this section")
    
    db_exist_user_section = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        user_id=section_share_request.user_id,
        section_id=section_share_request.section_id
    )
    
    if db_exist_user_section is not None:
        raise Exception("The user is already in this section")
    
    crud.section.create_section_user(
        db=db,
        section_id=section_share_request.section_id,
        user_id=section_share_request.user_id,
        role=UserSectionRole.MEMBER,
        authority=section_share_request.authority
    )
    db.commit()
    
    return schemas.common.SuccessResponse()

@section_router.post('/user/modify', response_model=schemas.common.NormalResponse)
def section_user_modify_request(
    section_user_modify_request: schemas.section.SectionUserModifyRequest,
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    
    if user.id == section_user_modify_request.user_id:
        raise Exception("You can't modify your own authority")
    
    section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        user_id=user.id,
        section_id=section_user_modify_request.section_id
    )
    if section_user is None or section_user.role not in [UserSectionRole.CREATOR]:
        raise Exception("You are forbidden to modify member' authority")
    
    origin_section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        user_id=section_user_modify_request.user_id,
        section_id=section_user_modify_request.section_id
    )
    if origin_section_user is None:
        raise Exception("The user is not a member of this section")
    
    # 如果用户是订阅者，那么就不能修改权限，仅支持对专栏的参与者修改权限
    if origin_section_user.role == UserSectionRole.SUBSCRIBER:
        raise Exception("You can't modify subscriber's authority")
    
    if section_user_modify_request.authority is not None:
        origin_section_user.authority = section_user_modify_request.authority
    if section_user_modify_request.role is not None:
        origin_section_user.role = section_user_modify_request.role
        
    db.commit()
    
    return schemas.common.SuccessResponse()

@section_router.post('/user/delete', response_model=schemas.common.NormalResponse)
def delete_section_user(
    section_user_delete_request: schemas.section.SectionUserDeleteRequest,
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        user_id=user.id,
        section_id=section_user_delete_request.section_id
    )
    if section_user is None or section_user.role not in [UserSectionRole.CREATOR]:
        raise Exception("You are forbidden to delete user from this section")
    
    if user.id == section_user_delete_request.user_id:
        raise Exception("As the creator of the section, you can't delete yourself")
    
    crud.section.delete_section_user_by_section_id_and_user_id(
        db=db,
        section_id=section_user_delete_request.section_id,
        user_id=section_user_delete_request.user_id
    )
    
    # 由于删除用户之后就该用户和该专栏的记录就被删除了，后续发送通知的时候无法判断用户专栏关系，所以此处先发送通知再提交事务
    start_trigger_user_notification_event.delay(
        user_id=section_user_delete_request.user_id,
        trigger_event_uuid=NotificationTriggerEventUUID.REMOVED_FROM_SECTION.value,
        params={
            "section_id": section_user_delete_request.section_id,
            "user_id": section_user_delete_request.user_id
        }
    ).get()
    
    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/label/create', response_model=schemas.section.CreateLabelResponse)
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

@section_router.post("/label/list", response_model=schemas.section.LabelListResponse)
def list_label(
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    db_labels = crud.section.get_user_labels_by_user_id(
        db=db, 
        user_id=user.id
    )
    labels = [
        schemas.section.Label(id=label.id, name=label.name) for label in db_labels
    ]
    return schemas.section.LabelListResponse(data=labels)

@section_router.post('/label/delete', response_model=schemas.common.NormalResponse)
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

@section_router.post("/subscribed", response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
def get_my_subscribed_sections(
    search_subscribed_section_request: schemas.section.SearchSubscribedSectionRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    next_section = None
    db_sections = crud.section.search_user_subscribed_sections(
        db=db, 
        user_id=user.id,
        start=search_subscribed_section_request.start,
        limit=search_subscribed_section_request.limit,
        keyword=search_subscribed_section_request.keyword,
        label_ids=search_subscribed_section_request.label_ids,
        desc=search_subscribed_section_request.desc
    )
    def get_section_info(section):
        documents_count = crud.section.count_documents_for_section_by_section_id(
            db=db, 
            section_id=section.id
        )
        subscribers_count = crud.section.count_users_for_section_by_section_id(
            db=db,
            section_id=section.id,
            filter_roles=[UserSectionRole.SUBSCRIBER]
        )
        db_labels = crud.section.get_labels_by_section_id(
            db=db,
            section_id=section.id
        )
        db_user_section = crud.section.get_section_user_by_section_id_and_user_id(
            db=db,
            section_id=section.id,
            user_id=user.id
        )
        labels = [
            schemas.section.Label(id=label.id, name=label.name) for label in db_labels
        ]
        return schemas.section.SectionInfo(
            **section.__dict__,
            creator=section.creator,
            labels=labels,
            authority=db_user_section.authority if db_user_section else None,
            documents_count=documents_count,
            subscribers_count=subscribers_count
        )
    sections = [get_section_info(section) for section in db_sections]
    if len(db_sections) < search_subscribed_section_request.limit or len(db_sections) == 0:
        has_more = False
    if len(db_sections) == search_subscribed_section_request.limit:
        next_section = crud.section.search_next_user_subscribed_section(
            db=db, 
            user_id=user.id,
            section=db_sections[-1],
            keyword=search_subscribed_section_request.keyword,
            label_ids=search_subscribed_section_request.label_ids,
            desc=search_subscribed_section_request.desc
        )
        has_more = next_section is not None
        next_start = next_section.id if next_section is not None else None
    total = crud.section.count_user_subscribed_sections(
        db=db,
        user_id=user.id,
        keyword=search_subscribed_section_request.keyword,
        label_ids=search_subscribed_section_request.label_ids
    )
    return schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo](
        total=total,
        elements=sections,
        start=search_subscribed_section_request.start,
        limit=search_subscribed_section_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@section_router.post("/update", response_model=schemas.common.NormalResponse)
def update_section(
    section_update_request: schemas.section.SectionUpdateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    
    db_section = crud.section.get_section_by_section_id(
        db=db, 
        section_id=section_update_request.section_id
    )
    if db_section is None:
        raise Exception("The section is not exist")
    
    section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db, 
        user_id=user.id, 
        section_id=section_update_request.section_id
    )
    if section_user is None or section_user.authority not in [UserSectionAuthority.READ_AND_WRITE, UserSectionAuthority.FULL_ACCESS]:
        raise Exception("You are forbidden to modify this section")
    
    if section_update_request.title is not None:
        db_section.title = section_update_request.title
    if section_update_request.description is not None:
        db_section.description = section_update_request.description
    if section_update_request.cover is not None:
        db_section.cover = section_update_request.cover
    if section_update_request.labels is not None:
        exist_section_labels = crud.section.get_section_labels_by_section_id(
            db=db, 
            section_id=section_update_request.section_id
        )
        exist_section_label_ids = [label.id for label in exist_section_labels]
        new_section_label_ids = [label_id for label_id in section_update_request.labels if label_id not in exist_section_label_ids]
        crud.section.create_section_labels(
            db=db, 
            section_id=section_update_request.section_id, 
            label_ids=new_section_label_ids
        )
        labels_to_delete = [label.id for label in exist_section_labels if label.id not in section_update_request.labels]
        crud.section.delete_section_labels_by_label_ids(
            db=db,
            label_ids=labels_to_delete
        )
    if section_update_request.auto_podcast is not None:
        db_section.auto_podcast = section_update_request.auto_podcast
    if section_update_request.auto_illustration is not None:
        db_section.auto_illustration = section_update_request.auto_illustration

    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=db_section.id
    )
    if db_section_process_task is None:
        db_section_process_task = crud.task.create_section_process_task(
            db=db,
            user_id=user.id,
            section_id=db_section.id,
        )
    if section_update_request.process_task_trigger_type is not None:
        if section_update_request.process_task_trigger_type == SectionProcessTriggerType.UPDATED:
            if scheduler.get_job(f"section-process-{str(db_section.id)}") is not None:
                scheduler.remove_job(f"section-process-{str(db_section.id)}")
        
        if section_update_request.process_task_trigger_scheduler is not None and section_update_request.process_task_trigger_type == SectionProcessTriggerType.SCHEDULER:
            db_section_process_task_trigger_scheduler = crud.task.get_section_process_trigger_scheduler_by_section_id(
                db=db,
                section_id=db_section.id
            )
            if db_section_process_task_trigger_scheduler is None:
                db_section_process_task_trigger_scheduler = crud.task.create_section_process_task_trigger_scheduler(
                    db=db,
                    section_process_task_id=db_section_process_task.id,
                    cron_expr=section_update_request.process_task_trigger_scheduler
                )
            db_section_process_task_trigger_scheduler.cron_expr = section_update_request.process_task_trigger_scheduler
            if scheduler.get_job(f"section-process-{str(db_section.id)}") is not None:
                scheduler.remove_job(f"section-process-{str(db_section.id)}")
            scheduler.add_job(
                func=start_process_section,
                kwargs={
                    "section_id": db_section.id,
                    "user_id": db_section.creator_id,
                    "auto_podcast": db_section.auto_podcast
                },
                trigger=CronTrigger.from_crontab(section_update_request.process_task_trigger_scheduler),
                id=f"section-process-{str(db_section.id)}"
            )
    db_section.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/public/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
def public_sections(
    search_public_sections_request: schemas.section.SearchPublicSectionsRequest,
    db: Session = Depends(get_db),
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_without_throw)
):
    has_more = True
    next_start = None
    next_section = None
    db_sections = crud.section.search_published_sections(
        db=db, 
        start=search_public_sections_request.start,
        limit=search_public_sections_request.limit,
        keyword=search_public_sections_request.keyword,
        label_ids=search_public_sections_request.label_ids,
        desc=search_public_sections_request.desc
    )
    
    section_ids = [section.id for section in db_sections]
    documents_count_by_section_id = crud.section.count_documents_for_section_by_section_ids(db=db, section_ids=section_ids)
    subscribers_count_by_section_id = crud.section.count_users_for_section_by_section_ids(
        db=db,
        section_ids=section_ids,
        filter_roles=[UserSectionRole.SUBSCRIBER],
    )
    labels_by_section_id = crud.section.get_labels_by_section_ids(db=db, section_ids=section_ids)
    authority_by_section_id = {}
    if user is not None:
        section_users = crud.section.get_section_users_by_section_ids_and_user_id(
            db=db,
            section_ids=section_ids,
            user_id=user.id,
        )
        authority_by_section_id = {item.section_id: item.authority for item in section_users}

    sections = []
    for section in db_sections:
        labels = [
            schemas.section.Label(id=label.id, name=label.name)
            for label in labels_by_section_id.get(section.id, [])
        ]
        res = schemas.section.SectionInfo.model_validate(section)
        res.creator = section.creator
        res.labels = labels
        res.documents_count = documents_count_by_section_id.get(section.id, 0)
        res.subscribers_count = subscribers_count_by_section_id.get(section.id, 0)
        res.authority = authority_by_section_id.get(section.id)
        sections.append(res)
    
    if len(db_sections) < search_public_sections_request.limit or len(db_sections) == 0:
        has_more = False
    if len(db_sections) == search_public_sections_request.limit:
        next_section = crud.section.search_next_published_section(
            db=db, 
            section=db_sections[-1],
            keyword=search_public_sections_request.keyword,
            label_ids=search_public_sections_request.label_ids
        )
        has_more = next_section is not None
        next_start = next_section.id if next_section is not None else None
    total = crud.section.count_published_sections(
        db=db,
        keyword=search_public_sections_request.keyword,
        label_ids=search_public_sections_request.label_ids
    )
    return schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo](
        total=total,
        elements=sections,
        start=search_public_sections_request.start,
        limit=search_public_sections_request.limit,
        has_more=has_more,
        next_start=next_start
    )
    
@section_router.post('/mine/all', response_model=schemas.section.AllMySectionsResponse)
def get_all_mine_sections(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    sections = []
    db_sections = crud.section.get_user_sections(
        db=db, 
        user_id=user.id,
        filter_roles=[UserSectionRole.CREATOR, UserSectionRole.MEMBER]
    )
    section_ids = [section.id for section in db_sections]
    section_users = crud.section.get_section_users_by_section_ids_and_user_id(
        db=db,
        section_ids=section_ids,
        user_id=user.id,
    )
    authority_by_section_id = {item.section_id: item.authority for item in section_users}
    for db_section in db_sections:
        section = schemas.section.BaseSectionInfo(
            **db_section.__dict__,
            authority=authority_by_section_id.get(db_section.id)
        )
        sections.append(section)
    return schemas.section.AllMySectionsResponse(data=sections)
    
@section_router.post('/user/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
def search_user_sections(
    search_user_sections_request: schemas.section.SearchUserSectionsRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    next_section = None
    # 该接口仅在自己获取自己的所有专栏的时候会返回所有专栏，否则仅仅返回对应用户公开的专栏
    db_sections = crud.section.search_user_sections(
        db=db, 
        user_id=search_user_sections_request.user_id,
        start=search_user_sections_request.start,
        limit=search_user_sections_request.limit,
        keyword=search_user_sections_request.keyword,
        only_published=True if search_user_sections_request.user_id != user.id else False,
        label_ids=search_user_sections_request.label_ids,
        desc=search_user_sections_request.desc
    )
    
    section_ids = [section.id for section in db_sections]
    documents_count_by_section_id = crud.section.count_documents_for_section_by_section_ids(db=db, section_ids=section_ids)
    subscribers_count_by_section_id = crud.section.count_users_for_section_by_section_ids(
        db=db,
        section_ids=section_ids,
        filter_roles=[UserSectionRole.SUBSCRIBER],
    )
    labels_by_section_id = crud.section.get_labels_by_section_ids(db=db, section_ids=section_ids)
    section_users = crud.section.get_section_users_by_section_ids_and_user_id(
        db=db,
        section_ids=section_ids,
        user_id=user.id,
    )
    authority_by_section_id = {item.section_id: item.authority for item in section_users}

    sections = []
    for section in db_sections:
        res = schemas.section.SectionInfo.model_validate(section)
        res.creator = section.creator
        res.authority = authority_by_section_id.get(section.id)
        res.documents_count = documents_count_by_section_id.get(section.id, 0)
        res.subscribers_count = subscribers_count_by_section_id.get(section.id, 0)
        res.labels = [
            schemas.section.Label(id=label.id, name=label.name)
            for label in labels_by_section_id.get(section.id, [])
        ]
        sections.append(res)
    if len(db_sections) < search_user_sections_request.limit or len(db_sections) == 0:
        has_more = False
    if len(db_sections) == search_user_sections_request.limit:
        next_section = crud.section.search_next_user_section(
            db=db, 
            user_id=search_user_sections_request.user_id,
            section=db_sections[-1],
            only_published=True if search_user_sections_request.user_id != user.id else False,
            keyword=search_user_sections_request.keyword,
            label_ids=search_user_sections_request.label_ids
        )
        has_more = next_section is not None
        next_start = next_section.id if next_section is not None else None
    total = crud.section.count_user_sections(
        db=db,
        user_id=search_user_sections_request.user_id,
        only_published=True if search_user_sections_request.user_id != user.id else False,
        keyword=search_user_sections_request.keyword,
        label_ids=search_user_sections_request.label_ids
    )
    return schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo](
        total=total,
        elements=sections,
        start=search_user_sections_request.start,
        limit=search_user_sections_request.limit,
        has_more=has_more,
        next_start=next_start
    )                                                                                    
                                                    
@section_router.post('/mine/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
def search_mine_sections(
    search_mine_sections_request: schemas.section.SearchMineSectionsRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    next_section = None
    db_sections = crud.section.search_user_sections(
        db=db, 
        user_id=user.id,
        start=search_mine_sections_request.start,
        limit=search_mine_sections_request.limit,
        keyword=search_mine_sections_request.keyword,
        label_ids=search_mine_sections_request.label_ids,
        desc=search_mine_sections_request.desc
    )
    section_ids = [section.id for section in db_sections]
    documents_count_by_section_id = crud.section.count_documents_for_section_by_section_ids(db=db, section_ids=section_ids)
    subscribers_count_by_section_id = crud.section.count_users_for_section_by_section_ids(
        db=db,
        section_ids=section_ids,
        filter_roles=[UserSectionRole.SUBSCRIBER],
    )
    labels_by_section_id = crud.section.get_labels_by_section_ids(db=db, section_ids=section_ids)
    section_users = crud.section.get_section_users_by_section_ids_and_user_id(
        db=db,
        section_ids=section_ids,
        user_id=user.id,
    )
    authority_by_section_id = {item.section_id: item.authority for item in section_users}

    sections = []
    for section in db_sections:
        res = schemas.section.SectionInfo.model_validate(section)
        res.creator = section.creator
        res.authority = authority_by_section_id.get(section.id)
        res.documents_count = documents_count_by_section_id.get(section.id, 0)
        res.subscribers_count = subscribers_count_by_section_id.get(section.id, 0)
        res.labels = [
            schemas.section.Label(id=label.id, name=label.name)
            for label in labels_by_section_id.get(section.id, [])
        ]
        sections.append(res)
    if len(db_sections) < search_mine_sections_request.limit or len(db_sections) == 0:
        has_more = False
    if len(db_sections) == search_mine_sections_request.limit:
        next_section = crud.section.search_next_user_section(
            db=db, 
            user_id=user.id,
            section=db_sections[-1],
            keyword=search_mine_sections_request.keyword,
            label_ids=search_mine_sections_request.label_ids,
            desc=search_mine_sections_request.desc
        )
        has_more = next_section is not None
        next_start = next_section.id if next_section is not None else None
    total = crud.section.count_user_sections(
        db=db,
        user_id=user.id,
        keyword=search_mine_sections_request.keyword,
        label_ids=search_mine_sections_request.label_ids
    )
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=sections,
        start=search_mine_sections_request.start,
        limit=search_mine_sections_request.limit,
        has_more=has_more,
        next_start=next_start
    )
    
@section_router.post('/detail', response_model=schemas.section.SectionInfo)
def get_section_detail(
    section_detail_request: schemas.section.SectionDetailRequest,
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_without_throw),
    db: Session = Depends(get_db)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_detail_request.section_id
    )
    if db_section is None:
        raise Exception("Section not found")
    
    db_users = crud.section.get_users_for_section_by_section_id(
        db=db,
        section_id=section_detail_request.section_id,
        filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR]
    )
    
    res = None
    
    db_publish_section = crud.section.get_publish_section_by_section_id(
        db=db,
        section_id=section_detail_request.section_id
    )
    if db_publish_section is not None:
        documents_count = crud.section.count_documents_for_section_by_section_id(
            db=db, 
            section_id=db_section.id
        )
        subscribers_count = crud.section.count_users_for_section_by_section_id(
            db=db,
            section_id=db_section.id,
            filter_roles=[UserSectionRole.SUBSCRIBER]
        )
        db_labels = crud.section.get_labels_by_section_id(
            db=db,
            section_id=section_detail_request.section_id
        )
        
        labels = [
            schemas.section.Label(id=db_label.id, name=db_label.name) for db_label in db_labels
        ]
        
        res = schemas.section.SectionInfo(
            **db_section.__dict__,
            labels=labels,
            documents_count=documents_count,
            subscribers_count=subscribers_count,
            creator=db_section.creator,
        )
        
        db_section_podcast_task = crud.task.get_section_podcast_task_by_section_id(
            db=db,
            section_id=section_detail_request.section_id
        )
        if db_section_podcast_task is not None:
            res.podcast_task = schemas.section.SectionPodcastTask(
                creator_id=db_section_podcast_task.user_id,
                status=db_section_podcast_task.status,
                podcast_file_name=db_section_podcast_task.podcast_file_name
            )

        db_section_process_task = crud.task.get_section_process_task_by_section_id(
            db=db,
            section_id=section_detail_request.section_id
        )
        if db_section_process_task is not None:
            res.process_task = schemas.section.SectionProcessTask(
                status=db_section_process_task.status
            )

        if user is not None:
            db_section_user = crud.section.get_section_user_by_section_id_and_user_id(
                db=db,
                section_id=section_detail_request.section_id,
                user_id=user.id
            )
            if db_section_user is not None:
                res.authority = db_section_user.authority
                if db_section_user.role == UserSectionRole.SUBSCRIBER:
                    res.is_subscribed = True
    else:
        if user is None:
            raise Exception("This section is private, anonymous user can't access it")
        elif user.id not in [db_user.id for db_user in db_users]:
            raise Exception("You don't have permission to access this section")
        else:
            documents_count = crud.section.count_documents_for_section_by_section_id(
                db=db, 
                section_id=db_section.id
            )
            subscribers_count = crud.section.count_users_for_section_by_section_id(
                db=db,
                section_id=db_section.id,
                filter_roles=[UserSectionRole.SUBSCRIBER]
            )
            db_labels = crud.section.get_labels_by_section_id(
                db=db,
                section_id=section_detail_request.section_id
            )
            labels = [
                schemas.section.Label(id=db_label.id, name=db_label.name) for db_label in db_labels
            ]
            
            res = schemas.section.SectionInfo(
                **db_section.__dict__,
                labels=labels,
                documents_count=documents_count,
                subscribers_count=subscribers_count,
                creator=db_section.creator,
            )
            
            db_section_podcast_task = crud.task.get_section_podcast_task_by_section_id(
                db=db,
                section_id=section_detail_request.section_id
            )
            if db_section_podcast_task is not None:
                res.podcast_task = schemas.section.SectionPodcastTask(
                    creator_id=db_section_podcast_task.user_id,
                    status=db_section_podcast_task.status,
                    podcast_file_name=db_section_podcast_task.podcast_file_name
                )

            db_section_process_task = crud.task.get_section_process_task_by_section_id(
                db=db,
                section_id=section_detail_request.section_id
            )
            if db_section_process_task is not None:
                res.process_task = schemas.section.SectionProcessTask(
                    status=db_section_process_task.status
                )

            db_section_user = crud.section.get_section_user_by_section_id_and_user_id(
                db=db,
                section_id=section_detail_request.section_id,
                user_id=user.id
            )
            
            if db_section_user is not None:
                res.authority = db_section_user.authority
                if db_section_user.role == UserSectionRole.SUBSCRIBER:
                    res.is_subscribed = True
    db_section_process_trigger_type = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=section_detail_request.section_id
    )
    if db_section_process_trigger_type is not None:
        res.process_task_trigger_type = db_section_process_trigger_type.trigger_type
        db_section_process_trigger_scheduler = crud.task.get_section_process_trigger_scheduler_by_section_id(
            db=db,
            section_id=section_detail_request.section_id
        )
        if db_section_process_trigger_scheduler is not None:
            res.process_task_trigger_scheduler = db_section_process_trigger_scheduler.cron_expr
    return res

@section_router.post('/date', response_model=schemas.section.DaySectionResponse)
def get_date_section_info(
    day_section_request: schemas.section.DaySectionRequest,
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    date = datetime.strptime(day_section_request.date, "%Y-%m-%d").date()
    db_section = crud.section.get_section_by_user_and_date(
        db=db, 
        user_id=user.id,
        date=date
    )
    if db_section is None:
        raise schemas.error.CustomException(code=404, message="The summary section of this day is not created yet")
    
    db_documents = crud.section.get_documents_for_section_by_section_id(
        db=db, 
        section_id=db_section.id
    )
    section_docs = crud.section.get_section_documents_by_section_id(
        db=db, 
        section_id=db_section.id
    )
    status_map = { sd.document_id: sd.status for sd in section_docs }

    # 生成结果列表
    documents = [
        schemas.section.SectionDocumentInfo.model_validate({
            **document.__dict__,
            'title': document.title or 'Unnamed document',
            'status': status_map.get(document.id)
        })
        for document in db_documents
    ]
    
    res = schemas.section.DaySectionResponse(
        section_id=db_section.id,
        creator=db_section.creator,
        create_time=db_section.create_time,
        update_time=db_section.update_time,
        date=day_section_request.date,
        title=db_section.title,
        description=db_section.description,
        md_file_name=db_section.md_file_name,
        documents=documents
    )
    return res

@section_router.post('/create', response_model=schemas.section.SectionCreateResponse)
def create_section(
    section_create_request: schemas.section.SectionCreateRequest,
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    db_section = crud.section.create_section(
        db=db, 
        creator_id=user.id,
        cover=section_create_request.cover,
        title=section_create_request.title, 
        description=section_create_request.description,
        auto_podcast=section_create_request.auto_podcast,
        auto_illustration=section_create_request.auto_illustration
    )
    if section_create_request.labels:
        crud.section.create_section_labels(
            db=db, 
            section_id=db_section.id, 
            label_ids=section_create_request.labels
        )
    crud.section.create_section_user(
        db=db,
        section_id=db_section.id,
        user_id=user.id,
        role=UserSectionRole.CREATOR,
        authority=UserSectionAuthority.FULL_ACCESS
    )
    if section_create_request.auto_publish:
        crud.section.create_publish_section(
            db=db, 
            section_id=db_section.id
        )
    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=db_section.id
    )
    if db_section_process_task is None:
        db_section_process_task = crud.task.create_section_process_task(
            db=db,
            user_id=user.id,
            section_id=db_section.id
        )
    db_section_process_task.trigger_type = section_create_request.process_task_trigger_type
    
    if section_create_request.process_task_trigger_scheduler is not None:
        crud.task.create_section_process_task_trigger_scheduler(
            db=db,
            section_process_task_id=db_section_process_task.id,
            cron_expr=section_create_request.process_task_trigger_scheduler
        )
        db.commit()
        if db_section_process_task.trigger_type == SectionProcessTriggerType.SCHEDULER:
            scheduler.add_job(
                func=start_process_section,
                kwargs={
                    "section_id": db_section.id,
                    "user_id": db_section.creator_id,
                    "auto_podcast": db_section.auto_podcast
                },
                trigger=CronTrigger.from_crontab(section_create_request.process_task_trigger_scheduler),
                id=f"section-process-{str(db_section.id)}"
            )
    db.commit()
    return schemas.section.SectionCreateResponse(id=db_section.id)

# 可免费订阅的专栏直接在这里处理，付费专栏订阅放到java微服务中去处理，注意付费专栏的取消订阅这部分逻辑还是在这里处理的
@section_router.post('/subscribe', response_model=schemas.common.NormalResponse)
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
        raise Exception("Section not found")
    
    db_user_section = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        section_id=section_subscribe_request.section_id,
        user_id=user.id
    )
    
    if db_user_section is not None:
        if db_user_section.role == UserSectionRole.MEMBER:
            raise Exception("You are already a member of this section, so you don't need to subscribe again")
        elif db_user_section.role == UserSectionRole.SUBSCRIBER:
            if section_subscribe_request.status:
                raise Exception("You are already a subscriber of this section, so you don't need to subscribe again")
            else:
                crud.section.delete_section_user_by_section_id_and_user_id(
                    db=db, 
                    section_id=section_subscribe_request.section_id,
                    user_id=user.id
                )
    else:
        if section_subscribe_request.status:
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
    db.commit()
    return schemas.common.SuccessResponse()    

@section_router.post('/delete', response_model=schemas.common.NormalResponse)
def delete_section(
    section_delete_request: schemas.section.SectionDeleteRequest,
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    db_section_user = crud.section.get_section_user_by_section_id_and_user_id(
        db=db,
        section_id=section_delete_request.section_id,    
        user_id=user.id
    )
    if db_section_user is None or db_section_user.role not in [UserSectionRole.CREATOR]:
        raise Exception("You are forbidden to delete this section")

    crud.section.delete_section_users_by_section_id(
        db=db, 
        section_id=section_delete_request.section_id
    )
    crud.section.delete_section_documents_by_section_id(
        db=db,
        section_id=section_delete_request.section_id
    )
    crud.section.delete_section_labels_by_section_id(
        db=db,
        section_id=section_delete_request.section_id
    )
    crud.section.delete_section_comments_by_section_id(
        db=db,
        section_id=section_delete_request.section_id
    )
    crud.section.delete_section_by_section_id(
        db=db, 
        section_id=section_delete_request.section_id
    )
    db.commit()
    db_users = crud.section.get_users_for_section_by_section_id(
        db=db,
        section_id=section_delete_request.section_id,
        filter_roles=[UserSectionRole.MEMBER, UserSectionRole.SUBSCRIBER]
    )
    for db_user in db_users:
        if db_user.id != user.id:
            start_trigger_user_notification_event.delay(
                user_id=db_user.id,
                trigger_event_uuid=NotificationTriggerEventUUID.REMOVED_FROM_SECTION.value,
                params={
                    "section_id": section_delete_request.section_id,
                    "user_id": db_user.id
                }
            )
    return schemas.common.SuccessResponse()
    
@section_router.post('/comment/create', response_model=schemas.common.NormalResponse)
def create_section_comment(
    section_comment_create_request: schemas.section.SectionCommentCreateRequest,
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_comment_create_request.section_id
    )
    if db_section is None:
        raise Exception("Section not found")
    
    crud.section.create_section_comment(
        db=db,
        section_id=section_comment_create_request.section_id,
        creator_id=user.id,
        content=section_comment_create_request.content
    )
    db.commit()
    db_users = crud.section.get_users_for_section_by_section_id(
        db=db,
        section_id=section_comment_create_request.section_id,
        filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR]
    )
    for db_user in db_users:
        start_trigger_user_notification_event.delay(
            user_id=db_user.id,
            trigger_event_uuid=NotificationTriggerEventUUID.SECTION_COMMENTED.value,
            params={
                "section_id": section_comment_create_request.section_id,
                "user_id": db_user.id
            }
        )
    return schemas.common.SuccessResponse()

@section_router.post('/comment/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionCommentInfo])
def search_section_comment(
    section_comment_search_request: schemas.section.SectionCommentSearchRequest,
    db: Session = Depends(get_db), 
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_without_throw)
):
    has_more = True
    next_start = None
    next_section_comment = None
    db_section_parent_degree_comments = crud.section.search_parent_degree_section_comments(
        db=db,
        section_id=section_comment_search_request.section_id,
        keyword=section_comment_search_request.keyword,
        start=section_comment_search_request.start,
        limit=section_comment_search_request.limit
    )
    total_parent = crud.section.count_parent_degree_section_comments(
        db=db,
        section_id=section_comment_search_request.section_id,
        keyword=section_comment_search_request.keyword
    )
    if len(db_section_parent_degree_comments) < section_comment_search_request.limit or len(db_section_parent_degree_comments) == 0:
        has_more = False
    if len(db_section_parent_degree_comments) == section_comment_search_request.limit:
        next_section_comment = crud.section.search_next_parent_degree_section_comment(
            db=db, 
            section_id=section_comment_search_request.section_id,
            section_comment=db_section_parent_degree_comments[-1],
            keyword=section_comment_search_request.keyword
        )
        has_more = next_section_comment is not None
        next_start = next_section_comment.id if next_section_comment is not None else None
    section_parent_degree_comments = [
        schemas.section.SectionCommentInfo.model_validate(db_section_parent_degree_comment) for db_section_parent_degree_comment in db_section_parent_degree_comments
    ]
    res = schemas.pagination.InifiniteScrollPagnition(
        total=total_parent,
        elements=section_parent_degree_comments,
        start=section_comment_search_request.start,
        limit=section_comment_search_request.limit,
        has_more=has_more,
        next_start=next_start
    )
    return res

@section_router.post('/comment/delete', response_model=schemas.common.NormalResponse)
def delete_section_comment(
    section_comment_delete_request: schemas.section.SectionCommentDeleteRequest,
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    crud.section.delete_section_comments_by_section_comment_ids(
        db=db,
        user_id=user.id,
        section_comment_ids=section_comment_delete_request.section_comment_ids
    )
    db.commit()
    
    return schemas.common.SuccessResponse()
