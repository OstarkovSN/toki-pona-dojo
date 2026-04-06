# Test Gap Audit Report

**Project**: toki-pona-dojo (React 19 + FastAPI + PostgreSQL)
**Date**: 2026-04-06
**Scope**: Full backend (Python/FastAPI) and frontend (React/Playwright E2E) test coverage analysis

## Executive Summary

- **Total Backend Source Files Audited**: 21 files (routes, services, core, models)
- **Backend Files with Critical Gaps**: 8 files
- **Backend Files with Partial Gaps**: 6 files
- **Total Frontend Routes/Components**: 50+ components and routes
- **Frontend Files with Critical E2E Gaps**: 12 areas
- **Frontend Files with Partial E2E Gaps**: 8 areas
- **Overall Test Coverage**: ~75% backend, ~65% frontend

---

## BACKEND GAPS

### Critical (No Tests At All)

#### 1. Config Endpoint (`app/api/routes/config.py`)

**Status**: UNTESTED

- `GET /config/` — response model structure validation
- Verify response contains expected fields (API_V1_STR, PROJECT_NAME, etc.)
- Behavior when TG_BOT_TOKEN is set vs unset

#### 2. Utils Endpoint (`app/api/routes/utils.py`)

**Status**: PARTIALLY TESTED

- `POST /utils/test-email/` — with `email_to` query parameter
- `POST /utils/test-email/` — when email sending fails
- `POST /utils/test-email/` — when email sending succeeds (mock smtp)

#### 3. Security & Password Hashing (`app/core/security.py`)

**Status**: INDIRECTLY TESTED ONLY

- `verify_password()` — Argon2 hash direct test
- `verify_password()` — legacy bcrypt hash upgrade path
- `create_access_token()` — expiration time set correctly
- `verify_token()` — invalid/expired token rejection
- `get_password_hash()` — produces valid Argon2 output

### Important (Partial Coverage)

#### 4. Lessons Route (`app/api/routes/lessons.py`)

**Status**: PARTIALLY TESTED

- Exercise count capping at MAX_EXERCISES=7 when builders return >7
- Malformed unscramble entries being skipped gracefully
- When unit has no exercises (empty list returned)
- When words.json is incomplete or missing definitions
- When exercise builders return empty lists
- Exercise `type` field matches expected enum values

#### 5. LLM Service (`app/services/llm.py`)

**Status**: PARTIALLY TESTED

- `build_chat_system_prompt()` with invalid `mode` parameter
- `build_chat_system_prompt()` with null/empty known_words
- `build_chat_system_prompt()` with recent_errors containing invalid word references
- `build_grade_system_prompt()` with empty known_words list
- `get_llm_client()` error path when OPENAI_API_KEY is missing
- Langfuse tracing integration testing (observability path)

#### 6. Authentication Dependencies (`app/api/deps.py`)

**Status**: TEST FILE EXISTS but gaps remain

- `get_optional_current_user()` — when token is invalid, returns None correctly
- `get_optional_current_user()` — when token is expired
- `get_current_active_superuser()` — non-superuser receives 403
- `SessionDep` — database session lifecycle and cleanup

#### 7. Rate Limiting (`app/core/rate_limit.py`)

**Status**: TESTED INDIRECTLY via chat tests

- Exempt_when callback with None task_id edge case
- Per-IP rate limiting verification
- Rate limit headers in response
- Rate limiter storage reset between tests (intermittent failures possible)

#### 8. Data Loading (`app/data/loader.py`)

**Status**: PARTIALLY TESTED

- `get_word()` — non-existent word returns None
- `get_word()` — word with no definitions
- `get_exercises_by_words()` — empty word list
- `get_exercises_by_words()` — word not found in data
- `_load_json()` — malformed JSON file handling

### Edge Cases & Error Paths

#### 9. User Signup with Invite Tokens (`app/api/routes/users.py`)

**Status**: PARTIALLY TESTED

- Token `used_at` timestamp is set correctly
- Token `used_by` is linked to new user.id
- Multiple signup attempts with same token rejects second attempt
- Missing token (TG_BOT_TOKEN set) returns 400
- Token validation is case-sensitive

#### 10. Initial Data Seeding (`app/initial_data.py`)

**Status**: TEST FILE EXISTS but verify

- Idempotency: running initialization twice produces same state
- Database constraint violations on duplicate inserts
- Email sending during initialization (mocked vs real)

---

## FRONTEND GAPS

### Critical (No E2E Tests)

#### 1. Grammar Routes — Partial Coverage

**Files**:
- `frontend/src/routes/_layout/grammar/particles.tsx`
- `frontend/src/routes/_layout/grammar/modifiers.tsx`

- `/grammar/particles` route not explicitly tested
- `/grammar/modifiers` route not explicitly tested
- Navigation between grammar sections
- Grammar chain complex interactions

#### 2. Dictionary Word Detail Route

**File**: `frontend/src/routes/_layout/dictionary/$word.tsx`

