## Implementer
- pytest in the container runs from `/app/backend` — module-scope fixtures sharing `word_set` between test classes works cleanly with pytest's fixture dependency resolution
- `from app.data.units import UNITS` works inside tests because the backend container has `/app/backend` on PYTHONPATH; no sys.path manipulation needed
- `docker cp` of a directory copies its contents into the destination — `docker cp backend/app/data phase-01-...-1:/app/backend/app/` copies the `data/` directory itself, not just its contents
