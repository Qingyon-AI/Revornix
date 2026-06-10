from collections.abc import Hashable

import models


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
