from pydantic import BaseModel, ConfigDict

class DocumentLabel(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
