# Phase 4: LangFuse Observability --- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy self-hosted LangFuse v3 alongside the app and wire all LLM calls to be traced, with graceful degradation when LangFuse is unavailable.

**Architecture:** 7 LangFuse Docker services added to compose.yml, langfuse.openai drop-in replacement for automatic tracing, startup health check that logs status but never blocks.

**Tech Stack:** Docker Compose, LangFuse v3, ClickHouse, ZooKeeper, MinIO, Redis, langfuse Python SDK

---

## Codebase Facts

These facts were gathered during plan creation and are essential context for each task:

1. **No `backend/app/services/` directory exists yet.** It must be created (with `__init__.py`) before adding `tracing.py` or `llm.py`.
2. **`.env` already has LangFuse placeholders** (lines 64-92) but uses `LANGFUSE_BASE_URL` instead of `LANGFUSE_HOST`. The plan renames it to `LANGFUSE_HOST` for consistency with the langfuse SDK's expected env var name.
3. **`config.py` does NOT have LANGFUSE_* fields yet** despite Phase 3 spec claiming so. They must be added.
4. **`backend/app/services/llm.py` does NOT exist yet.** The plan creates it from scratch.
5. **`.env` has `REDIS_URL=` (empty).** This is safe for now but is a latent Redis collision risk --- the langfuse-server and langfuse-worker MUST have explicit Redis overrides.
6. **`compose.yml` uses `env_file: .env`** for backend/prestart services, so any env var in `.env` leaks into all services that use `env_file`. The LangFuse services also use `env_file: .env`, making explicit environment overrides critical.
7. **`compose.override.yml` sets `external: false`** for the `traefik-public` network in local dev. LangFuse services do NOT need to join `traefik-public`; they only need the default network.
8. **`backend/pyproject.toml` uses uv** with hatchling build backend.
9. **Host ports 3100 (LangFuse UI) and 9190 (MinIO API) are the ONLY allowed host port mappings** for LangFuse services. All others communicate only within the Docker network.
10. **The app's Postgres is `postgres:18`; LangFuse's must be `postgres:17`** (separate instance, separate volume).

---

## Task 1: ClickHouse Config Files

**Files:**
- `deploy/langfuse-clickhouse/macros.xml` (CREATE)
- `deploy/langfuse-clickhouse/zookeeper.xml` (CREATE)

**Steps:**

- [ ] **1.1** Create directory `deploy/langfuse-clickhouse/`:
  ```bash
  mkdir -p deploy/langfuse-clickhouse
  ```

- [ ] **1.2** Create `deploy/langfuse-clickhouse/macros.xml` with exact content:
  ```xml
  <clickhouse>
      <macros>
          <shard>01</shard>
          <replica>replica01</replica>
      </macros>
  </clickhouse>
  ```

- [ ] **1.3** Create `deploy/langfuse-clickhouse/zookeeper.xml` with exact content:
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

- [ ] **1.4** Verify both files exist and are valid XML:
  ```bash
  xmllint --noout deploy/langfuse-clickhouse/macros.xml
  xmllint --noout deploy/langfuse-clickhouse/zookeeper.xml
  ```
  If `xmllint` is not available, just `cat` both files and visually confirm they are well-formed.

- [ ] **1.5** Record learnings to `.claude/learnings-clickhouse-config-files.md` using the surfacing-subagent-learnings skill.

---

## Task 2: Environment Variables

**Files:**
- `.env` (MODIFY)

**Depends on:** Nothing

**Steps:**

- [ ] **2.1** Replace the existing LangFuse section in `.env` (lines 64-92) with the following. The section currently starts at `# =============================================================================` and ends at `LANGFUSE_BASE_URL=...`. Replace the ENTIRE block with:
  ```bash
  # =============================================================================
  # Langfuse --- self-hosted LLM tracing
  # =============================================================================

  # -- Langfuse: internal DB/service credentials --
  LANGFUSE_DB_USER=postgres
  LANGFUSE_DB_PASSWORD=langfuse_db_change_me
  LANGFUSE_DB_NAME=postgres

  LANGFUSE_CLICKHOUSE_USER=clickhouse
  LANGFUSE_CLICKHOUSE_PASSWORD=langfuse_ch_change_me

  LANGFUSE_MINIO_USER=minio
  LANGFUSE_MINIO_PASSWORD=langfuse_minio_change_me

  # -- Langfuse: auth secrets (generate unique values!) --
  # NEXTAUTH_SECRET:   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
  # SALT:              python3 -c "import secrets; print(secrets.token_hex(32))"
  # ENCRYPTION_KEY:    openssl rand -hex 32
  NEXTAUTH_URL=http://localhost:3100
  NEXTAUTH_SECRET=GENERATE_ME
  SALT=GENERATE_ME
  ENCRYPTION_KEY=GENERATE_ME

  # -- Langfuse: initial admin (first launch only) --
  LANGFUSE_INIT_USER_EMAIL=admin@example.com
  LANGFUSE_INIT_USER_NAME=Admin
  LANGFUSE_INIT_USER_PASSWORD=changeme

  # -- Langfuse: API keys for backend (fill after first launch) --
  # 1. Run: docker compose up -d
  # 2. Open: http://localhost:3100
  # 3. Log in: admin@example.com / changeme
  # 4. Create org + project, then Settings -> API Keys -> Create
  # 5. Paste sk-lf-... and pk-lf-... below, then: docker compose restart backend
  LANGFUSE_SECRET_KEY=
  LANGFUSE_PUBLIC_KEY=
  LANGFUSE_HOST=http://langfuse-server:3000
  ```

