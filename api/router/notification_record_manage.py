from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_db

notification_record_manage_router = APIRouter()


def _build_notification_record(
    *,
    db: Session,
    notification_record: models.notification.NotificationRecord,
) -> schemas.notification.NotificationRecord:
    db_notification_task = crud.notification.get_notification_task_by_notification_task_id(
        db=db,
        notification_task_id=notification_record.task_id,
    )
    if db_notification_task is None:
        raise schemas.error.CustomException(message="Notification task not found", code=404)

    return schemas.notification.NotificationRecord.model_validate(
        {
            **notification_record.__dict__,
            "creator": db_notification_task.creator,
        }
    )


@notification_record_manage_router.post('/record/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord])
def search_notification_record(
    search_notification_record_request: schemas.notification.SearchNotificationRecordRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = False
    next_start = None
    db_notification_records = crud.notification.search_notification_records_for_receiver(
        db=db,
        user_id=user.id,
        start=search_notification_record_request.start,
        limit=search_notification_record_request.limit,
        keyword=search_notification_record_request.keyword
    )
    if search_notification_record_request.limit > 0 and len(db_notification_records) == search_notification_record_request.limit:
        next_notification_record = crud.notification.search_next_notification_record_for_receiver(
            db=db,
            user_id=user.id,
            notification_record=db_notification_records[-1]
        )
        has_more = next_notification_record is not None
        next_start = next_notification_record.id if next_notification_record is not None else None
    total = crud.notification.count_notification_records_for_receiver(
        db=db,
        user_id=user.id,
        keyword=search_notification_record_request.keyword
    )
    notification_records = [
        _build_notification_record(db=db, notification_record=db_notification_record)
        for db_notification_record in db_notification_records
    ]
    return schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord](
        start=search_notification_record_request.start,
        limit=search_notification_record_request.limit,
        has_more=has_more,
        elements=notification_records,
        next_start=next_start,
        total=total
    )

@notification_record_manage_router.post('/record/delete', response_model=schemas.common.NormalResponse)
def delete_notification_record(
    delete_notification_request: schemas.notification.DeleteNotificationRecordRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    crud.notification.delete_notification_records_by_notification_record_ids(
        db=db,
        user_id=user.id,
        notification_record_ids=delete_notification_request.notification_record_ids
    )
    db.commit()
    return schemas.common.SuccessResponse()

@notification_record_manage_router.post('/record/detail', response_model=schemas.notification.NotificationRecord)
def get_notification_record_detail(
    notification_detail_request: schemas.notification.NotificationRecordDetailRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_notification_record = crud.notification.get_notification_record_by_notification_record_id(
        db=db,
        notification_record_id=notification_detail_request.notification_record_id
    )
    if db_notification_record is None:
        raise schemas.error.CustomException(message="Notification record not found", code=404)
    db_notification_target = crud.notification.get_notification_target_by_id(
        db=db,
        notification_target_id=db_notification_record.notification_task.notification_target_id
    )
    if db_notification_target is None:
        raise schemas.error.CustomException(message="Notification target not found", code=404)
    if db_notification_target.creator_id != user.id:
        raise schemas.error.CustomException(message="You don't have permission to access this notification record", code=403)
    return schemas.notification.NotificationRecord.model_validate({
        **db_notification_record.__dict__,
        "creator": db_notification_target.creator
    })

@notification_record_manage_router.post('/record/read-all', response_model=schemas.common.NormalResponse)
def read_all_notification_record(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    crud.notification.read_all_notification_records_for_receiver(
        db=db,
        receiver_id=user.id
    )
    db.commit()
    return schemas.common.SuccessResponse()

@notification_record_manage_router.post('/record/read', response_model=schemas.common.NormalResponse)
def read_notification_record(
    read_notification_request: schemas.notification.ReadNotificationRecordRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    if read_notification_request.status:
        crud.notification.read_notification_records_by_notification_record_ids_for_receiver(
            db=db,
            receiver_id=user.id,
            notification_record_ids=read_notification_request.notification_record_ids
        )
    else:
        crud.notification.unread_notification_records_by_notification_record_ids_for_user(
            db=db,
            user_id=user.id,
            notification_record_ids=read_notification_request.notification_record_ids
        )
    db.commit()
    return schemas.common.SuccessResponse()
