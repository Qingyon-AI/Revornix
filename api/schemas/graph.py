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
    
class GraphRequest(BaseModel):
    doc_id: int | None = None