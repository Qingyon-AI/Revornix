"""Emit "process completed" notification events.

These helpers live on the *emitting* side of the notification domain: business
processing finishes, and we fire the corresponding trigger event for the right
recipients. (The *receiving* side — turning a trigger event into messages on a
user's configured notification tasks — lives in ``notification/dispatch.py``.)

They are invoked from the orchestration layer (``common.celery.app``) once a
processing run and its follow-ups have fully settled, never from inside the
processing workflows themselves.
"""

import crud
from celery import current_app

from common.logger import exception_logger
from data.sql.base import async_session_context
from enums.notification import NotificationTriggerEventUUID
from enums.section import UserSectionRole


def _emit_user_notification_event(
    *,
    user_id: int,
    trigger_event_uuid: str,
    params: dict,
    log_context: str,
) -> None:
    try:
        current_app.send_task(
            "common.celery.app.start_trigger_user_notification_event",
            kwargs={
                "user_id": user_id,
                "trigger_event_uuid": trigger_event_uuid,
                "params": params,
            },
        )
    except Exception as e:
        exception_logger.error(
            f"Failed to dispatch notification event: {log_context}, error={e}"
        )


async def emit_document_process_completed(document_id: int) -> None:
    """Notify the document owner that the document's full processing pipeline
    has finished (core processing plus any settled progressive follow-ups)."""
    async with async_session_context() as db:
        db_document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        recipient_id = db_document.creator_id if db_document is not None else None

    if recipient_id is None:
        return

    _emit_user_notification_event(
        user_id=recipient_id,
        trigger_event_uuid=NotificationTriggerEventUUID.DOCUMENT_PROCESS_COMPLETED.value,
        params={"document_id": document_id, "receiver_id": recipient_id},
        log_context=f"document_process_completed document_id={document_id}",
    )


async def emit_section_process_completed(section_id: int) -> None:
    """Notify section participants (creator/members/subscribers) that the
    section's full processing pipeline has finished (core processing plus any
    settled auto follow-up such as podcast generation)."""
    async with async_session_context() as db:
        db_users = await crud.section.get_users_for_section_by_section_id_async(
            db=db,
            section_id=section_id,
            filter_roles=[
                UserSectionRole.CREATOR,
                UserSectionRole.MEMBER,
                UserSectionRole.SUBSCRIBER,
            ],
        )

    for db_user in db_users:
        _emit_user_notification_event(
            user_id=db_user.id,
            trigger_event_uuid=NotificationTriggerEventUUID.SECTION_PROCESS_COMPLETED.value,
            params={"section_id": section_id, "receiver_id": db_user.id},
            log_context=f"section_process_completed section_id={section_id}, user_id={db_user.id}",
        )
