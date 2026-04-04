# Phase 4: LangFuse Observability

> Deploy self-hosted LangFuse v3 via Docker Compose, wire tracing into the LLM service, verify traces appear in the UI.

---

## Goal

LangFuse is running alongside the app. All LLM calls (chat and grading) are traced. LangFuse is optional — if keys are missing or the service is down, the app continues without tracing.

## Prerequisites

- Phase 3 complete (LLM service exists with `LANGFUSE_*` config fields in Settings)
- Docker Compose already manages the app stack

## Architecture

```
                    ┌─────────────────────────────┐
                    │  toki pona dojo app stack    │
                    │                              │
  Browser ────────> │  FastAPI  ──> OpenAI client  │ ──────> LLM provider
                    │     │                        │
                    │     │ CallbackHandler         │
                    │     ▼                        │
                    │  langfuse-server:3000        │ <── traces
                    │  langfuse-worker             │
                    │  langfuse-db (Postgres)      │
                    │  langfuse-clickhouse         │
                    │  langfuse-zookeeper          │
                    │  langfuse-minio              │
                    │  langfuse-cache (Redis)      │
                    └─────────────────────────────┘
                    
  Host browser ──> localhost:3100 ──> LangFuse UI
```

## Port Allocation

All default host ports are occupied. LangFuse host-mapped ports:

| Service | Container port | Host port | Purpose |
|---------|---------------|-----------|---------|
| langfuse-server | 3000 | **3100** | Web UI for browsing traces |
| langfuse-minio | 9000 | **9190** | MinIO API (blob storage) |

All other LangFuse services have **no host port mapping** — they communicate only within the Docker network.

`NEXTAUTH_URL` in `.env` must be `http://localhost:3100` (matching the host-mapped port).

## Steps

### 4.1 Generate secrets for `.env`

Add to `.env` and `.env.example`:

```bash
# -- LangFuse: auth secrets --
NEXTAUTH_SECRET=<python3 -c "import secrets; print(secrets.token_urlsafe(32))">
SALT=<python3 -c "import secrets; print(secrets.token_hex(32))">
ENCRYPTION_KEY=<openssl rand -hex 32>

# -- LangFuse: initial admin --
LANGFUSE_INIT_USER_EMAIL=admin@example.com
LANGFUSE_INIT_USER_NAME=Admin
LANGFUSE_INIT_USER_PASSWORD=changeme

# -- LangFuse: internal service credentials --
LANGFUSE_DB_USER=postgres
LANGFUSE_DB_PASSWORD=<generate>
LANGFUSE_DB_NAME=postgres
LANGFUSE_CLICKHOUSE_USER=clickhouse
LANGFUSE_CLICKHOUSE_PASSWORD=<generate>
LANGFUSE_MINIO_USER=minio
LANGFUSE_MINIO_PASSWORD=<generate>

NEXTAUTH_URL=http://localhost:3100

# -- LangFuse: API keys (fill after first launch) --
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_HOST=http://langfuse-server:3000
```

### 4.2 ClickHouse config files

Create `deploy/langfuse-clickhouse/macros.xml`:
```xml
<clickhouse>
    <macros>
        <shard>01</shard>
        <replica>replica01</replica>
    </macros>
</clickhouse>
```

Create `deploy/langfuse-clickhouse/zookeeper.xml`:
```xml
<clickhouse>
    <zookeeper>
        <node>
            <host>langfuse-zookeeper</host>
            <port>2181</port>
        </node>
    </zookeeper>
</clickhouse>
```

### 4.3 Docker Compose services

Add 7 services to `compose.yml` (or a `compose.langfuse.yml` override — discuss with user):

1. **langfuse-db** — `postgres:17`, separate from the app's Postgres
2. **langfuse-zookeeper** — `zookeeper:3.9`, required by ClickHouse
3. **langfuse-clickhouse** — `clickhouse/clickhouse-server:25.8`, mounts the XML configs
4. **langfuse-minio** — `cgr.dev/chainguard/minio`, blob storage for events/media. Host port: **9190**
5. **langfuse-cache** — `redis:7`, separate from any app Redis
6. **langfuse-server** — `langfuse/langfuse:3`, host port: **3100**. All env vars explicitly set to avoid `.env` collisions (especially `REDIS_CONNECTION_STRING`, `REDIS_HOST`, `REDIS_PORT`)
7. **langfuse-worker** — `langfuse/langfuse-worker:3`, same env var overrides as server

Add volumes: `langfuse-db-data`, `langfuse-zookeeper-data`, `langfuse-zookeeper-datalog`, `langfuse-clickhouse-data`, `langfuse-clickhouse-logs`, `langfuse-minio-data`.

**Critical env var overrides in langfuse-server and langfuse-worker:**
```yaml
environment:
  # Override any REDIS_* from .env to point at langfuse-cache, not app Redis
  REDIS_CONNECTION_STRING: redis://langfuse-cache:6379/0
  REDIS_HOST: langfuse-cache
  REDIS_PORT: "6379"
```

See `adding-langfuse-to-project.md` for the complete service definitions. Adapt port mappings to 3100 and 9190.

### 4.4 Tracing module — `backend/app/services/tracing.py`

