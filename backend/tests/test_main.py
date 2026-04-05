"""Tests for app/main.py — Sentry initialization path."""

from unittest.mock import MagicMock, patch


def test_sentry_init_called_when_dsn_set_and_not_local() -> None:
    """sentry_sdk.init should be called when SENTRY_DSN is set and env is not local."""
    fake_dsn = "https://abc123@o0.ingest.sentry.io/0"

    mock_settings = MagicMock()
    mock_settings.SENTRY_DSN = fake_dsn
    mock_settings.ENVIRONMENT = "production"

    with (
        patch("app.main.settings", mock_settings),
        patch("app.main.sentry_sdk") as mock_sentry,
    ):
        from app.main import configure_sentry

        configure_sentry()

        mock_sentry.init.assert_called_once_with(dsn=str(fake_dsn), enable_tracing=True)


def test_sentry_not_called_when_environment_is_local() -> None:
    """sentry_sdk.init should NOT be called when environment is local."""
    mock_settings = MagicMock()
    mock_settings.SENTRY_DSN = "https://abc123@o0.ingest.sentry.io/0"
    mock_settings.ENVIRONMENT = "local"

    with (
        patch("app.main.settings", mock_settings),
        patch("app.main.sentry_sdk") as mock_sentry,
    ):
        from app.main import configure_sentry

        configure_sentry()

        mock_sentry.init.assert_not_called()


def test_sentry_not_called_when_no_dsn() -> None:
    """sentry_sdk.init should NOT be called when SENTRY_DSN is None."""
    mock_settings = MagicMock()
    mock_settings.SENTRY_DSN = None
    mock_settings.ENVIRONMENT = "production"

    with (
        patch("app.main.settings", mock_settings),
        patch("app.main.sentry_sdk") as mock_sentry,
    ):
        from app.main import configure_sentry

        configure_sentry()

        mock_sentry.init.assert_not_called()


def test_app_is_fastapi_instance() -> None:
    """The FastAPI app should be importable and be a FastAPI instance."""
    from fastapi import FastAPI

    from app.main import app

    assert isinstance(app, FastAPI)


def test_app_has_api_router() -> None:
    """The app should have routes registered under the API prefix."""
    from app.core.config import settings
    from app.main import app

    routes = [r.path for r in app.routes]  # type: ignore[attr-defined]
    # At least one route should start with the API prefix
    assert any(r.startswith(settings.API_V1_STR) for r in routes)


def test_lifespan_continues_when_check_langfuse_auth_raises() -> None:
    """gap-56: App lifespan still completes when check_langfuse_auth raises."""
    from fastapi.testclient import TestClient

    from app.main import app

    with patch(
        "app.main.check_langfuse_auth", side_effect=Exception("langfuse unavailable")
    ):
        try:
            with TestClient(app) as c:
                r = c.get("/api/v1/utils/health-check/")
                assert r.status_code == 200
        except Exception as exc:
            raise AssertionError(
                f"Lifespan crashed when check_langfuse_auth raised: {exc}"
            ) from exc
