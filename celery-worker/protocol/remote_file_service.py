from typing import Protocol

class RemoteFileServiceProtocol(Protocol):
    
    def __init__(self, 
                 file_service_uuid: int,
                 user_id: int | None = None,
                 file_service_name: str | None = None, 
                 file_service_name_zh: str | None = None, 
                 file_service_description: str | None = None, 
                 file_service_description_zh: str | None = None, 
                 file_service_demo_config: str | None = None,
                 file_service_config: str | None = None):
        self.user_id = user_id
        self.file_service_uuid = file_service_uuid
        self.file_service_name = file_service_name
        self.file_service_name_zh = file_service_name_zh
        self.file_service_description = file_service_description
        self.file_service_description_zh = file_service_description_zh
        self.file_service_demo_config = file_service_demo_config
        self.file_service_config = file_service_config
        
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