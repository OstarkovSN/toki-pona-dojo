"""Tests for LangFuse tracing module --- graceful degradation is the key property."""

import os
import sys
from unittest.mock import MagicMock, patch

from app.services.tracing import (
    _configure_langfuse_env,
    check_langfuse_auth,
    get_langfuse_config,
    get_langfuse_handler,
)

# Langfuse may not be installed in this environment; stub it out so patch() can target it.
if "langfuse" not in sys.modules:
    _langfuse_stub = MagicMock()
    sys.modules["langfuse"] = _langfuse_stub
    sys.modules["langfuse.callback"] = _langfuse_stub.callback


class TestConfigureLangfuseEnv:
    """_configure_langfuse_env() sets env vars when credentials exist."""

    def test_returns_false_when_keys_empty(self) -> None:
        with patch("app.services.tracing.settings") as mock_settings:
            mock_settings.LANGFUSE_SECRET_KEY = ""
            mock_settings.LANGFUSE_PUBLIC_KEY = ""
            mock_settings.LANGFUSE_HOST = ""

            assert _configure_langfuse_env() is False

    def test_returns_true_and_sets_env_when_configured(self) -> None:
        with patch("app.services.tracing.settings") as mock_settings:
            mock_settings.LANGFUSE_SECRET_KEY = "sk-lf-test"
            mock_settings.LANGFUSE_PUBLIC_KEY = "pk-lf-test"
            mock_settings.LANGFUSE_HOST = "http://langfuse-server:3000"

            assert _configure_langfuse_env() is True
            assert os.environ["LANGFUSE_SECRET_KEY"] == "sk-lf-test"
            assert os.environ["LANGFUSE_PUBLIC_KEY"] == "pk-lf-test"
            assert os.environ["LANGFUSE_HOST"] == "http://langfuse-server:3000"

            # Cleanup
            for key in ("LANGFUSE_SECRET_KEY", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_HOST"):
                os.environ.pop(key, None)

    def test_returns_false_when_host_missing(self) -> None:
        with patch("app.services.tracing.settings") as mock_settings:
            mock_settings.LANGFUSE_SECRET_KEY = "sk-lf-test"
            mock_settings.LANGFUSE_PUBLIC_KEY = "pk-lf-test"
            mock_settings.LANGFUSE_HOST = ""

            assert _configure_langfuse_env() is False


class TestGetLangfuseHandler:
    """get_langfuse_handler() should return None when not configured."""

    def test_returns_none_when_keys_empty(self) -> None:
        with patch("app.services.tracing.settings") as mock_settings:
            mock_settings.LANGFUSE_SECRET_KEY = ""
            mock_settings.LANGFUSE_PUBLIC_KEY = ""
            mock_settings.LANGFUSE_HOST = ""

            assert get_langfuse_handler() is None


class TestGetLangfuseConfig:
    """get_langfuse_config() should return {} when not configured."""

    def test_returns_empty_dict_when_not_configured(self) -> None:
        with patch("app.services.tracing.settings") as mock_settings:
            mock_settings.LANGFUSE_SECRET_KEY = ""
            mock_settings.LANGFUSE_PUBLIC_KEY = ""
            mock_settings.LANGFUSE_HOST = ""

            assert get_langfuse_config() == {}


class TestCheckLangfuseAuth:
    """check_langfuse_auth() should never raise, always return bool."""

    def test_returns_false_when_keys_empty(self) -> None:
        with patch("app.services.tracing.settings") as mock_settings:
            mock_settings.LANGFUSE_SECRET_KEY = ""
            mock_settings.LANGFUSE_PUBLIC_KEY = ""

            assert check_langfuse_auth() is False

    def test_returns_false_when_connection_fails(self) -> None:
        """Graceful degradation: connection error returns False, never raises."""
        mock_langfuse_instance = MagicMock()
        mock_langfuse_instance.auth_check.side_effect = ConnectionError("refused")

        with patch("app.services.tracing.settings") as mock_settings:
            mock_settings.LANGFUSE_SECRET_KEY = "sk-lf-test"
            mock_settings.LANGFUSE_PUBLIC_KEY = "pk-lf-test"
            mock_settings.LANGFUSE_HOST = "http://langfuse-server:3000"

            with patch("langfuse.Langfuse", return_value=mock_langfuse_instance):
                assert check_langfuse_auth() is False

    def test_returns_true_when_auth_succeeds(self) -> None:
        mock_langfuse_instance = MagicMock()
        mock_langfuse_instance.auth_check.return_value = True

        with patch("app.services.tracing.settings") as mock_settings:
            mock_settings.LANGFUSE_SECRET_KEY = "sk-lf-test"
            mock_settings.LANGFUSE_PUBLIC_KEY = "pk-lf-test"
            mock_settings.LANGFUSE_HOST = "http://langfuse-server:3000"

            with patch("langfuse.Langfuse", return_value=mock_langfuse_instance):
                assert check_langfuse_auth() is True
