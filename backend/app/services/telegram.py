import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlmodel import Session, col, select

from app.core.config import settings
from app.models import AccessRequest, InviteToken

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org/bot"

_GENERATED_SECRET = secrets.token_urlsafe(32)


def get_webhook_secret() -> str:
    """Return the webhook secret, preferring the configured value."""
    return settings.TG_WEBHOOK_SECRET or _GENERATED_SECRET


def is_telegram_enabled() -> bool:
    """Bot is enabled only when both token and superuser ID are set."""
    return bool(settings.TG_BOT_TOKEN and settings.TG_SUPERUSER_ID)


async def send_message(
    chat_id: int,
    text: str,
    reply_markup: dict[str, Any] | None = None,
) -> bool:
    """Send a message via Telegram Bot API."""
    if not settings.TG_BOT_TOKEN:
        return False
    payload: dict[str, Any] = {"chat_id": chat_id, "text": text}
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/sendMessage",
                json=payload,
            )
            response.raise_for_status()
            return True
    except httpx.HTTPError:
        logger.exception("Failed to send Telegram message to chat_id=%s", chat_id)
        return False


async def edit_message_text(
    chat_id: int,
    message_id: int,
    text: str,
    reply_markup: dict[str, Any] | None = None,
) -> bool:
    """Edit an existing message. Pass reply_markup=None to remove inline keyboard."""
    if not settings.TG_BOT_TOKEN:
        return False
    payload: dict[str, Any] = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
    }
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    else:
        payload["reply_markup"] = {"inline_keyboard": []}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/editMessageText",
                json=payload,
            )
            response.raise_for_status()
            return True
    except httpx.HTTPError:
        logger.exception(
            "Failed to edit Telegram message chat_id=%s message_id=%s",
            chat_id,
            message_id,
        )
        return False


async def answer_callback_query(callback_query_id: str) -> bool:
    """Acknowledge a callback query to remove the loading spinner."""
    if not settings.TG_BOT_TOKEN:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/answerCallbackQuery",
                json={"callback_query_id": callback_query_id},
            )
            response.raise_for_status()
            return True
    except httpx.HTTPError:
        logger.exception("Failed to answer callback query %s", callback_query_id)
        return False


def _format_user_display(
    first_name: str,
    last_name: str | None,
    username: str | None,
) -> str:
    """Build a display string like 'Jan Pona @janpona'."""
    parts = [first_name]
    if last_name:
        parts.append(last_name)
    if username:
        parts.append(f"@{username}")
    return " ".join(parts)


async def handle_start(session: Session, message: dict[str, Any]) -> None:
    """Handle /start command: create access request or resend existing state."""
    from_user = message.get("from", {})
    chat_id: int = message.get("chat", {}).get("id", 0)
    tg_user_id: int = from_user.get("id", 0)
    first_name: str = from_user.get("first_name", "Unknown")
    last_name: str | None = from_user.get("last_name")
    username: str | None = from_user.get("username")

    if not chat_id or not tg_user_id:
        logger.warning(
            "Telegram /start message missing chat.id or from.id: %s",
            {k: message.get(k) for k in ("chat", "from")},
        )
        return

    statement = (
        select(AccessRequest)
        .where(AccessRequest.telegram_user_id == tg_user_id)
        .order_by(col(AccessRequest.created_at).desc())
    )
    existing = session.exec(statement).first()

    if existing is not None:
        if existing.status == "pending":
            await send_message(
                chat_id, "Your request is pending approval. Please wait."
            )
            return

        if existing.status == "rejected":
            if existing.decided_at and (
                datetime.now(timezone.utc) - existing.decided_at < timedelta(hours=24)
            ):
                await send_message(
                    chat_id,
                    "You can re-request access after 24 hours.",
                )
                return

        if existing.status == "approved":
            token_stmt = select(InviteToken).where(
                InviteToken.access_request_id == existing.id,
                InviteToken.used_at.is_(None),  # type: ignore[union-attr]
                InviteToken.expires_at > datetime.now(timezone.utc),
            )
            active_token = session.exec(token_stmt).first()
            if active_token:
                signup_url = (
                    f"{settings.FRONTEND_HOST}/signup?token={active_token.token}"
                )
                await send_message(
                    chat_id,
                    f"You're already approved! Use this token to create your "
                    f"account: {active_token.token}\n\nGo to {signup_url}",
                )
                return

            used_token_stmt = select(InviteToken).where(
                InviteToken.access_request_id == existing.id,
                InviteToken.used_at.isnot(None),  # type: ignore[union-attr]
            )
            used_token = session.exec(used_token_stmt).first()
            if used_token:
                await send_message(
                    chat_id,
                    f"You already have an account! Log in at {settings.FRONTEND_HOST}",
                )
                return

            # All tokens expired but none used — re-issue a token
            new_token = InviteToken(access_request_id=existing.id)
            session.add(new_token)
            session.commit()
            session.refresh(new_token)
            signup_url = f"{settings.FRONTEND_HOST}/signup?token={new_token.token}"
            await send_message(
                chat_id,
                f"Your previous invite token expired. Here's a new one: "
                f"{new_token.token}\n\nGo to {signup_url}",
            )
            return

    access_request = AccessRequest(
        telegram_user_id=tg_user_id,
        telegram_username=username,
        telegram_first_name=first_name,
        telegram_last_name=last_name,
        status="pending",
    )
    session.add(access_request)
    session.commit()
    session.refresh(access_request)

    display = _format_user_display(first_name, last_name, username)

    notified_superuser = await send_message(
        settings.TG_SUPERUSER_ID,  # type: ignore[arg-type]
        f"{display} wants to access the app",
        reply_markup={
            "inline_keyboard": [
                [
                    {
                        "text": "Approve",
                        "callback_data": f"approve:{access_request.id}",
                    },
                    {
                        "text": "Reject",
                        "callback_data": f"reject:{access_request.id}",
                    },
                ]
            ]
        },
    )
    if not notified_superuser:
        logger.warning(
            "New access request %s from user %s but failed to notify superuser via Telegram",
            access_request.id,
            tg_user_id,
        )

    await send_message(
        chat_id,
        "Your request has been sent to the admin. Please wait for approval.",
    )


