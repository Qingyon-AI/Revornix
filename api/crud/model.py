import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from common.encrypt import encrypt_api_key, decrypt_api_key

def create_user_ai_model_provider(db: Session, user_id: int, ai_model_provider_id: int, api_key: str, api_url: str):
    """
    Create a new user AI model provider.
    """
    now = datetime.now(timezone.utc)
    api_key = encrypt_api_key(api_key)
    new_user_provider = models.model.UserAIModelProvider(
        user_id=user_id,
        ai_model_provider_id=ai_model_provider_id,
        api_key=api_key,
        api_url=api_url,
        create_time=now,
        update_time=now
    )
    db.add(new_user_provider)
    db.flush()
    return new_user_provider

def create_ai_model_provider(db: Session, name: str, description: str):
    """
    Create a new AI model provider.
    """
    now = datetime.now(timezone.utc)
    new_provider = models.model.AIModelPorvider(
        name=name,
        description=description,
        create_time=now,
        update_time=now,
    )
    db.add(new_provider)
    db.flush()
    return new_provider

def create_user_ai_model(db: Session, user_id: int, ai_model_id: int, api_key: str, api_url: str):
    """
    Create a new user AI model.
    """
    now = datetime.now(timezone.utc)
    api_key = encrypt_api_key(api_key)
    new_user_ai_model = models.model.UserAIModel(
        user_id=user_id,
        ai_model_id=ai_model_id,
        api_key=api_key,
        api_url=api_url,
        create_time=now,
        update_time=now
    )
    db.add(new_user_ai_model)
    db.flush()
    return new_user_ai_model

def create_ai_model(db: Session, name: str, description: str, provider_id: int):
    """
    Create a new AI model.
    """
    now = datetime.now(timezone.utc)
    new_model = models.model.AIModel(
        name=name,
        description=description,
        provider_id=provider_id,
        create_time=now,
        update_time=now
    )
    db.add(new_model)
    db.flush()
    return new_model

def get_user_ai_model_provider_by_id_decrypted(db: Session, user_id: int, provider_id: int):
    """
    获取用户 AI 模型 Provider，并解密 API Key
    """
    record = db.query(models.model.UserAIModelProvider).filter(
        models.model.UserAIModelProvider.user_id == user_id,
        models.model.UserAIModelProvider.ai_model_provider_id == provider_id,
        models.model.UserAIModelProvider.delete_at == None
    ).first()

    if record and record.api_key:
        record.api_key = decrypt_api_key(record.api_key)
    return record


def get_user_ai_model_by_id_decrypted(db: Session, user_id: int, model_id: int):
    """
    获取用户 AI 模型，并解密 API Key
    """
    record = db.query(models.model.UserAIModel).filter(
        models.model.UserAIModel.user_id == user_id,
        models.model.UserAIModel.ai_model_id == model_id,
        models.model.UserAIModel.delete_at == None
    ).first()

    if record and record.api_key:
        record.api_key = decrypt_api_key(record.api_key)
    return record

def get_ai_model_by_id(db: Session, model_id: int):
    """
    Get an AI model by its ID.
    """
    return db.query(models.model.AIModel).filter(models.model.AIModel.id == model_id,
                                                 models.model.AIModel.delete_at == None).first()
    
def get_ai_model_provider_by_id(db: Session, provider_id: int):
    """
    Get an AI model provider by its ID.
    """
    return db.query(models.model.AIModelPorvider).filter(models.model.AIModelPorvider.id == provider_id,
                                                         models.model.AIModelPorvider.delete_at == None).first()
    
def get_user_ai_model_by_id(db: Session, user_id: int, model_id: int):
    """
    Get a user's AI model by its ID.
    """
    return db.query(models.model.UserAIModel).filter(models.model.UserAIModel.user_id == user_id,
                                                     models.model.UserAIModel.ai_model_id == model_id,
                                                     models.model.UserAIModel.delete_at == None).first()
    
