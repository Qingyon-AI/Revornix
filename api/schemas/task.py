from pydantic import BaseModel, ConfigDict

class DocumentTranscribeTask(BaseModel):
    status: int
    transcribed_text: str | None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class DocumentConvertTask(BaseModel):
    status: int
    md_file_name: str | None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class DocumentSummarizeTask(BaseModel):
    status: int
    summary: str | None

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

class DocumentPodcastTask(BaseModel):
    status: int
    podcast_file_name: str | None

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
    podcast_file_name: str | None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class SectionProcessTask(BaseModel):
    status: int

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
