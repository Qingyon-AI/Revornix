from datetime import date as date_type
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload

import models
from enums.section import SectionDocumentIntegration, UserSectionRole, UserSectionAuthority


def create_publish_section(
    db: Session,
    section_id: int
):
    now = datetime.now(timezone.utc)
    db_publish_section = models.section.PublishSection(section_id=section_id,
                                                       uuid=uuid4().hex,
                                                       create_time=now)
    db.add(db_publish_section)
    db.flush()
    return db_publish_section

async def create_publish_section_async(
    db: AsyncSession,
    section_id: int
):
    now = datetime.now(timezone.utc)
    db_publish_section = models.section.PublishSection(section_id=section_id,
                                                       uuid=uuid4().hex,
                                                       create_time=now)
    db.add(db_publish_section)
    await db.flush()
    return db_publish_section

def create_section_label(
    db: Session,
    user_id: int,
    name: str
):
    now = datetime.now(timezone.utc)
    db_label = models.section.Label(name=name,
                                    user_id=user_id,
                                    create_time=now)
    db.add(db_label)
    db.flush()
    return db_label

async def create_section_label_async(
    db: AsyncSession,
    user_id: int,
    name: str
):
    now = datetime.now(timezone.utc)
    db_label = models.section.Label(name=name,
                                    user_id=user_id,
                                    create_time=now)
    db.add(db_label)
    await db.flush()
    return db_label

def create_section_comment(
    db: Session,
    section_id: int,
    creator_id: int,
    content: str,
    parent_id: int | None = None
):
    now = datetime.now(timezone.utc)
    db_section_comment = models.section.SectionComment(section_id=section_id,
                                                       creator_id=creator_id,
                                                       content=content,
                                                       parent_id=parent_id,
                                                       create_time=now)
    db.add(db_section_comment)
    db.flush()
    return db_section_comment


async def create_section_comment_async(
    db: AsyncSession,
    section_id: int,
    creator_id: int,
    content: str,
    parent_id: int | None = None,
):
    now = datetime.now(timezone.utc)
    db_section_comment = models.section.SectionComment(
        section_id=section_id,
        creator_id=creator_id,
        content=content,
        parent_id=parent_id,
        create_time=now,
    )
    db.add(db_section_comment)
    await db.flush()
    return db_section_comment

async def get_section_comment_by_id_async(
    db: AsyncSession,
    comment_id: int,
):
    stmt = (
        select(models.section.SectionComment)
        .where(
            models.section.SectionComment.id == comment_id,
            models.section.SectionComment.delete_at.is_(None),
        )
        .options(selectinload(models.section.SectionComment.creator))
    )
    return (await db.execute(stmt)).scalars().first()

def create_section_user(
    db: Session,
    section_id: int,
    user_id: int,
    role: int,
    authority: UserSectionAuthority,
    expire_time: datetime | None = None
):
    now = datetime.now(timezone.utc)
    db_section_user = models.section.SectionUser(section_id=section_id,
                                                 user_id=user_id,
                                                 role=role,
                                                 authority=authority,
                                                 create_time=now,
                                                 expire_time=expire_time)
    db.add(db_section_user)
    db.flush()
    return db_section_user

async def create_section_user_async(
    db: AsyncSession,
    section_id: int,
    user_id: int,
    role: int,
    authority: UserSectionAuthority,
    expire_time: datetime | None = None
):
    now = datetime.now(timezone.utc)
    db_section_user = models.section.SectionUser(section_id=section_id,
                                                 user_id=user_id,
                                                 role=role,
                                                 authority=authority,
                                                 create_time=now,
                                                 expire_time=expire_time)
    db.add(db_section_user)
    await db.flush()
    return db_section_user

def create_section(
    db: Session,
    creator_id: int,
    title: str,
    cover: str | None = None,
    description: str | None = None,
    md_file_name: str | None = None,
    auto_podcast: bool = False,
    auto_illustration: bool = False
):
    now = datetime.now(timezone.utc)
    db_section = models.section.Section(title=title,
                                        creator_id=creator_id,
                                        cover=cover,
                                        description=description,
                                        auto_podcast=auto_podcast,
                                        auto_illustration=auto_illustration,
                                        md_file_name=md_file_name,
                                        create_time=now)
    db.add(db_section)
    db.flush()
    return db_section

async def create_section_async(
    db: AsyncSession,
    creator_id: int,
    title: str,
    cover: str | None = None,
    description: str | None = None,
    md_file_name: str | None = None,
    auto_podcast: bool = False,
    auto_illustration: bool = False
):
    now = datetime.now(timezone.utc)
    db_section = models.section.Section(title=title,
                                        creator_id=creator_id,
                                        cover=cover,
                                        description=description,
                                        auto_podcast=auto_podcast,
                                        auto_illustration=auto_illustration,
                                        md_file_name=md_file_name,
                                        create_time=now)
    db.add(db_section)
    await db.flush()
    return db_section

def create_section_labels(
    db: Session,
    section_id: int,
    label_ids: list[int]
):
    now = datetime.now(timezone.utc)
    db_document_labels = [models.section.SectionLabel(section_id=section_id,
                                                      label_id=label_id,
                                                      create_time=now) for label_id in label_ids]
    db.add_all(db_document_labels)
    db.flush()
    return db_document_labels

async def create_section_labels_async(
    db: AsyncSession,
    section_id: int,
    label_ids: list[int]
):
    now = datetime.now(timezone.utc)
    db_document_labels = [models.section.SectionLabel(section_id=section_id,
                                                      label_id=label_id,
                                                      create_time=now) for label_id in label_ids]
    db.add_all(db_document_labels)
    await db.flush()
    return db_document_labels

def create_or_update_section_document(
    db: Session,
    section_id: int,
    document_id: int,
    status: SectionDocumentIntegration = SectionDocumentIntegration.WAIT_TO
):
    now = datetime.now(timezone.utc)
    db_section_document = db.query(models.section.SectionDocument).filter_by(section_id=section_id,
                                                                             document_id=document_id).one_or_none()
    if db_section_document is None:
        db_section_document = models.section.SectionDocument(section_id=section_id,
                                                             document_id=document_id,
                                                             create_time=now,
                                                             status=status)
        db.add(db_section_document)
    else:
        db_section_document.status = status
        db_section_document.update_time = now
    db.flush()
    return db_section_document

async def create_or_update_section_document_async(
    db: AsyncSession,
    section_id: int,
    document_id: int,
    status: SectionDocumentIntegration = SectionDocumentIntegration.WAIT_TO
):
    now = datetime.now(timezone.utc)
    stmt = select(models.section.SectionDocument).where(
        models.section.SectionDocument.section_id == section_id,
        models.section.SectionDocument.document_id == document_id,
    )
    db_section_document = (await db.execute(stmt)).scalar_one_or_none()
    if db_section_document is None:
        db_section_document = models.section.SectionDocument(section_id=section_id,
                                                             document_id=document_id,
                                                             create_time=now,
                                                             status=status)
        db.add(db_section_document)
    else:
        db_section_document.status = status
        db_section_document.update_time = now
    await db.flush()
    return db_section_document

def create_date_section(
    db: Session,
    section_id: int,
    date: date_type
):
    now = datetime.now(timezone.utc)
    db_day_section = models.section.DaySection(date=date,
                                               section_id=section_id,
                                               create_time=now)
    db.add(db_day_section)
    db.flush()
    return db_day_section

async def create_date_section_async(
    db: AsyncSession,
    section_id: int,
    date: date_type
):
    now = datetime.now(timezone.utc)
    db_day_section = models.section.DaySection(date=date,
                                               section_id=section_id,
                                               create_time=now)
    db.add(db_day_section)
    await db.flush()
    return db_day_section

def get_sections_by_user_id(
    db: Session,
    user_id: int
):
    query = db.query(models.section.Section)
    query = query.filter(
        models.section.Section.delete_at.is_(None),
        models.section.Section.creator_id == user_id
    )
    return query.all()

