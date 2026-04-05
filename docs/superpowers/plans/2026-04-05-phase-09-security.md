# Phase 9: Security — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CrowdSec + Traefik bouncer for automatic DDoS protection and malicious IP blocking at the reverse proxy layer.

**Architecture:** CrowdSec agent reads Traefik access logs to detect attacks, creates ban decisions. Bouncer queries CrowdSec via Traefik ForwardAuth middleware, returning 403 for banned IPs.

```
Internet -> Traefik -> ForwardAuth middleware -> CrowdSec Bouncer -> App
                                                      |
                                                CrowdSec Agent
                                                      |
                                              Traefik access logs
```

**Tech Stack:** Docker Compose, CrowdSec, Traefik ForwardAuth, fbonalair/traefik-crowdsec-bouncer

**Port constraint:** All default host ports are occupied. CrowdSec services must have NO host port mappings -- they communicate only within the Docker network.

---

## Task 1: Create CrowdSec acquisition config

**Files:**
- ADD: `crowdsec/acquis.yaml`

### Steps

- [ ] **Step 1: Create the `crowdsec/` directory**
  ```bash
  mkdir -p /home/claude/workdirs/toki-pona-dojo/crowdsec
  ```

- [ ] **Step 2: Create `crowdsec/acquis.yaml` with the following exact content**

  ```yaml
  filenames:
    - /var/log/traefik/access.log
  labels:
    type: traefik
  ```

  This tells CrowdSec to watch the Traefik access log file (mounted read-only from the shared `traefik-logs` volume) and parse it using the `traefik` log format.

- [ ] **Step 3: Verify the file exists and has correct content**
  ```bash
  cat /home/claude/workdirs/toki-pona-dojo/crowdsec/acquis.yaml
  ```
  Expected: The two top-level keys `filenames` and `labels` with values as above.

- [ ] **Step 4: Commit**
  ```bash
  git add crowdsec/acquis.yaml
  git commit -m "Add CrowdSec acquisition config for Traefik access logs"
  ```

- [ ] **Step 5:** Record learnings to `.claude/learnings-crowdsec-acquis-config.md` using the surfacing-subagent-learnings skill.

---

## Task 2: Add CrowdSec and bouncer services to Docker Compose

**Files:**
- MODIFY: `compose.yml` (add services + volumes)
- MODIFY: `.env` (add CROWDSEC_BOUNCER_KEY)

### Steps

- [ ] **Step 1: Read current `compose.yml` to understand the structure**
  ```bash
  cat /home/claude/workdirs/toki-pona-dojo/compose.yml
  ```
  Verify the existing `volumes:` and `services:` sections. Note the current volumes block at the bottom:
  ```yaml
  volumes:
    app-db-data:
  ```

- [ ] **Step 2: Add the `crowdsec` service to `compose.yml`**

  Add the following service block after the `frontend` service (before the `volumes:` section):

  ```yaml
    crowdsec:
      image: crowdsecurity/crowdsec:latest
      restart: unless-stopped
      environment:
        COLLECTIONS: "crowdsecurity/traefik crowdsecurity/http-cve crowdsecurity/whitelist-good-actors"
        GID: "1000"
      volumes:
        - crowdsec-config:/etc/crowdsec
        - crowdsec-data:/var/lib/crowdsec/data
        - ./crowdsec/acquis.yaml:/etc/crowdsec/acquis.yaml:ro
        - traefik-logs:/var/log/traefik:ro
      networks:
        - traefik-public
      expose:
        - "8080"
  ```

  Key points:
  - `expose: ["8080"]` makes port 8080 available to other containers on the same network, but does NOT publish to the host. No host port mapping.
  - `traefik-logs` volume is mounted read-only (`:ro`) -- CrowdSec only reads the access log.
  - `crowdsec-config` and `crowdsec-data` are persistent named volumes so CrowdSec retains its downloaded collections and decisions across restarts.
  - The `COLLECTIONS` environment variable causes CrowdSec to auto-install these collections on first boot:
    - `crowdsecurity/traefik` -- parser for Traefik access log format
    - `crowdsecurity/http-cve` -- detection of known CVE exploit attempts
    - `crowdsecurity/whitelist-good-actors` -- whitelist for known good bots (Googlebot, etc.)

