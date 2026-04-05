## Implementer
- The worktree's Docker Compose cannot start its own containers because port 5432 is held by `phase-01-clean-slate-db-1`; run coverage inside the already-running `phase-01-clean-slate-backend-1` container instead
- Tests are already present in the running container (`phase-01-clean-slate-backend-1:/app/backend/tests/`) — the `docker compose cp` step is only needed when the target container is fresh
- `app/tests_pre_start.py` and `app/backend_pre_start.py` are nearly identical files; their uncovered branches (exception path, `main()`, `__main__` guard) can be tested with a single shared test pattern applied to both modules
- `app/initial_data.py` is 0% covered but is trivial to cover: call `main()` directly and patch `init_db`; or use `runpy.run_module` for the `__main__` guard
- The `recover_password_html_content` endpoint (lines 109–121 of login.py) is entirely untested despite being a superuser-only route — it generates and returns an HTMLResponse with password-reset email content
- Coverage HTML output lands at `/app/backend/htmlcov/index.html` inside the container; `docker compose cp` can retrieve it but requires the container name, not service name, when compose is not managing the container