async def get_sections_by_user_id_async(
    db: AsyncSession,
    user_id: int
):
    stmt = select(models.section.Section).where(
        models.section.Section.delete_at.is_(None),
        models.section.Section.creator_id == user_id,
    )
    return list((await db.execute(stmt)).scalars().all())

def get_user_labels_by_user_id(
    db: Session,
    user_id: int
):
    query = db.query(models.section.Label)
    query = query.filter(models.section.Label.delete_at.is_(None),
                         models.section.Label.user_id == user_id)
    return query.all()

async def get_user_labels_by_user_id_async(
    db: AsyncSession,
    user_id: int
):
    result = await db.execute(
        select(models.section.Label).where(
            models.section.Label.delete_at.is_(None),
            models.section.Label.user_id == user_id,
        )
    )
    return result.scalars().all()

def get_sections_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.document_id == document_id,
                         models.section.SectionDocument.delete_at.is_(None))
    query = query.filter(models.section.Section.delete_at.is_(None))
    query = query.order_by(models.section.Section.update_time.desc())
    return query.all()

async def get_sections_by_document_id_async(
    db: AsyncSession,
    document_id: int
):
    stmt = (
        select(models.section.Section)
        .join(models.section.SectionDocument)
        .where(
            models.section.SectionDocument.document_id == document_id,
            models.section.SectionDocument.delete_at.is_(None),
            models.section.Section.delete_at.is_(None),
        )
        .order_by(models.section.Section.update_time.desc())
    )
    return list((await db.execute(stmt)).scalars().all())

def get_user_sections(
    db: Session,
    user_id: int,
    filter_roles: list[UserSectionRole] | None = None
):
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionUser)
    query = query.filter(models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at.is_(None))
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    query = query.filter(models.section.Section.delete_at.is_(None))
    query = query.order_by(models.section.Section.create_time.desc())
    return query.all()


async def get_user_sections_async(
    db: AsyncSession,
    user_id: int,
    filter_roles: list[UserSectionRole] | None = None,
):
    stmt = (
        select(models.section.Section)
        .join(models.section.SectionUser)
        .where(
            models.section.SectionUser.user_id == user_id,
            models.section.SectionUser.delete_at.is_(None),
            models.section.Section.delete_at.is_(None),
        )
        .order_by(models.section.Section.create_time.desc())
    )
    if filter_roles is not None:
        stmt = stmt.where(models.section.SectionUser.role.in_(filter_roles))
    return list((await db.execute(stmt)).scalars().all())

def get_publish_section_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.section.PublishSection)
    query = query.filter(models.section.PublishSection.section_id == section_id,
                         models.section.PublishSection.delete_at.is_(None))
    return query.one_or_none()


async def get_publish_section_by_section_id_async(
    db: AsyncSession,
    section_id: int,
):
    stmt = select(models.section.PublishSection).where(
        models.section.PublishSection.section_id == section_id,
        models.section.PublishSection.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def get_publish_sections_by_section_ids(
    db: Session,
    section_ids: list[int],
):
    if len(section_ids) == 0:
        return []
    query = db.query(models.section.PublishSection)
    query = query.filter(
        models.section.PublishSection.section_id.in_(section_ids),
        models.section.PublishSection.delete_at.is_(None),
    )
    return query.all()

async def get_publish_sections_by_section_ids_async(
    db: AsyncSession,
    section_ids: list[int],
):
    if len(section_ids) == 0:
        return []
    stmt = select(models.section.PublishSection).where(
        models.section.PublishSection.section_id.in_(section_ids),
        models.section.PublishSection.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())

def get_publish_sections_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.section.PublishSection)
    query = query.filter(models.section.PublishSection.uuid == uuid,
                         models.section.PublishSection.delete_at.is_(None))
    return query.one_or_none()


async def get_publish_sections_by_uuid_async(
    db: AsyncSession,
    uuid: str,
):
    stmt = select(models.section.PublishSection).where(
        models.section.PublishSection.uuid == uuid,
        models.section.PublishSection.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def search_user_sections(
    db: Session,
    user_id: int,
    start: int | None = None,
    limit: int = 10,
    keyword: str | None = None,
    label_ids: list[int] | None = None,
    only_published: bool = False,
    desc: bool = True
):
    query = db.query(models.section.Section)
    query = query.filter(models.section.Section.delete_at.is_(None))
    query = query.join(models.section.SectionUser)
    query = query.filter(models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at.is_(None),
                         models.section.SectionUser.role.in_([
                             UserSectionRole.CREATOR,
                             UserSectionRole.MEMBER
                            ])
                         )
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if only_published:
        query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
        query = query.filter(models.section.PublishSection.delete_at.is_(None))
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at.is_(None))
    if desc:
        query = query.order_by(models.section.Section.id.desc())
    else:
        query = query.order_by(models.section.Section.id.asc())
    if start is not None:
        if desc:
            query = query.filter(models.section.Section.id <= start)
        else:
            query = query.filter(models.section.Section.id >= start)
    query = query.options(selectinload(models.section.Section.creator))
    query = query.distinct(models.section.Section.id)
    query = query.limit(limit)
    return query.all()


async def search_user_sections_async(
    db: AsyncSession,
    user_id: int,
    start: int | None = None,
    limit: int = 10,
    keyword: str | None = None,
    label_ids: list[int] | None = None,
    only_published: bool = False,
    desc: bool = True,
):
    stmt = (
        select(models.section.Section)
        .join(models.section.SectionUser)
        .where(
            models.section.Section.delete_at.is_(None),
            models.section.SectionUser.user_id == user_id,
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.role.in_([
                UserSectionRole.CREATOR,
                UserSectionRole.MEMBER,
            ]),
        )
        .options(selectinload(models.section.Section.creator))
        .distinct(models.section.Section.id)
        .limit(limit)
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%'),
            )
        )
    if only_published:
        stmt = stmt.join(
            models.section.PublishSection,
            models.section.PublishSection.section_id == models.section.Section.id,
        ).where(models.section.PublishSection.delete_at.is_(None))
    if label_ids is not None:
        stmt = stmt.join(models.section.SectionLabel).where(
            models.section.SectionLabel.label_id.in_(label_ids),
            models.section.SectionLabel.delete_at.is_(None),
        )
    if start is not None:
        stmt = stmt.where(
            models.section.Section.id <= start if desc else models.section.Section.id >= start
        )
    stmt = stmt.order_by(
        models.section.Section.id.desc() if desc else models.section.Section.id.asc()
    )
    return list((await db.execute(stmt)).scalars().all())

def count_user_sections(
    db: Session,
    user_id: int,
    keyword: str | None = None,
    label_ids: list[int] | None = None,
    only_published: bool = False
):
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionUser)
    query = query.filter(
        models.section.SectionUser.user_id == user_id,
        models.section.SectionUser.delete_at.is_(None),
        models.section.SectionUser.role.in_([UserSectionRole.CREATOR, UserSectionRole.MEMBER]),
    )
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if only_published:
        query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
        query = query.filter(models.section.PublishSection.delete_at.is_(None))
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at.is_(None))
    query = query.distinct(models.section.Section.id)
    return query.count()


async def count_user_sections_async(
    db: AsyncSession,
    user_id: int,
    keyword: str | None = None,
    label_ids: list[int] | None = None,
    only_published: bool = False,
):
    stmt = (
        select(func.count(func.distinct(models.section.Section.id)))
        .select_from(models.section.Section)
        .join(models.section.SectionUser)
        .where(
            models.section.SectionUser.user_id == user_id,
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.role.in_([UserSectionRole.CREATOR, UserSectionRole.MEMBER]),
        )
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%'),
            )
        )
    if only_published:
        stmt = stmt.join(
            models.section.PublishSection,
            models.section.PublishSection.section_id == models.section.Section.id,
        ).where(models.section.PublishSection.delete_at.is_(None))
    if label_ids is not None:
        stmt = stmt.join(models.section.SectionLabel).where(
            models.section.SectionLabel.label_id.in_(label_ids),
            models.section.SectionLabel.delete_at.is_(None),
        )
    return (await db.execute(stmt)).scalar_one()