- [ ] **Step 3: Add the `crowdsec-bouncer` service to `compose.yml`**

  Add the following service block after the `crowdsec` service:

  ```yaml
    crowdsec-bouncer:
      image: fbonalair/traefik-crowdsec-bouncer:latest
      restart: unless-stopped
      environment:
        CROWDSEC_BOUNCER_API_KEY: ${CROWDSEC_BOUNCER_KEY}
        CROWDSEC_AGENT_HOST: crowdsec:8080
      networks:
        - traefik-public
      expose:
        - "8080"
      depends_on:
        - crowdsec
  ```

  Key points:
  - `expose: ["8080"]` makes the bouncer's port visible to other containers (Traefik calls it via ForwardAuth). No host port mapping.
  - `CROWDSEC_AGENT_HOST` points to the CrowdSec LAPI on port 8080 (internal Docker DNS).
  - `CROWDSEC_BOUNCER_API_KEY` comes from the `.env` file (set up in Step 5).
  - `depends_on: crowdsec` ensures CrowdSec starts before the bouncer.

- [ ] **Step 4: Add the new named volumes to the `volumes:` section at the bottom of `compose.yml`**

  Change the existing volumes block from:
  ```yaml
  volumes:
    app-db-data:
  ```
  to:
  ```yaml
  volumes:
    app-db-data:
    crowdsec-config:
    crowdsec-data:
    traefik-logs:
  ```

  The `traefik-logs` volume is shared between the proxy service (writes access logs) and the crowdsec service (reads access logs). Both services mount this same named volume.

- [ ] **Step 5: Add `CROWDSEC_BOUNCER_KEY` to `.env` and `.env.example`**

  Append the following to the end of `.env`:
  ```env
  # -- CrowdSec --
  # Generate after first `docker compose up` by running:
  #   docker exec crowdsec cscli bouncers add traefik-bouncer
  # Then paste the generated key here and restart the bouncer:
  #   docker compose restart crowdsec-bouncer
  CROWDSEC_BOUNCER_KEY=changethis
  ```

  Also append the following to `.env.example` so new checkouts know about this variable:
  ```env
  CROWDSEC_BOUNCER_KEY=changethis
  ```

