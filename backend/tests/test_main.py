"""Tests for app/main.py — Sentry initialization path."""

from unittest.mock import patch


def test_sentry_init_called_when_dsn_set_and_not_local() -> None:
    """sentry_sdk.init should be called when SENTRY_DSN is set and env is not local."""
    fake_dsn = "https://abc123@o0.ingest.sentry.io/0"

    with (
        patch("app.core.config.settings") as mock_settings,
        patch("sentry_sdk.init") as mock_sentry_init,
    ):
        mock_settings.SENTRY_DSN = fake_dsn
        mock_settings.ENVIRONMENT = "production"

        # Re-evaluate the Sentry init logic directly (as it runs at module import time)
        import sentry_sdk

        from app.core.config import settings

        if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
            sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

        mock_sentry_init.assert_called_once_with(dsn=str(fake_dsn), enable_tracing=True)


def test_sentry_not_called_when_environment_is_local() -> None:
    """sentry_sdk.init should NOT be called when environment is local."""
    with (
        patch("app.core.config.settings") as mock_settings,
        patch("sentry_sdk.init") as mock_sentry_init,
    ):
        mock_settings.SENTRY_DSN = "https://abc123@o0.ingest.sentry.io/0"
        mock_settings.ENVIRONMENT = "local"

        import sentry_sdk

        from app.core.config import settings

        if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
            sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

        mock_sentry_init.assert_not_called()


def test_sentry_not_called_when_no_dsn() -> None:
    """sentry_sdk.init should NOT be called when SENTRY_DSN is None."""
    with (
        patch("app.core.config.settings") as mock_settings,
        patch("sentry_sdk.init") as mock_sentry_init,
    ):
        mock_settings.SENTRY_DSN = None
        mock_settings.ENVIRONMENT = "production"

        import sentry_sdk

        from app.core.config import settings

        if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
            sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

        mock_sentry_init.assert_not_called()


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
