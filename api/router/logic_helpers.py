from collections.abc import Hashable

import models
import schemas
from enums.section import UserSectionRole


def group_document_ids_by_category(documents: list[models.document.Document]) -> dict[Hashable, list[int]]:
    grouped: dict[Hashable, list[int]] = {}
    for document in documents:
        category = document.category
        document_id = int(document.id)
        grouped.setdefault(category, []).append(document_id)
    return grouped


def resolve_infinite_scroll_meta(
    *,
    page_item_count: int,
    limit: int,
    next_item_id: int | None,
) -> tuple[bool, int | None]:
    if limit <= 0:
        return False, None
    if page_item_count < limit:
        return False, None
    if next_item_id is None:
        return False, None
    return True, next_item_id


def resolve_publish_action(*, status: bool, already_published: bool) -> str:
    if status and not already_published:
        return "create"
    if not status and already_published:
        return "delete"
    return "noop"


def resolve_subscribe_action(
    *,
    current_role: UserSectionRole | None,
    status: bool,
) -> str:
    if current_role is None:
        return "create" if status else "noop"

    if current_role == UserSectionRole.SUBSCRIBER:
        return "noop" if status else "delete"

    # creator/member: subscription status is implied by membership, no-op for both directions
    return "noop"


def ensure_private_section_access(
    *,
    user_id: int | None,
    member_user_ids: list[int],
) -> None:
    if user_id is None:
        raise schemas.error.CustomException("This section is private and requires login", code=403)
    if user_id not in member_user_ids:
        raise schemas.error.CustomException("You don't have permission to access this section", code=403)


def ensure_document_access(
    *,
    is_creator: bool,
    has_public_section: bool,
    has_related_section: bool,
) -> None:
    if is_creator or has_public_section or has_related_section:
        return
    raise schemas.error.CustomException("You don't have permission to access this document", code=403)
