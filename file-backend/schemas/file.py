from pydantic import BaseModel

class FileUploadResponse(BaseModel):
    file_name: str
    saved_to: str
    
class RawContentUploadRequest(BaseModel):
    content: str
    path: str
    
class FileDataRequest(BaseModel):
    path: str