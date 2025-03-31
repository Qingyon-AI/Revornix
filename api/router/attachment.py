import crud
import schemas
import models
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from common.dependencies import get_current_user, get_db

attachment_router = APIRouter()

@attachment_router.post("/create", response_model=schemas.attachment.AttachmentCreateResponse)
async def create_attachment(attachment_create_request: schemas.attachment.AttachmentCreateRequest,
                            db: Session = Depends(get_db),
                            user: models.user.User = Depends(get_current_user)):
    attachment = crud.attachment.create_attachment(db=db, 
                                                   name=attachment_create_request.name, 
                                                   description=attachment_create_request.description)
    res = schemas.attachment.AttachmentCreateResponse(id=attachment.id, 
                                                      name=attachment.name, 
                                                      description=attachment.description)
    db.commit()
    return res