"""Tests for app/models.py -- DB-level constraints."""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.core.security import get_password_hash
from app.models import User, UserProgress
from tests.utils.utils import random_email, random_lower_string


def test_user_progress_unique_constraint_on_user_id(db: Session) -> None:
    """gap-36: Second UserProgress insert for same user_id raises IntegrityError."""
    # Must create a real User first to satisfy the FK constraint.
    user = User(
        email=random_email(),
        hashed_password=get_password_hash(random_lower_string()),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    first = UserProgress(user_id=user.id)
    db.add(first)
    db.commit()
    db.refresh(first)

    second = UserProgress(user_id=user.id)
    db.add(second)
    with pytest.raises(IntegrityError):
        db.commit()

    db.rollback()
    # After rollback, re-query objects so the session can delete them cleanly.
    # Must delete UserProgress before User to avoid FK violation.
    refreshed_first = db.get(UserProgress, first.id)
    refreshed_user = db.get(User, user.id)
    if refreshed_first is not None:
        db.delete(refreshed_first)
        db.commit()
    if refreshed_user is not None:
        db.delete(refreshed_user)
        db.commit()
