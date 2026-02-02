from typing import TypedDict

from langgraph.graph import StateGraph, END

import crud
from common.logger import exception_logger
from proxy.notification_proxy import NotificationProxy
from data.sql.base import session_scope
from enums.notification import NotificationContentType


class NotificationEventState(TypedDict, total=False):
    user_id: int
    trigger_event_uuid: str
    params: dict | None


async def _trigger_notification_event(
    state: NotificationEventState
) -> NotificationEventState:
    user_id = state.get("user_id")
    trigger_event_uuid = state.get("trigger_event_uuid")
    if user_id is None or trigger_event_uuid is None:
        raise Exception("Notification workflow missing user_id or trigger_event_uuid")
    params = state.get("params")
    
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
            notification_tool = NotificationProxy.create_notification_tool(
                user_id=user_id,
                notification_source_id=db_notification_task.notification_source_id,
                notification_target_id=db_notification_task.notification_target_id
            )
            # TODO
            title = None
            content = None
            cover = None
            link = None
            if db_notification_task.content_type == NotificationContentType.CUSTOM:
                db_custom_notification_content = crud.notification.get_notification_task_content_custom_by_notification_task_id(
                    db=db,
                    notification_task_id=db_notification_task.id
                )
                if db_custom_notification_content is None:
                    continue
                title = db_custom_notification_content.title
                content = db_custom_notification_content.content
                cover = db_custom_notification_content.cover
                link = db_custom_notification_content.link
            elif db_notification_task.content_type == NotificationContentType.TEMPLATE:
                db_template_notification_content = crud.notification.get_notification_task_content_template_by_notification_task_id(
                    db=db,
                    notification_task_id=db_notification_task.id
                )
                if db_template_notification_content is None:
                    continue
                generate_res = await NotificationProxy.create_message_using_template(
                    template_id=db_template_notification_content.id,
                )
                title = generate_res.title
                content = generate_res.content
                cover = generate_res.cover
                link = generate_res.link
            if title is None:
                continue
            await notification_tool.send_notification(
                title=title,
                content=content,
                cover=cover,
                link=link
            )
    return state


def _build_workflow():
    workflow = StateGraph(NotificationEventState)
    workflow.add_node("trigger_notification_event", _trigger_notification_event)
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
        await workflow.ainvoke(
            {
                "user_id": user_id,
                "trigger_event_uuid": trigger_event_uuid,
                "params": params,
            }
        )
    except Exception as e:
        exception_logger.error(f"Something is error while triggering notification event: {e}")
        raise