def search_next_user_section(
    db: Session,
    user_id: int,
    section: models.section.Section,
    keyword: str | None = None,
    label_ids: list[int] | None = None,
    only_published: bool = False,
    desc: bool = True
):
    query = db.query(models.section.Section)
    query = query.filter(models.section.Section.delete_at.is_(None))
    query = query.join(models.section.SectionUser)
    query = query.filter(
        models.section.SectionUser.user_id == user_id,
        models.section.SectionUser.delete_at.is_(None),
        models.section.SectionUser.role.in_([UserSectionRole.CREATOR, UserSectionRole.MEMBER]),
    )
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if only_published:
        query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
        query = query.filter(models.section.PublishSection.delete_at.is_(None))
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at.is_(None))
    if desc:
        query = query.order_by(models.section.Section.id.desc())
        query = query.filter(models.section.Section.id < section.id)
    else:
        query = query.order_by(models.section.Section.id.asc())
        query = query.filter(models.section.Section.id > section.id)
    query = query.distinct(models.section.Section.id)
    return query.first()


async def search_next_user_section_async(
    db: AsyncSession,
    user_id: int,
    section: models.section.Section,
    keyword: str | None = None,
    label_ids: list[int] | None = None,
    only_published: bool = False,
    desc: bool = True,
):
    stmt = (
        select(models.section.Section)
        .join(models.section.SectionUser)
        .where(
            models.section.Section.delete_at.is_(None),
            models.section.SectionUser.user_id == user_id,
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.role.in_([UserSectionRole.CREATOR, UserSectionRole.MEMBER]),
        )
        .distinct(models.section.Section.id)
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%'),
            )
        )
    if only_published:
        stmt = stmt.join(
            models.section.PublishSection,
            models.section.PublishSection.section_id == models.section.Section.id,
        ).where(models.section.PublishSection.delete_at.is_(None))
    if label_ids is not None:
        stmt = stmt.join(models.section.SectionLabel).where(
            models.section.SectionLabel.label_id.in_(label_ids),
            models.section.SectionLabel.delete_at.is_(None),
        )
    if desc:
        stmt = stmt.where(models.section.Section.id < section.id).order_by(models.section.Section.id.desc())
    else:
        stmt = stmt.where(models.section.Section.id > section.id).order_by(models.section.Section.id.asc())
    stmt = stmt.distinct(models.section.Section.id)
    stmt = stmt.limit(1)
    return (await db.execute(stmt)).scalar_one_or_none()

def search_user_subscribed_sections(
    db: Session,
    user_id: int,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    keyword: str | None = None,
    desc: bool = True
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionUser)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at.is_(None))
    query = query.filter(models.section.Section.delete_at.is_(None),
                         models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at.is_(None),
                         models.section.SectionUser.role == UserSectionRole.SUBSCRIBER)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time.is_(None)))
    if desc:
        query = query.order_by(models.section.Section.id.desc())
    else:
        query = query.order_by(models.section.Section.id.asc())
    if start is not None:
        if desc:
            query = query.filter(models.section.Section.id <= start)
        else:
            query = query.filter(models.section.Section.id >= start)
    query = query.distinct(models.section.Section.id)
    query = query.limit(limit)
    return query.all()


async def search_user_subscribed_sections_async(
    db: AsyncSession,
    user_id: int,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    keyword: str | None = None,
    desc: bool = True,
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(models.section.Section)
        .join(models.section.SectionUser)
        .where(
            models.section.Section.delete_at.is_(None),
            models.section.SectionUser.user_id == user_id,
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.role == UserSectionRole.SUBSCRIBER,
            or_(
                models.section.SectionUser.expire_time > now,
                models.section.SectionUser.expire_time.is_(None),
            ),
        )
        .distinct(models.section.Section.id)
        .limit(limit)
        .options(selectinload(models.section.Section.creator))
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%'),
            )
        )
    if label_ids is not None:
        stmt = stmt.join(models.section.SectionLabel).where(
            models.section.SectionLabel.label_id.in_(label_ids),
            models.section.SectionLabel.delete_at.is_(None),
        )
    if start is not None:
        stmt = stmt.where(
            models.section.Section.id <= start if desc else models.section.Section.id >= start
        )
    stmt = stmt.order_by(
        models.section.Section.id.desc() if desc else models.section.Section.id.asc()
    )
    return list((await db.execute(stmt)).scalars().all())

def count_user_subscribed_sections(
    db: Session,
    user_id: int,
    label_ids: list[int] | None = None,
    keyword: str | None = None
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionUser)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at.is_(None))
    query = query.filter(models.section.Section.delete_at.is_(None),
                         models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at.is_(None),
                         models.section.SectionUser.role == UserSectionRole.SUBSCRIBER)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time.is_(None)))
    query = query.distinct(models.section.Section.id)
    return query.count()


async def count_user_subscribed_sections_async(
    db: AsyncSession,
    user_id: int,
    label_ids: list[int] | None = None,
    keyword: str | None = None,
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(func.count(func.distinct(models.section.Section.id)))
        .select_from(models.section.Section)
        .join(models.section.SectionUser)
        .where(
            models.section.Section.delete_at.is_(None),
            models.section.SectionUser.user_id == user_id,
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.role == UserSectionRole.SUBSCRIBER,
            or_(
                models.section.SectionUser.expire_time > now,
                models.section.SectionUser.expire_time.is_(None),
            ),
        )
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%'),
            )
        )
    if label_ids is not None:
        stmt = stmt.join(models.section.SectionLabel).where(
            models.section.SectionLabel.label_id.in_(label_ids),
            models.section.SectionLabel.delete_at.is_(None),
        )
    return (await db.execute(stmt)).scalar_one()

def search_next_user_subscribed_section(
    db: Session,
    user_id: int,
    section: models.section.Section,
    label_ids: list[int] | None = None,
    keyword: str | None = None,
    desc: bool = True
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionUser)
    query = query.filter(models.section.Section.delete_at.is_(None),
                         models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at.is_(None),
                         models.section.SectionUser.role == UserSectionRole.SUBSCRIBER)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time.is_(None)))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at.is_(None))
    if desc:
        query = query.order_by(models.section.Section.id.desc())
        query = query.filter(models.section.Section.id < section.id)
    else:
        query = query.order_by(models.section.Section.id.asc())
        query = query.filter(models.section.Section.id > section.id)
    return query.first()


async def search_next_user_subscribed_section_async(
    db: AsyncSession,
    user_id: int,
    section: models.section.Section,
    label_ids: list[int] | None = None,
    keyword: str | None = None,
    desc: bool = True,
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(models.section.Section)
        .join(models.section.SectionUser)
        .where(
            models.section.Section.delete_at.is_(None),
            models.section.SectionUser.user_id == user_id,
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.role == UserSectionRole.SUBSCRIBER,
            or_(
                models.section.SectionUser.expire_time > now,
                models.section.SectionUser.expire_time.is_(None),
            ),
        )
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%'),
            )
        )
    if label_ids is not None:
        stmt = stmt.join(models.section.SectionLabel).where(
            models.section.SectionLabel.label_id.in_(label_ids),
            models.section.SectionLabel.delete_at.is_(None),
        )
    if desc:
        stmt = stmt.where(models.section.Section.id < section.id).order_by(models.section.Section.id.desc())
    else:
        stmt = stmt.where(models.section.Section.id > section.id).order_by(models.section.Section.id.asc())
    stmt = stmt.distinct(models.section.Section.id)
    stmt = stmt.limit(1)
    return (await db.execute(stmt)).scalar_one_or_none()

