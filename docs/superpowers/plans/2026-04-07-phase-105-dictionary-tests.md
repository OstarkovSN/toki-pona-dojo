# Phase 10.5.3: Dictionary Feature Test Coverage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve comprehensive test coverage of the dictionary feature end-to-end — backend API correctness + data integrity, and frontend E2E interactions including word cards, search, POS filters, word detail page rendering, and navigation.

**Architecture:** Two independent tracks: (1) Backend pytest tests added to `backend/tests/api/routes/test_dictionary.py` and `backend/tests/data/test_data_integrity.py` following the `TestClient`/`db` fixture patterns established by existing tests. (2) Frontend Playwright E2E tests added to `frontend/tests/dictionary.spec.ts`.

**Tech Stack:** Python 3.12, pytest, FastAPI TestClient; TypeScript, Playwright, `@playwright/test`, Bun.

**State of existing tests before this plan:**

- `backend/tests/api/routes/test_dictionary.py` — 9 tests exist, covering list/search/pos-filter/word_set filter/detail/not-found/grammar; the following gaps are untested: exact word count = 190, combined query+pos filtering, `search` query param alias (endpoint accepts both `q` and `search` per route docstring — verify actual param name), case-insensitive search, all required fields non-null in returned data, `pos=['word']` absence check.
- `backend/tests/data/test_data_integrity.py` — word count minimum asserted as `>= 85` (stale; the real dataset now has 190); no check for `pos=['word']` absence; no check that `sitelen_emosi`, `see_also`, `book`, `usage_category` are present as keys.
- `frontend/tests/dictionary.spec.ts` — 7 tests exist: search renders, search input functional, POS filter toggle, set filter toggle, word detail renders, unknown word error state, mobile layout, no-results empty state. Gaps: clicking a WordCard navigates to detail page; word detail shows POS badges, definitions, etymology note, sitelen emosi emoji, see_also links, book/usage badge; back link from detail returns to list; detail page title tag includes word name; word count renders > 0 word cards; POS filter actually changes the displayed word list; set filter actually changes the displayed word list.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/tests/api/routes/test_dictionary.py` | Modify | Add: combined filters, case-insensitive search, exact word count, required-field assertions, `pos=['word']` absence |
| `backend/tests/data/test_data_integrity.py` | Modify | Update word count minimum to 190; add `pos=['word']` absence assertion; add optional-field key presence check |
| `frontend/tests/dictionary.spec.ts` | Modify | Add: WordCard navigation, detail page field rendering, back-link navigation, page title, word count, filter effects |
| `frontend/tests/navigation.spec.ts` | Modify | Add: TopNav dictionary link visible and functional from grammar page and lesson page |
| `frontend/src/components/WordChip.tsx` | Create | New component: styled badge linking to `/dictionary/$word` |
| `frontend/src/components/ExerciseWordBank.tsx` | Modify | Replace word bank `Badge` with `WordChip` |
| `frontend/tests/lesson-exercises.spec.ts` | Modify | Add: word bank chips render as dictionary links |

---

## Task 1: Backend — extend `test_dictionary.py` with missing coverage

**Files:**
- Modify: `backend/tests/api/routes/test_dictionary.py`

The file already has 9 tests. The following scenarios are missing:

1. **Word count matches source JSON** — the list endpoint must return exactly as many words as `app/data/words.json` contains (not a hardcoded number, so adding words doesn't break the test).
2. **Combined q + pos filter** — verify that both filters compose correctly (search for "a" AND pos="particle" returns a subset narrower than either alone).
3. **Case-insensitive search** — searching "TELO" (uppercase) should return the word "telo".
4. **Detail page returns all optional fields as keys** — response for `pona` should include `sitelen_emosi`, `sitelen_pona`, `usage_category`, `book`, `see_also`, `coined_era` as keys (values may be null but keys must be present so frontend can safely access them).
5. **Detail page 404 error message contains word name** — the `detail` field in the 404 response must mention the word.
6. **`pos=['word']` never appears** — no entry in the list response should have `pos == ["word"]` (a data integrity check surfaced in the requirements).
7. **Search returns subset, not empty** — searching for a known word by its English definition returns at least one result.

### Steps

- [ ] **Step 1: Read the current test file**

  ```bash
  cat backend/tests/api/routes/test_dictionary.py
  ```

- [ ] **Step 2: Append the following tests to `backend/tests/api/routes/test_dictionary.py`**

  ```python
  def test_get_words_count_matches_json(client: TestClient) -> None:
      """GET /dictionary/words returns all words — count matches words.json."""
      import json
      from pathlib import Path

      words_json = json.loads(
          (Path(__file__).parents[3] / "app/data/words.json").read_text()
      )
      r = client.get(f"{settings.API_V1_STR}/dictionary/words")
      assert r.status_code == 200
      assert len(r.json()) == len(words_json)


  def test_get_words_combined_q_and_pos_filter(client: TestClient) -> None:
      """Combined q + pos filter returns narrower results than either alone."""
      r_q = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"q": "a"})
      r_pos = client.get(
          f"{settings.API_V1_STR}/dictionary/words", params={"pos": "particle"}
      )
      r_both = client.get(
          f"{settings.API_V1_STR}/dictionary/words",
          params={"q": "a", "pos": "particle"},
      )
      assert r_both.status_code == 200
      both_count = len(r_both.json())
      assert both_count <= len(r_q.json())
      assert both_count <= len(r_pos.json())
      assert both_count > 0  # sanity: should still match something


  def test_get_words_search_case_insensitive(client: TestClient) -> None:
      """Search is case-insensitive — 'TELO' matches the word 'telo'."""
      r = client.get(
          f"{settings.API_V1_STR}/dictionary/words", params={"q": "TELO"}
      )
      assert r.status_code == 200
      words = [str(w["word"]) for w in r.json()]
      assert "telo" in words


  def test_get_word_detail_optional_fields_present(client: TestClient) -> None:
      """Word detail for 'alasa' includes all optional field keys."""
      r = client.get(f"{settings.API_V1_STR}/dictionary/words/alasa")
      assert r.status_code == 200
      data = r.json()
      optional_keys = {
          "sitelen_emosi",
          "sitelen_pona",
          "usage_category",
          "book",
          "see_also",
          "coined_era",
      }
      for key in optional_keys:
          assert key in data, f"Missing optional key: {key}"


  def test_get_word_detail_404_message_contains_word(client: TestClient) -> None:
      """GET /dictionary/words/nonexistent 404 detail message mentions the word."""
      r = client.get(f"{settings.API_V1_STR}/dictionary/words/nonexistent")
      assert r.status_code == 404
      assert "nonexistent" in r.json()["detail"]


  def test_no_words_with_pos_equal_to_word(client: TestClient) -> None:
      """No word entry has pos == ['word'] — a sentinel/fallback that must not appear."""
      r = client.get(f"{settings.API_V1_STR}/dictionary/words")
      assert r.status_code == 200
      for entry in r.json():
          assert entry["pos"] != ["word"], (
              f"Word '{entry['word']}' has pos=['word'] which is forbidden"
          )


  def test_get_words_search_by_definition_text(client: TestClient) -> None:
      """Searching by English definition text returns the matching word."""
      r = client.get(
          f"{settings.API_V1_STR}/dictionary/words", params={"q": "water"}
      )
      assert r.status_code == 200
      data = r.json()
      assert len(data) > 0
      words = [str(w["word"]) for w in data]
      assert "telo" in words
  ```

- [ ] **Step 3: Copy the file into the running container and run the tests**

  ```bash
  docker cp backend/tests/api/routes/test_dictionary.py \
    $(docker compose ps -q backend):/app/backend/tests/api/routes/test_dictionary.py

  docker compose exec backend bash -c \
    "cd /app/backend && python -m pytest tests/api/routes/test_dictionary.py -v 2>&1 | tail -30"
  ```

  Expected: all 16 tests pass (9 existing + 7 new).

- [ ] **Step 4: Commit**

  ```bash
  git add backend/tests/api/routes/test_dictionary.py
  git commit -m "test: extend dictionary API test coverage — 190-word count, combined filters, optional fields"
  ```

  Record learnings to `learnings-dictionary-api-tests.md` using the `surfacing-subagent-learnings` skill.

---

## Task 2: Backend — update data integrity tests

**Files:**
- Modify: `backend/tests/data/test_data_integrity.py`

Two specific gaps:

1. `test_minimum_count` currently asserts `>= 85` which is stale — update to `>= 120` (a meaningful floor: pu alone has ~120 words, so this catches truncation without breaking on new additions).
2. No assertion that `pos=['word']` is absent from any entry.
3. No assertion that optional-but-expected keys (`sitelen_emosi`, `sitelen_pona`, `usage_category`, `book`, `see_also`, `coined_era`) are present as keys in every word entry (values may be null but keys must be present for frontend to safely read them).

### Steps

- [ ] **Step 1: Read the current `test_data_integrity.py`**

  ```bash
  cat backend/tests/data/test_data_integrity.py
  ```

- [ ] **Step 2: Apply the following targeted edits in `TestWords`**

  Update `test_minimum_count` (keep the name, just raise the floor):
  ```python
  def test_minimum_count(self, words: list[dict[str, Any]]) -> None:
      """words.json has at least 120 entries (pu alone exceeds this; catches truncation)."""
      assert len(words) >= 120
  ```

  Add two new methods to `TestWords`:
  ```python
  def test_no_pos_word_sentinel(self, words: list[dict[str, Any]]) -> None:
      """No word entry has pos == ['word'] — a fallback sentinel that must not exist."""
      for entry in words:
          assert entry.get("pos") != ["word"], (
              f"Word '{entry.get('word', '?')}' has forbidden pos=['word']"
          )

  def test_optional_field_keys_present(self, words: list[dict[str, Any]]) -> None:
      """Every word entry has all optional field keys (values may be null)."""
      optional_keys = {
          "sitelen_emosi",
          "sitelen_pona",
          "usage_category",
          "book",
          "see_also",
          "coined_era",
      }
      for entry in words:
          missing = optional_keys - set(entry.keys())
          assert not missing, (
              f"Word '{entry.get('word', '?')}' missing optional keys: {missing}"
          )
  ```

- [ ] **Step 3: Copy and run**

  ```bash
  docker cp backend/tests/data/test_data_integrity.py \
    $(docker compose ps -q backend):/app/backend/tests/data/test_data_integrity.py

  docker compose exec backend bash -c \
    "cd /app/backend && python -m pytest tests/data/test_data_integrity.py -v 2>&1 | tail -30"
  ```

  Expected: all tests pass including the 2 new ones. `test_minimum_count` was replaced by `test_exact_count` so count stays the same.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/tests/data/test_data_integrity.py
  git commit -m "test: update data integrity — exact 190-word count, no pos=['word'], optional field keys"
  ```

  Record learnings to `learnings-dictionary-integrity-tests.md` using the `surfacing-subagent-learnings` skill.

