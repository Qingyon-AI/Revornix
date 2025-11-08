import schemas
import crud
import models
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy.orm import Session
from common.dependencies import get_db, get_current_user, get_current_user_without_throw
from common.common import get_user_remote_file_system
from enums.section import UserSectionAuthority, UserSectionRole, SectionPodcastStatus, SectionProcessStatus
from common.celery.app import start_process_section_podcast, update_section_process_status
from celery import chain

section_router = APIRouter()

@section_router.post('/podcast/generate', response_model=schemas.common.NormalResponse)
async def generate_podcast(generate_podcast_request: schemas.section.GenerateSectionPodcastRequest,
                           user: models.user.User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    db_section = crud.section.get_section_by_section_id(db=db,
                                                        section_id=generate_podcast_request.section_id)
    if db_section is None:
        raise Exception('The section you want to generate the podcast is not found')
    if db_section.creator_id != user.id:
        raise Exception('You are not the creator of this section, so you can not generate the podcast')
    
    if user.default_user_file_system is None:
        raise Exception('Please set the default file system for the user first.')
    else:
        remote_file_service = await get_user_remote_file_system(user_id=user.id)
        await remote_file_service.init_client_by_user_file_system_id(user_file_system_id=user.default_user_file_system)

    db_exist_podcast_task = crud.task.get_section_podcast_task_by_section_id(db=db,
                                                                             section_id=generate_podcast_request.section_id)
    if db_exist_podcast_task is not None:
        if db_exist_podcast_task.status == SectionPodcastStatus.SUCCESS:
            raise Exception('The podcast task is already finished, please refresh the page')
        if db_exist_podcast_task.status == SectionPodcastStatus.WAIT_TO:
            raise Exception('The podcast task is already in the queue, please wait')
        if db_exist_podcast_task.status == SectionPodcastStatus.GENERATING:
            raise Exception('The podcast task is already processing, please wait')
    db_section_process_task = crud.task.get_section_podcast_task_by_section_id(db=db,
                                                                               section_id=generate_podcast_request.section_id)
    if db_section_process_task is None:
        db_section_process_task = crud.task.create_section_process_task(db=db,
                                                                        user_id=user.id,
                                                                        section_id=generate_podcast_request.section_id)
    db_section_process_task.status = SectionProcessStatus.WAIT_TO
    db.commit()
    workflow = chain(
        start_process_section_podcast.si(db_section.id, user.id),
        update_section_process_status.si(db_section.id, SectionProcessStatus.SUCCESS)
    )
    workflow()
    return schemas.common.SuccessResponse()

@section_router.post('/documents', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionDocumentInfo])
async def section_document_request(section_document_request: schemas.section.SectionDocumentRequest,
                                   db: Session = Depends(get_db),
                                   user: schemas.user.PrivateUserInfo = Depends(get_current_user_without_throw)):
    db_section = crud.section.get_section_by_section_id(db=db,
                                                        section_id=section_document_request.section_id)
    if db_section is None:
        raise Exception("Section not found")
    
    has_more = True
    next_start = None
    db_documents = crud.document.search_section_documents(db=db, 
                                                          section_id=section_document_request.section_id,
                                                          start=section_document_request.start,
                                                          limit=section_document_request.limit,
                                                          keyword=section_document_request.keyword,
                                                          desc=section_document_request.desc)
    
    def get_section_document_info(document: models.document.Document): 
        db_labels = crud.document.get_labels_by_document_id(db=db,
                                                            document_id=document.id)
        db_section_document = crud.section.get_section_document_by_section_id_and_document_id(db=db,
                                                                                              section_id=section_document_request.section_id,
                                                                                              document_id=document.id)
        return schemas.section.SectionDocumentInfo.model_validate({
            **document.__dict__,
            'title': document.title or 'Unnamed document',
            'status': db_section_document.status,
            'labels': db_labels,
        })
    documents = [get_section_document_info(document) for document in db_documents]
    if len(documents) < section_document_request.limit or len(documents) == 0:
        has_more = False
    if len(documents) == section_document_request.limit:
        next_document = crud.document.search_next_section_document(db=db, 
                                                                   section_id=section_document_request.section_id,
                                                                   document=db_documents[-1],
                                                                   keyword=section_document_request.keyword,
                                                                   desc=section_document_request.desc)
        has_more = next_document is not None
        next_start = next_document.id if has_more else None
    total = crud.document.count_section_documents(db=db,
                                                  section_id=section_document_request.section_id,
                                                  keyword=section_document_request.keyword,)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=section_document_request.start,
        limit=section_document_request.limit,
        has_more=has_more,
        next_start=next_start
    )
    
