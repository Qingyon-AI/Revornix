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
        
@notification_router.post('/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.Notification])
async def search_notification(search_notification_request: schemas.notification.SearchNotificationRequest, 
                              db: Session = Depends(get_db), 
                              user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    has_more = True
    next_start = None
    notifications = crud.notification.search_user_notifications(db=db, 
                                                                user_id=user.id, 
                                                                start=search_notification_request.start, 
                                                                limit=search_notification_request.limit, 
                                                                keyword=search_notification_request.keyword)
    if len(notifications) == search_notification_request.limit:
        next_notification = crud.notification.search_next_notification(db=db, 
                                                                       user_id=user.id, 
                                                                       notification=notifications[-1])
        has_more = next_notification is not None
        next_start = next_notification.id if has_more else None
    if len(notifications) < search_notification_request.limit or len(notifications) == 0:
        has_more = False
    total = crud.notification.count_user_notifications(db=db, 
                                                       user_id=user.id, 
                                                       keyword=search_notification_request.keyword)
    res = schemas.pagination.InifiniteScrollPagnition[schemas.notification.Notification](start=search_notification_request.start, 
                                                                                         limit=search_notification_request.limit, 
                                                                                         has_more=has_more, 
                                                                                         elements=notifications, 
                                                                                         next_start=next_start,
                                                                                         total=total)
    return res

@notification_router.post('/delete', response_model=schemas.common.NormalResponse)
async def delete_notification(delete_notification_request: schemas.notification.DeleteNotificationRequest, 
                              db: Session = Depends(get_db), 
                              user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.notification.delete_notifications_by_notification_ids(db=db, 
                                                               user_id=user.id, 
                                                               notification_ids=delete_notification_request.notification_ids)
    db.commit()
    return schemas.common.SuccessResponse(message="success")
    
@notification_router.post('/detail', response_model=schemas.notification.Notification)
async def get_notification_detail(notification_detail_request: schemas.notification.NotificationDetailRequest, 
                                  db: Session = Depends(get_db), 
                                  user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    notification = crud.notification.get_user_notification_by_notification_id(db=db, 
                                                                              user_id=user.id, 
                                                                              notification_id=notification_detail_request.notification_id)
    return schemas.notification.Notification(id=notification.id,
                                             content=notification.content,
                                             link=notification.link,
                                             read_at=notification.read_at)

@notification_router.post('/read-all', response_model=schemas.common.NormalResponse)
async def read_all_notification(db: Session = Depends(get_db), 
                                user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    crud.notification.read_user_notifications(db=db, 
                                              user_id=user.id)
    db.commit()
    return schemas.common.SuccessResponse(message="success")

@notification_router.post('/read', response_model=schemas.common.NormalResponse)
async def read_notification(read_notification_request: schemas.notification.ReadNotificationRequest, 
                            db: Session = Depends(get_db), 
                            user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    if read_notification_request.status:
        crud.notification.read_notifications_by_notification_ids(db=db, 
                                                                user_id=user.id, 
                                                                notification_ids=read_notification_request.notification_ids)
    else:
        crud.notification.unread_notification_by_notification_id(db=db, 
                                                                 user_id=user.id, 
                                                                 notification_ids=read_notification_request.notification_ids)    
    db.commit()
    return schemas.common.NormalResponse(message="success")