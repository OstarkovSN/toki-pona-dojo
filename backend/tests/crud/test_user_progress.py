"""Tests for UserProgress model."""


from sqlmodel import Session

from app.models import UserProgress
from tests.utils.user import create_random_user


def test_create_user_progress(db: Session) -> None:
    """UserProgress can be created with defaults and linked to a user."""
    user = create_random_user(db)
    progress = UserProgress(user_id=user.id)
    db.add(progress)
    db.commit()
    db.refresh(progress)

    assert progress.id is not None
    assert progress.user_id == user.id
    assert progress.completed_units == []
    assert progress.completed_lessons == []
    assert progress.current_unit == 1
    assert progress.srs_data == {}
    assert progress.total_correct == 0
    assert progress.total_answered == 0
    assert progress.streak_days == 0
    assert progress.last_activity is None
    assert progress.known_words == []
    assert progress.recent_errors == []
    assert progress.created_at is not None
    assert progress.updated_at is not None

    # Clean up
    db.delete(progress)
    db.commit()


def test_user_progress_json_fields(db: Session) -> None:
    """JSON columns store and retrieve complex data correctly."""
    user = create_random_user(db)
    progress = UserProgress(
        user_id=user.id,
        completed_units=[1, 2],
        completed_lessons=["1-1", "1-2", "2-1"],
        current_unit=3,
        srs_data={"pona": {"interval": 4, "ease": 2.5}},
        total_correct=42,
        total_answered=50,
        known_words=["mi", "sina", "pona"],
        recent_errors=[{"word": "toki", "count": 3}],
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)

    assert progress.completed_units == [1, 2]
    assert progress.completed_lessons == ["1-1", "1-2", "2-1"]
    assert progress.srs_data["pona"]["interval"] == 4
    assert progress.known_words == ["mi", "sina", "pona"]
    assert progress.recent_errors[0]["word"] == "toki"

    # Clean up
    db.delete(progress)
    db.commit()
