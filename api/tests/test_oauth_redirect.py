import pytest

from common.oauth_redirect import validate_public_oauth_redirect_uri
from schemas.error import CustomException


def test_validate_public_oauth_redirect_uri_accepts_deploy_host(monkeypatch):
    monkeypatch.setattr(
        "common.oauth_redirect.DEPLOY_HOSTS",
        ["app.revornix.com", "app.revornix.cn"],
    )
    monkeypatch.setattr("common.oauth_redirect.WEB_BASE_URL", None)

    redirect_uri = "https://app.revornix.com/integrations/google/oauth2/create/callback"

    assert (
        validate_public_oauth_redirect_uri(
            redirect_uri,
            "integrations/google/oauth2/create/callback",
        )
        == redirect_uri
    )


def test_validate_public_oauth_redirect_uri_rejects_wrong_path(monkeypatch):
    monkeypatch.setattr("common.oauth_redirect.DEPLOY_HOSTS", ["app.revornix.com"])
    monkeypatch.setattr("common.oauth_redirect.WEB_BASE_URL", None)

    with pytest.raises(CustomException):
        validate_public_oauth_redirect_uri(
            "https://app.revornix.com/integrations/github/oauth2/create/callback",
            "integrations/google/oauth2/create/callback",
        )


def test_validate_public_oauth_redirect_uri_rejects_unknown_host(monkeypatch):
    monkeypatch.setattr("common.oauth_redirect.DEPLOY_HOSTS", ["app.revornix.com"])
    monkeypatch.setattr("common.oauth_redirect.WEB_BASE_URL", None)

    with pytest.raises(CustomException):
        validate_public_oauth_redirect_uri(
            "https://evil.example/integrations/google/oauth2/create/callback",
            "integrations/google/oauth2/create/callback",
        )
