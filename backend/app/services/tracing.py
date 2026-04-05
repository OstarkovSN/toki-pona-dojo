"""LangFuse tracing integration with graceful degradation.

When LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY are set, tracing is active.
When they are empty or LangFuse is unreachable, the app continues without tracing.
"""

import logging
import os
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


def _configure_langfuse_env() -> bool:
    """Push LangFuse credentials into env vars (required by langfuse.openai drop-in).

    Returns True if all required credentials are present, False otherwise.
    """
    if not (
        settings.LANGFUSE_SECRET_KEY
        and settings.LANGFUSE_PUBLIC_KEY
        and settings.LANGFUSE_HOST
    ):
        return False
    os.environ["LANGFUSE_SECRET_KEY"] = settings.LANGFUSE_SECRET_KEY
    os.environ["LANGFUSE_PUBLIC_KEY"] = settings.LANGFUSE_PUBLIC_KEY
    os.environ["LANGFUSE_HOST"] = settings.LANGFUSE_HOST
    return True


def get_langfuse_handler() -> Any:
    """Return a Langfuse CallbackHandler if configured, else None.

    Useful for LangChain-style integrations. For direct OpenAI usage,
    prefer the langfuse.openai drop-in (see llm.py).
    """
    if not _configure_langfuse_env():
        return None
    try:
        from langfuse.callback import CallbackHandler  # type: ignore[import-not-found]

        return CallbackHandler()
    except Exception:
        logger.exception("Failed to create Langfuse CallbackHandler")
        return None


def get_langfuse_config() -> dict[str, object]:
    """Return a config dict with Langfuse callbacks, or {} if not configured."""
    handler = get_langfuse_handler()
    if handler is None:
        return {}
    return {"callbacks": [handler]}


def check_langfuse_auth() -> bool:
    """Check Langfuse auth at startup. Returns True if OK, False otherwise.

    Logs status but NEVER raises --- graceful degradation is mandatory.
    """
    if not (settings.LANGFUSE_SECRET_KEY and settings.LANGFUSE_PUBLIC_KEY):
        logger.warning(
            "Langfuse tracing disabled --- set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY"
        )
        return False
    try:
        from langfuse import Langfuse

        client = Langfuse(
            secret_key=settings.LANGFUSE_SECRET_KEY,
            public_key=settings.LANGFUSE_PUBLIC_KEY,
            host=settings.LANGFUSE_HOST,
        )
        client.auth_check()
        logger.info("Langfuse tracing enabled --- host=%s", settings.LANGFUSE_HOST)
        return True
    except Exception:
        logger.exception("Langfuse auth check failed --- tracing disabled")
        return False
