# Phase 3: LLM Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LLM-powered chat streaming and exercise grading endpoints with rate limiting for anonymous users.

**Architecture:** OpenAI-compatible client via `openai` SDK, SSE streaming via FastAPI StreamingResponse, slowapi rate limiting with a shared `Limiter` instance (in `app.core.rate_limit`) and `exempt_when` for authenticated users, optional user dependency for public+auth endpoints.

**Tech Stack:** FastAPI, OpenAI Python SDK, slowapi, SSE, pytest (with mocked OpenAI client)

---

## Task 1: Add dependencies and config settings

**Files:**
- `backend/pyproject.toml`
- `backend/app/core/config.py`
- `.env`

**Steps:**

- [ ] **Step 1: Add `openai` and `slowapi` to backend dependencies.**

  In `backend/pyproject.toml`, add to `dependencies`:
  ```toml
  "openai>=1.0.0,<2.0.0",
  "slowapi>=0.1.9,<1.0.0",
  ```

  The full `dependencies` list becomes:
  ```toml
  dependencies = [
      "fastapi[standard]<1.0.0,>=0.114.2",
      "python-multipart<1.0.0,>=0.0.7",
      "email-validator<3.0.0.0,>=2.1.0.post1",
      "tenacity<9.0.0,>=8.2.3",
      "pydantic>2.0",
      "emails<1.0,>=0.6",
      "jinja2<4.0.0,>=3.1.4",
      "alembic<2.0.0,>=1.12.1",
      "httpx<1.0.0,>=0.25.1",
      "psycopg[binary]<4.0.0,>=3.1.13",
      "sqlmodel<1.0.0,>=0.0.21",
      "pydantic-settings<3.0.0,>=2.2.1",
      "sentry-sdk[fastapi]>=2.0.0,<3.0.0",
      "pyjwt<3.0.0,>=2.8.0",
      "pwdlib[argon2,bcrypt]>=0.3.0",
      "openai>=1.0.0,<2.0.0",
      "slowapi>=0.1.9,<1.0.0",
  ]
  ```

- [ ] **Step 2: Install the new dependencies.**

  ```bash
  cd backend && uv sync
  ```

- [ ] **Step 3: Add LLM config fields to `Settings` class in `backend/app/core/config.py`.**

  Add these fields to the `Settings` class, after the `FIRST_SUPERUSER_PASSWORD` field and before the `_check_default_secret` method:

  ```python
    # LLM provider (OpenAI-compatible)
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_API_TOKEN: str = "changethis"
    MODEL: str = "gpt-4o-mini"

    # LLM rate limiting (anonymous users)
    CHAT_FREE_DAILY_LIMIT: int = 20
    CHAT_FREE_MAX_TOKENS: int = 500

    # Telegram bot (optional, used in Phase 5)
    TG_BOT_TOKEN: str | None = None

    # LangFuse observability (wired in Phase 4)
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "http://langfuse-server:3000"
  ```

  Also add to the `_enforce_non_default_secrets` validator:
  ```python
    self._check_default_secret("OPENAI_API_TOKEN", self.OPENAI_API_TOKEN)
  ```

- [ ] **Step 4: Add env vars to `.env`.**

  Add these lines to the `.env` file, in the existing `AI Agent: LLM Providers` section or after it:

  ```env
  # -- App LLM config (OpenAI-compatible) --
  OPENAI_API_TOKEN=changethis
  MODEL=gpt-4o-mini

  # -- LLM rate limiting --
  CHAT_FREE_DAILY_LIMIT=20
  CHAT_FREE_MAX_TOKENS=500

  # -- Telegram bot (Phase 5) --
  TG_BOT_TOKEN=
  ```

  Note: `OPENAI_BASE_URL` is already effectively set via the existing `OPENAI_BASE_URL` env var. The `LANGFUSE_*` vars already exist in `.env`.

- [ ] **Step 4b: Update `.env.example` with placeholder values for the new LLM config vars.**

  Add these lines to `.env.example` (no real secrets — only placeholder values):

  ```env
  # -- App LLM config (OpenAI-compatible) --
  OPENAI_BASE_URL=https://api.openai.com/v1
  OPENAI_API_TOKEN=changethis
  MODEL=gpt-4o-mini

  # -- LLM rate limiting --
  CHAT_FREE_DAILY_LIMIT=20
  CHAT_FREE_MAX_TOKENS=500

  # -- Telegram bot (Phase 5) --
  TG_BOT_TOKEN=
  ```

- [ ] **Step 5: Verify the app still starts.**

  ```bash
  cd backend && uv run python -c "from app.core.config import settings; print(settings.MODEL, settings.CHAT_FREE_DAILY_LIMIT)"
  ```

  Expected: prints the model name and daily limit without errors.

- [ ] **Step 6: Commit.**

  ```
  feat: add openai/slowapi deps and LLM config settings (Phase 3.1)
  ```

