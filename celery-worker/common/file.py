from data.sql.base import session_scope
from common.logger import exception_logger
from proxy.file_system_proxy import FileSystemProxy


async def get_remote_file_signed_url(
    user_id: int,
    file_name: str
):
    """获取远程文件系统中的文件的公网访问URL
    """

    db = session_scope()
    try:
        file_service = await FileSystemProxy.create(
            user_id=user_id,
        )
        if file_service is None:
            raise Exception("Failed to get the file_service")

        return file_service.presign_get_url(file_name)
    except Exception as e:
        exception_logger.error(f"There is something wrong while getting the remote file signed url: {e}")
        raise
    finally:
        db.close()
