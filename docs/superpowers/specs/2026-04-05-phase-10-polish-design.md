# Phase 10: Polish

> Mobile responsiveness, dark mode verification, loading/error states, Telegram invite-only access gateway, final test pass.

---

## Goal

The app is production-ready: responsive on mobile, works in dark mode, handles loading/error states gracefully, and passes all tests.

## Prerequisites

- All previous phases (1-9) complete

## Steps

### 10.1 Mobile responsive layout

**Breakpoint:** 768px

**Desktop (>= 768px):**
- Two-panel layout: content (60%) + chat (40%)
- Top nav bar with all links visible

**Mobile (< 768px):**
- Content takes full width
- Chat becomes a bottom tab/floating button:
  - Floating "jan sona" button in bottom-right corner
  - Tap → chat slides up as a bottom sheet (80vh height)
  - Swipe down or tap overlay to dismiss
- Top nav: hamburger menu or compact pill selector
- Skill tree: nodes stack vertically (no branching layout)
- Exercise components: full-width, larger touch targets
- Dictionary: search bar sticky at top, word cards full-width

**Implementation:**
- Use Tailwind responsive prefixes (`md:`, `lg:`)
- Use the existing `useMobile()` hook from the template
- Chat bottom sheet: use shadcn Sheet component (already in the template)

### 10.2 Dark mode verification

The template has a theme provider (`components/theme-provider.tsx`) with light/dark/system modes. Verify:

- All custom CSS variables have dark mode equivalents (defined in Phase 5)
- Earth-tone palette inverts correctly
- Teal/coral/amber semantic colors have appropriate dark variants
- Exercise components: correct/wrong feedback colors are visible in both modes
- Chat panel: message bubbles contrast correctly
- Dictionary: word cards, badges, and search bar work in dark mode
- Grammar: chain visualizer colors and callout boxes work in dark mode
- Skill tree: node states (locked/available/current/completed) are distinguishable

Fix any contrast issues found.

### 10.3 Loading states

Add loading states (using shadcn Skeleton) to:

- Skill tree: skeleton nodes while fetching unit data
- Lesson view: skeleton exercise while fetching lesson data
- Dictionary: skeleton word cards while searching
- Grammar: skeleton sections while loading
- Chat: "typing..." indicator while streaming
- LLM-graded exercises: spinner/skeleton while waiting for grade response

### 10.4 Error states

Add error handling for:

- API unreachable: show a banner "unable to connect to server" with retry button
- LLM unavailable: chat shows "jan sona is resting — try again later"
- LLM grade timeout: exercise shows "couldn't grade — check your answer manually" with the suggested answer
- BYOM connection failure: clear error message with link to settings
- Rate limit exceeded: "you've used your daily messages — request access via our Telegram bot for unlimited use, or add your own API key"
- Network offline: show offline banner, exercises with local-only grading still work

### 10.5 Telegram bot — invite-only access gateway

The app is invite-only. New users must request access through a Telegram bot. The bot notifies the superuser (app owner), who approves or rejects each request. Approved users receive a one-time invite token they use to sign up.

This section is **required** when `TG_BOT_TOKEN` is set in `.env`.

#### 10.5.1 Environment variables

| Variable | Type in Settings | Description |
|----------|-----------------|-------------|
| `TG_BOT_TOKEN` | `str \| None = None` | Telegram Bot API token (from @BotFather). **Already exists from Phase 3 config** — no new addition needed. |
| `TG_SUPERUSER_ID` | `int` | Telegram user ID of the app owner who approves/rejects requests. **Must be typed as `int`** in the Settings class — Telegram API returns user IDs as integers, so comparisons must use `int`. This is the only new env var for this phase. |
| `TG_BOT_USERNAME` | `str \| None = None` | Bot username (without `@`). Used by the frontend to render Telegram links. Exposed via `GET /api/v1/config/public`. |

Note: Use `FRONTEND_HOST` from the existing template config (not a new `APP_URL` variable) to construct the signup link sent to users.

Both `TG_BOT_TOKEN` and `TG_SUPERUSER_ID` must be set for the bot to start. If either is missing, the bot does not initialize and signup remains closed (no invite tokens can be generated).

#### 10.5.2 Data model

**Table `access_requests`:**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `int` | PK, auto-increment |
| `telegram_user_id` | `int` | not null, indexed |
| `telegram_username` | `str \| None` | nullable — `@username` if available |
| `telegram_first_name` | `str` | not null |
| `status` | `str` | not null, one of `pending`, `approved`, `rejected` |
| `created_at` | `datetime` | not null, server default `utcnow` |
| `decided_at` | `datetime \| None` | nullable — set when superuser approves/rejects |

