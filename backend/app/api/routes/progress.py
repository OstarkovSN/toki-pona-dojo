import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ProgressPublic,
    ProgressSync,
    ProgressUpdate,
    UserProgress,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["progress"])


def _get_or_create_progress(session: SessionDep, user_id: Any) -> UserProgress:
    """Return existing progress or create a fresh default record."""
    statement = select(UserProgress).where(UserProgress.user_id == user_id)
    progress = session.exec(statement).first()
    if progress is None:
        progress = UserProgress(user_id=user_id)
        session.add(progress)
        session.commit()
        session.refresh(progress)
        logger.info("Created new UserProgress for user %s", user_id)
    return progress


@router.get("/me", response_model=ProgressPublic)
def get_my_progress(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Return the authenticated user's progress. Creates a default record if none exists."""
    progress = _get_or_create_progress(session, current_user.id)
    return progress


@router.put("/me", response_model=ProgressPublic)
def update_my_progress(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    progress_in: ProgressUpdate,
) -> Any:
    """Partial update of the authenticated user's progress."""
    progress = _get_or_create_progress(session, current_user.id)
    update_data = progress_in.model_dump(exclude_unset=True)
    progress.sqlmodel_update(update_data)
    progress.updated_at = datetime.now(timezone.utc)
    session.add(progress)
    session.commit()
    session.refresh(progress)
    return progress


def _merge_progress(server: UserProgress, local: ProgressSync) -> None:
    """Merge localStorage data into the server record using max/union strategy.

    This function is idempotent: calling it twice with the same data produces
    the same result.
    """
    # Union of sets (deduplicated)
    server.completed_units = sorted(
        set(server.completed_units or []) | set(local.completed_units or [])
    )
    server.completed_lessons = sorted(
        set(server.completed_lessons or []) | set(local.completed_lessons or [])
    )
    server.known_words = sorted(
        set(server.known_words or []) | set(local.known_words or [])
    )

    # Scalar max
    server.current_unit = max(server.current_unit or 1, local.current_unit or 1)
    server.total_correct = max(server.total_correct or 0, local.total_correct or 0)
    server.total_answered = max(server.total_answered or 0, local.total_answered or 0)
    server.streak_days = max(server.streak_days or 0, local.streak_days or 0)

    # SRS data: per word, keep the entry with more reps
    merged_srs: dict = dict(server.srs_data or {})
    for word, local_entry in (local.srs_data or {}).items():
        server_entry = merged_srs.get(word)
        if server_entry is None:
            merged_srs[word] = local_entry
        else:
            local_reps = (
                local_entry.get("reps", 0) if isinstance(local_entry, dict) else 0
            )
            server_reps = (
                server_entry.get("reps", 0) if isinstance(server_entry, dict) else 0
            )
            if local_reps > server_reps:
                merged_srs[word] = local_entry
    server.srs_data = merged_srs

    # last_activity: take the most recent
    if local.last_activity is not None:
        if server.last_activity is None or local.last_activity > server.last_activity:
            server.last_activity = local.last_activity

    # recent_errors: union by (word+timestamp), capped at 20, most recent first
    existing_keys = set()
    combined_errors: list[dict] = []
    for err in (server.recent_errors or []) + (local.recent_errors or []):
        if not isinstance(err, dict):
            logger.warning("Skipping non-dict entry in recent_errors: %r", err)
            continue
        key = (err.get("word", ""), err.get("timestamp", ""))
        if key not in existing_keys:
            existing_keys.add(key)
            combined_errors.append(err)
    combined_errors.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
    server.recent_errors = combined_errors[:20]


@router.post("/sync", response_model=ProgressPublic)
def sync_progress(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    local_data: ProgressSync,
) -> Any:
    """Merge localStorage progress into the server record.

    Uses max/union strategy so the operation is idempotent.
    """
    progress = _get_or_create_progress(session, current_user.id)
    try:
        _merge_progress(progress, local_data)
        progress.updated_at = datetime.now(timezone.utc)
        session.add(progress)
        session.commit()
        session.refresh(progress)
    except Exception:
        session.rollback()
        logger.exception("Failed to sync progress for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="Failed to merge progress data.")
    logger.info("Synced progress for user %s", current_user.id)
    return progress