---

## Task 3: Frontend E2E — extend `dictionary.spec.ts` with missing coverage

**Files:**
- Modify: `frontend/tests/dictionary.spec.ts`

The existing 7 tests cover basic rendering and UI interactions but do not verify:

1. **Word cards render** — after loading, at least one `word-card-*` testid element appears in the DOM.
2. **Clicking a WordCard navigates to the detail page** — click on the card for word "pona" and verify the URL becomes `/dictionary/pona`.
3. **Detail page POS badges are visible** — for word "toki", badges for its POS values render.
4. **Detail page definitions render** — for word "toki", the definition text appears.
5. **Detail page etymology note renders** — for a word with a note (e.g. "alasa" has note `"à la chasse 'hunting, (lit.) on the hunt'"`), the etymology section appears.
6. **Detail page sitelen emosi renders** — for word "a" which has `sitelen_emosi: "❗"`, the emoji is visible with an `aria-label`.
7. **Detail page see_also links are navigable** — word "alasa" has `see_also: "lukin"`. The see_also section renders a link to `/dictionary/lukin`.
8. **Detail page book badge renders** — for a ku suli word (ku=true), the "ku suli" badge appears.
9. **Back link navigates to /dictionary** — on the detail page, clicking the back "dictionary" link returns to the list.
10. **Page title includes word name** — the `<title>` for `/dictionary/toki` is "toki — toki pona dojo".
11. **POS filter changes displayed words** — clicking the "noun" POS filter changes the set of word cards shown (fewer than the "all" view).
12. **Set filter changes displayed words** — clicking the "pu" set filter changes the set of word cards shown.

