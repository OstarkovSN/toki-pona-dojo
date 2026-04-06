import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from pydantic import EmailStr
from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy import Column as SAColumn
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    invite_token: str | None = Field(default=None, max_length=64)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore[assignment]
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class UserProgress(SQLModel, table=True):
    __tablename__ = "user_progress"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True, unique=True)
    completed_units: list[int] = Field(default=[], sa_column=SAColumn(JSON))
    completed_lessons: list[str] = Field(default=[], sa_column=SAColumn(JSON))
    current_unit: int = Field(default=1)
    srs_data: dict[str, Any] = Field(default={}, sa_column=SAColumn(JSON))
    total_correct: int = Field(default=0)
    total_answered: int = Field(default=0)
    streak_days: int = Field(default=0)
    last_activity: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)
    )
    known_words: list[str] = Field(default=[], sa_column=SAColumn(JSON))
    recent_errors: list[dict[str, Any]] = Field(default=[], sa_column=SAColumn(JSON))
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )


class ProgressUpdate(SQLModel):
    """Partial update payload for PUT /progress/me."""

    completed_units: list[int] | None = None
    completed_lessons: list[str] | None = None
    current_unit: int | None = None
    srs_data: dict[str, Any] | None = None
    total_correct: int | None = None
    total_answered: int | None = None
    streak_days: int | None = None
    last_activity: datetime | None = None
    known_words: list[str] | None = None
    recent_errors: list[dict[str, Any]] | None = None


class ProgressPublic(SQLModel):
    """Response schema for progress endpoints."""

    completed_units: list[int] = []
    completed_lessons: list[str] = []
    current_unit: int = 1
    srs_data: dict[str, Any] = {}
    total_correct: int = 0
    total_answered: int = 0
    streak_days: int = 0
    last_activity: datetime | None = None
    known_words: list[str] = []
    recent_errors: list[dict[str, Any]] = []


class ProgressSync(SQLModel):
    """Payload for POST /progress/sync — localStorage data to merge."""

    completed_units: list[int] = []
    completed_lessons: list[str] = []
    current_unit: int = 1
    srs_data: dict[str, Any] = {}
    total_correct: int = 0
    total_answered: int = 0
    streak_days: int = 0
    last_activity: datetime | None = None
    known_words: list[str] = []
    recent_errors: list[dict[str, Any]] = []


class AccessRequest(SQLModel, table=True):
    __tablename__ = "access_request"

    id: int | None = Field(default=None, primary_key=True)
    telegram_user_id: int = Field(
        sa_column=SAColumn(Integer, nullable=False, index=True)
    )
    telegram_username: str | None = Field(default=None, max_length=255)
    telegram_first_name: str = Field(max_length=255)
    telegram_last_name: str | None = Field(default=None, max_length=128)
    status: str = Field(
        default="pending",
        max_length=20,
        sa_column=SAColumn(String(20), nullable=False),
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    decided_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
    )

    invite_tokens: list["InviteToken"] = Relationship(back_populates="access_request")


def _default_token() -> str:
    return secrets.token_hex(16)


def _default_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=7)


class InviteToken(SQLModel, table=True):
    __tablename__ = "invite_token"

    id: int | None = Field(default=None, primary_key=True)
    token: str = Field(
        default_factory=_default_token,
        max_length=64,
        sa_column=SAColumn(String(64), unique=True, index=True, nullable=False),
    )
    access_request_id: int = Field(foreign_key="access_request.id", nullable=False)
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    expires_at: datetime = Field(
        default_factory=_default_expires_at,
        sa_type=DateTime(timezone=True),
    )
    used_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
    )
    used_by: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", nullable=True
    )

    access_request: AccessRequest | None = Relationship(back_populates="invite_tokens")