- [ ] **Step 7:** Record learnings to `.claude/learnings-config-and-deps.md` using the surfacing-subagent-learnings skill.

---

## Task 2: LLM service module

**Files:**
- `backend/app/services/__init__.py` (create, empty)
- `backend/app/services/llm.py` (create)
- `backend/tests/services/__init__.py` (create, empty)
- `backend/tests/services/test_llm.py` (create)

**Steps:**

- [ ] **Step 1 (TDD Red): Write failing tests for prompt builders in `backend/tests/services/test_llm.py`.**

  ```python
  from app.services.llm import (
      SYSTEM_PROMPT_CHAT,
      SYSTEM_PROMPT_GRADE,
      build_chat_system_prompt,
      build_grade_system_prompt,
      get_llm_client,
  )


  def test_build_chat_system_prompt_includes_known_words() -> None:
      result = build_chat_system_prompt(
          mode="free_chat",
          known_words=["mi", "sina", "toki"],
          current_unit=2,
          recent_errors=[],
      )
      assert "mi, sina, toki" in result
      assert "free_chat" in result
      assert "2" in result


  def test_build_chat_system_prompt_includes_recent_errors() -> None:
      errors = [
          {"word": "pona", "context": "confused with ike"},
          {"word": "telo", "context": "wrong particle"},
      ]
      result = build_chat_system_prompt(
          mode="grammar",
          known_words=["mi", "pona"],
          current_unit=3,
          recent_errors=errors,
      )
      assert "pona: confused with ike" in result
      assert "telo: wrong particle" in result


  def test_build_chat_system_prompt_defaults_for_empty_words() -> None:
      result = build_chat_system_prompt(
          mode="free_chat",
          known_words=[],
          current_unit=1,
          recent_errors=[],
      )
      assert "mi, sina, pona, ike, toki" in result


  def test_build_chat_system_prompt_defaults_for_empty_errors() -> None:
      result = build_chat_system_prompt(
          mode="free_chat",
          known_words=["mi"],
          current_unit=1,
          recent_errors=[],
      )
      assert "none" in result.lower()


  def test_build_chat_system_prompt_truncates_errors_to_five() -> None:
      errors = [{"word": f"w{i}", "context": f"ctx{i}"} for i in range(10)]
      result = build_chat_system_prompt(
          mode="free_chat",
          known_words=["mi"],
          current_unit=1,
          recent_errors=errors,
      )
      # Only last 5 errors should appear
      assert "w5" in result
      assert "w9" in result
      assert "w0" not in result


  def test_build_grade_system_prompt_includes_words() -> None:
      result = build_grade_system_prompt(known_words=["mi", "sina", "pona"])
      assert "mi, sina, pona" in result
      assert "JSON" in result


  def test_build_grade_system_prompt_defaults_for_empty_words() -> None:
      result = build_grade_system_prompt(known_words=[])
      assert "all basic words" in result


  def test_system_prompt_chat_has_jan_sona_persona() -> None:
      assert "jan sona" in SYSTEM_PROMPT_CHAT
      assert "toki pona dojo" in SYSTEM_PROMPT_CHAT


  def test_system_prompt_grade_has_json_format() -> None:
      assert "correct" in SYSTEM_PROMPT_GRADE
      assert "score" in SYSTEM_PROMPT_GRADE
      assert "feedback" in SYSTEM_PROMPT_GRADE


  def test_get_llm_client_returns_openai_instance() -> None:
      client = get_llm_client()
      # openai.OpenAI is the expected type
      from openai import OpenAI

      assert isinstance(client, OpenAI)
  ```

- [ ] **Step 2: Create the `__init__.py` files.**

  Create empty files:
  - `backend/app/services/__init__.py`
  - `backend/tests/services/__init__.py`

- [ ] **Step 3: Verify tests fail (Red).**

  ```bash
  cd backend && uv run pytest tests/services/test_llm.py -v 2>&1 | head -30
  ```

  Expected: `ModuleNotFoundError` or `ImportError` because `app.services.llm` does not exist yet.

