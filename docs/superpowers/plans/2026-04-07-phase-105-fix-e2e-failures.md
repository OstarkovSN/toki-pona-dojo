# Phase 10.5.4: Fix E2E Test Failures — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all identified Playwright E2E test failures from Phase 10.5.3 test results. All failures are test infrastructure issues — no application code bugs. After fixes: `navigation.spec.ts` 1/27 → 27/27; `dictionary.spec.ts` 28/61 → 61/61; `lesson-exercises.spec.ts` 9/13 → 13/13.

**Root Cause Summary:**
1. **`navigation.spec.ts`** — file-level `test.use({ storageState: { cookies: [], origins: [] } })` forces ALL projects (including `chromium` and `mobile-chrome`) to no-auth, defeating their storage state. All 9 tests navigate to auth-protected routes → 26 failures.
2. **`dictionary.spec.ts` `[no-auth]` project** — agent removed the previous file-level override but `[no-auth]` project config still sends empty storage state to auth-protected dictionary routes → 21 failures.
3. **Mobile chat overlay** — `ChatContext` opens the chat panel on mobile by default; its Sheet overlay (`bg-black/50`) intercepts pointer events on filter buttons and word cards → failures across `[mobile-chrome]` in `dictionary.spec.ts` and `lesson-exercises.spec.ts`.
4. **Selector ambiguity** — `locator("main")` matches two elements (outer `SidebarInset` main + inner content main) → strict-mode violation in dictionary mobile layout test.
5. **404 error state timeout** — 5-second timeout too short for React to re-render error state after API 404 → one chromium dictionary test fails.

**Fix Strategy:** All auth failures are fixed identically: add `test.beforeEach` with `page.addInitScript` to inject `access_token` into localStorage plus route mocks for `/users/me` and `/progress/me`. Mobile failures fixed by also setting `tp-chat-open: false` in the same script.

**Working directory:** `/home/claude/workdirs/toki-pona-dojo/.worktrees/phase-105-dictionary-tests`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `frontend/tests/navigation.spec.ts` | Modify | Remove file-level `test.use()` override; add `beforeEach` with JWT injection + route mocks + chat panel suppression |
| `frontend/tests/dictionary.spec.ts` | Modify | Add `beforeEach` with JWT injection + route mocks + chat panel suppression; fix `locator("main")` → `.last()`; increase 404 timeout |
| `frontend/tests/lesson-exercises.spec.ts` | Modify | Add `tp-chat-open: false` to existing `addInitScript` to suppress mobile chat overlay |

---

## Task 1: Fix `navigation.spec.ts` — remove no-auth override, add JWT injection

**Files:**
- Modify: `frontend/tests/navigation.spec.ts`

**Problem:** Line 3 has `test.use({ storageState: { cookies: [], origins: [] } })` which overrides ALL Playwright projects (including authenticated `chromium` and `mobile-chrome`) to run without credentials. All 9 tests navigate to auth-protected routes, so all 27 test/project combinations redirect to `/login` and fail.

**Fix:** Remove the file-level `test.use()` override. Add a `test.beforeEach` that:
1. Calls `page.addInitScript` to inject `localStorage.setItem("access_token", "fake-test-token")` and `localStorage.setItem("tp-chat-open", "false")` (prevents mobile chat overlay)
2. Mocks `**/api/v1/users/me` to return a valid fake user object
3. Mocks `**/api/v1/progress/me` to return a valid fake progress object

With the file-level override removed, `[chromium]` and `[mobile-chrome]` projects use their `playwright/.auth/user.json` storage state (real auth), so their tests pass without needing the fake JWT. The `addInitScript` still runs for `[no-auth]` project, where it injects the fake token before page scripts run, allowing the auth guard to pass.

### Steps

- [ ] **Step 1: Read current file**

  Read `frontend/tests/navigation.spec.ts` to confirm exact content before editing.

- [ ] **Step 2: Rewrite the file**

  Remove line 3 (`test.use({ storageState: ... })`). Add `test.beforeEach` immediately before the first `test(...)` block:

  ```typescript
  test.beforeEach(async ({ page }) => {
    // Inject fake token so isLoggedIn() returns true in [no-auth] project
    // In [chromium]/[mobile-chrome] the storageState already has real auth,
    // so this addInitScript is a no-op for those projects (harmless duplicate).
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "fake-test-token")
      // Suppress mobile chat panel Sheet overlay that blocks pointer events
      localStorage.setItem("tp-chat-open", "false")
    })
    // Mock /users/me so useAuth doesn't 401 with the fake token
    await page.route("**/api/v1/users/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "00000000-0000-0000-0000-000000000001",
          email: "test@example.com",
          is_active: true,
          is_superuser: false,
          full_name: "Test User",
        }),
      })
    })
    // Mock /progress/me so useProgress doesn't 401 with the fake token
    await page.route("**/api/v1/progress/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          completed_units: [],
          completed_lessons: [],
          current_unit: 1,
          srs_data: {},
          total_correct: 0,
          total_answered: 0,
          streak_days: 0,
          last_activity: null,
          known_words: [],
          recent_errors: [],
        }),
      })
    })
  })
  ```