async def handle_callback_query(
    session: Session, callback_query: dict[str, Any]
) -> None:
    """Handle superuser Approve/Reject button press."""
    callback_id: str = callback_query["id"]
    data: str = callback_query.get("data", "")
    from_user = callback_query.get("from", {})
    caller_id: int = from_user.get("id", 0)
    message = callback_query.get("message", {})
    chat_id: int = message.get("chat", {}).get("id", 0)
    message_id: int = message.get("message_id", 0)

    if caller_id != settings.TG_SUPERUSER_ID:
        await answer_callback_query(callback_id)
        return

    if ":" not in data:
        await answer_callback_query(callback_id)
        return

    action, request_id_str = data.split(":", 1)
    try:
        request_id = int(request_id_str)
    except ValueError:
        await answer_callback_query(callback_id)
        return

    access_request = session.get(AccessRequest, request_id)
    if not access_request:
        await answer_callback_query(callback_id)
        return

    display = _format_user_display(
        access_request.telegram_first_name,
        access_request.telegram_last_name,
        access_request.telegram_username,
    )

    if action == "approve":
        existing_token_stmt = select(InviteToken).where(
            InviteToken.access_request_id == access_request.id
        )
        if session.exec(existing_token_stmt).first() is not None:
            await answer_callback_query(callback_id)
            return

        access_request.status = "approved"
        access_request.decided_at = datetime.now(timezone.utc)
        session.add(access_request)

        invite_token = InviteToken(access_request_id=access_request.id)
        session.add(invite_token)
        session.commit()
        session.refresh(invite_token)

        signup_url = f"{settings.FRONTEND_HOST}/signup?token={invite_token.token}"
        notified = await send_message(
            access_request.telegram_user_id,
            f"You're approved! Use this token to create your account: "
            f"{invite_token.token}\n\nGo to {signup_url}",
        )
        if not notified:
            logger.warning(
                "Approved user %s (request %s) but failed to deliver invite token via Telegram",
                access_request.telegram_user_id,
                request_id,
            )
        await edit_message_text(chat_id, message_id, f"Approved: {display}")

    elif action == "reject":
        access_request.status = "rejected"
        access_request.decided_at = datetime.now(timezone.utc)
        session.add(access_request)
        session.commit()

        await send_message(
            access_request.telegram_user_id,
            "Sorry, your request was not approved.",
        )
        await edit_message_text(chat_id, message_id, f"Rejected: {display}")

    else:
        logger.warning(
            "Unknown callback action %r for request_id=%s", action, request_id
        )

    await answer_callback_query(callback_id)


async def handle_update(session: Session, update: dict[str, Any]) -> None:
    """Route an incoming Telegram update to the correct handler."""
    if "message" in update:
        message = update["message"]
        text = message.get("text", "")
        if text.startswith("/start"):
            await handle_start(session, message)
    elif "callback_query" in update:
        await handle_callback_query(session, update["callback_query"])


async def set_webhook(webhook_url: str) -> bool:
    """Register the webhook URL with Telegram, including secret_token."""
    if not settings.TG_BOT_TOKEN:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/setWebhook",
                json={
                    "url": webhook_url,
                    "secret_token": get_webhook_secret(),
                },
            )
            response.raise_for_status()
            logger.info("Telegram webhook set to %s", webhook_url)
            return True
    except httpx.HTTPError:
        logger.exception("Failed to set Telegram webhook")
        return False


async def delete_webhook() -> bool:
    """Remove the webhook on shutdown."""
    if not settings.TG_BOT_TOKEN:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/deleteWebhook",
            )
            response.raise_for_status()
            logger.info("Telegram webhook deleted")
            return True
    except httpx.HTTPError:
        logger.exception("Failed to delete Telegram webhook")
        return False