def search_parent_degree_section_comments(
    db: Session,
    section_id: int,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10
):
    query = db.query(models.section.SectionComment)
    query = query.filter(models.section.SectionComment.delete_at.is_(None),
                         models.section.SectionComment.section_id == section_id,
                         models.section.SectionComment.parent_id.is_(None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.section.SectionComment.content.like(f"%{keyword}%"))
    query = query.order_by(models.section.SectionComment.id.desc())
    if start is not None:
        query = query.filter(models.section.SectionComment.id <= start)
    query = query.options(selectinload(models.section.SectionComment.creator))
    query = query.limit(limit)
    return query.all()


async def search_parent_degree_section_comments_async(
    db: AsyncSession,
    section_id: int,
    keyword: str | None = None,
    start: int | None = None,
    limit: int = 10,
):
    stmt = (
        select(models.section.SectionComment)
        .where(
            models.section.SectionComment.delete_at.is_(None),
            models.section.SectionComment.section_id == section_id,
            models.section.SectionComment.parent_id.is_(None),
        )
        .order_by(models.section.SectionComment.id.desc())
        .options(selectinload(models.section.SectionComment.creator))
        .limit(limit)
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(models.section.SectionComment.content.like(f"%{keyword}%"))
    if start is not None:
        stmt = stmt.where(models.section.SectionComment.id <= start)
    return list((await db.execute(stmt)).scalars().all())

def count_parent_degree_section_comments(
    db: Session,
    section_id: int,
    keyword: str | None = None
):
    query = db.query(models.section.SectionComment)
    query = query.filter(models.section.SectionComment.delete_at.is_(None),
                         models.section.SectionComment.section_id == section_id,
                         models.section.SectionComment.parent_id.is_(None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.section.SectionComment.content.like(f"%{keyword}%"))
    query = query.distinct(models.section.SectionComment.id)
    return query.count()


async def count_parent_degree_section_comments_async(
    db: AsyncSession,
    section_id: int,
    keyword: str | None = None,
):
    stmt = select(func.count(func.distinct(models.section.SectionComment.id))).where(
        models.section.SectionComment.delete_at.is_(None),
        models.section.SectionComment.section_id == section_id,
        models.section.SectionComment.parent_id.is_(None),
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(models.section.SectionComment.content.like(f"%{keyword}%"))
    return (await db.execute(stmt)).scalar_one()

def search_next_parent_degree_section_comment(
    db: Session,
    section_id: int,
    section_comment: models.section.SectionComment,
    keyword: str | None = None
):
    query = db.query(models.section.SectionComment)
    query = query.filter(models.section.SectionComment.delete_at.is_(None),
                         models.section.SectionComment.section_id == section_id)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.section.SectionComment.content.like(f"%{keyword}%"))
    query = query.order_by(models.section.SectionComment.id.desc())
    query = query.filter(models.section.SectionComment.id < section_comment.id)
    return query.first()


async def search_next_parent_degree_section_comment_async(
    db: AsyncSession,
    section_id: int,
    section_comment: models.section.SectionComment,
    keyword: str | None = None,
):
    stmt = (
        select(models.section.SectionComment)
        .where(
            models.section.SectionComment.delete_at.is_(None),
            models.section.SectionComment.section_id == section_id,
            models.section.SectionComment.id < section_comment.id,
        )
        .order_by(models.section.SectionComment.id.desc())
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(models.section.SectionComment.content.like(f"%{keyword}%"))
    return (await db.execute(stmt)).scalar_one_or_none()

def search_published_sections(
    db: Session,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    keyword: str | None = None,
    desc: bool = True
):
    query = db.query(models.section.Section)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at.is_(None))
    query = query.filter(models.section.Section.delete_at.is_(None))
    query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
    query = query.filter(models.section.PublishSection.delete_at.is_(None))
    if desc:
        query = query.order_by(models.section.Section.id.desc())
    else:
        query = query.order_by(models.section.Section.id.asc())
    if start is not None:
        if desc:
            query = query.filter(models.section.Section.id <= start)
        else:
            query = query.filter(models.section.Section.id >= start)
    query = query.options(selectinload(models.section.Section.creator))
    query = query.distinct(models.section.Section.id)
    query = query.limit(limit)
    return query.all()


async def search_published_sections_async(
    db: AsyncSession,
    start: int | None = None,
    limit: int = 10,
    label_ids: list[int] | None = None,
    keyword: str | None = None,
    desc: bool = True,
):
    stmt = (
        select(models.section.Section)
        .join(
            models.section.PublishSection,
            models.section.PublishSection.section_id == models.section.Section.id,
        )
        .where(
            models.section.Section.delete_at.is_(None),
            models.section.PublishSection.delete_at.is_(None),
        )
        .options(selectinload(models.section.Section.creator))
        .distinct(models.section.Section.id)
        .limit(limit)
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%'),
            )
        )
    if label_ids is not None:
        stmt = stmt.join(models.section.SectionLabel).where(
            models.section.SectionLabel.label_id.in_(label_ids),
            models.section.SectionLabel.delete_at.is_(None),
        )
    if start is not None:
        stmt = stmt.where(
            models.section.Section.id <= start if desc else models.section.Section.id >= start
        )
    stmt = stmt.order_by(
        models.section.Section.id.desc() if desc else models.section.Section.id.asc()
    )
    return list((await db.execute(stmt)).scalars().all())

def count_published_sections(
    db: Session,
    keyword: str | None = None,
    label_ids: list[int] | None = None
):
    query = db.query(models.section.Section)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at.is_(None))
    query = query.filter(models.section.Section.delete_at.is_(None))
    query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
    query = query.filter(models.section.PublishSection.delete_at.is_(None))
    query = query.distinct(models.section.Section.id)
    return query.count()


async def count_published_sections_async(
    db: AsyncSession,
    keyword: str | None = None,
    label_ids: list[int] | None = None,
):
    stmt = (
        select(func.count(func.distinct(models.section.Section.id)))
        .select_from(models.section.Section)
        .join(
            models.section.PublishSection,
            models.section.PublishSection.section_id == models.section.Section.id,
        )
        .where(
            models.section.Section.delete_at.is_(None),
            models.section.PublishSection.delete_at.is_(None),
        )
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%'),
            )
        )
    if label_ids is not None:
        stmt = stmt.join(models.section.SectionLabel).where(
            models.section.SectionLabel.label_id.in_(label_ids),
            models.section.SectionLabel.delete_at.is_(None),
        )
    return (await db.execute(stmt)).scalar_one()

def search_next_published_section(
    db: Session,
    section: models.section.Section,
    keyword: str | None = None,
    label_ids: list[int] | None = None,
    desc: bool = True
):
    query = db.query(models.section.Section)
    query = query.filter(models.section.Section.delete_at.is_(None))
    query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
    query = query.filter(models.section.PublishSection.delete_at.is_(None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at.is_(None))
    if desc:
        query = query.order_by(models.section.Section.id.desc())
        query = query.filter(models.section.Section.id < section.id)
    else:
        query = query.order_by(models.section.Section.id.asc())
        query = query.filter(models.section.Section.id > section.id)
    return query.first()


async def search_next_published_section_async(
    db: AsyncSession,
    section: models.section.Section,
    keyword: str | None = None,
    label_ids: list[int] | None = None,
    desc: bool = True,
):
    stmt = (
        select(models.section.Section)
        .join(
            models.section.PublishSection,
            models.section.PublishSection.section_id == models.section.Section.id,
        )
        .where(
            models.section.Section.delete_at.is_(None),
            models.section.PublishSection.delete_at.is_(None),
        )
    )
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%'),
            )
        )
    if label_ids is not None:
        stmt = stmt.join(models.section.SectionLabel).where(
            models.section.SectionLabel.label_id.in_(label_ids),
            models.section.SectionLabel.delete_at.is_(None),
        )
    if desc:
        stmt = stmt.where(models.section.Section.id < section.id).order_by(models.section.Section.id.desc())
    else:
        stmt = stmt.where(models.section.Section.id > section.id).order_by(models.section.Section.id.asc())
    stmt = stmt.distinct(models.section.Section.id)
    stmt = stmt.limit(1)
    return (await db.execute(stmt)).scalar_one_or_none()

