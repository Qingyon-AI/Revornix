from typing import Protocol

class RemoteFileServiceProtocol(Protocol):
    
    def __init__(self):
        pass
        
    async def auth(self) -> None:
        raise NotImplementedError("Method not implemented")
    
    async def get_file_content_by_file_path(self, file_path: str) -> dict:
        raise NotImplementedError("Method not implemented")
    
    async def upload_file_to_path(self, file_path: str, file, content_type: str | None = None) -> dict:
        raise NotImplementedError("Method not implemented")
    
    async def upload_raw_content_to_path(self, file_path: str, content: bytes, content_type: str | None = None) -> dict:
        raise NotImplementedError("Method not implemented")
    
    async def delete_file(self, file_path) -> dict:
        raise NotImplementedError("Method not implemented")

    async def list_files(self) -> dict:
        raise NotImplementedError("Method not implemented")