- [ ] **Step 4 (TDD Green): Create `backend/app/services/llm.py` with full implementation.**

  ```python
  import logging
  from typing import Any

  from openai import OpenAI

  from app.core.config import settings

  logger = logging.getLogger(__name__)

  SYSTEM_PROMPT_CHAT = """You are jan sona, a toki pona tutor on the site "toki pona dojo."

  LEARNER CONTEXT:
  - Current unit: {unit}
  - Known words: {words}
  - Recent errors: {errors}
  - Chat mode: {mode}

  RULES:
  - Use ONLY words from the known list in your toki pona. Gloss unknown words in parentheses: "kasi (plant)"
  - In free chat mode: respond in toki pona first, then provide an English translation below, separated by a blank line
  - For grammar questions: explain in clear English with toki pona examples
  - For translation requests: show multiple valid toki pona approaches with explanations
  - Keep responses concise (2-4 sentences in each language)
  - Gently correct mistakes inline — show the correction, explain briefly why
  - Be warm, patient, encouraging
  - Never break character as jan sona
  - If the user writes in English, respond in English but include toki pona examples
  - If the user writes in toki pona, respond primarily in toki pona"""

  SYSTEM_PROMPT_GRADE = """You are a toki pona grading assistant. Grade the user's toki pona answer.

  Respond in this exact JSON format:
  {{"correct": true/false, "score": 0.0-1.0, "feedback": "...", "suggested_answer": "..." or null}}

  Be generous — toki pona has multiple valid translations. A response is correct if it communicates the intended meaning using valid toki pona grammar, even if the phrasing differs from the expected answer.

  Known words the learner has studied: {words}"""


  def get_llm_client() -> OpenAI:
      """Create OpenAI-compatible client from .env config."""
      return OpenAI(
          base_url=settings.OPENAI_BASE_URL,
          api_key=settings.OPENAI_API_TOKEN,
      )


  def build_chat_system_prompt(
      mode: str,
      known_words: list[str],
      current_unit: int,
      recent_errors: list[dict[str, Any]],
  ) -> str:
      """Build the chat system prompt with learner context injected."""
      errors_str = (
          "; ".join(
              [
                  f"{e.get('word', '?')}: {e.get('context', '?')}"
                  for e in recent_errors[-5:]
              ]
          )
          or "none"
      )
      return SYSTEM_PROMPT_CHAT.format(
          unit=current_unit,
          words=", ".join(known_words) if known_words else "mi, sina, pona, ike, toki",
          errors=errors_str,
          mode=mode,
      )


  def build_grade_system_prompt(known_words: list[str]) -> str:
      """Build the grading system prompt with known words."""
      return SYSTEM_PROMPT_GRADE.format(
          words=", ".join(known_words) if known_words else "all basic words",
      )
  ```

- [ ] **Step 5: Verify tests pass (Green).**

  ```bash
  cd backend && uv run pytest tests/services/test_llm.py -v
  ```

  Expected: all 10 tests pass.

- [ ] **Step 6: Commit.**

  ```
  feat: add LLM service with system prompts and prompt builders (Phase 3.2)
  ```

- [ ] **Step 7:** Record learnings to `.claude/learnings-llm-service.md` using the surfacing-subagent-learnings skill.

---

## Task 3: Chat schemas

**Files:**
- `backend/app/schemas/__init__.py` (create, empty)
- `backend/app/schemas/chat.py` (create)

**Steps:**

- [ ] **Step 1: Create `backend/app/schemas/__init__.py`.**

  Empty file.

- [ ] **Step 2: Create `backend/app/schemas/chat.py` with all request/response models.**

  ```python
  from pydantic import BaseModel, Field


  class ChatMessage(BaseModel):
      role: str = Field(..., pattern="^(user|assistant)$")
      content: str = Field(..., min_length=1, max_length=5000)


  class ChatRequest(BaseModel):
      messages: list[ChatMessage] = Field(..., min_length=1, max_length=50)
      mode: str = Field(
          default="free_chat",
          pattern="^(free_chat|grammar|translation)$",
      )
      known_words: list[str] = Field(default_factory=list)
      current_unit: int = Field(default=1, ge=1, le=10)
      recent_errors: list[dict] = Field(default_factory=list)


  # NOTE: ChatResponse is not used by any endpoint currently (streaming uses
  # raw SSE). Kept as a reserved schema for a future non-streaming chat endpoint.
  class ChatResponse(BaseModel):
      content: str


  class ExerciseGradeRequest(BaseModel):
      exercise_type: str = Field(..., min_length=1, max_length=100)
      prompt: str = Field(..., min_length=1, max_length=2000)
      user_answer: str = Field(..., min_length=1, max_length=2000)
      known_words: list[str] = Field(default_factory=list)


  class ExerciseGradeResponse(BaseModel):
      correct: bool
      score: float = Field(..., ge=0.0, le=1.0)
      feedback: str
      suggested_answer: str | None = None
  ```

- [ ] **Step 3: Verify schemas import correctly.**

  ```bash
  cd backend && uv run python -c "from app.schemas.chat import ChatRequest, ChatResponse, ExerciseGradeRequest, ExerciseGradeResponse, ChatMessage; print('OK')"
  ```

  Expected: prints `OK`.

- [ ] **Step 4: Commit.**

  ```
  feat: add chat and grading Pydantic schemas (Phase 3.3)
  ```

- [ ] **Step 5:** Record learnings to `.claude/learnings-chat-schemas.md` using the surfacing-subagent-learnings skill.

---

## Task 4: OptionalUser dependency

**Files:**
- `backend/app/api/deps.py`

**Steps:**

