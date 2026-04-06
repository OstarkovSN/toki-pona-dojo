# toki pona dojo

A toki pona language-learning web app. Built on the FastAPI full-stack template (FastAPI backend + React frontend + PostgreSQL + Docker Compose).

## Architecture

```
toki-pona-dojo/
├── backend/          # FastAPI Python app (uv, SQLModel, Alembic, PostgreSQL)
├── frontend/         # React 19 + TypeScript + Vite + TailwindCSS v4 + shadcn/ui
├── compose.yml       # Production-like Docker Compose (base)
├── compose.override.yml  # Dev overrides (volume mounts, reload, local Traefik)
├── compose.traefik.yml   # Production Traefik config
├── .env              # All config (gitignored; copy from .env.example)
└── docs/superpowers/plans/  # 10-phase implementation plans
```

**10-phase build plan** (see `docs/superpowers/plans/`):
1. Clean Slate — remove Items demo, rebrand to "toki pona dojo"
2. Data Layer — JSON vocabulary/exercises, UserProgress model, API endpoints
3. LLM Integration — OpenAI-compatible streaming chat, slowapi rate limiting
4. LangFuse Observability — self-hosted LangFuse v3 tracing
5. Frontend Structure — zen theme, skill tree, dictionary, grammar pages
6. Frontend Exercises — interactive exercise components (multiple choice, fill-in)
7. Frontend Chat — jan sona tutor with SSE streaming
8. Progress Persistence — localStorage + server sync, SM-2 spaced repetition
9. Security — CrowdSec + Traefik bouncer
10. Polish — final UI/UX and production hardening

## Commands

### Primary dev workflow (Docker Compose)
```bash
docker compose watch           # Start full stack with live reload
docker compose logs -f         # Watch all logs
docker compose logs -f backend # Watch backend only
docker compose exec backend bash  # Shell into backend container
```

### Local dev without Docker
```bash
# Backend (requires running db container)
cd backend
uv sync
fastapi dev app/main.py        # Hot-reload on http://localhost:8000

# Frontend
cd frontend
bun install
bun run dev                    # Vite dev server on http://localhost:5173
```

### Backend testing
```bash
# In container (preferred — uses real DB):
docker compose exec backend bash scripts/tests-start.sh
docker compose exec backend bash scripts/tests-start.sh -x  # Stop on first failure

# Or via script:
bash backend/scripts/test.sh
```

### Frontend commands
```bash
bun run dev              # Dev server (from repo root or frontend/)
bun run build            # TypeScript check + Vite build
bun run lint             # Biome linting (auto-fixes)
bun run test             # Playwright E2E tests
bun run test:ui          # Playwright with UI mode
bun run generate-client  # Regenerate API client from OpenAPI schema
```
Note: root `package.json` forwards these via workspace (`bun run --filter frontend <cmd>`).

### Backend linting / type checks
```bash
# Inside backend container or with uv run:
uv run ruff check .
uv run ruff format .
uv run mypy .
uv run prek run --all-files   # Run from REPO ROOT (hooks use root-relative paths)
```

### Alembic migrations (run inside backend container)
```bash
docker compose exec backend alembic revision --autogenerate -m "description"
docker compose exec backend alembic upgrade head
docker compose exec backend alembic downgrade base
```

### Regenerate frontend API client
```bash
# Reads from `frontend/openapi.json` (local file). Run `bash scripts/generate-client.sh` from repo root to regenerate JSON and client together (imports backend in-process, no running server needed).
cd frontend && bun run generate-client
```

## Environment Setup

Copy `.env.example` to `.env` and fill in values. Key variables:
```
SECRET_KEY=            # Generate: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
FIRST_SUPERUSER_PASSWORD=
POSTGRES_PASSWORD=
OPENAI_API_KEY=        # For LLM features (Phase 3+)
OPENAI_BASE_URL=       # Defaults to https://api.openai.com/v1 (or proxy)
OPENAI_MODEL=          # e.g. gpt-4o-mini
TG_BOT_TOKEN=          # Telegram invite bot token
TG_SUPERUSER_ID=       # Telegram user ID for superuser access
TG_BOT_USERNAME=       # Bot @username
TG_WEBHOOK_SECRET=     # Webhook validation secret
LANGFUSE_*             # After first LangFuse startup (Phase 4)
CROWDSEC_BOUNCER_KEY=  # After running: cscli bouncers add my-bouncer (Phase 9)
```

`Settings` in `backend/app/core/config.py` reads from `../.env` (one level above `backend/`). It warns (local) or errors (staging/production) on `"changethis"` secrets.

