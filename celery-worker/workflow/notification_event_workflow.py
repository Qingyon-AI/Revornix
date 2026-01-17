from typing import TypedDict, cast

from langgraph.graph import StateGraph, END

from notification.common import trigger_user_notification_event


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
    user_id = cast(int, user_id)
    trigger_event_uuid = cast(str, trigger_event_uuid)
    params = state.get("params")

    await trigger_user_notification_event(
        user_id=user_id,
        trigger_event_uuid=trigger_event_uuid,
        params=params
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
    await workflow.ainvoke(
        {
            "user_id": user_id,
            "trigger_event_uuid": trigger_event_uuid,
            "params": params,
        }
    )
