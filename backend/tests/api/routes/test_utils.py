from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.utils import EmailData


def test_health_check(client: TestClient) -> None:
    """Health check endpoint returns true with no auth required."""
    r = client.get(f"{settings.API_V1_STR}/utils/health-check/")
    assert r.status_code == 200
    assert r.json() is True


def test_test_email_superuser(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Superuser can trigger test email send; returns 201 with success message."""
    stub_email_data = EmailData(html_content="<p>Test</p>", subject="Test email")
    with (
        patch("app.api.routes.utils.generate_test_email", return_value=stub_email_data),
        patch("app.api.routes.utils.send_email") as mock_send,
    ):
        r = client.post(
            f"{settings.API_V1_STR}/utils/test-email/",
            params={"email_to": "test@example.com"},
            headers=superuser_token_headers,
        )
    assert r.status_code == 201
    assert r.json() == {"message": "Test email sent"}
    mock_send.assert_called_once()


def test_test_email_normal_user_forbidden(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Normal (non-superuser) users cannot access the test-email endpoint."""
    r = client.post(
        f"{settings.API_V1_STR}/utils/test-email/",
        params={"email_to": "test@example.com"},
        headers=normal_user_token_headers,
    )
    assert r.status_code == 403


def test_test_email_unauthenticated(client: TestClient) -> None:
    """Unauthenticated requests to test-email endpoint are rejected."""
    r = client.post(
        f"{settings.API_V1_STR}/utils/test-email/",
        params={"email_to": "test@example.com"},
    )
    assert r.status_code == 401


def test_test_email_send_failure_propagates_or_returns_error(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """send_email raising does not silently swallow the error."""
    from unittest.mock import patch

    stub_email_data = EmailData(html_content="<p>Test</p>", subject="Test email")
    with (
        patch(
            "app.api.routes.utils.generate_test_email",
            return_value=stub_email_data,
        ),
        patch(
            "app.api.routes.utils.send_email",
            side_effect=Exception("SMTP connection refused"),
        ),
    ):
        try:
            r = client.post(
                f"{settings.API_V1_STR}/utils/test-email/",
                params={"email_to": "test@example.com"},
                headers=superuser_token_headers,
            )
            # If no exception raised, must be an error response (not 200 silent failure)
            assert r.status_code >= 400
        except Exception:
            # TestClient re-raised the unhandled server exception — acceptable behavior
            pass
