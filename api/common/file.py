import crud
from common.logger import exception_logger, format_log_message
from data.sql.base import async_session_context
from proxy.file_system_proxy import FileSystemProxy


async def get_remote_file_signed_urls(
    items: list[tuple[int, str]],
) -> list[str]:
    if not items:
        return []

    services_by_key = {}
    try:
        async with async_session_context() as db:
            stored_files_by_key = await crud.file_system.get_stored_files_by_owner_paths_async(
                db=db,
                items=items,
            )

        fallback_user_ids = list(
            dict.fromkeys(
                user_id
                for user_id, file_name in items
                if (user_id, file_name) not in stored_files_by_key
            )
        )
        if fallback_user_ids:
            fallback_services = await FileSystemProxy.create_for_users(user_ids=fallback_user_ids)
            for user_id, service in zip(fallback_user_ids, fallback_services, strict=False):
                services_by_key[("user", user_id)] = service

        owner_user_file_system_pairs = list(
            dict.fromkeys(
                (stored_file.owner_user_id, stored_file.user_file_system_id)
                for stored_file in stored_files_by_key.values()
            )
        )
        for owner_user_id, user_file_system_id in owner_user_file_system_pairs:
            services_by_key[("user_file_system", owner_user_id, user_file_system_id)] = (
                await FileSystemProxy.create_for_user_file_system(
                    user_id=owner_user_id,
                    user_file_system_id=user_file_system_id,
                )
            )

        signed_urls = []
        for user_id, file_name in items:
            stored_file = stored_files_by_key.get((user_id, file_name))
            if stored_file is not None:
                service = services_by_key[
                    ("user_file_system", stored_file.owner_user_id, stored_file.user_file_system_id)
                ]
            else:
                service = services_by_key[("user", user_id)]
            signed_urls.append(service.presign_get_url(file_name))
        return signed_urls
    except Exception as e:
        exception_logger.error(
            format_log_message(
                "remote_file_signed_urls_failed",
                user_ids=list(dict.fromkeys(user_id for user_id, _ in items)),
                file_count=len(items),
                error=e,
            )
        )
        raise


async def get_remote_file_signed_url(
    user_id: int,
    file_name: str,
):
    signed_urls = await get_remote_file_signed_urls([(user_id, file_name)])
    return signed_urls[0]


async def register_remote_file(
    *,
    user_id: int,
    file_path: str,
    user_file_system_id: int | None,
    file_system_id: int | None,
    content_type: str | None = None,
    size_bytes: int | None = None,
    source: str | None = None,
):
    if user_file_system_id is None or file_system_id is None:
        return None
    async with async_session_context() as db:
        stored_file = await crud.file_system.upsert_stored_file_async(
            db=db,
            owner_user_id=user_id,
            user_file_system_id=user_file_system_id,
            file_system_id=file_system_id,
            path=file_path,
            content_type=content_type,
            size_bytes=size_bytes,
            source=source,
        )
        await db.commit()
        return stored_file
