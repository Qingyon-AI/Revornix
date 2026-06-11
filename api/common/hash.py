import hashlib
import hmac
import os

# Password hashing
#
# Current scheme: scrypt (memory-hard KDF, stdlib, no extra dependency).
# Stored format is self-describing so parameters can be raised later without
# breaking existing hashes:
#
#     scrypt$<log2_n>$<r>$<p>$<salt_hex>$<hash_hex>
#
# Legacy scheme (pre-2026): hex(salt_16_bytes) + hex(sha256(salt + password)),
# a single-iteration SHA-256 — far too fast for password storage.
# ``verify_password`` still accepts it so existing users can log in, and
# ``password_needs_rehash`` lets callers transparently upgrade the stored
# hash right after a successful verification.

_SCRYPT_LOG2_N = 15  # n = 2**15 -> 32 MiB memory cost per hash
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_DKLEN = 32
_SALT_BYTES = 16

_LEGACY_SALT_HEX_LEN = 32  # 16-byte salt
_LEGACY_HASH_HEX_LEN = 64  # sha256 hex digest


def _scrypt_hash(password: str, salt: bytes, log2_n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(
        password.encode(),
        salt=salt,
        n=1 << log2_n,
        r=r,
        p=p,
        maxmem=256 * 1024 * 1024,
        dklen=_SCRYPT_DKLEN,
    )


def hash_password(password: str) -> str:
    salt = os.urandom(_SALT_BYTES)
    derived = _scrypt_hash(password, salt, _SCRYPT_LOG2_N, _SCRYPT_R, _SCRYPT_P)
    return (
        f"scrypt${_SCRYPT_LOG2_N}${_SCRYPT_R}${_SCRYPT_P}"
        f"${salt.hex()}${derived.hex()}"
    )


def _verify_scrypt(stored_password: str, provided_password: str) -> bool:
    try:
        _, log2_n_raw, r_raw, p_raw, salt_hex, hash_hex = stored_password.split("$")
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
        derived = _scrypt_hash(
            provided_password,
            salt,
            int(log2_n_raw),
            int(r_raw),
            int(p_raw),
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(derived, expected)


def _verify_legacy_sha256(stored_password: str, provided_password: str) -> bool:
    if len(stored_password) != _LEGACY_SALT_HEX_LEN + _LEGACY_HASH_HEX_LEN:
        return False
    try:
        salt = bytes.fromhex(stored_password[:_LEGACY_SALT_HEX_LEN])
    except ValueError:
        return False
    stored_hash = stored_password[_LEGACY_SALT_HEX_LEN:]
    provided_hash = hashlib.sha256(salt + provided_password.encode()).hexdigest()
    return hmac.compare_digest(stored_hash.encode(), provided_hash.encode())


def verify_password(stored_password: str, provided_password: str) -> bool:
    if stored_password.startswith("scrypt$"):
        return _verify_scrypt(stored_password, provided_password)
    return _verify_legacy_sha256(stored_password, provided_password)


def password_needs_rehash(stored_password: str) -> bool:
    """True when the stored hash uses the legacy scheme or weaker-than-current
    scrypt parameters; callers should rehash after a successful verify."""
    if not stored_password.startswith("scrypt$"):
        return True
    try:
        _, log2_n_raw, r_raw, p_raw, _, _ = stored_password.split("$")
        return (
            int(log2_n_raw) < _SCRYPT_LOG2_N
            or int(r_raw) < _SCRYPT_R
            or int(p_raw) < _SCRYPT_P
        )
    except ValueError:
        return True