- [ ] **Step 1: Add `OptionalUser` dependency to `backend/app/api/deps.py`.**

  Add the following imports at the top (some already exist):
  ```python
  from fastapi import Depends, HTTPException, status, Header
  ```

  **Note on async consistency:** The existing `get_current_user` is a sync function (not `async`), so `get_optional_current_user` below is intentionally sync to match. If the template's `get_current_user` is ever changed to `async`, update this one to `async` as well.

  Add the `Optional` bearer scheme and the new dependency after the `CurrentUser` definition:

  ```python
  optional_oauth2 = OAuth2PasswordBearer(
      tokenUrl=f"{settings.API_V1_STR}/login/access-token",
      auto_error=False,
  )

  OptionalTokenDep = Annotated[str | None, Depends(optional_oauth2)]


  def get_optional_current_user(
      session: SessionDep, token: OptionalTokenDep
  ) -> User | None:
      """Return the current user if a valid token is provided, else None."""
      if not token:
          return None
      try:
          payload = jwt.decode(
              token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
          )
          token_data = TokenPayload(**payload)
      except (InvalidTokenError, ValidationError):
          return None
      user = session.get(User, token_data.sub)
      if not user or not user.is_active:
          return None
      return user


  OptionalUser = Annotated[User | None, Depends(get_optional_current_user)]
  ```

- [ ] **Step 2: Verify the dependency is importable.**

  ```bash
  cd backend && uv run python -c "from app.api.deps import OptionalUser; print('OK')"
  ```

  Expected: prints `OK`.

- [ ] **Step 3: Commit.**

  ```
  feat: add OptionalUser auth dependency for public+auth endpoints (Phase 3.4)
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-optional-user.md` using the surfacing-subagent-learnings skill.

---

## Task 5: Rate limiting setup (shared module + app entrypoint)

**Files:**
- `backend/app/core/rate_limit.py` (create)
- `backend/app/main.py`

**Steps:**

- [ ] **Step 1: Create the shared limiter module `backend/app/core/rate_limit.py`.**

  This module holds the single `Limiter` instance so both `main.py` (exception handler) and route modules (decorators) use the same object.

  ```python
  from slowapi import Limiter
  from slowapi.util import get_remote_address

  limiter = Limiter(key_func=get_remote_address)
  ```

- [ ] **Step 2: Wire the shared limiter into `backend/app/main.py`.**

  Add imports at the top of the file:
  ```python
  from slowapi import _rate_limit_exceeded_handler
  from slowapi.errors import RateLimitExceeded

  from app.core.rate_limit import limiter
  ```

  Add after the `app = FastAPI(...)` block (before the CORS middleware):
  ```python
  # Rate limiting (limiter instance lives in app.core.rate_limit)
  app.state.limiter = limiter
  app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
  ```

  The full `backend/app/main.py` should look like:
  ```python
  import sentry_sdk
  from fastapi import FastAPI
  from fastapi.routing import APIRoute
  from slowapi import _rate_limit_exceeded_handler
  from slowapi.errors import RateLimitExceeded
  from starlette.middleware.cors import CORSMiddleware

  from app.api.main import api_router
  from app.core.config import settings
  from app.core.rate_limit import limiter


  def custom_generate_unique_id(route: APIRoute) -> str:
      return f"{route.tags[0]}-{route.name}"


  if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
      sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

  app = FastAPI(
      title=settings.PROJECT_NAME,
      openapi_url=f"{settings.API_V1_STR}/openapi.json",
      generate_unique_id_function=custom_generate_unique_id,
  )

  # Rate limiting (limiter instance lives in app.core.rate_limit)
  app.state.limiter = limiter
  app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

  # Set all CORS enabled origins
  if settings.all_cors_origins:
      app.add_middleware(
          CORSMiddleware,
          allow_origins=settings.all_cors_origins,
          allow_credentials=True,
          allow_methods=["*"],
          allow_headers=["*"],
      )

  app.include_router(api_router, prefix=settings.API_V1_STR)
  ```

- [ ] **Step 2: Verify the app still imports without error.**

  ```bash
  cd backend && uv run python -c "from app.main import app; print('OK')"
  ```

  Expected: prints `OK`.

- [ ] **Step 3: Commit.**

  ```
  feat: add shared slowapi rate limiter module and wire into app (Phase 3.5)
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-rate-limiting-setup.md` using the surfacing-subagent-learnings skill.

---

## Task 6: Chat router and endpoint registration

**Files:**
- `backend/app/api/routes/chat.py` (create)
- `backend/app/api/main.py`
- `backend/tests/api/test_chat.py` (create)

**Steps:**

