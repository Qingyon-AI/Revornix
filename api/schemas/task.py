from pydantic import BaseModel, field_serializer

from protocol.remote_file_service import RemoteFileServiceProtocol

class DocumentTranscribeTask(BaseModel):
    creator_id: int
    status: int
    transcribed_text: str | None
    class Config:
        from_attributes = True

class DocumentConvertTask(BaseModel):
    creator_id: int
    status: int
    md_file_name: str | None
    class Config:
        from_attributes = True

class DocumentSummarizeTask(BaseModel):
    creator_id: int
    status: int
    summary: str | None
    class Config:
        from_attributes = True

class DocumentEmbeddingTask(BaseModel):
    creator_id: int
    status: int
    class Config:
        from_attributes = True

class DocumentGraphTask(BaseModel):
    creator_id: int
    status: int
    class Config:
        from_attributes = True

class DocumentProcessTask(BaseModel):
    creator_id: int
    status: int
    class Config:
        from_attributes = True

class DocumentPodcastTask(BaseModel):
    creator_id: int
    status: int
    podcast_file_name: str | None
    class Config:
        from_attributes = True

class DocumentOverrideProperty(BaseModel):
    title: str | None = None
    description: str | None = None
    cover: str | None = None

class SectionOverrideProperty(BaseModel):
    title: str | None = None
    description: str | None = None
    cover: str | None = None

class SectionPodcastTask(BaseModel):
    creator_id: int
    status: int
    podcast_file_name: str | None
    class Config:
        from_attributes = True

class SectionProcessTask(BaseModel):
    status: int
    class Config:
        from_attributes = True