- [ ] **2.2** Generate real secrets and replace the `GENERATE_ME` placeholders:
  ```bash
  # Run each and paste the output into .env:
  python3 -c "import secrets; print(secrets.token_urlsafe(32))"   # -> NEXTAUTH_SECRET
  python3 -c "import secrets; print(secrets.token_hex(32))"       # -> SALT
  openssl rand -hex 32                                             # -> ENCRYPTION_KEY
  ```

- [ ] **2.3** Create or update `.env.example` with all LangFuse-related environment variables (placeholder values, no real secrets). If the file already exists, append the LangFuse section; if not, create it. The block should mirror the `.env` LangFuse section but with safe placeholder values:
  ```bash
  # =============================================================================
  # Langfuse --- self-hosted LLM tracing
  # =============================================================================

  LANGFUSE_DB_USER=postgres
  LANGFUSE_DB_PASSWORD=changeme
  LANGFUSE_DB_NAME=postgres

  LANGFUSE_CLICKHOUSE_USER=clickhouse
  LANGFUSE_CLICKHOUSE_PASSWORD=changeme

  LANGFUSE_MINIO_USER=minio
  LANGFUSE_MINIO_PASSWORD=changeme

  NEXTAUTH_URL=http://localhost:3100
  NEXTAUTH_SECRET=GENERATE_ME
  SALT=GENERATE_ME
  ENCRYPTION_KEY=GENERATE_ME

  LANGFUSE_INIT_USER_EMAIL=admin@example.com
  LANGFUSE_INIT_USER_NAME=Admin
  LANGFUSE_INIT_USER_PASSWORD=changeme

  LANGFUSE_SECRET_KEY=
  LANGFUSE_PUBLIC_KEY=
  LANGFUSE_HOST=http://langfuse-server:3000
  ```

- [ ] **2.4** Verify `.env` parses correctly --- no stray quotes, no duplicated keys:
  ```bash
  grep -c 'LANGFUSE_HOST' .env        # should be exactly 1
  grep -c 'LANGFUSE_BASE_URL' .env    # should be 0 (old name removed)
  grep -c 'NEXTAUTH_URL' .env         # should be exactly 1
  grep -c 'REDIS_URL' .env            # should still be 1 (app's own Redis, unrelated)
  ```

- [ ] **2.5** Record learnings to `.claude/learnings-env-variables.md` using the surfacing-subagent-learnings skill.

---

## Task 3: Docker Compose Services

**Files:**
- `compose.yml` (MODIFY)
- `compose.override.yml` (MODIFY)

**Depends on:** Task 1 (ClickHouse config files must exist for volume mounts)

**Steps:**