- [ ] **Step 1 (TDD Red): Write failing tests in `backend/tests/api/test_chat.py`.**

  ```python
  import json
  from collections.abc import Generator
  from typing import Any
  from unittest.mock import MagicMock, patch

  import pytest
  from fastapi.testclient import TestClient

  from app.core.config import settings


  # ---------------------------------------------------------------------------
  # Helpers: mock OpenAI streaming and non-streaming responses
  # ---------------------------------------------------------------------------

  def _make_mock_stream_chunk(content: str) -> MagicMock:
      """Create a mock chunk matching openai's ChatCompletionChunk shape."""
      chunk = MagicMock()
      delta = MagicMock()
      delta.content = content
      choice = MagicMock()
      choice.delta = delta
      chunk.choices = [choice]
      return chunk


  def _make_mock_stream(texts: list[str]) -> MagicMock:
      """Return a mock that iterates over fake stream chunks."""
      chunks = [_make_mock_stream_chunk(t) for t in texts]
      stream = MagicMock()
      stream.__iter__ = MagicMock(return_value=iter(chunks))
      return stream


  def _make_mock_completion(content: str) -> MagicMock:
      """Create a mock non-streaming chat completion."""
      message = MagicMock()
      message.content = content
      choice = MagicMock()
      choice.message = message
      completion = MagicMock()
      completion.choices = [choice]
      return completion


  def _chat_request_body(**overrides: Any) -> dict[str, Any]:
      base = {
          "messages": [{"role": "user", "content": "toki! mi wile kama sona"}],
          "mode": "free_chat",
          "known_words": ["mi", "sina", "toki", "pona"],
          "current_unit": 1,
          "recent_errors": [],
      }
      base.update(overrides)
      return base


  def _grade_request_body(**overrides: Any) -> dict[str, Any]:
      base = {
          "exercise_type": "translate_to_tp",
          "prompt": "Translate: I am good",
          "user_answer": "mi pona",
          "known_words": ["mi", "pona"],
      }
      base.update(overrides)
      return base


  # ---------------------------------------------------------------------------
  # /chat/stream tests
  # ---------------------------------------------------------------------------

  class TestChatStream:
      """Tests for POST /api/v1/chat/stream."""

      @patch("app.api.routes.chat.get_llm_client")
      def test_stream_returns_sse_chunks(
          self, mock_get_client: MagicMock, client: TestClient
      ) -> None:
          mock_client = MagicMock()
          mock_client.chat.completions.create.return_value = _make_mock_stream(
              ["toki", " pona", "!"]
          )
          mock_get_client.return_value = mock_client

          response = client.post(
              f"{settings.API_V1_STR}/chat/stream",
              json=_chat_request_body(),
          )

          assert response.status_code == 200
          assert response.headers["content-type"].startswith("text/event-stream")

          lines = response.text.strip().split("\n\n")
          # Should have 3 data chunks + 1 [DONE]
          data_lines = [l for l in lines if l.startswith("data:")]
          assert len(data_lines) == 4  # 3 content + 1 DONE

          # Parse first content chunk
          first = json.loads(data_lines[0].removeprefix("data: "))
          assert first["content"] == "toki"

          # Last should be [DONE]
          assert data_lines[-1].strip() == "data: [DONE]"

      @patch("app.api.routes.chat.get_llm_client")
      def test_stream_uses_lower_max_tokens_for_anon(
          self, mock_get_client: MagicMock, client: TestClient
      ) -> None:
          mock_client = MagicMock()
          mock_client.chat.completions.create.return_value = _make_mock_stream(["ok"])
          mock_get_client.return_value = mock_client

          client.post(
              f"{settings.API_V1_STR}/chat/stream",
              json=_chat_request_body(),
          )

          call_kwargs = mock_client.chat.completions.create.call_args.kwargs
          assert call_kwargs["max_tokens"] == settings.CHAT_FREE_MAX_TOKENS

      @patch("app.api.routes.chat.get_llm_client")
      def test_stream_uses_higher_max_tokens_for_authenticated(
          self,
          mock_get_client: MagicMock,
          client: TestClient,
          normal_user_token_headers: dict[str, str],
      ) -> None:
          mock_client = MagicMock()
          mock_client.chat.completions.create.return_value = _make_mock_stream(["ok"])
          mock_get_client.return_value = mock_client

          client.post(
              f"{settings.API_V1_STR}/chat/stream",
              json=_chat_request_body(),
              headers=normal_user_token_headers,
          )

          call_kwargs = mock_client.chat.completions.create.call_args.kwargs
          assert call_kwargs["max_tokens"] == 1500

      def test_stream_rejects_empty_messages(self, client: TestClient) -> None:
          response = client.post(
              f"{settings.API_V1_STR}/chat/stream",
              json=_chat_request_body(messages=[]),
          )
          assert response.status_code == 422

      def test_stream_rejects_invalid_mode(self, client: TestClient) -> None:
          response = client.post(
              f"{settings.API_V1_STR}/chat/stream",
              json=_chat_request_body(mode="invalid_mode"),
          )
          assert response.status_code == 422


  # ---------------------------------------------------------------------------
  # /chat/grade tests
  # ---------------------------------------------------------------------------

  class TestChatGrade:
      """Tests for POST /api/v1/chat/grade."""

      @patch("app.api.routes.chat.get_llm_client")
      def test_grade_returns_valid_response(
          self, mock_get_client: MagicMock, client: TestClient
      ) -> None:
          grade_json = json.dumps(
              {
                  "correct": True,
                  "score": 0.9,
                  "feedback": "pona! Great job.",
                  "suggested_answer": None,
              }
          )
          mock_client = MagicMock()
          mock_client.chat.completions.create.return_value = _make_mock_completion(
              grade_json
          )
          mock_get_client.return_value = mock_client

          response = client.post(
              f"{settings.API_V1_STR}/chat/grade",
              json=_grade_request_body(),
          )

          assert response.status_code == 200
          data = response.json()
          assert data["correct"] is True
          assert data["score"] == 0.9
          assert "pona" in data["feedback"]

      @patch("app.api.routes.chat.get_llm_client")
      def test_grade_handles_malformed_llm_json(
          self, mock_get_client: MagicMock, client: TestClient
      ) -> None:
          mock_client = MagicMock()
          mock_client.chat.completions.create.return_value = _make_mock_completion(
              "this is not json at all"
          )
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

      @patch("app.api.routes.chat.get_llm_client")
      def test_grade_handles_partial_json_from_llm(
          self, mock_get_client: MagicMock, client: TestClient
      ) -> None:
          # LLM returns JSON but missing required fields
          mock_client = MagicMock()
          mock_client.chat.completions.create.return_value = _make_mock_completion(
              '{"correct": true}'
          )
          mock_get_client.return_value = mock_client

          response = client.post(
              f"{settings.API_V1_STR}/chat/grade",
              json=_grade_request_body(),
          )

          assert response.status_code == 200
          data = response.json()
          # Falls back due to missing score/feedback
          assert data["correct"] is False
          assert data["score"] == 0.0

      def test_grade_rejects_empty_answer(self, client: TestClient) -> None:
          response = client.post(
              f"{settings.API_V1_STR}/chat/grade",
              json=_grade_request_body(user_answer=""),
          )
          assert response.status_code == 422


  # ---------------------------------------------------------------------------
  # Rate limiting tests
  # ---------------------------------------------------------------------------

  class TestRateLimiting:
      """Tests for rate limiting on chat endpoints."""

      @patch("app.api.routes.chat.get_llm_client")
      def test_rate_limit_exceeded_returns_429(
          self, mock_get_client: MagicMock, client: TestClient
      ) -> None:
          """After CHAT_FREE_DAILY_LIMIT requests, the next should return 429."""
          mock_client = MagicMock()
          mock_client.chat.completions.create.return_value = _make_mock_stream(["ok"])
          mock_get_client.return_value = mock_client

          # Reset rate limiter state for clean test
          from app.main import app

          app.state.limiter.reset()

          body = _chat_request_body()
          limit = settings.CHAT_FREE_DAILY_LIMIT

          for i in range(limit):
              resp = client.post(
                  f"{settings.API_V1_STR}/chat/stream",
                  json=body,
              )
              assert resp.status_code == 200, f"Request {i+1} failed unexpectedly"

          # The next request should be rate limited
          resp = client.post(
              f"{settings.API_V1_STR}/chat/stream",
              json=body,
          )
          assert resp.status_code == 429

      @patch("app.api.routes.chat.get_llm_client")
      def test_authenticated_user_bypasses_rate_limit(
          self,
          mock_get_client: MagicMock,
          client: TestClient,
          normal_user_token_headers: dict[str, str],
      ) -> None:
          """Authenticated users should NOT be rate-limited."""
          mock_client = MagicMock()
          mock_client.chat.completions.create.return_value = _make_mock_stream(["ok"])
          mock_get_client.return_value = mock_client

          # Reset rate limiter state for clean test
          from app.main import app

          app.state.limiter.reset()

          body = _chat_request_body()
          limit = settings.CHAT_FREE_DAILY_LIMIT

          # Make more requests than the anonymous limit allows
          for i in range(limit + 5):
              resp = client.post(
                  f"{settings.API_V1_STR}/chat/stream",
                  json=body,
                  headers=normal_user_token_headers,
              )
              assert resp.status_code == 200, (
                  f"Authenticated request {i+1} failed with {resp.status_code}"
              )
  ```

