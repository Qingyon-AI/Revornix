from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, joinedload

import models
from enums.notification import UserNotificationSourceRole, UserNotificationTargetRole
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

async def create_notification_template_async(
    db: AsyncSession,
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
    await db.flush()
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

async def create_notification_trigger_event_async(
    db: AsyncSession,
    uuid: str,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None,
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
    await db.flush()
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
    creator_id: int,
    title: str,
    notification_source_id: int,
    notification_target_id: int,
    enable: bool
):
    now = datetime.now(timezone.utc)
    notification_task = models.notification.NotificationTask(
        creator_id=creator_id,
        title=title,
        content_type=1,
        notification_source_id=notification_source_id,
        notification_target_id=notification_target_id,
        trigger_type=0,
        create_time=now,
        enable=enable
    )
    db.add(notification_task)
    db.flush()
    return notification_task

def get_trigger_event_by_id(
    db: Session,
    trigger_event_id: int
):
    query = db.query(models.notification.TriggerEvent)
    query = query.filter(
        models.notification.TriggerEvent.id == trigger_event_id,
        models.notification.TriggerEvent.delete_at.is_(None)
    )
    return query.one_or_none()

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
    category: str | None = None,
    description: str | None = None,
    description_zh: str | None = None
):
    now = datetime.now(timezone.utc)
    notification_source_provided = models.notification.NotificationSourceProvided(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        category=category,
        description=description,
        description_zh=description_zh,
        create_time=now
    )
    db.add(notification_source_provided)
    db.flush()
    return notification_source_provided

async def create_notification_source_provided_async(
    db: AsyncSession,
    uuid: str,
    name: str,
    name_zh: str,
    category: str | None = None,
    description: str | None = None,
    description_zh: str | None = None,
):
    now = datetime.now(timezone.utc)
    notification_source_provided = models.notification.NotificationSourceProvided(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        category=category,
        description=description,
        description_zh=description_zh,
        create_time=now
    )
    db.add(notification_source_provided)
    await db.flush()
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
    category: str | None = None,
    description: str | None = None,
    description_zh: str | None = None
):
    now = datetime.now(timezone.utc)
    notification_target = models.notification.NotificationTargetProvided(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        category=category,
        description=description,
        description_zh=description_zh,
        create_time=now
    )
    db.add(notification_target)
    db.flush()
    return notification_target

async def create_notification_target_provided_async(
    db: AsyncSession,
    uuid: str,
    name: str,
    name_zh: str,
    category: str | None = None,
    description: str | None = None,
    description_zh: str | None = None,
):
    now = datetime.now(timezone.utc)
    notification_target = models.notification.NotificationTargetProvided(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        category=category,
        description=description,
        description_zh=description_zh,
        create_time=now
    )
    db.add(notification_target)
    await db.flush()
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
    task_id: int,
    title: str,
    content: str | None = None,
    cover: str | None = None,
    link: str | None = None
):
    now = datetime.now(timezone.utc)
    notification = models.notification.NotificationRecord(
        task_id=task_id,
        title=title,
        content=content,
        cover=cover,
        link=link,
        create_time=now
    )
    db.add(notification)
    db.flush()
    return notification

async def create_notification_record_async(
    db: AsyncSession,
    task_id: int,
    title: str,
    content: str | None = None,
    cover: str | None = None,
    link: str | None = None,
):
    now = datetime.now(timezone.utc)
    notification = models.notification.NotificationRecord(
        task_id=task_id,
        title=title,
        content=content,
        cover=cover,
        link=link,
        create_time=now
    )
    db.add(notification)
    await db.flush()
    return notification

def get_usable_notification_sources_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationSource)
    query = query.join(models.notification.NotificationSourceProvided)
    query = query.options(
        joinedload(models.notification.NotificationSource.notification_source_provided)
    )
    query = query.join(models.notification.UserNotificationSource, models.notification.NotificationSource.id == models.notification.UserNotificationSource.notification_source_id)
    query = query.filter(
        models.notification.UserNotificationSource.user_id == user_id,
        models.notification.UserNotificationSource.delete_at.is_(None),
        models.notification.NotificationSource.delete_at.is_(None)
    )
    if keyword:
        query = query.filter(models.notification.NotificationSource.name.ilike(f"%{keyword}%"))
    query = query.order_by(models.notification.NotificationSource.id.desc())

    return query.all()

def get_usable_notification_targets_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationTarget)
    query = query.join(models.notification.NotificationTargetProvided)
    query = query.options(
        joinedload(models.notification.NotificationTarget.notification_target_provided)
    )
    query = query.join(models.notification.UserNotificationTarget, models.notification.NotificationTarget.id == models.notification.UserNotificationTarget.notification_target_id)
    query = query.filter(
        models.notification.UserNotificationTarget.user_id == user_id,
        models.notification.UserNotificationTarget.delete_at.is_(None),
        models.notification.NotificationTarget.delete_at.is_(None)
    )
    if keyword:
        query = query.filter(models.notification.NotificationTarget.name.ilike(f"%{keyword}%"))
    query = query.order_by(models.notification.NotificationTarget.id.desc())

    return query.all()

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

