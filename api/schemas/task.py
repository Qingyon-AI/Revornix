from pydantic import BaseModel

class DocumentTransformTask(BaseModel):
    status: int
    class Config:
        from_attributes = True 