This replaces the in-memory dict for pending requests. Provides persistence across restarts and enables duplicate-request tracking.

**Table `invite_tokens`:**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `int` | PK, auto-increment |
| `token` | `str` | unique, indexed, 32-char hex (`secrets.token_hex(16)`) |
| `access_request_id` | `int` | FK → `access_requests.id`, not null |
| `created_at` | `datetime` | not null, server default `utcnow` |
| `expires_at` | `datetime` | not null, default `created_at + 7 days` |
| `used_at` | `datetime \| None` | nullable — set when token is consumed |
| `used_by` | `int \| None` | FK → `users.id`, nullable — set when token is consumed |

Both the `validate-token` endpoint and the signup endpoint must reject tokens where `expires_at < utcnow()`.

SQLAlchemy models (`AccessRequest`, `InviteToken`) in `backend/app/models.py`. Alembic migration required.

#### 10.5.3 Bot message flow

```
User                        Bot                         Superuser
 │                           │                              │
 │── /start ────────────────>│                              │
 │                           │── "X Y @username wants      │
 │                           │    access" + [Approve][Reject]──>│
 │                           │                              │
 │                           │<── callback: approve ────────│
 │<── "You're approved!      │                              │
 │     Token: <token>        │                              │
 │     Go to /signup?token=…"│                              │
 │                           │                              │
 │  (or if rejected)         │                              │
 │<── "Sorry, your request   │                              │
 │     was not approved."    │                              │
```

Detailed steps:

1. **User sends `/start`** to the bot.
2. Bot extracts `first_name`, `last_name`, and `username` from the Telegram `Message.from_user` object.
3. Bot checks the `access_requests` table for existing requests from this `telegram_user_id`:
   - **Has a pending request** → respond: "Your request is pending approval." (do not create a duplicate).
   - **Was rejected** → allow re-request, but rate-limit to once per 24 hours (check `decided_at`). If too soon, respond: "You can re-request access after 24 hours."
   - **Was approved and has an unused, non-expired token** → resend the existing token and signup link.
   - **Was approved and the token was already used** → respond: "You already have an account! Log in at {FRONTEND_HOST}"
   - **No prior request** → proceed to step 4.
4. Bot creates an `AccessRequest` record with `status=pending` and sends a message to `TG_SUPERUSER_ID` with text: `"{first_name} {last_name} @{username} wants to access the app"` (omit missing fields gracefully). The message includes an inline keyboard with two buttons:
   - `[Approve]` — callback data: `approve:{access_request_id}`
   - `[Reject]` — callback data: `reject:{access_request_id}`
5. **Superuser taps Approve:**
   - Bot updates the `AccessRequest` to `status=approved, decided_at=utcnow()`.
   - Bot generates an `InviteToken` record linked to the `AccessRequest`.
   - Bot sends the requesting user: `"You're approved! Use this token to create your account: <token>\n\nGo to {FRONTEND_HOST}/signup?token=<token>"`
   - Bot edits the superuser's message to: `"Approved: {first_name} {last_name} @{username}"` using `edit_message_text` with `reply_markup=None` (removes inline keyboard).
6. **Superuser taps Reject:**
   - Bot updates the `AccessRequest` to `status=rejected, decided_at=utcnow()`.
   - Bot sends the requesting user: `"Sorry, your request was not approved."`
   - Bot edits the superuser's message to: `"Rejected: {first_name} {last_name} @{username}"` using `edit_message_text` with `reply_markup=None` (removes inline keyboard).

#### Interaction with anonymous access

Anonymous users can still use the app freely: exercises, dictionary, grammar, and rate-limited chat (per Phase 3/8 architecture). The invite gate **only controls account creation**. Creating an account unlocks:
- Unlimited LLM access (no rate limits)
- Server-synced progress
- Streak tracking

This is consistent with Phase 8's anonymous `localStorage` architecture and Phase 3's anonymous rate limiting. The signup page requires a valid invite token; without one it shows an invite-only message. But the app itself remains publicly accessible for browsing and limited use.

#### 10.5.4 Architecture

