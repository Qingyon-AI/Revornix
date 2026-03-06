import asyncio
from typing import TypedDict

from langgraph.graph import StateGraph, END

import crud
from common.logger import exception_logger
from proxy.notification_proxy import NotificationProxy
from data.sql.base import session_scope
from enums.notification import NotificationContentType
from notification.template.platform_message_builder import build_multi_platform_message
from workflow.timing import add_timed_node, ainvoke_with_timing


class NotificationEventState(TypedDict, total=False):
    user_id: int
    trigger_event_uuid: str
    params: dict | None


WORKFLOW_NAME = "notification_event"


class NotificationDispatchPayload(TypedDict, total=False):
    notification_source_id: int
    notification_target_id: int
    template_id: int | None
    title: str | None
    content: str | None
    cover: str | None
    link: str | None


NOTIFICATION_DISPATCH_CONCURRENCY = 5


async def _dispatch_notification(
    *,
    user_id: int,
    trigger_event_uuid: str,
    payload: NotificationDispatchPayload,
    params: dict | None,
    semaphore: asyncio.Semaphore,
) -> None:
    source_id = payload.get("notification_source_id")
    target_id = payload.get("notification_target_id")
    if source_id is None or target_id is None:
        return

    async with semaphore:
        try:
            notification_tool = await asyncio.to_thread(
                NotificationProxy.create_notification_tool,
                user_id=user_id,
                notification_source_id=source_id,
                notification_target_id=target_id,
            )

            title = payload.get("title")
            content = payload.get("content")
            cover = payload.get("cover")
            link = payload.get("link")

            template_id = payload.get("template_id")
            if template_id is not None:
                message = await NotificationProxy.create_message_using_template(
                    template_id=template_id,
                    params=params,
                )
            else:
                if title is None:
                    raise Exception("Notification title is empty")
                message = build_multi_platform_message(
                    title=title,
                    plain_content=content or "",
                    link=link,
                    cover=cover,
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
                raise Exception("Notification title is empty")

            await notification_tool.send_notification(
                title=title,
                content=content,
                content_type=content_type,
                plain_content=plain_content,
                cover=cover,
                link=link
            )
        except Exception as dispatch_error:
            exception_logger.error(
                f"Failed to dispatch notification: user_id={user_id}, "
                f"trigger_event_uuid={trigger_event_uuid}, source_id={source_id}, "
                f"target_id={target_id}, error={dispatch_error}"
            )


async def _trigger_notification_event(
    state: NotificationEventState
) -> NotificationEventState:
    user_id = state.get("user_id")
    trigger_event_uuid = state.get("trigger_event_uuid")
    if user_id is None or trigger_event_uuid is None:
        raise Exception("Notification workflow missing user_id or trigger_event_uuid")
    params = state.get("params")

    payloads: list[NotificationDispatchPayload] = []
    with session_scope() as db:
        db_trigger_event = crud.notification.get_trigger_event_by_uuid(
            db=db,
            uuid=trigger_event_uuid
        )
        if db_trigger_event is None:
            raise Exception("Trigger event not found")
        db_notification_tasks = crud.notification.get_notification_tasks_by_user_id_and_notification_trigger_event(
            db=db,
            user_id=user_id,
            trigger_event_uuid=db_trigger_event.uuid
        )
        for db_notification_task in db_notification_tasks:
            if not db_notification_task.enable:
                continue

            payload: NotificationDispatchPayload = {
                "notification_source_id": db_notification_task.notification_source_id,
                "notification_target_id": db_notification_task.notification_target_id,
            }
            if db_notification_task.content_type == NotificationContentType.CUSTOM:
                db_custom_notification_content = crud.notification.get_notification_task_content_custom_by_notification_task_id(
                    db=db,
                    notification_task_id=db_notification_task.id
                )
                if db_custom_notification_content is None:
                    continue
                payload["title"] = db_custom_notification_content.title
                payload["content"] = db_custom_notification_content.content
                payload["cover"] = db_custom_notification_content.cover
                payload["link"] = db_custom_notification_content.link
            elif db_notification_task.content_type == NotificationContentType.TEMPLATE:
                db_template_notification_content = crud.notification.get_notification_task_content_template_by_notification_task_id(
                    db=db,
                    notification_task_id=db_notification_task.id
                )
                if db_template_notification_content is None:
                    continue
                payload["template_id"] = db_template_notification_content.notification_template_id
            else:
                continue
            payloads.append(payload)

    if not payloads:
        return state

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
    return state


def _build_workflow():
    workflow = StateGraph(NotificationEventState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="trigger_notification_event",
        node_func=_trigger_notification_event,
    )
    workflow.set_entry_point("trigger_notification_event")
    workflow.add_edge("trigger_notification_event", END)
    return workflow.compile()


_WORKFLOW = None


def get_notification_event_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_notification_event_workflow(
    *,
    user_id: int,
    trigger_event_uuid: str,
    params: dict | None = None
) -> None:
    workflow = get_notification_event_workflow()
    try:
        await ainvoke_with_timing(
            workflow_name=WORKFLOW_NAME,
            workflow=workflow,
            payload={
                "user_id": user_id,
                "trigger_event_uuid": trigger_event_uuid,
                "params": params,
            },
        )
    except Exception as e:
        exception_logger.error(f"Something is error while triggering notification event: {e}")
        raise
