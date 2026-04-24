import asyncio
import crud
import json
from data.sql.base import async_session_context
from file.aliyun_oss_remote_file_service import AliyunOSSRemoteFileService
from file.aws_s3_remote_file_service import AWSS3RemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from file.generic_s3_remote_file_service import GenericS3RemoteFileService
from enums.file import RemoteFileService
from common.encrypt import decrypt_file_system_config
from common.logger import exception_logger
from protocol.remote_file_service import RemoteFileServiceProtocol

class FileSystemProxy:
    # =========================
    # Factory（唯一推荐入口）
    # =========================
    @staticmethod
    async def _build_remote_file_service(
        *,
        user_id: int,
        db_user_file_system,
        db_file_system,
    ) -> RemoteFileServiceProtocol:
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

        remote_file_service.user_id = user_id
        if db_user_file_system.config_json is not None:
            file_service_config = decrypt_file_system_config(
                db_user_file_system.config_json
            )
            file_service_config = json.loads(file_service_config)
            remote_file_service.set_config(file_service_config)
        await remote_file_service.init_client()
        return remote_file_service

    @classmethod
    async def create(
        cls,
        *,
        user_id: int
    ) -> RemoteFileServiceProtocol:
        try:
            async with async_session_context() as db:
                db_user = await crud.user.get_user_by_id_async(
                    db=db,
                    user_id=user_id
                )
                if db_user is None:
                    raise Exception("User not found")
                if db_user.default_user_file_system is None:
                    raise Exception("User default file system not found")
                
                db_user_file_system = await crud.file_system.get_user_file_system_by_id_async(
                    db=db,
                    user_file_system_id=db_user.default_user_file_system
                )
                if db_user_file_system is None:
                    raise Exception("User file system not found")
                
                db_file_system = await crud.file_system.get_file_system_by_id_async(
                    db=db,
                    file_system_id=db_user_file_system.file_system_id
                )
                if not db_file_system:
                    raise Exception("File system not found")
            
            return await cls._build_remote_file_service(
                user_id=user_id,
                db_user_file_system=db_user_file_system,
                db_file_system=db_file_system,
            )
        except Exception as e:
            exception_logger.error(f'''Failed to create file system proxy: {e}''')
            raise

    @classmethod
    async def create_for_users(
        cls,
        *,
        user_ids: list[int],
    ) -> list[RemoteFileServiceProtocol]:
        if not user_ids:
            return []
        normalized_user_ids = list(dict.fromkeys(user_ids))
        async with async_session_context() as db:
            db_users = await crud.user.get_users_by_ids_async(
                db=db,
                user_ids=normalized_user_ids,
            )
            user_by_id = {user.id: user for user in db_users}
            if len(user_by_id) != len(normalized_user_ids):
                missing_user_ids = sorted(set(normalized_user_ids) - set(user_by_id))
                raise Exception(f"Users not found: {missing_user_ids}")

            user_file_system_ids = []
            for user_id in normalized_user_ids:
                db_user = user_by_id[user_id]
                if db_user.default_user_file_system is None:
                    raise Exception(f"User default file system not found: {user_id}")
                user_file_system_ids.append(db_user.default_user_file_system)

            db_user_file_systems = await crud.file_system.get_user_file_systems_by_ids_async(
                db=db,
                user_file_system_ids=list(dict.fromkeys(user_file_system_ids)),
            )
            user_file_system_by_id = {
                user_file_system.id: user_file_system for user_file_system in db_user_file_systems
            }

            file_system_ids = list(
                dict.fromkeys(
                    user_file_system.file_system_id
                    for user_file_system in db_user_file_systems
                )
            )
            db_file_systems = await crud.file_system.get_file_systems_by_ids_async(
                db=db,
                file_system_ids=file_system_ids,
            )
            file_system_by_id = {
                file_system.id: file_system for file_system in db_file_systems
            }

        return await asyncio.gather(
            *[
                cls._build_remote_file_service(
                    user_id=user_id,
                    db_user_file_system=user_file_system_by_id[user_by_id[user_id].default_user_file_system],
                    db_file_system=file_system_by_id[
                        user_file_system_by_id[user_by_id[user_id].default_user_file_system].file_system_id
                    ],
                )
                for user_id in user_ids
            ]
        )
