## Implementer - Operational Verification and Deployment Checklist

### Key Findings
- All 6 application routers (adminer-http, adminer-https, backend-http, backend-https, frontend-http, frontend-https) correctly have both `crowdsec` and `rate-limit` middleware applied
- `traefik-logs` volume is properly shared across all three compose files with correct read-only permissions (`:ro` in compose.yml, writable in override and traefik files)
- CrowdSec and bouncer services correctly use only `expose:` with no `ports:` mappings (internal container-only exposure)
- ForwardAuth middleware is correctly defined with `trustForwardHeader=true` for CrowdSec bouncer integration

### Operational Deployment Steps (Critical)
After `docker compose up -d`, follow these steps to activate CrowdSec bouncer:

1. Create bouncer in CrowdSec container:
   ```bash
   docker exec crowdsec cscli bouncers add traefik-bouncer
   ```
   This generates an API key (copy it immediately).

2. Add the key to `.env`:
   ```
   CROWDSEC_BOUNCER_KEY=<generated-key>
   ```

3. Restart the bouncer service to load the key:
   ```bash
   docker compose restart crowdsec-bouncer
   ```

4. Verify bouncer is active:
   ```bash
   docker exec crowdsec cscli bouncers list
   ```
   Should show `traefik-bouncer` with status `up-to-date`.

### Non-obvious Details
- The `STACK_NAME` variable in router names is set via `.env` (defaults to `phase-09-security` in worktree or `phase-01-clean-slate` in production)
- CrowdSec signals itself to Traefik via ForwardAuth at `http://crowdsec-bouncer:8080/api/v1/forwardAuth` — this address is hardcoded in compose.override.yml
- All checks passed: compose validation, port conflicts, volume sharing, middleware coverage
