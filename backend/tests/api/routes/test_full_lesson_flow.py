"""Integration test: full lesson flow — fetch units, load a lesson, track progress."""

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import User, UserProgress


def test_full_lesson_flow(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    """End-to-end: fetch skill tree → load lesson → update progress → verify."""
    # ── Step 1: Fetch the skill tree ──────────────────────────────────────────
    r = client.get(f"{settings.API_V1_STR}/lessons/units")
    assert r.status_code == 200
    units = r.json()
    assert isinstance(units, list)
    assert len(units) >= 1

    # Every unit has the required shape
    first_unit = units[0]
    assert "id" in first_unit
    assert "name" in first_unit

    unit_id: int = first_unit["id"]

    # ── Step 2: Fetch exercises for lesson 1 of that unit ────────────────────
    lesson_id = 1
    r = client.get(f"{settings.API_V1_STR}/lessons/units/{unit_id}/lessons/{lesson_id}")
    assert r.status_code == 200
    lesson = r.json()

    assert lesson["unit_id"] == unit_id
    assert lesson["lesson_id"] == lesson_id
    assert "unit_name" in lesson
    assert "exercises" in lesson
    assert isinstance(lesson["exercises"], list)

    # Each exercise has a type field
    for ex in lesson["exercises"]:
        assert "type" in ex

    # ── Step 3: Get initial progress (creates default record) ─────────────────
    r = client.get(
        f"{settings.API_V1_STR}/progress/me",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    progress_before = r.json()
    assert "current_unit" in progress_before
    assert "completed_lessons" in progress_before

    # ── Step 4: Update progress to mark the lesson complete ───────────────────
    lesson_key = f"{unit_id}:{lesson_id}"
    update_payload = {
        "completed_lessons": [lesson_key],
        "total_correct": 5,
        "total_answered": 5,
    }
    r = client.put(
        f"{settings.API_V1_STR}/progress/me",
        headers=superuser_token_headers,
        json=update_payload,
    )
    assert r.status_code == 200
    progress_after = r.json()
    assert lesson_key in progress_after["completed_lessons"]
    assert progress_after["total_correct"] >= 5
    assert progress_after["total_answered"] >= 5

    # ── Step 5: Verify progress persisted via GET ─────────────────────────────
    r = client.get(
        f"{settings.API_V1_STR}/progress/me",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    progress_check = r.json()
    assert lesson_key in progress_check["completed_lessons"]

    # ── Cleanup: reset superuser progress to avoid interfering with other tests
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


def test_fetch_nonexistent_unit_returns_404(client: TestClient) -> None:
    """GET /lessons/units/9999/lessons/1 should return 404."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units/9999/lessons/1")
    assert r.status_code == 404


def test_units_endpoint_returns_all_units(client: TestClient) -> None:
    """GET /lessons/units should return all 10 units."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units")
    assert r.status_code == 200
    units = r.json()
    assert len(units) == 10


def test_lesson_exercises_are_bounded(client: TestClient) -> None:
    """GET lesson exercises should return at most MAX_EXERCISES (7) exercises."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units/1/lessons/1")
    assert r.status_code == 200
    exercises = r.json()["exercises"]
    assert len(exercises) <= 7


def test_progress_sync_then_verify(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    """Sync local progress then verify via GET that server reflects merged state."""
    # Reset superuser progress first to avoid interference
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
        "completed_units": [1],
        "completed_lessons": ["1:1", "1:2"],
        "current_unit": 2,
        "total_correct": 10,
        "total_answered": 12,
        "known_words": ["mi", "sina", "toki"],
    }
    r = client.post(
        f"{settings.API_V1_STR}/progress/sync",
        headers=superuser_token_headers,
        json=local_data,
    )
    assert r.status_code == 200

    # Verify GET reflects synced data
    r = client.get(
        f"{settings.API_V1_STR}/progress/me",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert 1 in data["completed_units"]
    assert "1:1" in data["completed_lessons"]
    assert "mi" in data["known_words"]
    assert data["total_correct"] >= 10
