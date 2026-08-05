from urllib.parse import urljoin, urlparse

from fastapi import Request

from config.base import DEPLOY_HOSTS, WEB_BASE_URL
from schemas.error import CustomException


def _normalize_callback_path(callback_path: str) -> str:
    return "/" + callback_path.strip("/")


def _strip_port(host: str | None) -> str:
    if not host:
        return ""
    return host.split(":", 1)[0].lower()


def _allowed_redirect_hosts() -> set[str]:
    hosts = {
        _strip_port(host.strip())
        for host in DEPLOY_HOSTS
        if host and host.strip()
    }

    if WEB_BASE_URL:
        parsed_base_url = urlparse(WEB_BASE_URL.strip())
        if parsed_base_url.hostname:
            hosts.add(parsed_base_url.hostname.lower())

    return {host for host in hosts if host}


def validate_public_oauth_redirect_uri(
    redirect_uri: str,
    callback_path: str,
) -> str:
    parsed_uri = urlparse(redirect_uri)
    if parsed_uri.scheme not in {"http", "https"} or not parsed_uri.hostname:
        raise CustomException(message="OAuth redirect URI is invalid", code=400)

    if parsed_uri.hostname.lower() not in _allowed_redirect_hosts():
        raise CustomException(message="OAuth redirect URI host is not allowed", code=400)

    if parsed_uri.path.rstrip("/") != _normalize_callback_path(callback_path):
        raise CustomException(message="OAuth redirect URI path is invalid", code=400)

    return redirect_uri


def build_public_oauth_redirect_uri(
    request: Request,
    callback_path: str,
    redirect_uri: str | None = None,
) -> str:
    normalized_callback_path = callback_path.lstrip("/")

    if redirect_uri:
        return validate_public_oauth_redirect_uri(
            redirect_uri=redirect_uri,
            callback_path=callback_path,
        )

    if WEB_BASE_URL:
        public_base_url = WEB_BASE_URL.strip()
        if public_base_url:
            base_with_slash = (
                public_base_url if public_base_url.endswith("/") else f"{public_base_url}/"
            )
            return urljoin(base_with_slash, normalized_callback_path)

    return str(request.base_url) + normalized_callback_path