def count_documents_for_section_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.document.Document)
    query = query.join(models.section.SectionDocument)
    query = query.filter(models.document.Document.delete_at.is_(None),
                         models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.delete_at.is_(None))
    query = query.distinct(models.document.Document.id)
    return query.count()


async def count_documents_for_section_by_section_id_async(
    db: AsyncSession,
    section_id: int,
):
    stmt = (
        select(func.count(func.distinct(models.document.Document.id)))
        .select_from(models.document.Document)
        .join(models.section.SectionDocument)
        .where(
            models.document.Document.delete_at.is_(None),
            models.section.SectionDocument.section_id == section_id,
            models.section.SectionDocument.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).scalar_one()

def count_documents_for_section_by_section_ids(
    db: Session,
    section_ids: list[int]
):
    if not section_ids:
        return {}
    query = db.query(
        models.section.SectionDocument.section_id,
        func.count(func.distinct(models.section.SectionDocument.document_id)),
    )
    query = query.join(
        models.document.Document,
        models.document.Document.id == models.section.SectionDocument.document_id,
    )
    query = query.filter(
        models.section.SectionDocument.section_id.in_(section_ids),
        models.section.SectionDocument.delete_at.is_(None),
        models.document.Document.delete_at.is_(None),
    )
    query = query.group_by(models.section.SectionDocument.section_id)
    return {section_id: count for section_id, count in query.all()}


async def count_documents_for_section_by_section_ids_async(
    db: AsyncSession,
    section_ids: list[int],
):
    if not section_ids:
        return {}
    stmt = (
        select(
            models.section.SectionDocument.section_id,
            func.count(func.distinct(models.section.SectionDocument.document_id)),
        )
        .join(
            models.document.Document,
            models.document.Document.id == models.section.SectionDocument.document_id,
        )
        .where(
            models.section.SectionDocument.section_id.in_(section_ids),
            models.section.SectionDocument.delete_at.is_(None),
            models.document.Document.delete_at.is_(None),
        )
        .group_by(models.section.SectionDocument.section_id)
    )
    return {section_id: count for section_id, count in (await db.execute(stmt)).all()}

def search_users_and_section_users_by_section_id(
    db: Session,
    section_id: int,
    filter_roles: list[UserSectionRole] | None = None,
    start: int | None = None,
    limit: int = 10,
    keyword: str | None = None
):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.User, models.section.SectionUser)
    query = query.filter(models.section.SectionUser.delete_at.is_(None),
                         models.section.SectionUser.section_id == section_id)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time.is_(None)))
    query = query.join(models.user.User)
    query = query.filter(models.user.User.delete_at.is_(None))
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    query = query.order_by(models.section.SectionUser.section_id.desc())
    if start is not None:
        query = query.filter(models.user.User.id <= start)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.user.User.nickname.like(f'%{keyword}%'))
    query = query.limit(limit)
    return query.all()

async def search_users_and_section_users_by_section_id_async(
    db: AsyncSession,
    section_id: int,
    filter_roles: list[UserSectionRole] | None = None,
    start: int | None = None,
    limit: int = 10,
    keyword: str | None = None
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(models.user.User, models.section.SectionUser)
        .join(models.user.User)
        .where(
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.section_id == section_id,
            or_(
                models.section.SectionUser.expire_time > now,
                models.section.SectionUser.expire_time.is_(None),
            ),
            models.user.User.delete_at.is_(None),
        )
        .order_by(models.section.SectionUser.section_id.desc())
        .limit(limit)
    )
    if filter_roles is not None:
        stmt = stmt.where(models.section.SectionUser.role.in_(filter_roles))
    if start is not None:
        stmt = stmt.where(models.user.User.id <= start)
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(models.user.User.nickname.like(f'%{keyword}%'))
    return (await db.execute(stmt)).all()

def search_next_user_and_section_user_by_section_id(
    db: Session,
    section_id: int,
    user: models.user.User,
    filter_roles: list[UserSectionRole] | None = None,
    keyword: str | None = None
):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.User, models.section.SectionUser)
    query = query.filter(models.section.SectionUser.delete_at.is_(None),
                         models.section.SectionUser.section_id == section_id)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time.is_(None)))
    query = query.join(models.user.User)
    query = query.filter(models.user.User.delete_at.is_(None))
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    query = query.order_by(models.section.SectionUser.section_id.desc())
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.user.User.nickname.like(f'%{keyword}%'))
    query = query.filter(models.user.User.id > user.id)
    return query.first()

async def search_next_user_and_section_user_by_section_id_async(
    db: AsyncSession,
    section_id: int,
    user: models.user.User,
    filter_roles: list[UserSectionRole] | None = None,
    keyword: str | None = None
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(models.user.User, models.section.SectionUser)
        .join(models.user.User)
        .where(
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.section_id == section_id,
            or_(
                models.section.SectionUser.expire_time > now,
                models.section.SectionUser.expire_time.is_(None),
            ),
            models.user.User.delete_at.is_(None),
            models.user.User.id > user.id,
        )
        .order_by(models.section.SectionUser.section_id.desc())
    )
    if filter_roles is not None:
        stmt = stmt.where(models.section.SectionUser.role.in_(filter_roles))
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(models.user.User.nickname.like(f'%{keyword}%'))
    return (await db.execute(stmt)).first()

def count_users_and_section_users_by_section_id(
    db: Session,
    section_id: int,
    filter_roles: list[UserSectionRole] | None = None,
    keyword: str | None = None
):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.User, models.section.SectionUser)
    query = query.filter(models.section.SectionUser.delete_at.is_(None),
                         models.section.SectionUser.section_id == section_id)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time.is_(None)))
    query = query.join(models.user.User)
    query = query.filter(models.user.User.delete_at.is_(None))
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.user.User.nickname.like(f'%{keyword}%'))
    return query.count()

async def count_users_and_section_users_by_section_id_async(
    db: AsyncSession,
    section_id: int,
    filter_roles: list[UserSectionRole] | None = None,
    keyword: str | None = None
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(func.count(models.user.User.id))
        .join(models.user.User)
        .where(
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.section_id == section_id,
            or_(
                models.section.SectionUser.expire_time > now,
                models.section.SectionUser.expire_time.is_(None),
            ),
            models.user.User.delete_at.is_(None),
        )
    )
    if filter_roles is not None:
        stmt = stmt.where(models.section.SectionUser.role.in_(filter_roles))
    if keyword is not None and len(keyword) > 0:
        stmt = stmt.where(models.user.User.nickname.like(f'%{keyword}%'))
    return (await db.execute(stmt)).scalar_one()

def get_users_for_section_by_section_id(
    db: Session,
    section_id: int,
    filter_roles: list[UserSectionRole] | None = None
):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.User)
    query = query.join(models.section.SectionUser)
    query = query.filter(models.user.User.delete_at.is_(None),
                         models.section.SectionUser.delete_at.is_(None),
                         models.section.SectionUser.section_id == section_id)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time.is_(None)))
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    return query.all()


async def get_users_for_section_by_section_id_async(
    db: AsyncSession,
    section_id: int,
    filter_roles: list[UserSectionRole] | None = None,
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(models.user.User)
        .join(models.section.SectionUser)
        .where(
            models.user.User.delete_at.is_(None),
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.section_id == section_id,
            or_(
                models.section.SectionUser.expire_time > now,
                models.section.SectionUser.expire_time.is_(None),
            ),
        )
    )
    if filter_roles is not None:
        stmt = stmt.where(models.section.SectionUser.role.in_(filter_roles))
    return list((await db.execute(stmt)).scalars().all())

def count_users_for_section_by_section_id(
    db: Session,
    section_id: int,
    filter_roles: list[UserSectionRole] | None = None
):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.User)
    query = query.join(models.section.SectionUser)
    query = query.filter(models.user.User.delete_at.is_(None),
                         models.section.SectionUser.delete_at.is_(None),
                         models.section.SectionUser.section_id == section_id)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time.is_(None)))
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    return query.count()