- [ ] **Step 6: Verify compose file is valid YAML**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo && docker compose config --quiet 2>&1 | head -20
  ```
  Expected: No errors. If there are YAML syntax errors, fix them.

- [ ] **Step 7: Verify the `traefik-logs` volume appears in both service definitions**
  ```bash
  grep -n "traefik-logs" /home/claude/workdirs/toki-pona-dojo/compose.yml /home/claude/workdirs/toki-pona-dojo/compose.override.yml
  ```
  Expected: The volume appears in the `crowdsec` service volumes (from this task) and will appear in the proxy service volumes (from Task 3). At this point, only the `crowdsec` service and the top-level `volumes:` declaration should reference it. The proxy mount is added in Task 3.

- [ ] **Step 8: Commit**
  ```bash
  git add compose.yml .env .env.example
  git commit -m "Add CrowdSec agent and bouncer services to Docker Compose"
  ```

- [ ] **Step 9:** Record learnings to `.claude/learnings-crowdsec-docker-services.md` using the surfacing-subagent-learnings skill.

---

## Task 3: Configure Traefik access logging and ForwardAuth middleware

**Files:**
- MODIFY: `compose.override.yml` (proxy service: add access log filepath, volume mount, ForwardAuth labels)
- MODIFY: `compose.traefik.yml` (production traefik: add access log filepath, volume mount, ForwardAuth labels)

> **Note:** `compose.traefik.yml` modifications are a plan-level addition beyond the original spec's file list. These changes are needed to ensure CrowdSec protection applies to the production Traefik deployment, not just the development overlay.

### Steps

- [ ] **Step 1: Read current `compose.override.yml` to understand the proxy service**
  ```bash
  cat /home/claude/workdirs/toki-pona-dojo/compose.override.yml
  ```
  Note the existing proxy command list and labels. The proxy currently has:
  - `--accesslog` (enables access log to stdout)
  - No `--accesslog.filepath` (logs go to stdout, not a file)
  - No `traefik-logs` volume mount

- [ ] **Step 2: Modify the proxy `command` in `compose.override.yml` to write access logs to a file**

  In the proxy service's `command` list, replace:
  ```yaml
      # Enable the access log, with HTTP requests
      - --accesslog
  ```
  with:
  ```yaml
      # Enable the access log, write to file for CrowdSec
      - --accesslog=true
      - --accesslog.filepath=/var/log/traefik/access.log
      - --accesslog.bufferingsize=100
  ```

  The `bufferingsize=100` buffers 100 log lines before flushing to disk, reducing I/O overhead.

- [ ] **Step 3: Add the `traefik-logs` volume mount to the proxy service in `compose.override.yml`**

  In the proxy service's `volumes` list, add the traefik-logs volume. Change:
  ```yaml
    proxy:
      image: traefik:3.6
      volumes:
        - /var/run/docker.sock:/var/run/docker.sock
  ```
  to:
  ```yaml
    proxy:
      image: traefik:3.6
      volumes:
        - /var/run/docker.sock:/var/run/docker.sock
        - traefik-logs:/var/log/traefik
  ```

  This is the same named volume that `crowdsec` mounts as read-only. The proxy writes to it; CrowdSec reads from it.

- [ ] **Step 3b: Add `traefik-logs` to the top-level `volumes:` section in `compose.override.yml`**

  If `compose.override.yml` does not already have a top-level `volumes:` section, add one at the end of the file:
  ```yaml
  volumes:
    traefik-logs:
  ```
  If a `volumes:` section already exists, append `traefik-logs:` to it. This is required because `compose.override.yml` references the volume in the `proxy` service, and Docker Compose requires it to be declared at the top level in each file that uses it.

- [ ] **Step 4: Add ForwardAuth middleware labels to the proxy service in `compose.override.yml`**

  Add these labels to the proxy service's existing `labels` list:

  ```yaml
      # CrowdSec ForwardAuth middleware
      - traefik.http.middlewares.crowdsec.forwardauth.address=http://crowdsec-bouncer:8080/api/v1/forwardAuth
      - traefik.http.middlewares.crowdsec.forwardauth.trustForwardHeader=true
  ```

  This defines the `crowdsec` middleware. It will be attached to routers in Step 5.

- [ ] **Step 5: Attach the `crowdsec` middleware to application routers in `compose.yml`**

  The middleware must be added to each router that should be protected. Modify the following labels in `compose.yml`:

  **Backend HTTP router** -- change:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-backend-http.middlewares=https-redirect
  ```
  to:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-backend-http.middlewares=crowdsec,https-redirect
  ```

  **Backend HTTPS router** -- add new label (currently has no middleware):
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-backend-https.middlewares=crowdsec
  ```
  Add this after the `backend-https.tls.certresolver=le` label line.

  **Frontend HTTP router** -- change:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-frontend-http.middlewares=https-redirect
  ```
  to:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-frontend-http.middlewares=crowdsec,https-redirect
  ```

  **Frontend HTTPS router** -- add new label (currently has no middleware):
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-frontend-https.middlewares=crowdsec
  ```
  Add this after the `frontend-https.tls.certresolver=le` label line.

  **Adminer HTTP router** -- change:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-adminer-http.middlewares=https-redirect
  ```
  to:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-adminer-http.middlewares=crowdsec,https-redirect
  ```

  **Adminer HTTPS router** -- add new label (currently has no middleware):
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-adminer-https.middlewares=crowdsec
  ```
  Add this after the `adminer-https.tls.certresolver=le` label line.

- [ ] **Step 6: Apply the same changes to `compose.traefik.yml` for production**

  In `compose.traefik.yml`, the traefik service's command section already has `--accesslog`. Modify it the same way:

  Replace:
  ```yaml
      - --accesslog
  ```
  with:
  ```yaml
      - --accesslog=true
      - --accesslog.filepath=/var/log/traefik/access.log
      - --accesslog.bufferingsize=100
  ```

  Add the `traefik-logs` volume mount to the traefik service:
  ```yaml
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-public-certificates:/certificates
      - traefik-logs:/var/log/traefik
  ```

  Add ForwardAuth middleware labels to the traefik service:
  ```yaml
      - traefik.http.middlewares.crowdsec.forwardauth.address=http://crowdsec-bouncer:8080/api/v1/forwardAuth
      - traefik.http.middlewares.crowdsec.forwardauth.trustForwardHeader=true
  ```

  Add volumes to the production volumes section. Since `compose.traefik.yml` can be used standalone (not always merged with `compose.yml`), it must declare all volumes it references -- including `crowdsec-config:` and `crowdsec-data:` used by the CrowdSec services defined in `compose.yml`:
  ```yaml
  volumes:
    traefik-public-certificates:
    traefik-logs:
    crowdsec-config:
    crowdsec-data:
  ```

