"""Override session-scoped db fixture for service unit tests that don't need a DB."""

from collections.abc import Generator
from unittest.mock import MagicMock

import pytest
from sqlmodel import Session


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:  # type: ignore[override]
    """No-op DB fixture — service tests don't need a real database."""
    yield MagicMock(spec=Session)
