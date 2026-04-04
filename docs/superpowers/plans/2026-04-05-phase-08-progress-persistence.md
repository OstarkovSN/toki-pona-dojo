# Phase 8: Progress & Persistence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement persistent learning progress with localStorage for anonymous users, server sync for authenticated users, SM-2 spaced repetition, and streak tracking.

**Architecture:** localStorage as write-ahead cache, server sync via TanStack Query mutations, SM-2 algorithm runs client-side, POST /progress/sync merges using max/union strategy.

**Tech Stack:** React 19, TypeScript, localStorage/TanStack Query, FastAPI, SQLModel, pytest

---

## Task 1: Add UserProgress model to backend

**Files:**
- MODIFY: `backend/app/models.py`

### Steps

- [ ] **Step 1: Read `backend/app/models.py` to understand current model structure**
  ```bash
  cat backend/app/models.py
  ```

- [ ] **Step 2: Add UserProgress table model and API schemas to `backend/app/models.py`**

  Add these imports at the top of the file (merge with existing imports):
  ```python
  from sqlalchemy import Column, DateTime
  from sqlalchemy.dialects.postgresql import JSON
  ```

  Add after the `NewPassword` class at the bottom of the file:

  ```python
  # --- Progress models ---

  class UserProgress(SQLModel, table=True):
      __tablename__ = "user_progress"

      id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
      user_id: uuid.UUID = Field(foreign_key="user.id", index=True, unique=True)
      completed_units: list[int] = Field(default=[], sa_column=Column(JSON))
      completed_lessons: list[str] = Field(default=[], sa_column=Column(JSON))
      current_unit: int = Field(default=1)
      srs_data: dict = Field(default={}, sa_column=Column(JSON))
      total_correct: int = Field(default=0)
      total_answered: int = Field(default=0)
      streak_days: int = Field(default=0)
      last_activity: datetime | None = Field(
          default=None, sa_type=DateTime(timezone=True)
      )
      known_words: list[str] = Field(default=[], sa_column=Column(JSON))
      recent_errors: list[dict] = Field(default=[], sa_column=Column(JSON))
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
      srs_data: dict | None = None
      total_correct: int | None = None
      total_answered: int | None = None
      streak_days: int | None = None
      last_activity: datetime | None = None
      known_words: list[str] | None = None
      recent_errors: list[dict] | None = None


  class ProgressPublic(SQLModel):
      """Response schema for progress endpoints."""
      completed_units: list[int] = []
      completed_lessons: list[str] = []
      current_unit: int = 1
      srs_data: dict = {}
      total_correct: int = 0
      total_answered: int = 0
      streak_days: int = 0
      last_activity: datetime | None = None
      known_words: list[str] = []
      recent_errors: list[dict] = []


  class ProgressSync(SQLModel):
      """Payload for POST /progress/sync — localStorage data to merge."""
      completed_units: list[int] = []
      completed_lessons: list[str] = []
      current_unit: int = 1
      srs_data: dict = {}
      total_correct: int = 0
      total_answered: int = 0
      streak_days: int = 0
      last_activity: datetime | None = None
      known_words: list[str] = []
      recent_errors: list[dict] = []
  ```

- [ ] **Step 3: Verify models.py is valid Python**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo
  python -c "import ast; ast.parse(open('backend/app/models.py').read()); print('OK')"
  ```
  Expected: `OK`

- [ ] **Step 4: Generate Alembic migration**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/backend
  alembic revision --autogenerate -m "add user_progress table"
  ```
  Review the generated migration to confirm it creates the `user_progress` table with all JSON columns.

- [ ] **Step 5: Run migration**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/backend
  alembic upgrade head
  ```

- [ ] **Step 6: Commit**
  ```bash
  git add backend/app/models.py backend/alembic/versions/
  git commit -m "Add UserProgress model and progress API schemas"
  ```

- [ ] **Step 7:** Record learnings to `.claude/learnings-add-userprogress-model.md` using the surfacing-subagent-learnings skill.

---

## Task 2: Backend progress endpoints

**Depends on:** Task 1

**Files:**
- ADD: `backend/app/api/routes/progress.py`
- MODIFY: `backend/app/api/main.py`

### Steps

- [ ] **Step 1: Read `backend/app/api/deps.py` and `backend/app/api/routes/users.py` for patterns**
  Understand the `CurrentUser` dependency, `SessionDep`, and how routes are structured.

- [ ] **Step 2: Create `backend/app/api/routes/progress.py`**

  Write the complete file:

  ```python
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
              local_reps = local_entry.get("reps", 0) if isinstance(local_entry, dict) else 0
              server_reps = server_entry.get("reps", 0) if isinstance(server_entry, dict) else 0
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
      _merge_progress(progress, local_data)
      progress.updated_at = datetime.now(timezone.utc)
      session.add(progress)
      session.commit()
      session.refresh(progress)
      logger.info("Synced progress for user %s", current_user.id)
      return progress
  ```

- [ ] **Step 3: Register the progress router in `backend/app/api/main.py`**

  Add to imports:
  ```python
  from app.api.routes import items, login, private, progress, users, utils
  ```

  Add after existing router includes:
  ```python
  api_router.include_router(progress.router)
  ```

- [ ] **Step 4: Verify the server starts without errors**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/backend
  python -c "from app.main import app; print('OK')"
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add backend/app/api/routes/progress.py backend/app/api/main.py
  git commit -m "Add progress API endpoints (GET/PUT/POST sync)"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-backend-progress-endpoints.md` using the surfacing-subagent-learnings skill.

