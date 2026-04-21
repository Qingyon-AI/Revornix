from datetime import datetime

from pydantic import ConfigDict
from .base import BaseModel

class DocumentTranscribeTask(BaseModel):
    status: int
    transcribed_text: str | None
    create_time: datetime | None = None
    update_time: datetime | None = None

class DocumentConvertTask(BaseModel):
    status: int
    md_file_name: str | None
    create_time: datetime | None = None
    update_time: datetime | None = None

class DocumentSummarizeTask(BaseModel):
    status: int
    summary: str | None
    create_time: datetime | None = None
    update_time: datetime | None = None

class DocumentEmbeddingTask(BaseModel):
    status: int
    create_time: datetime | None = None
    update_time: datetime | None = None

class DocumentGraphTask(BaseModel):
    status: int
    create_time: datetime | None = None
    update_time: datetime | None = None

class DocumentProcessTask(BaseModel):
    status: int
    create_time: datetime | None = None
    update_time: datetime | None = None

class DocumentPodcastTask(BaseModel):
    status: int
    podcast_file_name: str | None
    podcast_script_file_name: str | None = None
    create_time: datetime | None = None
    update_time: datetime | None = None

class DocumentOverrideProperty(BaseModel):
    title: str | None = None
    description: str | None = None
    cover: str | None = None

class SectionPodcastTask(BaseModel):
    status: int
    podcast_file_name: str | None
    podcast_script_file_name: str | None = None
    create_time: datetime | None = None
    update_time: datetime | None = None

class SectionProcessTask(BaseModel):
    status: int
    create_time: datetime | None = None
    update_time: datetime | None = None
