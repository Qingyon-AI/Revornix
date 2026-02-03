from datetime import datetime, timezone

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

import models
from enums.notification import NotificationTriggerType, UserNotificationSourceRole, UserNotificationTargetRole
from uuid import uuid4


def create_notification_template(
    db: Session,
    uuid: str,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None,
):
    now = datetime.now(timezone.utc)
    db_notification_template = models.notification.NotificationTemplate(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        description=description,
        description_zh=description_zh,
        create_time=now
    )
    db.add(db_notification_template)
    db.flush()
    return db_notification_template

def create_notification_trigger_event(
    db: Session,
    uuid: str,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None
):
    now = datetime.now(timezone.utc)
    db_notification_trigger_event = models.notification.TriggerEvent(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        description=description,
        description_zh=description_zh,
        create_time=now
    )
    db.add(db_notification_trigger_event)
    db.flush()
    return db_notification_trigger_event

def create_notification_task_content_custom(
    db: Session,
    notification_task_id: int,
    title: str,
    content: str | None = None,
    link: str | None = None,
    cover: str | None = None
):
    db_notification_task_content_custom = models.notification.NotificationTaskContentCustom(
        notification_task_id=notification_task_id,
        title=title,
        content=content,
        link=link,
        cover=cover
    )
    db.add(db_notification_task_content_custom)
    db.flush()
    return db_notification_task_content_custom

def create_notification_task_content_template(
    db: Session,
    notification_task_id: int,
    notification_template_id: int
):
    db_notification_task_content_tmeplate = models.notification.NotificationTaskContentTemplate(
        notification_task_id=notification_task_id,
        notification_template_id=notification_template_id
    )
    db.add(db_notification_task_content_tmeplate)
    db.flush()
    return db_notification_task_content_tmeplate

def create_notification_task(
    db: Session,
    user_id: int,
    title: str,
    notification_content_type: int,
    notification_source_id: int,
    notification_target_id: int,
    trigger_type: int,
    enable: bool
):
    now = datetime.now(timezone.utc)
    notification_task = models.notification.NotificationTask(
        user_id=user_id,
        title=title,
        notification_content_type=notification_content_type,
        notification_source_id=notification_source_id,
        notification_target_id=notification_target_id,
        trigger_type=trigger_type,
        create_time=now,
        enable=enable
    )
    db.add(notification_task)
    db.flush()
    return notification_task

def create_notification_task_trigger_event(
    db: Session,
    notification_task_id: int,
    trigger_event_id: int
):
    db_notification_task_trigger_event = models.notification.NotificationTaskTriggerEvent(
        notification_task_id=notification_task_id,
        trigger_event_id=trigger_event_id
    )
    db.add(db_notification_task_trigger_event)
    db.flush()
    return db_notification_task_trigger_event

def create_notification_task_trigger_scheduler(
    db: Session,
    notification_task_id: int,
    cron_expr: str
):
    db_notification_task_trigger_scheduler = models.notification.NotificationTaskTriggerScheduler(
        notification_task_id=notification_task_id,
        cron_expr=cron_expr
    )
    db.add(db_notification_task_trigger_scheduler)
    db.flush()
    return db_notification_task_trigger_scheduler

def create_notification_source_provided(
    db: Session,
    uuid: str,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None,
    demo_config: str | None = None
):
    now = datetime.now(timezone.utc)
    notification_source_provided = models.notification.NotificationSourceProvided(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        description=description,
        description_zh=description_zh,
        create_time=now,
        demo_config=demo_config
    )
    db.add(notification_source_provided)
    db.flush()
    return notification_source_provided

def create_notification_source(
    db: Session,
    notification_source_provided_id: int,
    creator_id: int,
    title: str,
    description: str | None = None,
    config_json: str | None = None,
    uuid: str | None = None,
    is_public: bool = False
):
    now = datetime.now(timezone.utc)
    if uuid is None:
        uuid = str(uuid4())
    notification_source = models.notification.NotificationSource(
        notification_source_provided_id=notification_source_provided_id,
        title=title,
        description=description,
        creator_id=creator_id,
        config_json=config_json,
        uuid=uuid,
        is_public=is_public,
        create_time=now
    )
    db.add(notification_source)
    db.flush()
    return notification_source