- [ ] **3.1** In `compose.yml`, add the following 7 services AFTER the `frontend` service definition and BEFORE the `volumes:` section. Copy this YAML exactly:

  ```yaml
    # =========================================================================
    # LangFuse v3 --- LLM observability
    # =========================================================================

    langfuse-db:
      image: postgres:17
      restart: unless-stopped
      environment:
        POSTGRES_USER: ${LANGFUSE_DB_USER:-postgres}
        POSTGRES_PASSWORD: ${LANGFUSE_DB_PASSWORD:-postgres}
        POSTGRES_DB: ${LANGFUSE_DB_NAME:-postgres}
      volumes:
        - langfuse-db-data:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U ${LANGFUSE_DB_USER:-postgres}"]
        interval: 3s
        timeout: 3s
        retries: 10

    langfuse-zookeeper:
      image: zookeeper:3.9
      restart: unless-stopped
      environment:
        ZOO_TICK_TIME: 2000
      volumes:
        - langfuse-zookeeper-data:/data
        - langfuse-zookeeper-datalog:/datalog
      healthcheck:
        test: ["CMD-SHELL", "zkServer.sh status || exit 1"]
        interval: 10s
        timeout: 5s
        retries: 5
        start_period: 30s

    langfuse-clickhouse:
      image: clickhouse/clickhouse-server:25.8
      restart: unless-stopped
      user: "101:101"
      depends_on:
        langfuse-zookeeper:
          condition: service_healthy
      environment:
        CLICKHOUSE_DB: default
        CLICKHOUSE_USER: ${LANGFUSE_CLICKHOUSE_USER:-clickhouse}
        CLICKHOUSE_PASSWORD: ${LANGFUSE_CLICKHOUSE_PASSWORD:-clickhouse}
      volumes:
        - langfuse-clickhouse-data:/var/lib/clickhouse
        - langfuse-clickhouse-logs:/var/log/clickhouse-server
        - ./deploy/langfuse-clickhouse/macros.xml:/etc/clickhouse-server/config.d/langfuse-macros.xml:ro
        - ./deploy/langfuse-clickhouse/zookeeper.xml:/etc/clickhouse-server/config.d/langfuse-zookeeper.xml:ro
      healthcheck:
        test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8123/ping"]
        interval: 5s
        timeout: 5s
        retries: 10
        start_period: 1s

    langfuse-minio:
      image: cgr.dev/chainguard/minio
      restart: unless-stopped
      entrypoint: sh
      command: -c 'mkdir -p /data/langfuse && minio server --address ":9000" --console-address ":9001" /data'
      environment:
        MINIO_ROOT_USER: ${LANGFUSE_MINIO_USER:-minio}
        MINIO_ROOT_PASSWORD: ${LANGFUSE_MINIO_PASSWORD:-miniosecret}
      ports:
        - "9190:9000"
      volumes:
        - langfuse-minio-data:/data
      healthcheck:
        test: ["CMD", "mc", "ready", "local"]
        interval: 1s
        timeout: 5s
        retries: 5
        start_period: 1s

    langfuse-cache:
      image: redis:7
      restart: unless-stopped
      healthcheck:
        test: ["CMD", "redis-cli", "ping"]
        interval: 3s
        timeout: 3s
        retries: 10

    langfuse-server:
      image: langfuse/langfuse:3
      restart: unless-stopped
      depends_on:
        langfuse-db:
          condition: service_healthy
        langfuse-clickhouse:
          condition: service_healthy
        langfuse-minio:
          condition: service_healthy
        langfuse-cache:
          condition: service_healthy
      ports:
        - "3100:3000"
      env_file:
        - .env
      environment:
        DATABASE_URL: postgresql://${LANGFUSE_DB_USER:-postgres}:${LANGFUSE_DB_PASSWORD:-postgres}@langfuse-db:5432/${LANGFUSE_DB_NAME:-postgres}
        NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost:3100}
        NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
        SALT: ${SALT}
        ENCRYPTION_KEY: ${ENCRYPTION_KEY}
        CLICKHOUSE_URL: http://langfuse-clickhouse:8123
        CLICKHOUSE_MIGRATION_URL: clickhouse://langfuse-clickhouse:9000
        CLICKHOUSE_USER: ${LANGFUSE_CLICKHOUSE_USER:-clickhouse}
        CLICKHOUSE_PASSWORD: ${LANGFUSE_CLICKHOUSE_PASSWORD:-clickhouse}
        CLICKHOUSE_CLUSTER_ENABLED: "false"
        # CRITICAL: Override any REDIS_* from .env to point at langfuse-cache
        REDIS_CONNECTION_STRING: redis://langfuse-cache:6379/0
        REDIS_HOST: langfuse-cache
        REDIS_PORT: "6379"
        LANGFUSE_CACHE_ENABLED: "true"
        # S3 event upload (langfuse-minio, internal)
        LANGFUSE_S3_EVENT_UPLOAD_BUCKET: langfuse
        LANGFUSE_S3_EVENT_UPLOAD_REGION: auto
        LANGFUSE_S3_EVENT_UPLOAD_ACCESS_KEY_ID: ${LANGFUSE_MINIO_USER:-minio}
        LANGFUSE_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY: ${LANGFUSE_MINIO_PASSWORD:-miniosecret}
        LANGFUSE_S3_EVENT_UPLOAD_ENDPOINT: http://langfuse-minio:9000
        LANGFUSE_S3_EVENT_UPLOAD_FORCE_PATH_STYLE: "true"
        LANGFUSE_S3_EVENT_UPLOAD_PREFIX: "events/"
        # S3 media upload (langfuse-minio, via host for browser downloads)
        LANGFUSE_S3_MEDIA_UPLOAD_BUCKET: langfuse
        LANGFUSE_S3_MEDIA_UPLOAD_REGION: auto
        LANGFUSE_S3_MEDIA_UPLOAD_ACCESS_KEY_ID: ${LANGFUSE_MINIO_USER:-minio}
        LANGFUSE_S3_MEDIA_UPLOAD_SECRET_ACCESS_KEY: ${LANGFUSE_MINIO_PASSWORD:-miniosecret}
        LANGFUSE_S3_MEDIA_UPLOAD_ENDPOINT: http://localhost:9190
        LANGFUSE_S3_MEDIA_UPLOAD_FORCE_PATH_STYLE: "true"
        LANGFUSE_S3_MEDIA_UPLOAD_PREFIX: "media/"
        # Initial admin
        LANGFUSE_INIT_USER_EMAIL: ${LANGFUSE_INIT_USER_EMAIL:-admin@example.com}
        LANGFUSE_INIT_USER_NAME: ${LANGFUSE_INIT_USER_NAME:-Admin}
        LANGFUSE_INIT_USER_PASSWORD: ${LANGFUSE_INIT_USER_PASSWORD:-changeme}
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:3000/api/public/health"]
        interval: 10s
        timeout: 5s
        retries: 10
        start_period: 60s

    langfuse-worker:
      image: langfuse/langfuse-worker:3
      restart: unless-stopped
      depends_on:
        langfuse-db:
          condition: service_healthy
        langfuse-clickhouse:
          condition: service_healthy
        langfuse-minio:
          condition: service_healthy
        langfuse-cache:
          condition: service_healthy
      env_file:
        - .env
      environment:
        DATABASE_URL: postgresql://${LANGFUSE_DB_USER:-postgres}:${LANGFUSE_DB_PASSWORD:-postgres}@langfuse-db:5432/${LANGFUSE_DB_NAME:-postgres}
        NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost:3100}
        NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
        SALT: ${SALT}
        ENCRYPTION_KEY: ${ENCRYPTION_KEY}
        CLICKHOUSE_URL: http://langfuse-clickhouse:8123
        CLICKHOUSE_MIGRATION_URL: clickhouse://langfuse-clickhouse:9000
        CLICKHOUSE_USER: ${LANGFUSE_CLICKHOUSE_USER:-clickhouse}
        CLICKHOUSE_PASSWORD: ${LANGFUSE_CLICKHOUSE_PASSWORD:-clickhouse}
        CLICKHOUSE_CLUSTER_ENABLED: "false"
        # CRITICAL: Same Redis override as langfuse-server
        REDIS_CONNECTION_STRING: redis://langfuse-cache:6379/0
        REDIS_HOST: langfuse-cache
        REDIS_PORT: "6379"
        LANGFUSE_CACHE_ENABLED: "true"
        LANGFUSE_S3_EVENT_UPLOAD_BUCKET: langfuse
        LANGFUSE_S3_EVENT_UPLOAD_REGION: auto
        LANGFUSE_S3_EVENT_UPLOAD_ACCESS_KEY_ID: ${LANGFUSE_MINIO_USER:-minio}
        LANGFUSE_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY: ${LANGFUSE_MINIO_PASSWORD:-miniosecret}
        LANGFUSE_S3_EVENT_UPLOAD_ENDPOINT: http://langfuse-minio:9000
        LANGFUSE_S3_EVENT_UPLOAD_FORCE_PATH_STYLE: "true"
        LANGFUSE_S3_EVENT_UPLOAD_PREFIX: "events/"
        LANGFUSE_S3_MEDIA_UPLOAD_BUCKET: langfuse
        LANGFUSE_S3_MEDIA_UPLOAD_REGION: auto
        LANGFUSE_S3_MEDIA_UPLOAD_ACCESS_KEY_ID: ${LANGFUSE_MINIO_USER:-minio}
        LANGFUSE_S3_MEDIA_UPLOAD_SECRET_ACCESS_KEY: ${LANGFUSE_MINIO_PASSWORD:-miniosecret}
        # NOTE: Worker runs inside Docker, so use the internal hostname (not localhost)
        LANGFUSE_S3_MEDIA_UPLOAD_ENDPOINT: http://langfuse-minio:9000
        LANGFUSE_S3_MEDIA_UPLOAD_FORCE_PATH_STYLE: "true"
        LANGFUSE_S3_MEDIA_UPLOAD_PREFIX: "media/"
  ```