### Steps

- [ ] **Step 1: Read the current `frontend/tests/dictionary.spec.ts`** to avoid duplication

  ```bash
  cat frontend/tests/dictionary.spec.ts
  ```

- [ ] **Step 2: Append the following tests to `frontend/tests/dictionary.spec.ts`**

  ```typescript
  test("word cards render after loading", async ({ page }) => {
    await page.goto("/dictionary")
    // Wait for loading skeleton to disappear
    await expect(page.getByTestId("dictionary-skeleton")).not.toBeVisible({
      timeout: 10000,
    })
    // At least one word card should be visible
    const firstCard = page.locator("[data-testid^='word-card-']").first()
    await expect(firstCard).toBeVisible({ timeout: 5000 })
  })

  test("clicking a word card navigates to detail page", async ({ page }) => {
    await page.goto("/dictionary")
    await expect(page.getByTestId("dictionary-skeleton")).not.toBeVisible({
      timeout: 10000,
    })
    const ponaCard = page.getByTestId("word-card-pona")
    await expect(ponaCard).toBeVisible({ timeout: 5000 })
    await ponaCard.click()
    await expect(page).toHaveURL(/\/dictionary\/pona/, { timeout: 5000 })
  })

  test("word detail page shows POS badges", async ({ page }) => {
    await page.goto("/dictionary/toki")
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
    // toki has pos: ["verb", "noun"] — at least one badge should appear
    const badges = page.locator(".font-label").filter({ hasText: /noun|verb|particle/ })
    await expect(badges.first()).toBeVisible({ timeout: 5000 })
  })

  test("word detail page shows definitions", async ({ page }) => {
    await page.goto("/dictionary/toki")
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
    // toki definition contains text about language/communication
    const content = page.locator("main")
    await expect(content).toContainText(/language|speech|communicate|talk/, {
      timeout: 5000,
      ignoreCase: true,
    })
  })

  test("word detail page shows etymology note for alasa", async ({ page }) => {
    await page.goto("/dictionary/alasa")
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
    // alasa has note: "à la chasse 'hunting, (lit.) on the hunt'"
    const etymSection = page.locator("main")
    await expect(etymSection).toContainText(/etymology/i, { timeout: 5000 })
    await expect(etymSection).toContainText(/chasse|hunting/, { timeout: 5000 })
  })

  test("word detail page shows sitelen emosi emoji for 'a'", async ({ page }) => {
    await page.goto("/dictionary/a")
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
    // word 'a' has sitelen_emosi: "❗"
    const emoji = page.locator(`[aria-label="sitelen emosi for a"]`)
    await expect(emoji).toBeVisible({ timeout: 5000 })
    await expect(emoji).toContainText("❗")
  })

  test("word detail page see_also links are present and navigable", async ({
    page,
  }) => {
    await page.goto("/dictionary/alasa")
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
    // alasa has see_also: "lukin"
    const seeAlsoLink = page.locator('a[href*="/dictionary/lukin"]')
    await expect(seeAlsoLink).toBeVisible({ timeout: 5000 })
    await seeAlsoLink.click()
    await expect(page).toHaveURL(/\/dictionary\/lukin/, { timeout: 5000 })
  })

  test("word detail page shows ku suli badge for a ku word", async ({ page }) => {
    // Need a ku=true word — use the ku suli set filter to find one
    await page.goto("/dictionary")
    await expect(page.getByTestId("dictionary-skeleton")).not.toBeVisible({
      timeout: 10000,
    })
    await page.getByTestId("set-filter-ku suli").click()
    const firstCard = page.locator("[data-testid^='word-card-']").first()
    await expect(firstCard).toBeVisible({ timeout: 5000 })
    await firstCard.click()
    // The detail page should show the "ku suli" badge
    await expect(page.locator("main")).toContainText("ku suli", { timeout: 5000 })
  })

  test("back link on detail page returns to dictionary list", async ({ page }) => {
    await page.goto("/dictionary/toki")
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
    // Click the back link (contains "dictionary" text with ArrowLeft icon)
    const backLink = page.locator('a[href="/dictionary"]').first()
    await expect(backLink).toBeVisible({ timeout: 5000 })
    await backLink.click()
    await expect(page).toHaveURL(/\/dictionary$/, { timeout: 5000 })
  })

  test("detail page document title includes the word name", async ({ page }) => {
    await page.goto("/dictionary/toki")
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveTitle(/toki.*toki pona dojo/i, { timeout: 5000 })
  })

  test("POS filter reduces word card count vs all", async ({ page }) => {
    await page.goto("/dictionary")
    await expect(page.getByTestId("dictionary-skeleton")).not.toBeVisible({
      timeout: 10000,
    })
    const allCards = page.locator("[data-testid^='word-card-']")
    const allCount = await allCards.count()
    expect(allCount).toBeGreaterThan(0)

    await page.getByTestId("pos-filter-noun").click()
    await page.waitForTimeout(300)
    const nounCount = await page.locator("[data-testid^='word-card-']").count()
    expect(nounCount).toBeGreaterThan(0)
    expect(nounCount).toBeLessThan(allCount)
  })

  test("set filter reduces word card count vs all", async ({ page }) => {
    await page.goto("/dictionary")
    await expect(page.getByTestId("dictionary-skeleton")).not.toBeVisible({
      timeout: 10000,
    })
    const allCount = await page.locator("[data-testid^='word-card-']").count()
    expect(allCount).toBeGreaterThan(0)

    await page.getByTestId("set-filter-pu").click()
    await page.waitForTimeout(300)
    const puCount = await page.locator("[data-testid^='word-card-']").count()
    expect(puCount).toBeGreaterThan(0)
    expect(puCount).toBeLessThan(allCount)
  })
  ```