```python
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_langfuse_handler():
    """Return a Langfuse CallbackHandler if configured, else None."""
    if not (settings.LANGFUSE_SECRET_KEY and settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_HOST):
        return None
    import os
    os.environ["LANGFUSE_SECRET_KEY"] = settings.LANGFUSE_SECRET_KEY
    os.environ["LANGFUSE_PUBLIC_KEY"] = settings.LANGFUSE_PUBLIC_KEY
    os.environ["LANGFUSE_HOST"] = settings.LANGFUSE_HOST
    from langfuse.callback import CallbackHandler
    return CallbackHandler()

def get_langfuse_config() -> dict:
    """Return a config dict with Langfuse callbacks, or {} if not configured."""
    handler = get_langfuse_handler()
    if handler is None:
        return {}
    return {"callbacks": [handler]}

def check_langfuse_auth() -> bool:
    """Check Langfuse auth at startup. Returns True if OK."""
    if not (settings.LANGFUSE_SECRET_KEY and settings.LANGFUSE_PUBLIC_KEY):
        logger.warning("Langfuse tracing disabled — set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY")
        return False
    try:
        from langfuse import Langfuse
        client = Langfuse(
            secret_key=settings.LANGFUSE_SECRET_KEY,
            public_key=settings.LANGFUSE_PUBLIC_KEY,
            host=settings.LANGFUSE_HOST,
        )
        client.auth_check()
        logger.info("Langfuse tracing enabled — host=%s", settings.LANGFUSE_HOST)
        return True
    except Exception:
        logger.exception("Langfuse auth check failed — tracing disabled")
        return False
```

### 4.5 Wire tracing into LLM service

Modify `backend/app/services/llm.py` to accept an optional Langfuse callback:

For the **chat endpoint**: the OpenAI client doesn't use LangChain callbacks directly. Two options:
- **Option A (recommended):** Use `langfuse.openai` drop-in replacement. Replace `from openai import OpenAI` with `from langfuse.openai import OpenAI` when LangFuse is configured. This automatically traces all `client.chat.completions.create()` calls.
- **Option B:** Use the Langfuse `@observe()` decorator on the endpoint functions.

Go with **Option A** — it requires minimal code changes:

```python
def get_llm_client() -> OpenAI:
    if settings.LANGFUSE_SECRET_KEY and settings.LANGFUSE_PUBLIC_KEY:
        from langfuse.openai import OpenAI as LangfuseOpenAI
        return LangfuseOpenAI(base_url=settings.OPENAI_BASE_URL, api_key=settings.OPENAI_API_TOKEN)
    from openai import OpenAI
    return OpenAI(base_url=settings.OPENAI_BASE_URL, api_key=settings.OPENAI_API_TOKEN)
```

### 4.6 Startup health check

In `backend/app/main.py`, add a lifespan or startup event:
```python
@app.on_event("startup")
async def startup():
    check_langfuse_auth()
```

This logs whether tracing is active. It does NOT block startup if LangFuse is down.

### 4.7 LANGFUSE_HOST override in compose

In the backend service's `environment:` block in `compose.yml`:
```yaml
backend:
  environment:
    LANGFUSE_HOST: http://langfuse-server:3000
```

This ensures the backend always uses the Docker internal hostname, regardless of what `.env` says.

### 4.8 Add `langfuse` Python dependency

```bash
# In backend directory
uv add "langfuse>=4.0.0"
```

### 4.9 First launch and API key generation

After `docker compose up --build -d`:
1. Wait for `langfuse-server` to be healthy (~60s on first launch)
2. Open `http://localhost:3100` in browser
3. Log in with initial admin credentials
4. Create organization (e.g., "toki pona dojo")
5. Create project (e.g., "main")
6. Go to Settings > API Keys > Create API Key
7. Copy `sk-lf-...` and `pk-lf-...` to `.env`
8. Restart backend: `docker compose restart backend`

This can be automated with Playwright MCP if available.

### 4.10 Verify

- Make a chat request via the API
- Check LangFuse UI at `http://localhost:3100` — trace should appear
- Stop langfuse-server, make another chat request — it should succeed (graceful degradation)

## Files touched

| Action | Path |
|--------|------|
| ADD | `deploy/langfuse-clickhouse/macros.xml` |
| ADD | `deploy/langfuse-clickhouse/zookeeper.xml` |
| ADD | `backend/app/services/tracing.py` |
| MODIFY | `compose.yml` (add 7 services + 6 volumes) |
| MODIFY | `.env` / `.env.example` (add LangFuse secrets + credentials) |
| MODIFY | `backend/app/services/llm.py` (use langfuse.openai drop-in) |
| MODIFY | `backend/app/main.py` (add startup health check) |
| MODIFY | `backend/pyproject.toml` (add `langfuse` dep) |

## Gotchas (from adding-langfuse-to-project.md)

1. **The localhost trap:** `LANGFUSE_HOST=http://localhost:3100` works in the browser but breaks inside Docker containers. Always use `http://langfuse-server:3000` for container-to-container communication.
2. **Redis collision:** If the app uses `REDIS_AUTH` or `REDIS_CONNECTION_STRING` in `.env`, LangFuse's `env_file: .env` picks those up. Must explicitly override in langfuse-server and langfuse-worker.
3. **ClickHouse needs config files:** Without `macros.xml` and `zookeeper.xml`, ClickHouse won't start.
4. **First startup is slow:** DB migrations take ~60s. The healthcheck has `start_period: 60s`.
5. **Graceful degradation:** Never let LangFuse unavailability break the LLM service.

## Exit criteria

- LangFuse UI accessible at `http://localhost:3100`
- LLM calls generate traces visible in the UI
- App works normally when LangFuse is stopped
- No Redis collisions between app Redis and LangFuse Redis
- Backend logs "Langfuse tracing enabled" on startup (when configured)