async def get_notification_source_by_uuid_async(
    db: AsyncSession,
    uuid: str,
):
    result = await db.execute(
        select(models.notification.NotificationSource).where(
            models.notification.NotificationSource.uuid == uuid,
            models.notification.NotificationSource.delete_at.is_(None),
        )
    )
    return result.scalar_one_or_none()

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

async def get_notification_source_provided_by_uuid_async(
    db: AsyncSession,
    uuid: str,
):
    result = await db.execute(
        select(models.notification.NotificationSourceProvided).where(
            models.notification.NotificationSourceProvided.uuid == uuid,
        )
    )
    return result.scalar_one_or_none()

def get_notification_target_provided_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.notification.NotificationTargetProvided)
    query = query.filter(
        models.notification.NotificationTargetProvided.uuid == uuid,
    )
    return query.one_or_none()

async def get_notification_target_provided_by_uuid_async(
    db: AsyncSession,
    uuid: str,
):
    result = await db.execute(
        select(models.notification.NotificationTargetProvided).where(
            models.notification.NotificationTargetProvided.uuid == uuid,
        )
    )
    return result.scalar_one_or_none()

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

async def get_notification_template_by_uuid_async(
    db: AsyncSession,
    uuid: str,
):
    result = await db.execute(
        select(models.notification.NotificationTemplate).where(
            models.notification.NotificationTemplate.uuid == uuid,
            models.notification.NotificationTemplate.delete_at.is_(None),
        )
    )
    return result.scalar_one_or_none()

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
        models.notification.NotificationTask.creator_id == user_id,
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

async def get_trigger_event_by_uuid_async(
    db: AsyncSession,
    uuid: str,
):
    result = await db.execute(
        select(models.notification.TriggerEvent).where(
            models.notification.TriggerEvent.uuid == uuid,
            models.notification.TriggerEvent.delete_at.is_(None),
        )
    )
    return result.scalar_one_or_none()

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

async def get_all_notification_tasks_async(
    db: AsyncSession,
):
    result = await db.execute(
        select(models.notification.NotificationTask).where(
            models.notification.NotificationTask.delete_at.is_(None)
        )
    )
    return result.scalars().all()

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
        models.notification.NotificationTask.creator_id == user_id,
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
        models.notification.NotificationTask.creator_id == user_id,
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

def get_notification_record_by_notification_record_id(
    db: Session,
    notification_record_id: int
):
    query = db.query(models.notification.NotificationRecord)
    query = query.options(
        joinedload(models.notification.NotificationRecord.notification_task)
    )
    query = query.filter(
        models.notification.NotificationRecord.id == notification_record_id,
        models.notification.NotificationRecord.delete_at.is_(None)
    )
    return query.one_or_none()

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
        models.notification.NotificationTask.creator_id == user_id,
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
        models.notification.NotificationTask.creator_id == user_id,
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
        models.notification.NotificationTask.creator_id == user_id,
        models.notification.NotificationTaskContentCustom.delete_at.is_(None)
    )
    db_notification_task_content_custom = query.one_or_none()
    if db_notification_task_content_custom is not None:
        db_notification_task_content_custom.delete_at = now
        db.flush()

def search_notification_records_for_receiver(
    db: Session,
    user_id: int,
    start: int | None = None,
    limit: int = 10,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationRecord)
    
    query = query.join(
        models.notification.NotificationTask,
        models.notification.NotificationRecord.task_id == models.notification.NotificationTask.id
    )
    
    query = query.join(
        models.notification.NotificationTarget,
        models.notification.NotificationTask.notification_target_id == models.notification.NotificationTarget.id
    )

    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.notification.NotificationRecord.content.like(f"%{keyword}%"),
                                 models.notification.NotificationRecord.title.like(f"%{keyword}%")))

    query = query.filter(models.notification.NotificationRecord.delete_at.is_(None),
                         models.notification.NotificationTarget.creator_id == user_id)

    query = query.order_by(models.notification.NotificationRecord.id.desc())

    if start is not None:
        query = query.filter(models.notification.NotificationRecord.id <= start)

    query = query.limit(limit)
    return query.all()

def search_next_notification_record_for_receiver(
    db: Session,
    user_id: int,
    notification_record: models.notification.NotificationRecord,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationRecord)
    
    query = query.join(
        models.notification.NotificationTask,
        models.notification.NotificationRecord.task_id == models.notification.NotificationTask.id
    )
    
    query = query.join(
        models.notification.NotificationTarget,
        models.notification.NotificationTask.notification_target_id == models.notification.NotificationTarget.id
    )

    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.notification.NotificationRecord.content.like(f"%{keyword}%"))

    query = query.filter(models.notification.NotificationRecord.delete_at.is_(None),
                         models.notification.NotificationTarget.creator_id == user_id)

    query = query.order_by(models.notification.NotificationRecord.id.desc())

    query = query.filter(models.notification.NotificationRecord.id < notification_record.id)

    return query.first()