- [ ] **3.2** In `compose.yml`, replace the `volumes:` section (currently only `app-db-data:`) with:
  ```yaml
  volumes:
    app-db-data:
    langfuse-db-data:
    langfuse-zookeeper-data:
    langfuse-zookeeper-datalog:
    langfuse-clickhouse-data:
    langfuse-clickhouse-logs:
    langfuse-minio-data:
  ```

- [ ] **3.3** In `compose.yml`, add `LANGFUSE_HOST` override to the `backend` service's `environment:` block. Add this line after the `SENTRY_DSN` line:
  ```yaml
      - LANGFUSE_HOST=http://langfuse-server:3000
  ```
  This ensures the backend always uses the Docker-internal hostname regardless of what `.env` says.

- [ ] **3.4** In `compose.yml`, add `LANGFUSE_HOST` override to the `prestart` service's `environment:` block (same line, after `SENTRY_DSN`):
  ```yaml
      - LANGFUSE_HOST=http://langfuse-server:3000
  ```

- [ ] **3.5** In `compose.override.yml`, add restart policy overrides for LangFuse services (matching the pattern used by existing services like `db`, `adminer`, `backend`). Port mappings are already defined in `compose.yml` (step 3.1) so they do NOT need to be repeated here. Insert BETWEEN the `playwright` service block (which ends around line 130 with `- 9323:9323`) and the `networks:` section. The surrounding context looks like:
  ```yaml
      # ... end of playwright service ...
      - 9323:9323

    # >>> INSERT HERE <<<

  networks:
    traefik-public:
  ```
  Add the following block in that position:
  ```yaml
    langfuse-server:
      restart: "no"
    langfuse-worker:
      restart: "no"
    langfuse-db:
      restart: "no"
    langfuse-zookeeper:
      restart: "no"
    langfuse-clickhouse:
      restart: "no"
    langfuse-minio:
      restart: "no"
    langfuse-cache:
      restart: "no"
  ```

- [ ] **3.6** Validate the compose file:
  ```bash
  docker compose config --quiet
  ```
  This should exit 0 with no output. If it fails, fix the YAML syntax.

- [ ] **3.7** Verify Redis collision prevention. Run:
  ```bash
  docker compose config | grep -A2 "REDIS_CONNECTION_STRING"
  ```
  Confirm that `langfuse-server` and `langfuse-worker` both show `redis://langfuse-cache:6379/0`, NOT any app Redis URL.

- [ ] **3.8** Verify port mappings:
  ```bash
  docker compose config | grep -B1 "published: 3100"
  docker compose config | grep -B1 "published: 9190"
  ```
  Confirm only `langfuse-server` maps 3100 and only `langfuse-minio` maps 9190.

- [ ] **3.9** Record learnings to `.claude/learnings-docker-compose-services.md` using the surfacing-subagent-learnings skill.

---

## Task 4: Backend Config and Dependencies

**Files:**
- `backend/app/core/config.py` (MODIFY)
- `backend/pyproject.toml` (MODIFY via `uv add`)

**Depends on:** Nothing

**Steps:**

- [ ] **4.1** Add LangFuse fields to the `Settings` class in `backend/app/core/config.py`. Add these 3 lines after the `FIRST_SUPERUSER_PASSWORD: str` line (around line 95), before the `_check_default_secret` method:
  ```python
    # LangFuse observability (optional)
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "http://langfuse-server:3000"
  ```

- [ ] **4.2** Add the `langfuse` dependency. From the `backend/` directory:
  ```bash
  cd backend && uv add "langfuse>=4.0.0"
  ```
  Verify it appears in `backend/pyproject.toml` under `dependencies` and that `uv.lock` is updated.

- [ ] **4.3** Verify the dependency resolves:
  ```bash
  cd backend && uv pip compile pyproject.toml --quiet | grep langfuse
  ```

- [ ] **4.4** Record learnings to `.claude/learnings-backend-config-deps.md` using the surfacing-subagent-learnings skill.