- [ ] **Step 2: Create `backend/tests/api/__init__.py` if it does not already exist.**

  Ensure the directory and `__init__.py` exist:
  ```bash
  mkdir -p backend/tests/api && touch backend/tests/api/__init__.py
  ```

- [ ] **Step 3: Verify tests fail (Red).**

  ```bash
  cd backend && uv run pytest tests/api/test_chat.py -v 2>&1 | head -20
  ```

  Expected: `ImportError` or `ModuleNotFoundError` because the chat route does not exist yet.

- [ ] **Step 4 (TDD Green): Create `backend/app/api/routes/chat.py`.**

  ```python
  import json
  import logging

  from fastapi import APIRouter, Request
  from fastapi.responses import StreamingResponse

  from app.api.deps import OptionalUser
  from app.core.config import settings
  from app.core.rate_limit import limiter
  from app.schemas.chat import (
      ChatRequest,
      ExerciseGradeRequest,
      ExerciseGradeResponse,
  )
  from app.services.llm import (
      build_chat_system_prompt,
      build_grade_system_prompt,
      get_llm_client,
  )

  logger = logging.getLogger(__name__)

  router = APIRouter(prefix="/chat", tags=["chat"])


  def _is_authenticated(request: Request) -> bool:
      """Return True if the request has a valid auth user attached (set by OptionalUser)."""
      return getattr(request.state, "user", None) is not None


  @router.post("/stream")
  @limiter.limit(
      f"{settings.CHAT_FREE_DAILY_LIMIT}/day",
      exempt_when=_is_authenticated,
  )
  async def chat_stream(
      request: Request,
      body: ChatRequest,
      user: OptionalUser = None,
  ) -> StreamingResponse:
      """Stream a chat response from the LLM.

      Anonymous users: rate-limited to CHAT_FREE_DAILY_LIMIT/day, max_tokens capped.
      Authenticated users: exempt from rate limit, higher max_tokens.
      """
      # Stash user on request.state so _is_authenticated can read it
      request.state.user = user
      client = get_llm_client()
      system = build_chat_system_prompt(
          mode=body.mode,
          known_words=body.known_words,
          current_unit=body.current_unit,
          recent_errors=body.recent_errors,
      )

      messages: list[dict[str, str]] = [{"role": "system", "content": system}]
      messages += [{"role": m.role, "content": m.content} for m in body.messages]

      max_tokens = settings.CHAT_FREE_MAX_TOKENS if user is None else 1500

      stream = client.chat.completions.create(
          model=settings.MODEL,
          messages=messages,
          max_tokens=max_tokens,
          stream=True,
      )

      def generate():  # type: ignore[no-untyped-def]
          for chunk in stream:
              if chunk.choices and chunk.choices[0].delta.content:
                  data = json.dumps({"content": chunk.choices[0].delta.content})
                  yield f"data: {data}\n\n"
          yield "data: [DONE]\n\n"

      return StreamingResponse(generate(), media_type="text/event-stream")


  @router.post("/grade", response_model=ExerciseGradeResponse)
  @limiter.limit(
      f"{settings.CHAT_FREE_DAILY_LIMIT}/day",
      exempt_when=_is_authenticated,
  )
  async def grade_exercise(
      request: Request,
      body: ExerciseGradeRequest,
      user: OptionalUser = None,
  ) -> ExerciseGradeResponse:
      """Grade a free-form toki pona exercise using the LLM."""
      # Stash user on request.state so _is_authenticated can read it
      request.state.user = user
      client = get_llm_client()
      system = build_grade_system_prompt(body.known_words)

      user_msg = (
          f"Exercise type: {body.exercise_type}\n"
          f"Prompt: {body.prompt}\n"
          f"User's answer: {body.user_answer}"
      )

      response = client.chat.completions.create(
          model=settings.MODEL,
          messages=[
              {"role": "system", "content": system},
              {"role": "user", "content": user_msg},
          ],
          max_tokens=300,
      )

      try:
          result = json.loads(response.choices[0].message.content)
          return ExerciseGradeResponse(**result)
      except (json.JSONDecodeError, KeyError, TypeError, ValueError):
          logger.exception("Failed to parse LLM grading response")
          return ExerciseGradeResponse(
              correct=False,
              score=0.0,
              feedback="I couldn't grade this — please try rephrasing your answer.",
              suggested_answer=None,
          )
  ```