def count_notification_records_for_receiver(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationRecord)
    
    query = query.join(
        models.notification.NotificationTask,
        models.notification.NotificationRecord.task_id == models.notification.NotificationTask.id
    )
    
    query = query.join(
        models.notification.NotificationTarget,
        models.notification.NotificationTask.notification_target_id == models.notification.NotificationTarget.id
    )

    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.notification.NotificationRecord.content.like(f"%{keyword}%"),
                                 models.notification.NotificationRecord.title.like(f"%{keyword}%")))

    query = query.filter(models.notification.NotificationRecord.delete_at.is_(None),
                         models.notification.NotificationTarget.creator_id == user_id)

    return query.count()

def _query_accessible_notification_record_ids_for_receiver(
    db: Session,
    receiver_id: int,
    notification_record_ids: list[int] | None = None
):
    query = db.query(models.notification.NotificationRecord.id)
    
    query = query.join(
        models.notification.NotificationTask,
        models.notification.NotificationRecord.task_id == models.notification.NotificationTask.id
    )
    
    query = query.join(
        models.notification.NotificationTarget,
        models.notification.NotificationTask.notification_target_id == models.notification.NotificationTarget.id
    )
    
    query = query.filter(
        models.notification.NotificationRecord.delete_at.is_(None),
        models.notification.NotificationTarget.creator_id == receiver_id
    )
    
    if notification_record_ids is not None and len(notification_record_ids) > 0:
        query = query.filter(
            models.notification.NotificationRecord.id.in_(notification_record_ids)
        )

    return query

def read_all_notification_records_for_receiver(
    db: Session,
    receiver_id: int
):
    now = datetime.now(timezone.utc)
    accessible_record_ids = _query_accessible_notification_record_ids_for_receiver(
        db=db,
        receiver_id=receiver_id,
    )

    db.query(models.notification.NotificationRecord).filter(
        models.notification.NotificationRecord.id.in_(accessible_record_ids)
    ).update({models.notification.NotificationRecord.read_at: now}, synchronize_session=False)
    db.flush()

def read_notification_records_by_notification_record_ids_for_receiver(
    db: Session,
    receiver_id: int,
    notification_record_ids: list[int]
):
    if not notification_record_ids:
        return

    now = datetime.now(timezone.utc)
    accessible_record_ids = _query_accessible_notification_record_ids_for_receiver(
        db=db,
        receiver_id=receiver_id,
        notification_record_ids=notification_record_ids
    )

    db.query(models.notification.NotificationRecord).filter(
        models.notification.NotificationRecord.id.in_(accessible_record_ids)
    ).update({models.notification.NotificationRecord.read_at: now}, synchronize_session=False)

    db.flush()

def unread_notification_records_by_notification_record_ids_for_user(
    db: Session,
    user_id: int,
    notification_record_ids: list[int]
):
    if not notification_record_ids:
        return

    accessible_record_ids = _query_accessible_notification_record_ids_for_receiver(
        db=db,
        receiver_id=user_id,
        notification_record_ids=notification_record_ids
    )

    db.query(models.notification.NotificationRecord).filter(
        models.notification.NotificationRecord.id.in_(accessible_record_ids)
    ).update({models.notification.NotificationRecord.read_at: None}, synchronize_session=False)
    
    db.flush()

def delete_notification_records_by_notification_record_ids(
    db: Session,
    user_id: int,
    notification_record_ids: list[int]
):
    if not notification_record_ids:
        return
    
    now = datetime.now(timezone.utc)
    accessible_record_ids = _query_accessible_notification_record_ids_for_receiver(
        db=db,
        receiver_id=user_id,
        notification_record_ids=notification_record_ids
    )

    db.query(models.notification.NotificationRecord).filter(
        models.notification.NotificationRecord.id.in_(accessible_record_ids)
    ).update({models.notification.NotificationRecord.delete_at: now}, synchronize_session=False)
    
    db.flush()


def _notification_source_with_relations_stmt():
    return select(models.notification.NotificationSource).options(
        joinedload(models.notification.NotificationSource.creator),
        joinedload(models.notification.NotificationSource.notification_source_provided),
    )


def _notification_target_with_relations_stmt():
    return select(models.notification.NotificationTarget).options(
        joinedload(models.notification.NotificationTarget.creator),
        joinedload(models.notification.NotificationTarget.notification_target_provided),
    )


def _search_notification_sources_stmt(
    *,
    user_id: int,
    keyword: str | None = None,
):
    stmt = (
        select(
            models.notification.NotificationSource,
            models.notification.UserNotificationSource,
        )
        .options(
            joinedload(models.notification.NotificationSource.creator),
            joinedload(models.notification.NotificationSource.notification_source_provided),
        )
        .outerjoin(
            models.notification.UserNotificationSource,
            and_(
                models.notification.UserNotificationSource.notification_source_id == models.notification.NotificationSource.id,
                models.notification.UserNotificationSource.user_id == user_id,
                models.notification.UserNotificationSource.delete_at.is_(None),
            ),
        )
        .where(
            models.notification.NotificationSource.delete_at.is_(None),
            or_(
                models.notification.NotificationSource.creator_id == user_id,
                models.notification.NotificationSource.is_public.is_(True),
            ),
        )
    )
    if keyword:
        stmt = stmt.where(models.notification.NotificationSource.title.ilike(f"%{keyword}%"))
    return stmt.order_by(models.notification.NotificationSource.id.desc())