---

## Task 5: Tracing Module

**Files:**
- `backend/app/services/__init__.py` (CREATE)
- `backend/app/services/tracing.py` (CREATE)

**Depends on:** Task 4 (config fields and langfuse dependency must exist)

**Steps:**

- [ ] **5.1** Create the services directory and `__init__.py`:
  ```bash
  mkdir -p backend/app/services
  touch backend/app/services/__init__.py
  ```

- [ ] **5.2** Create `backend/app/services/tracing.py` with the following COMPLETE content:
  ```python
  """LangFuse tracing integration with graceful degradation.

  When LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY are set, tracing is active.
  When they are empty or LangFuse is unreachable, the app continues without tracing.
  """

  import logging
  import os

  from app.core.config import settings

  logger = logging.getLogger(__name__)


  def _configure_langfuse_env() -> bool:
      """Push LangFuse credentials into env vars (required by langfuse.openai drop-in).

      Returns True if all required credentials are present, False otherwise.
      """
      if not (settings.LANGFUSE_SECRET_KEY and settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_HOST):
          return False
      os.environ["LANGFUSE_SECRET_KEY"] = settings.LANGFUSE_SECRET_KEY
      os.environ["LANGFUSE_PUBLIC_KEY"] = settings.LANGFUSE_PUBLIC_KEY
      os.environ["LANGFUSE_HOST"] = settings.LANGFUSE_HOST
      return True


  def get_langfuse_handler():  # noqa: ANN201
      """Return a Langfuse CallbackHandler if configured, else None.

      Useful for LangChain-style integrations. For direct OpenAI usage,
      prefer the langfuse.openai drop-in (see llm.py).
      """
      if not _configure_langfuse_env():
          return None
      try:
          from langfuse.callback import CallbackHandler
          return CallbackHandler()
      except Exception:
          logger.exception("Failed to create Langfuse CallbackHandler")
          return None


  def get_langfuse_config() -> dict:
      """Return a config dict with Langfuse callbacks, or {} if not configured."""
      handler = get_langfuse_handler()
      if handler is None:
          return {}
      return {"callbacks": [handler]}


  def check_langfuse_auth() -> bool:
      """Check Langfuse auth at startup. Returns True if OK, False otherwise.

      Logs status but NEVER raises --- graceful degradation is mandatory.
      """
      if not (settings.LANGFUSE_SECRET_KEY and settings.LANGFUSE_PUBLIC_KEY):
          logger.warning(
              "Langfuse tracing disabled --- set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY"
          )
          return False
      try:
          from langfuse import Langfuse

          client = Langfuse(
              secret_key=settings.LANGFUSE_SECRET_KEY,
              public_key=settings.LANGFUSE_PUBLIC_KEY,
              host=settings.LANGFUSE_HOST,
          )
          client.auth_check()
          logger.info("Langfuse tracing enabled --- host=%s", settings.LANGFUSE_HOST)
          return True
      except Exception:
          logger.exception("Langfuse auth check failed --- tracing disabled")
          return False
  ```

- [ ] **5.3** Verify the module is importable (syntax check):
  ```bash
  cd backend && python -c "import ast; ast.parse(open('app/services/tracing.py').read()); print('OK')"
  ```

- [ ] **5.4** Record learnings to `.claude/learnings-tracing-module.md` using the surfacing-subagent-learnings skill.

---

## Task 6: LLM Service with LangFuse Drop-In

**Files:**
- `backend/app/services/llm.py` (CREATE)

**Depends on:** Task 4 (config fields), Task 5 (tracing module)

**Context:** `backend/app/services/llm.py` does not exist yet. The spec says Phase 3 created it, but it was not found in the codebase. This task creates it from scratch with LangFuse integration built in.

**Steps:**

- [ ] **6.1** Create `backend/app/services/llm.py` with the following COMPLETE content:
  ```python
  """LLM client factory with optional LangFuse tracing.

  Uses the langfuse.openai drop-in replacement when LangFuse credentials are
  configured. Falls back to the plain openai client otherwise.
  """

  import logging

  from openai import OpenAI

  from app.core.config import settings
  from app.services.tracing import _configure_langfuse_env

  logger = logging.getLogger(__name__)

  # -- System prompts ----------------------------------------------------------

  SYSTEM_PROMPT_CHAT = (
      "You are a friendly toki pona language tutor. "
      "Help the user learn toki pona through conversation. "
      "Keep responses concise and encouraging."
  )

  SYSTEM_PROMPT_GRADE = (
      "You are a toki pona language grader. "
      "Evaluate the user's toki pona and provide constructive feedback. "
      "Respond in JSON with keys: score (0-100), feedback (string)."
  )


  def build_chat_system_prompt() -> str:
      """Return the system prompt for chat interactions."""
      return SYSTEM_PROMPT_CHAT


  def build_grade_system_prompt() -> str:
      """Return the system prompt for grading interactions."""
      return SYSTEM_PROMPT_GRADE


  def get_llm_client() -> OpenAI:
      """Return an OpenAI client, optionally wrapped with LangFuse tracing.

      When LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY are set, uses the
      langfuse.openai drop-in replacement which automatically traces all
      chat.completions.create() calls. Otherwise returns a plain OpenAI client.
      """
      if _configure_langfuse_env():
          try:
              from langfuse.openai import OpenAI as LangfuseOpenAI

              logger.debug("Using LangFuse-instrumented OpenAI client")
              return LangfuseOpenAI(
                  base_url=str(settings.OPENAI_BASE_URL),
                  api_key=settings.OPENAI_API_TOKEN,
              )
          except Exception:
              logger.exception(
                  "Failed to create LangFuse OpenAI client, falling back to plain client"
              )

      return OpenAI(
          base_url=str(settings.OPENAI_BASE_URL),
          api_key=settings.OPENAI_API_TOKEN,
      )
  ```

  **NOTE:** The `settings.OPENAI_BASE_URL` and `settings.OPENAI_API_TOKEN` fields must already exist from Phase 3. If they do not exist in `config.py`, add them:
  ```python
  OPENAI_BASE_URL: str = ""
  OPENAI_API_TOKEN: str = ""
  MODEL: str = "gpt-4o-mini"
  ```

