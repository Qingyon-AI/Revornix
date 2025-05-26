from pydantic import BaseModel

class MCPServerCreateRequest(BaseModel):
    name: str
    category: int
    address: str | None = None
    cmd: str | None = None
    args: str | None = None
    
class MCPServerUpdateRequest(BaseModel):
    name: str | None = None
    address: str | None = None
    cmd: str | None = None
    args: str | None = None
    
class MCPServerDeleteRequest(BaseModel):
    id: int