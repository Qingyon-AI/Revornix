import models
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from common.encrypt import encrypt_api_key
from sqlalchemy import and_, or_
from enums.model import UserModelProviderRole

def create_user_ai_model_provider(
    db: Session, 
    user_id: int, 
    ai_model_provider_id: int, 
    role: UserModelProviderRole
):
    """
    Create a new user AI model provider.
    """
    now = datetime.now(timezone.utc)
    
    db_user_provider = models.model.UserAIModelProvider(
        user_id=user_id,
        ai_model_provider_id=ai_model_provider_id,
        role=role,
        create_time=now
    )
    db.add(db_user_provider)
    db.flush()
    return db_user_provider

def create_ai_model_provider(
    db: Session, 
    name: str, 
    creator_id: int,
    description: str | None = None,
    uuid: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None
):
    """
    Create a new AI model provider.
    """
    now = datetime.now(timezone.utc)
    if uuid is None:
        uuid = uuid4().hex
    if api_key is not None:
        api_key = encrypt_api_key(api_key)
    db_ai_provider = models.model.AIModelProvider(
        name=name,
        description=description,
        uuid=uuid,
        creator_id=creator_id,
        create_time=now,
        api_key=api_key,
        base_url=base_url
    )
    db.add(db_ai_provider)
    db.flush()
    return db_ai_provider

def create_ai_model(
    db: Session, 
    name: str, 
    provider_id: int,
    description: str | None = None,
    uuid: str | None = None
):
    """
    Create a new AI model.
    """
    now = datetime.now(timezone.utc)
    new_model = models.model.AIModel(
        name=name,
        description=description,
        provider_id=provider_id,
        uuid=uuid,
        create_time=now
    )
    if uuid is None:
        new_model.uuid = uuid4().hex
    db.add(new_model)
    db.flush()
    return new_model


def get_user_ai_model_provider_by_user_and_model_provider_id(
    db: Session,
    user_id: int,
    ai_model_provider_id: int,
    filter_role: int
):
    """
    Get a user AI model provider by user and model provider ID.
    """
    query = db.query(models.model.UserAIModelProvider).filter(
        models.model.UserAIModelProvider.user_id == user_id,
        models.model.UserAIModelProvider.ai_model_provider_id == ai_model_provider_id,
        models.model.UserAIModelProvider.delete_at.is_(None)
    )
    if filter_role is not None:
        query = query.filter(models.model.UserAIModelProvider.role == filter_role)
    return query.one_or_none()


def get_ai_model_by_uuid(
    db: Session,
    uuid: str
):
    """
    Get an AI model by its UUID.
    """
    query = db.query(models.model.AIModel)
    query = query.filter(models.model.AIModel.uuid == uuid,
                         models.model.AIModel.delete_at.is_(None))
    return query.one_or_none()

def get_ai_model_by_id(
    db: Session, 
    model_id: int
):
    """
    Get an AI model by its ID.
    """
    query = db.query(models.model.AIModel)
    query = query.options(
        joinedload(models.model.AIModel.provider)
    )
    query = query.filter(models.model.AIModel.id == model_id,
                         models.model.AIModel.delete_at.is_(None))
    return query.one_or_none()

def get_ai_model_provider_by_uuid(
    db: Session,
    uuid: str
):
    """
    Get an AI model provider by its UUID.
    """
    query = db.query(models.model.AIModelProvider)
    query = query.filter(models.model.AIModelProvider.uuid == uuid,
                         models.model.AIModelProvider.delete_at.is_(None))
    return query.one_or_none()

def get_ai_model_provider_by_id(
    db: Session, 
    provider_id: int
):
    """
    Get an AI model provider by its ID.
    """
    query = db.query(models.model.AIModelProvider)
    query = query.options(
        joinedload(models.model.AIModelProvider.creator)
    )
    query = query.filter(models.model.AIModelProvider.id == provider_id,
                         models.model.AIModelProvider.delete_at.is_(None))
    return query.one_or_none()

def get_ai_models_for_ai_model_provider(
    db: Session,
    provider_id: int
):
    """
    Get all AI models for a given AI model provider.
    """
    query = db.query(models.model.AIModel)
    query = query.options(
        joinedload(models.model.AIModel.provider)
    )
    query = query.filter(
        models.model.AIModel.provider_id == provider_id,
        models.model.AIModel.delete_at.is_(None)
    )
    return query.all()
    
def get_ai_model_providers_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None,
):
    """
    Get all AI model providers for a given user.
    """
    query = db.query(models.model.AIModelProvider)
    query = query.join(models.model.UserAIModelProvider)
    query = query.filter(
        models.model.UserAIModelProvider.user_id == user_id,
        models.model.UserAIModelProvider.delete_at.is_(None),
        models.model.AIModelProvider.delete_at.is_(None)
    )
    if keyword:
        query = query.filter(models.model.AIModelProvider.name.ilike(f"%{keyword}%"))
    query = query.order_by(models.model.AIModelProvider.id.desc())
    
    return query.all()

