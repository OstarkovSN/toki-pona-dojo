# toki pona dojo — Phase Overview (with LangFuse)

> Updated phase plan integrating LangFuse observability into the toki pona dojo build.
> Each phase has its own design spec in this directory.

---

## Design Decisions

### LangFuse placement

LangFuse is added as **Phase 4** immediately after the LLM integration (Phase 3). Rationale:
- The LLM service must exist before we can add tracing to it
- Observability should be in place before building the frontend, so we can monitor LLM calls during frontend development and testing
- It's infrastructure — better to set up early than bolt on late

### Port allocation

All default host ports on the dev machine are occupied. LangFuse services use these **host** ports (internal Docker networking is unaffected):

| Service | Default port | Assigned host port |
|---------|-------------|-------------------|
| LangFuse server (UI) | 3000 | **3100** |
| LangFuse MinIO console | 9000 | **9190** |

All other LangFuse services (PostgreSQL, ClickHouse, ZooKeeper, Redis, Worker) have no host port mappings — they communicate only via Docker internal networking.

### Phase structure change

Original global_plan.md had 9 phases. LangFuse is inserted as Phase 4; the rest shift by one:

| # | Phase | What changes vs original plan |
|---|-------|-------------------------------|
| 1 | Clean Slate | Unchanged |
| 2 | Data Layer | Unchanged |
| 3 | LLM Integration | Add `LANGFUSE_*` config fields to Settings (placeholders, not wired yet) |
| 4 | **LangFuse Observability** | **NEW** — Docker infra, tracing code, first-launch setup |
| 5 | Frontend — Structure | Was Phase 4 |
| 6 | Frontend — Exercises | Was Phase 5 |
| 7 | Frontend — Chat | Was Phase 6 |
| 8 | Progress & Persistence | Was Phase 7 |
| 9 | Security | Was Phase 8 |
| 10 | Polish | Was Phase 9 |

### .env additions for LangFuse

These are added in Phase 3 (as config placeholders) and filled in Phase 4 (first launch):

```env
# -- LangFuse: auth secrets (generate unique values) --
NEXTAUTH_SECRET=change_me
SALT=change_me
ENCRYPTION_KEY=change_me

# -- LangFuse: initial admin --
LANGFUSE_INIT_USER_EMAIL=admin@example.com
LANGFUSE_INIT_USER_NAME=Admin
LANGFUSE_INIT_USER_PASSWORD=changeme

# -- LangFuse: internal service credentials --
LANGFUSE_DB_USER=postgres
LANGFUSE_DB_PASSWORD=change_me
LANGFUSE_DB_NAME=postgres
LANGFUSE_CLICKHOUSE_USER=clickhouse
LANGFUSE_CLICKHOUSE_PASSWORD=change_me
LANGFUSE_MINIO_USER=minio
LANGFUSE_MINIO_PASSWORD=change_me
NEXTAUTH_URL=http://localhost:3100

# -- LangFuse: API keys (fill after first launch) --
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_HOST=http://langfuse-server:3000
```

### Project structure additions for LangFuse

```
.
├── .env                                    [MODIFY] add LangFuse vars
├── .env.example                            [MODIFY] add LangFuse vars
├── compose.yml                             [MODIFY] add 7 LangFuse services + volumes
├── deploy/
│   └── langfuse-clickhouse/                [ADD]
│       ├── macros.xml                      [ADD]
│       └── zookeeper.xml                   [ADD]
├── backend/
│   └── app/
│       ├── core/
│       │   └── config.py                   [MODIFY] add LANGFUSE_* settings
│       └── services/
│           ├── llm.py                      [MODIFY] add LangFuse callback handler
│           └── tracing.py                  [ADD] LangFuse tracing helpers
```

---

## Phase Specs

Each phase has a dedicated spec file:

1. [`2026-04-05-phase-01-clean-slate-design.md`](./2026-04-05-phase-01-clean-slate-design.md)
2. [`2026-04-05-phase-02-data-layer-design.md`](./2026-04-05-phase-02-data-layer-design.md)
3. [`2026-04-05-phase-03-llm-integration-design.md`](./2026-04-05-phase-03-llm-integration-design.md)
4. [`2026-04-05-phase-04-langfuse-observability-design.md`](./2026-04-05-phase-04-langfuse-observability-design.md)
5. [`2026-04-05-phase-05-frontend-structure-design.md`](./2026-04-05-phase-05-frontend-structure-design.md)
6. [`2026-04-05-phase-06-frontend-exercises-design.md`](./2026-04-05-phase-06-frontend-exercises-design.md)
7. [`2026-04-05-phase-07-frontend-chat-design.md`](./2026-04-05-phase-07-frontend-chat-design.md)
8. [`2026-04-05-phase-08-progress-persistence-design.md`](./2026-04-05-phase-08-progress-persistence-design.md)
9. [`2026-04-05-phase-09-security-design.md`](./2026-04-05-phase-09-security-design.md)
10. [`2026-04-05-phase-10-polish-design.md`](./2026-04-05-phase-10-polish-design.md)

---

## Success Criteria

The build is complete when:
- All 10 units of the skill tree are playable with all exercise types
- jan sona chat works in free/grammar/translate modes (server LLM and BYOM)
- Dictionary and grammar pages render all extracted content
- Anonymous users can play with rate-limited LLM access
- Authenticated users get unlimited LLM access + server-synced progress
- LangFuse traces all LLM calls (chat + grading) with graceful degradation
- CrowdSec blocks malicious IPs via Traefik
- Mobile layout is usable
- Dark mode works