- [ ] **Step 3: Run lint to auto-fix formatting**

  ```bash
  cd frontend && bun run lint
  ```

- [ ] **Step 4: Run the new tests (requires full stack up)**

  ```bash
  cd frontend && bun run test -- tests/dictionary.spec.ts
  ```

  Expected: all 19 tests pass (7 existing + 12 new).

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/tests/dictionary.spec.ts
  git commit -m "test: extend E2E dictionary coverage — card navigation, detail fields, filters, back-link"
  ```

  Record learnings to `learnings-dictionary-e2e-tests.md` using the `surfacing-subagent-learnings` skill.

---

## Task 4: Frontend E2E — nav integration tests in `navigation.spec.ts`

**Files:**
- Modify: `frontend/tests/navigation.spec.ts`

`navigation.spec.ts` already has one test: clicking "dictionary" in the TopNav from `/` navigates to `/dictionary`. What's missing:

1. **TopNav dictionary link is visible from `/grammar`** — not just from home.
2. **TopNav dictionary link is visible from a lesson page** — navigating to `/learn/1/1` still shows the nav with the dictionary link.
3. **TopNav dictionary link from `/grammar` navigates correctly** — click it, land on `/dictionary`, heading renders.

Note: `navigation.spec.ts` uses `getByRole("link", { name: "dictionary" })` — the TopNav renders `<NavLink>` with label `"dictionary"`, so this selector should work unchanged.

### Steps

- [ ] **Step 1: Read the current `frontend/tests/navigation.spec.ts`**

  ```bash
  cat frontend/tests/navigation.spec.ts
  ```

- [ ] **Step 2: Append the following tests**

  ```typescript
  test("TopNav dictionary link is visible on grammar page", async ({ page }) => {
    await page.goto("/grammar")
    await expect(
      page.getByRole("link", { name: "dictionary" })
    ).toBeVisible({ timeout: 5000 })
  })

  test("TopNav dictionary link navigates from grammar page", async ({ page }) => {
    await page.goto("/grammar")
    await page.getByRole("link", { name: "dictionary" }).click()
    await expect(page).toHaveURL(/\/dictionary$/, { timeout: 5000 })
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 })
  })

  test("TopNav dictionary link is visible on a lesson page", async ({ page }) => {
    await page.goto("/learn/1/1")
    await expect(
      page.getByRole("link", { name: "dictionary" })
    ).toBeVisible({ timeout: 5000 })
  })
  ```

- [ ] **Step 3: Run lint**

  ```bash
  cd frontend && bun run lint
  ```

- [ ] **Step 4: Run the tests**

  ```bash
  cd frontend && bun run test -- tests/navigation.spec.ts
  ```

  Expected: all nav tests pass (existing + 3 new).

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/tests/navigation.spec.ts
  git commit -m "test: verify TopNav dictionary link reachable from grammar and lesson pages"
  ```

  Record learnings to `learnings-dictionary-nav-tests.md` using the `surfacing-subagent-learnings` skill.

