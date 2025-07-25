import crud
import json
import os
from typing import Protocol
from common.sql import SessionLocal
from config.file_system import FILE_SYSTEM_SERVER_PUBLIC_URL, FILE_SYSTEM_SERVER_PRIVATE_URL

class RemoteFileServiceProtocol(Protocol):
    
    def __init__(self, 
                 file_service_uuid: int,
                 file_service_name: str | None = None, 
                 file_service_name_zh: str | None = None, 
                 file_service_description: str | None = None, 
                 file_service_description_zh: str | None = None, 
                 file_service_demo_config: str | None = None,
                 file_service_config: str | None = None):
        self.file_service_uuid = file_service_uuid
        self.file_service_name = file_service_name
        self.file_service_name_zh = file_service_name_zh
        self.file_service_description = file_service_description
        self.file_service_description_zh = file_service_description_zh
        self.file_service_demo_config = file_service_demo_config
        self.file_service_config = file_service_config
        
    # 本函数默认用来返回任何前端需要url_prefix的情况，如果传参数private为True，则返回docker内访问文件系统的url_prefix
    @staticmethod
    def get_user_file_system_url_prefix(user_id: int, private: bool | None = False) -> str:
        db = SessionLocal()
        db_user = crud.user.get_user_by_id(db=db, 
                                           user_id=user_id)
        db_user_file_system = crud.file_system.get_user_file_system_by_id(db=db,
                                                                          user_file_system_id=db_user.default_user_file_system)
        if db_user_file_system is None:
            raise Exception("User file system is None")
        db_file_system = crud.file_system.get_file_system_by_id(db=db,
                                                                file_system_id=db_user_file_system.file_system_id)
        
        if db_file_system is None:
            raise Exception("File system is None")
        if db_file_system.id == 1:
            return f'{FILE_SYSTEM_SERVER_PUBLIC_URL if not private else FILE_SYSTEM_SERVER_PRIVATE_URL}/{db_user.uuid}'
        elif db_file_system.id == 2:
            config_str = db_user_file_system.config_json
            if config_str is None:
                raise Exception("User file system config is None")
            config = json.loads(config_str)
            return f'{config.get("url_prefix")}'
        
    async def init_client_by_user_file_system_id(self, user_file_system_id: int) -> None:
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