from pydantic import BaseModel

class Node(BaseModel):
    id: str
    text: str
    degree: int
    
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