"""Tests for app/core/rate_limit.py — limiter configuration."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.rate_limit import limiter


@pytest.fixture(autouse=True)
def reset_rate_limit_storage() -> None:
    """Reset in-memory rate limit storage before each test to prevent cross-test bleed."""
    try:
        limiter._storage.reset()
    except AttributeError:
        pass


def test_limiter_is_configured() -> None:
    """Rate limiter instance is created and has expected attributes."""
    assert limiter is not None
    # The limiter should have a key function
    assert (
        hasattr(limiter, "_key_func")
        or hasattr(limiter, "key_func")
        or callable(limiter)
    )


def test_rate_limit_chat_endpoint_returns_200(client: TestClient) -> None:
    """Chat stream response succeeds after rate limit storage reset."""
    from unittest.mock import MagicMock, patch

    with patch("app.api.routes.chat.get_llm_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = iter([])
        mock_get_client.return_value = mock_client

        body = {
            "messages": [{"role": "user", "content": "toki"}],
            "mode": "free_chat",
            "known_words": ["mi"],
            "current_unit": 1,
            "recent_errors": [],
        }
        response = client.post(
            f"{settings.API_V1_STR}/chat/stream",
            json=body,
        )
    assert response.status_code == 200