def _search_notification_targets_stmt(
    *,
    user_id: int,
    keyword: str | None = None,
):
    stmt = (
        select(
            models.notification.NotificationTarget,
            models.notification.UserNotificationTarget,
        )
        .options(
            joinedload(models.notification.NotificationTarget.creator),
            joinedload(models.notification.NotificationTarget.notification_target_provided),
        )
        .outerjoin(
            models.notification.UserNotificationTarget,
            and_(
                models.notification.UserNotificationTarget.notification_target_id == models.notification.NotificationTarget.id,
                models.notification.UserNotificationTarget.user_id == user_id,
                models.notification.UserNotificationTarget.delete_at.is_(None),
            ),
        )
        .where(
            models.notification.NotificationTarget.delete_at.is_(None),
            or_(
                models.notification.NotificationTarget.creator_id == user_id,
                models.notification.NotificationTarget.is_public.is_(True),
            ),
        )
    )
    if keyword:
        stmt = stmt.where(models.notification.NotificationTarget.title.ilike(f"%{keyword}%"))
    return stmt.order_by(models.notification.NotificationTarget.id.desc())


def _accessible_notification_record_ids_stmt(
    *,
    receiver_id: int,
    notification_record_ids: list[int] | None = None,
):
    stmt = (
        select(models.notification.NotificationRecord.id)
        .join(
            models.notification.NotificationTask,
            models.notification.NotificationRecord.task_id == models.notification.NotificationTask.id,
        )
        .join(
            models.notification.NotificationTarget,
            models.notification.NotificationTask.notification_target_id == models.notification.NotificationTarget.id,
        )
        .where(
            models.notification.NotificationRecord.delete_at.is_(None),
            models.notification.NotificationTarget.creator_id == receiver_id,
        )
    )
    if notification_record_ids:
        stmt = stmt.where(models.notification.NotificationRecord.id.in_(notification_record_ids))
    return stmt


async def create_notification_task_content_custom_async(
    db: AsyncSession,
    notification_task_id: int,
    title: str,
    content: str | None = None,
    link: str | None = None,
    cover: str | None = None,
):
    db_notification_task_content_custom = models.notification.NotificationTaskContentCustom(
        notification_task_id=notification_task_id,
        title=title,
        content=content,
        link=link,
        cover=cover,
    )
    db.add(db_notification_task_content_custom)
    await db.flush()
    return db_notification_task_content_custom


async def create_notification_task_content_template_async(
    db: AsyncSession,
    notification_task_id: int,
    notification_template_id: int,
):
    db_notification_task_content_template = models.notification.NotificationTaskContentTemplate(
        notification_task_id=notification_task_id,
        notification_template_id=notification_template_id,
    )
    db.add(db_notification_task_content_template)
    await db.flush()
    return db_notification_task_content_template


async def create_notification_task_async(
    db: AsyncSession,
    creator_id: int,
    title: str,
    notification_source_id: int,
    notification_target_id: int,
    enable: bool,
):
    now = datetime.now(timezone.utc)
    notification_task = models.notification.NotificationTask(
        creator_id=creator_id,
        title=title,
        content_type=1,
        notification_source_id=notification_source_id,
        notification_target_id=notification_target_id,
        trigger_type=0,
        create_time=now,
        enable=enable,
    )
    db.add(notification_task)
    await db.flush()
    return notification_task


async def create_notification_task_trigger_event_async(
    db: AsyncSession,
    notification_task_id: int,
    trigger_event_id: int,
):
    db_notification_task_trigger_event = models.notification.NotificationTaskTriggerEvent(
        notification_task_id=notification_task_id,
        trigger_event_id=trigger_event_id,
    )
    db.add(db_notification_task_trigger_event)
    await db.flush()
    return db_notification_task_trigger_event


async def create_notification_task_trigger_scheduler_async(
    db: AsyncSession,
    notification_task_id: int,
    cron_expr: str,
):
    db_notification_task_trigger_scheduler = models.notification.NotificationTaskTriggerScheduler(
        notification_task_id=notification_task_id,
        cron_expr=cron_expr,
    )
    db.add(db_notification_task_trigger_scheduler)
    await db.flush()
    return db_notification_task_trigger_scheduler


async def create_notification_source_async(
    db: AsyncSession,
    notification_source_provided_id: int,
    creator_id: int,
    title: str,
    description: str | None = None,
    config_json: str | None = None,
    uuid: str | None = None,
    is_public: bool = False,
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
        create_time=now,
    )
    db.add(notification_source)
    await db.flush()
    return notification_source


async def create_user_notification_source_async(
    db: AsyncSession,
    notification_source_id: int,
    user_id: int,
    role: UserNotificationSourceRole = UserNotificationSourceRole.FORKER,
):
    now = datetime.now(timezone.utc)
    notification_source = models.notification.UserNotificationSource(
        notification_source_id=notification_source_id,
        user_id=user_id,
        role=role,
        create_time=now,
    )
    db.add(notification_source)
    await db.flush()
    return notification_source


