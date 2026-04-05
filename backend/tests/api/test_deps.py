"""Tests for app/api/deps.py — JWT error paths and user validation."""

import uuid
from datetime import timedelta

import jwt
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import ALGORITHM, create_access_token
from app.crud import create_user
from app.models import UserCreate
from tests.utils.utils import random_email, random_lower_string


def test_get_current_user_invalid_jwt(client: TestClient) -> None:
    """Malformed/invalid JWT token → 403 Could not validate credentials."""
    headers = {"Authorization": "Bearer this.is.not.a.valid.token"}
    r = client.post(f"{settings.API_V1_STR}/login/test-token", headers=headers)
    assert r.status_code == 403
    assert r.json()["detail"] == "Could not validate credentials"


def test_get_current_user_expired_jwt(client: TestClient) -> None:
    """Expired JWT token → 403 Could not validate credentials."""
    expired_token = create_access_token(
        subject=str(uuid.uuid4()), expires_delta=timedelta(minutes=-1)
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    r = client.post(f"{settings.API_V1_STR}/login/test-token", headers=headers)
    assert r.status_code == 403
    assert r.json()["detail"] == "Could not validate credentials"


def test_get_current_user_wrong_secret_jwt(client: TestClient) -> None:
    """JWT signed with wrong secret → 403 Could not validate credentials."""
    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "exp": 9999999999},
        key="wrong-secret",
        algorithm=ALGORITHM,
    )
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post(f"{settings.API_V1_STR}/login/test-token", headers=headers)
    assert r.status_code == 403
    assert r.json()["detail"] == "Could not validate credentials"


def test_get_current_user_deleted_user(client: TestClient, db: Session) -> None:
    """Valid JWT for a deleted user → 404 User not found."""
    email = random_email()
    password = random_lower_string()
    user_create = UserCreate(email=email, password=password)
    user = create_user(session=db, user_create=user_create)
    user_id = user.id

    # Create a valid token for this user
    token = create_access_token(
        subject=str(user_id), expires_delta=timedelta(minutes=30)
    )

    # Delete the user
    db.delete(user)
    db.commit()

    headers = {"Authorization": f"Bearer {token}"}
    r = client.post(f"{settings.API_V1_STR}/login/test-token", headers=headers)
    assert r.status_code == 404
    assert r.json()["detail"] == "User not found"


def test_get_current_user_inactive_user(client: TestClient, db: Session) -> None:
    """Valid JWT for an inactive user → 400 Inactive user."""
    email = random_email()
    password = random_lower_string()
    user_create = UserCreate(email=email, password=password, is_active=False)
    user = create_user(session=db, user_create=user_create)

    token = create_access_token(
        subject=str(user.id), expires_delta=timedelta(minutes=30)
    )

    headers = {"Authorization": f"Bearer {token}"}
    r = client.post(f"{settings.API_V1_STR}/login/test-token", headers=headers)
    assert r.status_code == 400
    assert r.json()["detail"] == "Inactive user"
