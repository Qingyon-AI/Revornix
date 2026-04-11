from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.document_chunk_snapshot import delete_document_chunk_snapshots
from common.dependencies import get_current_user, get_db
from data.milvus.delete import delete_documents_from_milvus
from data.neo4j.delete import delete_documents_and_related_from_neo4j
from enums.document import DocumentCategory
from router.logic_helpers import ensure_document_access, group_document_ids_by_category
from schemas.common import SuccessResponse

document_interaction_manage_router = APIRouter()


def _ensure_document_interaction_access(
    *,
    db: Session,
    document_id: int,
    document_creator_id: int,
    user_id: int,
) -> None:
    if document_creator_id == user_id:
        return

    db_publish_document = crud.document.get_publish_document_by_document_id(
        db=db,
        document_id=document_id,
    )
    if db_publish_document is not None:
        return

    db_user_document = crud.document.get_user_document_by_user_id_and_document_id(
        db=db,
        user_id=user_id,
        document_id=document_id,
    )
    ensure_document_access(
        is_creator=False,
        has_public_document=False,
        has_document_collaborator=db_user_document is not None,
    )


def _load_owned_documents_or_raise(
    *,
    db: Session,
    document_ids: list[int],
    user_id: int,
) -> list[models.document.Document]:
    documents: list[models.document.Document] = []
    for document_id in document_ids:
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id,
        )
        if db_document is None:
            raise schemas.error.CustomException("The document is not found", code=404)
        if db_document.creator_id != user_id:
            raise schemas.error.CustomException("You are not the owner of the document", code=403)
        documents.append(db_document)
    return documents


@document_interaction_manage_router.post('/star', response_model=SuccessResponse)
def star_document(
    star_request: schemas.document.StarRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=star_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("The document is not found", code=404)
    _ensure_document_interaction_access(
        db=db,
        document_id=db_document.id,
        document_creator_id=db_document.creator_id,
        user_id=user.id,
    )
    if star_request.status is False:
        crud.document.unstar_document_by_document_id(
            db=db,
            user_id=user.id,
            document_id=star_request.document_id
        )
    elif star_request.status is True:
        crud.document.star_document_by_document_id(
            db=db,
            user_id=user.id,
            document_id=star_request.document_id
        )
    db.commit()
    return schemas.common.SuccessResponse(message="The star status of the document is successfully updated")


@document_interaction_manage_router.post('/read', response_model=SuccessResponse)
def read_document(
    read_request: schemas.document.ReadRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=read_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("The document is not found", code=404)
    _ensure_document_interaction_access(
        db=db,
        document_id=db_document.id,
        document_creator_id=db_document.creator_id,
        user_id=user.id,
    )
    if read_request.status is False:
        crud.document.unread_document_by_document_id(
            db=db,
            user_id=user.id,
            document_id=read_request.document_id
        )
    elif read_request.status is True:
        crud.document.read_document_by_document_id(
            db=db,
            user_id=user.id,
            document_id=read_request.document_id
        )
    db.commit()
    return schemas.common.SuccessResponse(message="The read status of the document is successfully updated")


@document_interaction_manage_router.post('/delete', response_model=SuccessResponse)
async def delete_document(
    documents_delete_request: schemas.document.DocumentDeleteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    documents = _load_owned_documents_or_raise(
        db=db,
        document_ids=documents_delete_request.document_ids,
        user_id=user.id,
    )
    document_ids = [document.id for document in documents]

    await delete_document_chunk_snapshots(
        db=db,
        documents=documents,
    )

    crud.task.cancel_document_tasks_by_document_ids(
        db=db,
        document_ids=document_ids
    )
    crud.document.delete_user_documents_by_document_ids(
        db=db,
        document_ids=document_ids,
        user_id=user.id
    )
    crud.document.delete_document_labels_by_document_ids(
        db=db,
        document_ids=document_ids
    )
    crud.document.delete_document_notes_by_document_ids(
        db=db,
        document_ids=document_ids
    )

    grouped_document_ids = group_document_ids_by_category(documents)

    file_document_ids = grouped_document_ids.get(DocumentCategory.FILE, [])
    if file_document_ids:
        crud.document.delete_file_documents_by_document_ids(
            db=db,
            document_ids=file_document_ids
        )

    website_document_ids = grouped_document_ids.get(DocumentCategory.WEBSITE, [])
    if website_document_ids:
        crud.document.delete_website_documents_by_document_ids(
            db=db,
            document_ids=website_document_ids
        )

    quick_note_document_ids = grouped_document_ids.get(DocumentCategory.QUICK_NOTE, [])
    if quick_note_document_ids:
        crud.document.delete_quick_note_documents_by_document_ids(
            db=db,
            document_ids=quick_note_document_ids
        )

    audio_document_ids = grouped_document_ids.get(DocumentCategory.AUDIO, [])
    if audio_document_ids:
        crud.document.delete_audio_documents_by_document_ids(
            db=db,
            document_ids=audio_document_ids
        )

    delete_documents_and_related_from_neo4j(
        doc_ids=document_ids
    )
    delete_documents_from_milvus(
        doc_ids=document_ids
    )
    db.commit()
    return SuccessResponse(message="The documents is deleted successfully")
