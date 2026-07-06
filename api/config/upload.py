import os

_MB = 1024 * 1024


def _read_upload_limit_bytes(env_key: str, default_mb: int) -> int:
    """Read a per-tier document upload limit (in MB) from the environment.

    Falls back to ``default_mb`` when the variable is missing, blank, not a
    valid integer, or not positive. The returned value is in bytes.
    """
    raw_value = os.environ.get(env_key)
    if raw_value is None or not raw_value.strip():
        return default_mb * _MB
    try:
        value_mb = int(raw_value)
    except ValueError:
        return default_mb * _MB
    return value_mb * _MB if value_mb > 0 else default_mb * _MB


FILE_DOCUMENT_MAX_UPLOAD_BYTES_FREE = _read_upload_limit_bytes(
    "FILE_DOCUMENT_MAX_UPLOAD_MB_FREE", 10
)
FILE_DOCUMENT_MAX_UPLOAD_BYTES_PRO = _read_upload_limit_bytes(
    "FILE_DOCUMENT_MAX_UPLOAD_MB_PRO", 50
)
FILE_DOCUMENT_MAX_UPLOAD_BYTES_MAX = _read_upload_limit_bytes(
    "FILE_DOCUMENT_MAX_UPLOAD_MB_MAX", 100
)
