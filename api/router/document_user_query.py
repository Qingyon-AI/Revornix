from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_db
from common.file import get_remote_file_signed_url
from enums.document import UserDocumentAuthority
from router.logic_helpers import resolve_infinite_scroll_meta

document_user_query_router = APIRouter()


@document_user_query_router.post('/mine/authority', response_model=schemas.document.DocumentUserAuthorityResponse)
def get_mine_document_authority(
    document_authority_request: schemas.document.MineDocumentAuthorityRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=document_authority_request.document_id,
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    if db_document.creator_id == user.id:
        return schemas.document.DocumentUserAuthorityResponse(
            document_id=document_authority_request.document_id,
            user_id=user.id,
            authority=UserDocumentAuthority.OWNER,
            is_creator=True,
        )

    db_user_document = crud.document.get_user_document_by_user_id_and_document_id(
        db=db,
        user_id=user.id,
        document_id=document_authority_request.document_id,
    )
    if db_user_document is None:
        raise schemas.error.CustomException("Document collaborator not found", code=404)
    return schemas.document.DocumentUserAuthorityResponse(
        document_id=document_authority_request.document_id,
        user_id=user.id,
        authority=db_user_document.authority,
        is_creator=False,
    )


@document_user_query_router.post('/user', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentCollaboratorPublicInfo])
async def document_user_request(
    document_user_request: schemas.document.DocumentUserRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user),
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=document_user_request.document_id,
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    if db_document.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to get the collaborators of this document", code=403)

    db_document_users = crud.document.search_users_and_document_users_by_document_id(
        db=db,
        document_id=document_user_request.document_id,
        start=document_user_request.start,
        limit=document_user_request.limit,
        keyword=document_user_request.keyword,
    )
    next_document_user = None
    if document_user_request.limit > 0 and len(db_document_users) == document_user_request.limit:
        next_document_user = crud.document.search_next_user_and_document_user_by_document_id(
            db=db,
            document_id=document_user_request.document_id,
            user_document=db_document_users[-1][1],
            keyword=document_user_request.keyword,
        )
    has_more, next_start = resolve_infinite_scroll_meta(
        page_item_count=len(db_document_users),
        limit=document_user_request.limit,
        next_item_id=next_document_user[1].id if next_document_user is not None else None,
    )
    total = crud.document.count_users_and_document_users_by_document_id(
        db=db,
        document_id=document_user_request.document_id,
        keyword=document_user_request.keyword,
    )

    collaborators = []
    for db_user, db_user_document in db_document_users:
        collaborator = schemas.document.DocumentCollaboratorPublicInfo.model_validate(db_user)
        collaborator.authority = db_user_document.authority
        if collaborator.avatar is not None:
            collaborator.avatar = await get_remote_file_signed_url(
                user_id=collaborator.id,
                file_name=collaborator.avatar,
            )
        collaborators.append(collaborator)

    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=collaborators,
        start=document_user_request.start,
        limit=document_user_request.limit,
        has_more=has_more,
        next_start=next_start,
    )
