from pydantic import BaseModel

class DocumentInfo(BaseModel):
    id: int
    creator_id: int
    title: str
    description: str
    updated_at: str
    created_at: str

class ChunkInfo(BaseModel):
    id: str
    embedding: list[float] | None = None
    text: str
    idx: int
    doc_id: int
    
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