- [ ] **Step 7: Verify the `traefik-logs` volume is now shared correctly**
  ```bash
  grep -n "traefik-logs" /home/claude/workdirs/toki-pona-dojo/compose.yml /home/claude/workdirs/toki-pona-dojo/compose.override.yml /home/claude/workdirs/toki-pona-dojo/compose.traefik.yml
  ```
  Expected output should show `traefik-logs` in:
  1. `compose.yml` -- `crowdsec` service volumes (`:ro`), and top-level `volumes:` declaration
  2. `compose.override.yml` -- `proxy` service volumes (read-write, no `:ro`)
  3. `compose.traefik.yml` -- `traefik` service volumes (read-write), and top-level `volumes:` declaration

- [ ] **Step 8: Verify compose config is valid**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo && docker compose config --quiet 2>&1 | head -20
  ```
  Expected: No errors.

- [ ] **Step 9: Verify ForwardAuth middleware labels are present**
  ```bash
  grep -n "crowdsec" /home/claude/workdirs/toki-pona-dojo/compose.yml /home/claude/workdirs/toki-pona-dojo/compose.override.yml
  ```
  Expected: ForwardAuth middleware definition in `compose.override.yml`, and `crowdsec` in middleware chains for backend/frontend/adminer routers in `compose.yml`.

- [ ] **Step 10: Commit**
  ```bash
  git add compose.override.yml compose.yml compose.traefik.yml
  git commit -m "Configure Traefik access log file output and CrowdSec ForwardAuth middleware"
  ```

- [ ] **Step 11:** Record learnings to `.claude/learnings-traefik-access-log-forwardauth.md` using the surfacing-subagent-learnings skill.

---

## Task 4: Add Traefik rate limit middleware (defense-in-depth)

**Files:**
- MODIFY: `compose.override.yml` (add rate-limit middleware labels to proxy)
- MODIFY: `compose.yml` (attach rate-limit to routers)
- MODIFY: `compose.traefik.yml` (add rate-limit middleware labels for production)

### Steps

- [ ] **Step 1: Add rate-limit middleware definition labels to the proxy service in `compose.override.yml`**

  Add these labels to the proxy service's `labels` list (after the CrowdSec ForwardAuth labels from Task 3):

  ```yaml
      # Traefik rate limit middleware (defense-in-depth, catches floods before app layer)
      - traefik.http.middlewares.rate-limit.ratelimit.average=100
      - traefik.http.middlewares.rate-limit.ratelimit.burst=50
      - traefik.http.middlewares.rate-limit.ratelimit.period=1s
  ```

  This allows 100 requests/second average with bursts up to 50 above that. This is a generous limit that catches only obvious flood attacks -- per-endpoint limiting is handled by slowapi at the app layer.

- [ ] **Step 2: Attach `rate-limit` to application router middleware chains in `compose.yml`**

  Update the middleware chains that were modified in Task 3 to include `rate-limit`. The order matters: CrowdSec checks first (ban check is cheap), then rate-limit, then https-redirect.

  **Backend HTTP router** -- change:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-backend-http.middlewares=crowdsec,https-redirect
  ```
  to:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-backend-http.middlewares=crowdsec,rate-limit,https-redirect
  ```

  **Backend HTTPS router** -- change:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-backend-https.middlewares=crowdsec
  ```
  to:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-backend-https.middlewares=crowdsec,rate-limit
  ```

  **Frontend HTTP router** -- change:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-frontend-http.middlewares=crowdsec,https-redirect
  ```
  to:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-frontend-http.middlewares=crowdsec,rate-limit,https-redirect
  ```

  **Frontend HTTPS router** -- change:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-frontend-https.middlewares=crowdsec
  ```
  to:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-frontend-https.middlewares=crowdsec,rate-limit
  ```

  **Adminer HTTP router** -- change:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-adminer-http.middlewares=crowdsec,https-redirect
  ```
  to:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-adminer-http.middlewares=crowdsec,rate-limit,https-redirect
  ```

  **Adminer HTTPS router** -- change:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-adminer-https.middlewares=crowdsec
  ```
  to:
  ```yaml
      - traefik.http.routers.${STACK_NAME?Variable not set}-adminer-https.middlewares=crowdsec,rate-limit
  ```