def create_user_notification_source(
    db: Session,
    notification_source_id: int,
    user_id: int,
    role: UserNotificationSourceRole = UserNotificationSourceRole.FORKER
):
    now = datetime.now(timezone.utc)
    notification_target = models.notification.UserNotificationSource(
        notification_source_id=notification_source_id,
        user_id=user_id,
        role=role,
        create_time=now
    )
    db.add(notification_target)
    db.flush()
    return notification_target

def create_notification_target_provided(
    db: Session,
    uuid: str,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None,
    demo_config: str | None = None
):
    now = datetime.now(timezone.utc)
    notification_target = models.notification.NotificationTargetProvided(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        description=description,
        description_zh=description_zh,
        create_time=now,
        demo_config=demo_config
    )
    db.add(notification_target)
    db.flush()
    return notification_target

def create_notification_target(
    db: Session,
    notification_target_provided_id: int,
    creator_id: int,
    title: str,
    description: str | None = None,
    config_json: str | None = None,
    uuid: str | None = None,
    is_public: bool = False
):
    now = datetime.now(timezone.utc)
    if uuid is None:
        uuid = str(uuid4())
    notification_target = models.notification.NotificationTarget(
        notification_target_provided_id=notification_target_provided_id,
        title=title,
        description=description,
        creator_id=creator_id,
        config_json=config_json,
        uuid=uuid,
        is_public=is_public,
        create_time=now
    )
    db.add(notification_target)
    db.flush()
    return notification_target

def create_user_notification_target(
    db: Session,
    notification_target_id: int,
    user_id: int,
    role: UserNotificationTargetRole = UserNotificationTargetRole.FORKER
):
    now = datetime.now(timezone.utc)
    user_notification_target = models.notification.UserNotificationTarget(
        notification_target_id=notification_target_id,
        user_id=user_id,
        role=role,
        create_time=now
    )
    db.add(user_notification_target)
    db.flush()
    return user_notification_target

def create_notification_record(
    db: Session,
    user_id: int,
    title: str,
    content: str | None = None,
    cover: str | None = None,
    link: str | None = None
):
    now = datetime.now(timezone.utc)
    notification = models.notification.NotificationRecord(
        user_id=user_id,
        title=title,
        content=content,
        cover=cover,
        link=link,
        create_time=now
    )
    db.add(notification)
    db.flush()
    return notification

def get_notification_source_provided_by_id(
    db: Session,
    id: int
):
    query = db.query(models.notification.NotificationSourceProvided)
    query = query.filter(
        models.notification.NotificationSourceProvided.id == id,
        models.notification.NotificationSourceProvided.delete_at.is_(None)
    )
    return query.one_or_none()

def get_notification_target_provided_by_id(
    db: Session,
    id: int
):
    query = db.query(models.notification.NotificationTargetProvided)
    query = query.filter(
        models.notification.NotificationTargetProvided.id == id,
        models.notification.NotificationTargetProvided.delete_at.is_(None)
    )
    return query.one_or_none()

def get_notification_source_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.notification.NotificationSource)
    query = query.filter(
        models.notification.NotificationSource.uuid == uuid,
        models.notification.NotificationSource.delete_at.is_(None)
    )
    return query.one_or_none()

def get_notification_target_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.notification.NotificationTarget)
    query = query.filter(
        models.notification.NotificationTarget.uuid == uuid,
        models.notification.NotificationTarget.delete_at.is_(None)
    )
    return query.one_or_none()

def get_notification_source_provided_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.notification.NotificationSourceProvided)
    query = query.filter(
        models.notification.NotificationSourceProvided.uuid == uuid
    )
    return query.one_or_none()

def get_notification_target_provided_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.notification.NotificationTargetProvided)
    query = query.filter(
        models.notification.NotificationTargetProvided.uuid == uuid,
    )
    return query.one_or_none()

def get_notification_task_by_notification_target_id(
    db: Session,
    notification_target_id: int
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTask.notification_target_id == notification_target_id,
        models.notification.NotificationTask.delete_at.is_(None)
    )
    return query.all()

def get_notification_task_by_notification_source_id(
    db: Session,
    notification_source_id: int
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTask.notification_source_id == notification_source_id,
        models.notification.NotificationTask.delete_at.is_(None)
    )
    return query.all()

