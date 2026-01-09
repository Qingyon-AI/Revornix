from pydantic import BaseModel

class Label(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True