"""Tests for app/crud.py -- update_user edge cases."""

from sqlmodel import Session

from app.crud import create_user, update_user
from app.models import UserCreate, UserUpdate
from tests.utils.utils import random_email, random_lower_string


def test_update_user_noop_still_commits(db: Session) -> None:
    """gap-40: update_user with all-None UserUpdate still commits without error."""
    email = random_email()
    password = random_lower_string()
    user = create_user(
        session=db, user_create=UserCreate(email=email, password=password)
    )
    original_email = user.email

    user_in = UserUpdate()
    updated = update_user(session=db, db_user=user, user_in=user_in)

    assert updated.email == original_email
    db.refresh(updated)
    assert updated.email == original_email
