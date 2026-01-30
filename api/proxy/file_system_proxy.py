import crud
import json
from data.sql.base import SessionLocal
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.aws_s3_remote_file_service import AWSS3RemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from file.generic_s3_remote_file_service import GenericS3RemoteFileService
from enums.file import RemoteFileService
from common.encrypt import decrypt_file_system_config
from common.logger import exception_logger

class FileSystemProxy:
    # =========================
    # Factory（唯一推荐入口）
    # =========================
    @classmethod
    async def create(
        cls,
        *,
        user_id: int
    ):
        db = SessionLocal()
        try:
            db_user = crud.user.get_user_by_id(
                db=db,
                user_id=user_id
            )
            if db_user is None:
                raise Exception("User not found")
            if db_user.default_user_file_system is None:
                raise Exception("User default file system not found")
            
            db_user_file_system = crud.file_system.get_user_file_system_by_id(
                db=db,
                user_file_system_id=db_user.default_user_file_system
            )
            if db_user_file_system is None:
                raise Exception("User file system not found")
            
            db_file_system = crud.file_system.get_file_system_by_id(
                db=db,
                file_system_id=db_user_file_system.file_system_id
            )
            if not db_file_system:
                raise Exception("File system not found")
            
            remote_file_service = None
            if db_file_system.uuid == RemoteFileService.Built_In.meta.id:
                remote_file_service = BuiltInRemoteFileService()
            elif db_file_system.uuid == RemoteFileService.AliyunOSS.meta.id:
                remote_file_service = AliyunOSSRemoteFileService()
            elif db_file_system.uuid == RemoteFileService.Generic_S3.meta.id:
                remote_file_service = GenericS3RemoteFileService()
            elif db_file_system.uuid == RemoteFileService.AWS_S3.meta.id:
                remote_file_service = AWSS3RemoteFileService()
            else:
                raise Exception("Unknown file system category")
            
            if remote_file_service is None:
                raise Exception("Remote file service not found")
            
            remote_file_service.user_id = user_id
            
            if db_user_file_system.config_json is not None:
                file_service_config = decrypt_file_system_config(
                    db_user_file_system.config_json
                )
                file_service_config = json.loads(file_service_config)
                
                remote_file_service.set_config(file_service_config)
                
            await remote_file_service.init_client()
            
            return remote_file_service
        except Exception as e:
            exception_logger.error(f'''Failed to create file system proxy: {e}''')
            raise e
        finally:
            db.close()