def search_ai_model_providers_for_user(
    db: Session, 
    user_id: int, 
    keyword: str | None = None,
    start: int | None = None, 
    limit: int | None = None
):
    query = db.query(models.model.AIModelProvider, models.model.UserAIModelProvider)
    query = query.options(
        joinedload(models.model.AIModelProvider.creator)
    )
    query = query.outerjoin(
        models.model.UserAIModelProvider,
        and_(
            models.model.UserAIModelProvider.ai_model_provider_id == models.model.AIModelProvider.id,
            models.model.UserAIModelProvider.user_id == user_id,
            models.model.UserAIModelProvider.delete_at.is_(None),
        ),
    )
    query = query.filter(models.model.AIModelProvider.delete_at.is_(None))
    query = query.filter(
        or_(
            models.model.AIModelProvider.creator_id == user_id,
            models.model.AIModelProvider.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.model.AIModelProvider.name.ilike(f"%{keyword}%"))
    query = query.order_by(models.model.AIModelProvider.id.desc())
    if start is not None:
        query = query.filter(models.model.AIModelProvider.id <= start)
    if limit is not None:
        query = query.limit(limit)
    # 返回 [(provider, user_provider_config_or_none), ...]
    return query.all()


def search_next_ai_model_providers_for_user(
    db: Session,
    user_id: int,
    provider: models.model.AIModelProvider,
    keyword: str | None = None
):
    query = db.query(models.model.AIModelProvider, models.model.UserAIModelProvider)
    query = query.outerjoin(
        models.model.UserAIModelProvider,
        and_(
            models.model.UserAIModelProvider.ai_model_provider_id == models.model.AIModelProvider.id,
            models.model.UserAIModelProvider.user_id == user_id,
            models.model.UserAIModelProvider.delete_at.is_(None),
        ),
    )
    query = query.filter(models.model.AIModelProvider.delete_at.is_(None))
    query = query.filter(
        or_(
            models.model.AIModelProvider.creator_id == user_id,
            models.model.AIModelProvider.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.model.AIModelProvider.name.ilike(f"%{keyword}%"))
    query = query.order_by(models.model.AIModelProvider.id.desc())
    query = query.filter(models.model.AIModelProvider.id < provider.id)
    return query.first()

def count_all_ai_model_providers_for_user(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.model.AIModelProvider, models.model.UserAIModelProvider)
    query = query.outerjoin(
        models.model.UserAIModelProvider,
        and_(
            models.model.UserAIModelProvider.ai_model_provider_id == models.model.AIModelProvider.id,
            models.model.UserAIModelProvider.user_id == user_id,
            models.model.UserAIModelProvider.delete_at.is_(None),
        ),
    )
    query = query.filter(models.model.AIModelProvider.delete_at.is_(None))
    query = query.filter(
        or_(
            models.model.AIModelProvider.creator_id == user_id,
            models.model.AIModelProvider.is_public.is_(True),
        )
    )
    if keyword:
        query = query.filter(models.model.AIModelProvider.name.ilike(f"%{keyword}%"))
    query = query.order_by(models.model.AIModelProvider.id.desc())
    return query.count()

def delete_ai_model_providers(
    db: Session, 
    user_id: int, 
    provider_ids: list[int]
):
    """
    Soft delete AI model providers and related user bindings for a given user.
    """
    if not provider_ids:
        return

    now = datetime.now(timezone.utc)

    # 找出当前用户绑定的 provider_id
    provider_ids_to_delete = db.query(models.model.AIModelProvider.id)\
        .join(models.model.UserAIModelProvider)\
        .filter(models.model.AIModelProvider.id.in_(provider_ids),
                models.model.UserAIModelProvider.user_id == user_id,
                models.model.AIModelProvider.delete_at.is_(None),
                models.model.UserAIModelProvider.delete_at.is_(None))\
        .all()

    provider_ids_to_delete = [row.id for row in provider_ids_to_delete]

    if not provider_ids_to_delete:
        return  # 没有匹配项，也不需要执行 update

    # 执行 soft delete（不使用 join）
    db.query(models.model.AIModelProvider)\
        .filter(models.model.AIModelProvider.id.in_(provider_ids_to_delete))\
        .update({models.model.AIModelProvider.delete_at: now}, synchronize_session="fetch")

    db.query(models.model.UserAIModelProvider)\
        .filter(models.model.UserAIModelProvider.ai_model_provider_id.in_(provider_ids_to_delete),
                models.model.UserAIModelProvider.user_id == user_id)\
        .update({models.model.UserAIModelProvider.delete_at: now}, synchronize_session="fetch")

    db.flush()