- [ ] **Step 3: Add rate-limit middleware labels to `compose.traefik.yml` for production**

  Add the same rate-limit middleware definition labels to the traefik service in `compose.traefik.yml`:
  ```yaml
      - traefik.http.middlewares.rate-limit.ratelimit.average=100
      - traefik.http.middlewares.rate-limit.ratelimit.burst=50
      - traefik.http.middlewares.rate-limit.ratelimit.period=1s
  ```

- [ ] **Step 4: Verify compose config is valid**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo && docker compose config --quiet 2>&1 | head -20
  ```
  Expected: No errors.

- [ ] **Step 5: Commit**
  ```bash
  git add compose.override.yml compose.yml compose.traefik.yml
  git commit -m "Add Traefik rate-limit middleware as defense-in-depth layer"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-traefik-rate-limit.md` using the surfacing-subagent-learnings skill.

---

## Task 5: Operational verification and deployment checklist

**Files:**
- No new files. Verification and manual testing only.

### Steps

- [ ] **Step 1: Bring up the full stack**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo && docker compose up -d --build
  ```
  Wait for all services to be running:
  ```bash
  docker compose ps
  ```
  Expected: All services show status `Up` or `running`. The `crowdsec` and `crowdsec-bouncer` services should be present and running.

- [ ] **Step 2: Verify CrowdSec downloaded its collections**
  ```bash
  docker compose exec crowdsec cscli collections list
  ```
  Expected: The following collections should be listed as installed:
  - `crowdsecurity/traefik`
  - `crowdsecurity/http-cve`
  - `crowdsecurity/whitelist-good-actors`

  If collections are missing, check CrowdSec logs:
  ```bash
  docker compose logs crowdsec | tail -50
  ```

- [ ] **Step 3: Register the bouncer and obtain an API key**
  ```bash
  docker compose exec crowdsec cscli bouncers add traefik-bouncer
  ```
  Expected: A bouncer API key is printed. Copy this key.

  Then update `.env`:
  ```bash
  # Replace 'changethis' with the actual key from the previous command
  # Edit .env and set CROWDSEC_BOUNCER_KEY=<the-generated-key>
  ```

  Restart the bouncer to pick up the new key:
  ```bash
  docker compose restart crowdsec-bouncer
  ```

- [ ] **Step 4: Verify the bouncer is connected to CrowdSec**
  ```bash
  docker compose exec crowdsec cscli bouncers list
  ```
  Expected: `traefik-bouncer` should appear in the list with a recent `Last API pull` timestamp.

  Also check bouncer logs for errors:
  ```bash
  docker compose logs crowdsec-bouncer | tail -20
  ```
  Expected: No error messages. Should show successful connection to CrowdSec LAPI.

- [ ] **Step 5: Verify Traefik is writing access logs**
  ```bash
  # Make a request to generate a log entry
  curl -s http://localhost/api/v1/utils/health-check/ > /dev/null
  # Check the access log exists and has content
  docker compose exec crowdsec ls -la /var/log/traefik/access.log
  ```
  Expected: The access log file exists and has non-zero size.

- [ ] **Step 6: Verify CrowdSec is parsing the access logs**
  ```bash
  docker compose exec crowdsec cscli metrics
  ```
  Expected: The metrics output should show `traefik` in the acquisition metrics section, with a non-zero number of lines read and parsed. Look for the "Acquisition Metrics" table -- the source `/var/log/traefik/access.log` should have counts for lines read, parsed, and unparsed.

