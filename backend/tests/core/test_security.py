"""Direct unit tests for app/core/security.py — hashing, tokens."""

from datetime import timedelta

import jwt
import pytest

from app.core.config import settings
from app.core.security import (
    ALGORITHM,
    create_access_token,
    get_password_hash,
    verify_password,
)


def test_get_password_hash_produces_argon2_hash() -> None:
    """get_password_hash returns a string that starts with argon2 prefix."""
    hashed = get_password_hash("mysecretpassword")
    assert isinstance(hashed, str)
    assert hashed.startswith("$argon2")


def test_verify_password_correct_password_returns_true() -> None:
    """verify_password returns True for the correct plain password."""
    hashed = get_password_hash("correcthorse")
    result = verify_password("correcthorse", hashed)
    # verify_password returns tuple[bool, str | None] (pwdlib pattern)
    if isinstance(result, tuple):
        assert result[0] is True
    else:
        assert result is True


def test_verify_password_wrong_password_returns_false() -> None:
    """verify_password returns False for the wrong password."""
    hashed = get_password_hash("correcthorse")
    result = verify_password("wrongpassword", hashed)
    if isinstance(result, tuple):
        assert result[0] is False
    else:
        assert result is False


def test_verify_password_different_passwords_dont_match() -> None:
    """Two different passwords produce different hashes that don't cross-verify."""
    hash2 = get_password_hash("password_b")
    result = verify_password("password_a", hash2)
    if isinstance(result, tuple):
        assert result[0] is False
    else:
        assert result is False


def test_create_access_token_is_decodable() -> None:
    """create_access_token produces a JWT decodable with the correct secret."""
    token = create_access_token(
        subject="user-id-123", expires_delta=timedelta(minutes=30)
    )
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "user-id-123"
    assert "exp" in payload


def test_create_access_token_expires_in_future() -> None:
    """Access token expiry is in the future when a positive delta is given."""
    import time

    token = create_access_token(
        subject="user-id-456", expires_delta=timedelta(minutes=15)
    )
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["exp"] > int(time.time())


def test_create_access_token_expired_token_fails_decode() -> None:
    """A token created with a negative delta is immediately expired."""
    token = create_access_token(
        subject="user-id-789", expires_delta=timedelta(minutes=-1)
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


def test_get_password_hash_same_input_different_output() -> None:
    """Hashing the same password twice produces two different hashes (salted)."""
    h1 = get_password_hash("samepassword")
    h2 = get_password_hash("samepassword")
    assert h1 != h2  # different salts
