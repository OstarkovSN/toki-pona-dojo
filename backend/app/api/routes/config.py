from typing import Any

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/public")
def get_public_config() -> dict[str, Any]:
    """Return public configuration (no auth required).

    Exposes bot_username for frontend Telegram links.
    """
    return {
        "bot_username": settings.TG_BOT_USERNAME,
    }