async def create_notification_target_async(
    db: AsyncSession,
    notification_target_provided_id: int,
    creator_id: int,
    title: str,
    description: str | None = None,
    config_json: str | None = None,
    uuid: str | None = None,
    is_public: bool = False,
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
        create_time=now,
    )
    db.add(notification_target)
    await db.flush()
    return notification_target


async def create_user_notification_target_async(
    db: AsyncSession,
    notification_target_id: int,
    user_id: int,
    role: UserNotificationTargetRole = UserNotificationTargetRole.FORKER,
):
    now = datetime.now(timezone.utc)
    user_notification_target = models.notification.UserNotificationTarget(
        notification_target_id=notification_target_id,
        user_id=user_id,
        role=role,
        create_time=now,
    )
    db.add(user_notification_target)
    await db.flush()
    return user_notification_target


async def get_usable_notification_sources_for_user_async(
    db: AsyncSession,
    user_id: int,
    keyword: str | None = None,
):
    stmt = (
        _notification_source_with_relations_stmt()
        .join(models.notification.UserNotificationSource, models.notification.NotificationSource.id == models.notification.UserNotificationSource.notification_source_id)
        .where(
            models.notification.UserNotificationSource.user_id == user_id,
            models.notification.UserNotificationSource.delete_at.is_(None),
            models.notification.NotificationSource.delete_at.is_(None),
        )
        .order_by(models.notification.NotificationSource.id.desc())
    )
    if keyword:
        stmt = stmt.where(models.notification.NotificationSource.title.ilike(f"%{keyword}%"))
    return (await db.execute(stmt)).scalars().all()


async def get_usable_notification_targets_for_user_async(
    db: AsyncSession,
    user_id: int,
    keyword: str | None = None,
):
    stmt = (
        _notification_target_with_relations_stmt()
        .join(models.notification.UserNotificationTarget, models.notification.NotificationTarget.id == models.notification.UserNotificationTarget.notification_target_id)
        .where(
            models.notification.UserNotificationTarget.user_id == user_id,
            models.notification.UserNotificationTarget.delete_at.is_(None),
            models.notification.NotificationTarget.delete_at.is_(None),
        )
        .order_by(models.notification.NotificationTarget.id.desc())
    )
    if keyword:
        stmt = stmt.where(models.notification.NotificationTarget.title.ilike(f"%{keyword}%"))
    return (await db.execute(stmt)).scalars().all()


async def get_notification_source_provided_by_id_async(
    db: AsyncSession,
    id: int,
):
    return (
        await db.execute(
            select(models.notification.NotificationSourceProvided).where(
                models.notification.NotificationSourceProvided.id == id,
                models.notification.NotificationSourceProvided.delete_at.is_(None),
            )
        )
    ).scalar_one_or_none()


async def get_notification_target_provided_by_id_async(
    db: AsyncSession,
    id: int,
):
    return (
        await db.execute(
            select(models.notification.NotificationTargetProvided).where(
                models.notification.NotificationTargetProvided.id == id,
                models.notification.NotificationTargetProvided.delete_at.is_(None),
            )
        )
    ).scalar_one_or_none()


async def get_notification_task_by_notification_target_id_async(
    db: AsyncSession,
    notification_target_id: int,
):
    return (
        await db.execute(
            select(models.notification.NotificationTask).where(
                models.notification.NotificationTask.notification_target_id == notification_target_id,
                models.notification.NotificationTask.delete_at.is_(None),
            )
        )
    ).scalars().all()


async def get_notification_task_by_notification_source_id_async(
    db: AsyncSession,
    notification_source_id: int,
):
    return (
        await db.execute(
            select(models.notification.NotificationTask).where(
                models.notification.NotificationTask.notification_source_id == notification_source_id,
                models.notification.NotificationTask.delete_at.is_(None),
            )
        )
    ).scalars().all()


async def get_user_notification_source_by_user_id_and_notification_source_id_async(
    db: AsyncSession,
    user_id: int,
    notification_source_id: int,
    filter_role: UserNotificationSourceRole | None = None,
):
    stmt = select(models.notification.UserNotificationSource).where(
        models.notification.UserNotificationSource.user_id == user_id,
        models.notification.UserNotificationSource.notification_source_id == notification_source_id,
        models.notification.UserNotificationSource.delete_at.is_(None),
    )
    if filter_role is not None:
        stmt = stmt.where(models.notification.UserNotificationSource.role == filter_role)
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_user_notification_target_by_user_id_and_notification_target_id_async(
    db: AsyncSession,
    user_id: int,
    notification_target_id: int,
    filter_role: UserNotificationTargetRole | None = None,
):
    stmt = select(models.notification.UserNotificationTarget).where(
        models.notification.UserNotificationTarget.user_id == user_id,
        models.notification.UserNotificationTarget.notification_target_id == notification_target_id,
        models.notification.UserNotificationTarget.delete_at.is_(None),
    )
    if filter_role is not None:
        stmt = stmt.where(models.notification.UserNotificationTarget.role == filter_role)
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_all_notification_templates_async(db: AsyncSession):
    return (
        await db.execute(
            select(models.notification.NotificationTemplate).where(
                models.notification.NotificationTemplate.delete_at.is_(None),
            )
        )
    ).scalars().all()


