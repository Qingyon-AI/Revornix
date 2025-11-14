from pydantic import BaseModel

class NecessaryDocumentData(BaseModel):
    url: str | None
    file_name: str | None
    content: str | None

class DocumentTransformTask(BaseModel):
    status: int
    class Config:
        from_attributes = True 
        
class DocumentEmbeddingTask(BaseModel):
    status: int
    class Config:
        from_attributes = True
        
class DocumentGraphTask(BaseModel):
    status: int
    class Config:
        from_attributes = True
        
class DocumentProcessTask(BaseModel):
    status: int
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
    status: int
    class Config:
        from_attributes = True