from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer


class DocumentInfo(BaseModel):
    id: int
    creator_id: int
    title: str
    description: str | None
    update_time: datetime | None
    create_time: datetime
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    class Config:
        from_attributes = True

class ChunkInfo(BaseModel):
    id: str
    text: str
    idx: int
    doc_id: int
    summary: str | None = None
    embedding: list[float] | None = None

class RelationInfo(BaseModel):
    src_node: str
    tgt_node: str
    relation_type: str

class EntityInfo(BaseModel):
    id: str
    text: str
    chunks: list[str]
    entity_type: str

class CommunityInfo(BaseModel):
    id: str
    size: int