async def count_users_for_section_by_section_id_async(
    db: AsyncSession,
    section_id: int,
    filter_roles: list[UserSectionRole] | None = None,
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(func.count(models.user.User.id))
        .select_from(models.user.User)
        .join(models.section.SectionUser)
        .where(
            models.user.User.delete_at.is_(None),
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.section_id == section_id,
            or_(
                models.section.SectionUser.expire_time > now,
                models.section.SectionUser.expire_time.is_(None),
            ),
        )
    )
    if filter_roles is not None:
        stmt = stmt.where(models.section.SectionUser.role.in_(filter_roles))
    return (await db.execute(stmt)).scalar_one()

def count_users_for_section_by_section_ids(
    db: Session,
    section_ids: list[int],
    filter_roles: list[UserSectionRole] | None = None,
):
    if not section_ids:
        return {}
    now = datetime.now(timezone.utc)
    query = db.query(
        models.section.SectionUser.section_id,
        func.count(models.user.User.id),
    )
    query = query.join(models.user.User, models.user.User.id == models.section.SectionUser.user_id)
    query = query.filter(
        models.section.SectionUser.section_id.in_(section_ids),
        models.section.SectionUser.delete_at.is_(None),
        models.user.User.delete_at.is_(None),
    )
    query = query.filter(
        or_(
            models.section.SectionUser.expire_time > now,
            models.section.SectionUser.expire_time.is_(None),
        )
    )
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    query = query.group_by(models.section.SectionUser.section_id)
    return {section_id: count for section_id, count in query.all()}


async def count_users_for_section_by_section_ids_async(
    db: AsyncSession,
    section_ids: list[int],
    filter_roles: list[UserSectionRole] | None = None,
):
    if not section_ids:
        return {}
    now = datetime.now(timezone.utc)
    stmt = (
        select(
            models.section.SectionUser.section_id,
            func.count(models.user.User.id),
        )
        .join(models.user.User, models.user.User.id == models.section.SectionUser.user_id)
        .where(
            models.section.SectionUser.section_id.in_(section_ids),
            models.section.SectionUser.delete_at.is_(None),
            models.user.User.delete_at.is_(None),
            or_(
                models.section.SectionUser.expire_time > now,
                models.section.SectionUser.expire_time.is_(None),
            ),
        )
        .group_by(models.section.SectionUser.section_id)
    )
    if filter_roles is not None:
        stmt = stmt.where(models.section.SectionUser.role.in_(filter_roles))
    return {section_id: count for section_id, count in (await db.execute(stmt)).all()}

def get_section_user_by_section_id_and_user_id(
    db: Session,
    section_id: int,
    user_id: int,
    filter_roles: list[UserSectionRole] | None = None
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionUser)
    query = query.filter(models.section.SectionUser.section_id == section_id,
                         models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at.is_(None))
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time.is_(None)))
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    return query.one_or_none()

async def get_section_user_by_section_id_and_user_id_async(
    db: AsyncSession,
    section_id: int,
    user_id: int,
    filter_roles: list[UserSectionRole] | None = None
):
    now = datetime.now(timezone.utc)
    stmt = select(models.section.SectionUser).where(
        models.section.SectionUser.section_id == section_id,
        models.section.SectionUser.user_id == user_id,
        models.section.SectionUser.delete_at.is_(None),
        or_(models.section.SectionUser.expire_time > now,
            models.section.SectionUser.expire_time.is_(None)),
    )
    if filter_roles is not None:
        stmt = stmt.where(models.section.SectionUser.role.in_(filter_roles))
    return (await db.execute(stmt)).scalar_one_or_none()

def get_section_users_by_section_ids_and_user_id(
    db: Session,
    section_ids: list[int],
    user_id: int,
    filter_roles: list[UserSectionRole] | None = None,
):
    if not section_ids:
        return []
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionUser)
    query = query.filter(
        models.section.SectionUser.section_id.in_(section_ids),
        models.section.SectionUser.user_id == user_id,
        models.section.SectionUser.delete_at.is_(None),
    )
    query = query.filter(
        or_(
            models.section.SectionUser.expire_time > now,
            models.section.SectionUser.expire_time.is_(None),
        )
    )
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    return query.all()


async def get_section_users_by_section_ids_and_user_id_async(
    db: AsyncSession,
    section_ids: list[int],
    user_id: int,
    filter_roles: list[UserSectionRole] | None = None,
):
    if not section_ids:
        return []
    now = datetime.now(timezone.utc)
    stmt = select(models.section.SectionUser).where(
        models.section.SectionUser.section_id.in_(section_ids),
        models.section.SectionUser.user_id == user_id,
        models.section.SectionUser.delete_at.is_(None),
        or_(
            models.section.SectionUser.expire_time > now,
            models.section.SectionUser.expire_time.is_(None),
        ),
    )
    if filter_roles is not None:
        stmt = stmt.where(models.section.SectionUser.role.in_(filter_roles))
    return list((await db.execute(stmt)).scalars().all())

def get_section_by_user_and_date(
    db: Session,
    user_id: int,
    date: date_type
):
    query = db.query(models.section.Section)
    query = query.join(models.section.DaySection)
    query = query.join(models.section.SectionUser)
    query = query.filter(models.section.DaySection.date == date,
                         models.section.DaySection.delete_at.is_(None),
                         models.section.Section.delete_at.is_(None),
                         models.section.SectionUser.delete_at.is_(None),
                         models.section.SectionUser.user_id == user_id)
    return query.one_or_none()

async def get_section_by_user_and_date_async(
    db: AsyncSession,
    user_id: int,
    date: date_type
):
    stmt = (
        select(models.section.Section)
        .join(models.section.DaySection)
        .join(models.section.SectionUser)
        .where(
            models.section.DaySection.date == date,
            models.section.DaySection.delete_at.is_(None),
            models.section.Section.delete_at.is_(None),
            models.section.SectionUser.delete_at.is_(None),
            models.section.SectionUser.user_id == user_id,
        )
        .options(selectinload(models.section.Section.creator))
    )
    return (await db.execute(stmt)).scalar_one_or_none()


def get_day_section_by_section_id(
    db: Session,
    section_id: int,
):
    query = db.query(models.section.DaySection)
    query = query.filter(
        models.section.DaySection.section_id == section_id,
        models.section.DaySection.delete_at.is_(None),
    )
    return query.one_or_none()

async def get_day_section_by_section_id_async(
    db: AsyncSession,
    section_id: int,
):
    stmt = select(models.section.DaySection).where(
        models.section.DaySection.section_id == section_id,
        models.section.DaySection.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()


def get_day_sections_by_section_ids(
    db: Session,
    section_ids: list[int],
):
    if not section_ids:
        return []
    query = db.query(models.section.DaySection)
    query = query.filter(
        models.section.DaySection.section_id.in_(section_ids),
        models.section.DaySection.delete_at.is_(None),
    )
    return query.all()


async def get_day_sections_by_section_ids_async(
    db: AsyncSession,
    section_ids: list[int],
):
    if not section_ids:
        return []
    stmt = select(models.section.DaySection).where(
        models.section.DaySection.section_id.in_(section_ids),
        models.section.DaySection.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())

def get_section_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.section.Section)
    query = query.filter(models.section.Section.id == section_id,
                         models.section.Section.delete_at.is_(None))
    return query.one_or_none()


async def get_section_by_section_id_async(
    db: AsyncSession,
    section_id: int,
):
    stmt = (
        select(models.section.Section)
        .where(
            models.section.Section.id == section_id,
            models.section.Section.delete_at.is_(None),
        )
        .options(selectinload(models.section.Section.creator))
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def get_labels_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.section.Label)
    query = query.join(models.section.SectionLabel)
    query = query.filter(models.section.SectionLabel.section_id == section_id,
                         models.section.SectionLabel.delete_at.is_(None),
                         models.section.Label.delete_at.is_(None))
    return query.all()


