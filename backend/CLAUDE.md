# Backend

FastAPI app. Python 3.10+, uv package manager, SQLModel ORM, Alembic migrations, PostgreSQL 18.

## Commands

```bash
# Install dependencies
uv sync

# Run dev server (hot-reload)
fastapi dev app/main.py         # From inside backend/ or container

# Run tests
bash scripts/test.sh            # Full test suite
# Or inside container:
docker compose exec backend bash scripts/tests-start.sh
docker compose exec backend bash scripts/tests-start.sh -x  # Stop on first failure

# Lint + format
uv run ruff check .
uv run ruff format .
uv run mypy .                   # Strict mypy
uv run ty check app             # Additional type checker (ty)

# Alembic (run inside container for proper DB access)
docker compose exec backend alembic revision --autogenerate -m "description"
docker compose exec backend alembic upgrade head
docker compose exec backend alembic downgrade -1
```

## Directory Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app entry point, CORS, Sentry
│   ├── models.py         # All SQLModel table + API schema classes
│   ├── crud.py           # Database CRUD helpers
│   ├── utils.py          # Email sending, token generation
│   ├── api/
│   │   ├── main.py       # APIRouter aggregation
│   │   ├── deps.py       # FastAPI dependencies (get_db, get_current_user, etc.)
│   │   └── routes/       # One file per domain: login, users, utils, private
│   ├── core/
│   │   ├── config.py     # Pydantic Settings (reads ../.env)
│   │   ├── db.py         # SQLModel engine + session factory
│   │   └── security.py   # JWT, password hashing
│   ├── data/             # Static JSON: words.json, exercises.json, grammar.json # PLANNED (Phase 2+)
│   ├── services/         # LLM client, tracing, rate limiting # PLANNED (Phase 3+)
│   ├── alembic/          # Alembic config + migrations (versions/)
│   └── email-templates/  # MJML src + compiled HTML (build/)
├── tests/
│   ├── conftest.py       # Fixtures: db session, test client, superuser, normal user
│   ├── api/routes/       # Route-level integration tests
│   ├── crud/             # CRUD unit tests
│   └── utils/            # Test helper factories
├── scripts/
│   ├── prestart.sh       # Runs before app start: waits for DB, runs `alembic upgrade head`, seeds initial data (`initial_data.py`)
│   └── tests-start.sh    # Waits for DB, runs pytest
└── pyproject.toml        # uv/hatchling project config, ruff, mypy, coverage config
```

## Key Files

- `app/core/config.py` — `Settings` class. Reads `../.env`. Add new env vars here. Warns/errors on `"changethis"` secrets in non-local environments.
- `app/models.py` — Single source of truth for all data models (table models + API schemas in one file).
- `app/api/deps.py` — Dependency injection: `SessionDep`, `CurrentUser`, `CurrentSuperuser`. Use these in route handlers.
- `app/api/main.py` — Register new routers here with `api_router.include_router(...)`.

## Adding a New API Endpoint

1. Create `app/api/routes/<domain>.py` with an `APIRouter`.
2. Add models to `app/models.py`.
3. Add CRUD helpers to `app/crud.py` (or a dedicated `app/crud/<domain>.py`).
4. Register in `app/api/main.py`.
5. Generate a migration: `alembic revision --autogenerate -m "..."` inside container.
6. Regenerate frontend client: `cd frontend && bun run generate-client`.

## LLM Settings (Phase 3+)

Added to `Settings`:
- `OPENAI_BASE_URL` — OpenAI-compatible endpoint
- `OPENAI_API_KEY` — API key
- `OPENAI_MODEL` — model name (e.g. `gpt-4o-mini`)
- `CHAT_FREE_DAILY_LIMIT` — rate limit for anonymous users
- `CHAT_FREE_MAX_TOKENS` — max tokens for free tier
- `TG_BOT_TOKEN` — Telegram bot (optional)
- `LANGFUSE_*` — observability keys

## Non-obvious Patterns

- **`models.py` has both table models and API schemas** in one file (FastAPI template convention). Table models use `table=True`; API schemas (e.g. `UserPublic`, `UserCreate`) do not.
- **`extra="ignore"` in Settings** means unknown `.env` vars are silently ignored. Safe for sharing one `.env` with Docker services.
- **`private` router** is only registered in `local` environment — provides test endpoints not safe for production.
- **Tests need the full stack** — `conftest.py` creates a test DB session. Run via `docker compose exec backend bash scripts/tests-start.sh` to ensure DB availability.
- **Static JSON data** (Phase 2+) lives in `app/data/` and is loaded at module import time (`json.loads(Path(...).read_text())`). No DB table, no migration needed.
- **`cd backend && uv run prek install`** — installs git hooks for entire repo (uses root `.pre-commit-config.yaml`), but must be run from `backend/` since that's where `prek` is installed.
- **Naming gotcha:** The pre-start Python script is named `backend_pre_start.py` (underscores) while the shell wrapper is `prestart.sh` — don't confuse the two.

### Running tests inside the container

The Dockerfile does NOT copy `tests/` — it only copies `app/`, `scripts/`, `pyproject.toml`. Before running tests, sync the tests directory:
```bash
docker compose cp backend/tests backend:/app/backend/tests
docker compose exec backend bash scripts/tests-start.sh
```

Or use `docker compose watch` (which syncs the full `./backend` including `tests/`) instead of `docker compose up -d`.

**Always run the full suite** (`python -m pytest tests/`), not a subset. Module-scoped fixtures like `superuser_token_headers` depend on the `db` session-scoped fixture having run `init_db` — running a subset skips that and causes 404s.

**Avoid stacked `docker cp` runs.** Repeated `docker cp backend/tests backend:/app/` stacks a nested `tests/tests/` inside the container, causing tests to run twice and inflating counts/failures. Check with `docker exec <container> ls /app/tests/` before copying.

### Known pre-existing test issues

- **`test_private.py::test_create_user`** fails intermittently with `UniqueViolation` on `pollo@listo.com` — hardcoded email in the private route test; not related to new tests.
- **`tests/test_pre_start.py`** produces `RuntimeWarning` about module import ordering — pre-existing, not our concern.

### Test authoring gotchas

- **Creating inactive users:** pass `is_active=False` directly to `UserCreate` — `crud.create_user` does not default to active; it follows the model.
- **`parse_cors` with a JSON-array string** (starts with `[`): returns the string as-is for pydantic to parse, not a Python list — the `elif isinstance(v, list | str)` branch handles both.
- **Testing `_check_default_secret` in isolation with `monkeypatch.setenv`:** you must also supply all required `Settings` fields (`PROJECT_NAME`, `POSTGRES_SERVER`, `POSTGRES_USER`, `FIRST_SUPERUSER`, `FIRST_SUPERUSER_PASSWORD`), otherwise `Settings` instantiation fails with a different validation error before reaching the secret check.

### Running tests in a worktree (port conflicts)

When working in a git worktree, starting a new `docker compose up` will fail if another compose stack (e.g. `phase-01-clean-slate`) already holds port 5432. Instead, run tests inside the **already-running** container from the active stack:
```bash
# Skip cp if container was started with docker compose watch (tests/ already mounted)
docker cp backend/tests phase-01-clean-slate-backend-1:/app/backend/tests
docker exec phase-01-clean-slate-backend-1 bash scripts/tests-start.sh
```

Coverage HTML output lands at `/app/backend/htmlcov/index.html` inside the container; retrieve it with:
```bash
docker cp phase-01-clean-slate-backend-1:/app/backend/htmlcov ./htmlcov
```

### Untested / low-coverage areas

- **`app/tests_pre_start.py` and `app/backend_pre_start.py`** are nearly identical; their uncovered branches (exception path, `main()`, `__main__` guard) can be covered with a single shared test pattern applied to both.
- **`app/initial_data.py`** is trivial to cover: call `main()` directly and patch `init_db`, or use `runpy.run_module` for the `__main__` guard.
- **`recover_password_html_content`** (superuser-only, `app/api/routes/login.py`) generates an `HTMLResponse` with password-reset email content — not covered by the default test suite.

### Copying files into a running container

`docker compose cp` requires a matching service name under the current compose project. If the container was started under a different project (e.g. `phase-01-clean-slate-backend-1`), use `docker cp` directly:
```bash
docker cp <src> phase-01-clean-slate-backend-1:/app/backend/<dest>
```
Also note: `docker compose cp` copies a directory snapshot and does NOT pick up newly created files added after the initial copy — always use `docker cp` explicitly for individual new files.

**Whole-directory `docker cp` does NOT reliably overwrite individual existing files.** For single-file updates, use a targeted copy:
```bash
docker cp backend/tests/foo.py <container>:/app/backend/tests/foo.py
```
A prior whole-directory copy can create a `tests/tests/` mirror inside the container. Ruff/mypy lints both; keep them in sync by doing a full overwrite when re-copying the entire tests dir.

### Pre-existing test failures to be aware of

- `tests/tests/api/routes/test_private.py::test_create_user` — fails with `UniqueViolation` on `pollo@listo.com` due to DB isolation from a prior test run. Not caused by new test work.
- `tests/api/routes/test_config.py` — pre-existing mypy errors (missing required `Settings` fields). Do not count these against new test work.

### reset_password endpoint has two separate 400 branches

`app/api/routes/login.py` `reset_password` returns identical 400 "Invalid token" for:
1. A token that fails `verify_password_reset_token()` (bad/expired)
2. A valid token where the decoded email doesn't exist in the DB

This is intentional (prevents user enumeration). Tests must cover both branches independently. For branch 2: generate a real token for an email that was never registered.

### Suppressing ruff/mypy warnings in test helpers

- `ARG001` (unused fixture arg): when a fixture is included only for DB setup side-effects and not used directly, add `# noqa: ARG001`.
- `no-untyped-def` (mypy) on mock helper functions: add annotations `(*args: object, **kwargs: object) -> MagicMock`.

### utils route details

`app/api/routes/utils.py` exposes two endpoints only:
- `GET /utils/health-check/`
- `POST /utils/test-email/` — takes `email_to` as a **query parameter** (not body): `params={"email_to": "..."}`

Any reference to a `password-recovery-html-content` endpoint is stale — it does not exist.

### Mocking `send_email` in tests

Patch the name where it is imported (into the routes module), not where it is defined:
```python
# Correct:
mocker.patch("app.api.routes.utils.send_email", ...)
# Wrong:
mocker.patch("app.utils.send_email", ...)
```

- **`send_email()` passes smtp as a kwarg**: The smtp options dict is passed as `smtp=` keyword argument to `message.send()`, not positional. Assert via `call_args[1]["smtp"]`, not `call_args[0]`.
- **`emails.Message` mock target**: The `Message` class is from the `emails` package (not `email`/`smtplib`). Mock target is `app.utils.emails.Message`.

### Patching pre-start modules

`runpy.run_module('app.tests_pre_start', run_name='__main__')` re-executes in a fresh namespace; patching `app.tests_pre_start.init` has no effect because the `@retry`-decorated function was already bound at first import. Patch `Session` instead, or rely on the live DB being available in the test container.

### Testing Sentry initialization

`app/main.py` initializes Sentry at module import time, not in a lifespan handler — test conditional init logic by patching `settings.SENTRY_DSN` and `settings.ENVIRONMENT` then re-evaluating the `if` branch directly (don't rely on triggering lifespan events).