- [ ] **Step 3: Lint**

  Run `cd /home/claude/workdirs/toki-pona-dojo/.worktrees/phase-105-dictionary-tests/frontend && bun run lint` and fix any Biome issues.

- [ ] **Step 4: Verify with Playwright MCP**

  Use Playwright MCP browser tools to spot-check:
  1. Navigate to `http://localhost:5173/` — confirm TopNav renders with learn/dictionary/grammar links (no login redirect).
  2. Navigate to `http://localhost:5173/grammar` — confirm nav links visible.
  3. Navigate to `http://localhost:5173/learn/1/1` — confirm page loads (not `/login`).

  Note: the running stack at `http://localhost:5173` must be up. If it's not reachable, skip this step and note in commit message.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/tests/navigation.spec.ts
  git commit -m "fix(tests): navigation.spec.ts — remove no-auth override, add JWT injection beforeEach"
  ```

  Record learnings to `learnings-fix-navigation-tests.md` using the surfacing-subagent-learnings skill.

---

## Task 2: Fix `dictionary.spec.ts` — JWT injection + mobile overlay + selector fixes

**Files:**
- Modify: `frontend/tests/dictionary.spec.ts`

**Problems to fix (in this single task):**

1. **`[no-auth]` project: 21 failures** — dictionary routes are behind the `_layout.tsx` auth guard. The file-level `test.use()` override was already removed by a previous agent, but the `[no-auth]` project still sends no credentials. Fix: add `test.beforeEach` with JWT injection (same pattern as navigation.spec.ts).

2. **`[mobile-chrome]` project failures** — mobile chat panel Sheet overlay blocks pointer events on filter buttons and word cards. Fix: add `localStorage.setItem("tp-chat-open", "false")` in the same `addInitScript`.

3. **`locator("main")` strict-mode violation** in "word detail page mobile layout" test — two `<main>` elements exist in the DOM: the outer SidebarInset's `<main data-slot="sidebar-inset">` and the inner content `<main class="flex-1...">`. Fix: change `page.locator("main")` to `page.locator("main").last()` in that test.

4. **404 error state timeout** in "Word detail page shows error state for unknown word" — 5-second timeout is marginal. Fix: increase `waitForSelector` timeout to `10000` and add an explicit `page.waitForResponse` for the 404 response before asserting the error state.

### Steps

- [ ] **Step 1: Read current file**

  Read `frontend/tests/dictionary.spec.ts` in full to understand current state.

- [ ] **Step 2: Add `test.beforeEach` at file scope**

  At the top of the file (after imports), add:

  ```typescript
  test.beforeEach(async ({ page }) => {
    // Inject fake token so isLoggedIn() returns true in [no-auth] project
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "fake-test-token")
      // Suppress mobile chat panel Sheet overlay that blocks pointer events
      localStorage.setItem("tp-chat-open", "false")
    })
    // Mock /users/me so useAuth doesn't 401 with the fake token
    await page.route("**/api/v1/users/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "00000000-0000-0000-0000-000000000001",
          email: "test@example.com",
          is_active: true,
          is_superuser: false,
          full_name: "Test User",
        }),
      })
    })
    await page.route("**/api/v1/progress/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          completed_units: [],
          completed_lessons: [],
          current_unit: 1,
          srs_data: {},
          total_correct: 0,
          total_answered: 0,
          streak_days: 0,
          last_activity: null,
          known_words: [],
          recent_errors: [],
        }),
      })
    })
  })
  ```

- [ ] **Step 3: Fix `locator("main")` strict-mode violation**

  In "word detail page mobile layout" test, find `page.locator("main")` and change to `page.locator("main").last()`.

- [ ] **Step 4: Fix 404 error state timeout**

  In "Word detail page shows error state for unknown word" test:
  - Change `page.waitForSelector("p.font-tp, h1", { timeout: 5000 })` to `{ timeout: 10000 }`
  - If the test waits for selector after `page.goto()`, add `await page.waitForResponse(resp => resp.url().includes("/dictionary/words/") && resp.status() === 404, { timeout: 10000 })` before the selector wait to ensure the API has responded before checking DOM.

- [ ] **Step 5: Lint**

  Run `bun run lint` and fix any Biome issues.

- [ ] **Step 6: Verify with Playwright MCP**

  Use Playwright MCP browser tools to spot-check:
  1. Navigate to `http://localhost:5173/dictionary` — confirm word cards render.
  2. Navigate to `http://localhost:5173/dictionary/toki` — confirm word detail renders with h1.
  3. Navigate to `http://localhost:5173/dictionary/xyznotaword` — confirm error state renders.

  Note: requires running stack. Skip if unavailable, note in commit.

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/tests/dictionary.spec.ts
  git commit -m "fix(tests): dictionary.spec.ts — add JWT injection, fix mobile overlay + selector issues"
  ```

  Record learnings to `learnings-fix-dictionary-tests.md` using the surfacing-subagent-learnings skill.

---

## Task 3: Fix `lesson-exercises.spec.ts` mobile failures — suppress chat overlay

**Files:**
- Modify: `frontend/tests/lesson-exercises.spec.ts`

**Problem:** `[mobile-chrome]` project fails on 4 tests with `Test timeout of 30000ms exceeded` waiting for exercise answer buttons. Root cause: on mobile viewport (Pixel 5, 375×812), the chat panel Sheet renders an overlay (`bg-black/50`) that intercepts pointer events. The `tp-chat-open` localStorage key controls whether ChatContext opens the panel.

**Fix:** In the existing `test.beforeEach`'s `addInitScript` callback (currently at line 95), add `localStorage.setItem("tp-chat-open", "false")` alongside the existing `access_token` set.

Current code:
```typescript
await page.addInitScript(() => {
  localStorage.setItem("access_token", "fake-test-token")
})
```

After fix:
```typescript
await page.addInitScript(() => {
  localStorage.setItem("access_token", "fake-test-token")
  // Suppress mobile chat panel Sheet overlay that blocks pointer events
  localStorage.setItem("tp-chat-open", "false")
})
```

### Steps

- [ ] **Step 1: Read current file**

  Read `frontend/tests/lesson-exercises.spec.ts` to confirm exact `addInitScript` content at lines 95–97.

- [ ] **Step 2: Edit `addInitScript`**

  Add `localStorage.setItem("tp-chat-open", "false")` inside the existing `addInitScript` callback.

- [ ] **Step 3: Lint**

  Run `bun run lint` and fix any issues.

- [ ] **Step 4: Verify with Playwright MCP**

  Use Playwright MCP browser tools to spot-check lesson page on mobile viewport:
  1. Set viewport to 375×812 (Pixel 5).
  2. Navigate to `http://localhost:5173/learn/1/1`.
  3. Take a screenshot — confirm no dark overlay is covering the exercise buttons.
  4. Confirm "house", "person", "food", "water" buttons are visible and clickable.

  Note: requires running stack. Skip if unavailable, note in commit.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/tests/lesson-exercises.spec.ts
  git commit -m "fix(tests): lesson-exercises.spec.ts — suppress mobile chat overlay in addInitScript"
  ```

  Record learnings to `learnings-fix-lesson-exercises-tests.md` using the surfacing-subagent-learnings skill.

---

## Task 4: Run full test suite and document updated results

**Goal:** Run all Playwright test suites and update `docs/test-results-phase-105.md` with the new pass/fail counts.

### Steps

- [ ] **Step 1: Check stack availability**

  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
  ```

  If not 200, note "E2E tests not run — stack unavailable" and document accordingly.

