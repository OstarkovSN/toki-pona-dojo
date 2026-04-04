# Phase 10: Polish

> Mobile responsiveness, dark mode verification, loading/error states, Telegram bot, final test pass.

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
- Rate limit exceeded: "you've used your daily messages — sign up for unlimited access or add your own API key"
- Network offline: show offline banner, exercises with local-only grading still work

### 10.5 Telegram bot (optional)

Only implement if `TG_BOT_TOKEN` is set in `.env`.

**Backend — `backend/app/services/telegram.py`:**
```python
async def send_streak_reminder(chat_id: str, streak: int, words_known: int):
    if not settings.TG_BOT_TOKEN:
        return
    msg = f"o kama sona! Your streak is {streak} days. You know {words_known} words."
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{settings.TG_BOT_TOKEN}/sendMessage",
            json={"chat_id": chat_id, "text": msg},
        )
```

**User model addition:** Add optional `telegram_chat_id: str | None = None` to the User model. Migration needed.

**Webhook endpoint — `backend/app/api/routes/telegram.py`:**
- `POST /api/v1/telegram/webhook` — handles `/start` command
- User sends `/start <one-time-code>` to the bot
- Backend links the chat_id to the user account
- One-time code generated on the settings page

**Settings page addition:** "Connect Telegram" section with a generated code and instructions.

**Streak reminder scheduling:** Use a simple background task (e.g., FastAPI's `BackgroundTasks` or a separate worker) that runs daily and sends reminders to users with Telegram connected who haven't practiced today.

### 10.6 Final test pass

**Backend tests:**
- All existing tests pass
- Add integration test: full lesson flow (fetch units → fetch lesson → complete exercises → check progress updated)
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

**Manual verification:**
- Complete unit 1 as an anonymous user
- Sign up, verify progress merges
- Check LangFuse for traces
- Test CrowdSec blocking
- Verify mobile on actual device or DevTools

## Files touched

| Action | Path |
|--------|------|
| ADD | `backend/app/services/telegram.py` (if TG_BOT_TOKEN set) |
| ADD | `backend/app/api/routes/telegram.py` (if TG_BOT_TOKEN set) |
| ADD | E2E test files |
| MODIFY | `frontend/src/routes/_layout.tsx` (mobile responsive) |
| MODIFY | `frontend/src/components/ChatPanel.tsx` (bottom sheet on mobile) |
| MODIFY | `frontend/src/components/SkillTree.tsx` (mobile layout) |
| MODIFY | Various components (loading/error states) |
| MODIFY | `frontend/src/index.css` (dark mode fixes if needed) |
| MODIFY | `backend/app/models.py` (telegram_chat_id, if implementing) |

## Risks

- Mobile bottom sheet for chat may conflict with exercise interactions (especially word bank drag). Test touch interactions carefully.
- Telegram webhook requires a publicly accessible URL. For local dev, use ngrok or similar. For production, set up the webhook URL after deployment.
- E2E tests with Playwright need the full stack running. Consider using `docker compose` in CI or mocking the backend.

## Exit criteria

- Mobile layout works on 375px width (iPhone SE) and 768px (tablet)
- Dark mode has no contrast issues
- All loading states show skeletons (no blank screens)
- All error states show helpful messages
- Backend tests pass
- E2E tests pass
- Data validation passes
- LangFuse traces appear for all LLM calls
- CrowdSec blocks test IPs
