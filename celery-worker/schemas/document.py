from pydantic import ConfigDict
from .base import BaseModel

class DocumentLabel(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
