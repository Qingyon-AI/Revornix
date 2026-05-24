from collections.abc import Hashable

import models
import schemas
from enums.document import UserDocumentAuthority
from enums.section import UserSectionAuthority, UserSectionRole


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
        raise schemas.error.CustomException("This section is private and requires login", code=401)
    if user_id not in member_user_ids:
        raise schemas.error.CustomException("You don't have permission to access this section", code=403)


def has_section_member_identity(section_user: models.section.SectionUser | None) -> bool:
    if section_user is None:
        return False
    return UserSectionRole(section_user.role) in (
        UserSectionRole.CREATOR,
        UserSectionRole.MEMBER,
    )


def has_section_full_access(section_user: models.section.SectionUser | None) -> bool:
    return (
        has_section_member_identity(section_user)
        and UserSectionAuthority(section_user.authority) == UserSectionAuthority.FULL_ACCESS
    )


def has_section_write_access(section_user: models.section.SectionUser | None) -> bool:
    return (
        has_section_member_identity(section_user)
        and UserSectionAuthority(section_user.authority)
        in (UserSectionAuthority.FULL_ACCESS, UserSectionAuthority.READ_AND_WRITE)
    )


def has_document_full_access(
    *,
    document: models.document.Document,
    user_id: int,
    user_document: models.document.UserDocument | None,
) -> bool:
    if document.creator_id == user_id:
        return True
    return (
        user_document is not None
        and UserDocumentAuthority(user_document.authority) == UserDocumentAuthority.FULL_ACCESS
    )


def has_document_write_access(
    *,
    document: models.document.Document,
    user_id: int,
    user_document: models.document.UserDocument | None,
) -> bool:
    if document.creator_id == user_id:
        return True
    return (
        user_document is not None
        and UserDocumentAuthority(user_document.authority)
        in (UserDocumentAuthority.FULL_ACCESS, UserDocumentAuthority.READ_AND_WRITE)
    )


def ensure_document_access(
    *,
    user_id: int | None,
    is_creator: bool,
    has_public_document: bool,
    has_document_collaborator: bool,
) -> None:
    if is_creator or has_public_document or has_document_collaborator:
        return
    if user_id is None:
        raise schemas.error.CustomException("This document is private and requires login", code=401)
    raise schemas.error.CustomException("You don't have permission to access this document", code=403)


def ensure_document_write_access(
    *,
    is_creator: bool,
    has_document_write_access: bool,
) -> None:
    if is_creator or has_document_write_access:
        return
    raise schemas.error.CustomException("You don't have permission to update this document", code=403)


def ensure_document_manage_access(
    *,
    is_creator: bool,
) -> None:
    if is_creator:
        return
    raise schemas.error.CustomException("You don't have permission to manage this document", code=403)
