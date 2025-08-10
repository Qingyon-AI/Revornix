from pydantic import BaseModel, field_serializer
from .section import SectionInfo
from datetime import datetime
from schemas.attachment import AttachmentInfo
from protocol.remote_file_service import RemoteFileServiceProtocol

class GetRssServerDocumentRequest(BaseModel):
    rss_id: int
    start: int | None = None
    limit: int = 10
    keyword: str | None = None
    desc: bool = True

class GetRssServerDetailRequest(BaseModel):
    rss_id: int
    
class UpdateRssServerRequest(BaseModel):
    rss_id: int
    title: str | None = None
    description: str | None = None
    cover: str | None = None
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
    cover: AttachmentInfo | None = None
    create_time: datetime
    update_time: datetime
    class Config:
        from_attributes = True
        
class RssDocumentInfo(BaseModel):
    id: int
    title: str
    description: str
    category: int
    cover: str | None = None
    from_plat: str
    create_time: datetime
    update_time: datetime
    class Config:
        from_attributes = True

class RssServerInfo(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    cover: str | None = None
    address: str
    create_time: datetime
    update_time: datetime
    documents: list[RssDocumentInfo] = []
    sections: list[SectionInfo] = []
    class Config:
        from_attributes = True
    @field_serializer('cover')
    def cover_serializer(self, v: str) -> str:
        if v is None:
            return None
        if v.startswith('http://') or v.startswith('https://'):
            return v
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=self.user_id)
        return f'{url_prefix}/{v}'
        

class DeleteRssServerRequest(BaseModel):
    ids: list[int]

class AddRssServerResponse(BaseModel):
    id: int
    
class AddRssServerRequest(BaseModel):
    title: str
    description: str | None = None
    cover: str | None = None
    address: str
    section_ids: list[int] | None