---

## Task 6: Final verification — run full test suites

**Files:** No new files. Verification only.

### Steps

- [ ] **Step 1: Run full backend test suite**

  ```bash
  docker compose exec backend bash scripts/tests-start.sh 2>&1 | tail -20
  ```

  Expected: all tests pass with no failures.

- [ ] **Step 2: Run frontend dictionary E2E spec**

  ```bash
  cd frontend && bun run test -- tests/dictionary.spec.ts
  ```

  Expected: 19 tests pass with no failures.

- [ ] **Step 3: Run backend lint**

  ```bash
  docker compose exec backend bash -c "cd /app/backend && ruff check tests/api/routes/test_dictionary.py tests/data/test_data_integrity.py"
  ```

- [ ] **Step 4: Run frontend lint**

  ```bash
  cd frontend && bun run lint
  ```

- [ ] **Step 5:** Record learnings to `learnings-dictionary-test-coverage.md` using the `surfacing-subagent-learnings` skill.

---

## Summary

| Task | Track | Files Modified | Tests Added |
|------|-------|----------------|-------------|
| 1 | Backend | `backend/tests/api/routes/test_dictionary.py` | 7 new API tests |
| 2 | Backend | `backend/tests/data/test_data_integrity.py` | 2 new + 1 updated integrity tests |
| 3 | Frontend | `frontend/tests/dictionary.spec.ts` | 12 new E2E tests |
| 4 | Frontend | `frontend/tests/navigation.spec.ts` | 3 new nav integration tests |
| 5 | Frontend | `WordChip.tsx` (new), `ExerciseWordBank.tsx`, `lesson-exercises.spec.ts` | 1 new feature + 1 test |
| 6 | Both | No changes | Verification run |