- [ ] **6.2** Verify the module is importable (syntax check):
  ```bash
  cd backend && python -c "import ast; ast.parse(open('app/services/llm.py').read()); print('OK')"
  ```

- [ ] **6.3** Record learnings to `.claude/learnings-llm-service.md` using the surfacing-subagent-learnings skill.

---

## Task 7: Startup Health Check

**Files:**
- `backend/app/main.py` (MODIFY)

**Depends on:** Task 5 (tracing module must exist)

**Steps:**

- [ ] **7.1** In `backend/app/main.py`, add the import for `check_langfuse_auth` near the top imports:
  ```python
  from app.services.tracing import check_langfuse_auth
  ```

- [ ] **7.2** Add a lifespan context manager to replace the bare `app` creation. Replace:
  ```python
  app = FastAPI(
      title=settings.PROJECT_NAME,
      openapi_url=f"{settings.API_V1_STR}/openapi.json",
      generate_unique_id_function=custom_generate_unique_id,
  )
  ```
  with:
  ```python
  from contextlib import asynccontextmanager


  @asynccontextmanager
  async def lifespan(app: FastAPI):
      # Startup: check LangFuse connectivity (never blocks if unavailable)
      check_langfuse_auth()
      yield
      # Shutdown: nothing to clean up


  app = FastAPI(
      title=settings.PROJECT_NAME,
      openapi_url=f"{settings.API_V1_STR}/openapi.json",
      generate_unique_id_function=custom_generate_unique_id,
      lifespan=lifespan,
  )
  ```
  Using `lifespan` instead of the deprecated `@app.on_event("startup")` pattern.

- [ ] **7.3** Verify the modified `main.py` has no syntax errors:
  ```bash
  cd backend && python -c "import ast; ast.parse(open('app/main.py').read()); print('OK')"
  ```

- [ ] **7.4** Record learnings to `.claude/learnings-startup-health-check.md` using the surfacing-subagent-learnings skill.

---

## Task 8: Testing

**Files:**
- `backend/app/tests/services/__init__.py` (CREATE)
- `backend/app/tests/services/test_tracing.py` (CREATE)
- `backend/app/tests/services/test_llm.py` (CREATE)

**Depends on:** Tasks 4, 5, 6, 7

**Steps:**

- [ ] **8.1** Create test directory:
  ```bash
  mkdir -p backend/app/tests/services
  touch backend/app/tests/services/__init__.py
  ```

