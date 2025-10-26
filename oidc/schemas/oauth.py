from pydantic import BaseModel

class OAuthClientAddRequest(BaseModel):
    name: str
    description: str | None = None
    redirect_uris: list[str] = []
    
class OAuthClientDeleteRequest(BaseModel):
    client_id: str
    
class OAuthClientUpdateRequest(BaseModel):
    client_id: str
    name: str | None = None
    description: str | None = None
    redirect_uris: list[str] | None = None
    
    