from fastapi import APIRouter

from app.api.routes import (
    chat,
    config,
    dictionary,
    lessons,
    login,
    private,
    progress,
    telegram,
    users,
    utils,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(dictionary.router)
api_router.include_router(lessons.router)
api_router.include_router(chat.router)
api_router.include_router(progress.router)
api_router.include_router(config.router)
# Telegram router always registered; handler returns 404 when bot is not configured.
# Unconditional registration is required for testability (route must exist at
# import time; monkeypatching settings after import can't retroactively add routes).
api_router.include_router(telegram.router)

if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
