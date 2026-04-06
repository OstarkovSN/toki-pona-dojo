from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import Session, select

from app.models import AccessRequest, InviteToken


def test_access_request_creation(db: Session) -> None:
    """AccessRequest can be created and persisted."""
    ar = AccessRequest(
        telegram_user_id=123456,
        telegram_username="testuser",
        telegram_first_name="Test",
        status="pending",
    )
    db.add(ar)
    db.commit()
    db.refresh(ar)

    assert ar.id is not None
    assert ar.telegram_user_id == 123456
    assert ar.status == "pending"
    assert ar.decided_at is None

    db.delete(ar)
    db.commit()


def test_invite_token_creation(db: Session) -> None:
    """InviteToken is created with defaults and linked to AccessRequest."""
    ar = AccessRequest(
        telegram_user_id=789,
        telegram_first_name="Tokiuser",
        status="approved",
    )
    db.add(ar)
    db.commit()
    db.refresh(ar)

    token = InviteToken(access_request_id=ar.id)
    db.add(token)
    db.commit()
    db.refresh(token)

    assert token.id is not None
    assert len(token.token) == 32  # token_hex(16) -> 32 chars
    assert token.used_at is None
    assert token.used_by is None
    assert token.expires_at > datetime.now(timezone.utc)

    db.delete(token)
    db.delete(ar)
    db.commit()


def test_invite_token_expiry(db: Session) -> None:
    """Expired tokens are distinguishable from valid ones."""
    ar = AccessRequest(
        telegram_user_id=999,
        telegram_first_name="Expired",
        status="approved",
    )
    db.add(ar)
    db.commit()
    db.refresh(ar)

    token = InviteToken(
        access_request_id=ar.id,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db.add(token)
    db.commit()
    db.refresh(token)

    assert token.expires_at < datetime.now(timezone.utc)

    db.delete(token)
    db.delete(ar)
    db.commit()


@pytest.mark.anyio
async def test_handle_start_new_user_creates_request_and_notifies_superuser(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """handle_start creates an AccessRequest and sends approve/reject buttons to superuser."""
    from app.core.config import settings
    from app.services import telegram as tg_service

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "fake_token")
    monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 999)

    send_calls: list[dict] = []

    async def mock_send(
        chat_id: int, text: str, reply_markup: dict | None = None
    ) -> bool:
        send_calls.append(
            {"chat_id": chat_id, "text": text, "reply_markup": reply_markup}
        )
        return True

    monkeypatch.setattr(tg_service, "send_message", mock_send)

    message = {
        "chat": {"id": 123},
        "from": {"id": 42, "first_name": "Tester", "username": "tester42"},
    }
    await tg_service.handle_start(db, message)

    ar = db.exec(
        select(AccessRequest).where(AccessRequest.telegram_user_id == 42)
    ).first()
    assert ar is not None
    assert ar.status == "pending"

    superuser_msg = [c for c in send_calls if c["chat_id"] == 999]
    assert len(superuser_msg) == 1
    assert "wants to access" in superuser_msg[0]["text"]
    assert superuser_msg[0]["reply_markup"] is not None

    db.delete(ar)
    db.commit()


@pytest.mark.anyio
async def test_handle_start_pending_user_gets_pending_message(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """handle_start for a user with a pending request sends 'pending' message."""
    from app.core.config import settings
    from app.services import telegram as tg_service

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "fake_token")
    monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 999)

    ar = AccessRequest(
        telegram_user_id=55, telegram_first_name="Pending", status="pending"
    )
    db.add(ar)
    db.commit()

    send_calls: list[dict] = []

    async def mock_send(
        chat_id: int, text: str, reply_markup: dict | None = None
    ) -> bool:
        send_calls.append({"chat_id": chat_id, "text": text})
        return True

    monkeypatch.setattr(tg_service, "send_message", mock_send)

    message = {
        "chat": {"id": 55},
        "from": {"id": 55, "first_name": "Pending"},
    }
    await tg_service.handle_start(db, message)

    assert any("pending" in c["text"].lower() for c in send_calls)

    db.delete(ar)
    db.commit()


@pytest.mark.anyio
async def test_handle_callback_approve_creates_token_and_notifies_user(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Approving via callback creates an InviteToken and notifies the requesting user."""
    from app.core.config import settings
    from app.services import telegram as tg_service

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "fake_token")
    monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 999)
    monkeypatch.setattr(settings, "FRONTEND_HOST", "http://localhost")

    ar = AccessRequest(
        telegram_user_id=77, telegram_first_name="Applicant", status="pending"
    )
    db.add(ar)
    db.commit()
    db.refresh(ar)

    send_calls: list[dict] = []

    async def mock_send(
        chat_id: int, text: str, reply_markup: dict | None = None
    ) -> bool:
        send_calls.append({"chat_id": chat_id, "text": text})
        return True

    async def mock_edit(*args: object, **kwargs: object) -> bool:
        return True

    async def mock_answer(*args: object) -> bool:
        return True

    monkeypatch.setattr(tg_service, "send_message", mock_send)
    monkeypatch.setattr(tg_service, "edit_message_text", mock_edit)
    monkeypatch.setattr(tg_service, "answer_callback_query", mock_answer)

    callback_query = {
        "id": "cb1",
        "data": f"approve:{ar.id}",
        "from": {"id": 999},
        "message": {"chat": {"id": 999}, "message_id": 1},
    }
    await tg_service.handle_callback_query(db, callback_query)

    token = db.exec(
        select(InviteToken).where(InviteToken.access_request_id == ar.id)
    ).first()
    assert token is not None
    assert token.used_at is None

    user_msg = [c for c in send_calls if c["chat_id"] == 77]
    assert len(user_msg) == 1
    assert token.token in user_msg[0]["text"]

    db.delete(token)
    db.delete(ar)
    db.commit()


@pytest.mark.anyio
async def test_handle_callback_reject_updates_status_and_notifies_user(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Rejecting via callback sets status to 'rejected' and notifies the user."""
    from app.core.config import settings
    from app.services import telegram as tg_service

    monkeypatch.setattr(settings, "TG_BOT_TOKEN", "fake_token")
    monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 999)

    ar = AccessRequest(
        telegram_user_id=88, telegram_first_name="Rejected", status="pending"
    )
    db.add(ar)
    db.commit()
    db.refresh(ar)

    send_calls: list[dict] = []

    async def mock_send(
        chat_id: int, text: str, reply_markup: dict | None = None
    ) -> bool:
        send_calls.append({"chat_id": chat_id, "text": text})
        return True

    async def mock_edit(*args: object, **kwargs: object) -> bool:
        return True

    async def mock_answer(*args: object) -> bool:
        return True

    monkeypatch.setattr(tg_service, "send_message", mock_send)
    monkeypatch.setattr(tg_service, "edit_message_text", mock_edit)
    monkeypatch.setattr(tg_service, "answer_callback_query", mock_answer)

    callback_query = {
        "id": "cb2",
        "data": f"reject:{ar.id}",
        "from": {"id": 999},
        "message": {"chat": {"id": 999}, "message_id": 2},
    }
    await tg_service.handle_callback_query(db, callback_query)

    db.refresh(ar)
    assert ar.status == "rejected"
    assert ar.decided_at is not None

    user_msg = [c for c in send_calls if c["chat_id"] == 88]
    assert len(user_msg) == 1
    assert "not approved" in user_msg[0]["text"].lower()

    db.delete(ar)
    db.commit()
