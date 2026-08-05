from datetime import datetime

from pydantic import ConfigDict
from schemas.base import BaseModel


class DocumentInfo(BaseModel):
    id: int
    creator_id: int
    title: str
    description: str | None
    update_time: datetime | None
    create_time: datetime

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

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
    context_hash: str | None = None
    context_sample: str | None = None
    context_embedding: list[float] | None = None

class CommunityInfo(BaseModel):
    id: str
    size: int