- [ ] **8.2** Create `backend/app/tests/services/test_tracing.py` with the following COMPLETE content:
  ```python
  """Tests for LangFuse tracing module --- graceful degradation is the key property."""

  import os
  from unittest.mock import MagicMock, patch

  from app.services.tracing import (
      _configure_langfuse_env,
      check_langfuse_auth,
      get_langfuse_config,
      get_langfuse_handler,
  )


  # ---------------------------------------------------------------------------
  # _configure_langfuse_env
  # ---------------------------------------------------------------------------

  class TestConfigureLangfuseEnv:
      """_configure_langfuse_env() sets env vars when credentials exist."""

      def test_returns_false_when_keys_empty(self) -> None:
          with patch("app.services.tracing.settings") as mock_settings:
              mock_settings.LANGFUSE_SECRET_KEY = ""
              mock_settings.LANGFUSE_PUBLIC_KEY = ""
              mock_settings.LANGFUSE_HOST = ""

              assert _configure_langfuse_env() is False

      def test_returns_true_and_sets_env_when_configured(self) -> None:
          with patch("app.services.tracing.settings") as mock_settings:
              mock_settings.LANGFUSE_SECRET_KEY = "sk-lf-test"
              mock_settings.LANGFUSE_PUBLIC_KEY = "pk-lf-test"
              mock_settings.LANGFUSE_HOST = "http://langfuse-server:3000"

              assert _configure_langfuse_env() is True
              assert os.environ["LANGFUSE_SECRET_KEY"] == "sk-lf-test"
              assert os.environ["LANGFUSE_PUBLIC_KEY"] == "pk-lf-test"
              assert os.environ["LANGFUSE_HOST"] == "http://langfuse-server:3000"

              # Cleanup
              for key in ("LANGFUSE_SECRET_KEY", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_HOST"):
                  os.environ.pop(key, None)

      def test_returns_false_when_host_missing(self) -> None:
          with patch("app.services.tracing.settings") as mock_settings:
              mock_settings.LANGFUSE_SECRET_KEY = "sk-lf-test"
              mock_settings.LANGFUSE_PUBLIC_KEY = "pk-lf-test"
              mock_settings.LANGFUSE_HOST = ""

              assert _configure_langfuse_env() is False


  # ---------------------------------------------------------------------------
  # get_langfuse_handler
  # ---------------------------------------------------------------------------

  class TestGetLangfuseHandler:
      """get_langfuse_handler() should return None when not configured."""

      def test_returns_none_when_keys_empty(self) -> None:
          with patch("app.services.tracing.settings") as mock_settings:
              mock_settings.LANGFUSE_SECRET_KEY = ""
              mock_settings.LANGFUSE_PUBLIC_KEY = ""
              mock_settings.LANGFUSE_HOST = ""

              assert get_langfuse_handler() is None


  # ---------------------------------------------------------------------------
  # get_langfuse_config
  # ---------------------------------------------------------------------------

  class TestGetLangfuseConfig:
      """get_langfuse_config() should return {} when not configured."""

      def test_returns_empty_dict_when_not_configured(self) -> None:
          with patch("app.services.tracing.settings") as mock_settings:
              mock_settings.LANGFUSE_SECRET_KEY = ""
              mock_settings.LANGFUSE_PUBLIC_KEY = ""
              mock_settings.LANGFUSE_HOST = ""

              assert get_langfuse_config() == {}


  # ---------------------------------------------------------------------------
  # check_langfuse_auth
  # ---------------------------------------------------------------------------

  class TestCheckLangfuseAuth:
      """check_langfuse_auth() should never raise, always return bool."""

      def test_returns_false_when_keys_empty(self) -> None:
          with patch("app.services.tracing.settings") as mock_settings:
              mock_settings.LANGFUSE_SECRET_KEY = ""
              mock_settings.LANGFUSE_PUBLIC_KEY = ""

              assert check_langfuse_auth() is False

      def test_returns_false_when_connection_fails(self) -> None:
          """Graceful degradation: connection error returns False, never raises."""
          mock_langfuse_instance = MagicMock()
          mock_langfuse_instance.auth_check.side_effect = ConnectionError("refused")

          with patch("app.services.tracing.settings") as mock_settings:
              mock_settings.LANGFUSE_SECRET_KEY = "sk-lf-test"
              mock_settings.LANGFUSE_PUBLIC_KEY = "pk-lf-test"
              mock_settings.LANGFUSE_HOST = "http://langfuse-server:3000"

              with patch(
                  "langfuse.Langfuse", return_value=mock_langfuse_instance
              ):
                  assert check_langfuse_auth() is False

      def test_returns_true_when_auth_succeeds(self) -> None:
          mock_langfuse_instance = MagicMock()
          mock_langfuse_instance.auth_check.return_value = True

          with patch("app.services.tracing.settings") as mock_settings:
              mock_settings.LANGFUSE_SECRET_KEY = "sk-lf-test"
              mock_settings.LANGFUSE_PUBLIC_KEY = "pk-lf-test"
              mock_settings.LANGFUSE_HOST = "http://langfuse-server:3000"

              with patch(
                  "langfuse.Langfuse", return_value=mock_langfuse_instance
              ):
                  assert check_langfuse_auth() is True
  ```

- [ ] **8.3** Create `backend/app/tests/services/test_llm.py` with the following COMPLETE content:
  ```python
  """Tests for LLM client factory --- verifies LangFuse drop-in replacement."""

  from unittest.mock import MagicMock, patch

  from openai import OpenAI


  class TestGetLlmClient:
      """get_llm_client() returns the correct client type based on config."""

      def test_returns_langfuse_openai_when_configured(self) -> None:
          """When LANGFUSE_SECRET_KEY is set, should return LangfuseOpenAI."""
          mock_langfuse_openai_cls = MagicMock()
          mock_langfuse_openai_instance = MagicMock()
          mock_langfuse_openai_cls.return_value = mock_langfuse_openai_instance

          with (
              patch("app.services.llm._configure_langfuse_env", return_value=True),
              patch("app.services.llm.settings") as mock_settings,
              patch.dict(
                  "sys.modules",
                  {"langfuse.openai": MagicMock(OpenAI=mock_langfuse_openai_cls)},
              ),
          ):
              mock_settings.OPENAI_BASE_URL = "http://test:1234"
              mock_settings.OPENAI_API_TOKEN = "test-token"

              from app.services.llm import get_llm_client

              client = get_llm_client()
              assert client is mock_langfuse_openai_instance
              mock_langfuse_openai_cls.assert_called_once()

      def test_returns_plain_openai_when_not_configured(self) -> None:
          """When LANGFUSE_SECRET_KEY is empty, should return plain OpenAI."""
          with (
              patch("app.services.llm._configure_langfuse_env", return_value=False),
              patch("app.services.llm.settings") as mock_settings,
          ):
              mock_settings.OPENAI_BASE_URL = "http://test:1234"
              mock_settings.OPENAI_API_TOKEN = "test-token"

              from app.services.llm import get_llm_client

              client = get_llm_client()
              assert isinstance(client, OpenAI)
  ```

- [ ] **8.4** Run the tests:
  ```bash
  cd backend && python -m pytest app/tests/services/test_tracing.py app/tests/services/test_llm.py -v
  ```
  All tests should pass. If import errors occur due to missing `settings` fields or other Phase 3 dependencies, fix them before proceeding.

- [ ] **8.5** Record learnings to `.claude/learnings-testing.md` using the surfacing-subagent-learnings skill.

---

## Task 9: First Launch and Verification

**Files:** None (operational task)

**Depends on:** All previous tasks

**Steps:**

- [ ] **9.1** Build and start the full stack:
  ```bash
  docker compose up --build -d
  ```

