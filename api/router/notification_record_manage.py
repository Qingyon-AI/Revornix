from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user

notification_record_manage_router = APIRouter()


def _build_notification_record(
    *,
    notification_record: models.notification.NotificationRecord,
) -> schemas.notification.NotificationRecord:
    db_notification_task = notification_record.notification_task
    if db_notification_task is None:
        raise schemas.error.CustomException(message="Notification task not found", code=404)

    return schemas.notification.NotificationRecord.model_validate(
        {
            **notification_record.__dict__,
            "creator": db_notification_task.creator,
        }
    )


@notification_record_manage_router.post('/record/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord])
async def search_notification_record(
    search_notification_record_request: schemas.notification.SearchNotificationRecordRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    has_more = False
    next_start = None
    db_notification_records = await crud.notification.search_notification_records_for_receiver_async(
        db=db,
        user_id=user.id,
        start=search_notification_record_request.start,
        limit=search_notification_record_request.limit,
        keyword=search_notification_record_request.keyword,
    )
    if search_notification_record_request.limit > 0 and len(db_notification_records) == search_notification_record_request.limit:
        next_notification_record = await crud.notification.search_next_notification_record_for_receiver_async(
            db=db,
            user_id=user.id,
            notification_record=db_notification_records[-1],
            keyword=search_notification_record_request.keyword,
        )
        has_more = next_notification_record is not None
        next_start = next_notification_record.id if next_notification_record is not None else None
    total = await crud.notification.count_notification_records_for_receiver_async(
        db=db,
        user_id=user.id,
        keyword=search_notification_record_request.keyword,
    )
    notification_records = [
        _build_notification_record(notification_record=db_notification_record)
        for db_notification_record in db_notification_records
    ]
    return schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationRecord](
        start=search_notification_record_request.start,
        limit=search_notification_record_request.limit,
        has_more=has_more,
        elements=notification_records,
        next_start=next_start,
        total=total,
    )


@notification_record_manage_router.post('/record/delete', response_model=schemas.common.NormalResponse)
async def delete_notification_record(
    delete_notification_request: schemas.notification.DeleteNotificationRecordRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    await crud.notification.delete_notification_records_by_notification_record_ids_async(
        db=db,
        user_id=user.id,
        notification_record_ids=delete_notification_request.notification_record_ids,
    )
    await db.commit()
    return schemas.common.SuccessResponse()


@notification_record_manage_router.post('/record/detail', response_model=schemas.notification.NotificationRecord)
async def get_notification_record_detail(
    notification_detail_request: schemas.notification.NotificationRecordDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    db_notification_record = await crud.notification.get_notification_record_by_notification_record_id_async(
        db=db,
        notification_record_id=notification_detail_request.notification_record_id,
    )
    if db_notification_record is None:
        raise schemas.error.CustomException(message="Notification record not found", code=404)
    db_notification_target = await crud.notification.get_notification_target_by_id_async(
        db=db,
        notification_target_id=db_notification_record.notification_task.notification_target_id,
    )
    if db_notification_target is None:
        raise schemas.error.CustomException(message="Notification target not found", code=404)
    if db_notification_target.creator_id != user.id:
        raise schemas.error.CustomException(message="You don't have permission to access this notification record", code=403)
    return schemas.notification.NotificationRecord.model_validate(
        {
            **db_notification_record.__dict__,
            "creator": db_notification_target.creator,
        }
    )


@notification_record_manage_router.post('/record/read-all', response_model=schemas.common.NormalResponse)
async def read_all_notification_record(
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    await crud.notification.read_all_notification_records_for_receiver_async(
        db=db,
        receiver_id=user.id,
    )
    await db.commit()
    return schemas.common.SuccessResponse()


@notification_record_manage_router.post('/record/read', response_model=schemas.common.NormalResponse)
async def read_notification_record(
    read_notification_request: schemas.notification.ReadNotificationRecordRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    if read_notification_request.status:
        await crud.notification.read_notification_records_by_notification_record_ids_for_receiver_async(
            db=db,
            receiver_id=user.id,
            notification_record_ids=read_notification_request.notification_record_ids,
        )
    else:
        await crud.notification.unread_notification_records_by_notification_record_ids_for_user_async(
            db=db,
            user_id=user.id,
            notification_record_ids=read_notification_request.notification_record_ids,
        )
    await db.commit()
    return schemas.common.SuccessResponse()
