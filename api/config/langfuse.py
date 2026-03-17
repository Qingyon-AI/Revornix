import os


def _read_langfuse_timeout(default: int = 15) -> int:
    raw_timeout = os.environ.get("LANGFUSE_TIMEOUT")
    if raw_timeout is None or not raw_timeout.strip():
        return default

    try:
        timeout = int(raw_timeout)
    except ValueError:
        return default

    return timeout if timeout > 0 else default


LANGFUSE_BASE_URL = os.environ.get("LANGFUSE_BASE_URL")
LANGFUSE_PUBLIC_KEY = os.environ.get("LANGFUSE_PUBLIC_KEY")
LANGFUSE_SECRET_KEY = os.environ.get("LANGFUSE_SECRET_KEY")
LANGFUSE_TIMEOUT = _read_langfuse_timeout()