def get_user_notification_source_by_user_id_and_notification_source_id(
    db: Session,
    user_id: int,
    notification_source_id: int,
    filter_role: UserNotificationSourceRole | None = None
):
    query = db.query(models.notification.UserNotificationSource)
    query = query.filter(
        models.notification.UserNotificationSource.user_id == user_id,
        models.notification.UserNotificationSource.notification_source_id == notification_source_id,
        models.notification.UserNotificationSource.delete_at.is_(None)
    )
    if filter_role is not None:
        query = query.filter(
            models.notification.UserNotificationSource.role == filter_role
        )
    return query.one_or_none()

def get_user_notification_target_by_user_id_and_notification_target_id(
    db: Session,
    user_id: int,
    notification_target_id: int,
    filter_role: UserNotificationTargetRole | None = None
):
    query = db.query(models.notification.UserNotificationTarget)
    query = query.filter(
        models.notification.UserNotificationTarget.user_id == user_id,
        models.notification.UserNotificationTarget.notification_target_id == notification_target_id,
        models.notification.UserNotificationTarget.delete_at.is_(None)
    )
    if filter_role is not None:
        query = query.filter(
            models.notification.UserNotificationTarget.role == filter_role
        )
    return query.one_or_none()

def get_notification_template_by_id(
    db: Session,
    notification_template_id: int
):
    query = db.query(models.notification.NotificationTemplate)
    query = query.filter(
        models.notification.NotificationTemplate.id == notification_template_id,
        models.notification.NotificationTemplate.delete_at.is_(None)
    )
    return query.one_or_none()

def get_all_notification_templates(
    db: Session
):
    query = db.query(models.notification.NotificationTemplate)
    query = query.filter(
        models.notification.NotificationTemplate.delete_at.is_(None)
    )
    return query.all()

def get_notification_template_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.notification.NotificationTemplate)
    query = query.filter(
        models.notification.NotificationTemplate.uuid == uuid,
        models.notification.NotificationTemplate.delete_at.is_(None)
    )
    return query.one_or_none()

def get_all_provided_notification_sources(
    db: Session
):
    query = db.query(models.notification.NotificationSourceProvided)
    query = query.filter(
        models.notification.NotificationSourceProvided.delete_at.is_(None)
    )
    return query.all()

def get_notification_tasks_by_user_id_and_notification_trigger_event(
    db: Session,
    user_id: int,
    trigger_event_uuid: str
):
    query = db.query(models.notification.NotificationTask)
    query = query.join(models.notification.NotificationTaskTriggerEvent,
                       models.notification.NotificationTask.id == models.notification.NotificationTaskTriggerEvent.notification_task_id)
    query = query.join(models.notification.TriggerEvent,
                       models.notification.TriggerEvent.id == models.notification.NotificationTaskTriggerEvent.trigger_event_id)
    query = query.filter(
        models.notification.NotificationTask.user_id == user_id,
        models.notification.NotificationTask.trigger_type == NotificationTriggerType.EVENT,
        models.notification.NotificationTask.delete_at.is_(None),
        models.notification.NotificationTaskTriggerEvent.delete_at.is_(None),
        models.notification.TriggerEvent.uuid == trigger_event_uuid
    )
    return query.all()

def get_trigger_event_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.notification.TriggerEvent)
    query = query.filter(
        models.notification.TriggerEvent.uuid == uuid,
        models.notification.TriggerEvent.delete_at.is_(None)
    )
    return query.one_or_none()

def get_all_trigger_events(
    db: Session
):
    query = db.query(models.notification.TriggerEvent)
    query = query.filter(
        models.notification.TriggerEvent.delete_at.is_(None)
    )
    return query.all()

def get_all_notification_target_provideds(
    db: Session
):
    query = db.query(models.notification.NotificationTargetProvided)
    query = query.filter(
        models.notification.NotificationTargetProvided.delete_at.is_(None)
    )
    return query.all()

def get_notification_task_trigger_scheduler_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTaskTriggerScheduler)
    query = query.filter(
        models.notification.NotificationTaskTriggerScheduler.notification_task_id == notification_task_id,
        models.notification.NotificationTaskTriggerScheduler.delete_at.is_(None)
    )
    return query.one_or_none()

def get_notification_task_trigger_event_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTaskTriggerEvent)
    query = query.filter(
        models.notification.NotificationTaskTriggerEvent.notification_task_id == notification_task_id,
        models.notification.NotificationTaskTriggerEvent.delete_at.is_(None)
    )
    return query.one_or_none()

def get_notification_task_content_template_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTaskContentTemplate)
    query = query.filter(
        models.notification.NotificationTaskContentTemplate.notification_task_id == notification_task_id,
        models.notification.NotificationTaskContentTemplate.delete_at.is_(None)
    )
    return query.one_or_none()

