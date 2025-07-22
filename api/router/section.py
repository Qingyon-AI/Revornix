import schemas
import crud
import models
import copy
from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from common.dependencies import get_db, get_current_user

section_router = APIRouter()

def check_section_user_auth(db: Session, 
                            user_id: int, 
                            section_id: int):
    section = crud.section.get_section_by_section_id(db=db, 
                                                     section_id=section_id)
    if section is None:
        raise Exception("The section is not exist")
    section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db, 
                                                                           user_id=user_id, 
                                                                           section_id=section_id)
    return section_user

@section_router.post("/label/list", response_model=schemas.section.LabelListResponse)
async def list_label(db: Session = Depends(get_db), 
                     user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    labels = crud.section.get_user_labels_by_user_id(db=db, 
                                                     user_id=user.id)
    labels = jsonable_encoder(labels)
    return schemas.section.LabelListResponse(data=labels)

@section_router.post('/label/create', response_model=schemas.section.CreateLabelResponse)
async def add_label(label_add_request: schemas.section.LabelAddRequest,
                    db: Session = Depends(get_db), 
                    user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_label = crud.section.create_label(db=db, 
                                         name=label_add_request.name, 
                                         user_id=user.id)
    db.commit()
    return schemas.section.CreateLabelResponse(id=db_label.id, name=db_label.name)

@section_router.post("/subscribed", response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
async def get_my_subscribed_sections(
    search_subscribed_section_request: schemas.section.SearchSubscribedSectionRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
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
        return schemas.section.SectionInfo(
            **section.__dict__,
            creator=section.creator,
            cover=section.cover,
            labels=db_labels,
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
    db_section = crud.section.get_section_by_section_id(db=db, section_id=section_update_request.section_id)
    db_user_sections = crud.section.get_section_users_by_section_id(db=db,
                                                                    section_id=section_update_request.section_id)
    original_section = copy.deepcopy(db_section)
    if db_section is None:
        raise Exception("The section is not exist")
    section_user = check_section_user_auth(db=db, 
                                           user_id=user.id, 
                                           section_id=section_update_request.section_id)
    if section_user is None or section_user.authority == 2:
        raise Exception("You don't have the authority to update this section")
    if section_update_request.title is not None:
        db_section.title = section_update_request.title
    if section_update_request.description is not None:
        db_section.description = section_update_request.description
    if section_update_request.public is not None:
        db_section.public = section_update_request.public
    if section_update_request.cover_id is not None:
        db_section.cover_id = section_update_request.cover_id
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
    db.commit()
    return schemas.common.SuccessResponse(message="更新成功")

@section_router.post('/public/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
async def search_public_sections(search_public_sections_request: schemas.section.SearchPublicSectionsRequest,
                                 db: Session = Depends(get_db),
                                 user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
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
        return schemas.section.SectionInfo(
            **section.__dict__,
            creator=section.creator,
            labels=db_labels,
            cover=section.cover,
            documents_count=documents_count,
            subscribers_count=subscribers_count
        )
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
    total = crud.section.count_public_sections(db=db,
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
    db_sections = crud.section.get_all_my_sections(db=db, 
                                                   user_id=user.id)
    return schemas.section.AllMySectionsResponse(data=db_sections)
    
@section_router.post('/user/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo])
async def search_user_sections(search_user_sections_request: schemas.section.SearchUserSectionsRequest,
                               db: Session = Depends(get_db),
                               user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    has_more = True
    next_start = None
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
        return schemas.section.SectionInfo(
            **section.__dict__,
            creator=section.creator,
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
async def search_mine_sections(search_public_sections_request: schemas.section.SearchMineSectionsRequest,
                               db: Session = Depends(get_db),
                               user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    has_more = True
    next_start = None
    db_sections = crud.section.search_user_sections(db=db, 
                                                    user_id=user.id,
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
        return schemas.section.SectionInfo(
            **section.__dict__,
            creator=section.creator,
            cover=section.cover,
            labels=db_labels,
            documents_count=documents_count,
            subscribers_count=subscribers_count
        )
    db_sections = [get_section_info(section) for section in db_sections]
    if len(db_sections) < search_public_sections_request.limit or len(db_sections) == 0:
        has_more = False
    if len(db_sections) == search_public_sections_request.limit:
        next_notification = crud.section.search_next_user_section(db=db, 
                                                                  user_id=user.id,
                                                                  section=db_sections[-1],
                                                                  keyword=search_public_sections_request.keyword,
                                                                  label_ids=search_public_sections_request.label_ids,
                                                                  desc=search_public_sections_request.desc)
        has_more = next_notification is not None
        next_start = next_notification.id if has_more else None
    total = crud.section.count_user_sections(db=db,
                                             user_id=user.id,
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
    
@section_router.post('/detail', response_model=schemas.section.SectionInfo)
async def get_section_detail(section_detail_request: schemas.section.SectionDetailRequest,
                             user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    db_section = crud.section.get_section_by_section_id(db=db,
                                                        section_id=section_detail_request.section_id)
    if db_section is None:
        raise Exception("Section not found")
    documents_count = crud.section.count_section_documents_by_section_id(db=db, 
                                                                         section_id=db_section.id)
    subscribers_count = crud.section.count_section_subscribers_by_section_id(db=db,
                                                                             section_id=db_section.id)
    db_documents = crud.section.get_documents_by_section_id(db=db,
                                                            section_id=section_detail_request.section_id)
    documents = [schemas.section.SectionDocumentInfo.model_validate({**document.__dict__, 
                                                                     'title': document.title if document.title is not None else '未命名',
                                                                     'status': crud.section.get_section_document_by_section_id_and_document_id(db=db, section_id=db_section.id, document_id=document.id).status}) 
                 for document in db_documents]
    db_labels = crud.section.get_labels_by_section_id(db=db,
                                                      section_id=section_detail_request.section_id)
    db_user_section = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                              section_id=db_section.id,
                                                                              user_id=user.id)
    # 判断用户是否具有该专栏的访问权限
    if db_section.public == False and db_user_section is None:
        raise Exception("You don't have permission to access this section")
    
    res = schemas.section.SectionInfo(
        **db_section.__dict__,
        documents=documents,
        labels=db_labels,
        documents_count=documents_count,
        subscribers_count=subscribers_count,
        creator=db_section.creator,
        cover=db_section.cover,
    )
    
    if db_user_section is not None and db_user_section.authority == 2:
        if db_user_section.expire_time is None or db_user_section.expire_time > now:
            res.is_subscribed = True
        
    return res

@section_router.post('/create', response_model=schemas.section.SectionCreateResponse)
async def create_section(section_create_request: schemas.section.SectionCreateRequest,
                         db: Session = Depends(get_db), 
                         user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_section = crud.section.create_section(db=db, 
                                             creator_id=user.id,
                                             cover_attachment_id=section_create_request.cover_id,
                                             title=section_create_request.title, 
                                             description=section_create_request.description,
                                             public=section_create_request.public)
    if section_create_request.labels:
            crud.section.bind_labels_to_section(db=db, 
                                                section_id=db_section.id, 
                                                label_ids=section_create_request.labels)
    db_user_section = crud.section.bind_section_to_user(db=db,
                                                        section_id=db_section.id,
                                                        user_id=user.id,
                                                        authority=0)
    db.commit()
    return schemas.section.SectionCreateResponse(id=db_section.id)

# 可免费订阅的专栏直接在这里处理，付费专栏订阅放到java微服务中去处理，注意付费专栏的取消订阅这部分逻辑还是在这里处理的
@section_router.post('/subscribe', response_model=schemas.common.NormalResponse)
async def subscribe_section(section_subscribe_request: schemas.section.SectionSubscribeRequest,
                            db: Session = Depends(get_db), 
                            user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_section = crud.section.get_section_by_section_id(db=db,
                                                        section_id=section_subscribe_request.section_id)
    if db_section is None:
        raise Exception("Section not found")
    db_user_section = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                              section_id=section_subscribe_request.section_id,
                                                                              user_id=user.id)
    if db_user_section is None:
        if section_subscribe_request.status:
            # 免费专栏仅需要订阅一次即可永久生效，TODO：用户如果修改专栏的免费状态，则使其免费订阅失效，需要重新订阅
            crud.section.create_section_user(db=db,
                                             section_id=section_subscribe_request.section_id,
                                             user_id=user.id,
                                             authority=2)
    else: 
        if not section_subscribe_request.status:
            crud.section.delete_section_user_by_section_id_and_user_id(db=db, 
                                                                       section_id=section_subscribe_request.section_id,
                                                                       user_id=user.id)
    db.commit()
    return schemas.common.SuccessResponse()
        

@section_router.post('/delete', response_model=schemas.common.NormalResponse)
async def delete_section(section_delete_request: schemas.section.SectionDeleteRequest,
                         db: Session = Depends(get_db), 
                         user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_section_user = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                              section_id=section_delete_request.section_id,    
                                                                              user_id=user.id)
    if db_section_user is None or db_section_user.authority != 0:
        raise Exception("You have no authority to delete this section")
    crud.section.delete_section_users_by_section_id(db=db, 
                                                    section_id=section_delete_request.section_id)
    db_section_documents = crud.section.get_documents_by_section_id(db=db,
                                                                    section_id=section_delete_request.section_id)
    if db_section_documents:
        document_ids = [document.id for document in db_section_documents]
        crud.section.delete_section_documents_by_document_ids(db=db,
                                                              document_ids=document_ids)
    crud.section.delete_section_by_section_id(db=db, 
                                              section_id=section_delete_request.section_id)
    db.commit()
    # TODO 完善通知订阅用户，专栏已删除
    return schemas.common.SuccessResponse()
    
@section_router.post('/comment/create', response_model=schemas.common.NormalResponse)
async def create_section_comment(section_comment_create_request: schemas.section.SectionCommentCreateRequest,
                                 db: Session = Depends(get_db), 
                                 user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.section.create_section_comment(db=db,
                                        section_id=section_comment_create_request.section_id,
                                        creator_id=user.id,
                                        content=section_comment_create_request.content)
    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/comment/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionCommentInfo])
async def search_section_comment(section_comment_search_request: schemas.section.SectionCommentSearchRequest,
                                 db: Session = Depends(get_db), 
                                 user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
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
    crud.section.delete_section_comments_by_section_comment_ids(db=db,
                                                                section_comment_ids=section_comment_delete_request.section_comment_ids)
    db.commit()
    return schemas.common.SuccessResponse()

@section_router.post('/date', response_model=schemas.section.DaySectionResponse)
async def get_date_section_info(day_section_request: schemas.section.DaySectionRequest,
                                db: Session = Depends(get_db), 
                                user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_section = crud.section.get_section_by_user_and_date(db=db, 
                                                           user_id=user.id,
                                                           date=day_section_request.date)
    if db_section is None:
        raise Exception("The summary section of this day is not created yet")
    db_documents = crud.section.get_documents_by_section_id(db=db, 
                                                            section_id=db_section.id)
    documents = [schemas.section.SectionDocumentInfo.model_validate({**document.__dict__, 
                                                                     'title': document.title if document.title is not None else '未命名',
                                                                     'status': crud.section.get_section_document_by_section_id_and_document_id(db=db, section_id=db_section.id, document_id=document.id).status}) 
                 for document in db_documents]
    res = schemas.section.DaySectionResponse(
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
