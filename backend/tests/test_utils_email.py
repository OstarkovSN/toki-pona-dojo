"""Tests for email-related functions in app/utils.py"""

from unittest.mock import MagicMock, patch

import pytest

from app.utils import EmailData, generate_test_email, send_email


def _make_settings_with_smtp(
    *,
    smtp_tls: bool = True,
    smtp_ssl: bool = False,
    smtp_user: str | None = None,
    smtp_password: str | None = None,
) -> MagicMock:
    mock = MagicMock()
    mock.emails_enabled = True
    mock.SMTP_HOST = "smtp.example.com"
    mock.SMTP_PORT = 587
    mock.SMTP_TLS = smtp_tls
    mock.SMTP_SSL = smtp_ssl
    mock.SMTP_USER = smtp_user
    mock.SMTP_PASSWORD = smtp_password
    mock.EMAILS_FROM_NAME = "Test App"
    mock.EMAILS_FROM_EMAIL = "noreply@example.com"
    mock.PROJECT_NAME = "Test Project"
    return mock


class TestSendEmail:
    def test_send_email_smtp_tls(self) -> None:
        """send_email() with SMTP_TLS=True should pass tls=True in smtp options."""
        mock_settings = _make_settings_with_smtp(smtp_tls=True, smtp_ssl=False)
        mock_message_instance = MagicMock()
        mock_message_cls = MagicMock(return_value=mock_message_instance)

        with (
            patch("app.utils.settings", mock_settings),
            patch("app.utils.emails.Message", mock_message_cls),
        ):
            send_email(
                email_to="user@example.com",
                subject="Hello",
                html_content="<p>Hi</p>",
            )

        mock_message_instance.send.assert_called_once()
        _, kwargs = mock_message_instance.send.call_args
        smtp_opts = kwargs["smtp"]
        assert smtp_opts.get("tls") is True
        assert "ssl" not in smtp_opts

    def test_send_email_smtp_ssl(self) -> None:
        """send_email() with SMTP_TLS=False and SMTP_SSL=True should pass ssl=True."""
        mock_settings = _make_settings_with_smtp(smtp_tls=False, smtp_ssl=True)
        mock_message_instance = MagicMock()
        mock_message_cls = MagicMock(return_value=mock_message_instance)

        with (
            patch("app.utils.settings", mock_settings),
            patch("app.utils.emails.Message", mock_message_cls),
        ):
            send_email(
                email_to="user@example.com",
                subject="Hello",
                html_content="<p>Hi</p>",
            )

        mock_message_instance.send.assert_called_once()
        _, kwargs = mock_message_instance.send.call_args
        smtp_opts = kwargs["smtp"]
        assert smtp_opts.get("ssl") is True
        assert "tls" not in smtp_opts

    def test_send_email_no_tls_no_ssl(self) -> None:
        """send_email() with neither TLS nor SSL should not include tls/ssl keys."""
        mock_settings = _make_settings_with_smtp(smtp_tls=False, smtp_ssl=False)
        mock_message_instance = MagicMock()
        mock_message_cls = MagicMock(return_value=mock_message_instance)

        with (
            patch("app.utils.settings", mock_settings),
            patch("app.utils.emails.Message", mock_message_cls),
        ):
            send_email(
                email_to="user@example.com",
                subject="Hello",
                html_content="<p>Hi</p>",
            )

        mock_message_instance.send.assert_called_once()
        _, kwargs = mock_message_instance.send.call_args
        smtp_opts = kwargs["smtp"]
        assert "tls" not in smtp_opts
        assert "ssl" not in smtp_opts

    def test_send_email_with_credentials(self) -> None:
        """send_email() should include user/password in smtp options when set."""
        mock_settings = _make_settings_with_smtp(
            smtp_user="myuser", smtp_password="mypass"
        )
        mock_message_instance = MagicMock()
        mock_message_cls = MagicMock(return_value=mock_message_instance)

        with (
            patch("app.utils.settings", mock_settings),
            patch("app.utils.emails.Message", mock_message_cls),
        ):
            send_email(
                email_to="user@example.com",
                subject="Hello",
                html_content="<p>Hi</p>",
            )

        _, kwargs = mock_message_instance.send.call_args
        smtp_opts = kwargs["smtp"]
        assert smtp_opts["user"] == "myuser"
        assert smtp_opts["password"] == "mypass"

    def test_send_email_raises_when_emails_disabled(self) -> None:
        """send_email() should raise AssertionError when emails_enabled is False."""
        mock_settings = _make_settings_with_smtp()
        mock_settings.emails_enabled = False

        with (
            patch("app.utils.settings", mock_settings),
            pytest.raises(AssertionError),
        ):
            send_email(
                email_to="user@example.com",
                subject="Hello",
                html_content="<p>Hi</p>",
            )


class TestGenerateTestEmail:
    def test_generate_test_email_returns_email_data(self) -> None:
        """generate_test_email() should return an EmailData instance."""
        result = generate_test_email("test@example.com")
        assert isinstance(result, EmailData)

    def test_generate_test_email_subject_contains_project_name(self) -> None:
        """Subject should contain the project name and 'Test email'."""
        result = generate_test_email("test@example.com")
        assert "Test email" in result.subject

    def test_generate_test_email_html_contains_email(self) -> None:
        """HTML content should reference the recipient email."""
        result = generate_test_email("recipient@example.com")
        assert "recipient@example.com" in result.html_content