def get_notification_task_content_custom_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTaskContentCustom)
    query = query.filter(
        models.notification.NotificationTaskContentCustom.notification_task_id == notification_task_id,
        models.notification.NotificationTaskContentCustom.delete_at.is_(None)
    )
    return query.one_or_none()

def get_all_notification_tasks(
    db: Session
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTask.delete_at.is_(None)
    )
    return query.all()

def get_notification_task_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTask.id == notification_task_id,
        models.notification.NotificationTask.delete_at.is_(None)
    )
    return query.one_or_none()

def get_notification_tasks_for_user(
    db: Session,
    user_id: int,
    page_num: int,
    page_size: int = 10
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTask.user_id == user_id,
        models.notification.NotificationTask.delete_at.is_(None)
    )
    query = query.order_by(models.notification.NotificationTask.id.desc())
    query = query.offset((page_num - 1) * page_size)
    query = query.limit(page_size)
    return query.all()

def count_notification_tasks_for_user(
    db: Session,
    user_id: int
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTask.user_id == user_id,
        models.notification.NotificationTask.delete_at.is_(None)
    )
    return query.count()

def get_notification_target_by_id(
    db: Session,
    notification_target_id: int
):
    query = db.query(models.notification.NotificationTarget)
    query = query.filter(
        models.notification.NotificationTarget.id == notification_target_id,
        models.notification.NotificationTarget.delete_at.is_(None)
    )
    return query.one_or_none()

def get_notification_source_by_id(
    db: Session,
    notification_source_id: int
):
    query = db.query(models.notification.NotificationSource)
    query = query.filter(
        models.notification.NotificationSource.id == notification_source_id,
        models.notification.NotificationSource.delete_at.is_(None)
    )
    return query.one_or_none()

def get_notification_record_by_user_id_and_notification_record_id(
    db: Session,
    user_id: int,
    notification_record_id: int
):
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(
        models.notification.NotificationRecord.user_id == user_id,
        models.notification.NotificationRecord.id == notification_record_id,
        models.notification.NotificationRecord.delete_at.is_(None)
    )
    return query.one_or_none()

def search_next_notification_record_for_user(
    db: Session,
    user_id: int,
    notification_record: models.notification.NotificationRecord,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationRecord)

    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.notification.NotificationRecord.content.like(f"%{keyword}%"))

    query = query.filter(models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.delete_at.is_(None))

    query = query.order_by(models.notification.NotificationRecord.id.desc())

    query = query.filter(models.notification.NotificationRecord.id < notification_record.id)

    return query.first()

def count_notification_records_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationRecord)

    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.notification.NotificationRecord.content.like(f"%{keyword}%"),
                                 models.notification.NotificationRecord.title.like(f"%{keyword}%")))

    query = query.filter(models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.delete_at.is_(None))

    return query.count()

def search_notification_records_for_user(
    db: Session,
    user_id: int,
    start: int | None = None,
    limit: int = 10,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationRecord)

    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.notification.NotificationRecord.content.like(f"%{keyword}%"),
                                 models.notification.NotificationRecord.title.like(f"%{keyword}%")))

    query = query.filter(models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.delete_at.is_(None))

    query = query.order_by(models.notification.NotificationRecord.id.desc())

    if start is not None:
        query = query.filter(models.notification.NotificationRecord.id <= start)

    query = query.limit(limit)
    return query.all()

