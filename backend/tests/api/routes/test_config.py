"""Tests for app/api/routes/config.py — public config endpoint."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings


def test_get_public_config_returns_200(client: TestClient) -> None:
    """GET /config/public returns 200 with no auth required."""
    r = client.get(f"{settings.API_V1_STR}/config/public")
    assert r.status_code == 200


def test_get_public_config_response_shape(client: TestClient) -> None:
    """GET /config/public response contains bot_username key."""
    r = client.get(f"{settings.API_V1_STR}/config/public")
    data = r.json()
    assert "bot_username" in data


def test_get_public_config_bot_username_when_set(client: TestClient) -> None:
    """GET /config/public returns configured TG_BOT_USERNAME."""
    with patch.object(settings, "TG_BOT_USERNAME", "testbot"):
        r = client.get(f"{settings.API_V1_STR}/config/public")
    assert r.json()["bot_username"] == "testbot"


def test_get_public_config_bot_username_when_unset(client: TestClient) -> None:
    """GET /config/public returns None when TG_BOT_USERNAME is not set."""
    with patch.object(settings, "TG_BOT_USERNAME", None):
        r = client.get(f"{settings.API_V1_STR}/config/public")
    assert r.json()["bot_username"] is None


def test_get_public_config_no_auth_required(client: TestClient) -> None:
    """GET /config/public is accessible without Authorization header."""
    r = client.get(
        f"{settings.API_V1_STR}/config/public",
        headers={},  # no Authorization
    )
    assert r.status_code == 200
