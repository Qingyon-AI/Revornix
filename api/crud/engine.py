from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

import models


def create_engine_provided(
    db: Session,
    uuid: str,
    category: int,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None,
    demo_config: str | None = None
):
    now = datetime.now(timezone.utc)
    db_engine_provided = models.engine.EngineProvided(
        uuid=uuid,
        category=category,
        name=name,
        name_zh=name_zh,
        description=description,
        description_zh=description_zh,
        demo_config=demo_config,
        create_time=now
    )
    db.add(db_engine_provided)
    db.flush()
    return db_engine_provided

def create_engine(
    db: Session,
    name: str,
    creator_id: int,
    engine_provided_id: int,
    is_public: bool,
    uuid: str | None = None,
    description: str | None = None,
    config_json: str | None = None,
):
    now = datetime.now(timezone.utc)
    if uuid is None:
        uuid = uuid4().hex
    db_engine = models.engine.Engine(
        uuid=uuid,
        name=name,
        creator_id=creator_id,
        engine_provided_id=engine_provided_id,
        is_public=is_public,
        description=description,
        config_json=config_json,
        create_time=now
    )
    db.add(db_engine)
    db.flush()
    return db_engine

def create_user_engine(
    db: Session,
    user_id: int,
    engine_id: int,
    role: int
):
    now = datetime.now(timezone.utc)
    db_user_engine = models.engine.UserEngine(
        user_id=user_id,
        engine_id=engine_id,
        create_time=now,
        role=role
    )
    db.add(db_user_engine)
    db.flush()
    return db_user_engine

def get_engine_provided_by_engine_id(
    db: Session,
    engine_id: int
):
    query = db.query(models.engine.EngineProvided)
    query = query.join(models.engine.Engine)
    query = query.filter(
        models.engine.Engine.id == engine_id,
        models.engine.EngineProvided.delete_at.is_(None)
    )
    return query.one_or_none()

def get_engine_provided_by_engine_uuid(
    db: Session,
    engine_uuid: str
):
    query = db.query(models.engine.EngineProvided)
    query = query.join(models.engine.Engine)
    query = query.filter(
        models.engine.Engine.uuid == engine_uuid,
        models.engine.EngineProvided.delete_at.is_(None)
    )
    return query.one_or_none()

def get_engine_by_engine_id(
    db: Session,
    engine_id: int
):
    query = db.query(models.engine.Engine)
    query = query.options(
        joinedload(models.engine.Engine.engine_provided)
    )
    query = query.filter(
        models.engine.Engine.id == engine_id,
        models.engine.Engine.delete_at.is_(None)
    )
    return query.one_or_none()

def get_engine_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.engine.Engine)
    query = query.options(
        joinedload(models.engine.Engine.engine_provided)
    )
    query = query.filter(
        models.engine.Engine.uuid == uuid,
        models.engine.Engine.delete_at.is_(None)
    )
    return query.one_or_none()

def get_user_engine_by_user_engine_id(
    db: Session,
    user_engine_id: int
):
    query = db.query(models.engine.UserEngine)
    query = query.filter(
        models.engine.UserEngine.id == user_engine_id,
        models.engine.UserEngine.delete_at.is_(None)
    )
    return query.one_or_none()

def get_user_engine_by_user_id_and_engine_id(
    db: Session,
    user_id: int,
    engine_id: int,
    filter_role: int
):
    query = db.query(models.engine.UserEngine)
    query = query.filter(
        models.engine.UserEngine.user_id == user_id,
        models.engine.UserEngine.engine_id == engine_id,
        models.engine.UserEngine.delete_at.is_(None),
        models.engine.UserEngine.role == filter_role
    )
    return query.one_or_none()