**Dependency graph:** Tasks 1, 2, 3, and 4 are independent and can be dispatched in parallel. Task 5 is independent too. Task 6 depends on all five completing.

---

## Task 5: Feature + tests — `<WordChip>` links exercises to dictionary

**Files:**
- Create: `frontend/src/components/WordChip.tsx`
- Modify: `frontend/src/components/ExerciseWordBank.tsx`
- Modify: `frontend/tests/lesson-exercises.spec.ts`

Currently, exercise components render toki pona words as plain text or unstyled `Badge` components with no link to the dictionary. `exercise.words` (a `string[]` field on every `Exercise`) already tracks which words each exercise involves — and `ExerciseWordBank` renders each word from `exercise.wordBank` as an isolated `Badge`, making it the cleanest integration point.

**Scope:** Wire `WordChip` into `ExerciseWordBank` only (lines ~66 and ~78 in that file). Other exercise types (prompt text parsing, match items) are out of scope to keep the task focused.

### Steps

- [ ] **Step 1: Read the current `ExerciseWordBank.tsx`**

  ```bash
  cat frontend/src/components/ExerciseWordBank.tsx
  ```

- [ ] **Step 2: Create `frontend/src/components/WordChip.tsx`**

  ```typescript
  import { Link } from "@tanstack/react-router"
  import { Badge } from "@/components/ui/badge"
  import { cn } from "@/lib/utils"

  interface WordChipProps {
    word: string
    className?: string
  }

  export function WordChip({ word, className }: WordChipProps) {
    return (
      <Link to="/dictionary/$word" params={{ word }}>
        <Badge
          variant="outline"
          data-testid={`word-chip-${word}`}
          className={cn(
            "font-tp cursor-pointer hover:border-zen-teal hover:text-zen-teal transition-colors",
            className,
          )}
        >
          {word}
        </Badge>
      </Link>
    )
  }
  ```

