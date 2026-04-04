# Phase 1: Clean Slate

> Remove the template's demo "Items" feature, rebrand to toki pona dojo, verify the app still builds.

---

## Goal

A running app with no Items traces — just auth, users, and a blank canvas ready for toki pona content.

## Steps

### 1.1 Remove Items from backend

**Files to delete:**
- `backend/app/api/routes/items.py`

**Files to modify:**
- `backend/app/models.py` — remove `Item`, `ItemBase`, `ItemCreate`, `ItemUpdate`, `ItemPublic`, `ItemsPublic` classes and the `Item` table model. Keep all `User*` and `Message` classes.
- `backend/app/crud.py` — remove any item-related CRUD functions. Keep user CRUD.
- `backend/app/api/main.py` — remove `items.router` from the router includes.
- `backend/app/main.py` — no changes expected (items aren't registered here directly).

**Tests to update:**
- `backend/app/tests/` — delete or gut any `test_items*.py` files. Verify remaining tests pass.

**Migration:**
- Create a new Alembic migration that drops the `item` table: `alembic revision --autogenerate -m "remove items table"`
- Or, since this is a fresh project, consider resetting migrations entirely (delete all versions, run `alembic revision --autogenerate -m "initial"` with only the User model).

### 1.2 Remove Items from frontend

**Files to delete:**
- `frontend/src/routes/_layout/items.tsx`

**Files to modify:**
- `frontend/src/routes/_layout/index.tsx` — this is the dashboard. Replace the items dashboard content with a placeholder "toki pona dojo" welcome message.
- `frontend/src/routes/_layout.tsx` — remove the "Items" link from the sidebar navigation.
- `frontend/src/components/Items/` (if exists) — delete the entire directory.
- `frontend/src/client/` — regenerate the API client after backend changes (the template uses openapi-ts codegen).

### 1.3 Rebrand

- `frontend/index.html` — change `<title>` to "toki pona dojo" and update meta description.
- `frontend/src/routes/_layout.tsx` — change any "Full Stack App" branding to "toki pona dojo".
- Any other template branding in the sidebar/header.

### 1.4 Verify

- Run `docker compose up --build` (use override for local dev)
- Confirm the app loads at `http://localhost:5173` (or whichever frontend port)
- Confirm login/signup still work
- Confirm no 404s or console errors from removed items references
- Run backend tests: `docker compose exec backend pytest`

## Files touched

| Action | Path |
|--------|------|
| DELETE | `backend/app/api/routes/items.py` |
| DELETE | `frontend/src/routes/_layout/items.tsx` |
| MODIFY | `backend/app/models.py` |
| MODIFY | `backend/app/crud.py` |
| MODIFY | `backend/app/api/main.py` |
| MODIFY | `frontend/src/routes/_layout/index.tsx` |
| MODIFY | `frontend/src/routes/_layout.tsx` |
| MODIFY | `frontend/index.html` |
| ADD | `backend/alembic/versions/xxx_remove_items.py` (or reset) |

## Risks

- The template's test suite may have fixtures that create items. These need to be removed or the fixtures will fail.
- The frontend API client codegen must be re-run after backend model changes, or the frontend will reference deleted types.
- The admin page (`frontend/src/routes/_layout/admin.tsx`) may reference items — check and clean up.

## Exit criteria

- `docker compose up --build` succeeds
- Frontend loads without console errors
- Backend tests pass
- No references to "Item" remain in the codebase (grep confirms)