@section_router.post('/detail/seo', response_model=schemas.section.SectionInfo)
async def section_seo_detail_request(section_seo_detail_request: schemas.section.SectionSeoDetailRequest,
                                     db: Session = Depends(get_db),
                                     user: schemas.user.PrivateUserInfo = Depends(get_current_user_without_throw)):
    db_section_publish = crud.section.get_publish_sections_by_uuid(db=db,
                                                                   uuid=section_seo_detail_request.uuid)
    
    if db_section_publish is None:
        raise Exception("Section is not published")
    
    db_section = crud.section.get_section_by_section_id(db=db,
                                                        section_id=db_section_publish.section_id)
    
    if db_section is None:
        raise Exception("Section not found")
    
    documents_count = crud.section.count_section_documents_by_section_id(db=db, 
                                                                         section_id=db_section.id)
    subscribers_count = crud.section.count_section_subscribers_by_section_id(db=db,
                                                                             section_id=db_section.id)
    db_labels = crud.section.get_labels_by_section_id(db=db,
                                                      section_id=db_section.id)
    
    res = schemas.section.SectionInfo(
        **db_section.__dict__,
        labels=db_labels,
        documents_count=documents_count,
        subscribers_count=subscribers_count,
        creator=db_section.creator,
    )
    
    db_section_podcast_task = crud.task.get_section_podcast_task_by_section_id(db=db,
                                                                               section_id=db_section.id)
    if db_section_podcast_task is not None:
        res.podcast_task = schemas.section.SectionPodcastTask(
            status=db_section_podcast_task.status
        )
    
    db_section_podcast = crud.section.get_section_podcast_by_section_id(db=db,
                                                                        section_id=db_section.id)
    if db_section_podcast is not None:
        res.podcast_info = schemas.section.SectionPodcastInfo(creator_id=db_section.creator_id,
                                                              podcast_file_name=db_section_podcast.podcast_file_name)

    
    db_section_process_task = crud.task.get_section_process_task_by_section_id(db=db,
                                                                               section_id=db_section.id)
    if db_section_process_task is not None:
        res.process_task = schemas.section.SectionProcessTask(
            status=db_section_process_task.status
        )

    if user is not None:
        db_section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                  section_id=db_section.id,
                                                                                  user_id=user.id)
        if db_section_user is not None:
            res.authority = db_section_user.authority
    
    return res

