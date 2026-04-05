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