async def get_all_provided_notification_sources_async(db: AsyncSession):
    return (
        await db.execute(
            select(models.notification.NotificationSourceProvided).where(
                models.notification.NotificationSourceProvided.delete_at.is_(None),
            )
        )
    ).scalars().all()


async def get_all_trigger_events_async(db: AsyncSession):
    return (
        await db.execute(
            select(models.notification.TriggerEvent).where(
                models.notification.TriggerEvent.delete_at.is_(None),
            )
        )
    ).scalars().all()


async def get_all_notification_target_provideds_async(db: AsyncSession):
    return (
        await db.execute(
            select(models.notification.NotificationTargetProvided).where(
                models.notification.NotificationTargetProvided.delete_at.is_(None),
            )
        )
    ).scalars().all()


async def get_notification_task_trigger_scheduler_by_notification_task_id_async(
    db: AsyncSession,
    notification_task_id: int,
):
    return (
        await db.execute(
            select(models.notification.NotificationTaskTriggerScheduler).where(
                models.notification.NotificationTaskTriggerScheduler.notification_task_id == notification_task_id,
                models.notification.NotificationTaskTriggerScheduler.delete_at.is_(None),
            )
        )
    ).scalar_one_or_none()


async def get_notification_task_trigger_event_by_notification_task_id_async(
    db: AsyncSession,
    notification_task_id: int,
):
    return (
        await db.execute(
            select(models.notification.NotificationTaskTriggerEvent).where(
                models.notification.NotificationTaskTriggerEvent.notification_task_id == notification_task_id,
                models.notification.NotificationTaskTriggerEvent.delete_at.is_(None),
            )
        )
    ).scalar_one_or_none()


async def get_notification_task_content_template_by_notification_task_id_async(
    db: AsyncSession,
    notification_task_id: int,
):
    return (
        await db.execute(
            select(models.notification.NotificationTaskContentTemplate).where(
                models.notification.NotificationTaskContentTemplate.notification_task_id == notification_task_id,
                models.notification.NotificationTaskContentTemplate.delete_at.is_(None),
            )
        )
    ).scalar_one_or_none()


async def get_notification_task_content_custom_by_notification_task_id_async(
    db: AsyncSession,
    notification_task_id: int,
):
    return (
        await db.execute(
            select(models.notification.NotificationTaskContentCustom).where(
                models.notification.NotificationTaskContentCustom.notification_task_id == notification_task_id,
                models.notification.NotificationTaskContentCustom.delete_at.is_(None),
            )
        )
    ).scalar_one_or_none()


async def get_notification_task_by_notification_task_id_async(
    db: AsyncSession,
    notification_task_id: int,
):
    return (
        await db.execute(
            select(models.notification.NotificationTask).where(
                models.notification.NotificationTask.id == notification_task_id,
                models.notification.NotificationTask.delete_at.is_(None),
            )
        )
    ).scalar_one_or_none()


async def get_notification_tasks_for_user_async(
    db: AsyncSession,
    user_id: int,
    page_num: int,
    page_size: int = 10,
):
    stmt = (
        select(models.notification.NotificationTask)
        .where(
            models.notification.NotificationTask.creator_id == user_id,
            models.notification.NotificationTask.delete_at.is_(None),
        )
        .order_by(models.notification.NotificationTask.id.desc())
        .offset((page_num - 1) * page_size)
        .limit(page_size)
    )
    return (await db.execute(stmt)).scalars().all()


async def count_notification_tasks_for_user_async(
    db: AsyncSession,
    user_id: int,
):
    return (
        await db.execute(
            select(func.count(models.notification.NotificationTask.id)).where(
                models.notification.NotificationTask.creator_id == user_id,
                models.notification.NotificationTask.delete_at.is_(None),
            )
        )
    ).scalar_one()


