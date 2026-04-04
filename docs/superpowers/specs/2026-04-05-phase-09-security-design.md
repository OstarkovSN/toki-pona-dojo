# Phase 9: Security

> Add CrowdSec + Traefik bouncer for DDoS protection and malicious IP blocking.

---

## Goal

Malicious IPs are automatically detected and blocked at the Traefik layer before reaching the application. The existing rate limiting from Phase 3 (slowapi) handles per-endpoint limits; CrowdSec handles network-level threats.

## Prerequisites

- All application phases complete (1-8)
- Traefik is the reverse proxy (already in the template's compose stack)

## Architecture

```
Internet → Traefik → ForwardAuth middleware → CrowdSec Bouncer → App
                                                    ↑
                                              CrowdSec Agent
                                                    ↑
                                            Traefik access logs
```

CrowdSec reads Traefik access logs, detects attack patterns (brute force, scanning, CVE probes), and creates ban decisions. The bouncer queries CrowdSec on every request via ForwardAuth and returns 403 for banned IPs.

## Steps

### 9.1 CrowdSec acquisition config — `crowdsec/acquis.yaml`

```yaml
filenames:
  - /var/log/traefik/access.log
labels:
  type: traefik
```

### 9.2 Docker Compose services

Add to `compose.yml`:

**crowdsec:**
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

No host port mapping — CrowdSec API is only accessed by the bouncer within Docker.

**crowdsec-bouncer:**
```yaml
crowdsec-bouncer:
  image: fbonalair/traefik-crowdsec-bouncer:latest
  restart: unless-stopped
  environment:
    CROWDSEC_BOUNCER_API_KEY: ${CROWDSEC_BOUNCER_KEY}
    CROWDSEC_AGENT_HOST: crowdsec:8080
  networks:
    - traefik-public
  depends_on:
    - crowdsec
```

No host port mapping.

**Volumes:**
```yaml
volumes:
  crowdsec-config:
  crowdsec-data:
  traefik-logs:
```

### 9.3 Traefik access logging

Modify the proxy/traefik service to write access logs:

```yaml
proxy:
  command:
    # ... existing commands ...
    - --accesslog=true
    - --accesslog.filepath=/var/log/traefik/access.log
    - --accesslog.bufferingsize=100
  volumes:
    - traefik-logs:/var/log/traefik
```

### 9.4 Traefik ForwardAuth middleware

Add CrowdSec bouncer as a ForwardAuth middleware. Two approaches depending on the template's Traefik config style:

**Option A: Docker labels (if using label-based config):**
```yaml
proxy:
  labels:
    - "traefik.http.middlewares.crowdsec.forwardauth.address=http://crowdsec-bouncer:8080/api/v1/forwardAuth"
    - "traefik.http.middlewares.crowdsec.forwardauth.trustForwardHeader=true"
```

Then add `crowdsec` to the middleware chain of the app's router labels.

**Option B: File-based dynamic config:**
```yaml
http:
  middlewares:
    crowdsec:
      forwardAuth:
        address: http://crowdsec-bouncer:8080/api/v1/forwardAuth
        trustForwardHeader: true
```

Check the template's existing Traefik setup to determine which approach to use. The template uses Docker labels (see `compose.override.yml`).

### 9.5 .env addition

```env
CROWDSEC_BOUNCER_KEY=changethis
```

### 9.6 Post-deploy setup

After first `docker compose up`:

```bash
# Register the bouncer and get API key
docker exec crowdsec cscli bouncers add traefik-bouncer
# Copy the generated key into .env as CROWDSEC_BOUNCER_KEY
# Restart bouncer: docker compose restart crowdsec-bouncer

# Verify CrowdSec is parsing logs
docker exec crowdsec cscli metrics

# Test blocking
docker exec crowdsec cscli decisions add --ip 192.168.1.100 --reason "test" --duration 1m
# Verify the IP gets 403, then it auto-expires
```

### 9.7 Traefik rate limiting (optional addition)

Add a Traefik-level rate limit middleware as defense-in-depth:

```yaml
# As Docker label on proxy
- "traefik.http.middlewares.rate-limit.ratelimit.average=100"
- "traefik.http.middlewares.rate-limit.ratelimit.burst=50"
- "traefik.http.middlewares.rate-limit.ratelimit.period=1s"
```

This catches flood attacks before they reach FastAPI's slowapi rate limiter.

## Files touched

| Action | Path |
|--------|------|
| ADD | `crowdsec/acquis.yaml` |
| MODIFY | `compose.yml` (add crowdsec, crowdsec-bouncer services + volumes) |
| MODIFY | `compose.override.yml` (add access logging, ForwardAuth middleware to proxy) |
| MODIFY | `.env` / `.env.example` (add CROWDSEC_BOUNCER_KEY) |

## Risks

- CrowdSec needs write access to its config/data volumes on first run to download collections. If volumes are read-only, it fails silently.
- The bouncer needs the API key from the CrowdSec agent. This is a chicken-and-egg: CrowdSec must be running first to generate the key, then the bouncer restarts with the key. Document this in the deployment checklist.
- ForwardAuth adds latency to every request (one extra HTTP call per request). For local dev this is negligible, but monitor in production.
- `traefik-logs` volume must be shared between the proxy and crowdsec services. Ensure both mount it.

## Exit criteria

- CrowdSec starts and downloads collections
- `cscli metrics` shows log parsing activity
- Manually banned IP gets 403
- Ban expires after specified duration
- Normal traffic flows unimpeded
- Access logs are being written and parsed