@section_router.post('/publish', response_model=schemas.common.NormalResponse)
async def section_publish_request(section_publish_request: schemas.section.SectionPublishRequest,
                                  db: Session = Depends(get_db),
                                  user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_section = crud.section.get_section_by_section_id(db=db,
                                                        section_id=section_publish_request.section_id)
    if db_section is None:
        raise Exception("Section not found")
    if db_section.creator_id != user.id:
        raise Exception("You are forbidden to publish this section")
    
    db_exist_publish_section = crud.section.get_publish_section_by_section_id(db=db,
                                                                              section_id=section_publish_request.section_id)
    if section_publish_request.status and db_exist_publish_section is None:
        db_publish_section = crud.section.create_publish_section(db=db,
                                                                 section_id=section_publish_request.section_id)
    else:
        crud.section.delete_publish_section_by_section_id(db=db,
                                                          section_id=section_publish_request.section_id)

    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/republish', response_model=schemas.common.NormalResponse)
async def section_republish(section_republish_request: schemas.section.SectionRePublishRequest,
                            db: Session = Depends(get_db),
                            user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    db_section = crud.section.get_section_by_section_id(db=db,
                                                        section_id=section_republish_request.section_id)
    if db_section is None:
        raise Exception("Section not found")
    if db_section.creator_id != user.id:
        raise Exception("You are forbidden to publish this section")

    db_publish_section = crud.section.get_publish_section_by_section_id(db=db,
                                                                        section_id=section_republish_request.section_id)
    if db_publish_section is None:
        raise Exception("Section not published yet")
    
    db_publish_section.uuid = uuid4().hex
    db_publish_section.update_time = now
    
    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/publish/get', response_model=schemas.section.SectionPublishGetResponse)
async def section_publish_get_request(section_publish_get_request: schemas.section.SectionPublishGetRequest,
                                      db: Session = Depends(get_db),
                                      user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_section = crud.section.get_section_by_section_id(db=db,
                                                        section_id=section_publish_get_request.section_id)
    if db_section is None:
        raise Exception("Section not found")
    if db_section.creator_id != user.id:
        raise Exception("You are forbidden to get the publish info of this section")
    db_publish_section = crud.section.get_publish_section_by_section_id(db=db,
                                                                        section_id=section_publish_get_request.section_id)
    if db_publish_section is None:
        return schemas.section.SectionPublishGetResponse(status=False)
    return schemas.section.SectionPublishGetResponse(status=True,
                                                     uuid=db_publish_section.uuid,
                                                     update_time=db_publish_section.update_time,
                                                     create_time=db_publish_section.create_time)


@section_router.post('/user', response_model=schemas.section.SectionUserResponse)
async def section_user_request(section_user_request: schemas.section.SectionUserRequest,
                               db: Session = Depends(get_db), 
                               user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_section = crud.section.get_section_by_section_id(db=db,
                                                        section_id=section_user_request.section_id)
    if db_section is None:
        raise Exception("Section not found")
    db_publish_section = crud.section.get_publish_section_by_section_id(db=db,
                                                                        section_id=section_user_request.section_id)
    if db_publish_section is not None:
        pass
    else:
        # check if the user is in the section
        db_section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                  user_id=user.id,
                                                                                  section_id=section_user_request.section_id)
        if db_section_user is None or db_section_user.role not in [UserSectionRole.CREATOR, UserSectionRole.MEMBER]:
            raise Exception("You are forbidden to get the users' info about this section")
    users = []
    db_section_users = crud.section.get_users_and_section_users_by_section_id(db=db, 
                                                                              section_id=section_user_request.section_id,
                                                                              filter_roles=section_user_request.filter_roles)
    for db_user, db_user_section in db_section_users:
        users.append(schemas.section.SectionUserPublicInfo(**db_user.__dict__,
                                                            authority=db_user_section.authority,
                                                            role=db_user_section.role))
    return schemas.section.SectionUserResponse(users=users)

@section_router.post('/user/add', response_model=schemas.common.NormalResponse)
async def section_user_add_request(section_share_request: schemas.section.SectionUserAddRequest,
                                   db: Session = Depends(get_db), 
                                   user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                           user_id=user.id,
                                                                           section_id=section_share_request.section_id)
    if section_user is None or section_user.role not in [UserSectionRole.CREATOR, UserSectionRole.MEMBER]:
        raise Exception("You are forbidden to share this section")
    
    db_exist_user_section = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                    user_id=section_share_request.user_id,
                                                                                    section_id=section_share_request.section_id)
    
    if db_exist_user_section is not None:
        raise Exception("The user is already in this section")
    
    db_new_user_section = crud.section.create_section_user(db=db,
                                                           section_id=section_share_request.section_id,
                                                           user_id=section_share_request.user_id,
                                                           role=UserSectionRole.MEMBER,
                                                           authority=section_share_request.authority)
    db.commit()
    
    return schemas.common.SuccessResponse()

@section_router.post('/user/modify', response_model=schemas.common.NormalResponse)
async def section_user_modify_request(section_user_modify_request: schemas.section.SectionUserModifyRequest,
                                      db: Session = Depends(get_db), 
                                      user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    
    if user.id == section_user_modify_request.user_id:
        raise Exception("You can't modify your own authority")
    
    section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                           user_id=user.id,
                                                                           section_id=section_user_modify_request.section_id)
    if section_user is None or section_user.role not in [UserSectionRole.CREATOR]:
        raise Exception("You are forbidden to modify member' authority")
    
    origin_section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                  user_id=section_user_modify_request.user_id,
                                                                                  section_id=section_user_modify_request.section_id)
    if origin_section_user is None:
        raise Exception("The user is not a member of this section")
    
    if section_user_modify_request.authority is not None:
        origin_section_user.authority = section_user_modify_request.authority
    if section_user_modify_request.role is not None:
        origin_section_user.role = section_user_modify_request.role
        
    db.commit()
    
    return schemas.common.SuccessResponse()

@section_router.post('/user/delete', response_model=schemas.common.NormalResponse)
async def delete_section_user(section_user_delete_request: schemas.section.SectionUserDeleteRequest,
                              db: Session = Depends(get_db), 
                              user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                           user_id=user.id,
                                                                           section_id=section_user_delete_request.section_id)
    if section_user is None or section_user.role not in [UserSectionRole.CREATOR]:
        raise Exception("You are forbidden to delete user from this section")
    
    if user.id == section_user_delete_request.user_id:
        raise Exception("As the creator of the section, you can't delete yourself")
    
    crud.section.delete_section_user_by_section_id_and_user_id(db=db,
                                                               section_id=section_user_delete_request.section_id,
                                                               user_id=section_user_delete_request.user_id)
    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/label/create', response_model=schemas.section.CreateLabelResponse)
async def add_label(label_add_request: schemas.section.LabelAddRequest,
                    db: Session = Depends(get_db), 
                    user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_label = crud.section.create_label(db=db, 
                                         name=label_add_request.name, 
                                         user_id=user.id)
    db.commit()
    return schemas.section.CreateLabelResponse(id=db_label.id, 
                                               name=db_label.name)

@section_router.post("/label/list", response_model=schemas.section.LabelListResponse)
async def list_label(db: Session = Depends(get_db), 
                     user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    labels = crud.section.get_user_labels_by_user_id(db=db, 
                                                     user_id=user.id)
    return schemas.section.LabelListResponse(data=labels)

@section_router.post('/label/delete', response_model=schemas.common.NormalResponse)
async def delete_label(label_delete_request: schemas.section.LabelDeleteRequest,
                       db: Session = Depends(get_db), 
                       user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.document.delete_labels_by_label_ids(db=db, 
                                             label_ids=label_delete_request.label_ids,
                                             user_id=user.id)
    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post("/subscribed", response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
async def get_my_subscribed_sections(
    search_subscribed_section_request: schemas.section.SearchSubscribedSectionRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    db_sections = crud.section.search_user_subscribed_sections(db=db, 
                                                               user_id=user.id,
                                                               start=search_subscribed_section_request.start,
                                                               limit=search_subscribed_section_request.limit,
                                                               keyword=search_subscribed_section_request.keyword,
                                                               label_ids=search_subscribed_section_request.label_ids,
                                                               desc=search_subscribed_section_request.desc)
    def get_section_info(section):
        documents_count = crud.section.count_section_documents_by_section_id(db=db, 
                                                                             section_id=section.id)
        subscribers_count = crud.section.count_section_subscribers_by_section_id(db=db,
                                                                                 section_id=section.id)
        db_labels = crud.section.get_labels_by_section_id(db=db,
                                                          section_id=section.id)
        db_user_section = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                  section_id=section.id,
                                                                                  user_id=user.id)
        return schemas.section.SectionInfo(
            **section.__dict__,
            creator=section.creator,
            labels=db_labels,
            authority=db_user_section.authority if db_user_section else None,
            documents_count=documents_count,
            subscribers_count=subscribers_count
        )
    db_sections = [get_section_info(section) for section in db_sections]
    if len(db_sections) < search_subscribed_section_request.limit or len(db_sections) == 0:
        has_more = False
    if len(db_sections) == search_subscribed_section_request.limit:
        next_section = crud.section.search_next_user_subscribed_section(db=db, 
                                                                        user_id=user.id,
                                                                        section=db_sections[-1],
                                                                        keyword=search_subscribed_section_request.keyword,
                                                                        label_ids=search_subscribed_section_request.label_ids,
                                                                        desc=search_subscribed_section_request.desc)
        has_more = next_section is not None
        next_start = next_section.id if has_more else None
    total = crud.section.count_user_subscribed_sections(db=db,
                                                        user_id=user.id,
                                                        keyword=search_subscribed_section_request.keyword,
                                                        label_ids=search_subscribed_section_request.label_ids)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=db_sections,
        start=search_subscribed_section_request.start,
        limit=search_subscribed_section_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@section_router.post("/update", response_model=schemas.common.NormalResponse)
async def update_section(
    section_update_request: schemas.section.SectionUpdateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    
    db_section = crud.section.get_section_by_section_id(db=db, 
                                                        section_id=section_update_request.section_id)
    if db_section is None:
        raise Exception("The section is not exist")
    
    section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db, 
                                                                           user_id=user.id, 
                                                                           section_id=section_update_request.section_id)
    if section_user is None or section_user.authority not in [UserSectionAuthority.READ_AND_WRITE, UserSectionAuthority.FULL_ACCESS]:
        raise Exception("You are forbidden to modify this section")
    
    if section_update_request.title is not None:
        db_section.title = section_update_request.title
    if section_update_request.description is not None:
        db_section.description = section_update_request.description
    if section_update_request.cover is not None:
        db_section.cover = section_update_request.cover
    if section_update_request.labels is not None:
        exist_section_labels = crud.section.get_section_labels_by_section_id(db=db, 
                                                                             section_id=section_update_request.section_id)
        exist_section_label_ids = [label.id for label in exist_section_labels]
        new_section_label_ids = [label_id for label_id in section_update_request.labels if label_id not in exist_section_label_ids]
        crud.section.bind_labels_to_section(db=db, 
                                            section_id=section_update_request.section_id, 
                                            label_ids=new_section_label_ids)
        labels_to_delete = [label.id for label in exist_section_labels if label.id not in section_update_request.labels]
        crud.section.delete_section_labels_by_label_ids(db=db,
                                                        label_ids=labels_to_delete)
    if section_update_request.auto_podcast is not None:
        db_section.auto_podcast = section_update_request.auto_podcast
    db_section.update_time = now
    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/public/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
async def search_public_sections(
    search_public_sections_request: schemas.section.SearchPublicSectionsRequest,
    db: Session = Depends(get_db),
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_without_throw)
):
    has_more = True
    next_start = None
    db_sections = crud.section.search_public_sections(db=db, 
                                                      start=search_public_sections_request.start,
                                                      limit=search_public_sections_request.limit,
                                                      keyword=search_public_sections_request.keyword,
                                                      label_ids=search_public_sections_request.label_ids,
                                                      desc=search_public_sections_request.desc)
    
    def get_section_info(section):
        documents_count = crud.section.count_section_documents_by_section_id(db=db, 
                                                                             section_id=section.id)
        subscribers_count = crud.section.count_section_subscribers_by_section_id(db=db,
                                                                                 section_id=section.id)
        db_labels = crud.section.get_labels_by_section_id(db=db,
                                                          section_id=section.id)
        section = schemas.section.SectionInfo(
            **section.__dict__,
            creator=section.creator,
            labels=db_labels,
            documents_count=documents_count,
            subscribers_count=subscribers_count
        )
        
        if user is not None:
            db_section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                      section_id=section.id,
                                                                                      user_id=user.id)
            if db_section_user is not None:
                section.authority = db_section_user.authority
                
        return section
    
    db_sections = [get_section_info(section) for section in db_sections]
    
    if len(db_sections) < search_public_sections_request.limit or len(db_sections) == 0:
        has_more = False
    if len(db_sections) == search_public_sections_request.limit:
        next_section = crud.section.search_next_public_section(db=db, 
                                                               section=db_sections[-1],
                                                               keyword=search_public_sections_request.keyword,
                                                               label_ids=search_public_sections_request.label_ids)
        has_more = next_section is not None
        next_start = next_section.id if has_more else None
    total = crud.section.countpublic_sections(db=db,
                                               keyword=search_public_sections_request.keyword,
                                               label_ids=search_public_sections_request.label_ids)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=db_sections,
        start=search_public_sections_request.start,
        limit=search_public_sections_request.limit,
        has_more=has_more,
        next_start=next_start
    )
    
@section_router.post('/mine/all', response_model=schemas.section.AllMySectionsResponse)
async def get_all_mine_sections(db: Session = Depends(get_db),
                                user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    sections = []
    db_sections = crud.section.get_all_my_sections(db=db, 
                                                   user_id=user.id)
    for db_section in db_sections:
        db_section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                  section_id=db_section.id,
                                                                                  user_id=user.id)
        section = schemas.section.BaseSectionInfo(
            **db_section.__dict__,
            authority=db_section_user.authority
        )
        sections.append(section)
    return schemas.section.AllMySectionsResponse(data=sections)
    
@section_router.post('/user/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
async def search_user_sections(search_user_sections_request: schemas.section.SearchUserSectionsRequest,
                               db: Session = Depends(get_db),
                               user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    has_more = True
    next_start = None
    # 该接口仅在自己获取自己的所有专栏的时候会返回所有专栏，否则仅仅返回对应用户公开的专栏
    db_sections = crud.section.search_user_sections(db=db, 
                                                    user_id=search_user_sections_request.user_id,
                                                    start=search_user_sections_request.start,
                                                    limit=search_user_sections_request.limit,
                                                    keyword=search_user_sections_request.keyword,
                                                    only_public=True if search_user_sections_request.user_id != user.id else False,
                                                    label_ids=search_user_sections_request.label_ids,
                                                    desc=search_user_sections_request.desc)
    
    def get_section_info(section):
        documents_count = crud.section.count_section_documents_by_section_id(db=db, 
                                                                             section_id=section.id)
        subscribers_count = crud.section.count_section_subscribers_by_section_id(db=db,
                                                                                 section_id=section.id)
        db_section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                  section_id=section.id,
                                                                                  user_id=user.id)
        return schemas.section.SectionInfo(
            **section.__dict__,
            creator=section.creator,
            authority=db_section_user.authority if db_section_user else None,
            cover=section.cover,
            documents_count=documents_count,
            subscribers_count=subscribers_count
        )
        
    db_sections = [get_section_info(section) for section in db_sections]
    if len(db_sections) < search_user_sections_request.limit or len(db_sections) == 0:
        has_more = False
    if len(db_sections) == search_user_sections_request.limit:
        next_notification = crud.section.search_next_user_section(db=db, 
                                                                  user_id=search_user_sections_request.id,
                                                                  section=db_sections[-1],
                                                                  keyword=search_user_sections_request.keyword,
                                                                  label_ids=search_user_sections_request.label_ids)
        has_more = next_notification is not None
        next_start = next_notification.id if has_more else None
    total = crud.section.count_user_sections(db=db,
                                             user_id=user.id,
                                             keyword=search_user_sections_request.keyword,
                                             label_ids=search_user_sections_request.label_ids)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=db_sections,
        start=search_user_sections_request.start,
        limit=search_user_sections_request.limit,
        has_more=has_more,
        next_start=next_start
    )                                                                                    
                                                    
@section_router.post('/mine/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
async def search_mine_sections(search_mine_sections_request: schemas.section.SearchMineSectionsRequest,
                               db: Session = Depends(get_db),
                               user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    has_more = True
    next_start = None
    db_sections = crud.section.search_user_sections(db=db, 
                                                    user_id=user.id,
                                                    start=search_mine_sections_request.start,
                                                    limit=search_mine_sections_request.limit,
                                                    keyword=search_mine_sections_request.keyword,
                                                    label_ids=search_mine_sections_request.label_ids,
                                                    desc=search_mine_sections_request.desc)
    def get_section_info(section):
        documents_count = crud.section.count_section_documents_by_section_id(db=db, 
                                                                             section_id=section.id)
        subscribers_count = crud.section.count_section_subscribers_by_section_id(db=db,
                                                                                 section_id=section.id)
        db_labels = crud.section.get_labels_by_section_id(db=db, 
                                                          section_id=section.id)
        db_user_section = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                  user_id=user.id,
                                                                                  section_id=section.id)
        return schemas.section.SectionInfo(
            **section.__dict__,
            creator=section.creator,
            authority=db_user_section.authority if db_user_section else None,
            labels=db_labels,
            documents_count=documents_count,
            subscribers_count=subscribers_count
        )
    db_sections = [get_section_info(section) for section in db_sections]
    if len(db_sections) < search_mine_sections_request.limit or len(db_sections) == 0:
        has_more = False
    if len(db_sections) == search_mine_sections_request.limit:
        next_notification = crud.section.search_next_user_section(db=db, 
                                                                  user_id=user.id,
                                                                  section=db_sections[-1],
                                                                  keyword=search_mine_sections_request.keyword,
                                                                  label_ids=search_mine_sections_request.label_ids,
                                                                  desc=search_mine_sections_request.desc)
        has_more = next_notification is not None
        next_start = next_notification.id if has_more else None
    total = crud.section.count_user_sections(db=db,
                                             user_id=user.id,
                                             keyword=search_mine_sections_request.keyword,
                                             label_ids=search_mine_sections_request.label_ids)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=db_sections,
        start=search_mine_sections_request.start,
        limit=search_mine_sections_request.limit,
        has_more=has_more,
        next_start=next_start
    )
    
@section_router.post('/detail', response_model=schemas.section.SectionInfo)
async def get_section_detail(
    section_detail_request: schemas.section.SectionDetailRequest,
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_without_throw),
    db: Session = Depends(get_db)
):
    db_section = crud.section.get_section_by_section_id(db=db,
                                                        section_id=section_detail_request.section_id)
    if db_section is None:
        raise Exception("Section not found")
    
    db_section_users = crud.section.get_section_users_by_section_id(db=db,
                                                                    section_id=section_detail_request.section_id,
                                                                    filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR])
    
    res = None
    
    db_publish_section = crud.section.get_publish_section_by_section_id(db=db,
                                                                        section_id=section_detail_request.section_id)
    if db_publish_section is not None:
        documents_count = crud.section.count_section_documents_by_section_id(db=db, 
                                                                             section_id=db_section.id)
        subscribers_count = crud.section.count_section_subscribers_by_section_id(db=db,
                                                                                 section_id=db_section.id)
        db_documents = crud.section.get_documents_by_section_id(db=db,
                                                                section_id=section_detail_request.section_id)
        section_docs = crud.section.get_section_documents_by_section_id(db=db, 
                                                                        section_id=db_section.id)
        status_map = {sd.document_id: sd.status for sd in section_docs}

        db_labels = crud.section.get_labels_by_section_id(db=db,
                                                          section_id=section_detail_request.section_id)
        
        res = schemas.section.SectionInfo(
            **db_section.__dict__,
            labels=db_labels,
            documents_count=documents_count,
            subscribers_count=subscribers_count,
            creator=db_section.creator,
        )
        
        db_section_podcast_task = crud.task.get_section_podcast_task_by_section_id(db=db,
                                                                                   section_id=section_detail_request.section_id)
        if db_section_podcast_task is not None:
            res.podcast_task = schemas.section.SectionPodcastTask(
                status=db_section_podcast_task.status
            )
        
        db_section_podcast = crud.section.get_section_podcast_by_section_id(db=db,
                                                                            section_id=section_detail_request.section_id)
        if db_section_podcast is not None:
            res.podcast_info = schemas.section.SectionPodcastInfo(creator_id=db_section.creator_id,
                                                                  podcast_file_name=db_section_podcast.podcast_file_name)

        db_section_process_task = crud.task.get_section_process_task_by_section_id(db=db,
                                                                                   section_id=section_detail_request.section_id)
        if db_section_process_task is not None:
            res.process_task = schemas.section.SectionProcessTask(
                status=db_section_process_task.status
            )

        if user is not None:
            db_section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                      section_id=section_detail_request.section_id,
                                                                                      user_id=user.id)
            if db_section_user is not None:
                res.authority = db_section_user.authority
                if db_section_user.role == UserSectionRole.SUBSCRIBER:
                    res.is_subscribed = True
        
    else:
        if user is None:
            raise Exception("This section is private, anonymous user can't access it")
        elif user.id not in [db_section_user.user_id for db_section_user in db_section_users]:
            raise Exception("You don't have permission to access this section")
        else:
            documents_count = crud.section.count_section_documents_by_section_id(db=db, 
                                                                                 section_id=db_section.id)
            subscribers_count = crud.section.count_section_subscribers_by_section_id(db=db,
                                                                                    section_id=db_section.id)
            section_docs = crud.section.get_section_documents_by_section_id(db=db, 
                                                                            section_id=db_section.id)
            db_labels = crud.section.get_labels_by_section_id(db=db,
                                                            section_id=section_detail_request.section_id)
            
            res = schemas.section.SectionInfo(
                **db_section.__dict__,
                labels=db_labels,
                documents_count=documents_count,
                subscribers_count=subscribers_count,
                creator=db_section.creator,
            )
            
            db_section_podcast_task = crud.task.get_section_podcast_task_by_section_id(db=db,
                                                                                       section_id=section_detail_request.section_id)
            if db_section_podcast_task is not None:
                res.podcast_task = schemas.section.SectionPodcastTask(
                    status=db_section_podcast_task.status
                )
            
            db_section_podcast = crud.section.get_section_podcast_by_section_id(db=db,
                                                                                section_id=section_detail_request.section_id)
            if db_section_podcast is not None:
                res.podcast_info = schemas.section.SectionPodcastInfo(creator_id=db_section.creator_id,
                                                                      podcast_file_name=db_section_podcast.podcast_file_name)
            
            db_section_process_task = crud.task.get_section_process_task_by_section_id(db=db,
                                                                                       section_id=section_detail_request.section_id)
            if db_section_process_task is not None:
                res.process_task = schemas.section.SectionProcessTask(
                    status=db_section_process_task.status
                )

            db_section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                      section_id=section_detail_request.section_id,
                                                                                      user_id=user.id)
            
            if db_section_user is not None:
                res.authority = db_section_user.authority
                if db_section_user.role == UserSectionRole.SUBSCRIBER:
                    res.is_subscribed = True
            
    return res

