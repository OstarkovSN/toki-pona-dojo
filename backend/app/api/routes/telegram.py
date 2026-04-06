import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.api.deps import SessionDep
from app.services.telegram import get_webhook_secret, handle_update, is_telegram_enabled

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook")
async def telegram_webhook(request: Request, session: SessionDep) -> dict[str, Any]:
    """Receive Telegram bot updates. Validates secret_token header."""
    if not is_telegram_enabled():
        raise HTTPException(status_code=404, detail="Telegram bot not configured")

    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if secret != get_webhook_secret():
        raise HTTPException(status_code=403, detail="Invalid secret token")

    try:
        update = await request.json()
    except Exception:
        logger.warning("Telegram webhook received unparseable body")
        return {"ok": True}
    try:
        await handle_update(session, update)
    except Exception:
        update_keys = list(update.keys()) if isinstance(update, dict) else "non-dict"
        logger.exception(
            "Error processing Telegram update. Top-level keys: %s", update_keys
        )
    return {"ok": True}