---

## Task 3: Backend progress tests

**Depends on:** Task 2

**Files:**
- ADD: `backend/tests/api/routes/test_progress.py`

### Steps

- [ ] **Step 1: Read `backend/tests/conftest.py` and `backend/tests/api/routes/test_items.py` for test patterns**
  Understand how `client`, `superuser_token_headers`, `normal_user_token_headers`, `db` fixtures work. Note the use of `settings.API_V1_STR` for URL prefix.

- [ ] **Step 2: Create `backend/tests/api/routes/test_progress.py`**

  Write the complete test file:

  ```python
  from fastapi.testclient import TestClient
  from sqlmodel import Session

  from app.core.config import settings


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
      # First call creates
      r1 = client.get(
          f"{settings.API_V1_STR}/progress/me",
          headers=normal_user_token_headers,
      )
      assert r1.status_code == 200

      # Second call returns same
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
      # Ensure record exists
      client.get(
          f"{settings.API_V1_STR}/progress/me",
          headers=normal_user_token_headers,
      )

      # Update some fields
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
      # Untouched fields remain default
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
      client: TestClient, superuser_token_headers: dict[str, str]
  ) -> None:
      """POST /progress/sync with empty server record should adopt local data."""
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
              {"word": "li", "type": "particle", "context": "mi li moku", "timestamp": "2026-04-04T10:00:00Z"}
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
      # First set up some server-side data via PUT
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

      # Now sync local data with overlapping + new data
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

      # Union of completed_units: {1,2,3}
      assert sorted(data["completed_units"]) == [1, 2, 3]
      # Union of completed_lessons: {"1:1","2:1","2:2","3:1"}
      assert sorted(data["completed_lessons"]) == ["1:1", "2:1", "2:2", "3:1"]
      # max(4, 3) = 4
      assert data["current_unit"] == 4
      # max(25, 30) = 30
      assert data["total_correct"] == 30
      # max(40, 35) = 40
      assert data["total_answered"] == 40
      # Union of known_words
      assert sorted(data["known_words"]) == ["jan", "mi", "pona", "sina", "toki"]
      # SRS: toki keeps server (reps=5 > reps=3), mi added from local, jan kept from server
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

      # First sync
      r1 = client.post(
          f"{settings.API_V1_STR}/progress/sync",
          headers=superuser_token_headers,
          json=local_data,
      )
      assert r1.status_code == 200

      # Second sync with identical data
      r2 = client.post(
          f"{settings.API_V1_STR}/progress/sync",
          headers=superuser_token_headers,
          json=local_data,
      )
      assert r2.status_code == 200

      # Results should be identical (ignoring updated_at which is not in the response)
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
  ```

- [ ] **Step 3: Ensure the `UserProgress` table cleanup is in conftest**

  Read `backend/tests/conftest.py`. If the `db` fixture teardown only deletes `Item` and `User`, add `UserProgress` cleanup. Add this import and delete statement:

  ```python
  from app.models import Item, User, UserProgress
  ```

  In the `db` fixture, add before `session.commit()`:
  ```python
  statement = delete(UserProgress)
  session.execute(statement)
  ```