def get_user_ai_model_provider_by_id(db: Session, user_id: int, provider_id: int):
    """
    Get a user's AI model provider by its ID.
    """
    return db.query(models.model.UserAIModelProvider).filter(models.model.UserAIModelProvider.user_id == user_id,
                                                             models.model.UserAIModelProvider.ai_model_provider_id == provider_id,
                                                             models.model.UserAIModelProvider.delete_at == None).first()
    
def search_ai_models(db: Session, user_id: int, keyword: str | None = None, provider_id: int | None = None):
    query = db.query(models.model.AIModel).join(models.model.UserAIModel)
    
    query = query.filter(models.model.UserAIModel.user_id == user_id,
                         models.model.AIModel.delete_at == None)
    
    if keyword and len(keyword.strip()) > 0:
        query = query.filter(models.model.AIModel.name.ilike(f"%{keyword}%"))
    
    if provider_id:
        query = query.filter(models.model.AIModel.provider_id == provider_id)
    
    return query.all()

def search_ai_model_providers(db: Session, user_id: int, keyword: str | None = None):
    query = db.query(models.model.AIModelPorvider).join(models.model.UserAIModelProvider)
    
    query = query.filter(models.model.AIModelPorvider.delete_at == None,
                         models.model.UserAIModelProvider.user_id == user_id)
    
    if keyword and len(keyword.strip()) > 0:
        query = query.filter(models.model.AIModelPorvider.name.ilike(f"%{keyword}%"))
    
    return query.all()

def delete_ai_models(db: Session, user_id: int, model_ids: list[int]):
    """
    Delete AI models by their IDs.
    """
    if not model_ids:
        return
    now = datetime.now(timezone.utc)
    
    # 第一步：找出 user 拥有的 ai_model_ids（通过 join）
    ai_model_ids_to_delete = db.query(models.model.AIModel.id).join(
        models.model.UserAIModel
    ).filter(
        models.model.AIModel.id.in_(model_ids),
        models.model.UserAIModel.user_id == user_id
    ).all()

    ai_model_ids_to_delete = [row.id for row in ai_model_ids_to_delete]

    # 第二步：分别 update 两张表（不用 join）
    db.query(models.model.AIModel).filter(
        models.model.AIModel.id.in_(ai_model_ids_to_delete)
    ).update(
        {models.model.AIModel.delete_at: now},
        synchronize_session="fetch"
    )

    db.query(models.model.UserAIModel).filter(
        models.model.UserAIModel.ai_model_id.in_(ai_model_ids_to_delete),
        models.model.UserAIModel.user_id == user_id
    ).update(
        {models.model.UserAIModel.delete_at: now},
        synchronize_session="fetch"
    )

    db.flush()
    
def delete_ai_model_providers(db: Session, user_id: int, provider_ids: list[int]):
    """
    Soft delete AI model providers and related user bindings for a given user.
    """
    if len( provider_ids) == 0:
        return  # 空列表，不需要查询或删除，避免 SQL 语法错误
    now = datetime.now(timezone.utc)

    # 找出当前用户绑定的 provider_id
    provider_ids_to_delete = db.query(models.model.AIModelPorvider.id).join(
        models.model.UserAIModelProvider
    ).filter(
        models.model.AIModelPorvider.id.in_(provider_ids),
        models.model.UserAIModelProvider.user_id == user_id
    ).all()

    provider_ids_to_delete = [row.id for row in provider_ids_to_delete]

    if not provider_ids_to_delete:
        return  # 没有匹配项，也不需要执行 update

    # 执行 soft delete（不使用 join）
    db.query(models.model.AIModelPorvider).filter(
        models.model.AIModelPorvider.id.in_(provider_ids_to_delete)
    ).update(
        {models.model.AIModelPorvider.delete_at: now},
        synchronize_session="fetch"
    )

    db.query(models.model.UserAIModelProvider).filter(
        models.model.UserAIModelProvider.ai_model_provider_id.in_(provider_ids_to_delete),
        models.model.UserAIModelProvider.user_id == user_id
    ).update(
        {models.model.UserAIModelProvider.delete_at: now},
        synchronize_session="fetch"
    )

    db.flush()