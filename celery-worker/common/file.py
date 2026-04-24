from common.logger import exception_logger, format_log_message
from proxy.file_system_proxy import FileSystemProxy


async def get_remote_file_signed_urls(
    items: list[tuple[int, str]],
) -> list[str]:
    if not items:
        return []

    services_by_user_id = {}
    try:
        user_ids = list(dict.fromkeys(user_id for user_id, _ in items))
        services = await FileSystemProxy.create_for_users(user_ids=user_ids)
        services_by_user_id = dict(zip(user_ids, services, strict=False))
        return [
            services_by_user_id[user_id].presign_get_url(file_name)
            for user_id, file_name in items
        ]
    except Exception as e:
        exception_logger.error(
            format_log_message(
                "remote_file_signed_urls_failed",
                user_ids=list(services_by_user_id.keys()) or list(dict.fromkeys(user_id for user_id, _ in items)),
                file_count=len(items),
                error=e,
            )
        )
        raise


async def get_remote_file_signed_url(
    user_id: int,
    file_name: str
):
    signed_urls = await get_remote_file_signed_urls([(user_id, file_name)])
    return signed_urls[0]
