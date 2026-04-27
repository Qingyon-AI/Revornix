import crud


async def ensure_document_active(*, db, document_id: int) -> None:
    if await crud.document.get_document_by_document_id_async(db=db, document_id=document_id) is None:
        raise ValueError("Document not found")
