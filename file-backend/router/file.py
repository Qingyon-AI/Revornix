from fastapi import APIRouter, UploadFile, File, Form, Depends
from pathlib import Path
from common.dependencies import get_current_user
import models.user
import schemas
import models

file_router = APIRouter()

BASE_UPLOAD_DIR = Path("uploads").resolve()

@file_router.post('/upload/raw', response_model=schemas.common.SuccessResponse)
async def update_file_with_raw(
    raw_content_upload_request: schemas.file.RawContentUploadRequest,
    current_user: models.user.User = Depends(get_current_user)):
    target_path = (BASE_UPLOAD_DIR / raw_content_upload_request.path).resolve()
    try:
        target_path.relative_to(BASE_UPLOAD_DIR)
    except ValueError:
        raise schemas.error.CustomException(
            message="illegal path, access to directories outside of uploads is prohibited",
            code=400
        )
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with open(target_path, "wb") as f:
        f.write(raw_content_upload_request.content.encode("utf-8"))
    return schemas.common.SuccessResponse()

@file_router.post("/upload", response_model=schemas.common.SuccessResponse)
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form(...),
    current_user: models.user.User = Depends(get_current_user),
):
    target_path = (BASE_UPLOAD_DIR / path).resolve()
    try:
        target_path.relative_to(BASE_UPLOAD_DIR)
    except ValueError:
        raise schemas.error.CustomException(message="illegal path, access to directories outside of uploads is prohibited", code=400)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with open(target_path, "wb") as f:
        content = await file.read()
        f.write(content)
    return schemas.common.SuccessResponse()