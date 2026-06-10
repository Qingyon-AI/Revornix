import models
import schemas
from enums.document import UserDocumentAuthority
from enums.section import UserSectionAuthority, UserSectionRole


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
