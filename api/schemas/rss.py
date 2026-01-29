from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer


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
    cover: str | None = None
    create_time: datetime
    update_time: datetime | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
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
    update_time: datetime | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
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
    update_time: datetime | None
    documents: list[RssDocumentInfo] = []
    sections: list[RssSectionInfo] = []
    class Config:
        from_attributes = True


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
