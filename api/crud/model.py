import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session

def create_ai_model_provider(db: Session, user_id: int, name: str, description: str, api_key: str, api_url: str):
    """
    Create a new AI model provider.
    """
    now = datetime.now(timezone.utc)
    new_provider = models.model.AIModelPorvider(
        name=name,
        user_id=user_id,
        description=description,
        create_time=now,
        update_time=now,
        api_key=api_key,
        api_url=api_url
    )
    db.add(new_provider)
    db.flush()
    return new_provider

def create_ai_model(db: Session, user_id: int, name: str, description: str, provider_id: int, api_key: str, api_url: str):
    """
    Create a new AI model.
    """
    now = datetime.now(timezone.utc)
    new_model = models.model.AIModel(
        user_id=user_id,
        name=name,
        description=description,
        provider_id=provider_id,
        api_key=api_key,
        api_url=api_url,
        create_time=now,
        update_time=now
    )
    db.add(new_model)
    db.flush()
    return new_model

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
    
def search_ai_models(db: Session, user_id: int, keyword: str = None, provider_id: int = None):
    query = db.query(models.model.AIModel).filter(models.model.AIModel.user_id == user_id,
                                                  models.model.AIModel.delete_at == None)
    
    if keyword and len(keyword.strip()) > 0:
        query = query.filter(models.model.AIModel.name.ilike(f"%{keyword}%"))
    
    if provider_id:
        query = query.filter(models.model.AIModel.provider_id == provider_id)
    
    return query.all()

def search_ai_model_providers(db: Session, user_id: int, keyword: str = None):
    query = db.query(models.model.AIModelPorvider).filter(models.model.AIModelPorvider.delete_at == None,
                                                          models.model.AIModelPorvider.user_id == user_id)
    
    if keyword and len(keyword.strip()) > 0:
        query = query.filter(models.model.AIModelPorvider.name.ilike(f"%{keyword}%"))
    
    return query.all()

def delete_ai_models(db: Session, model_ids: list[int]):
    """
    Delete AI models by their IDs.
    """
    now = datetime.now(timezone.utc)
    db.query(models.model.AIModel).filter(models.model.AIModel.id.in_(model_ids)).update({
        models.model.AIModel.delete_at: now
    })
    db.flush()
    
def delete_ai_model_providers(db: Session, user_id: int, provider_ids: list[int]):
    """
    Delete AI model providers by their IDs.
    """
    # TODO
    now = datetime.now(timezone.utc)
    db_providers = db.query(models.model.AIModelPorvider).filter(models.model.AIModelPorvider.id.in_(provider_ids),
                                                                 models.model.AIModelPorvider.user_id == user_id)
    db_providers.update({
        models.model.AIModelPorvider.delete_at: now
    })
    db.flush()