- Navigate to `/dictionary/toki` — page loads word details
- Word detail layout and content display
- Related words navigation
- Error state when word not found (404 handling)
- Mobile word detail layout

### Important (Partial Coverage)

#### 3. Dark Mode Transitions

**Test File**: `frontend/tests/dark-mode.spec.ts` (exists but incomplete)

- Chat messages in dark mode: background colors (user bubble vs bot bubble)
- Exercise feedback text in dark mode: readability
- Grammar chain visualization in dark mode: text/line colors
- Error banners in dark mode: background + text contrast
- Skill tree nodes in dark mode: completion states visible
- Dictionary cards in dark mode: POS badge colors

#### 4. Loading & Skeleton States

**Test File**: `frontend/tests/loading-states.spec.ts` (exists but incomplete)

- Dictionary page skeleton: appears while fetching words, disappears on load
- Grammar page skeleton
- Skill tree skeleton: appears while syncing from server
- Progress sync loading: visible while merging localStorage to server
- Chat grading spinner: appears during LLM grading, disappears on response

#### 5. Chat System — BYOM Mode

**Test Files**: `frontend/tests/chat.spec.ts`, `frontend/tests/byom-settings.spec.ts`

- Entering OpenAI API key in settings activates BYOM mode
- Chat uses BYOM instead of server proxy when configured
- API key not sent to server
- Fallback to server if BYOM fails
- BYOM error handling: CORS failures, connection refused

#### 6. Chat Context Routing

- On `/dictionary/toki`: "learner looking at word 'toki'" hint sent
- On `/grammar/particles`: "learner reading about particles" hint
- On `/learn/1/2`: "learner on unit 1 lesson 2" hint
- Hint changes when navigating between pages

#### 7. Mobile-Specific Chat Panel (375px viewport)

- Floating action button appears at bottom-right
- Clicking button opens bottom Sheet
- Sheet content scrollable
- Close button / swipe to dismiss
- Message input stays visible with keyboard

#### 8. Lesson Interaction Details

- ExerciseMatch: selecting wrong pair twice in a row
- ExerciseMatch: all pairs matched correctly (completion)
- ExerciseFreeCompose: hint button behavior
- ExerciseFreeCompose: multiple submission attempts
- Lesson transition: moving from lesson 1 to lesson 2
- Lesson completion screen: "Finish Lesson" flow

#### 9. Progress Tracking & SRS

- SRS schedule persistence (interval/ease/due date saved per word)
- SRS data merged on sync (keep highest reps, no overwrite)
- Streak increments on daily activity; resets after 1+ day gap
- Streak visible in home page stats
- Recent errors tracked per word

#### 10. Authentication Persistence

- Page reload after login: user remains logged in
- Navigation with token expiration: redirect to login
- Login in tab 1 visible in tab 2 (localStorage shared)

#### 11. Admin Panel

- User table sorting and pagination
- Edit user email/status actions
- Delete user confirmation dialog
- Add user dialog form validation

#### 12. Error Recovery

- API timeout: graceful error message, no infinite spinner
- Network disconnect mid-lesson: error banner, no data loss
- API 503: specific message for grading endpoint
- Malformed API response: fallback UI, no crash
- Failed lesson sync: retry button available

---

## SUMMARY BY SEVERITY

### Backend: Critical Gaps

1. **Config endpoint** — untested
2. **Utils test-email endpoint** — untested
3. **Security.py direct tests** — only indirectly tested
4. **LLM service edge cases** — invalid modes, empty parameters
5. **Dictionary edge cases** — search, POS filter, 404

### Frontend: Critical Gaps

1. **Grammar routes (particles, modifiers)** — not explicitly E2E tested
2. **Dictionary word detail route** — not tested
3. **Chat BYOM mode** — entire flow untested
4. **Mobile chat panel** — floating button and Sheet interactions

### Backend: Important Gaps

6. Exercise cap-at-7 edge case
7. Malformed exercise entry handling
8. Auth dependency coverage
9. Password hashing direct tests
10. Rate limit edge cases

### Frontend: Important Gaps

5. Lesson interaction details (match, story progression)
6. Dark mode color coverage
7. Loading skeleton states
8. Progress SRS persistence
9. Admin user table actions
10. Error recovery flows

---

## Notes for Test Authors

1. **Backend Session Management**: Clean up UserProgress before User in fixtures (FK constraint)
2. **Backend Telegram**: Mock httpx.AsyncClient for Telegram API calls; use `monkeypatch` for settings
3. **Frontend Mobile**: Use `page.setViewportSize({ width: 375, height: 667 })` for mobile tests
4. **Frontend Async**: Await `page.waitForURL()` and `page.waitForResponse()` to synchronize with backend
5. **Frontend Dark Mode**: Check `document.documentElement.classList.contains("dark")` or query CSS variable values
6. **Rate limiter isolation**: Call `limiter._storage.reset()` in autouse fixture for rate-limit tests
