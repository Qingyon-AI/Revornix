import asyncio
import time
import traceback
from typing import TypedDict

import crud
from common.logger import exception_logger, info_logger
from proxy.notification_proxy import NotificationProxy
from data.sql.base import async_session_context
from workflow.timing import format_elapsed_fields

WORKFLOW_NAME = "notification_event"
NOTIFICATION_DISPATCH_CONCURRENCY = 5


class NotificationDispatchPayload(TypedDict, total=False):
    notification_task_id: int
    notification_source_id: int
    notification_target_id: int
    template_id: int


async def _dispatch_notification(
    *,
    user_id: int,
    trigger_event_uuid: str,
    payload: NotificationDispatchPayload,
    params: dict | None,
    semaphore: asyncio.Semaphore,
) -> None:
    task_id = payload.get("notification_task_id")
    source_id = payload.get("notification_source_id")
    target_id = payload.get("notification_target_id")
    if source_id is None or target_id is None:
        return

    async with semaphore:
        try:
            notification_tool = await NotificationProxy.create_notification_tool(
                user_id=user_id,
                notification_source_id=source_id,
                notification_target_id=target_id,
            )

            template_id = payload.get("template_id")
            if template_id is None:
                raise Exception("Notification task has no template configured")
            message = await NotificationProxy.create_message_using_template(
                template_id=template_id,
                params=params,
            )

            resolved_message = NotificationProxy.resolve_message_for_channel(
                message=message,
                channel_key=notification_tool.channel_key,
            )
            title = resolved_message.title
            content = resolved_message.content
            content_type = resolved_message.content_type
            plain_content = resolved_message.plain_content
            cover = resolved_message.cover
            link = resolved_message.link

            if title is None:
                raise Exception("Notification title is empty after resolution")

            await notification_tool.send_notification(
                title=title,
                content=content,
                content_type=content_type,
                plain_content=plain_content,
                cover=cover,
                link=link,
            )

            if task_id is not None:
                try:
                    async with async_session_context() as db:
                        await crud.notification.create_notification_record_async(
                            db=db,
                            task_id=task_id,
                            title=title,
                            content=content,
                            cover=cover,
                            link=link,
                        )
                        await db.commit()
                except Exception as record_error:
                    exception_logger.error(
                        f"Failed to write notification record: task_id={task_id}, error={record_error}"
                    )

        except Exception as dispatch_error:
            exception_logger.error(
                f"Failed to dispatch notification: user_id={user_id}, "
                f"trigger_event_uuid={trigger_event_uuid}, source_id={source_id}, "
                f"target_id={target_id}, task_id={task_id}, error={dispatch_error}\n"
                f"{traceback.format_exc()}"
            )


async def run_notification_event_workflow(
    *,
    user_id: int,
    trigger_event_uuid: str,
    params: dict | None = None,
) -> None:
    start = time.perf_counter()
    try:
        payloads: list[NotificationDispatchPayload] = []
        async with async_session_context() as db:
            db_trigger_event = await crud.notification.get_trigger_event_by_uuid_async(
                db=db,
                uuid=trigger_event_uuid,
            )
            if db_trigger_event is None:
                raise Exception("Trigger event not found")
            db_notification_tasks = await crud.notification.get_notification_tasks_by_user_id_and_notification_trigger_event_async(
                db=db,
                user_id=user_id,
                trigger_event_uuid=db_trigger_event.uuid,
            )
            for db_notification_task in db_notification_tasks:
                if not db_notification_task.enable:
                    continue
                db_template_notification_content = await crud.notification.get_notification_task_content_template_by_notification_task_id_async(
                    db=db,
                    notification_task_id=db_notification_task.id,
                )
                if db_template_notification_content is None:
                    continue
                payload: NotificationDispatchPayload = {
                    "notification_task_id": db_notification_task.id,
                    "notification_source_id": db_notification_task.notification_source_id,
                    "notification_target_id": db_notification_task.notification_target_id,
                    "template_id": db_template_notification_content.notification_template_id,
                }
                payloads.append(payload)

        if payloads:
            semaphore = asyncio.Semaphore(NOTIFICATION_DISPATCH_CONCURRENCY)
            await asyncio.gather(
                *[
                    _dispatch_notification(
                        user_id=user_id,
                        trigger_event_uuid=trigger_event_uuid,
                        payload=payload,
                        params=params,
                        semaphore=semaphore,
                    )
                    for payload in payloads
                ]
            )

    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000
        exception_logger.error(
            f"[WorkflowTiming] workflow_error workflow={WORKFLOW_NAME}, "
            f"{format_elapsed_fields(elapsed_ms)}, user_id={user_id}, "
            f"trigger_event_uuid={trigger_event_uuid}, error={e}"
        )
        raise

    elapsed_ms = (time.perf_counter() - start) * 1000
    info_logger.info(
        f"[WorkflowTiming] workflow_end workflow={WORKFLOW_NAME}, "
        f"{format_elapsed_fields(elapsed_ms)}, user_id={user_id}, "
        f"trigger_event_uuid={trigger_event_uuid}"
    )