@section_router.post('/date', response_model=schemas.section.DaySectionResponse)
async def get_date_section_info(
    day_section_request: schemas.section.DaySectionRequest,
    db: Session = Depends(get_db), 
    user: schemas.user.PrivateUserInfo = Depends(get_current_user)
):
    db_section = crud.section.get_section_by_user_and_date(db=db, 
                                                           user_id=user.id,
                                                           date=day_section_request.date)
    if db_section is None:
        raise schemas.error.CustomException(code=404, message="The summary section of this day is not created yet")
    
    db_documents = crud.section.get_documents_by_section_id(db=db, 
                                                            section_id=db_section.id)
    section_docs = crud.section.get_section_documents_by_section_id(db=db, 
                                                                    section_id=db_section.id)
    status_map = {sd.document_id: sd.status for sd in section_docs}

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
async def create_section(
    section_create_request: schemas.section.SectionCreateRequest,
    db: Session = Depends(get_db), 
    user: schemas.user.PrivateUserInfo = Depends(get_current_user)
):
    db_section = crud.section.create_section(db=db, 
                                             creator_id=user.id,
                                             cover=section_create_request.cover,
                                             title=section_create_request.title, 
                                             description=section_create_request.description,
                                             auto_podcast=section_create_request.auto_podcast)
    if section_create_request.labels:
        crud.section.bind_labels_to_section(db=db, 
                                            section_id=db_section.id, 
                                            label_ids=section_create_request.labels)
    db_user_section = crud.section.create_section_user(db=db,
                                                       section_id=db_section.id,
                                                       user_id=user.id,
                                                       role=UserSectionRole.CREATOR,
                                                       authority=UserSectionAuthority.FULL_ACCESS)
    if section_create_request.auto_publish:
        crud.section.create_publish_section(db=db, 
                                            section_id=db_section.id)
    db.commit()
    return schemas.section.SectionCreateResponse(id=db_section.id)

