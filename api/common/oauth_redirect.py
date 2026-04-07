from urllib.parse import urljoin

from fastapi import Request

from config.base import WEB_BASE_URL


def build_public_oauth_redirect_uri(request: Request, callback_path: str) -> str:
    normalized_callback_path = callback_path.lstrip("/")

    if WEB_BASE_URL:
        public_base_url = WEB_BASE_URL.strip()
        if public_base_url:
            base_with_slash = (
                public_base_url if public_base_url.endswith("/") else f"{public_base_url}/"
            )
            return urljoin(base_with_slash, normalized_callback_path)

    return str(request.base_url) + normalized_callback_path