async def get_labels_by_section_id_async(
    db: AsyncSession,
    section_id: int,
):
    stmt = (
        select(models.section.Label)
        .join(models.section.SectionLabel)
        .where(
            models.section.SectionLabel.section_id == section_id,
            models.section.SectionLabel.delete_at.is_(None),
            models.section.Label.delete_at.is_(None),
        )
    )
    return list((await db.execute(stmt)).scalars().all())

def get_labels_by_section_ids(
    db: Session,
    section_ids: list[int],
):
    if not section_ids:
        return {}
    query = db.query(models.section.SectionLabel.section_id, models.section.Label)
    query = query.join(
        models.section.Label,
        models.section.SectionLabel.label_id == models.section.Label.id,
    )
    query = query.filter(
        models.section.SectionLabel.section_id.in_(section_ids),
        models.section.SectionLabel.delete_at.is_(None),
        models.section.Label.delete_at.is_(None),
    )
    rows = query.all()
    res: dict[int, list[models.section.Label]] = {}
    for section_id, label in rows:
        res.setdefault(section_id, []).append(label)
    return res


async def get_labels_by_section_ids_async(
    db: AsyncSession,
    section_ids: list[int],
):
    if not section_ids:
        return {}
    stmt = (
        select(models.section.SectionLabel.section_id, models.section.Label)
        .join(
            models.section.Label,
            models.section.SectionLabel.label_id == models.section.Label.id,
        )
        .where(
            models.section.SectionLabel.section_id.in_(section_ids),
            models.section.SectionLabel.delete_at.is_(None),
            models.section.Label.delete_at.is_(None),
        )
    )
    rows = (await db.execute(stmt)).all()
    res: dict[int, list[models.section.Label]] = {}
    for section_id, label in rows:
        res.setdefault(section_id, []).append(label)
    return res

def get_section_documents_by_section_id_and_document_ids(
    db: Session,
    section_id: int,
    document_ids: list[int],
):
    if not document_ids:
        return []
    query = db.query(models.section.SectionDocument)
    query = query.filter(
        models.section.SectionDocument.section_id == section_id,
        models.section.SectionDocument.document_id.in_(document_ids),
        models.section.SectionDocument.delete_at.is_(None),
    )
    return query.all()


async def get_section_documents_by_section_id_and_document_ids_async(
    db: AsyncSession,
    section_id: int,
    document_ids: list[int],
):
    if not document_ids:
        return []
    stmt = select(models.section.SectionDocument).where(
        models.section.SectionDocument.section_id == section_id,
        models.section.SectionDocument.document_id.in_(document_ids),
        models.section.SectionDocument.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())

def get_section_labels_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.section.SectionLabel)
    query = query.filter(models.section.SectionLabel.section_id == section_id,
                         models.section.SectionLabel.delete_at.is_(None))
    return query.all()

async def get_section_labels_by_section_id_async(
    db: AsyncSession,
    section_id: int
):
    result = await db.execute(
        select(models.section.SectionLabel).where(
            models.section.SectionLabel.section_id == section_id,
            models.section.SectionLabel.delete_at.is_(None),
        )
    )
    return result.scalars().all()

def get_section_documents_and_sections_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.section.SectionDocument, models.section.Section)
    query = query.filter(models.section.SectionDocument.document_id == document_id,
                         models.section.SectionDocument.delete_at.is_(None),
                         models.section.Section.delete_at.is_(None))
    return query.all()

async def get_section_documents_and_sections_by_document_id_async(
    db: AsyncSession,
    document_id: int
):
    stmt = (
        select(models.section.SectionDocument, models.section.Section)
        .join(
            models.section.Section,
            models.section.Section.id == models.section.SectionDocument.section_id,
        )
        .where(
            models.section.SectionDocument.document_id == document_id,
            models.section.SectionDocument.delete_at.is_(None),
            models.section.Section.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).all()

def get_section_documents_by_section_id(
    db: Session,
    section_id: int,
    filter_status: SectionDocumentIntegration | None = None
):
    query = db.query(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.delete_at.is_(None))
    if filter_status is not None:
        query = query.filter(models.section.SectionDocument.status == filter_status)
    return query.all()


async def get_section_documents_by_section_id_async(
    db: AsyncSession,
    section_id: int,
    filter_status: SectionDocumentIntegration | None = None,
):
    stmt = select(models.section.SectionDocument).where(
        models.section.SectionDocument.section_id == section_id,
        models.section.SectionDocument.delete_at.is_(None),
    )
    if filter_status is not None:
        stmt = stmt.where(models.section.SectionDocument.status == filter_status)
    return list((await db.execute(stmt)).scalars().all())

def get_section_document_by_section_id_and_document_id(
    db: Session,
    section_id: int,
    document_id: int
):
    query = db.query(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.document_id == document_id,
                         models.section.SectionDocument.delete_at.is_(None))
    return query.one_or_none()

async def get_section_document_by_section_id_and_document_id_async(
    db: AsyncSession,
    section_id: int,
    document_id: int
):
    result = await db.execute(
        select(models.section.SectionDocument).where(
            models.section.SectionDocument.section_id == section_id,
            models.section.SectionDocument.document_id == document_id,
            models.section.SectionDocument.delete_at.is_(None),
        )
    )
    return result.scalar_one_or_none()

def get_documents_for_section_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.document.Document)
    query = query.join(models.section.SectionDocument).join(models.section.Section)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.delete_at.is_(None),
                         models.document.Document.delete_at.is_(None),
                         models.section.Section.delete_at.is_(None))
    return query.all()


async def get_documents_for_section_by_section_id_async(
    db: AsyncSession,
    section_id: int,
):
    stmt = (
        select(models.document.Document)
        .join(models.section.SectionDocument)
        .join(models.section.Section)
        .where(
            models.section.SectionDocument.section_id == section_id,
            models.section.SectionDocument.delete_at.is_(None),
            models.document.Document.delete_at.is_(None),
            models.section.Section.delete_at.is_(None),
        )
    )
    return list((await db.execute(stmt)).scalars().all())

def update_section_by_section_id(
    db: Session,
    section_id: int,
    md_file_name: str | None = None
):
    now = datetime.now(timezone.utc)
    # 如果所有要变更的参数都是None 那么直接返回好了
    if md_file_name is None:
        return
    db_section = db.query(models.section.Section).filter(models.section.Section.id == section_id).one_or_none()
    if db_section is None:
        raise Exception("Section is not found")
    if md_file_name is not None:
        db_section.md_file_name = md_file_name
    db_section.update_time = now
    db.flush()

def update_section_document_by_section_id_and_document_id(
    db: Session,
    section_id: int,
    document_id: int,
    status: int
):
    now = datetime.now(timezone.utc)
    db_section_document = db.query(models.section.SectionDocument)\
        .filter(models.section.SectionDocument.section_id == section_id,
                models.section.SectionDocument.document_id == document_id,
                models.section.SectionDocument.delete_at.is_(None))\
        .one_or_none()
    if db_section_document is None:
        raise Exception("Section document is not found")
    db_section_document.status = status
    db_section_document.update_time = now
    db.flush()

async def update_section_document_by_section_id_and_document_id_async(
    db: AsyncSession,
    section_id: int,
    document_id: int,
    status: int
):
    now = datetime.now(timezone.utc)
    db_section_document = (await db.execute(
        select(models.section.SectionDocument).where(
            models.section.SectionDocument.section_id == section_id,
            models.section.SectionDocument.document_id == document_id,
            models.section.SectionDocument.delete_at.is_(None),
        )
    )).scalar_one_or_none()
    if db_section_document is None:
        raise Exception("Section document is not found")
    db_section_document.status = status
    db_section_document.update_time = now
    await db.flush()

def delete_section_by_section_id(
    db: Session,
    section_id: int
):
    now = datetime.now(timezone.utc)
    db_section = db.query(models.section.Section).filter(models.section.Section.id == section_id).one_or_none()
    if db_section is None:
        raise Exception("Section is not found")
    db_section.delete_at = now
    db.flush()

