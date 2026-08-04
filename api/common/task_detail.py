"""Helpers for the per-task ``detail`` column.

Every document/section task node owns a short, human readable ``detail``
explaining why it is in its current status. Failures are recorded there instead
of being written back onto the document itself, so one broken node never
rewrites the document's title or description.

MIRRORED-FILE: api/ <-> celery-worker/ —— 两侧必须逐字节一致，由 scripts/check_mirrored_files.py 强制。
"""

MAX_TASK_DETAIL_LENGTH = 1000


def truncate_task_detail(detail: str | None) -> str | None:
    if detail is None:
        return None
    detail = detail.strip()
    if not detail:
        return None
    if len(detail) <= MAX_TASK_DETAIL_LENGTH:
        return detail
    return detail[: MAX_TASK_DETAIL_LENGTH - 3] + "..."


def format_task_error(error: BaseException) -> str:
    """Render an exception as the detail of a failed task node."""
    message = str(error).strip()
    name = error.__class__.__name__
    if not message:
        return name
    return truncate_task_detail(f"{name}: {message}") or name
