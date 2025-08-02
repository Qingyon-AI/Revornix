from pydantic import BaseModel
from .document import DocumentInfo
from .section import SectionInfo
from datetime import datetime

class UpdateRssServerRequest(BaseModel):
    rss_id: int
    title: str | None = None
    description: str | None = None
    address: str | None = None
    section_ids: list[int] | None = None

class SearchRssServerRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    
class RssSectionInfo(BaseModel):
    id: int
    title: str
    description: str
    create_time: datetime
    update_time: datetime
    class Config:
        from_attributes = True
        
class RssDocumentInfo(BaseModel):
    id: int
    title: str
    description: str
    create_time: datetime
    update_time: datetime
    class Config:
        from_attributes = True

class RssServerInfo(BaseModel):
    id: int
    title: str
    description: str
    address: str
    create_time: datetime
    update_time: datetime
    documents: list[DocumentInfo] = []
    sections: list[SectionInfo] = []
    class Config:
        from_attributes = True

class DeleteRssServerRequest(BaseModel):
    ids: list[int]

class AddRssServerResponse(BaseModel):
    id: int
    
class AddRssServerRequest(BaseModel):
    title: str
    description: str
    address: str
    section_ids: list[int] | None