async def get_notification_target_by_id_async(
    db: AsyncSession,
    notification_target_id: int,
):
    stmt = _notification_target_with_relations_stmt().where(
        models.notification.NotificationTarget.id == notification_target_id,
        models.notification.NotificationTarget.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_notification_source_by_id_async(
    db: AsyncSession,
    notification_source_id: int,
):
    stmt = _notification_source_with_relations_stmt().where(
        models.notification.NotificationSource.id == notification_source_id,
        models.notification.NotificationSource.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_notification_record_by_notification_record_id_async(
    db: AsyncSession,
    notification_record_id: int,
):
    stmt = (
        select(models.notification.NotificationRecord)
        .options(
            joinedload(models.notification.NotificationRecord.notification_task).joinedload(
                models.notification.NotificationTask.creator
            )
        )
        .where(
            models.notification.NotificationRecord.id == notification_record_id,
            models.notification.NotificationRecord.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def search_notification_sources_for_user_async(
    db: AsyncSession,
    user_id: int,
    keyword: str | None = None,
    start: int | None = None,
    limit: int | None = None,
):
    stmt = _search_notification_sources_stmt(user_id=user_id, keyword=keyword)
    if start is not None:
        stmt = stmt.where(models.notification.NotificationSource.id <= start)
    if limit is not None:
        stmt = stmt.limit(limit)
    return (await db.execute(stmt)).all()


async def search_next_notification_source_for_user_async(
    db: AsyncSession,
    user_id: int,
    notification_source: models.notification.NotificationSource,
    keyword: str | None = None,
):
    stmt = _search_notification_sources_stmt(user_id=user_id, keyword=keyword).where(
        models.notification.NotificationSource.id < notification_source.id
    ).limit(1)
    return (await db.execute(stmt)).first()


async def count_all_notification_sources_for_user_async(
    db: AsyncSession,
    user_id: int,
    keyword: str | None = None,
):
    stmt = (
        select(func.count(models.notification.NotificationSource.id))
        .outerjoin(
            models.notification.UserNotificationSource,
            and_(
                models.notification.UserNotificationSource.notification_source_id == models.notification.NotificationSource.id,
                models.notification.UserNotificationSource.user_id == user_id,
                models.notification.UserNotificationSource.delete_at.is_(None),
            ),
        )
        .where(
            models.notification.NotificationSource.delete_at.is_(None),
            or_(
                models.notification.NotificationSource.creator_id == user_id,
                models.notification.NotificationSource.is_public.is_(True),
            ),
        )
    )
    if keyword:
        stmt = stmt.where(models.notification.NotificationSource.title.ilike(f"%{keyword}%"))
    return (await db.execute(stmt)).scalar_one()


async def search_notification_targets_for_user_async(
    db: AsyncSession,
    user_id: int,
    keyword: str | None = None,
    start: int | None = None,
    limit: int | None = None,
):
    stmt = _search_notification_targets_stmt(user_id=user_id, keyword=keyword)
    if start is not None:
        stmt = stmt.where(models.notification.NotificationTarget.id <= start)
    if limit is not None:
        stmt = stmt.limit(limit)
    return (await db.execute(stmt)).all()


async def search_next_notification_target_for_user_async(
    db: AsyncSession,
    user_id: int,
    notification_target: models.notification.NotificationTarget,
    keyword: str | None = None,
):
    stmt = _search_notification_targets_stmt(user_id=user_id, keyword=keyword).where(
        models.notification.NotificationTarget.id < notification_target.id
    ).limit(1)
    return (await db.execute(stmt)).first()


async def count_all_notification_targets_for_user_async(
    db: AsyncSession,
    user_id: int,
    keyword: str | None = None,
):
    stmt = (
        select(func.count(models.notification.NotificationTarget.id))
        .outerjoin(
            models.notification.UserNotificationTarget,
            and_(
                models.notification.UserNotificationTarget.notification_target_id == models.notification.NotificationTarget.id,
                models.notification.UserNotificationTarget.user_id == user_id,
                models.notification.UserNotificationTarget.delete_at.is_(None),
            ),
        )
        .where(
            models.notification.NotificationTarget.delete_at.is_(None),
            or_(
                models.notification.NotificationTarget.creator_id == user_id,
                models.notification.NotificationTarget.is_public.is_(True),
            ),
        )
    )
    if keyword:
        stmt = stmt.where(models.notification.NotificationTarget.title.ilike(f"%{keyword}%"))
    return (await db.execute(stmt)).scalar_one()


async def delete_notification_tasks_async(
    db: AsyncSession,
    user_id: int,
    notification_task_ids: list[int],
):
    if not notification_task_ids:
        return
    now = datetime.now(timezone.utc)
    await db.execute(
        update(models.notification.NotificationTask)
        .where(
            models.notification.NotificationTask.id.in_(notification_task_ids),
            models.notification.NotificationTask.creator_id == user_id,
            models.notification.NotificationTask.delete_at.is_(None),
        )
        .values(delete_at=now)
    )
    await db.flush()


async def delete_notification_task_content_template_by_notification_task_id_async(
    db: AsyncSession,
    user_id: int,
    notification_task_id: int,
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(models.notification.NotificationTaskContentTemplate)
        .join(models.notification.NotificationTask)
        .where(
            models.notification.NotificationTaskContentTemplate.notification_task_id == notification_task_id,
            models.notification.NotificationTask.creator_id == user_id,
            models.notification.NotificationTaskContentTemplate.delete_at.is_(None),
        )
    )
    db_notification_task_content_template = (await db.execute(stmt)).scalar_one_or_none()
    if db_notification_task_content_template is not None:
        db_notification_task_content_template.delete_at = now
        await db.flush()


async def delete_notification_task_content_custom_by_notification_task_id_async(
    db: AsyncSession,
    user_id: int,
    notification_task_id: int,
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(models.notification.NotificationTaskContentCustom)
        .join(models.notification.NotificationTask)
        .where(
            models.notification.NotificationTaskContentCustom.notification_task_id == notification_task_id,
            models.notification.NotificationTask.creator_id == user_id,
            models.notification.NotificationTaskContentCustom.delete_at.is_(None),
        )
    )
    db_notification_task_content_custom = (await db.execute(stmt)).scalar_one_or_none()
    if db_notification_task_content_custom is not None:
        db_notification_task_content_custom.delete_at = now
        await db.flush()


async def search_notification_records_for_receiver_async(
    db: AsyncSession,
    user_id: int,
    start: int | None = None,
    limit: int = 10,
    keyword: str | None = None,
):
    stmt = (
        select(models.notification.NotificationRecord)
        .options(
            joinedload(models.notification.NotificationRecord.notification_task).joinedload(
                models.notification.NotificationTask.creator
            )
        )
        .join(
            models.notification.NotificationTask,
            models.notification.NotificationRecord.task_id == models.notification.NotificationTask.id,
        )
        .join(
            models.notification.NotificationTarget,
            models.notification.NotificationTask.notification_target_id == models.notification.NotificationTarget.id,
        )
        .where(
            models.notification.NotificationRecord.delete_at.is_(None),
            models.notification.NotificationTarget.creator_id == user_id,
        )
        .order_by(models.notification.NotificationRecord.id.desc())
        .limit(limit)
    )
    if keyword:
        stmt = stmt.where(
            or_(
                models.notification.NotificationRecord.content.like(f"%{keyword}%"),
                models.notification.NotificationRecord.title.like(f"%{keyword}%"),
            )
        )
    if start is not None:
        stmt = stmt.where(models.notification.NotificationRecord.id <= start)
    return (await db.execute(stmt)).scalars().all()


async def search_next_notification_record_for_receiver_async(
    db: AsyncSession,
    user_id: int,
    notification_record: models.notification.NotificationRecord,
    keyword: str | None = None,
):
    stmt = (
        select(models.notification.NotificationRecord)
        .join(
            models.notification.NotificationTask,
            models.notification.NotificationRecord.task_id == models.notification.NotificationTask.id,
        )
        .join(
            models.notification.NotificationTarget,
            models.notification.NotificationTask.notification_target_id == models.notification.NotificationTarget.id,
        )
        .where(
            models.notification.NotificationRecord.delete_at.is_(None),
            models.notification.NotificationTarget.creator_id == user_id,
            models.notification.NotificationRecord.id < notification_record.id,
        )
        .order_by(models.notification.NotificationRecord.id.desc())
        .limit(1)
    )
    if keyword:
        stmt = stmt.where(models.notification.NotificationRecord.content.like(f"%{keyword}%"))
    return (await db.execute(stmt)).scalar_one_or_none()


async def count_notification_records_for_receiver_async(
    db: AsyncSession,
    user_id: int,
    keyword: str | None = None,
):
    stmt = (
        select(func.count(models.notification.NotificationRecord.id))
        .join(
            models.notification.NotificationTask,
            models.notification.NotificationRecord.task_id == models.notification.NotificationTask.id,
        )
        .join(
            models.notification.NotificationTarget,
            models.notification.NotificationTask.notification_target_id == models.notification.NotificationTarget.id,
        )
        .where(
            models.notification.NotificationRecord.delete_at.is_(None),
            models.notification.NotificationTarget.creator_id == user_id,
        )
    )
    if keyword:
        stmt = stmt.where(
            or_(
                models.notification.NotificationRecord.content.like(f"%{keyword}%"),
                models.notification.NotificationRecord.title.like(f"%{keyword}%"),
            )
        )
    return (await db.execute(stmt)).scalar_one()


async def read_all_notification_records_for_receiver_async(
    db: AsyncSession,
    receiver_id: int,
):
    now = datetime.now(timezone.utc)
    await db.execute(
        update(models.notification.NotificationRecord)
        .where(models.notification.NotificationRecord.id.in_(_accessible_notification_record_ids_stmt(receiver_id=receiver_id)))
        .values(read_at=now)
    )
    await db.flush()


async def read_notification_records_by_notification_record_ids_for_receiver_async(
    db: AsyncSession,
    receiver_id: int,
    notification_record_ids: list[int],
):
    if not notification_record_ids:
        return
    now = datetime.now(timezone.utc)
    await db.execute(
        update(models.notification.NotificationRecord)
        .where(
            models.notification.NotificationRecord.id.in_(
                _accessible_notification_record_ids_stmt(
                    receiver_id=receiver_id,
                    notification_record_ids=notification_record_ids,
                )
            )
        )
        .values(read_at=now)
    )
    await db.flush()


async def unread_notification_records_by_notification_record_ids_for_user_async(
    db: AsyncSession,
    user_id: int,
    notification_record_ids: list[int],
):
    if not notification_record_ids:
        return
    await db.execute(
        update(models.notification.NotificationRecord)
        .where(
            models.notification.NotificationRecord.id.in_(
                _accessible_notification_record_ids_stmt(
                    receiver_id=user_id,
                    notification_record_ids=notification_record_ids,
                )
            )
        )
        .values(read_at=None)
    )
    await db.flush()


async def delete_notification_records_by_notification_record_ids_async(
    db: AsyncSession,
    user_id: int,
    notification_record_ids: list[int],
):
    if not notification_record_ids:
        return
    now = datetime.now(timezone.utc)
    await db.execute(
        update(models.notification.NotificationRecord)
        .where(
            models.notification.NotificationRecord.id.in_(
                _accessible_notification_record_ids_stmt(
                    receiver_id=user_id,
                    notification_record_ids=notification_record_ids,
                )
            )
        )
        .values(delete_at=now)
    )
    await db.flush()