- [ ] **9.2** Wait for LangFuse to be healthy. Monitor logs:
  ```bash
  docker compose logs -f langfuse-server 2>&1 | head -100
  # Look for: "Listening on port 3000" or "ready" message
  ```
  Alternatively, poll the health endpoint:
  ```bash
  # Retry up to 20 times with 5s intervals (total ~100s)
  for i in $(seq 1 20); do
    curl -sf http://localhost:3100/api/public/health && echo " HEALTHY" && break
    echo "Attempt $i: not ready yet..."
    sleep 5
  done
  ```

- [ ] **9.3** Verify all 7 LangFuse services are running:
  ```bash
  docker compose ps --format "table {{.Name}}\t{{.Status}}" | grep langfuse
  ```
  All should show "Up" or "healthy".

- [ ] **9.4** Verify no Redis collision. Check langfuse-server logs for Redis errors:
  ```bash
  docker compose logs langfuse-server 2>&1 | grep -i redis
  ```
  Should show successful Redis connection to `langfuse-cache:6379`, NOT any error about authentication or wrong host.

- [ ] **9.5** Open LangFuse UI at `http://localhost:3100` in the browser. Log in with:
  - Email: `admin@example.com`
  - Password: `changeme`

- [ ] **9.6** Create organization (e.g., "toki pona dojo").

- [ ] **9.7** Create project (e.g., "main").

- [ ] **9.8** Generate API keys: Settings (gear icon) -> API Keys -> Create API Key. Copy the `sk-lf-...` (Secret Key) and `pk-lf-...` (Public Key).

- [ ] **9.9** Update `.env` with the generated keys:
  ```bash
  # Replace the empty values with the actual keys:
  LANGFUSE_SECRET_KEY=sk-lf-XXXXXXXX
  LANGFUSE_PUBLIC_KEY=pk-lf-XXXXXXXX
  ```

- [ ] **9.10** Restart the backend to pick up the new keys:
  ```bash
  docker compose restart backend
  ```

- [ ] **9.11** Check backend logs for successful LangFuse auth:
  ```bash
  docker compose logs backend 2>&1 | grep -i langfuse
  ```
  Should show: `Langfuse tracing enabled --- host=http://langfuse-server:3000`

- [ ] **9.12** Make a test chat request via the API and then check the LangFuse UI for a trace.

- [ ] **9.13** Test graceful degradation: stop langfuse-server, make another chat request, confirm it succeeds:
  ```bash
  docker compose stop langfuse-server
  # Make a chat API request --- it should work normally
  curl -X POST http://localhost:8000/api/v1/chat/ -H "Content-Type: application/json" -d '{"message": "toki!"}'
  # Should return a response, not an error
  docker compose start langfuse-server
  ```

- [ ] **9.14** Record learnings to `.claude/learnings-first-launch.md` using the surfacing-subagent-learnings skill.

---

## Task 10: Curate learnings into CLAUDE.md

**Goal:** Improve CLAUDE.md files with all learnings captured during this phase.

- [ ] **Step 1:** Glob `.claude/learnings-*.md` and collect all scratch files written during this phase.
- [ ] **Step 2:** For each scratch file, dispatch a subagent with the `claude-md-improver` skill, providing the scratch file path in the prompt.
- [ ] **Step 3:** Verify all scratch files have been deleted after processing.

---

## Summary of All Files

| Action | Path |
|--------|------|
| CREATE | `deploy/langfuse-clickhouse/macros.xml` |
| CREATE | `deploy/langfuse-clickhouse/zookeeper.xml` |
| CREATE | `backend/app/services/__init__.py` |
| CREATE | `backend/app/services/tracing.py` |
| CREATE | `backend/app/services/llm.py` |
| CREATE | `backend/app/tests/services/__init__.py` |
| CREATE | `backend/app/tests/services/test_tracing.py` |
| CREATE | `backend/app/tests/services/test_llm.py` |
| MODIFY | `.env` (replace LangFuse section, add secrets) |
| CREATE/MODIFY | `.env.example` (add LangFuse placeholder variables) |
| MODIFY | `compose.yml` (add 7 services, 6 volumes, LANGFUSE_HOST overrides) |
| MODIFY | `compose.override.yml` (add restart: "no" for LangFuse services) |
| MODIFY | `backend/app/core/config.py` (add LANGFUSE_* fields to Settings) |
| MODIFY | `backend/app/main.py` (add lifespan with check_langfuse_auth) |
| MODIFY | `backend/pyproject.toml` (add langfuse>=4.0.0 via uv add) |

## Critical Invariants

1. **Redis collision prevention:** `langfuse-server` and `langfuse-worker` MUST have explicit `REDIS_CONNECTION_STRING: redis://langfuse-cache:6379/0`, `REDIS_HOST: langfuse-cache`, and `REDIS_PORT: "6379"` in their `environment:` block. The `.env` file has `REDIS_URL=` which is currently empty, but any future value would leak via `env_file: .env`.

2. **Port mappings:** Only two host ports: `3100:3000` (langfuse-server) and `9190:9000` (langfuse-minio). No other LangFuse service exposes host ports.

3. **LANGFUSE_HOST vs localhost:** Inside Docker, `LANGFUSE_HOST` must be `http://langfuse-server:3000`. The `compose.yml` backend service explicitly overrides this. The `.env` value is `http://langfuse-server:3000` as well, but the compose override is the authoritative source.

4. **Graceful degradation:** No code path in `tracing.py`, `llm.py`, or `main.py` allows a LangFuse failure to propagate as an unhandled exception. Every LangFuse call is wrapped in try/except with fallback behavior.

5. **Separate databases:** LangFuse uses `langfuse-db` (postgres:17) which is completely separate from the app's `db` (postgres:18). They have different volumes, credentials, and service names.