# 可免费订阅的专栏直接在这里处理，付费专栏订阅放到java微服务中去处理，注意付费专栏的取消订阅这部分逻辑还是在这里处理的
@section_router.post('/subscribe', response_model=schemas.common.NormalResponse)
async def subscribe_section(
    section_subscribe_request: schemas.section.SectionSubscribeRequest,
    db: Session = Depends(get_db), 
    user: schemas.user.PrivateUserInfo = Depends(get_current_user)
):
    db_section = crud.section.get_section_by_section_id(db=db,
                                                        section_id=section_subscribe_request.section_id)
    if db_section is None:
        raise Exception("Section not found")
    
    db_user_section = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                              section_id=section_subscribe_request.section_id,
                                                                              user_id=user.id)
    
    if db_user_section is not None:
        if db_user_section.role == UserSectionRole.MEMBER:
            raise Exception("You are already a member of this section, so you don't need to subscribe again")
        elif db_user_section.role == UserSectionRole.SUBSCRIBER:
            if section_subscribe_request.status:
                raise Exception("You are already a subscriber of this section, so you don't need to subscribe again")
            else:
                crud.section.delete_section_user_by_section_id_and_user_id(db=db, 
                                                                           section_id=section_subscribe_request.section_id,
                                                                           user_id=user.id)
    else:
        if section_subscribe_request.status:
            # 免费专栏仅需要订阅一次即可永久生效，TODO：用户如果修改专栏的免费状态，则使其免费订阅失效，需要重新订阅
            crud.section.create_section_user(db=db,
                                             section_id=section_subscribe_request.section_id,
                                             user_id=user.id,
                                             role=UserSectionRole.SUBSCRIBER,
                                             authority=UserSectionAuthority.READ_ONLY)
    db.commit()
    return schemas.common.SuccessResponse()    