- [ ] **Step 3: Update `ExerciseWordBank.tsx`**

  Import `WordChip`:
  ```typescript
  import { WordChip } from "@/components/WordChip"
  ```

  Replace the `Badge` rendering for available bank words and selected words with `WordChip`. The click-to-select behaviour lives on the button wrapper that already surrounds each badge — `WordChip` just replaces the inner `Badge`. Keep the `onClick` on the outer wrapper; the inner `<Link>` provides dictionary navigation while the outer click handles word selection. Because these are nested interactive elements, use `e.preventDefault()` on the outer wrapper's `onClick` when the user is clicking to select (not navigating), or alternatively render `WordChip` with `onClick={e => e.stopPropagation()}` on the link so both interactions work independently.

  **Implementer note:** Read the existing code carefully to understand which click target is which before modifying. The exact wiring depends on whether the bank words are in `<button>` or `<div onClick>` wrappers.

- [ ] **Step 4: Read the current `frontend/tests/lesson-exercises.spec.ts`**

  ```bash
  cat frontend/tests/lesson-exercises.spec.ts
  ```

- [ ] **Step 5: Add a test to `frontend/tests/lesson-exercises.spec.ts`**

  Verify that word bank chips render as links to the dictionary. The existing mock lesson fixture must include a `word_bank` exercise with `wordBank: ["telo", "mi", "moku"]` (or similar). If it doesn't, add one to the mock.

  ```typescript
  test("word bank chips link to dictionary", async ({ page }) => {
    // Navigate to lesson page (mock API returns word_bank exercise)
    await page.goto("/learn/1/1")
    // Advance to the word_bank exercise if it's not first
    // (check the mock fixture to know which index it is)
    const chip = page.getByTestId("word-chip-telo")
    await expect(chip).toBeVisible({ timeout: 5000 })
    // Chip must be wrapped in a link to /dictionary/telo
    const href = await chip.evaluate(
      (el) => el.closest("a")?.getAttribute("href") ?? null
    )
    expect(href).toContain("/dictionary/telo")
  })
  ```

- [ ] **Step 6: Run lint**

  ```bash
  cd frontend && bun run lint
  ```

- [ ] **Step 7: Run tests**

  ```bash
  cd frontend && bun run test -- tests/lesson-exercises.spec.ts
  ```

  Expected: all existing tests pass, plus the new word-chip test.

- [ ] **Step 8: Commit**

  ```bash
  git add frontend/src/components/WordChip.tsx \
    frontend/src/components/ExerciseWordBank.tsx \
    frontend/tests/lesson-exercises.spec.ts
  git commit -m "feat: add WordChip component linking exercise word bank words to dictionary"
  ```

  Record learnings to `learnings-wordchip-feature.md` using the `surfacing-subagent-learnings` skill.

---

## Key Implementation Notes for the Subagent

**Backend container workflow:**

The Dockerfile does NOT copy `tests/` at build time. Always sync test files with `docker cp` before running pytest:
```bash
docker cp backend/tests/api/routes/test_dictionary.py \
  $(docker compose ps -q backend):/app/backend/tests/api/routes/test_dictionary.py
```

**Frontend testids in use (confirmed in source):**

- `data-testid={`word-card-${data.word}`}` — on `<Link>` in `WordCard.tsx`
- `data-testid="dictionary-search"` — search input
- `data-testid="dictionary-skeleton"` — loading skeleton
- `data-testid="dictionary-no-results"` — empty state
- `data-testid="pos-filter-all"`, `"pos-filter-noun"`, etc. — POS filter pills
- `data-testid="set-filter-all"`, `"set-filter-pu"`, `"set-filter-ku suli"` — set filter pills

**Word detail page fields to verify (from `$word.tsx`):**

- `h1` contains word text (font-tp class)
- POS badges render from `data.pos` using `POS_COLORS` map
- `data.sitelen_emosi` renders as `<span aria-label="sitelen emosi for {word}">`
- Definitions grouped by POS in `<h2>` + `<p>` structure
- Etymology in a `<div>` with `<p class="font-label">etymology</p>` and italic note text
- `see_also` split by comma into `<Link to="/dictionary/$word">` anchors
- Back link is `<Link to="/dictionary">` with ArrowLeft icon

**Specific word fixtures to use (verified against `words.json`):**

- `alasa` — has note (etymology), sitelen_emosi "🏹", see_also "lukin", book "pu", POS ["verb"]
- `a` — has sitelen_emosi "❗", see_also "kin"
- `toki` — has definitions about language/speech
- `pona` — good for click navigation test
