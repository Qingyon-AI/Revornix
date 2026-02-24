from pydantic import BaseModel, Field


class NodeSource(BaseModel):
    doc_id: int
    doc_title: str | None = None
    chunk_id: str | None = None


class Node(BaseModel):
    id: str
    text: str
    degree: int
    sources: list[NodeSource] = Field(default_factory=list)

class Edge(BaseModel):
    src_node: str
    tgt_node: str

class GraphResponse(BaseModel):
    nodes: list[Node]
    edges: list[Edge]

class DocumentGraphRequest(BaseModel):
    document_id: int

class SectionGraphRequest(BaseModel):
    section_id: int
