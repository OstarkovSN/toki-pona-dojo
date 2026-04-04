# Phase 3: LLM Integration

> Add the LLM service, chat streaming endpoint, exercise grading endpoint, and rate limiting. Prepare LangFuse config fields (wired in Phase 4).

---

## Goal

A working `/chat/stream` SSE endpoint and `/chat/grade` JSON endpoint, both using the OpenAI-compatible LLM configured via `.env`. Anonymous users are rate-limited. LangFuse config fields exist in Settings but are not yet wired to tracing.

## Prerequisites

- Phase 2 complete (data layer with units/words available for system prompt construction)

## Architecture

```
Browser → POST /api/v1/chat/stream → FastAPI → OpenAI-compat client → LLM provider
                                         ↓
                                    SSE stream back
                                    
Browser → POST /api/v1/chat/grade → FastAPI → OpenAI-compat client → LLM provider
                                         ↓
                                    JSON response
```

Both endpoints accept optional auth. Anonymous users hit rate limits; authenticated users do not. Users with their own API key (BYOM) call the provider directly from the browser and never hit these endpoints.

## Steps

### 3.1 Config additions — `backend/app/core/config.py`

Add to the `Settings` class:

```python
# LLM provider (OpenAI-compatible)
OPENAI_BASE_URL: str = "https://api.openai.com/v1"
OPENAI_API_TOKEN: str = "changethis"
MODEL: str = "gpt-4o-mini"

# LLM rate limiting (anonymous users)
CHAT_FREE_DAILY_LIMIT: int = 20
CHAT_FREE_MAX_TOKENS: int = 500

# Telegram bot (optional)
TG_BOT_TOKEN: str | None = None

# LangFuse observability (wired in Phase 4)
LANGFUSE_PUBLIC_KEY: str = ""
LANGFUSE_SECRET_KEY: str = ""
LANGFUSE_HOST: str = "http://langfuse-server:3000"
```

Add corresponding entries to `.env` and `.env.example`.

### 3.2 LLM service — `backend/app/services/llm.py`

**Client factory:**
```python
def get_llm_client() -> OpenAI:
    return OpenAI(base_url=settings.OPENAI_BASE_URL, api_key=settings.OPENAI_API_TOKEN)
```

**System prompts:**
- `SYSTEM_PROMPT_CHAT` — jan sona tutor persona. Takes `{unit}`, `{words}`, `{errors}`, `{mode}` placeholders.
- `SYSTEM_PROMPT_GRADE` — grading assistant. Takes `{words}` placeholder. Returns structured JSON.

**Prompt builders:**
- `build_chat_system_prompt(mode, known_words, current_unit, recent_errors) -> str`
- `build_grade_system_prompt(known_words) -> str`

See global_plan.md section 4.4 for exact prompt text.

### 3.3 Chat schemas — `backend/app/models.py` (or separate file)

Add Pydantic models for request/response:

- `ChatMessage(role, content)`
- `ChatRequest(messages, mode, known_words, current_unit, recent_errors)`
- `ChatResponse(content)`
- `ExerciseGradeRequest(exercise_type, prompt, user_answer, known_words)`
- `ExerciseGradeResponse(correct, score, feedback, suggested_answer)`

These are Pydantic `BaseModel` (not SQLModel table models). Can live in `backend/app/models.py` or a separate `backend/app/schemas/chat.py` — follow the template's existing pattern.

### 3.4 Optional auth dependency

The template has `CurrentUser` dependency. We need an `OptionalUser` that returns `None` for unauthenticated requests instead of raising 401.

Check if the template already provides this. If not, add to `backend/app/api/deps.py`:
```python
async def get_optional_current_user(...) -> User | None:
    # Same as get_current_user but returns None on missing/invalid token
    ...

OptionalUser = Annotated[User | None, Depends(get_optional_current_user)]
```

### 3.5 Chat endpoint — `backend/app/api/routes/chat.py`

**`POST /api/v1/chat/stream`:**
- Accepts `ChatRequest` body
- Uses `OptionalUser` — works for both anon and authenticated
- Rate limited via `slowapi`: `CHAT_FREE_DAILY_LIMIT/day` for anonymous, no limit for authenticated
- Builds system prompt from request context (mode, known_words, current_unit, recent_errors)
- Calls OpenAI-compat client with `stream=True`
- Returns `StreamingResponse` with `text/event-stream` media type
- Each chunk: `data: {"content": "..."}\n\n`
- Final: `data: [DONE]\n\n`
- `max_tokens`: `CHAT_FREE_MAX_TOKENS` for anon, 1500 for authenticated

**`POST /api/v1/chat/grade`:**
- Accepts `ExerciseGradeRequest` body
- Same auth/rate-limiting as chat
- Calls LLM with grading system prompt
- Parses JSON response into `ExerciseGradeResponse`
- Fallback on parse failure: returns `correct=False, score=0.0` with helpful feedback message

### 3.6 Rate limiting setup

Install `slowapi` (add to backend dependencies).

In `backend/app/main.py`:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

The rate limit applies per-IP. Authenticated users bypass it (check in the endpoint, not in slowapi config — slowapi doesn't know about our auth).

**Implementation detail:** `slowapi`'s `@limiter.limit()` decorator always counts. To bypass for authenticated users, either:
- Use a custom `key_func` that returns a sentinel for authenticated users, or
- Apply the decorator conditionally, or
- Use `slowapi`'s `exempt_when` parameter

Recommend: custom `key_func` that returns `"authenticated:{user_id}"` for logged-in users with a very high limit, and the IP for anonymous.

### 3.7 Register router

Add `chat.router` to `backend/app/api/main.py`.

### 3.8 Tests

- `backend/app/tests/api/test_chat.py`:
  - Mock the OpenAI client (don't make real LLM calls in tests)
  - Test streaming response format (SSE chunks)
  - Test grade endpoint returns valid `ExerciseGradeResponse`
  - Test rate limiting: 21st request from same IP returns 429
  - Test authenticated user bypasses rate limit
- `backend/app/tests/services/test_llm.py`:
  - Test `build_chat_system_prompt` includes known words and mode
  - Test `build_grade_system_prompt` includes words
  - Test prompt handles empty known_words gracefully

## Files touched

| Action | Path |
|--------|------|
| ADD | `backend/app/services/llm.py` |
| ADD | `backend/app/api/routes/chat.py` |
| ADD | `backend/app/tests/api/test_chat.py` |
| ADD | `backend/app/tests/services/test_llm.py` |
| MODIFY | `backend/app/core/config.py` |
| MODIFY | `backend/app/models.py` (or add `schemas/chat.py`) |
| MODIFY | `backend/app/api/deps.py` |
| MODIFY | `backend/app/api/main.py` |
| MODIFY | `backend/app/main.py` |
| MODIFY | `.env` / `.env.example` |
| MODIFY | `backend/pyproject.toml` (add `slowapi`, `openai` deps) |

## Risks

- `slowapi` integrates with Starlette's `Request` object. The rate limit key function needs access to the request. Make sure the endpoint signature includes `request: Request` as the first argument.
- The OpenAI client `stream=True` returns an iterator. Make sure the `StreamingResponse` generator properly handles the iterator lifecycle (no dangling connections).
- Grade endpoint: LLM may return malformed JSON. The fallback handler must not crash.

## Exit criteria

- `POST /api/v1/chat/stream` returns SSE chunks with mock LLM
- `POST /api/v1/chat/grade` returns valid JSON response
- Rate limiting works (429 after limit exceeded)
- Authenticated users bypass rate limits
- All tests pass
