import json
from typing import Any, IO


class RemoteFileServiceProtocol():
    
    def __init__(
        self, 
        file_service_uuid: str,
        file_service_name: str, 
        file_service_name_zh: str, 
        file_service_description: str | None = None, 
        file_service_description_zh: str | None = None, 
        file_service_demo_config: str | None = None,
        file_service_config: str | None = None,
        user_id: int | None = None
    ):
        self.file_service_uuid = file_service_uuid
        self.file_service_name = file_service_name
        self.file_service_name_zh = file_service_name_zh
        self.file_service_description = file_service_description
        self.file_service_description_zh = file_service_description_zh
        self.file_service_demo_config = file_service_demo_config
        self.file_service_config = file_service_config
        self.user_id = user_id
        
    def set_config(self, config: dict[str, Any]) -> None:
        self.file_service_config = json.dumps(config)
    
    def get_config(self) -> dict[str, Any] | None:
        if self.file_service_config is None:
            return None
        return json.loads(self.file_service_config)
        
    async def init_client(
        self
    ) -> None:
        raise NotImplementedError("Method not implemented")
    
    async def get_file_content_by_file_path(
        self, 
        file_path: str
    ) -> dict:
        raise NotImplementedError("Method not implemented")
    
    async def upload_file_to_path(
        self, 
        file_path: str, 
        file: IO[bytes],
        content_type: str | None = None
    ) -> dict:
        raise NotImplementedError("Method not implemented")
    
    async def upload_raw_content_to_path(
        self, 
        file_path: str, 
        content: bytes | str, 
        content_type: str | None = None
    ) -> dict:
        raise NotImplementedError("Method not implemented")
    
    async def delete_file(
        self, 
        file_path
    ) -> dict:
        raise NotImplementedError("Method not implemented")

    async def list_files(
        self
    ) -> dict:
        raise NotImplementedError("Method not implemented")