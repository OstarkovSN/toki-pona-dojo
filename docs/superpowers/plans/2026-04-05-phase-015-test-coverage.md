# Phase 1.5: Test Coverage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reach 100% line coverage on the backend by finding all test gaps and writing the missing tests.

**Architecture:** Backend only (FastAPI, SQLModel, pytest). No new production code — only test files added/extended.

**Tech Stack:** FastAPI, pytest, TestClient, SQLModel, coverage.py

**Known pre-existing gaps (from Phase 1 PR review):**
- `GET /api/v1/utils/health-check/` — no test
- `POST /api/v1/utils/test-email/{email}` — no test
- `POST /api/v1/utils/password-recovery-html-content/{email}` — no test
- `app/initial_data.py` — 0% covered
- `app/main.py` line 15 — uncovered
- `app/core/config.py` lines 20, 23, 99-106 — uncovered (validation edge cases)
- `app/utils.py` lines 47, 49, 53, 59-65 — uncovered (email sending paths)
- `app/api/deps.py` lines 36-37, 43, 45 — uncovered (token/session error paths)
- `app/api/routes/login.py` lines 36, 88, 90, 109-121 — uncovered
- `app/api/routes/utils.py` lines 20-26, 31 — uncovered

---

## Task 1: Audit test gaps

**Files:**
- READ: `backend/tests/` (all existing tests)
- READ: coverage report from `docker compose cp backend:/app/backend/htmlcov/index.html /tmp/`

### Steps

- [ ] **Step 1: Run coverage report inside container**
  ```bash
  docker compose cp backend/tests backend:/app/backend/tests
  docker compose exec backend bash scripts/tests-start.sh
  docker compose cp backend:/app/backend/htmlcov/index.html /tmp/coverage-index.html
  ```

- [ ] **Step 2: Parse uncovered lines**

  For each module with <100% coverage, record:
  - File path
  - Uncovered line numbers
  - What code is on those lines
  - What test scenario would cover them

- [ ] **Step 3: Write a gap report to `.claude/test-gap-report.md`**

  Format:
  ```markdown
  ## <module>
  Lines: <N>
  Uncovered: <line numbers>
  Scenario: <what to test>
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add .claude/test-gap-report.md
  git commit -m "test: document test gap audit for Phase 1.5"
  ```

- [ ] **Step 5:** Record learnings to `.claude/learnings-test-gap-audit.md` using the `surfacing-subagent-learnings` skill.

---

## Task 2: Cover utils routes

**Files:**
- MODIFY: `backend/tests/api/routes/test_utils.py` (create if missing)

Targets: `app/api/routes/utils.py`
- `GET /api/v1/utils/health-check/` — should return `true`, no auth required
- `POST /api/v1/utils/test-email/{email}` — superuser only; sends test email; check 201 response
- `POST /api/v1/utils/password-recovery-html-content/{email}` — superuser only; returns HTML; test found/not-found

### Steps

- [ ] **Step 1: Read `backend/app/api/routes/utils.py` and existing test files**
- [ ] **Step 2: Write tests** covering all three endpoints and their error branches
- [ ] **Step 3: Run tests and verify they pass**
  ```bash
  docker compose cp backend/tests backend:/app/backend/tests
  docker compose exec backend bash -c "cd /app/backend && python -m pytest tests/api/routes/test_utils.py -v"
  ```
- [ ] **Step 4: Commit**
  ```bash
  git add backend/tests/api/routes/test_utils.py
  git commit -m "test: add tests for utils routes (health-check, test-email, password-recovery-html)"
  ```
- [ ] **Step 5:** Record learnings to `.claude/learnings-test-utils-routes.md` using the `surfacing-subagent-learnings` skill.

---

## Task 3: Cover deps, login edge cases, config validation

**Files:**
- MODIFY: `backend/tests/api/routes/test_login.py`
- MODIFY: `backend/tests/api/deps_test.py` (create if missing)

Targets:
- `app/api/deps.py` — invalid/expired JWT token paths, missing bearer scheme
- `app/api/routes/login.py` — inactive user on token refresh, missing/invalid reset token edge cases
- `app/core/config.py` — `"changethis"` secret validation (local vs production behavior)