- [ ] **Step 5: Register the chat router in `backend/app/api/main.py`.**

  Add the import and include:

  ```python
  from app.api.routes import items, login, private, users, utils, chat
  ```

  And add the router inclusion after the existing ones:
  ```python
  api_router.include_router(chat.router)
  ```

  The full file becomes:
  ```python
  from fastapi import APIRouter

  from app.api.routes import chat, items, login, private, users, utils
  from app.core.config import settings

  api_router = APIRouter()
  api_router.include_router(login.router)
  api_router.include_router(users.router)
  api_router.include_router(utils.router)
  api_router.include_router(items.router)
  api_router.include_router(chat.router)


  if settings.ENVIRONMENT == "local":
      api_router.include_router(private.router)
  ```

- [ ] **Step 6: Verify tests pass (Green).**

  ```bash
  cd backend && uv run pytest tests/api/test_chat.py -v
  ```

  Expected: all tests pass. The rate limit test may need adjusting if `limiter.reset()` is not available — in that case, use a fresh `TestClient` or set `CHAT_FREE_DAILY_LIMIT` to a small number in the test.

  **Troubleshooting the rate limit test:** If `limiter.reset()` does not exist in slowapi, replace the rate limit test with this approach using a custom `app` override:

  ```python
  @patch("app.api.routes.chat.get_llm_client")
  def test_rate_limit_exceeded_returns_429(
      self, mock_get_client: MagicMock,
  ) -> None:
      """Use a fresh TestClient so rate limit state is clean."""
      from app.main import app
      # Override the daily limit to 2 for testing
      original_limit = settings.CHAT_FREE_DAILY_LIMIT
      settings.CHAT_FREE_DAILY_LIMIT = 2

      mock_client = MagicMock()
      mock_client.chat.completions.create.return_value = _make_mock_stream(["ok"])
      mock_get_client.return_value = mock_client

      try:
          with TestClient(app) as test_client:
              body = _chat_request_body()
              for _ in range(2):
                  resp = test_client.post(
                      f"{settings.API_V1_STR}/chat/stream", json=body
                  )
                  assert resp.status_code == 200

              resp = test_client.post(
                  f"{settings.API_V1_STR}/chat/stream", json=body
              )
              assert resp.status_code == 429
      finally:
          settings.CHAT_FREE_DAILY_LIMIT = original_limit
  ```

  Use whichever approach works. The key is that the rate limit test actually verifies a 429.

