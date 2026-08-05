import base64
import hashlib
import hmac
import secrets
import time
from urllib.parse import quote, urlencode


TOTP_DIGITS = 6
TOTP_PERIOD_SECONDS = 30
TOTP_ISSUER = "Revornix"


def create_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def create_otpauth_uri(secret: str, account_name: str) -> str:
    label = f"{TOTP_ISSUER}:{account_name}"
    query = urlencode({
        "secret": secret,
        "issuer": TOTP_ISSUER,
        "algorithm": "SHA1",
        "digits": str(TOTP_DIGITS),
        "period": str(TOTP_PERIOD_SECONDS),
    })
    return f"otpauth://totp/{quote(label)}?{query}"


def _decode_secret(secret: str) -> bytes:
    normalized = secret.replace(" ", "").upper()
    padding = "=" * (-len(normalized) % 8)
    return base64.b32decode(normalized + padding)


def _hotp(secret: str, counter: int) -> str:
    digest = hmac.new(
        _decode_secret(secret),
        counter.to_bytes(8, "big"),
        hashlib.sha1,
    ).digest()
    offset = digest[-1] & 0x0F
    code = (
        int.from_bytes(digest[offset:offset + 4], "big") & 0x7FFFFFFF
    ) % (10 ** TOTP_DIGITS)
    return str(code).zfill(TOTP_DIGITS)


def verify_totp_code(
    *,
    secret: str,
    code: str,
    last_used_step: int | None = None,
    window: int = 1,
    now: int | None = None,
) -> int | None:
    normalized_code = code.strip().replace(" ", "")
    if not (normalized_code.isdigit() and len(normalized_code) == TOTP_DIGITS):
        return None

    current_step = int((now if now is not None else time.time()) // TOTP_PERIOD_SECONDS)
    for offset in range(-window, window + 1):
        step = current_step + offset
        if last_used_step is not None and step <= last_used_step:
            continue
        if hmac.compare_digest(_hotp(secret, step), normalized_code):
            return step
    return None
