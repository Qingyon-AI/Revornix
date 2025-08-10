from pydantic import BaseModel

class MCPServerDetailRequest(BaseModel):
    id: int

class MCPServerCreateRequest(BaseModel):
    name: str
    category: int
    url: str | None = None
    cmd: str | None = None
    args: str | None = None
    env: str | None = None
    headers: str | None = None
    
class MCPServerUpdateRequest(BaseModel):
    id: int
    category: int | None = None
    name: str | None = None
    enable: bool | None = None
    url: str | None = None
    cmd: str | None = None
    args: str | None = None
    headers: str | None = None
    env: str | None = None
    
class MCPServerDeleteRequest(BaseModel):
    id: int
    
class MCPServerInfo(BaseModel):
    id: int
    name: str
    enable: bool
    category: int
    url: str | None = None
    cmd: str | None = None
    args: str | None = None
    env: str | None = None
    headers: str | None = None
    
class MCPServerSearchRequest(BaseModel):
    keyword: str | None = None
    
class MCPServerSearchResponse(BaseModel):
    data: list[MCPServerInfo]