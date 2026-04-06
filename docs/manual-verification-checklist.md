# Phase 10: Manual Verification Checklist

## Anonymous User Flow
- [ ] Open app in incognito browser
- [ ] Skill tree loads with correct unit states
- [ ] Navigate to Unit 1, complete exercises
- [ ] Progress updates visible on skill tree

## Authenticated User Flow
- [ ] Sign up with invite token from Telegram bot
- [ ] Verify progress from anonymous session merges (if applicable)
- [ ] Complete a full lesson with all exercise types
- [ ] Check progress persists after page reload

## Chat
- [ ] Send a message, receive streaming response
- [ ] Chat context is maintained across messages
- [ ] BYOM: enter custom API key, verify it works

## Dictionary
- [ ] Search for "toki" — shows results
- [ ] Search for nonsense — shows "no results"
- [ ] Word cards show definitions and parts of speech

## Mobile (Chrome DevTools, Pixel 5 / 375px width)
- [ ] Content is full-width
- [ ] Desktop chat sidebar is hidden
- [ ] Floating chat button appears in bottom-right
- [ ] Tapping chat button opens bottom sheet
- [ ] Can send and receive chat messages in sheet
- [ ] Skill tree nodes stack vertically
- [ ] Exercise buttons are large enough to tap
- [ ] Navigation is usable (hamburger menu / sidebar)

## Dark Mode
- [ ] Toggle to dark mode — background changes
- [ ] Text is readable on all pages
- [ ] Exercise feedback (correct/wrong) colors visible
- [ ] Chat bubbles have proper contrast
- [ ] Dictionary cards readable
- [ ] Skill tree node states distinguishable
- [ ] Preference persists across reload

## Loading States
- [ ] Skill tree shows skeleton while loading
- [ ] Lesson shows skeleton while loading
- [ ] Dictionary shows skeleton while searching
- [ ] Chat shows typing indicator during streaming
- [ ] Grading shows spinner while waiting

## Error States
- [ ] Stop backend → app shows "unable to connect" banner with retry
- [ ] Retry button works when backend comes back
- [ ] Browser offline mode → offline banner appears
- [ ] Back online → banner disappears

## Observability
- [ ] Check LangFuse dashboard for traces of LLM calls
- [ ] Verify chat messages create traces
- [ ] Verify grading calls create traces

## Security
- [ ] CrowdSec is running (check docker logs)
- [ ] Rate limiting works on chat endpoint

## Invite / Access Flow
- [ ] Telegram bot sends invite link when approved by superuser
- [ ] Invite token is validated on signup page
- [ ] Expired/used tokens show appropriate error messages
- [ ] Login page shows "Request access via Telegram" hint

## Automated Test Results (Phase 10)
- Backend tests: 488 passing (as of Task 7; Docker Compose test run requires full stack)
- Data validation: PASS (106 words, 40 flashcards, 6 grammar sections)
- E2E tests: Run with `bun run test` from frontend/ (requires full stack running)

## Notes

- Full backend test suite requires `docker compose exec backend bash scripts/tests-start.sh` with a running PostgreSQL database
- Frontend E2E tests require both backend and frontend services running via `docker compose`
- Port constraints on this dev machine prevent easy test-only stack startup; tests are best run against a fully running production-like stack via `docker compose watch`
