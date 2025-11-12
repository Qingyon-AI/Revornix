import models
from sqlalchemy.orm import Session
from common.encrypt import decrypt_api_key

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

def get_user_ai_model_by_id_decrypted(
    db: Session, 
    user_id: int, 
    ai_model_id: int
):
    """
    获取用户 AI 模型，并解密 API Key
    """
    record = db.query(models.model.UserAIModel).filter(
        models.model.UserAIModel.user_id == user_id,
        models.model.UserAIModel.ai_model_id == ai_model_id,
        models.model.UserAIModel.delete_at == None
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
    query = db.query(models.model.AIModelPorvider)
    query = query.filter(models.model.AIModelPorvider.id == provider_id,
                         models.model.AIModelPorvider.delete_at == None)
    return query.one_or_none()

def search_ai_models_for_user_ai_model_provider(
    db: Session, 
    user_id: int, 
    keyword: str | None = None, 
    provider_id: int | None = None
):
    query = db.query(models.model.AIModel).join(models.model.UserAIModel)
    
    query = query.filter(models.model.UserAIModel.user_id == user_id,
                         models.model.AIModel.delete_at == None)
    
    if keyword and len(keyword) > 0:
        query = query.filter(models.model.AIModel.name.ilike(f"%{keyword}%"))
    
    if provider_id:
        query = query.filter(models.model.AIModel.provider_id == provider_id)
    
    return query.all()