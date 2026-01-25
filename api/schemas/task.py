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
    @field_serializer("md_file_name")
    def serializer_md_file_name(self, v: str | None):
        if v is None:
            return None
        if v.startswith(("http://", "https://")):
            return v
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=self.creator_id)
        return f'{url_prefix}/{v}'
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
    @field_serializer("podcast_file_name")
    def serializer_podcast_file_name(self, v: str | None):
        if v is None:
            return None
        if v.startswith(("http://", "https://")):
            return v
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=self.creator_id)
        return f'{url_prefix}/{v}'
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
    @field_serializer("podcast_file_name")
    def serializer_podcast_file_name(self, v: str | None):
        if v is None:
            return None
        if v.startswith(("http://", "https://")):
            return v
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=self.creator_id)
        return f'{url_prefix}/{v}'
    class Config:
        from_attributes = True

class SectionProcessTask(BaseModel):
    status: int
    class Config:
        from_attributes = True