@section_router.post('/delete', response_model=schemas.common.NormalResponse)
async def delete_section(
    section_delete_request: schemas.section.SectionDeleteRequest,
    db: Session = Depends(get_db), 
    user: schemas.user.PrivateUserInfo = Depends(get_current_user)
):
    db_section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                              section_id=section_delete_request.section_id,    
                                                                              user_id=user.id)
    if db_section_user is None or db_section_user.role not in [UserSectionRole.CREATOR]:
        raise Exception("You are forbidden to delete this section")

    crud.section.delete_section_users_by_section_id(db=db, 
                                                    section_id=section_delete_request.section_id)
    db_section_documents = crud.section.get_documents_by_section_id(db=db,
                                                                    section_id=section_delete_request.section_id)
    crud.section.delete_section_documents_by_section_id(db=db,
                                                        section_id=section_delete_request.section_id)
    crud.section.delete_section_by_section_id(db=db, 
                                              section_id=section_delete_request.section_id)
    db.commit()
    # TODO 完善通知订阅用户以及参与共建的用户，专栏已删除
    # db_section_users = crud.section.get_section_users_by_section_id(db=db,
    #                                                                 section_id=section_delete_request.section_id)
    # for db_section_user in db_section_users:
    #     if db_section_user.user_id != user.id:
    #         # TODO 通知用户
    #         pass
    return schemas.common.SuccessResponse()
    
