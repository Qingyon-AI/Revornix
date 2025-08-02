from pydantic import BaseModel
from .document import DocumentInfo
from .section import SectionInfo

class SearchRssServerRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10

class RssServerInfo(BaseModel):
    id: int
    title: str
    description: str
    address: str
    create_time: str
    update_time: str
    documents: list[DocumentInfo]
    sections: list[SectionInfo]

class DeleteRssServerRequest(BaseModel):
    ids: list[int]

class AddRssServerResponse(BaseModel):
    id: int
    
class AddRssServerRequest(BaseModel):
    title: str
    description: str
    address: str
    section_ids: list[int] | None