# Test Gap Report — Phase 1.5 Audit

**Date:** 2026-04-05  
**Coverage tool:** `coverage run -m pytest tests/` inside Docker container  
**Overall:** 554 statements, 59 uncovered → **89% coverage**  
**Goal:** 100%

---

## app/main.py

Lines: 14 total  
Uncovered: 15  
Code: `sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)`  
Scenario: Test startup with `SENTRY_DSN` set and `ENVIRONMENT != "local"` so the Sentry init branch is taken.

---

## app/core/config.py

Lines: 69 total  
Uncovered: 20, 23, 99–106  

- **Line 20:** `return [i.strip() for i in v.split(",") if i.strip()]` — `parse_cors()` called with a plain comma-separated string (not a list, not `[`-prefixed). Scenario: pass `BACKEND_CORS_ORIGINS="http://a.com,http://b.com"` to Settings.
- **Line 23:** `raise ValueError(v)` — `parse_cors()` called with an invalid type (e.g. an integer). Scenario: pass an unsupported type to `parse_cors`.
- **Lines 99–106:** `_check_default_secret()` body — warn path (line 104) and raise path (line 105–106). Scenario:
  - Warn path: set `SECRET_KEY="changethis"` with `ENVIRONMENT="local"` and assert `warnings.warn` is called.
  - Raise path: set `SECRET_KEY="changethis"` with `ENVIRONMENT="staging"` and assert `ValueError` is raised.

---

## app/utils.py

Lines: 64 total  
Uncovered: 47, 49, 53, 59–65  

- **Line 47:** `smtp_options["tls"] = True` — `send_email()` with `SMTP_TLS=True` path (default; but the function itself is never called in tests). Scenario: mock `emails.Message.send` and call `send_email()` with emails enabled.
- **Line 49:** `smtp_options["ssl"] = True` — `send_email()` with `SMTP_TLS=False, SMTP_SSL=True`. Scenario: same mock, override settings.
- **Line 53:** `smtp_options["password"] = settings.SMTP_PASSWORD` — `send_email()` with `SMTP_PASSWORD` set. Scenario: same mock, SMTP_PASSWORD non-None.
- **Lines 59–65:** `generate_test_email()` — calls `render_email_template()` and returns `EmailData`. Scenario: call with a valid email; verify subject and html_content fields.

---

## app/api/deps.py

Lines: 35 total  
Uncovered: 36–37, 43, 45  

- **Lines 36–37:** `except (InvalidTokenError, ValidationError): raise HTTPException(403, ...)` — JWT decode failure path. Scenario: call a protected endpoint with a malformed/invalid token; assert 403.
- **Line 43:** `raise HTTPException(404, "User not found")` — valid JWT referencing a deleted/non-existent user. Scenario: create token for user, delete user, call endpoint; assert 404.
- **Line 45:** `raise HTTPException(400, "Inactive user")` — valid JWT for an inactive user. Scenario: create inactive user, call protected endpoint; assert 400.

---

## app/api/routes/login.py

Lines: 53 total  
Uncovered: 36, 88, 90, 109–121  

- **Line 36:** `raise HTTPException(400, "Inactive user")` in `login_access_token` — login attempt with an inactive user. Scenario: create inactive user, POST `/login/access-token`; assert 400.
- **Line 88:** `raise HTTPException(400, "Invalid token")` — `reset_password()` with invalid token string. Scenario: POST `/reset-password/` with garbage token; assert 400.
- **Line 90:** `raise HTTPException(400, "Inactive user")` in `reset_password` — valid token but inactive user. Scenario: create inactive user, generate valid reset token, POST reset; assert 400.
- **Lines 109–121:** `recover_password_html_content()` — entire endpoint untested. Scenario: as superuser, GET `/password-recovery-html-content/{email}` for (a) non-existent user → 404, (b) existing user → 200 HTMLResponse with email content.

---

## app/api/routes/utils.py

Lines: 14 total  
Uncovered: 20–26, 31  

- **Lines 20–26:** `test_email()` — entire endpoint body: calls `generate_test_email` and `send_email`. Scenario: as superuser (with email mocked), POST `/utils/test-email/?email_to=...`; assert 201 and `send_email` called.
- **Line 31:** `health_check()` — entire health-check endpoint. Scenario: GET `/api/v1/utils/health-check/`; assert 200 and `True` body.

---

## app/initial_data.py

Lines: 14 total  
Uncovered: 1–23 (0% — entire file)  
Code: `init()` calls `init_db(session)`; `main()` logs and calls `init()`; `if __name__ == "__main__": main()`.  
Scenario: Call `main()` directly in a test with a real/mocked session; assert `init_db` was invoked. Also test the `__main__` guard by invoking via `runpy.run_module`.

---

## app/tests_pre_start.py

Lines: 23 total  
Uncovered: 27–29, 33–35, 39  

- **Lines 27–29:** `except Exception as e: logger.error(e); raise e` — DB connection failure retry path. Scenario: mock the session to raise on first call; verify retry behaviour or that exception propagates after max attempts.
- **Lines 33–35:** `main()` function body. Scenario: call `main()` directly; assert log messages.
- **Line 39:** `if __name__ == "__main__": main()` guard. Scenario: invoke via `runpy.run_module("app.tests_pre_start", run_name="__main__")`.

---

## app/backend_pre_start.py

Lines: 23 total  
Uncovered: 27–29, 33–35, 39  

Identical structure to `app/tests_pre_start.py` above — same gaps, same test scenarios apply.

---

## Summary Table

| Module | Stmts | Miss | Cover |
|---|---|---|---|
| app/main.py | 14 | 1 | 93% |
| app/core/config.py | 69 | 6 | 91% |
| app/utils.py | 64 | 7 | 89% |
| app/api/deps.py | 35 | 4 | 89% |
| app/api/routes/login.py | 53 | 9 | 83% |
| app/api/routes/utils.py | 14 | 4 | 71% |
| app/tests_pre_start.py | 23 | 7 | 70% |
| app/backend_pre_start.py | 23 | 7 | 70% |
| app/initial_data.py | 14 | 14 | 0% |
| **TOTAL** | **554** | **59** | **89%** |

All other modules are at 100% coverage.
