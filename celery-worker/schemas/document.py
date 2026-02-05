from pydantic import BaseModel

class DocumentLabel(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True