@section_router.post('/comment/create', response_model=schemas.common.NormalResponse)
async def create_section_comment(
    section_comment_create_request: schemas.section.SectionCommentCreateRequest,
    db: Session = Depends(get_db), 
    user: schemas.user.PrivateUserInfo = Depends(get_current_user)
):
    crud.section.create_section_comment(db=db,
                                        section_id=section_comment_create_request.section_id,
                                        creator_id=user.id,
                                        content=section_comment_create_request.content)
    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/comment/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionCommentInfo])
async def search_section_comment(
    section_comment_search_request: schemas.section.SectionCommentSearchRequest,
    db: Session = Depends(get_db), 
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_without_throw)
):
    has_more = True
    next_start = None
    db_section_parent_degree_comments = crud.section.search_parent_degree_section_comments(db=db,
                                                                                           section_id=section_comment_search_request.section_id,
                                                                                           keyword=section_comment_search_request.keyword,
                                                                                           start=section_comment_search_request.start,
                                                                                           limit=section_comment_search_request.limit)
    total_parent = crud.section.count_parent_degree_section_comments(db=db,
                                                                     section_id=section_comment_search_request.section_id,
                                                                     keyword=section_comment_search_request.keyword)
    if len(db_section_parent_degree_comments) < section_comment_search_request.limit or len(db_section_parent_degree_comments) == 0:
        has_more = False
    if len(db_section_parent_degree_comments) == section_comment_search_request.limit:
        next_section_comment = crud.section.search_next_parent_degree_section_comment(db=db, 
                                                                                      section_id=section_comment_search_request.section_id,
                                                                                      section_comment=db_section_parent_degree_comments[-1],
                                                                                      keyword=section_comment_search_request.keyword)
        has_more = next_section_comment is not None
        next_start = next_section_comment.id if has_more else None
    res = schemas.pagination.InifiniteScrollPagnition(total=total_parent,
                                                      elements=db_section_parent_degree_comments,
                                                      start=section_comment_search_request.start,
                                                      limit=section_comment_search_request.limit,
                                                      has_more=has_more,
                                                      next_start=next_start)
    return res

@section_router.post('/comment/delete', response_model=schemas.common.NormalResponse)
async def delete_section_comment(section_comment_delete_request: schemas.section.SectionCommentDeleteRequest,
                                 db: Session = Depends(get_db), 
                                 user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_user_section = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                              section_id=section_comment_delete_request.section_id,
                                                                              user_id=user.id)
    if db_user_section is None or db_user_section.authority not in [UserSectionAuthority.FULL_ACCESS, UserSectionAuthority.READ_AND_WRITE]:
        raise Exception('You are forbidden to delete this comment')
    
    crud.section.delete_section_comments_by_section_comment_ids(db=db,
                                                                section_comment_ids=section_comment_delete_request.section_comment_ids)
    db.commit()
    
    return schemas.common.SuccessResponse()