- [ ] **Step 2: Run Playwright tests (if stack up)**

  From inside the worktree frontend directory:
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/.worktrees/phase-105-dictionary-tests/frontend
  bun run test -- --reporter=list 2>&1 | tail -60
  ```

  Capture: total passed, total failed, breakdown by spec file and project.

- [ ] **Step 3: Verify backend tests still pass**

  ```bash
  docker compose exec backend bash scripts/tests-start.sh 2>&1 | tail -10
  ```

- [ ] **Step 4: Update results document**

  Update `docs/test-results-phase-105.md` with a new section:

  ```markdown
  ---

  ## Phase 10.5.4 — Post-Fix Results (2026-04-07)

  ### Changes applied
  - `navigation.spec.ts`: removed file-level no-auth override; added JWT injection + chat suppression in `beforeEach`
  - `dictionary.spec.ts`: added JWT injection + chat suppression in `beforeEach`; fixed `main` selector; increased 404 timeout
  - `lesson-exercises.spec.ts`: added `tp-chat-open: false` to existing `addInitScript`

  ### Results
  | Suite | Before | After | Delta |
  |---|---|---|---|
  | `navigation.spec.ts` | 1/27 | _/27 | +_ |
  | `dictionary.spec.ts` | 28/61 | _/61 | +_ |
  | `lesson-exercises.spec.ts` | 9/13 | _/13 | +_ |
  | Backend `pytest` | 287/287 | 287/287 | 0 |

  ### Remaining failures (if any)
  _Document any remaining failures with root cause and whether they are acceptable or need further work._
  ```

  Fill in actual numbers.

- [ ] **Step 5: Commit**

  ```bash
  git add docs/test-results-phase-105.md
  git commit -m "docs: update test results after Phase 10.5.4 E2E fixes"
  ```

  Record learnings to `learnings-fix-e2e-results.md` using the surfacing-subagent-learnings skill.

---

## Expected Outcomes

After all tasks:

| Suite | Before | Expected After |
|---|---|---|
| `navigation.spec.ts` | 1/27 (4%) | 27/27 (100%) |
| `dictionary.spec.ts` | 28/61 (46%) | 61/61 (100%) |
| `lesson-exercises.spec.ts` | 9/13 (69%) | 13/13 (100%) |
| Backend `pytest` | 287/287 | 287/287 (unchanged) |

All 33 `dictionary.spec.ts` failures have concrete, specific fixes:
- 21 `[no-auth]` failures → JWT injection in `beforeEach`
- 10 `[mobile-chrome]` failures → `tp-chat-open: false` in `addInitScript`
- 1 strict-mode `locator("main")` → `.last()`
- 1 404 timeout → increased to 10s + `waitForResponse`
