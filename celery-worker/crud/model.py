import models
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from common.encrypt import encrypt_api_key, decrypt_api_key

def create_user_ai_model_provider(
    db: Session, 
    user_id: int, 
    ai_model_provider_id: int, 
    api_key: str | None = None, 
    base_url: str | None = None
):
    """
    Create a new user AI model provider.
    """
    now = datetime.now(timezone.utc)
    if api_key is not None:
        api_key = encrypt_api_key(api_key)
    db_user_provider = models.model.UserAIModelProvider(
        user_id=user_id,
        ai_model_provider_id=ai_model_provider_id,
        api_key=api_key,
        base_url=base_url,
        create_time=now
    )
    db.add(db_user_provider)
    db.flush()
    return db_user_provider

def create_ai_model_provider(
    db: Session, 
    name: str, 
    description: str | None = None,
    uuid: str | None = None
):
    """
    Create a new AI model provider.
    """
    now = datetime.now(timezone.utc)
    if uuid is None:
        uuid = uuid4().hex
    db_ai_provider = models.model.AIModelProvider(
        name=name,
        description=description,
        uuid=uuid,
        create_time=now
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

def get_ai_model_by_uuid(
    db: Session,
    uuid: str
):
    """
    Get an AI model by its UUID.
    """
    query = db.query(models.model.AIModel)
    query = query.filter(models.model.AIModel.uuid == uuid,
                         models.model.AIModel.delete_at == None)
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
                         models.model.AIModelProvider.delete_at == None)
    return query.one_or_none()

def get_user_ai_model_provider_by_id_decrypted(
    db: Session, 
    user_id: int, 
    ai_model_provider_id: int
):
    """
    获取用户 AI 模型 Provider，并解密 API Key
    """
    record = db.query(models.model.UserAIModelProvider).filter(
        models.model.UserAIModelProvider.user_id == user_id,
        models.model.UserAIModelProvider.ai_model_provider_id == ai_model_provider_id,
        models.model.UserAIModelProvider.delete_at == None
    ).one_or_none()

    if record and record.api_key:
        record.api_key = decrypt_api_key(record.api_key)
    return record

def get_ai_model_by_id(
    db: Session, 
    model_id: int
):
    """
    Get an AI model by its ID.
    """
    query = db.query(models.model.AIModel)
    query = query.filter(models.model.AIModel.id == model_id,
                         models.model.AIModel.delete_at == None)
    return query.one_or_none()
    
def get_ai_model_provider_by_id(
    db: Session, 
    provider_id: int
):
    """
    Get an AI model provider by its ID.
    """
    query = db.query(models.model.AIModelProvider)
    query = query.filter(models.model.AIModelProvider.id == provider_id,
                         models.model.AIModelProvider.delete_at == None)
    return query.one_or_none()