def get_all_engines_provided(
    db: Session,
    keyword: str | None = None,
    filter_category: int | None = None
):
    query = db.query(models.engine.EngineProvided)
    query = query.filter(models.engine.EngineProvided.delete_at.is_(None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.engine.EngineProvided.name.like(f'%{keyword}%'))
    if filter_category is not None:
        query = query.filter(models.engine.EngineProvided.category == filter_category)
    return query.all()

def get_all_engines(
    db: Session,
    keyword: str | None = None,
    filter_category: int | None = None
):
    query = db.query(models.engine.Engine)
    query = query.join(models.engine.EngineProvided)
    query = query.options(
        joinedload(models.engine.Engine.engine_provided)
    )
    query = query.filter(models.engine.Engine.delete_at.is_(None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.engine.Engine.name.like(f'%{keyword}%'))
    if filter_category is not None:
        query = query.filter(models.engine.EngineProvided.category == filter_category)
    return query.all()

def get_engines_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None,
    filter_category: int | None = None
):
    query = db.query(models.engine.Engine)
    query = query.join(models.engine.EngineProvided)
    query = query.options(
        joinedload(models.engine.Engine.engine_provided)
    )
    query = query.join(models.engine.UserEngine, models.engine.Engine.id == models.engine.UserEngine.engine_id)
    query = query.filter(
        models.engine.UserEngine.user_id == user_id,
        models.engine.UserEngine.delete_at.is_(None),
        models.engine.Engine.delete_at.is_(None)
    )
    if keyword:
        query = query.filter(models.engine.Engine.name.ilike(f"%{keyword}%"))
    if filter_category is not None: 
        query = query.filter(models.engine.EngineProvided.category == filter_category)
    query = query.order_by(models.engine.Engine.id.desc())

    return query.all()

def search_engines_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None,
    start: int | None = None,
    limit: int | None = None,
):
    query = db.query(models.engine.Engine, models.engine.UserEngine)
    query = query.options(
        joinedload(models.engine.Engine.creator),
        joinedload(models.engine.Engine.engine_provided)
    )
    query = query.outerjoin(
        models.engine.UserEngine,
        and_(
            models.engine.UserEngine.engine_id == models.engine.Engine.id,
            models.engine.UserEngine.user_id == user_id,
            models.engine.UserEngine.delete_at.is_(None),
        ),
    )
    query = query.filter(models.engine.Engine.delete_at.is_(None))
    query = query.filter(
        or_(
            models.engine.Engine.creator_id == user_id,
            models.engine.Engine.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.engine.Engine.name.ilike(f"%{keyword}%"))
    query = query.order_by(models.engine.Engine.id.desc())
    if start is not None:
        query = query.filter(models.engine.Engine.id <= start)
    if limit is not None:
        query = query.limit(limit)
    # 返回 [(engine, user_engine), ...]
    return query.all()


def search_next_engine_for_user(
    db: Session,
    user_id: int,
    engine: models.engine.Engine,
    keyword: str | None = None
):
    query = db.query(models.engine.Engine, models.engine.UserEngine)
    query = query.options(
        joinedload(models.engine.Engine.creator),
        joinedload(models.engine.Engine.engine_provided)
    )
    query = query.outerjoin(
        models.engine.UserEngine,
        and_(
            models.engine.UserEngine.engine_id == models.engine.Engine.id,
            models.engine.UserEngine.user_id == user_id,
            models.engine.UserEngine.delete_at.is_(None),
        ),
    )
    query = query.filter(models.engine.Engine.delete_at.is_(None))
    query = query.filter(
        or_(
            models.engine.Engine.creator_id == user_id,
            models.engine.Engine.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.engine.Engine.name.ilike(f"%{keyword}%"))
    query = query.order_by(models.engine.Engine.id.desc())
    query = query.filter(models.engine.Engine.id < engine.id)
    return query.first()

def count_all_engines_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.engine.Engine, models.engine.UserEngine)
    query = query.options(
        joinedload(models.engine.Engine.creator),
        joinedload(models.engine.Engine.engine_provided)
    )
    query = query.outerjoin(
        models.engine.UserEngine,
        and_(
            models.engine.UserEngine.engine_id == models.engine.Engine.id,
            models.engine.UserEngine.user_id == user_id,
            models.engine.UserEngine.delete_at.is_(None),
        ),
    )
    query = query.filter(models.engine.Engine.delete_at.is_(None))
    query = query.filter(
        or_(
            models.engine.Engine.creator_id == user_id,
            models.engine.Engine.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.engine.Engine.name.ilike(f"%{keyword}%"))
    query = query.order_by(models.engine.Engine.id.desc())
    return query.count()