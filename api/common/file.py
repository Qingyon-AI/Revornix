from common.logger import exception_logger, format_log_message
from proxy.file_system_proxy import FileSystemProxy


async def get_remote_file_signed_url(
    user_id: int,
    file_name: str,
):
    """Get a signed public URL for a file in the remote filesystem."""

    try:
        file_service = await FileSystemProxy.create(
            user_id=user_id,
        )
        if file_service is None:
            raise RuntimeError("Failed to get the file_service")

        return file_service.presign_get_url(file_name)
    except Exception as e:
        exception_logger.error(
            format_log_message(
                "remote_file_signed_url_failed",
                user_id=user_id,
                file_name=file_name,
                error=e,
            )
        )
        raise
