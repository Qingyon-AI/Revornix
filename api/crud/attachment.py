import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session

def create_attachment(db: Session, 
                      name: str, 
                      description: str):
    now = datetime.now(timezone.utc)
    attachment = models.attachment.Attachment(name=name, 
                                              description=description,
                                              create_time=now,
                                              update_time=now)
    db.add(attachment)
    db.flush()
    return attachment

def get_attachment_by_id(db: Session, 
                         attachment_id: int):
    query = db.query(models.attachment.Attachment)
    query = query.filter(models.attachment.Attachment.id == attachment_id,
                         models.attachment.Attachment.delete_at == None)
    return query.first()
    
def get_attachment_by_name(db: Session,
                           name: str):
    query = db.query(models.attachment.Attachment)
    query = query.filter(models.attachment.Attachment.name == name,
                         models.attachment.Attachment.delete_at == None)
    return query.first()

def delete_attachment_by_id(db: Session, 
                            attachment_id: int):
    delete_time = datetime.now(timezone.utc)
    query = db.query(models.attachment.Attachment)
    query = query.filter(models.attachment.Attachment.id == attachment_id,
                         models.attachment.Attachment.delete_at == None)
    query = query.update({models.attachment.Attachment.delete_at: delete_time})
    db.flush()
    
def delete_attachment_by_name(db: Session, 
                              name: int):
    delete_time = datetime.now(timezone.utc)
    query = db.query(models.attachment.Attachment)
    query = query.filter(models.attachment.Attachment.name == name,
                         models.attachment.Attachment.delete_at == None)
    query = query.update({models.attachment.Attachment.delete_at: delete_time})
    db.flush()
    