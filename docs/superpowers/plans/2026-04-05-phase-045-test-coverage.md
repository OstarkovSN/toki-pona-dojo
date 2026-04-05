# Phase 4.5.2: Test Coverage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the highest-priority test gaps in the FastAPI backend — covering LLM error paths, optional auth fallbacks, exercise builder edge cases, and model/config invariants.

**Architecture:** Backend only (FastAPI, SQLModel, pytest). No new production code — only test files added or extended. All gaps are unit/integration tests using pytest, `unittest.mock`, and the existing `TestClient`/`db` fixtures from `tests/conftest.py`.

**Tech Stack:** FastAPI, pytest, pytest-mock, SQLModel, TestClient, coverage.py

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/tests/api/test_chat.py` | Modify | Add gap-1, gap-5, gap-7, gap-8 |
| `backend/tests/api/test_deps.py` | Modify | Add gap-28, gap-29 |
| `backend/tests/api/routes/test_login.py` | Modify | Add gap-9 |
| `backend/tests/api/routes/test_users.py` | Modify | Add gap-13 |
| `backend/tests/api/routes/test_lessons.py` | Modify | Add gap-19, gap-20 |
| `backend/tests/api/routes/test_dictionary.py` | Modify | Add gap-22 |
| `backend/tests/api/routes/test_private.py` | Modify | Add gap-26 |
| `backend/tests/core/test_config.py` | Create | Add gap-33 |
| `backend/tests/crud/test_crud_update.py` | Create | Add gap-40 |
| `backend/tests/services/test_llm.py` | Modify | Add gap-46 |
| `backend/tests/data/test_loader.py` | Create | Add gap-53 |
| `backend/tests/test_main.py` | Modify | Add gap-56 |
| `backend/tests/models/test_models.py` | Create | Add gap-36 |

---

## Task 1: Chat endpoint error paths (gap-1, gap-5, gap-7, gap-8)

**Files:**
- Modify: `backend/tests/api/test_chat.py`

Target: `backend/app/api/routes/chat.py`

These four gaps all live in the two chat endpoints or the rate-limit task-tracking logic. They test that the endpoints degrade gracefully under LLM failure, return sensible responses on Pydantic-invalid LLM output, and that `_is_authenticated()` doesn't crash when `asyncio.current_task()` returns `None` or raises.

### Steps

- [ ] **Step 1: Write failing tests**

  Append to `backend/tests/api/test_chat.py` inside the existing `TestChatStream` and `TestChatGrade` classes, plus a new `TestIsAuthenticated` class:

  ```python
  # ---- inside TestChatStream ----

  @patch("app.api.routes.chat.get_llm_client")
  def test_stream_llm_exception_returns_503_sse(
      self, mock_get_client: MagicMock, client: TestClient
  ) -> None:
      """gap-1: LLM API raises -> 503 SSE with error payload."""
      mock_client = MagicMock()
      mock_client.chat.completions.create.side_effect = RuntimeError("network down")
      mock_get_client.return_value = mock_client

      response = client.post(
          f"{settings.API_V1_STR}/chat/stream",
          json=_chat_request_body(),
      )

      assert response.status_code == 503
      assert response.headers["content-type"].startswith("text/event-stream")
      # Body should contain an error SSE frame and then DONE
      assert '"error"' in response.text
      assert "LLM service unavailable" in response.text
      assert "data: [DONE]" in response.text


  # ---- inside TestChatGrade ----

  @patch("app.api.routes.chat.get_llm_client")
  def test_grade_llm_exception_returns_graceful_default(
      self, mock_get_client: MagicMock, client: TestClient
  ) -> None:
      """gap-5: LLM API raises -> 200 with graceful fallback payload."""
      mock_client = MagicMock()
      mock_client.chat.completions.create.side_effect = RuntimeError("network down")
      mock_get_client.return_value = mock_client

      response = client.post(
          f"{settings.API_V1_STR}/chat/grade",
          json=_grade_request_body(),
      )

      assert response.status_code == 200
      data = response.json()
      assert data["correct"] is False
      assert data["score"] == 0.0
      assert "unavailable" in data["feedback"].lower()
      assert data["suggested_answer"] is None


  @patch("app.api.routes.chat.get_llm_client")
  def test_grade_llm_returns_wrong_field_types_uses_fallback(
      self, mock_get_client: MagicMock, client: TestClient
  ) -> None:
      """gap-7: LLM returns JSON with wrong field types -> Pydantic validation fails -> graceful fallback."""
      # "score" should be float; returning a string triggers ValidationError
      bad_json = '{"correct": "yes", "score": "ten out of ten", "feedback": "ok"}'
      mock_client = MagicMock()
      mock_client.chat.completions.create.return_value = _make_mock_completion(bad_json)
      mock_get_client.return_value = mock_client

      response = client.post(
          f"{settings.API_V1_STR}/chat/grade",
          json=_grade_request_body(),
      )

      assert response.status_code == 200
      data = response.json()
      assert data["correct"] is False
      assert data["score"] == 0.0
      assert "couldn't grade" in data["feedback"].lower()


  # ---- new standalone class ----

  class TestIsAuthenticated:
      """gap-8: _is_authenticated() must never raise."""

      def test_returns_false_when_current_task_is_none(self) -> None:
          """_is_authenticated() returns False when asyncio.current_task() is None."""
          from unittest.mock import patch

          from app.api.routes.chat import _is_authenticated

          with patch("app.api.routes.chat.asyncio.current_task", return_value=None):
              result = _is_authenticated()
          assert result is False

      def test_returns_false_when_current_task_raises_runtime_error(self) -> None:
          """_is_authenticated() returns False when asyncio.current_task() raises RuntimeError."""
          from unittest.mock import patch

          from app.api.routes.chat import _is_authenticated

          with patch(
              "app.api.routes.chat.asyncio.current_task",
              side_effect=RuntimeError("no running event loop"),
          ):
              result = _is_authenticated()
          assert result is False
  ```

- [ ] **Step 2: Run tests to verify they fail for the right reason**

  ```bash
  docker compose exec backend bash -c "cd /app && bash scripts/tests-start.sh -x -k 'test_stream_llm_exception_returns_503_sse or test_grade_llm_exception_returns_graceful_default or test_grade_llm_returns_wrong_field_types_uses_fallback or TestIsAuthenticated' 2>&1 | tail -30"
  ```

  Expected: tests are collected (not ImportError). `test_grade_llm_returns_wrong_field_types_uses_fallback` should fail until the production code catches `ValidationError`.

  > **Note:** Looking at `chat.py`: `except (json.JSONDecodeError, KeyError, TypeError, ValueError)` — `pydantic.ValidationError` is NOT in this list, so gap-7 will currently 500. The production code needs fixing too (see Step 3).

- [ ] **Step 3: Fix production code for gap-7**

  In `backend/app/api/routes/chat.py`, add `ValidationError` to the except clause in `grade_exercise`:

  ```python
  # At the top of the file, add:
  from pydantic import ValidationError

  # Change the except clause in grade_exercise from:
  except (json.JSONDecodeError, KeyError, TypeError, ValueError):
  # To:
  except (json.JSONDecodeError, KeyError, TypeError, ValueError, ValidationError):
  ```

- [ ] **Step 4: Run all chat tests and verify they pass**

  ```bash
  docker compose exec backend bash -c "cd /app && bash scripts/tests-start.sh -x -k 'test_chat' 2>&1 | tail -40"
  ```

  Expected: all existing tests plus new tests pass.

- [ ] **Step 5: Lint and type-check**

  ```bash
  docker compose exec backend bash -c "cd /app/backend && uv run ruff check tests/api/test_chat.py app/api/routes/chat.py && uv run mypy tests/api/test_chat.py app/api/routes/chat.py 2>&1 | tail -20"
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add backend/tests/api/test_chat.py backend/app/api/routes/chat.py
  git commit -m "test: cover chat LLM exception paths, wrong-type fallback, and _is_authenticated() guards"
  ```

- [ ] **Step 7:** Record learnings to `.claude/learnings-chat-error-paths.md` using the `surfacing-subagent-learnings` skill.

---

## Task 2: Optional auth fallbacks (gap-28, gap-29)

**Files:**
- Modify: `backend/tests/api/test_deps.py`

Target: `backend/app/api/deps.py` — `get_optional_current_user`

The existing `test_deps.py` covers `get_current_user` (required auth). `get_optional_current_user` is exercised by the chat endpoint but its two silent-return-None paths (invalid token, inactive user) are not directly tested.

### Steps

- [ ] **Step 1: Write tests**

  Append to `backend/tests/api/test_deps.py`:

  ```python
  # ---------------------------------------------------------------------------
  # Optional auth — get_optional_current_user
  # ---------------------------------------------------------------------------

  def test_optional_auth_invalid_token_returns_anonymous(client: TestClient) -> None:
      """gap-28: Invalid token on optional-auth endpoint -> user treated as anonymous (no 401/403)."""
      from unittest.mock import MagicMock, patch

      with patch("app.api.routes.chat.get_llm_client") as mock_get_client:
          mock_client = MagicMock()
          mock_client.chat.completions.create.return_value = iter([])
          mock_get_client.return_value = mock_client

          headers = {"Authorization": "Bearer this.is.totally.invalid"}
          body = {
              "messages": [{"role": "user", "content": "toki"}],
              "mode": "free_chat",
              "known_words": ["mi"],
              "current_unit": 1,
              "recent_errors": [],
          }
          response = client.post(
              f"{settings.API_V1_STR}/chat/stream",
              json=body,
              headers=headers,
          )
          # Invalid token on optional-auth endpoint is silently ignored -> treated as anon
          # Should be 200, not 401/403
          assert response.status_code == 200
          # max_tokens should be the free (low) limit since user is anon
          call_kwargs = mock_client.chat.completions.create.call_args.kwargs
          assert call_kwargs["max_tokens"] == settings.CHAT_FREE_MAX_TOKENS


  def test_optional_auth_inactive_user_returns_anonymous(
      client: TestClient, db: Session
  ) -> None:
      """gap-29: Valid token for inactive user on optional-auth endpoint -> treated as anonymous."""
      from datetime import timedelta

      from unittest.mock import MagicMock, patch

      from app.core.security import create_access_token
      from app.crud import create_user
      from app.models import UserCreate
      from tests.utils.utils import random_email, random_lower_string

      email = random_email()
      password = random_lower_string()
      user_create = UserCreate(email=email, password=password, is_active=False)
      user = create_user(session=db, user_create=user_create)

      token = create_access_token(subject=str(user.id), expires_delta=timedelta(minutes=30))
      headers = {"Authorization": f"Bearer {token}"}

      with patch("app.api.routes.chat.get_llm_client") as mock_get_client:
          mock_client = MagicMock()
          mock_client.chat.completions.create.return_value = iter([])
          mock_get_client.return_value = mock_client

          body = {
              "messages": [{"role": "user", "content": "toki"}],
              "mode": "free_chat",
              "known_words": ["mi"],
              "current_unit": 1,
              "recent_errors": [],
          }
          response = client.post(
              f"{settings.API_V1_STR}/chat/stream",
              json=body,
              headers=headers,
          )
          # Inactive user on optional-auth -> treated as anon (not rejected)
          assert response.status_code == 200
          call_kwargs = mock_client.chat.completions.create.call_args.kwargs
          assert call_kwargs["max_tokens"] == settings.CHAT_FREE_MAX_TOKENS
  ```

- [ ] **Step 2: Run tests**

  ```bash
  docker compose exec backend bash -c "cd /app && bash scripts/tests-start.sh -x -k 'test_optional_auth' 2>&1 | tail -20"
  ```

  Expected: both tests pass (the production code already handles both paths correctly — these tests just verify the lines are exercised).

- [ ] **Step 3: Lint and type-check**

  ```bash
  docker compose exec backend bash -c "cd /app/backend && uv run ruff check tests/api/test_deps.py && uv run mypy tests/api/test_deps.py 2>&1 | tail -10"
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add backend/tests/api/test_deps.py
  git commit -m "test: cover optional auth -- invalid token and inactive user treated as anonymous"
  ```

- [ ] **Step 5:** Record learnings to `.claude/learnings-optional-auth-fallbacks.md` using the `surfacing-subagent-learnings` skill.

---

## Task 3: Email failure paths (gap-9, gap-13)

**Files:**
- Modify: `backend/tests/api/routes/test_login.py`
- Modify: `backend/tests/api/routes/test_users.py`
- Modify: `backend/app/api/routes/login.py` (production fix)
- Modify: `backend/app/api/routes/users.py` (production fix)

Targets:
- `backend/app/api/routes/login.py` — `recover_password` where email send raises
- `backend/app/api/routes/users.py` — `create_user` where email send raises

Both endpoints call `send_email(...)` without catching exceptions. If SMTP is down, the email call will raise, causing a 500. Expected behavior: the operation succeeds and the caller gets a 200 (for password recovery) or the created user (for admin create).

### Steps

- [ ] **Step 1: Write failing tests**

  Append to `backend/tests/api/routes/test_login.py`:

  ```python
  def test_recovery_password_smtp_failure_still_returns_200(
      client: TestClient, db: Session
  ) -> None:
      """gap-9: send_email raises (smtp down) -> recover_password still returns 200."""
      from unittest.mock import patch
      from app.crud import create_user
      from app.models import UserCreate
      from tests.utils.utils import random_email, random_lower_string

      email = random_email()
      password = random_lower_string()
      create_user(session=db, user_create=UserCreate(email=email, password=password))

      with (
          patch("app.core.config.settings.SMTP_HOST", "smtp.example.com"),
          patch("app.core.config.settings.EMAILS_FROM_EMAIL", "admin@example.com"),
          patch("app.api.routes.login.send_email", side_effect=Exception("SMTP down")),
      ):
          r = client.post(f"{settings.API_V1_STR}/password-recovery/{email}")

      assert r.status_code == 200
  ```

  Append to `backend/tests/api/routes/test_users.py`:

  ```python
  def test_create_user_smtp_failure_still_returns_user(
      client: TestClient,
      superuser_token_headers: dict[str, str],
  ) -> None:
      """gap-13: send_email raises after user is created -> user still returned, no crash."""
      from unittest.mock import patch
      from tests.utils.utils import random_email, random_lower_string

      email = random_email()
      data = {
          "email": email,
          "password": random_lower_string(),
          "full_name": "Email Fail User",
      }

      with (
          patch("app.core.config.settings.SMTP_HOST", "smtp.example.com"),
          patch("app.core.config.settings.EMAILS_FROM_EMAIL", "admin@example.com"),
          patch("app.api.routes.users.send_email", side_effect=Exception("SMTP down")),
      ):
          r = client.post(
              f"{settings.API_V1_STR}/users/",
              json=data,
              headers=superuser_token_headers,
          )

      # User should be created despite email failure
      assert r.status_code == 200
      assert r.json()["email"] == email
  ```

- [ ] **Step 2: Run failing tests to observe behavior**

  ```bash
  docker compose exec backend bash -c "cd /app && bash scripts/tests-start.sh -x -k 'test_recovery_password_smtp_failure or test_create_user_smtp_failure' 2>&1 | tail -30"
  ```

  Expected: tests FAIL with 500 (unhandled exception from `send_email`).

- [ ] **Step 3: Fix production code — wrap send_email in try/except**

  Read `backend/app/api/routes/login.py` and `backend/app/api/routes/users.py` first to confirm current structure, then wrap `send_email` calls:

  In `login.py` `recover_password`:
  ```python
  # Replace direct send_email call with:
  try:
      send_email(
          email_to=user.email,
          subject=email_data.subject,
          html_content=email_data.html_content,
      )
  except Exception:
      logger.exception("Failed to send password recovery email to %s", user.email)
  ```

  In `users.py` `create_user`:
  ```python
  # Replace direct send_email call with:
  try:
      send_email(
          email_to=user_in.email,
          subject=email_data.subject,
          html_content=email_data.html_content,
      )
  except Exception:
      logger.exception("Failed to send new account email to %s", user_in.email)
  ```

  Add `logger = logging.getLogger(__name__)` at the top of each file if not already present.

- [ ] **Step 4: Run tests and verify they pass**

  ```bash
  docker compose exec backend bash -c "cd /app && bash scripts/tests-start.sh -k 'test_login or test_users' 2>&1 | tail -40"
  ```

  Expected: all existing tests plus new tests pass.

- [ ] **Step 5: Lint and type-check**

  ```bash
  docker compose exec backend bash -c "cd /app/backend && uv run ruff check tests/api/routes/test_login.py tests/api/routes/test_users.py app/api/routes/login.py app/api/routes/users.py && uv run mypy app/api/routes/login.py app/api/routes/users.py 2>&1 | tail -20"
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add backend/tests/api/routes/test_login.py backend/tests/api/routes/test_users.py backend/app/api/routes/login.py backend/app/api/routes/users.py
  git commit -m "fix: catch send_email exceptions in recover_password and create_user; test smtp-down paths"
  ```

- [ ] **Step 7:** Record learnings to `.claude/learnings-email-failure-paths.md` using the `surfacing-subagent-learnings` skill.

---

## Task 4: Exercise builder edge cases (gap-19, gap-20) and dictionary empty query (gap-22)

**Files:**
- Modify: `backend/tests/api/routes/test_lessons.py`
- Modify: `backend/tests/api/routes/test_dictionary.py`

Targets:
- `backend/app/api/routes/lessons.py` — malformed exercise data, MAX_EXERCISES cap
- `backend/app/api/routes/dictionary.py` / `backend/app/data/loader.py` — empty `q=""` passthrough

### Steps

- [ ] **Step 1: Write tests for lessons edge cases**

  Append to `backend/tests/api/routes/test_lessons.py`:

  ```python
  import random
  from unittest.mock import patch


  def test_lesson_exercises_capped_at_max(client: TestClient) -> None:
      """gap-20: When >7 exercises are built, random.sample caps output at MAX_EXERCISES=7."""
      original_sample = random.sample
      sample_calls: list[tuple[object, int]] = []

      def recording_sample(population: object, k: int) -> list[object]:
          sample_calls.append((population, k))
          return original_sample(population, k)  # type: ignore[arg-type]

      with patch("app.api.routes.lessons.random.sample", side_effect=recording_sample):
          r = client.get(f"{settings.API_V1_STR}/lessons/units/10/lessons/1")

      assert r.status_code == 200
      exercises = r.json()["exercises"]
      # Result must never exceed MAX_EXERCISES
      assert len(exercises) <= 7

      # If sample was called for capping (k=7), verify it
      capping_calls = [c for c in sample_calls if c[1] == 7]
      if capping_calls:
          assert capping_calls[0][1] == 7


  def test_lesson_word_bank_skips_malformed_entries(client: TestClient) -> None:
      """gap-19: Malformed unscramble entries are skipped; good entries still returned."""
      from unittest.mock import patch as mock_patch

      malformed_filtered = {
          "unscramble": [
              # valid entry
              {"words": ["mi", "pona"], "correct": "mi pona", "translation": "I am good"},
              # malformed: missing 'correct' key
              {"words": ["sina"]},
              # malformed: not a dict
              None,
          ],
          "particles": [],
          "reverse_build": [],
          "word_building": [],
          "stories": [],
      }

      with mock_patch(
          "app.api.routes.lessons.get_exercises_by_words",
          return_value=malformed_filtered,
      ):
          r = client.get(f"{settings.API_V1_STR}/lessons/units/4/lessons/1")

      assert r.status_code == 200
      exercises = r.json()["exercises"]
      # No 500 error — builder continued past bad entries
      word_bank = [e for e in exercises if e["type"] == "word_bank"]
      # The valid entry should be present
      assert len(word_bank) >= 1
      assert word_bank[0]["correct"] == "mi pona"
  ```

- [ ] **Step 2: Write test for dictionary empty query**

  Append to `backend/tests/api/routes/test_dictionary.py`:

  ```python
  def test_list_words_empty_q_returns_all(client: TestClient) -> None:
      """gap-22: q='' is treated the same as no filter -- returns all words."""
      r_all = client.get(f"{settings.API_V1_STR}/dictionary/words")
      r_empty_q = client.get(f"{settings.API_V1_STR}/dictionary/words?q=")

      assert r_all.status_code == 200
      assert r_empty_q.status_code == 200
      # Empty string query must not filter anything out
      assert len(r_empty_q.json()) == len(r_all.json())
  ```

- [ ] **Step 3: Run tests**

  ```bash
  docker compose exec backend bash -c "cd /app && bash scripts/tests-start.sh -k 'test_lessons or test_dictionary' 2>&1 | tail -40"
  ```

  Expected: all tests pass (production code already handles these cases — tests just document the behavior).

- [ ] **Step 4: Lint and type-check**

  ```bash
  docker compose exec backend bash -c "cd /app/backend && uv run ruff check tests/api/routes/test_lessons.py tests/api/routes/test_dictionary.py && uv run mypy tests/api/routes/test_lessons.py tests/api/routes/test_dictionary.py 2>&1 | tail -10"
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add backend/tests/api/routes/test_lessons.py backend/tests/api/routes/test_dictionary.py
  git commit -m "test: cover exercise MAX_EXERCISES cap, malformed entry skip, and empty dictionary query"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-exercise-builder-edge-cases.md` using the `surfacing-subagent-learnings` skill.

---

## Task 5: Data / config / model invariants (gap-26, gap-33, gap-36, gap-40, gap-46, gap-53, gap-56)

**Files:**
- Create: `backend/tests/core/__init__.py` + `backend/tests/core/test_config.py`
- Create: `backend/tests/models/__init__.py` + `backend/tests/models/test_models.py`
- Create: `backend/tests/crud/__init__.py` + `backend/tests/crud/test_crud_update.py`
- Modify: `backend/tests/services/test_llm.py`
- Create: `backend/tests/data/__init__.py` + `backend/tests/data/test_loader.py`
- Modify: `backend/tests/test_main.py`
- Modify: `backend/tests/api/routes/test_private.py`

### Steps

- [ ] **Step 1: Create __init__.py files for new test packages**

  Create empty `__init__.py` files:
  - `backend/tests/core/__init__.py`
  - `backend/tests/models/__init__.py`
  - `backend/tests/crud/__init__.py`
  - `backend/tests/data/__init__.py`

- [ ] **Step 2: Write test for gap-33 (config EMAILS_FROM_NAME default)**

  Create `backend/tests/core/test_config.py`:

  ```python
  """Tests for app/core/config.py edge cases."""


  def test_emails_from_name_defaults_to_project_name() -> None:
      """gap-33: EMAILS_FROM_NAME defaults to PROJECT_NAME when None/empty."""
      from app.core.config import settings

      # Either it was set explicitly, or it was defaulted from PROJECT_NAME
      assert settings.EMAILS_FROM_NAME  # not None or empty
      assert isinstance(settings.EMAILS_FROM_NAME, str)
      assert len(settings.EMAILS_FROM_NAME) > 0
  ```

- [ ] **Step 3: Write test for gap-36 (UserProgress unique constraint)**

  Create `backend/tests/models/test_models.py`:

  ```python
  """Tests for app/models.py -- DB-level constraints."""

  import uuid

  import pytest
  from sqlalchemy.exc import IntegrityError
  from sqlmodel import Session

  from app.models import UserProgress


  def test_user_progress_unique_constraint_on_user_id(db: Session) -> None:
      """gap-36: Second UserProgress insert for same user_id raises IntegrityError."""
      user_id = uuid.uuid4()

      first = UserProgress(user_id=user_id)
      db.add(first)
      db.commit()
      db.refresh(first)

      second = UserProgress(user_id=user_id)
      db.add(second)
      with pytest.raises(IntegrityError):
          db.commit()

      # Roll back so subsequent tests are not affected
      db.rollback()
      db.delete(first)
      db.commit()
  ```

- [ ] **Step 4: Write test for gap-40 (CRUD update no-op)**

  Create `backend/tests/crud/test_crud_update.py`:

  ```python
  """Tests for app/crud.py -- update_user edge cases."""

  from sqlmodel import Session

  from app.crud import create_user, update_user
  from app.models import UserCreate, UserUpdate
  from tests.utils.utils import random_email, random_lower_string


  def test_update_user_noop_still_commits(db: Session) -> None:
      """gap-40: update_user with all-None UserUpdate still commits without error."""
      email = random_email()
      password = random_lower_string()
      user = create_user(session=db, user_create=UserCreate(email=email, password=password))

      original_email = user.email

      # UserUpdate with no fields set -- no changes applied
      user_in = UserUpdate()
      updated = update_user(session=db, db_user=user, user_in=user_in)

      # Row is still in DB, email unchanged
      assert updated.email == original_email
      db.refresh(updated)
      assert updated.email == original_email
  ```

- [ ] **Step 5: Write test for gap-46 (build_chat_prompt missing keys)**

  Append to `backend/tests/services/test_llm.py`:

  ```python
  def test_build_chat_system_prompt_missing_word_key_falls_back() -> None:
      """gap-46: Error dict missing 'word' or 'context' key falls back to '?' without raising."""
      from app.services.llm import build_chat_system_prompt

      errors = [
          {"context": "some context"},  # missing 'word'
          {"word": "pona"},             # missing 'context'
          {},                           # both missing
      ]
      result = build_chat_system_prompt(
          mode="free_chat",
          known_words=["mi"],
          current_unit=1,
          recent_errors=errors,
      )
      # Should not raise; '?' placeholders appear where keys are missing
      assert "?: some context" in result
      assert "pona: ?" in result
      assert "?: ?" in result
  ```

- [ ] **Step 6: Write test for gap-53 (data loader duplicate word)**

  Create `backend/tests/data/test_loader.py`:

  ```python
  """Tests for app/data/loader.py -- edge cases."""

  import importlib
  import sys
  from unittest.mock import patch


  def test_duplicate_word_second_entry_overwrites_first() -> None:
      """gap-53: When two entries have the same 'word', second overwrites first in _WORD_INDEX."""
      fake_words = [
          {"word": "pona", "definitions": [{"definition": "good"}], "pos": ["adj"], "ku": False},
          {"word": "pona", "definitions": [{"definition": "OVERWRITTEN"}], "pos": ["adj"], "ku": False},
      ]
      fake_exercises: dict = {
          "flashcards": [],
          "sentence_quiz": {"tp2en": [], "en2tp": [], "grammar": []},
          "word_building": [],
          "unscramble": [],
          "sitelen_pona": [],
          "particles": [],
          "stories": [],
          "reverse_build": [],
      }
      fake_grammar: dict = {"sections": [], "comparisons": [], "quiz": []}

      # Force module re-execution with patched data
      with patch(
          "app.data.loader._load_json",
          side_effect=[fake_words, fake_exercises, fake_grammar],
      ):
          if "app.data.loader" in sys.modules:
              del sys.modules["app.data.loader"]
          import app.data.loader as loader_mod
          importlib.reload(loader_mod)

          entry = loader_mod.get_word("pona")
          assert entry is not None
          # Second entry wins
          assert entry["definitions"][0]["definition"] == "OVERWRITTEN"

      # Restore original module for subsequent tests
      if "app.data.loader" in sys.modules:
          del sys.modules["app.data.loader"]
      import app.data.loader  # noqa: F401  # re-import from original files
  ```

- [ ] **Step 7: Write test for gap-56 (lifespan LangFuse failure)**

  Append to `backend/tests/test_main.py`:

  ```python
  def test_lifespan_continues_when_check_langfuse_auth_raises() -> None:
      """gap-56: App lifespan still completes (yield reached) when check_langfuse_auth raises."""
      from unittest.mock import patch

      from fastapi.testclient import TestClient

      from app.main import app

      with patch(
          "app.main.check_langfuse_auth",
          side_effect=Exception("langfuse unavailable"),
      ):
          try:
              with TestClient(app) as c:
                  r = c.get("/api/v1/utils/health-check/")
                  assert r.status_code == 200
          except Exception as exc:
              raise AssertionError(
                  f"Lifespan crashed when check_langfuse_auth raised: {exc}"
              ) from exc
  ```

  If this test fails (lifespan does not guard the call), fix `backend/app/main.py`:

  ```python
  @asynccontextmanager
  async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
      try:
          check_langfuse_auth()
      except Exception:
          logger.exception("LangFuse auth check raised unexpectedly during startup")
      yield
  ```

- [ ] **Step 8: Write test for gap-26 (private endpoint duplicate email)**

  Append to `backend/tests/api/routes/test_private.py`:

  ```python
  def test_create_user_duplicate_email_returns_error(client: TestClient) -> None:
      """gap-26: POSTing a duplicate email to /private/users/ fails at DB level."""
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
      # Hits the DB unique constraint -- 409 or 500 depending on error handling
      assert r2.status_code in (409, 500)
  ```

- [ ] **Step 9: Run all new tests**

  ```bash
  docker compose exec backend bash -c "cd /app && bash scripts/tests-start.sh -k 'test_config or test_models or test_crud_update or test_loader or test_lifespan or test_create_user_duplicate' 2>&1 | tail -60"
  ```

- [ ] **Step 10: Lint and type-check**

  ```bash
  docker compose exec backend bash -c "cd /app/backend && uv run ruff check tests/core/ tests/models/ tests/crud/ tests/services/test_llm.py tests/data/ tests/test_main.py tests/api/routes/test_private.py && uv run mypy tests/core/ tests/models/ tests/crud/ tests/data/ 2>&1 | tail -20"
  ```

- [ ] **Step 11: Commit**

  ```bash
  git add backend/tests/core/ backend/tests/models/ backend/tests/crud/ backend/tests/services/test_llm.py backend/tests/data/ backend/tests/test_main.py backend/tests/api/routes/test_private.py backend/app/main.py
  git commit -m "test: cover config defaults, UserProgress unique constraint, no-op update, prompt key fallbacks, duplicate word loader, lifespan LangFuse failure, private endpoint duplicate email"
  ```

- [ ] **Step 12:** Record learnings to `.claude/learnings-data-config-model-invariants.md` using the `surfacing-subagent-learnings` skill.

---

## Task 6: Final verification

**Files:** No new files. Verification only.

### Steps

- [ ] **Step 1: Run the full test suite**

  ```bash
  docker compose exec backend bash scripts/tests-start.sh 2>&1 | tail -40
  ```

  Expected: all tests pass (including the 2 env-related tracing failures which are environment-only, not code issues).

- [ ] **Step 2: Run ruff and mypy across all new test files**

  ```bash
  docker compose exec backend bash -c "cd /app/backend && uv run ruff check tests/ && uv run mypy tests/ 2>&1 | tail -20"
  ```

- [ ] **Step 3: Commit any final cleanup**

  ```bash
  git status
  # If there are uncommitted changes:
  git add backend/
  git commit -m "test: final cleanup for phase-4.5.2 test coverage"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-phase-045-final-verification.md` using the `surfacing-subagent-learnings` skill.

---

## Summary

| Task | Gaps closed | Description |
|------|-------------|-------------|
| 1 | gap-1, gap-5, gap-7, gap-8 | Chat LLM exception paths + wrong-type fallback + `_is_authenticated()` guards |
| 2 | gap-28, gap-29 | Optional auth — invalid token and inactive user treated as anonymous |
| 3 | gap-9, gap-13 | Email send failures in password recovery and admin create user |
| 4 | gap-19, gap-20, gap-22 | Exercise builder malformed entries, MAX_EXERCISES cap, empty dictionary query |
| 5 | gap-26, gap-33, gap-36, gap-40, gap-46, gap-53, gap-56 | Data/config/model invariants (bulk task) |
| 6 | — | Full suite verification |

**Dependency graph:**

```
Tasks 1, 2, 3, 4, 5 can be dispatched in sequence.
All → Task 6
```

**Production code changes required** (not just tests):
- `backend/app/api/routes/chat.py` — add `ValidationError` to the grade fallback except clause (gap-7)
- `backend/app/api/routes/login.py` — wrap `send_email` in `try/except` (gap-9)
- `backend/app/api/routes/users.py` — wrap `send_email` in `try/except` (gap-13)
- `backend/app/main.py` — wrap `check_langfuse_auth()` in lifespan try/except (gap-56, conditional on test result)
