from common.subscription_access import normalize_plan_access_level
from config.upload import (
    FILE_DOCUMENT_MAX_UPLOAD_BYTES_FREE,
    FILE_DOCUMENT_MAX_UPLOAD_BYTES_PRO,
    FILE_DOCUMENT_MAX_UPLOAD_BYTES_MAX,
)
from enums.product import PlanAccessLevel
from schemas.error import CustomException

_MB = 1024 * 1024

FILE_DOCUMENT_UPLOAD_PATH_PREFIX = "files/"

# Document upload size cap keyed by the user's subscription tier. The per-tier
# values are configurable via env vars (see api/config/upload.py).
FILE_DOCUMENT_MAX_UPLOAD_BYTES_BY_PLAN = {
    PlanAccessLevel.FREE: FILE_DOCUMENT_MAX_UPLOAD_BYTES_FREE,
    PlanAccessLevel.PRO: FILE_DOCUMENT_MAX_UPLOAD_BYTES_PRO,
    PlanAccessLevel.MAX: FILE_DOCUMENT_MAX_UPLOAD_BYTES_MAX,
}

# Backwards-compatible default (free tier) — kept so existing imports keep working.
FILE_DOCUMENT_MAX_UPLOAD_BYTES = FILE_DOCUMENT_MAX_UPLOAD_BYTES_BY_PLAN[
    PlanAccessLevel.FREE
]


def get_document_upload_limit_bytes(
    plan_level: int | PlanAccessLevel | None = None,
) -> int:
    normalized_plan_level = normalize_plan_access_level(plan_level)
    return FILE_DOCUMENT_MAX_UPLOAD_BYTES_BY_PLAN.get(
        normalized_plan_level,
        FILE_DOCUMENT_MAX_UPLOAD_BYTES_BY_PLAN[PlanAccessLevel.FREE],
    )


def can_upgrade_document_upload(
    plan_level: int | PlanAccessLevel | None = None,
) -> bool:
    """Whether a higher document upload limit is reachable by upgrading — i.e.
    the user is not already on the top (MAX) tier."""
    return normalize_plan_access_level(plan_level) < PlanAccessLevel.MAX


def format_upload_limit_label(size_bytes: int) -> str:
    return f"{size_bytes // _MB}MB"


def validate_file_upload_size(
    *,
    file_path: str,
    size: int,
    plan_level: int | PlanAccessLevel | None = None,
) -> None:
    if not file_path.startswith(FILE_DOCUMENT_UPLOAD_PATH_PREFIX):
        return
    limit = get_document_upload_limit_bytes(plan_level)
    if size > limit:
        raise CustomException(
            message=f"File upload size must not exceed {format_upload_limit_label(limit)}",
            code=400,
        )
