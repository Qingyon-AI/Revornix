import crud
import json
from typing import Protocol
from common.sql import SessionLocal
from config.file_system import FILE_SYSTEM_SERVER_PUBLIC_URL
from enums.file import RemoteFileServiceUUID

class RemoteFileServiceProtocol(Protocol):

    file_service_uuid: str
    file_service_name: str
    file_service_name_zh: str
    file_service_description: str | None
    file_service_description_zh: str | None
    file_service_demo_config: str | None
    file_service_config: str | None
    
    def __init__(
        self, 
        file_service_uuid: str,
        file_service_name: str, 
        file_service_name_zh: str, 
        file_service_description: str | None = None, 
        file_service_description_zh: str | None = None, 
        file_service_demo_config: str | None = None,
        file_service_config: str | None = None
    ):
        self.file_service_uuid = file_service_uuid
        self.file_service_name = file_service_name
        self.file_service_name_zh = file_service_name_zh
        self.file_service_description = file_service_description
        self.file_service_description_zh = file_service_description_zh
        self.file_service_demo_config = file_service_demo_config
        self.file_service_config = file_service_config

    @staticmethod
    def get_user_file_system_url_prefix(
        user_id: int
    ):
        """本函数默认用来返回任何前端需要url_prefix的情况，注意这个url_prefix是公网访问文件系统的url_prefix
        """
        db = SessionLocal()
        try:
            db_user = crud.user.get_user_by_id(
                db=db, 
                user_id=user_id
            )
            if db_user is None:
                raise Exception("The user who you want to get his/her file system url prefix is None")
            if db_user.default_user_file_system is None:
                raise Exception("The user who you want to get his/her file system url prefix havn't set default file system")
            db_user_file_system = crud.file_system.get_user_file_system_by_id(
                db=db,
                user_file_system_id=db_user.default_user_file_system
            )
            if db_user_file_system is None:
                raise Exception("There is something wrong with the file system for the user who you want to get his/her file system url prefix")
            db_file_system = crud.file_system.get_file_system_by_id(
                db=db,
                file_system_id=db_user_file_system.file_system_id
            )
            if db_file_system is None:
                raise Exception("There is something wrong with the file system for the user who you want to get his/her file system url prefix")

            if db_file_system.uuid == RemoteFileServiceUUID.Built_In.value:
                return f'{FILE_SYSTEM_SERVER_PUBLIC_URL}/{db_user.uuid}'
            elif db_file_system.uuid == RemoteFileServiceUUID.AliyunOSS.value:
                config_str = db_user_file_system.config_json
            elif db_file_system.uuid == RemoteFileServiceUUID.AWS_S3.value:
                config_str = db_user_file_system.config_json
            elif db_file_system.uuid == RemoteFileServiceUUID.Generic_S3.value:
                config_str = db_user_file_system.config_json
            else:
                raise Exception("There is something wrong with the file system for the user who you want to get his/her file system url prefix")
            if config_str is None:
                raise Exception("There is something wrong with the file system for the user who you want to get his/her file system url prefix")
            config = json.loads(config_str)
            return config.get("url_prefix")
        except Exception as e:
            raise Exception("There is something wrong with the file system for the user who you want to get his/her file system url prefix")
        finally:
            db.close()
        
    async def init_client_by_user_file_system_id(
        self, 
        user_file_system_id: int
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
        file, 
        content_type: str | None = None
    ) -> dict:
        raise NotImplementedError("Method not implemented")
    
    async def upload_raw_content_to_path(
        self, 
        file_path: str, 
        content: bytes, 
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