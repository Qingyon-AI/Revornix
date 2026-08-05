from enum import Enum

from pydantic import Field
from .base import BaseModel


class GraphMode(str, Enum):
    KNOWLEDGE = "knowledge"
    DOCUMENT = "document"


class NodeSource(BaseModel):
    doc_id: int
    doc_title: str | None = None
    chunk_id: str | None = None


class Node(BaseModel):
    id: str
    text: str
    degree: int
    kind: str = "entity"
    sources: list[NodeSource] = Field(default_factory=list)

class Edge(BaseModel):
    src_node: str
    tgt_node: str
    weight: int | None = None

class GraphResponse(BaseModel):
    nodes: list[Node]
    edges: list[Edge]

class GraphSearchRequest(BaseModel):
    mode: GraphMode = GraphMode.KNOWLEDGE

class DocumentGraphRequest(BaseModel):
    document_id: int
    mode: GraphMode = GraphMode.KNOWLEDGE

class SectionGraphRequest(BaseModel):
    section_id: int
    mode: GraphMode = GraphMode.KNOWLEDGE
