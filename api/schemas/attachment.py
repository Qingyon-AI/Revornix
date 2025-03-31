from pydantic import BaseModel

class AttachmentCreateRequest(BaseModel):
    name: str
    description: str
    
class AttachmentCreateResponse(BaseModel):
    id: int
    name: str
    description: str
    
class AttachmentInfo(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True 