def search_notification_sources_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None,
    start: int | None = None,
    limit: int | None = None,
):
    query = db.query(models.notification.NotificationSource, models.notification.UserNotificationSource)
    query = query.options(
        joinedload(models.notification.NotificationSource.creator),
        joinedload(models.notification.NotificationSource.notification_source_provided)
    )
    query = query.outerjoin(
        models.notification.UserNotificationSource,
        and_(
            models.notification.UserNotificationSource.notification_source_id == models.notification.UserNotificationSource.id,
            models.notification.UserNotificationSource.user_id == user_id,
            models.notification.UserNotificationSource.delete_at.is_(None),
        ),
    )
    query = query.filter(models.notification.NotificationSource.delete_at.is_(None))
    query = query.filter(
        or_(
            models.notification.NotificationSource.creator_id == user_id,
            models.notification.NotificationSource.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.notification.NotificationSource.title.ilike(f"%{keyword}%"))
    query = query.order_by(models.notification.NotificationSource.id.desc())
    if start is not None:
        query = query.filter(models.notification.NotificationSource.id <= start)
    if limit is not None:
        query = query.limit(limit)
    # 返回 [(notification_source, user_notification_source), ...]
    return query.all()

def search_next_notification_source_for_user(
    db: Session,
    user_id: int,
    notification_source: models.notification.NotificationSource,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationSource, models.notification.UserNotificationSource)
    query = query.options(
        joinedload(models.notification.NotificationSource.creator),
        joinedload(models.notification.NotificationSource.notification_source_provided)
    )
    query = query.outerjoin(
        models.notification.UserNotificationSource,
        and_(
            models.notification.UserNotificationSource.notification_source_id == models.notification.NotificationSource.id,
            models.notification.UserNotificationSource.user_id == user_id,
            models.notification.UserNotificationSource.delete_at.is_(None),
        ),
    )
    query = query.filter(models.notification.NotificationSource.delete_at.is_(None))
    query = query.filter(
        or_(
            models.notification.NotificationSource.creator_id == user_id,
            models.notification.NotificationSource.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.notification.NotificationSource.title.ilike(f"%{keyword}%"))
    query = query.order_by(models.notification.NotificationSource.id.desc())
    query = query.filter(models.notification.NotificationSource.id < notification_source.id)
    return query.first()

def count_all_notification_sources_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationSource, models.notification.UserNotificationSource)
    query = query.options(
        joinedload(models.notification.NotificationSource.creator),
        joinedload(models.notification.NotificationSource.notification_source_provided)
    )
    query = query.outerjoin(
        models.notification.UserNotificationSource,
        and_(
            models.notification.UserNotificationSource.notification_source_id == models.notification.NotificationSource.id,
            models.notification.UserNotificationSource.user_id == user_id,
            models.notification.UserNotificationSource.delete_at.is_(None),
        ),
    )
    query = query.filter(models.notification.NotificationSource.delete_at.is_(None))
    query = query.filter(
        or_(
            models.notification.NotificationSource.creator_id == user_id,
            models.notification.NotificationSource.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.notification.NotificationSource.title.ilike(f"%{keyword}%"))
    query = query.order_by(models.notification.NotificationSource.id.desc())
    return query.count()

def search_notification_targets_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None,
    start: int | None = None,
    limit: int | None = None,
):
    query = db.query(models.notification.NotificationTarget, models.notification.UserNotificationTarget)
    query = query.options(
        joinedload(models.notification.NotificationTarget.creator),
        joinedload(models.notification.NotificationTarget.notification_target_provided)
    )
    query = query.outerjoin(
        models.notification.UserNotificationTarget,
        and_(
            models.notification.UserNotificationTarget.notification_target_id == models.notification.UserNotificationTarget.id,
            models.notification.UserNotificationTarget.user_id == user_id,
            models.notification.UserNotificationTarget.delete_at.is_(None),
        ),
    )
    query = query.filter(models.notification.NotificationTarget.delete_at.is_(None))
    query = query.filter(
        or_(
            models.notification.NotificationTarget.creator_id == user_id,
            models.notification.NotificationTarget.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.notification.NotificationTarget.title.ilike(f"%{keyword}%"))
    query = query.order_by(models.notification.NotificationTarget.id.desc())
    if start is not None:
        query = query.filter(models.notification.NotificationTarget.id <= start)
    if limit is not None:
        query = query.limit(limit)
    # 返回 [(notification_target, user_notification_target), ...]
    return query.all()

def search_next_notification_target_for_user(
    db: Session,
    user_id: int,
    notification_target: models.notification.NotificationTarget,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationTarget, models.notification.UserNotificationTarget)
    query = query.options(
        joinedload(models.notification.NotificationTarget.creator),
        joinedload(models.notification.NotificationTarget.notification_target_provided)
    )
    query = query.outerjoin(
        models.notification.UserNotificationTarget,
        and_(
            models.notification.UserNotificationTarget.notification_target_id == models.notification.NotificationTarget.id,
            models.notification.UserNotificationTarget.user_id == user_id,
            models.notification.UserNotificationTarget.delete_at.is_(None),
        ),
    )
    query = query.filter(models.notification.NotificationTarget.delete_at.is_(None))
    query = query.filter(
        or_(
            models.notification.NotificationTarget.creator_id == user_id,
            models.notification.NotificationTarget.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.notification.NotificationTarget.title.ilike(f"%{keyword}%"))
    query = query.order_by(models.notification.NotificationTarget.id.desc())
    query = query.filter(models.notification.NotificationTarget.id < notification_target.id)
    return query.first()

def count_all_notification_targets_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationTarget, models.notification.UserNotificationTarget)
    query = query.options(
        joinedload(models.notification.NotificationTarget.creator),
        joinedload(models.notification.NotificationTarget.notification_target_provided)
    )
    query = query.outerjoin(
        models.notification.UserNotificationTarget,
        and_(
            models.notification.UserNotificationTarget.notification_target_id == models.notification.NotificationTarget.id,
            models.notification.UserNotificationTarget.user_id == user_id,
            models.notification.UserNotificationTarget.delete_at.is_(None),
        ),
    )
    query = query.filter(models.notification.NotificationTarget.delete_at.is_(None))
    query = query.filter(
        or_(
            models.notification.NotificationTarget.creator_id == user_id,
            models.notification.NotificationTarget.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.notification.NotificationTarget.title.ilike(f"%{keyword}%"))
    query = query.order_by(models.notification.NotificationTarget.id.desc())
    return query.count()

def read_all_notification_records_for_user(
    db: Session,
    user_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.user_id == user_id)
    query.update({models.notification.NotificationRecord.read_at: now}, synchronize_session=False)
    db.flush()

def read_notification_records_by_notification_record_ids_for_user(
    db: Session,
    user_id: int,
    notification_record_ids: list[int]
):
    if not notification_record_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(
        models.notification.NotificationRecord.id.in_(notification_record_ids),
        models.notification.NotificationRecord.user_id == user_id,
        models.notification.NotificationRecord.delete_at.is_(None)
    )
    query.update({models.notification.NotificationRecord.read_at: now}, synchronize_session=False)
    db.flush()

def unread_notification_records_by_notification_record_ids_for_user(
    db: Session,
    user_id: int,
    notification_record_ids: list[int]
):
    if not notification_record_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(
        models.notification.NotificationRecord.id.in_(notification_record_ids),
        models.notification.NotificationRecord.user_id == user_id,
        models.notification.NotificationRecord.delete_at.is_(None)
    )
    query.update({models.notification.NotificationRecord.read_at: now}, synchronize_session=False)
    db.flush()

def delete_notification_records_by_notification_record_ids(
    db: Session,
    user_id: int,
    notification_record_ids: list[int]
):
    if not notification_record_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(
        models.notification.NotificationRecord.id.in_(notification_record_ids),
        models.notification.NotificationRecord.user_id == user_id,
        models.notification.NotificationRecord.delete_at.is_(None)
    )
    query.update({models.notification.NotificationRecord.delete_at: now}, synchronize_session=False)
    db.flush()

def delete_notification_tasks(
    db: Session,
    user_id: int,
    notification_task_ids: list[int]
):
    if not notification_task_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTask.id.in_(notification_task_ids),
        models.notification.NotificationTask.user_id == user_id,
        models.notification.NotificationTask.delete_at.is_(None)
    )
    query.update({models.notification.NotificationTask.delete_at: now}, synchronize_session=False)
    db.flush()

def delete_notification_task_content_template_by_notification_task_id(
    db: Session,
    user_id: int,
    notification_task_id: int
):
    now = datetime.now(timezone.utc)

    query = db.query(models.notification.NotificationTaskContentTemplate)
    query = query.join(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTaskContentTemplate.notification_task_id == notification_task_id,
        models.notification.NotificationTask.user_id == user_id,
        models.notification.NotificationTaskContentTemplate.delete_at.is_(None)
    )
    db_notification_task_content_template = query.one_or_none()
    if db_notification_task_content_template is not None:
        db_notification_task_content_template.delete_at = now
        db.flush()

def delete_notification_task_content_custom_by_notification_task_id(
    db: Session,
    user_id: int,
    notification_task_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationTaskContentCustom)
    query = query.join(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTaskContentCustom.notification_task_id == notification_task_id,
        models.notification.NotificationTask.user_id == user_id,
        models.notification.NotificationTaskContentCustom.delete_at.is_(None)
    )
    db_notification_task_content_custom = query.one_or_none()
    if db_notification_task_content_custom is not None:
        db_notification_task_content_custom.delete_at = now
        db.flush()