async def delete_section_by_section_id_async(
    db: AsyncSession,
    section_id: int
):
    now = datetime.now(timezone.utc)
    db_section = (await db.execute(
        select(models.section.Section).where(
            models.section.Section.id == section_id
        )
    )).scalar_one_or_none()
    if db_section is None:
        raise Exception("Section is not found")
    db_section.delete_at = now
    await db.flush()

def delete_section_users_by_section_id(
    db: Session,
    section_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionUser)\
        .filter(models.section.SectionUser.section_id == section_id,
                models.section.SectionUser.delete_at.is_(None))
    query.update({models.section.SectionUser.delete_at: now}, synchronize_session=False)
    db.flush()

async def delete_section_users_by_section_id_async(
    db: AsyncSession,
    section_id: int
):
    now = datetime.now(timezone.utc)
    await db.execute(
        models.section.SectionUser.__table__.update()
        .where(
            models.section.SectionUser.section_id == section_id,
            models.section.SectionUser.delete_at.is_(None),
        )
        .values(delete_at=now)
    )
    await db.flush()

def delete_section_documents_by_section_id(
    db: Session,
    section_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.delete_at.is_(None))
    query.update({models.section.SectionDocument.delete_at: now}, synchronize_session=False)
    db.flush()

async def delete_section_documents_by_section_id_async(
    db: AsyncSession,
    section_id: int
):
    now = datetime.now(timezone.utc)
    await db.execute(
        models.section.SectionDocument.__table__.update()
        .where(
            models.section.SectionDocument.section_id == section_id,
            models.section.SectionDocument.delete_at.is_(None),
        )
        .values(delete_at=now)
    )
    await db.flush()

def delete_section_user_by_section_id_and_user_id(
    db: Session,
    section_id: int,
    user_id: int
):
    now = datetime.now(timezone.utc)
    db_section_user = db.query(models.section.SectionUser).filter(models.section.SectionUser.section_id == section_id,
                                                                  models.section.SectionUser.user_id == user_id,
                                                                  models.section.SectionUser.delete_at.is_(None)).one_or_none()
    if db_section_user is None:
        raise Exception("Section user is not found")
    db_section_user.delete_at = now
    db.flush()

async def delete_section_user_by_section_id_and_user_id_async(
    db: AsyncSession,
    section_id: int,
    user_id: int
):
    now = datetime.now(timezone.utc)
    db_section_user = (await db.execute(
        select(models.section.SectionUser).where(
            models.section.SectionUser.section_id == section_id,
            models.section.SectionUser.user_id == user_id,
            models.section.SectionUser.delete_at.is_(None),
        )
    )).scalar_one_or_none()
    if db_section_user is None:
        raise Exception("Section user is not found")
    db_section_user.delete_at = now
    await db.flush()

def delete_section_comments_by_section_id(
    db: Session,
    section_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionComment)
    query = query.filter(models.section.SectionComment.section_id == section_id,
                         models.section.SectionComment.delete_at.is_(None))
    query.update({models.section.SectionComment.delete_at: now}, synchronize_session=False)
    db.flush()

async def delete_section_comments_by_section_id_async(
    db: AsyncSession,
    section_id: int
):
    now = datetime.now(timezone.utc)
    await db.execute(
        models.section.SectionComment.__table__.update()
        .where(
            models.section.SectionComment.section_id == section_id,
            models.section.SectionComment.delete_at.is_(None),
        )
        .values(delete_at=now)
    )
    await db.flush()

def delete_section_comments_by_section_comment_ids(
    db: Session,
    user_id: int,
    section_comment_ids: list[int]
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionComment)
    query = query.filter(models.section.SectionComment.id.in_(section_comment_ids),
                         models.section.SectionComment.delete_at.is_(None),
                         models.section.SectionComment.creator_id == user_id)
    query.update({models.section.SectionComment.delete_at: now}, synchronize_session=False)
    db.flush()


async def delete_section_comments_by_section_comment_ids_async(
    db: AsyncSession,
    user_id: int,
    section_comment_ids: list[int],
):
    if not section_comment_ids:
        return
    now = datetime.now(timezone.utc)
    await db.execute(
        models.section.SectionComment.__table__.update()
        .where(
            models.section.SectionComment.id.in_(section_comment_ids),
            models.section.SectionComment.delete_at.is_(None),
            models.section.SectionComment.creator_id == user_id,
        )
        .values(delete_at=now)
    )
    await db.flush()

def delete_section_labels_by_section_id(
    db: Session,
    section_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionLabel)
    query = query.filter(models.section.SectionLabel.section_id == section_id,
                         models.section.SectionLabel.delete_at.is_(None))
    query = query.update({models.section.SectionLabel.delete_at: now}, synchronize_session=False)
    db.flush()

async def delete_section_labels_by_section_id_async(
    db: AsyncSession,
    section_id: int
):
    now = datetime.now(timezone.utc)
    await db.execute(
        models.section.SectionLabel.__table__.update()
        .where(
            models.section.SectionLabel.section_id == section_id,
            models.section.SectionLabel.delete_at.is_(None),
        )
        .values(delete_at=now)
    )
    await db.flush()

def delete_section_labels_by_label_ids(
    db: Session,
    label_ids: list[int]
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionLabel)
    query = query.filter(models.section.SectionLabel.id.in_(label_ids),
                         models.section.SectionLabel.delete_at.is_(None))
    query = query.update({models.section.SectionLabel.delete_at: now}, synchronize_session=False)
    db.flush()

async def delete_section_labels_by_label_ids_async(
    db: AsyncSession,
    label_ids: list[int]
):
    if not label_ids:
        return
    now = datetime.now(timezone.utc)
    await db.execute(
        models.section.SectionLabel.__table__.update()
        .where(
            models.section.SectionLabel.id.in_(label_ids),
            models.section.SectionLabel.delete_at.is_(None),
        )
        .values(delete_at=now)
    )
    await db.flush()

def delete_labels_by_label_ids(
    db: Session,
    user_id: int,
    label_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.Label)
    query = query.filter(models.section.Label.id.in_(label_ids),
                         models.section.Label.delete_at.is_(None),
                         models.section.Label.user_id == user_id,
                         models.section.Label.delete_at.is_(None))
    query = query.update({models.section.Label.delete_at: now}, synchronize_session=False)
    db.flush()

async def delete_labels_by_label_ids_async(
    db: AsyncSession,
    user_id: int,
    label_ids: list[int]
):
    now = datetime.now(timezone.utc)
    await db.execute(
        models.section.Label.__table__.update()
        .where(
            models.section.Label.id.in_(label_ids),
            models.section.Label.delete_at.is_(None),
            models.section.Label.user_id == user_id,
        )
        .values(delete_at=now)
    )
    await db.flush()

def delete_section_document_by_section_id_and_document_id(
    db: Session,
    section_id: int,
    document_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.document_id == document_id)
    query.update({models.section.SectionDocument.delete_at: now})
    db.flush()

async def delete_section_document_by_section_id_and_document_id_async(
    db: AsyncSession,
    section_id: int,
    document_id: int
):
    now = datetime.now(timezone.utc)
    stmt = select(models.section.SectionDocument).where(
        models.section.SectionDocument.section_id == section_id,
        models.section.SectionDocument.document_id == document_id,
    )
    section_document = (await db.execute(stmt)).scalar_one_or_none()
    if section_document is not None:
        section_document.delete_at = now
    await db.flush()

def delete_published_section_by_section_id(
    db: Session,
    section_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.PublishSection)
    query = query.filter(models.section.PublishSection.section_id == section_id)
    query.update({models.section.PublishSection.delete_at: now})
    db.flush()

async def delete_published_section_by_section_id_async(
    db: AsyncSession,
    section_id: int
):
    now = datetime.now(timezone.utc)
    stmt = select(models.section.PublishSection).where(
        models.section.PublishSection.section_id == section_id
    )
    publish_section = (await db.execute(stmt)).scalar_one_or_none()
    if publish_section is not None:
        publish_section.delete_at = now
    await db.flush()