- [ ] **Step 7: Test IP banning -- add a manual ban**
  ```bash
  docker compose exec crowdsec cscli decisions add --ip 192.168.1.100 --reason "manual test ban" --duration 1m --type ban
  ```
  Expected: Decision added successfully.

  Verify the decision exists:
  ```bash
  docker compose exec crowdsec cscli decisions list
  ```
  Expected: Shows the 192.168.1.100 ban with 1m duration.

- [ ] **Step 8: Verify banned IP gets 403 (if testing from within Docker network)**

  Note: Since 192.168.1.100 is a test IP and likely not the machine's actual IP, this test is best done by banning the actual client IP.

  Find your IP as seen by Traefik:
  ```bash
  docker compose logs proxy 2>&1 | grep "GET" | tail -1
  ```
  Look for the client IP in the access log. Then ban that IP for a short duration:
  ```bash
  # Replace <your-ip> with the IP from the access log
  docker compose exec crowdsec cscli decisions add --ip <your-ip> --reason "self-test" --duration 30s --type ban
  ```

  Then immediately try to access the app:
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/utils/health-check/
  ```
  Expected: `403` (Forbidden).

  Wait 30 seconds for the ban to expire, then try again:
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/utils/health-check/
  ```
  Expected: `200` (OK) -- normal traffic flows again after ban expires.

- [ ] **Step 9: Clean up test decisions**
  ```bash
  docker compose exec crowdsec cscli decisions delete --all
  ```

- [ ] **Step 10: Verify normal traffic flows unimpeded**

  Access all protected routes and verify they work:
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/utils/health-check/
  curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
  ```
  Expected: `200` for all routes (or `301`/`302` for redirect-only routes). No 403 responses for normal traffic.

- [ ] **Step 11: Verify no host port conflicts**
  ```bash
  docker compose ps --format "table {{.Name}}\t{{.Ports}}"
  ```
  Expected: The `crowdsec` and `crowdsec-bouncer` services should show NO published host ports. Only internal ports (e.g., `8080/tcp` without a `0.0.0.0:XXXX->` prefix).

- [ ] **Step 12:** Record learnings to `.claude/learnings-security-verification.md` using the surfacing-subagent-learnings skill.

---

## Task 6: Curate learnings into CLAUDE.md

**Goal:** Improve CLAUDE.md files with all learnings captured during this phase.

- [ ] **Step 1:** Glob `.claude/learnings-*.md` and collect all scratch files written during this phase.
- [ ] **Step 2:** For each scratch file, dispatch a subagent with the `claude-md-improver` skill, providing the scratch file path in the prompt.
- [ ] **Step 3:** Verify all scratch files have been deleted after processing.

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|---------------|
| 1 | Create CrowdSec acquisition config | 2 min |
| 2 | Add CrowdSec and bouncer services to Docker Compose | 10 min |
| 3 | Configure Traefik access logging and ForwardAuth middleware | 15 min |
| 4 | Add Traefik rate limit middleware | 5 min |
| 5 | Operational verification and deployment checklist | 15 min |

**Total estimated time:** ~47 minutes

**Parallelization notes:** Task 1 is independent and can run in parallel with the early steps of Task 2. Task 3 depends on Task 2 (needs the volumes declared). Task 4 depends on Task 3 (extends the middleware chains). Task 5 depends on all previous tasks.

**Dependency graph:**
```
Task 1 --\
          --> Task 3 --> Task 4 --> Task 5
Task 2 --/
```

Tasks 1 and 2 can be dispatched in parallel. Tasks 3, 4, and 5 are sequential.

**Future improvement -- log rotation:** The `traefik-logs` volume will grow unbounded. Consider configuring Traefik's built-in log rotation via `--accesslog.maxsize` (max file size in MB before rotation) and `--accesslog.maxbackups` (number of rotated files to keep). This is not critical for initial deployment but should be addressed before production traffic ramps up.

**Chicken-and-egg note:** The `CROWDSEC_BOUNCER_KEY` in `.env` starts as a placeholder (`changethis`). After the first `docker compose up`, the operator must run `cscli bouncers add` inside the CrowdSec container to generate the real key, update `.env`, and restart the bouncer. This is documented in Task 5, Steps 3-4. The bouncer will fail to authenticate until this is done, but this does not block other services.
