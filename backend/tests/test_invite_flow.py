import secrets
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.rate_limit import limiter
from app.models import AccessRequest, InviteToken


@pytest.fixture(autouse=True)
def reset_rate_limiter() -> None:
    """Reset the in-memory rate limiter before each test to avoid cross-test interference."""
    limiter._storage.reset()  # type: ignore[union-attr]


def _create_valid_token(db: Session) -> tuple[str, AccessRequest, InviteToken]:
    """Helper: create an access request + valid invite token.

    Returns (token_string, access_request, invite_token).
    Callers are responsible for cleaning up the returned objects.
    Uses a unique tg_user_id per call to avoid collisions with other tests.
    """
    import secrets as _secrets

    ar = AccessRequest(
        # Use a random user id to avoid conflicts with telegram service tests
        telegram_user_id=900000 + int(_secrets.token_hex(2), 16),
        telegram_first_name="Invitee",
        status="approved",
    )
    db.add(ar)
    db.commit()
    db.refresh(ar)

    tok = InviteToken(access_request_id=ar.id)
    db.add(tok)
    db.commit()
    db.refresh(tok)
    return tok.token, ar, tok


def _create_expired_token(db: Session) -> tuple[str, AccessRequest, InviteToken]:
    """Helper: create an expired invite token.

    Returns (token_string, access_request, invite_token).
    Callers are responsible for cleaning up the returned objects.
    """
    import secrets as _secrets

    ar = AccessRequest(
        telegram_user_id=800000 + int(_secrets.token_hex(2), 16),
        telegram_first_name="Expired",
        status="approved",
    )
    db.add(ar)
    db.commit()
    db.refresh(ar)

    tok = InviteToken(
        access_request_id=ar.id,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db.add(tok)
    db.commit()
    db.refresh(tok)
    return tok.token, ar, tok


def test_signup_with_valid_token(client: TestClient, db: Session) -> None:
    """Signup succeeds with a valid, unused, non-expired token."""
    token_str, ar, tok = _create_valid_token(db)
    response = client.post(
        "/api/v1/users/signup",
        json={
            "email": f"invite-{secrets.token_hex(4)}@example.com",
            "password": "testpass123",
            "full_name": "Invite User",
            "invite_token": token_str,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["email"].startswith("invite-")
    # AR is cleaned up by conftest teardown (InviteToken → AccessRequest order)


def test_signup_without_token_fails_when_bot_configured(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Signup without invite_token returns 400 when TG_BOT_TOKEN is set."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "test_token")

    response = client.post(
        "/api/v1/users/signup",
        json={
            "email": f"notoken-{secrets.token_hex(4)}@example.com",
            "password": "testpass123",
            "full_name": "No Token",
        },
    )
    assert response.status_code == 400
    assert "Invalid or expired" in response.json()["detail"]


def test_signup_with_expired_token_fails(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Signup with an expired token returns 400."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "test_token")

    token_str, ar, tok = _create_expired_token(db)
    response = client.post(
        "/api/v1/users/signup",
        json={
            "email": f"expired-{secrets.token_hex(4)}@example.com",
            "password": "testpass123",
            "full_name": "Expired Token User",
            "invite_token": token_str,
        },
    )
    assert response.status_code == 400
    assert "Invalid or expired" in response.json()["detail"]
    db.delete(tok)
    db.delete(ar)
    db.commit()


def test_signup_with_used_token_fails(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Signup with an already-used token returns 400."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "test_token")

    token_str, ar, tok = _create_valid_token(db)
    response1 = client.post(
        "/api/v1/users/signup",
        json={
            "email": f"first-{secrets.token_hex(4)}@example.com",
            "password": "testpass123",
            "full_name": "First User",
            "invite_token": token_str,
        },
    )
    assert response1.status_code == 200

    response2 = client.post(
        "/api/v1/users/signup",
        json={
            "email": f"second-{secrets.token_hex(4)}@example.com",
            "password": "testpass123",
            "full_name": "Second User",
            "invite_token": token_str,
        },
    )
    assert response2.status_code == 400
    assert "Invalid or expired" in response2.json()["detail"]
    # AR and tok cleaned up by conftest teardown


def test_signup_with_invalid_token_fails(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Signup with a nonexistent token returns 400."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "test_token")

    response = client.post(
        "/api/v1/users/signup",
        json={
            "email": f"bad-{secrets.token_hex(4)}@example.com",
            "password": "testpass123",
            "full_name": "Bad Token User",
            "invite_token": "nonexistent_token_value",
        },
    )
    assert response.status_code == 400
    assert "Invalid or expired" in response.json()["detail"]


def test_validate_token_valid(client: TestClient, db: Session) -> None:
    """GET /validate-token returns valid=true for a fresh token."""
    token_str, ar, tok = _create_valid_token(db)
    response = client.get(f"/api/v1/users/validate-token?token={token_str}")
    assert response.status_code == 200
    assert response.json()["valid"] is True
    db.delete(tok)
    db.delete(ar)
    db.commit()


def test_validate_token_expired(client: TestClient, db: Session) -> None:
    """GET /validate-token returns valid=false for an expired token."""
    token_str, ar, tok = _create_expired_token(db)
    response = client.get(f"/api/v1/users/validate-token?token={token_str}")
    assert response.status_code == 200
    assert response.json()["valid"] is False
    db.delete(tok)
    db.delete(ar)
    db.commit()


def test_validate_token_nonexistent(client: TestClient) -> None:
    """GET /validate-token returns valid=false for an unknown token."""
    response = client.get("/api/v1/users/validate-token?token=doesnotexist")
    assert response.status_code == 200
    assert response.json()["valid"] is False


def test_webhook_rejects_missing_secret_header(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """POST to /api/v1/telegram/webhook without X-Telegram-Bot-Api-Secret-Token returns 403."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "test_token")
    monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 12345)

    response = client.post(
        "/api/v1/telegram/webhook",
        json={"update_id": 1},
    )
    assert response.status_code == 403


def test_webhook_returns_404_when_telegram_not_configured(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """POST to /api/v1/telegram/webhook returns 404 when TG_BOT_TOKEN is empty."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "")
    monkeypatch.setattr(settings, "TG_SUPERUSER_ID", None)

    response = client.post(
        "/api/v1/telegram/webhook",
        json={"update_id": 1},
    )
    assert response.status_code == 404


def test_webhook_returns_200_with_valid_secret(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """POST to /api/v1/telegram/webhook returns 200 ok when secret matches."""
    from app.core.config import settings
    from app.services.telegram import get_webhook_secret

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "test_token")
    monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 12345)
    monkeypatch.setattr(settings, "TG_WEBHOOK_SECRET", "my_secret")

    response = client.post(
        "/api/v1/telegram/webhook",
        json={"update_id": 1},
        headers={"X-Telegram-Bot-Api-Secret-Token": get_webhook_secret()},
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_webhook_ignores_non_superuser_callback(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Callback query from non-superuser chat_id silently does nothing (still returns 200)."""
    from app.core.config import settings
    from app.services.telegram import get_webhook_secret

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "test_token")
    monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 99999)
    monkeypatch.setattr(settings, "TG_WEBHOOK_SECRET", "my_secret")

    # caller_id (12345) != TG_SUPERUSER_ID (99999) — should be silently ignored
    response = client.post(
        "/api/v1/telegram/webhook",
        json={
            "update_id": 2,
            "callback_query": {
                "id": "cb_ignored",
                "data": "approve:1",
                "from": {"id": 12345},
                "message": {"chat": {"id": 12345}, "message_id": 1},
            },
        },
        headers={"X-Telegram-Bot-Api-Secret-Token": get_webhook_secret()},
    )
    assert response.status_code == 200


@pytest.mark.anyio
async def test_handle_start_approved_user_with_active_token_resends_signup_url(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """handle_start for an approved user with an active token resends the signup URL."""
    from app.core.config import settings
    from app.services import telegram as tg_service

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "fake_token")
    monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 999)
    monkeypatch.setattr(settings, "FRONTEND_HOST", "http://localhost")

    import secrets as _secrets

    tg_uid = 700000 + int(_secrets.token_hex(2), 16)
    ar = AccessRequest(
        telegram_user_id=tg_uid,
        telegram_first_name="ActiveToken",
        status="approved",
    )
    db.add(ar)
    db.commit()
    db.refresh(ar)

    tok = InviteToken(access_request_id=ar.id)
    db.add(tok)
    db.commit()
    db.refresh(tok)

    send_calls: list[dict] = []

    async def mock_send(
        chat_id: int, text: str, reply_markup: dict | None = None
    ) -> bool:
        send_calls.append({"chat_id": chat_id, "text": text})
        return True

    monkeypatch.setattr(tg_service, "send_message", mock_send)

    message = {
        "chat": {"id": tg_uid},
        "from": {"id": tg_uid, "first_name": "ActiveToken"},
    }
    await tg_service.handle_start(db, message)

    assert len(send_calls) == 1
    assert tok.token in send_calls[0]["text"]
    assert (
        "approved" in send_calls[0]["text"].lower()
        or "token" in send_calls[0]["text"].lower()
    )

    db.delete(tok)
    db.delete(ar)
    db.commit()


@pytest.mark.anyio
async def test_handle_start_approved_user_with_used_token_tells_user_they_have_account(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """handle_start for an approved user who already used their token tells them they have an account."""
    from datetime import datetime, timezone

    from app.core.config import settings
    from app.services import telegram as tg_service

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "fake_token")
    monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 999)
    monkeypatch.setattr(settings, "FRONTEND_HOST", "http://localhost")

    import secrets as _secrets

    tg_uid = 600000 + int(_secrets.token_hex(2), 16)
    ar = AccessRequest(
        telegram_user_id=tg_uid,
        telegram_first_name="UsedToken",
        status="approved",
    )
    db.add(ar)
    db.commit()
    db.refresh(ar)

    # Mark the token as used
    tok = InviteToken(
        access_request_id=ar.id,
        used_at=datetime.now(timezone.utc),
    )
    db.add(tok)
    db.commit()
    db.refresh(tok)

    send_calls: list[dict] = []

    async def mock_send(
        chat_id: int, text: str, reply_markup: dict | None = None
    ) -> bool:
        send_calls.append({"chat_id": chat_id, "text": text})
        return True

    monkeypatch.setattr(tg_service, "send_message", mock_send)

    message = {
        "chat": {"id": tg_uid},
        "from": {"id": tg_uid, "first_name": "UsedToken"},
    }
    await tg_service.handle_start(db, message)

    assert len(send_calls) == 1
    assert (
        "account" in send_calls[0]["text"].lower()
        or "log in" in send_calls[0]["text"].lower()
    )

    db.delete(tok)
    db.delete(ar)
    db.commit()