**`backend/app/services/telegram.py`** — Bot service:
- Uses `httpx.AsyncClient` for Telegram Bot API calls (no heavy framework dependency).
- Functions: `start_bot()`, `handle_update(update: dict)`, `send_message(chat_id, text, reply_markup=None)`, `edit_message_text(chat_id, message_id, text, reply_markup=None)`, `answer_callback_query(callback_query_id)`.
- `edit_message_text` with `reply_markup=None` both updates the text and removes the inline keyboard in a single call.
- `start_bot()` sets the webhook URL via `setWebhook` on app startup (FastAPI lifespan event), including the `secret_token` parameter. Deletes webhook on shutdown.

**`backend/app/api/routes/telegram.py`** — Webhook endpoint:
- `POST /api/v1/telegram/webhook` — receives updates from Telegram, delegates to `handle_update()`.
- **Webhook security is mandatory:** Use Telegram's `secret_token` parameter in `setWebhook` and validate the `X-Telegram-Bot-Api-Secret-Token` header on every incoming request. Reject requests with missing or mismatched tokens with `403`.

**`backend/app/api/routes/auth.py`** — Signup modifications:
- The `UserRegister` schema gains an `invite_token: str` field in the request body.
- On signup: look up the token in `invite_tokens`, verify it exists, `used_at` is null, and `expires_at > utcnow()`.
- If valid: create the user and set `used_at = utcnow()` and `used_by = new_user.id` on the token. **User creation and token consumption must happen in a single DB transaction** to prevent race conditions.
- If invalid, already used, or expired: return `400` with `{"detail": "Invalid or expired invite token."}`.
- If `TG_BOT_TOKEN` is not set: skip token validation entirely (open signup for dev/testing).

#### 10.5.5 API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/telegram/webhook` | `X-Telegram-Bot-Api-Secret-Token` header | Receives bot updates |
| `POST` | `/api/v1/auth/signup` | None | Modified — now requires `invite_token` in request body |
| `GET` | `/api/v1/auth/validate-token?token=<token>` | None | Returns `{"valid": true/false}` — used by frontend to show/hide signup form. **Rate limited: 5 req/min per IP.** Also rejects expired tokens. |
| `GET` | `/api/v1/config/public` | None | Returns public config including `bot_username` for frontend Telegram links |

#### 10.5.6 Frontend changes to signup page

**`frontend/src/routes/signup.tsx`:**

1. On mount, read `token` from URL query params (`/signup?token=<token>`).
2. If token is present: call `GET /api/v1/auth/validate-token?token=<token>`.
   - If valid: show the normal signup form with the token pre-filled (hidden field).
   - If invalid: show "This invite token is invalid or has already been used."
3. If no token in URL: show a gated message:
   - Heading: "This app is invite-only"
   - Body: "Request access via our Telegram bot: @<bot_username>"
   - Link to `https://t.me/<bot_username>` (bot username fetched from `GET /api/v1/config/public`).
4. On form submit: include `invite_token` in the signup payload.

The **login page** should also include a small hint: "Don't have an account? Request access via our Telegram bot @<bot_username>" with a link to `https://t.me/<bot_username>`.

#### 10.5.7 Risks specific to this section

- **Webhook URL must be publicly accessible.** For local dev, use ngrok or similar. For production, the webhook is set automatically on startup.
- **Race condition:** superuser could tap Approve twice quickly. Mitigate by checking if a token already exists for that `access_request_id` before creating a new one.
- **Telegram user ID spoofing** is not a concern because the bot receives user IDs directly from Telegram's servers via the webhook, which is protected by the mandatory `secret_token` validation.

### 10.6 Final test pass

**Backend tests:**
- All existing tests pass
- Add integration test: full lesson flow (fetch units → fetch lesson → complete exercises → check progress updated)
- Add integration test: invite flow (create token → signup with token → verify token consumed → attempt reuse fails)
- Add unit tests for `services/telegram.py`: mock Telegram API calls, test `/start` handling, test approve/reject callback handling
- Add unit test: signup without token returns 400 (when `TG_BOT_TOKEN` is set)
- Add unit test: signup with invalid/used token returns 400
- Add unit test: `GET /api/v1/auth/validate-token` returns correct status for valid, invalid, and used tokens
- Run data validation: `python backend/scripts/validate_data.py`

**Frontend E2E tests (Playwright):**
- Skill tree renders with correct unit states
- Clicking a unit navigates to lesson view
- Completing exercises advances progress bar
- Dictionary search returns results
- Chat panel opens and receives messages
- BYOM settings persist in localStorage
- Dark mode toggle works
- Mobile layout: chat sheet opens/closes
- Signup page without token shows invite-only message with bot link
- Signup page with valid token shows signup form
- Signup page with invalid token shows error message
- Successful signup with valid token redirects to app