## Dev Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Adminer (DB UI) | http://localhost:8080 |
| Traefik UI | http://localhost:8090 |
| MailCatcher | http://localhost:1080 |
| LangFuse UI (Phase 4) | http://localhost:3100 |

## Pre-commit Hooks

Uses `prek` (modern pre-commit alternative). Install hooks once:
```bash
cd backend && uv run prek install -f
```
Hooks: check TOML/YAML, check large files, fix EOF/trailing whitespace, `ruff` lint+format, `mypy` + `ty` type checks, `biome` frontend check, auto-regenerate frontend SDK on backend changes.

## Port Constraints (this dev machine)

**All standard ports are occupied.** Occupied: 22, 53, 80, 1025, 1080, 5173, 5432, 6379, 8000, 8052, 8080, 8081, 8082, 8090, 8100, 8200, 8300, 9092, 9093, 9323.

New services must use non-standard ports. LangFuse: 3100 (UI), 9190 (MinIO). CrowdSec: no host port exposure (container-only).

## Key Non-obvious Patterns

- **Frontend client is auto-generated** from OpenAPI schema. Never manually edit `frontend/src/client/`. Re-run `generate-client` after backend API changes.
- **`routeTree.gen.ts` is auto-generated** by TanStack Router Vite plugin on build. Don't edit it manually.
- **`compose.override.yml` is auto-applied** by `docker compose` — no flag needed. It mounts source as volumes for live reload.
- **Backend reads `.env` from parent dir** (`env_file="../.env"` in Settings). Run `fastapi dev` from inside `backend/` or the container; don't move the `.env`.
- **`bun` is the package manager** for frontend (not npm). Use `bun install`, `bun run`.
- **Items demo code was removed** in Phase 1. The app now has only auth/users as a base.
- **LangFuse uses `postgres:17`** (separate container+volume from the app's `postgres:18`). They must not share a Postgres instance.

## Phase 4 Gotchas

- **`.env` is shared across worktrees** — gitignored files don't auto-copy; worktree must reference root `.env` at `/home/claude/workdirs/toki-pona-dojo/.env`.
- **ClickHouse config files live in `deploy/langfuse-clickhouse/`** — created manually alongside `compose.yml`; not part of the template.
- **`macros.xml` must define shard/replica identity** — even in single-node dev setups, LangFuse expects these macros for cluster mode readiness.
- **`zookeeper.xml` references service by Compose name** — hostname must exactly match `langfuse-zookeeper` service name in `compose.yml`, port 2181.
- **`docker compose config --quiet` exits 1 if `.env` missing** — even with env vars passed, create empty temp `.env` for validation, then remove it.
- **Both `backend` and `prestart` services need `LANGFUSE_HOST`** — easy to miss one in env var blocks.
- **`LANGFUSE_HOST` appears twice in compose config output** (key + value lines for both services); grep count of 4 is correct.
- **`langfuse-minio` uses port `9190:9000`** (host:container); `langfuse-server` uses `localhost:9190` (host-accessible), `langfuse-worker` uses internal Docker hostname `http://langfuse-minio:9000`.
- **LangFuse restart overrides in `compose.override.yml`** must be inserted before the `networks:` section, not after the last service block.
- **`LANGFUSE_INIT_USER_*` env vars** (email, password, name, organization) are required for first-launch admin setup and were missing from `.env.example` before Phase 4.

## Phase 10 Gotchas

- **Docker Compose stack requires real PostgreSQL** — Backend tests cannot run standalone; tests need a real database container. On dev machines with port conflicts, best approach is to run `docker compose watch` in a non-worktree directory and test against the running services, or use `docker compose exec backend bash scripts/tests-start.sh` inside the container.
- **Port conflicts block integrated testing in worktrees** — If PostgreSQL (5432) or other standard ports are already in use on the dev machine, the full Docker Compose stack cannot start in the worktree. Data validation (JSON files only) works without services; Playwright E2E tests cannot run without backend and frontend services available.
- **Data validation script doesn't require database** — `validate_data.py` only reads JSON files; it's safe to run independently to verify vocabulary, flashcards, and grammar structure without a running stack.
- **Playwright test collection requires environment variables** — Even for public tests with `storageState` overrides, the test configuration file is imported during test discovery. `FIRST_SUPERUSER` and `FIRST_SUPERUSER_PASSWORD` env vars must be set even when running `npx playwright test --list` or test collection will fail.
- **Manual QA checklist as fallback** — On machines with Docker Compose constraints, use `docs/manual-verification-checklist.md` as a script for human verification in a browser instead of automated test runs.
