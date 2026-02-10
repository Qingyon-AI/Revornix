from pydantic import BaseModel, ConfigDict

class DocumentConvertTask(BaseModel):
    status: int

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
        
class DocumentEmbeddingTask(BaseModel):
    status: int

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
        
class DocumentGraphTask(BaseModel):
    status: int

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
        
class DocumentProcessTask(BaseModel):
    status: int

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
        
class DocumentOverrideProperty(BaseModel):
    title: str | None = None
    description: str | None = None
    cover: str | None = None

class SectionPodcastTask(BaseModel):
    status: int

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
