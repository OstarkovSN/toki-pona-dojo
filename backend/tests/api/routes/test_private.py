from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import User
from tests.utils.utils import random_email


def test_create_user(client: TestClient, db: Session) -> None:
    email = random_email()
    r = client.post(
        f"{settings.API_V1_STR}/private/users/",
        json={
            "email": email,
            "password": "password123",
            "full_name": "Pollo Listo",
        },
    )

    assert r.status_code == 200

    data = r.json()

    user = db.exec(select(User).where(User.id == data["id"])).first()

    assert user
    assert user.email == email
    assert user.full_name == "Pollo Listo"


def test_create_user_duplicate_email_returns_error(client: TestClient) -> None:
    """gap-26: Duplicate email to /private/users/ hits DB unique constraint."""
    from tests.utils.utils import random_email, random_lower_string

    email = random_email()
    payload = {
        "email": email,
        "password": random_lower_string(),
        "full_name": "First User",
        "is_verified": False,
    }

    r1 = client.post(f"{settings.API_V1_STR}/private/users/", json=payload)
    assert r1.status_code == 200

    r2 = client.post(f"{settings.API_V1_STR}/private/users/", json=payload)
    assert r2.status_code in (409, 500)
