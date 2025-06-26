import crud
import schemas
import models
from sqlalchemy.orm import Session
from fastapi import WebSocket, APIRouter, WebSocketDisconnect, Depends
from common.websocket import notificationManager
from common.dependencies import get_current_user, get_current_user_with_websocket, get_db

notification_router = APIRouter()

# 仅仅是前端用来接收消息的
@notification_router.websocket("/")
async def websocket_ask_ai(websocket: WebSocket, 
                           current_user: models.user.User = Depends(get_current_user_with_websocket)):
    websocket_id = current_user.uuid
    # 显式接受 WebSocket 连接
    await notificationManager.connect(id=websocket_id, 
                                      websocket=websocket)
    try:
        while True:
            data = await websocket.receive_text()
            print(f'接收到来自{websocket_id}的消息：', data)
    except WebSocketDisconnect:
        notificationManager.disconnect(websocket_id)
        await notificationManager.broadcast(f"Client #{websocket} left the chat")
        
@notification_router.post("/source/update", response_model=schemas.common.NormalResponse)
async def update_email_source(update_notification_source_request: schemas.notification.UpdateNotificationSourceRequest,
                              db: Session = Depends(get_db),
                              user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_notification_source = crud.notification.get_notification_source_by_notification_id(db=db,
                                                                                          notification_id=update_notification_source_request.notification_source_id)
    if db_notification_source is None:
        raise schemas.error.CustomException(message="notification source not found", code=404)
    
    if db_notification_source.user_id != user.id:
        return schemas.error.CustomException(message="you don't have permission to update this notification source", code=403)
    
    if update_notification_source_request.title is not None:
        db_notification_source.title = update_notification_source_request.title
    if update_notification_source_request.description is not None:
        db_notification_source.description = update_notification_source_request.description
        
    if db_notification_source.category == 0:
        db_email_notification_source = crud.notification.get_email_notification_source_by_notification_source_id(db=db,
                                                                                                                 notification_source_id=update_notification_source_request.notification_source_id)
        if db_email_notification_source is None:
            raise schemas.error.CustomException(message="email notification source not found", code=404)
        if update_notification_source_request.email is not None:
            db_email_notification_source.email = update_notification_source_request.email
        if update_notification_source_request.password is not None:
            db_email_notification_source.password = update_notification_source_request.password
        if update_notification_source_request.address is not None:
            db_email_notification_source.address = update_notification_source_request.address
        if update_notification_source_request.port is not None:
            db_email_notification_source.port = update_notification_source_request.port
        
    db.commit()
    
    return schemas.common.NormalResponse(message="success")
        
@notification_router.post("/source/mine", response_model=schemas.notification.NotificationSourcesResponse)
async def get_email_source(db: Session = Depends(get_db),
                           user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    notification_sources = crud.notification.get_notification_source_by_user_id(db=db, user_id=user.id)
    return schemas.notification.NotificationSourcesResponse(data=notification_sources)

@notification_router.post("/source/detail", response_model=schemas.notification.NotificationSourceDetail)
async def get_notification_detail(notification_source_detail_request: schemas.notification.NotificationSourceDetailRequest,
                                  db: Session = Depends(get_db),
                                  user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    notification_source = crud.notification.get_notification_source_by_notification_id(db=db,
                                                                                       notification_id=notification_source_detail_request.notification_source_id)
    if notification_source is None:
        raise schemas.error.CustomException(message="notification source not found", code=404)
    if notification_source.user_id != user.id:
        raise schemas.error.CustomException(message="you don't have permission to access this notification source", code=403)

    if notification_source.category == 0:
        email_notification_source = crud.notification.get_email_notification_source_by_notification_source_id(db=db,
                                                                                                              notification_source_id=notification_source_detail_request.notification_source_id)
        if email_notification_source is None:
            raise schemas.error.CustomException(message="email notification source not found", code=404)
    
    res = schemas.notification.NotificationSourceDetail(id=notification_source.id,
                                                        title=notification_source.title,
                                                        description=notification_source.description,
                                                        category=notification_source.category)
    
    if notification_source.category == 0:
        res.email_notification_source = schemas.notification.EmailNotificationSource(id=email_notification_source.id,
                                                                                     email=email_notification_source.email,
                                                                                     password=email_notification_source.password,
                                                                                     address=email_notification_source.address,
                                                                                     port=email_notification_source.port)
        
    return res
        
@notification_router.post("/source/add", response_model=schemas.common.NormalResponse)
async def add_email_source(add_notification_source_request: schemas.notification.AddNotificationSourceRequest,
                           db: Session = Depends(get_db),
                           user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_notification_source = crud.notification.create_notification_source(db=db, 
                                                                          user_id=user.id, 
                                                                          title=add_notification_source_request.title,
                                                                          description=add_notification_source_request.description,
                                                                          category=add_notification_source_request.category)
    if add_notification_source_request.category == 0:
        crud.notification.bind_email_info_to_notification_source(db=db,
                                                                 notification_source_id=db_notification_source.id,
                                                                 email=add_notification_source_request.email,
                                                                 password=add_notification_source_request.password,
                                                                 address=add_notification_source_request.address,
                                                                 port=add_notification_source_request.port)
    db.commit()
    return schemas.common.NormalResponse(message="success")

@notification_router.post("/source/delete", response_model=schemas.common.NormalResponse)
async def delete_email_source(delete_email_source_request: schemas.notification.DeleteNotificationSourceRequest,
                              db: Session = Depends(get_db),
                              user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.notification.delete_notification_source_by_notification_source_id(db=db, 
                                                                           user_id=user.id,
                                                                           notification_source_ids=delete_email_source_request.notification_source_ids)
    crud.notification.delete_email_notification_source_by_notification_source_id(db=db,
                                                                                 user_id=user.id,
                                                                                 notification_source_ids=delete_email_source_request.notification_source_ids)
    db.commit()
    return schemas.common.NormalResponse(message="success")
        
@notification_router.post('/record/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord])
async def search_notification_record(search_notification_record_request: schemas.notification.SearchNotificationRecordRequest, 
                                     db: Session = Depends(get_db), 
                                     user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    has_more = True
    next_start = None
    notification_records = crud.notification.search_user_notification_records(db=db, 
                                                                              user_id=user.id, 
                                                                              start=search_notification_record_request.start, 
                                                                              limit=search_notification_record_request.limit, 
                                                                              keyword=search_notification_record_request.keyword)
    if len(notification_records) == search_notification_record_request.limit:
        next_notification_record = crud.notification.search_next_notification_record(db=db, 
                                                                                     user_id=user.id, 
                                                                                     notification_record=notification_records[-1])
        has_more = next_notification_record is not None
        next_start = next_notification_record.id if has_more else None
    if len(notification_records) < search_notification_record_request.limit or len(notification_records) == 0:
        has_more = False
    total = crud.notification.count_user_notification_records(db=db, 
                                                              user_id=user.id, 
                                                              keyword=search_notification_record_request.keyword)
    res = schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord](start=search_notification_record_request.start, 
                                                                                               limit=search_notification_record_request.limit, 
                                                                                               has_more=has_more, 
                                                                                               elements=notification_records, 
                                                                                               next_start=next_start,
                                                                                               total=total)
    return res

@notification_router.post('/delete', response_model=schemas.common.NormalResponse)
async def delete_notification_record(delete_notification_request: schemas.notification.DeleteNotificationRecordRequest, 
                                     db: Session = Depends(get_db), 
                                     user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.notification.delete_notification_records_by_notification_record_ids(db=db, 
                                                                             user_id=user.id, 
                                                                             notification_record_ids=delete_notification_request.notification_record_ids)
    db.commit()
    return schemas.common.SuccessResponse(message="success")
    
@notification_router.post('/detail', response_model=schemas.notification.NotificationRecord)
async def get_notification_record_detail(notification_detail_request: schemas.notification.NotificationRecordDetailRequest, 
                                         db: Session = Depends(get_db), 
                                         user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_notification_record = crud.notification.get_user_notification_record_by_notification_record_id(db=db, 
                                                                                                      user_id=user.id, 
                                                                                                      notification_record_id=notification_detail_request.notification_record_id)
    return schemas.notification.NotificationRecord(id=db_notification_record.id,
                                                   content=db_notification_record.content,
                                                   link=db_notification_record.link,
                                                   read_at=db_notification_record.read_at)

@notification_router.post('/read-all', response_model=schemas.common.NormalResponse)
async def read_all_notification_record(db: Session = Depends(get_db), 
                                       user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.notification.read_user_notification_records(db=db, 
                                                     user_id=user.id)
    db.commit()
    return schemas.common.SuccessResponse(message="success")

@notification_router.post('/read', response_model=schemas.common.NormalResponse)
async def read_notification_record(read_notification_request: schemas.notification.ReadNotificationRecordRequest, 
                                   db: Session = Depends(get_db), 
                                   user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    if read_notification_request.status:
        crud.notification.read_notification_records_by_notification_record_ids(db=db, 
                                                                               user_id=user.id, 
                                                                               notification_record_ids=read_notification_request.notification_record_ids)
    else:
        crud.notification.unread_notification_records_by_notification_record_ids(db=db, 
                                                                                 user_id=user.id, 
                                                                                 notification_record_ids=read_notification_request.notification_record_ids)
    db.commit()
    return schemas.common.NormalResponse(message="success")