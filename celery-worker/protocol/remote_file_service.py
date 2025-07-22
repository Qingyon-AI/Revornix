import crud
import json
import os
from typing import Protocol
from common.sql import SessionLocal

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
        
    @staticmethod
    def get_user_file_system_url_prefix(user_id: int) -> str:
        db = SessionLocal()
        db_user = crud.user.get_user_by_id(db=db, 
                                           user_id=user_id)
        if db_user.default_file_system == 1:
            return f'{os.environ.get("FILE_SERVER_URL")}/{db_user.uuid}'
        elif db_user.default_file_system == 2:
            db_user_file_system = crud.file_system.get_user_file_system_by_user_id_and_file_system_id(db=db,
                                                                                                    user_id=1,
                                                                                                    file_system_id=db_user.default_file_system)
            config_str = db_user_file_system.config_json
            if config_str is None:
                raise Exception("User file system config is None")
            config = json.loads(config_str)
            return f'{config.get("url_prefix")}'
        
    def get_file_service_config(self) -> dict:
        if self.file_service_config is not None:
            return json.loads(self.file_service_config)
        else:
            db = SessionLocal()
            db_file_system = crud.file_system.get_file_system_by_uuid(db=db, uuid=self.file_service_uuid)
            db_user_file_system = crud.file_system.get_user_file_system_by_user_id_and_file_system_id(db=db,
                                                                                                      user_id=self.user_id,
                                                                                                      file_system_id=db_file_system.id)
            self.engine_config = db_user_file_system.config_json
            return json.loads(self.engine_config)
        
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