import models
from sqlalchemy.orm import Session

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

def search_ai_model_providers(db: Session, keyword: str = None):
    query = db.query(models.model.AIModelPorvider).filter(models.model.AIModelPorvider.delete_at == None)
    
    if keyword and len(keyword.strip()) > 0:
        query = query.filter(models.model.AIModelPorvider.name.ilike(f"%{keyword}%"))
    
    return query.all()
