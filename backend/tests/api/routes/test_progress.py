from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import User, UserProgress


def test_get_progress_creates_default(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """GET /progress/me should create a default record if none exists."""
    response = client.get(
        f"{settings.API_V1_STR}/progress/me",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["completed_units"] == []
    assert data["completed_lessons"] == []
    assert data["current_unit"] == 1
    assert data["total_correct"] == 0
    assert data["total_answered"] == 0
    assert data["streak_days"] == 0
    assert data["known_words"] == []
    assert data["recent_errors"] == []
    assert data["srs_data"] == {}


def test_get_progress_returns_existing(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """GET /progress/me should return the same record on second call."""
    r1 = client.get(
        f"{settings.API_V1_STR}/progress/me",
        headers=normal_user_token_headers,
    )
    assert r1.status_code == 200

    r2 = client.get(
        f"{settings.API_V1_STR}/progress/me",
        headers=normal_user_token_headers,
    )
    assert r2.status_code == 200
    assert r1.json() == r2.json()


def test_get_progress_unauthenticated(client: TestClient) -> None:
    """GET /progress/me without auth should return 401/403."""
    response = client.get(f"{settings.API_V1_STR}/progress/me")
    assert response.status_code in (401, 403)


def test_update_progress_partial(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """PUT /progress/me with partial data should update only those fields."""
    client.get(
        f"{settings.API_V1_STR}/progress/me",
        headers=normal_user_token_headers,
    )

    update_data = {
        "total_correct": 5,
        "total_answered": 10,
        "known_words": ["toki", "pona", "jan"],
        "current_unit": 2,
    }
    response = client.put(
        f"{settings.API_V1_STR}/progress/me",
        headers=normal_user_token_headers,
        json=update_data,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_correct"] == 5
    assert data["total_answered"] == 10
    assert sorted(data["known_words"]) == ["jan", "pona", "toki"]
    assert data["current_unit"] == 2
    assert data["completed_units"] == []


def test_update_progress_completed_lessons(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """PUT /progress/me can update completed_lessons and completed_units."""
    update_data = {
        "completed_lessons": ["1:1", "1:2", "1:3"],
        "completed_units": [1],
    }
    response = client.put(
        f"{settings.API_V1_STR}/progress/me",
        headers=normal_user_token_headers,
        json=update_data,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["completed_lessons"] == ["1:1", "1:2", "1:3"]
    assert data["completed_units"] == [1]


def test_update_progress_srs_data(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """PUT /progress/me can update srs_data."""
    srs = {
        "toki": {"interval": 1, "ease": 2.5, "due": "2026-04-06", "reps": 1},
        "pona": {"interval": 3, "ease": 2.6, "due": "2026-04-08", "reps": 2},
    }
    response = client.put(
        f"{settings.API_V1_STR}/progress/me",
        headers=normal_user_token_headers,
        json={"srs_data": srs},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["srs_data"]["toki"]["reps"] == 1
    assert data["srs_data"]["pona"]["reps"] == 2


def test_sync_progress_empty_server(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """POST /progress/sync with empty server record should adopt local data.

    Clears the superuser's progress before running to avoid interference from
    other sync tests that may have run earlier (including from the tests/ mirror).
    """
    # Delete superuser's existing progress so the server starts fresh
    superuser = db.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if superuser:
        existing = db.exec(
            select(UserProgress).where(UserProgress.user_id == superuser.id)
        ).first()
        if existing:
            db.delete(existing)
            db.commit()

    local_data = {
        "completed_units": [1, 2],
        "completed_lessons": ["1:1", "1:2", "2:1"],
        "current_unit": 3,
        "total_correct": 20,
        "total_answered": 30,
        "streak_days": 5,
        "known_words": ["toki", "pona", "mi", "sina"],
        "srs_data": {
            "toki": {"interval": 6, "ease": 2.5, "due": "2026-04-10", "reps": 3},
        },
        "recent_errors": [
            {
                "word": "li",
                "type": "particle",
                "context": "mi li moku",
                "timestamp": "2026-04-04T10:00:00Z",
            }
        ],
    }
    response = client.post(
        f"{settings.API_V1_STR}/progress/sync",
        headers=superuser_token_headers,
        json=local_data,
    )
    assert response.status_code == 200
    data = response.json()
    assert sorted(data["completed_units"]) == [1, 2]
    assert data["current_unit"] == 3
    assert data["total_correct"] == 20
    assert data["total_answered"] == 30
    assert data["streak_days"] == 5
    assert "toki" in data["known_words"]
    assert data["srs_data"]["toki"]["reps"] == 3


def test_sync_progress_merge_union(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """POST /progress/sync should union sets and take max scalars."""
    server_data = {
        "completed_units": [1, 3],
        "completed_lessons": ["1:1", "3:1"],
        "current_unit": 4,
        "total_correct": 25,
        "total_answered": 40,
        "known_words": ["toki", "pona", "jan"],
        "srs_data": {
            "toki": {"interval": 10, "ease": 2.6, "due": "2026-04-15", "reps": 5},
            "jan": {"interval": 3, "ease": 2.5, "due": "2026-04-07", "reps": 2},
        },
    }
    client.put(
        f"{settings.API_V1_STR}/progress/me",
        headers=superuser_token_headers,
        json=server_data,
    )

    local_data = {
        "completed_units": [1, 2],
        "completed_lessons": ["1:1", "2:1", "2:2"],
        "current_unit": 3,
        "total_correct": 30,
        "total_answered": 35,
        "known_words": ["toki", "mi", "sina"],
        "srs_data": {
            "toki": {"interval": 6, "ease": 2.5, "due": "2026-04-10", "reps": 3},
            "mi": {"interval": 1, "ease": 2.5, "due": "2026-04-06", "reps": 1},
        },
    }
    response = client.post(
        f"{settings.API_V1_STR}/progress/sync",
        headers=superuser_token_headers,
        json=local_data,
    )
    assert response.status_code == 200
    data = response.json()

    assert sorted(data["completed_units"]) == [1, 2, 3]
    assert sorted(data["completed_lessons"]) == ["1:1", "2:1", "2:2", "3:1"]
    assert data["current_unit"] == 4
    assert data["total_correct"] == 30
    assert data["total_answered"] == 40
    assert sorted(data["known_words"]) == ["jan", "mi", "pona", "sina", "toki"]
    assert data["srs_data"]["toki"]["reps"] == 5
    assert data["srs_data"]["mi"]["reps"] == 1
    assert data["srs_data"]["jan"]["reps"] == 2


def test_sync_progress_idempotent(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """POST /progress/sync called twice with the same data produces the same result."""
    local_data = {
        "completed_units": [1, 2],
        "completed_lessons": ["1:1", "2:1"],
        "current_unit": 3,
        "total_correct": 15,
        "total_answered": 20,
        "known_words": ["toki", "pona"],
        "srs_data": {
            "toki": {"interval": 6, "ease": 2.5, "due": "2026-04-10", "reps": 3},
        },
    }

    r1 = client.post(
        f"{settings.API_V1_STR}/progress/sync",
        headers=superuser_token_headers,
        json=local_data,
    )
    assert r1.status_code == 200

    r2 = client.post(
        f"{settings.API_V1_STR}/progress/sync",
        headers=superuser_token_headers,
        json=local_data,
    )
    assert r2.status_code == 200

    assert r1.json()["completed_units"] == r2.json()["completed_units"]
    assert r1.json()["completed_lessons"] == r2.json()["completed_lessons"]
    assert r1.json()["current_unit"] == r2.json()["current_unit"]
    assert r1.json()["total_correct"] == r2.json()["total_correct"]
    assert r1.json()["total_answered"] == r2.json()["total_answered"]
    assert r1.json()["known_words"] == r2.json()["known_words"]
    assert r1.json()["srs_data"] == r2.json()["srs_data"]


def test_sync_progress_unauthenticated(client: TestClient) -> None:
    """POST /progress/sync without auth should return 401/403."""
    response = client.post(
        f"{settings.API_V1_STR}/progress/sync",
        json={"completed_units": [1]},
    )
    assert response.status_code in (401, 403)
