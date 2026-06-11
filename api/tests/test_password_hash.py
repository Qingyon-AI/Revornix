import hashlib
import os

from common.hash import hash_password, password_needs_rehash, verify_password


def _legacy_hash(password: str) -> str:
    salt = os.urandom(16)
    return salt.hex() + hashlib.sha256(salt + password.encode()).hexdigest()


def test_scrypt_roundtrip():
    stored = hash_password("s3cret!")
    assert stored.startswith("scrypt$")
    assert verify_password(stored, "s3cret!")
    assert not verify_password(stored, "wrong")


def test_scrypt_hashes_are_salted():
    assert hash_password("same") != hash_password("same")


def test_current_scheme_does_not_need_rehash():
    assert not password_needs_rehash(hash_password("s3cret!"))


def test_legacy_sha256_still_verifies():
    stored = _legacy_hash("oldpass")
    assert verify_password(stored, "oldpass")
    assert not verify_password(stored, "nope")


def test_legacy_sha256_needs_rehash():
    assert password_needs_rehash(_legacy_hash("oldpass"))


def test_malformed_hashes_fail_closed():
    assert not verify_password("", "x")
    assert not verify_password("garbage", "x")
    assert not verify_password("scrypt$bad$format", "x")
    assert not verify_password("scrypt$15$8$1$zz$zz", "x")


def test_weaker_scrypt_params_flag_rehash():
    stored = hash_password("pw")
    parts = stored.split("$")
    parts[1] = "10"  # pretend it was hashed with n=2**10
    assert password_needs_rehash("$".join(parts))
