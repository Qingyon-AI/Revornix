from pydantic import ConfigDict
from .base import BaseModel

class DocumentTranscribeTask(BaseModel):
    status: int
    transcribed_text: str | None

class DocumentConvertTask(BaseModel):
    status: int
    md_file_name: str | None

class DocumentSummarizeTask(BaseModel):
    status: int
    summary: str | None

class DocumentEmbeddingTask(BaseModel):
    status: int

class DocumentGraphTask(BaseModel):
    status: int

class DocumentProcessTask(BaseModel):
    status: int

class DocumentPodcastTask(BaseModel):
    status: int
    podcast_file_name: str | None

class DocumentOverrideProperty(BaseModel):
    title: str | None = None
    description: str | None = None
    cover: str | None = None

class SectionPodcastTask(BaseModel):
    status: int
    podcast_file_name: str | None

class SectionProcessTask(BaseModel):
    status: int