**Manual verification:**
- Complete unit 1 as an anonymous user
- Send `/start` to the Telegram bot, verify superuser receives approval request
- Tap Approve, verify token is sent back to user
- Sign up using the invite token, verify account is created and progress merges
- Attempt to reuse the same token — verify signup is rejected
- Check LangFuse for traces
- Test CrowdSec blocking
- Verify mobile on actual device or DevTools

## Files touched

| Action | Path |
|--------|------|
| ADD | `backend/app/services/telegram.py` — bot service (webhook handling, message sending, approval flow) |
| ADD | `backend/app/api/routes/telegram.py` — webhook endpoint |
| ADD | `backend/alembic/versions/xxxx_add_access_requests_and_invite_tokens.py` — migration for `access_requests` and `invite_tokens` tables |
| ADD | `backend/tests/test_telegram.py` — unit tests for bot service |
| ADD | `backend/tests/test_invite_flow.py` — integration tests for invite token signup |
| ADD | E2E test files (Playwright) |
| MODIFY | `backend/app/models.py` — add `AccessRequest` and `InviteToken` models |
| MODIFY | `backend/app/core/config.py` — add `TG_SUPERUSER_ID: int` and `TG_BOT_USERNAME: str | None` settings (`TG_BOT_TOKEN` already exists from Phase 3) |
| MODIFY | `backend/app/api/routes/config.py` (or add) — `GET /api/v1/config/public` endpoint exposing `bot_username` |
| MODIFY | `backend/app/api/routes/auth.py` — require invite token on signup, add `validate-token` endpoint |
| MODIFY | `backend/app/main.py` — register telegram webhook route, call `start_bot()` in lifespan |
| MODIFY | `frontend/src/routes/signup.tsx` — invite-only gate, token validation, token field in form |
| MODIFY | `frontend/src/routes/login.tsx` — add hint about requesting access via Telegram bot |
| MODIFY | `frontend/src/routes/_layout.tsx` (mobile responsive) |
| MODIFY | `frontend/src/components/ChatPanel.tsx` (bottom sheet on mobile) |
| MODIFY | `frontend/src/components/SkillTree.tsx` (mobile layout) |
| MODIFY | Various components (loading/error states) |
| MODIFY | `frontend/src/index.css` (dark mode fixes if needed) |
| MODIFY | `.env.example` — add `TG_SUPERUSER_ID` and `TG_BOT_USERNAME` placeholders (`TG_BOT_TOKEN` already present from Phase 3) |

## Risks

- Mobile bottom sheet for chat may conflict with exercise interactions (especially word bank drag). Test touch interactions carefully.
- Telegram webhook requires a publicly accessible URL. For local dev, use ngrok or similar. For production, the webhook URL is set automatically on app startup via `setWebhook`.
- E2E tests with Playwright need the full stack running. Consider using `docker compose` in CI or mocking the backend.
- Invite-only signup is enforced only when `TG_BOT_TOKEN` is set. In dev environments without it, signup is open. This must be clearly documented to avoid accidentally deploying without the gate.

## Exit criteria

- Mobile layout works on 375px width (iPhone SE) and 768px (tablet)
- Dark mode has no contrast issues
- All loading states show skeletons (no blank screens)
- All error states show helpful messages
- Telegram bot responds to `/start` and sends approval request to superuser
- Approve/Reject buttons work and deliver the correct message to the requesting user
- Invite token is generated on approval and stored in `invite_tokens` table
- Expired tokens (older than 7 days) are rejected by both `validate-token` and signup endpoints
- Signup with a valid token succeeds; signup with an invalid/used/expired token fails with 400
- User creation and token consumption happen in a single DB transaction
- Signup page without token shows invite-only message with link to Telegram bot
- Login page shows hint about requesting access via Telegram bot
- `GET /api/v1/auth/validate-token` correctly reports token validity (rate limited to 5 req/min per IP)
- Duplicate `/start`: pending request gets "pending" message, rejected user can re-request after 24h, approved user with valid token gets token resent, user with used token gets "already have an account" message
- Access requests are persisted in `access_requests` table (survive bot restarts)
- Webhook validates `X-Telegram-Bot-Api-Secret-Token` header on all incoming requests
- Backend tests pass (including invite flow and telegram service tests)
- E2E tests pass (including signup gate scenarios)
- Data validation passes
- LangFuse traces appear for all LLM calls
- CrowdSec blocks test IPs