### Steps

- [ ] **Step 1: Read all target files to understand what's uncovered**
- [ ] **Step 2: Write tests** for each uncovered scenario
- [ ] **Step 3: Run and verify**
  ```bash
  docker compose cp backend/tests backend:/app/backend/tests
  docker compose exec backend bash -c "cd /app/backend && python -m pytest tests/ -v --tb=short 2>&1 | tail -30"
  ```
- [ ] **Step 4: Commit**
  ```bash
  git add backend/tests/
  git commit -m "test: cover deps JWT error paths, login edge cases, config validation"
  ```
- [ ] **Step 5:** Record learnings to `.claude/learnings-test-deps-login.md` using the `surfacing-subagent-learnings` skill.

---

## Task 4: Cover initial_data, main, utils email paths

**Files:**
- MODIFY: `backend/tests/test_initial_data.py` (create if missing)
- MODIFY: `backend/tests/test_main.py` (create if missing)
- MODIFY: `backend/tests/test_utils_email.py` (create if missing)

Targets:
- `app/initial_data.py` — 0% coverage; tests the `init()` function
- `app/main.py` line 15 — startup event or lifespan handler
- `app/utils.py` email-sending functions — mock SMTP and verify calls

### Steps

- [ ] **Step 1: Read each target file to understand what needs testing**
- [ ] **Step 2: Write tests** using mocks where needed (SMTP, DB)
- [ ] **Step 3: Run and verify**
  ```bash
  docker compose cp backend/tests backend:/app/backend/tests
  docker compose exec backend bash scripts/tests-start.sh 2>&1 | tail -20
  ```
- [ ] **Step 4: Verify coverage hits 100%**
  ```bash
  docker compose exec backend bash -c "cd /app/backend && coverage report --fail-under=100" 2>&1 | tail -10
  ```
  If not 100%, identify remaining gaps and add tests.

- [ ] **Step 5: Commit**
  ```bash
  git add backend/tests/
  git commit -m "test: cover initial_data, main lifespan, and utils email functions"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-test-initial-data-main.md` using the `surfacing-subagent-learnings` skill.

---

## Task 5: Final verification — 100% coverage

**Files:** No new files. Verification only.

### Steps

- [ ] **Step 1: Run full test suite with coverage**
  ```bash
  docker compose cp backend/tests backend:/app/backend/tests
  docker compose exec backend bash scripts/tests-start.sh 2>&1 | tail -30
  ```

- [ ] **Step 2: Assert 100% coverage**
  ```bash
  docker compose exec backend bash -c "cd /app/backend && coverage report --fail-under=100"
  ```
  Expected: exit code 0.

- [ ] **Step 3: Run linting on all new test files**
  ```bash
  docker compose exec backend bash -c "cd /app/backend && ruff check tests/ && mypy tests/ --ignore-missing-imports"
  ```

- [ ] **Step 4: Commit any final cleanup**
  ```bash
  git status
  # Stage and commit only if there are changes
  ```

- [ ] **Step 5:** Record learnings to `.claude/learnings-test-final-verification.md` using the `surfacing-subagent-learnings` skill.

---

## Task 6: Curate learnings into CLAUDE.md

**Goal:** Improve CLAUDE.md files with all learnings captured during this phase.

- [ ] **Step 1:** Glob `.claude/learnings-*.md` and collect all scratch files written during this phase.
- [ ] **Step 2:** For each scratch file, dispatch a subagent with the `claude-md-improver` skill, providing the scratch file path in the prompt.
- [ ] **Step 3:** Verify all scratch files have been deleted after processing.

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Audit test gaps — generate gap report |
| 2 | Cover utils routes (health-check, test-email, password-recovery-html) |
| 3 | Cover deps JWT errors, login edge cases, config validation |
| 4 | Cover initial_data, main lifespan, utils email paths |
| 5 | Final verification — confirm 100% coverage |
| 6 | Curate learnings into CLAUDE.md |

**Dependency graph:**
```
Task 1 -> Task 2
       -> Task 3
       -> Task 4
Tasks 2, 3, 4 -> Task 5 -> Task 6
```

Tasks 2, 3, 4 can be dispatched in parallel once Task 1 produces the gap report.