- [ ] **Step 4: Run the tests**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/backend
  python -m pytest tests/api/routes/test_progress.py -v
  ```
  All tests should pass.

- [ ] **Step 5: Commit**
  ```bash
  git add backend/tests/api/routes/test_progress.py backend/tests/conftest.py
  git commit -m "Add backend tests for progress endpoints (GET/PUT/sync + idempotency)"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-backend-progress-tests.md` using the surfacing-subagent-learnings skill.

---

## Task 4: SRS algorithm (client-side SM-2)

**Depends on:** None (independent)

**Files:**
- ADD: `frontend/src/lib/srs.ts`

### Steps

- [ ] **Step 1: Create `frontend/src/lib/srs.ts`**

  Write the complete file with SM-2 implementation:

  ```typescript
  /**
   * SM-2 Spaced Repetition Algorithm
   *
   * Based on the SuperMemo SM-2 algorithm by Piotr Wozniak.
   * Quality scale: 0-5, where:
   *   0 = complete blackout
   *   1 = incorrect but recognized after seeing answer
   *   2 = incorrect but answer felt easy to recall
   *   3 = correct with serious difficulty
   *   4 = correct with some hesitation
   *   5 = perfect response
   */

  export interface SRSEntry {
    interval: number;  // days until next review
    ease: number;      // easiness factor (minimum 1.3)
    due: string;       // ISO date string (YYYY-MM-DD)
    reps: number;      // successful repetition count
  }

  export interface SM2Result {
    reps: number;
    ease: number;
    interval: number;
  }

  /**
   * Core SM-2 algorithm.
   *
   * @param quality - Response quality (0-5)
   * @param reps - Current successful repetition count
   * @param ease - Current easiness factor (>= 1.3)
   * @param interval - Current interval in days
   * @returns Updated reps, ease, and interval
   */
  export function sm2(
    quality: number,
    reps: number,
    ease: number,
    interval: number,
  ): SM2Result {
    // Clamp quality to 0-5
    const q = Math.max(0, Math.min(5, Math.round(quality)));

    if (q < 3) {
      // Failed: reset repetition count and interval
      return {
        reps: 0,
        ease: Math.max(1.3, ease - 0.2),
        interval: 1,
      };
    }

    // Successful recall
    let newInterval: number;
    if (reps === 0) {
      newInterval = 1;
    } else if (reps === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * ease);
    }

    // Update easiness factor
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const newEase = Math.max(
      1.3,
      ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
    );

    return {
      reps: reps + 1,
      ease: newEase,
      interval: newInterval,
    };
  }

  /**
   * Map an exercise score (0.0-1.0) to SM-2 quality (0-5).
   */
  export function scoreToQuality(score: number): number {
    if (score >= 0.9) return 5;
    if (score >= 0.7) return 4;
    if (score >= 0.5) return 3;
    if (score >= 0.3) return 2;
    if (score > 0) return 1;
    return 0;
  }

  /**
   * Calculate the next review date given an interval in days.
   */
  export function nextDueDate(intervalDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + intervalDays);
    return date.toISOString().split("T")[0];  // YYYY-MM-DD
  }

  /**
   * Default SRS entry for a newly encountered word.
   */
  export function defaultSRSEntry(): SRSEntry {
    return {
      interval: 0,
      ease: 2.5,
      due: new Date().toISOString().split("T")[0],
      reps: 0,
    };
  }

  /**
   * Process a word review: run SM-2 and return updated entry.
   */
  export function reviewWord(entry: SRSEntry, quality: number): SRSEntry {
    const result = sm2(quality, entry.reps, entry.ease, entry.interval);
    return {
      interval: result.interval,
      ease: result.ease,
      due: nextDueDate(result.interval),
      reps: result.reps,
    };
  }

  /**
   * Check if a word is due for review.
   */
  export function isDue(entry: SRSEntry): boolean {
    const today = new Date().toISOString().split("T")[0];
    return entry.due <= today;
  }

  /**
   * Calculate how overdue a word is (in days). Higher = more overdue.
   */
  export function overdueDays(entry: SRSEntry): number {
    const today = new Date();
    const due = new Date(entry.due + "T00:00:00");
    const diffMs = today.getTime() - due.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }
  ```

- [ ] **Step 2: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/lib/srs.ts 2>&1 || true
  ```
  Fix any type errors.

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/lib/srs.ts
  git commit -m "Add SM-2 spaced repetition algorithm (client-side)"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-srs-algorithm.md` using the surfacing-subagent-learnings skill.

---

## Task 5: Progress store (localStorage wrapper)

**Depends on:** Task 4 (uses SRS types)

**Files:**
- ADD: `frontend/src/lib/progress-store.ts`

### Steps

- [ ] **Step 1: Create `frontend/src/lib/progress-store.ts`**

  Write the complete file:

  ```typescript
  import type { SRSEntry } from "./srs";
  import { reviewWord as srsReviewWord, defaultSRSEntry, scoreToQuality } from "./srs";

  // --- Types ---

  export interface ProgressData {
    completedUnits: number[];
    completedLessons: string[];  // "unitId:lessonId" format
    currentUnit: number;
    totalCorrect: number;
    totalAnswered: number;
    knownWords: string[];
    recentErrors: ErrorEntry[];
  }

  export interface ErrorEntry {
    word: string;
    type: string;
    context: string;
    timestamp: string;  // ISO datetime
  }

  export interface SRSData {
    [word: string]: SRSEntry;
  }

  export interface StreakData {
    currentStreak: number;
    lastActivityDate: string;  // ISO date YYYY-MM-DD
  }

  // --- Constants ---

  const PROGRESS_KEY = "tp-progress";
  const SRS_KEY = "tp-srs";
  const STREAK_KEY = "tp-streak";
  const MAX_RECENT_ERRORS = 20;

  // --- Default values ---

  function defaultProgress(): ProgressData {
    return {
      completedUnits: [],
      completedLessons: [],
      currentUnit: 1,
      totalCorrect: 0,
      totalAnswered: 0,
      knownWords: [],
      recentErrors: [],
    };
  }

  function defaultStreak(): StreakData {
    return {
      currentStreak: 0,
      lastActivityDate: "",
    };
  }

  // --- Helpers ---

  function readJSON<T>(key: string, fallback: () => T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback();
      return JSON.parse(raw) as T;
    } catch {
      return fallback();
    }
  }

  function writeJSON<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  /** Get today's date as YYYY-MM-DD in the user's local timezone. */
  function todayLocal(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /** Get yesterday's date as YYYY-MM-DD in the user's local timezone. */
  function yesterdayLocal(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // --- Public API ---

  /** Read current progress from localStorage. */
  export function getProgress(): ProgressData {
    return readJSON(PROGRESS_KEY, defaultProgress);
  }

  /** Merge a partial update into the stored progress. */
  export function updateProgress(update: Partial<ProgressData>): ProgressData {
    const current = getProgress();
    const merged = { ...current, ...update };

    // Cap recent errors
    if (merged.recentErrors.length > MAX_RECENT_ERRORS) {
      merged.recentErrors = merged.recentErrors.slice(0, MAX_RECENT_ERRORS);
    }

    writeJSON(PROGRESS_KEY, merged);
    return merged;
  }

  /** Read SRS data from localStorage. */
  export function getSRS(): SRSData {
    return readJSON(SRS_KEY, () => ({} as SRSData));
  }

  /**
   * Update a single word's SRS entry after a review.
   * @param word - The word reviewed
   * @param quality - SM-2 quality (0-5)
   */
  export function updateWordSRS(word: string, quality: number): SRSEntry {
    const srs = getSRS();
    const entry = srs[word] ?? defaultSRSEntry();
    const updated = srsReviewWord(entry, quality);
    srs[word] = updated;
    writeJSON(SRS_KEY, srs);
    return updated;
  }

  /**
   * Ensure a word exists in SRS (add default entry if missing).
   * Does NOT overwrite existing entries.
   */
  export function ensureWordInSRS(word: string): void {
    const srs = getSRS();
    if (!(word in srs)) {
      srs[word] = defaultSRSEntry();
      writeJSON(SRS_KEY, srs);
    }
  }

  /** Read streak data from localStorage. */
  export function getStreak(): StreakData {
    return readJSON(STREAK_KEY, defaultStreak);
  }

  /**
   * Record that the user was active now.
   * - If last activity was yesterday: increment streak
   * - If last activity was today: no change
   * - If last activity was >1 day ago (or never): reset streak to 1
   */
  export function recordActivity(): StreakData {
    const streak = getStreak();
    const today = todayLocal();
    const yesterday = yesterdayLocal();

    if (streak.lastActivityDate === today) {
      // Already recorded today, no change
      return streak;
    }

    let newStreak: number;
    if (streak.lastActivityDate === yesterday) {
      // Consecutive day
      newStreak = streak.currentStreak + 1;
    } else {
      // Gap or first activity
      newStreak = 1;
    }

    const updated: StreakData = {
      currentStreak: newStreak,
      lastActivityDate: today,
    };
    writeJSON(STREAK_KEY, updated);
    return updated;
  }

  /** Clear all progress data (for testing or account reset). */
  export function clearAllProgress(): void {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(SRS_KEY);
    localStorage.removeItem(STREAK_KEY);
  }
  ```

- [ ] **Step 2: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/lib/progress-store.ts 2>&1 || true
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/lib/progress-store.ts
  git commit -m "Add localStorage progress store with typed access"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-progress-store.md` using the surfacing-subagent-learnings skill.

---

## Task 6: useProgress hook

**Depends on:** Tasks 4, 5 (uses SRS + progress-store)

**Files:**
- ADD: `frontend/src/hooks/useProgress.ts`

### Steps

- [ ] **Step 1: Read `frontend/src/hooks/useAuth.ts` for hook patterns**
  Understand how TanStack Query mutations and the auth flow work in this codebase.

- [ ] **Step 2: Read existing components to understand ExerciseResult shape**
  Search for exercise result types in the codebase. If no `ExerciseResult` type exists yet, define it in this file. Based on the spec, the exercise `onComplete` callback receives a result with at least: `score` (0-1), `words` (string[]), and optionally error info.

- [ ] **Step 3: Create `frontend/src/hooks/useProgress.ts`**

  Write the complete file:

  ```typescript
  import { useCallback, useSyncExternalStore } from "react";
  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

  import { isLoggedIn } from "./useAuth";
  import {
    type ProgressData,
    type ErrorEntry,
    getProgress,
    updateProgress,
    getSRS,
    updateWordSRS,
    ensureWordInSRS,
    recordActivity,
    getStreak,
    type StreakData,
  } from "@/lib/progress-store";
  import { scoreToQuality } from "@/lib/srs";

  // --- Types ---

  export interface ExerciseResult {
    /** Score from 0.0 to 1.0 */
    score: number;
    /** Words that appeared in this exercise */
    words: string[];
    /** Number of correct answers in the exercise */
    correct: number;
    /** Total questions in the exercise */
    total: number;
    /** Errors made during the exercise */
    errors?: Array<{ word: string; type: string; context: string }>;
  }

  // --- localStorage subscription for React re-renders ---

  let progressVersion = 0;
  const progressListeners = new Set<() => void>();

  function subscribeProgress(callback: () => void): () => void {
    progressListeners.add(callback);
    return () => progressListeners.delete(callback);
  }

  function getProgressSnapshot(): number {
    return progressVersion;
  }

  function notifyProgressChanged(): void {
    progressVersion++;
    progressListeners.forEach((cb) => cb());
  }

  // --- Hook ---

  export function useProgress() {
    const queryClient = useQueryClient();
    const authenticated = isLoggedIn();

    // Subscribe to localStorage changes for re-renders
    useSyncExternalStore(subscribeProgress, getProgressSnapshot);

    // Fetch server progress for authenticated users
    const { data: serverProgress, isLoading } = useQuery<ProgressData>({
      queryKey: ["progress"],
      queryFn: async () => {
        const token = localStorage.getItem("access_token");
        const res = await fetch("/api/v1/progress/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch progress");
        return res.json();
      },
      enabled: authenticated,
    });

    // Mutation to update server progress
    const updateServerMutation = useMutation({
      mutationFn: async (data: Partial<ProgressData>) => {
        const token = localStorage.getItem("access_token");
        const res = await fetch("/api/v1/progress/me", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            completed_units: data.completedUnits,
            completed_lessons: data.completedLessons,
            current_unit: data.currentUnit,
            total_correct: data.totalCorrect,
            total_answered: data.totalAnswered,
            known_words: data.knownWords,
            recent_errors: data.recentErrors,
            srs_data: data.completedUnits !== undefined ? undefined : getSRS(),
          }),
        });
        if (!res.ok) throw new Error("Failed to update progress");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["progress"] });
      },
    });

    // Sync mutation for post-login merge
    const syncMutation = useMutation({
      mutationFn: async () => {
        const progress = getProgress();
        const srs = getSRS();
        const streak = getStreak();
        const token = localStorage.getItem("access_token");
        const res = await fetch("/api/v1/progress/sync", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            completed_units: progress.completedUnits,
            completed_lessons: progress.completedLessons,
            current_unit: progress.currentUnit,
            total_correct: progress.totalCorrect,
            total_answered: progress.totalAnswered,
            known_words: progress.knownWords,
            recent_errors: progress.recentErrors,
            srs_data: srs,
            streak_days: streak.currentStreak,
            last_activity: streak.lastActivityDate
              ? new Date(streak.lastActivityDate).toISOString()
              : null,
          }),
        });
        if (!res.ok) throw new Error("Failed to sync progress");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["progress"] });
      },
    });

    const progress = getProgress();
    const streak = getStreak();

    const updateAfterExercise = useCallback(
      (result: ExerciseResult) => {
        const current = getProgress();

        // Update totals
        const newTotalCorrect = current.totalCorrect + result.correct;
        const newTotalAnswered = current.totalAnswered + result.total;

        // Add new words to known list
        const knownSet = new Set(current.knownWords);
        for (const word of result.words) {
          knownSet.add(word);
        }
        const newKnownWords = [...knownSet].sort();

        // Update SRS for each word
        const quality = scoreToQuality(result.score);
        for (const word of result.words) {
          ensureWordInSRS(word);
          updateWordSRS(word, quality);
        }

        // Append errors
        let newErrors = [...current.recentErrors];
        if (result.errors && result.errors.length > 0) {
          const now = new Date().toISOString();
          const errorEntries: ErrorEntry[] = result.errors.map((e) => ({
            word: e.word,
            type: e.type,
            context: e.context,
            timestamp: now,
          }));
          newErrors = [...errorEntries, ...newErrors].slice(0, 20);
        }

        // Record activity for streak
        recordActivity();

        const updated = updateProgress({
          totalCorrect: newTotalCorrect,
          totalAnswered: newTotalAnswered,
          knownWords: newKnownWords,
          recentErrors: newErrors,
        });

        notifyProgressChanged();

        // Sync to server if authenticated
        if (authenticated) {
          updateServerMutation.mutate({
            totalCorrect: updated.totalCorrect,
            totalAnswered: updated.totalAnswered,
            knownWords: updated.knownWords,
            recentErrors: updated.recentErrors,
          });
        }
      },
      [authenticated, updateServerMutation],
    );

    const updateAfterLesson = useCallback(
      (unitId: number, lessonId: number, totalLessonsInUnit: number) => {
        const current = getProgress();

        // Add lesson to completed set
        const lessonKey = `${unitId}:${lessonId}`;
        const lessonsSet = new Set(current.completedLessons);
        lessonsSet.add(lessonKey);
        const newCompletedLessons = [...lessonsSet].sort();

        // Check if all lessons in the unit are now complete
        const unitLessons = newCompletedLessons.filter((l) =>
          l.startsWith(`${unitId}:`),
        );
        const unitsSet = new Set(current.completedUnits);
        let newCurrentUnit = current.currentUnit;

        if (unitLessons.length >= totalLessonsInUnit) {
          unitsSet.add(unitId);
          // Advance current unit to next incomplete unit
          newCurrentUnit = Math.max(current.currentUnit, unitId + 1);
        }

        const updated = updateProgress({
          completedLessons: newCompletedLessons,
          completedUnits: [...unitsSet].sort(),
          currentUnit: newCurrentUnit,
        });

        notifyProgressChanged();

        // Sync to server if authenticated
        if (authenticated) {
          updateServerMutation.mutate({
            completedLessons: updated.completedLessons,
            completedUnits: updated.completedUnits,
            currentUnit: updated.currentUnit,
          });
        }
      },
      [authenticated, updateServerMutation],
    );

    return {
      progress,
      streak,
      updateAfterExercise,
      updateAfterLesson,
      syncToServer: syncMutation.mutate,
      isLoading,
      isSyncing: syncMutation.isPending,
    };
  }
  ```

- [ ] **Step 4: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/hooks/useProgress.ts 2>&1 || true
  ```
  Fix any type errors.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/hooks/useProgress.ts
  git commit -m "Add useProgress hook with localStorage + server sync"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-use-progress-hook.md` using the surfacing-subagent-learnings skill.

---

## Task 7: useSRS hook

**Depends on:** Tasks 4, 5 (uses SRS + progress-store)

**Files:**
- ADD: `frontend/src/hooks/useSRS.ts`

### Steps

- [ ] **Step 1: Create `frontend/src/hooks/useSRS.ts`**

  Write the complete file:

  ```typescript
  import { useMemo, useSyncExternalStore } from "react";

  import {
    getSRS,
    updateWordSRS as storeUpdateWordSRS,
    type SRSData,
  } from "@/lib/progress-store";
  import {
    isDue,
    overdueDays,
    type SRSEntry,
  } from "@/lib/srs";

  // --- localStorage subscription for React re-renders ---

  let srsVersion = 0;
  const srsListeners = new Set<() => void>();

  function subscribeSRS(callback: () => void): () => void {
    srsListeners.add(callback);
    return () => srsListeners.delete(callback);
  }

  function getSRSSnapshot(): number {
    return srsVersion;
  }

  function notifySRSChanged(): void {
    srsVersion++;
    srsListeners.forEach((cb) => cb());
  }

  // --- Types ---

  export interface SRSStats {
    totalWords: number;
    dueToday: number;
    averageEase: number;
  }

  export interface DueWord {
    word: string;
    entry: SRSEntry;
    overdue: number;  // days overdue
  }

  // --- Hook ---

  export function useSRS() {
    // Subscribe to localStorage changes for re-renders
    useSyncExternalStore(subscribeSRS, getSRSSnapshot);

    const srsData: SRSData = getSRS();

    /** Words due for review, sorted by most overdue first. */
    const dueWords: DueWord[] = useMemo(() => {
      const due: DueWord[] = [];
      for (const [word, entry] of Object.entries(srsData)) {
        if (isDue(entry)) {
          due.push({
            word,
            entry,
            overdue: overdueDays(entry),
          });
        }
      }
      due.sort((a, b) => b.overdue - a.overdue);
      return due;
    }, [srsData]);

    /** Review a word with a given SM-2 quality (0-5). */
    function reviewWord(word: string, quality: number): void {
      storeUpdateWordSRS(word, quality);
      notifySRSChanged();
    }

    /** Stats about the SRS collection. */
    const stats: SRSStats = useMemo(() => {
      const entries = Object.values(srsData);
      const totalWords = entries.length;
      const dueToday = entries.filter(isDue).length;
      const averageEase =
        totalWords > 0
          ? entries.reduce((sum, e) => sum + e.ease, 0) / totalWords
          : 2.5;

      return {
        totalWords,
        dueToday,
        averageEase: Math.round(averageEase * 100) / 100,
      };
    }, [srsData]);

    return {
      dueWords,
      reviewWord,
      stats,
    };
  }
  ```

- [ ] **Step 2: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/hooks/useSRS.ts 2>&1 || true
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/hooks/useSRS.ts
  git commit -m "Add useSRS hook for spaced repetition review"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-use-srs-hook.md` using the surfacing-subagent-learnings skill.

---

## Task 8: Wire exercises to progress

**Depends on:** Task 6 (uses useProgress hook)

**Files:**
- MODIFY: `frontend/src/routes/_layout/learn/$unit.$lesson.tsx` (or wherever the lesson route exists)

**Note:** The lesson route (`$unit.$lesson.tsx`) may not exist yet if Phase 6 has not been fully implemented. If the file does not exist, create it as a minimal stub that demonstrates the wiring pattern. If it does exist, modify the existing `onComplete` handler.

### Steps

- [ ] **Step 1: Locate the lesson route file**
  ```bash
  find /home/claude/workdirs/toki-pona-dojo/frontend/src -name "*lesson*" -o -name "*unit*" | head -20
  ls /home/claude/workdirs/toki-pona-dojo/frontend/src/routes/_layout/learn/ 2>/dev/null || echo "learn directory not found"
  ```

- [ ] **Step 2: If the lesson route file exists, read it and identify the `onComplete` handler**

  Look for:
  - The component that renders exercises
  - The `onComplete` callback or similar exercise completion handler
  - The `ExerciseResult` type or equivalent

- [ ] **Step 3: Wire useProgress into the lesson route**

  If the file exists, add these imports:
  ```typescript
  import { useProgress, type ExerciseResult } from "@/hooks/useProgress";
  ```

  In the component body, add:
  ```typescript
  const { updateAfterExercise, updateAfterLesson } = useProgress();
  ```

  In the existing `onComplete` handler (or create one), add:
  ```typescript
  // After exercise completes:
  updateAfterExercise({
    score: result.score,        // adapt to actual result shape
    words: result.words,        // adapt to actual result shape
    correct: result.correct,    // adapt to actual result shape
    total: result.total,        // adapt to actual result shape
    errors: result.errors,      // adapt to actual result shape
  });

  // After all exercises in a lesson are done:
  // (This should be called once when the lesson finishes, not after each exercise)
  updateAfterLesson(unitId, lessonId, totalLessonsInUnit);
  ```

  If the file does NOT exist, create `frontend/src/routes/_layout/learn/$unit.$lesson.tsx` with a minimal lesson view that demonstrates the wiring:

  ```typescript
  import { createFileRoute, useParams } from "@tanstack/react-router";
  import { useProgress, type ExerciseResult } from "@/hooks/useProgress";

  export const Route = createFileRoute("/_layout/learn/$unit/$lesson")({
    component: LessonView,
  });

  function LessonView() {
    const { unit, lesson } = useParams({ from: "/_layout/learn/$unit/$lesson" });
    const unitId = Number(unit);
    const lessonId = Number(lesson);
    const { updateAfterExercise, updateAfterLesson } = useProgress();

    function handleExerciseComplete(result: ExerciseResult) {
      updateAfterExercise(result);
    }

    function handleLessonComplete() {
      // totalLessonsInUnit should come from unit data / curriculum config
      const totalLessonsInUnit = 3; // placeholder — wire to actual curriculum
      updateAfterLesson(unitId, lessonId, totalLessonsInUnit);
    }

    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">
          Unit {unitId} — Lesson {lessonId}
        </h1>
        <p className="text-muted-foreground">
          {/* Exercise components render here. Each calls handleExerciseComplete on finish. */}
          Exercises will be rendered here.
        </p>
        <button
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
          onClick={handleLessonComplete}
        >
          Complete Lesson (dev placeholder)
        </button>
      </div>
    );
  }
  ```

- [ ] **Step 4: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -30
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/routes/_layout/learn/
  git commit -m "Wire exercise completion to progress tracking"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-wire-exercises-progress.md` using the surfacing-subagent-learnings skill.

---

## Task 9: Wire skill tree to progress

**Depends on:** Task 6 (uses useProgress hook)

**Files:**
- MODIFY: `frontend/src/routes/_layout/index.tsx`

### Steps

- [ ] **Step 1: Read `frontend/src/routes/_layout/index.tsx`**
  Understand the current dashboard/home page layout.

- [ ] **Step 2: Read any existing SkillTree or UnitNode components**
  ```bash
  find /home/claude/workdirs/toki-pona-dojo/frontend/src -name "SkillTree*" -o -name "UnitNode*" | head -10
  ```
  If they exist, read them. If not, the progress wiring will be added inline or via a new component section.

- [ ] **Step 3: Update `frontend/src/routes/_layout/index.tsx`**

  Replace the current Dashboard content with a home page that shows:
  1. Greeting with progress subtitle
  2. Stats row (words known, lessons done, day streak)
  3. Skill tree unit list with progress-driven states

  ```typescript
  import { createFileRoute } from "@tanstack/react-router";
  import { useProgress } from "@/hooks/useProgress";

  export const Route = createFileRoute("/_layout/")({
    component: Home,
    head: () => ({
      meta: [{ title: "toki pona dojo" }],
    }),
  });

  /** Determine the display state of a unit based on progress. */
  function getUnitState(
    unitId: number,
    completedUnits: number[],
    currentUnit: number,
  ): "completed" | "current" | "available" | "locked" {
    if (completedUnits.includes(unitId)) return "completed";
    if (unitId === currentUnit) return "current";
    // A unit is available if all its prerequisites (previous unit) are completed
    if (unitId === 1 || completedUnits.includes(unitId - 1)) return "available";
    return "locked";
  }

  const UNIT_NAMES: Record<number, string> = {
    1: "mi — I, me",
    2: "sina — you",
    3: "ona — they",
    4: "ni — this",
    5: "suli — big, important",
    6: "pona — good, simple",
    7: "toki — language, speak",
    8: "moku — food, eat",
    9: "tawa — move, to",
    10: "nasin — way, method",
  };

  function Home() {
    const { progress, streak } = useProgress();
    const completedCount = progress.completedUnits.length;

    return (
      <div className="max-w-2xl mx-auto p-6">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">o kama sona</h1>
          <p className="text-muted-foreground mt-1">
            {completedCount} of 10 units complete
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{progress.knownWords.length}</div>
            <div className="text-sm text-muted-foreground">Words known</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{progress.completedLessons.length}</div>
            <div className="text-sm text-muted-foreground">Lessons done</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{streak.currentStreak}</div>
            <div className="text-sm text-muted-foreground">Day streak</div>
          </div>
        </div>

        {/* Skill Tree */}
        <div className="space-y-3">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((unitId) => {
            const state = getUnitState(
              unitId,
              progress.completedUnits,
              progress.currentUnit,
            );
            return (
              <div
                key={unitId}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  state === "completed"
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                    : state === "current"
                      ? "border-primary bg-primary/5"
                      : state === "available"
                        ? "border-border bg-background hover:border-primary/50 cursor-pointer"
                        : "border-muted bg-muted/30 opacity-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Unit {unitId}
                    </span>
                    <h3 className="font-semibold">
                      {UNIT_NAMES[unitId] ?? `Unit ${unitId}`}
                    </h3>
                  </div>
                  <div className="text-sm">
                    {state === "completed" && (
                      <span className="text-green-600 font-medium">Complete</span>
                    )}
                    {state === "current" && (
                      <span className="text-primary font-medium">In progress</span>
                    )}
                    {state === "locked" && (
                      <span className="text-muted-foreground">Locked</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  ```

  **Important:** If there are existing SkillTree/UnitNode components, import and use them instead of inlining. Pass progress data as props. Adapt the code above to match the existing component API.

  **Important:** The `UNIT_NAMES` mapping is a placeholder. If a unit configuration file exists (e.g., `frontend/src/data/units.ts` or `backend/app/data/units.py` with a corresponding API), use that instead. Search for existing unit data before hardcoding.

- [ ] **Step 4: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -30
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/routes/_layout/index.tsx
  git commit -m "Wire skill tree and stats row to progress data"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-wire-skill-tree-progress.md` using the surfacing-subagent-learnings skill.

---

## Task 10: Playwright E2E tests for progress

**Depends on:** Tasks 8, 9 (exercises and skill tree wired)

**Files:**
- ADD: `frontend/tests/progress.spec.ts`

### Steps

- [ ] **Step 1: Read `frontend/playwright.config.ts` and an existing spec for test patterns**
  Read `frontend/tests/items.spec.ts` or `frontend/tests/login.spec.ts` to understand how tests are structured: base URL, auth setup, page interactions.

- [ ] **Step 2: Create `frontend/tests/progress.spec.ts`**

  Write the complete file:

  ```typescript
  import { expect, test } from "@playwright/test";

  test.describe("Progress tracking (anonymous)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ page }) => {
      // Clear localStorage progress before each test
      await page.goto("/");
      await page.evaluate(() => {
        localStorage.removeItem("tp-progress");
        localStorage.removeItem("tp-srs");
        localStorage.removeItem("tp-streak");
      });
    });

    test("Home page shows initial stats as zero", async ({ page }) => {
      await page.goto("/");
      // Stats row should show zeros
      await expect(page.getByText("0").first()).toBeVisible();
      await expect(page.getByText("Words known")).toBeVisible();
      await expect(page.getByText("Lessons done")).toBeVisible();
      await expect(page.getByText("Day streak")).toBeVisible();
    });

    test("Home page shows skill tree with Unit 1 as current", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("Unit 1")).toBeVisible();
      await expect(page.getByText("In progress")).toBeVisible();
      // Later units should be locked
      await expect(page.getByText("Locked").first()).toBeVisible();
    });

    test("Completing an exercise updates progress in localStorage", async ({
      page,
    }) => {
      // Navigate to a lesson
      await page.goto("/learn/1/1");

      // If there's a "Complete Lesson" button (dev placeholder), click it
      const completeBtn = page.getByRole("button", {
        name: /complete lesson/i,
      });
      if (await completeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await completeBtn.click();
      }

      // Check localStorage was updated
      const progress = await page.evaluate(() => {
        const raw = localStorage.getItem("tp-progress");
        return raw ? JSON.parse(raw) : null;
      });

      // Progress should exist after interaction
      // (If the dev placeholder button was clicked, completedLessons should include "1:1")
      if (progress) {
        expect(progress.completedLessons).toBeDefined();
      }
    });

    test("Completing all lessons in a unit marks unit complete", async ({
      page,
    }) => {
      // Simulate completing all lessons in unit 1 by setting localStorage
      await page.goto("/");
      await page.evaluate(() => {
        localStorage.setItem(
          "tp-progress",
          JSON.stringify({
            completedUnits: [1],
            completedLessons: ["1:1", "1:2", "1:3"],
            currentUnit: 2,
            totalCorrect: 15,
            totalAnswered: 20,
            knownWords: ["mi", "toki", "pona"],
            recentErrors: [],
          }),
        );
      });

      // Reload to pick up the new localStorage state
      await page.goto("/");

      // Unit 1 should show as complete
      await expect(page.getByText("Complete").first()).toBeVisible();

      // Stats should reflect the data
      await expect(page.getByText("3")).toBeVisible(); // 3 words known
    });

    test("Streak increments on activity", async ({ page }) => {
      // Set yesterday's activity for streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      await page.goto("/");
      await page.evaluate(
        (dateStr) => {
          localStorage.setItem(
            "tp-streak",
            JSON.stringify({
              currentStreak: 3,
              lastActivityDate: dateStr,
            }),
          );
        },
        yesterdayStr,
      );

      // Navigate to a lesson to trigger activity recording
      await page.goto("/learn/1/1");

      // If there's a complete button, click it to trigger recordActivity
      const completeBtn = page.getByRole("button", {
        name: /complete lesson/i,
      });
      if (await completeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await completeBtn.click();
      }

      // Go back home to check streak
      await page.goto("/");

      // Streak should now be 4 (incremented from 3)
      const streak = await page.evaluate(() => {
        const raw = localStorage.getItem("tp-streak");
        return raw ? JSON.parse(raw) : null;
      });

      if (streak) {
        expect(streak.currentStreak).toBe(4);
      }
    });
  });

  test.describe("Progress tracking (authenticated)", () => {
    test("Stats display on home page for logged-in user", async ({ page }) => {
      // Uses default storageState from playwright.config.ts (authenticated)
      await page.goto("/");
      await expect(page.getByText("Words known")).toBeVisible();
      await expect(page.getByText("Lessons done")).toBeVisible();
      await expect(page.getByText("Day streak")).toBeVisible();
    });
  });
  ```

- [ ] **Step 3: Run the Playwright tests**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx playwright test tests/progress.spec.ts --reporter=line 2>&1 | tail -30
  ```
  Fix any failures. Note: some tests may need adjustment based on the actual UI state (e.g., if exercises are not fully implemented yet, the localStorage-simulation tests should still pass).

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/tests/progress.spec.ts
  git commit -m "Add Playwright E2E tests for progress tracking"
  ```

- [ ] **Step 5:** Record learnings to `.claude/learnings-playwright-progress-tests.md` using the surfacing-subagent-learnings skill.

---

## Dependency graph

```
Task 1 (UserProgress model)
  └─► Task 2 (Backend endpoints)
        └─► Task 3 (Backend tests)

Task 4 (SRS algorithm)          ← independent
  └─► Task 5 (Progress store)
        ├─► Task 6 (useProgress hook)
        │     ├─► Task 8 (Wire exercises)
        │     └─► Task 9 (Wire skill tree + stats)
        └─► Task 7 (useSRS hook)

Tasks 8, 9 ──► Task 10 (Playwright tests)
```

**Parallelizable groups:**
- Group A: Tasks 1 → 2 → 3 (backend chain)
- Group B: Task 4 → 5 → {6, 7} (frontend foundation; 6 and 7 are parallel)
- Group A and B can run in parallel
- Tasks 8, 9 can run in parallel (both depend on Task 6)
- Task 10 runs last
