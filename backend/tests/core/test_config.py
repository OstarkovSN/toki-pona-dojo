"""Tests for app/core/config.py — parse_cors and secret validation."""

import warnings

import pytest

from app.core.config import Settings, parse_cors


def test_parse_cors_comma_separated_string() -> None:
    """parse_cors with a plain comma-separated string → split into list."""
    result = parse_cors("http://a.com,http://b.com")
    assert result == ["http://a.com", "http://b.com"]


def test_parse_cors_comma_separated_with_spaces() -> None:
    """parse_cors trims whitespace around entries."""
    result = parse_cors("http://a.com, http://b.com , http://c.com")
    assert result == ["http://a.com", "http://b.com", "http://c.com"]


def test_parse_cors_json_list_string() -> None:
    """parse_cors with a JSON-array string (starts with '[') passes through as-is."""
    result = parse_cors('["http://a.com", "http://b.com"]')
    assert result == '["http://a.com", "http://b.com"]'


def test_parse_cors_list_passthrough() -> None:
    """parse_cors with a list passes it through unchanged."""
    result = parse_cors(["http://a.com", "http://b.com"])
    assert result == ["http://a.com", "http://b.com"]


def test_parse_cors_invalid_type_raises() -> None:
    """parse_cors with an invalid type (int) raises ValueError."""
    with pytest.raises(ValueError):
        parse_cors(123)


def test_check_default_secret_warns_on_local(monkeypatch: pytest.MonkeyPatch) -> None:
    """Settings with SECRET_KEY='changethis' in local env → warning, no exception."""
    monkeypatch.setenv("SECRET_KEY", "changethis")
    monkeypatch.setenv("ENVIRONMENT", "local")
    # These are required fields — provide valid values
    monkeypatch.setenv("PROJECT_NAME", "test")
    monkeypatch.setenv("POSTGRES_SERVER", "localhost")
    monkeypatch.setenv("POSTGRES_USER", "test")
    monkeypatch.setenv("FIRST_SUPERUSER", "admin@example.com")
    monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "somepassword")

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        s = Settings()
        assert s.SECRET_KEY == "changethis"

    messages = [str(w.message) for w in caught]
    assert any("changethis" in m and "SECRET_KEY" in m for m in messages)


def test_check_default_secret_raises_on_staging(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Settings with SECRET_KEY='changethis' in staging env → ValueError raised."""
    monkeypatch.setenv("SECRET_KEY", "changethis")
    monkeypatch.setenv("ENVIRONMENT", "staging")
    monkeypatch.setenv("PROJECT_NAME", "test")
    monkeypatch.setenv("POSTGRES_SERVER", "localhost")
    monkeypatch.setenv("POSTGRES_USER", "test")
    monkeypatch.setenv("FIRST_SUPERUSER", "admin@example.com")
    monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "somepassword")

    with pytest.raises(ValueError):
        Settings()


def test_check_default_secret_raises_on_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Settings with FIRST_SUPERUSER_PASSWORD='changethis' in production → ValueError."""
    monkeypatch.setenv("SECRET_KEY", "safe-secret-key-not-changethis-abc123")
    monkeypatch.setenv("POSTGRES_PASSWORD", "safe-password")
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("PROJECT_NAME", "test")
    monkeypatch.setenv("POSTGRES_SERVER", "localhost")
    monkeypatch.setenv("POSTGRES_USER", "test")
    monkeypatch.setenv("FIRST_SUPERUSER", "admin@example.com")
    monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "changethis")

    with pytest.raises(ValueError):
        Settings()