- [ ] **Step 7: Run the full test suite to ensure nothing is broken.**

  ```bash
  cd backend && uv run pytest -v 2>&1 | tail -30
  ```

  Expected: all existing tests still pass, plus the new chat and LLM service tests.

- [ ] **Step 8: Commit.**

  ```
  feat: add chat streaming and grading endpoints with rate limiting (Phase 3.6)
  ```

- [ ] **Step 9:** Record learnings to `.claude/learnings-chat-router.md` using the surfacing-subagent-learnings skill.

---

## Task 7: Final verification and cleanup

**Files:** (no new files)

**Steps:**

- [ ] **Step 1: Run all tests with coverage.**

  ```bash
  cd backend && uv run pytest --tb=short -q 2>&1 | tail -20
  ```

  Expected: all tests pass.

- [ ] **Step 2: Run linter.**

  ```bash
  cd backend && uv run ruff check app/ tests/ --fix
  ```

  Expected: no errors (or only auto-fixable ones).

- [ ] **Step 3: Run type checker.**

  ```bash
  cd backend && uv run mypy app/ --ignore-missing-imports
  ```

  Expected: no errors related to the new code.

- [ ] **Step 4: Manual smoke test — verify the OpenAPI docs show the new endpoints.**

  ```bash
  cd backend && uv run python -c "
  from app.main import app
  routes = [r.path for r in app.routes]
  assert '/api/v1/chat/stream' in routes, f'Missing /chat/stream in {routes}'
  assert '/api/v1/chat/grade' in routes, f'Missing /chat/grade in {routes}'
  print('Both endpoints registered OK')
  "
  ```

  Expected: prints `Both endpoints registered OK`.

- [ ] **Step 5: Commit any lint/type fixes if needed.**

  ```
  chore: lint and type-check fixes for Phase 3
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-phase3-final.md` using the surfacing-subagent-learnings skill.

---

## Task 8: Curate learnings into CLAUDE.md

**Goal:** Improve CLAUDE.md files with all learnings captured during this phase.

- [ ] **Step 1:** Glob `.claude/learnings-*.md` and collect all scratch files written during this phase.
- [ ] **Step 2:** For each scratch file, dispatch a subagent with the `claude-md-improver` skill, providing the scratch file path in the prompt.
- [ ] **Step 3:** Verify all scratch files have been deleted after processing.

---

## Summary of files created/modified

| Action | Path |
|--------|------|
| MODIFY | `backend/pyproject.toml` |
| MODIFY | `backend/app/core/config.py` |
| MODIFY | `.env` |
| MODIFY | `.env.example` |
| CREATE | `backend/app/services/__init__.py` |
| CREATE | `backend/app/services/llm.py` |
| CREATE | `backend/app/schemas/__init__.py` |
| CREATE | `backend/app/schemas/chat.py` |
| MODIFY | `backend/app/api/deps.py` |
| CREATE | `backend/app/core/rate_limit.py` |
| MODIFY | `backend/app/main.py` |
| CREATE | `backend/app/api/routes/chat.py` |
| MODIFY | `backend/app/api/main.py` |
| CREATE | `backend/tests/services/__init__.py` |
| CREATE | `backend/tests/services/test_llm.py` |
| CREATE | `backend/tests/api/test_chat.py` |

## Exit criteria

- `POST /api/v1/chat/stream` returns SSE chunks with mock LLM
- `POST /api/v1/chat/grade` returns valid JSON response
- Rate limiting works (429 after limit exceeded for anonymous users)
- Authenticated users are exempt from rate limiting (verified by test)
- Authenticated users get higher max_tokens (1500 vs CHAT_FREE_MAX_TOKENS)
- All tests pass
- Linter and type checker clean
