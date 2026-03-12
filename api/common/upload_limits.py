from schemas.error import CustomException

FILE_DOCUMENT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
FILE_DOCUMENT_MAX_UPLOAD_LABEL = "10MB"
FILE_DOCUMENT_UPLOAD_PATH_PREFIX = "files/"


def validate_file_upload_size(*, file_path: str, size: int) -> None:
    if (
        file_path.startswith(FILE_DOCUMENT_UPLOAD_PATH_PREFIX)
        and size > FILE_DOCUMENT_MAX_UPLOAD_BYTES
    ):
        raise CustomException(
            message=f"File upload size must not exceed {FILE_DOCUMENT_MAX_UPLOAD_LABEL}",
            code=400,
        )
