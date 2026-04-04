# Phase 1: Clean Slate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Items demo code from the template and rebrand to "toki pona dojo", leaving a clean app with only auth/users.

**Architecture:** Delete Items backend routes/models/crud/tests, remove frontend Items references, reset Alembic migrations with User-only schema, rebrand UI.

**Tech Stack:** FastAPI, SQLModel, Alembic, React, TanStack Router, Vite, Playwright

---

## Task 1: Remove Items from backend models

**Files:**
- MODIFY: `backend/app/models.py`

### Steps

- [ ] **Step 1: Read current models.py and verify Item classes exist**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo
  grep -n "class Item" backend/app/models.py
  ```
  Expected: Lines showing `ItemBase`, `ItemCreate`, `ItemUpdate`, `Item`, `ItemPublic`, `ItemsPublic`.

- [ ] **Step 2: Remove all Item-related classes and the User.items relationship from `backend/app/models.py`**

  Remove these classes entirely:
  - `ItemBase` (lines 71-73)
  - `ItemCreate` (lines 76-78)
  - `ItemUpdate` (lines 81-83)
  - `Item` table model (lines 87-96)
  - `ItemPublic` (lines 100-103)
  - `ItemsPublic` (lines 106-108)

  Remove from the `User` table model:
  ```python
  items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
  ```

  Remove the `Relationship` import from the sqlmodel import line (change `from sqlmodel import Field, Relationship, SQLModel` to `from sqlmodel import Field, SQLModel`).

  The resulting `models.py` should contain only: `get_datetime_utc`, `UserBase`, `UserCreate`, `UserRegister`, `UserUpdate`, `UserUpdateMe`, `UpdatePassword`, `User` (table, no `items` field), `UserPublic`, `UsersPublic`, `Message`, `Token`, `TokenPayload`, `NewPassword`.

- [ ] **Step 3: Verify no Item references remain in models.py**
  ```bash
  grep -n "Item\|item" backend/app/models.py
  ```
  Expected: No output (zero matches).

- [ ] **Step 4: Verify models.py is valid Python**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo
  python -c "import ast; ast.parse(open('backend/app/models.py').read()); print('OK')"
  ```
  Expected: `OK`

- [ ] **Step 5: Commit**
  ```bash
  git add backend/app/models.py
  git commit -m "Remove all Item model classes and User.items relationship from models.py"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-remove-items-backend-models.md` using the surfacing-subagent-learnings skill.

---

## Task 2: Remove Items from backend CRUD and routes

**Files:**
- MODIFY: `backend/app/crud.py`
- DELETE: `backend/app/api/routes/items.py`
- MODIFY: `backend/app/api/main.py`

### Steps

- [ ] **Step 1: Remove `create_item` function and Item imports from `backend/app/crud.py`**

  Remove the `create_item` function (lines 63-68).

  Change the import line from:
  ```python
  from app.models import Item, ItemCreate, User, UserCreate, UserUpdate
  ```
  to:
  ```python
  from app.models import User, UserCreate, UserUpdate
  ```

  Also remove `import uuid` from the top (it was only used by `create_item`'s `owner_id: uuid.UUID` parameter). Verify no other function uses `uuid` before removing.

- [ ] **Step 2: Verify crud.py has no Item references**
  ```bash
  grep -n "Item\|item" backend/app/crud.py
  ```
  Expected: No output.

- [ ] **Step 3: Delete the items route file**
  ```bash
  rm backend/app/api/routes/items.py
  ```

- [ ] **Step 4: Remove items router from `backend/app/api/main.py`**

  Change:
  ```python
  from app.api.routes import items, login, private, users, utils
  ```
  to:
  ```python
  from app.api.routes import login, private, users, utils
  ```

  Remove this line entirely:
  ```python
  api_router.include_router(items.router)
  ```

- [ ] **Step 5: Verify api/main.py has no Item references**
  ```bash
  grep -n "item" backend/app/api/main.py
  ```
  Expected: No output.

- [ ] **Step 6: Commit**
  ```bash
  git add backend/app/crud.py backend/app/api/main.py
  git rm backend/app/api/routes/items.py
  git commit -m "Remove Items CRUD function, route file, and router registration"
  ```

- [ ] **Step 7:** Record learnings to `.claude/learnings-remove-items-backend-crud-routes.md` using the surfacing-subagent-learnings skill.

---

## Task 3: Remove Items from backend tests and test utilities

**Files:**
- DELETE: `backend/tests/api/routes/test_items.py`
- DELETE: `backend/tests/utils/item.py`
- MODIFY: `backend/tests/conftest.py`

### Steps

- [ ] **Step 1: Delete the items test file**
  ```bash
  rm backend/tests/api/routes/test_items.py
  ```

- [ ] **Step 2: Delete the item test utility file**
  ```bash
  rm backend/tests/utils/item.py
  ```

- [ ] **Step 3: Update `backend/tests/conftest.py` to remove Item import and teardown**

  Change the imports from:
  ```python
  from app.models import Item, User
  ```
  to:
  ```python
  from app.models import User
  ```

  In the `db` fixture, remove these two lines from the teardown:
  ```python
  statement = delete(Item)
  session.execute(statement)
  ```

  The teardown should only have:
  ```python
  statement = delete(User)
  session.execute(statement)
  session.commit()
  ```

- [ ] **Step 4: Verify no Item references remain in test files**
  ```bash
  grep -rn "Item\|item" backend/tests/ --include="*.py" | grep -v "__pycache__"
  ```
  Expected: No output (zero matches). Note: if `test_users.py` or other files reference "item" in comments or unrelated context, those are acceptable — but class/import references like `Item`, `ItemCreate`, `create_random_item` must be gone.

- [ ] **Step 5: Commit**
  ```bash
  git rm backend/tests/api/routes/test_items.py backend/tests/utils/item.py
  git add backend/tests/conftest.py
  git commit -m "Remove Items test file, item test utility, and Item teardown from conftest"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-remove-items-backend-tests.md` using the surfacing-subagent-learnings skill.

---

## Task 4: Reset Alembic migrations to User-only schema

**Files:**
- DELETE: `backend/app/alembic/versions/1a31ce608336_add_cascade_delete_relationships.py`
- DELETE: `backend/app/alembic/versions/9c0a54914c78_add_max_length_for_string_varchar_.py`
- DELETE: `backend/app/alembic/versions/d98dd8ec85a3_edit_replace_id_integers_in_all_models_.py`
- DELETE: `backend/app/alembic/versions/e2412789c190_initialize_models.py`
- DELETE: `backend/app/alembic/versions/fe56fa70289e_add_created_at_to_user_and_item.py`
- ADD: `backend/app/alembic/versions/<auto>_initial_user_only.py` (autogenerated)

### Steps

- [ ] **Step 1: Delete all existing migration files**
  ```bash
  rm backend/app/alembic/versions/*.py
  ```
  Keep the `__init__.py` if present, or the directory itself. Check:
  ```bash
  ls backend/app/alembic/versions/
  ```

- [ ] **Step 2: Generate a fresh initial migration with only the User model**

  This step requires a running database. Run from inside the backend container:
  ```bash
  docker compose exec backend alembic revision --autogenerate -m "initial user only schema"
  ```
  Expected: A new migration file is created in `backend/app/alembic/versions/` that only creates the `user` table with columns: `id`, `email`, `is_active`, `is_superuser`, `full_name`, `hashed_password`, `created_at`.

- [ ] **Step 3: Inspect the generated migration to confirm no Item table references**
  ```bash
  cat backend/app/alembic/versions/*_initial_user_only_schema.py
  ```
  Expected: Only `op.create_table('user', ...)` in `upgrade()` and `op.drop_table('user')` in `downgrade()`. No references to `item`.

- [ ] **Step 4: Drop existing database tables and run migration from scratch**

  Since this is a dev environment, drop and recreate:
  ```bash
  docker compose exec backend alembic downgrade base
  docker compose exec backend alembic upgrade head
  ```
  Expected: Migration applies cleanly, only `user` table exists.

  If `downgrade base` fails because old migrations are deleted, drop the database tables directly:
  ```bash
  docker compose exec db psql -U postgres -d app -c "DROP TABLE IF EXISTS item CASCADE; DROP TABLE IF EXISTS alembic_version CASCADE; DROP TABLE IF EXISTS \"user\" CASCADE;"
  docker compose exec backend alembic upgrade head
  ```

- [ ] **Step 5: Verify database state**
  ```bash
  docker compose exec db psql -U postgres -d app -c "\dt"
  ```
  Expected: Only `user` and `alembic_version` tables.

- [ ] **Step 6: Commit**
  ```bash
  git rm backend/app/alembic/versions/1a31ce608336_add_cascade_delete_relationships.py
  git rm backend/app/alembic/versions/9c0a54914c78_add_max_length_for_string_varchar_.py
  git rm backend/app/alembic/versions/d98dd8ec85a3_edit_replace_id_integers_in_all_models_.py
  git rm backend/app/alembic/versions/e2412789c190_initialize_models.py
  git rm backend/app/alembic/versions/fe56fa70289e_add_created_at_to_user_and_item.py
  git add backend/app/alembic/versions/*_initial_user_only_schema.py
  git commit -m "Reset Alembic migrations to clean User-only initial schema"
  ```

- [ ] **Step 7:** Record learnings to `.claude/learnings-reset-alembic-migrations.md` using the surfacing-subagent-learnings skill.

---

## Task 5: Remove Items from frontend

**Files:**
- DELETE: `frontend/src/routes/_layout/items.tsx`
- DELETE: `frontend/src/components/Items/AddItem.tsx`
- DELETE: `frontend/src/components/Items/DeleteItem.tsx`
- DELETE: `frontend/src/components/Items/EditItem.tsx`
- DELETE: `frontend/src/components/Items/ItemActionsMenu.tsx`
- DELETE: `frontend/src/components/Items/columns.tsx`
- DELETE: `frontend/src/components/Pending/PendingItems.tsx`
- MODIFY: `frontend/src/components/Sidebar/AppSidebar.tsx`

### Steps

- [ ] **Step 1: Delete the Items route page**
  ```bash
  rm frontend/src/routes/_layout/items.tsx
  ```

- [ ] **Step 2: Delete the entire Items components directory**
  ```bash
  rm -r frontend/src/components/Items/
  ```

- [ ] **Step 3: Delete the PendingItems component**
  ```bash
  rm frontend/src/components/Pending/PendingItems.tsx
  ```

- [ ] **Step 4: Check if PendingUsers.tsx is the only remaining file in Pending/ — if the directory is now empty or only has PendingUsers.tsx, leave it. If PendingItems was the only file, delete the directory.**
  ```bash
  ls frontend/src/components/Pending/
  ```
  Expected: `PendingUsers.tsx` remains.

- [ ] **Step 5: Remove Items link from sidebar in `frontend/src/components/Sidebar/AppSidebar.tsx`**

  Remove the `Briefcase` import from lucide-react. Change:
  ```typescript
  import { Briefcase, Home, Users } from "lucide-react"
  ```
  to:
  ```typescript
  import { Home, Users } from "lucide-react"
  ```

  Remove the Items entry from `baseItems`. Change:
  ```typescript
  const baseItems: Item[] = [
    { icon: Home, title: "Dashboard", path: "/" },
    { icon: Briefcase, title: "Items", path: "/items" },
  ]
  ```
  to:
  ```typescript
  const baseItems: Item[] = [
    { icon: Home, title: "Dashboard", path: "/" },
  ]
  ```

- [ ] **Step 6: Verify no Item/items references remain in frontend source (excluding client/ which will be regenerated)**
  ```bash
  grep -rn "Item\|items\|Briefcase" frontend/src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v "frontend/src/client/" | grep -v "routeTree.gen.ts"
  ```
  Expected: No references to Items components, ItemsService, Briefcase icon, or items route. (Note: `SidebarMenuItem` and similar UI component names containing "Item" are fine — those are shadcn/ui components, not our Items feature.)

- [ ] **Step 7: Commit**
  ```bash
  git rm frontend/src/routes/_layout/items.tsx
  git rm -r frontend/src/components/Items/
  git rm frontend/src/components/Pending/PendingItems.tsx
  git add frontend/src/components/Sidebar/AppSidebar.tsx
  git commit -m "Remove Items route, components, and sidebar link from frontend"
  ```

- [ ] **Step 8:** Record learnings to `.claude/learnings-remove-items-frontend.md` using the surfacing-subagent-learnings skill.

---

## Task 6: Regenerate frontend API client

**Files:**
- MODIFY: `frontend/src/client/` (auto-generated, all files)

### Steps

- [ ] **Step 1: Ensure the backend is running so the OpenAPI schema is accessible**
  ```bash
  docker compose up -d backend
  ```
  Wait for the backend to be ready:
  ```bash
  docker compose exec backend curl -s http://localhost:8000/api/v1/openapi.json | python -m json.tool | head -5
  ```
  Expected: Valid JSON OpenAPI schema output.

- [ ] **Step 2: Verify the OpenAPI schema no longer contains Item endpoints**
  ```bash
  docker compose exec backend curl -s http://localhost:8000/api/v1/openapi.json | python -m json.tool | grep -i item
  ```
  Expected: No output (no Item references in the schema).

- [ ] **Step 3: Regenerate the frontend API client**
  ```bash
  cd frontend && npm run generate-client
  ```
  Expected: Client regenerated successfully. The `frontend/src/client/` directory should no longer contain `ItemsService`, `ItemCreate`, `ItemUpdate`, `ItemPublic`, `ItemsPublic` types.

- [ ] **Step 4: Verify no Item types in the generated client**
  ```bash
  grep -rn "Item" frontend/src/client/ | grep -v "node_modules"
  ```
  Expected: No output (or only unrelated matches like "MenuItem" if present in generated code).

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/client/
  git commit -m "Regenerate frontend API client without Items endpoints"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-regenerate-frontend-client.md` using the surfacing-subagent-learnings skill.

---

## Task 7: Rebrand UI to "toki pona dojo"

**Files:**
- MODIFY: `frontend/index.html`
- MODIFY: `frontend/src/routes/_layout/index.tsx`
- MODIFY: `frontend/src/routes/_layout/admin.tsx`
- MODIFY: `frontend/src/routes/_layout/settings.tsx`
- MODIFY: `frontend/src/routes/login.tsx`
- MODIFY: `frontend/src/routes/signup.tsx`
- MODIFY: `frontend/src/routes/recover-password.tsx`
- MODIFY: `frontend/src/routes/reset-password.tsx`
- MODIFY: `frontend/src/components/Common/Logo.tsx`
- MODIFY: `frontend/src/components/Common/Footer.tsx`

### Steps

- [ ] **Step 1: Update `frontend/index.html` title**

  Change:
  ```html
  <title>Full Stack FastAPI Project</title>
  ```
  to:
  ```html
  <title>toki pona dojo</title>
  ```

- [ ] **Step 2: Update page titles across all route files**

  In each of the following files, replace the `title` in the `head` meta:

  - `frontend/src/routes/_layout/index.tsx`: `"Dashboard - FastAPI Template"` -> `"Dashboard - toki pona dojo"`
  - `frontend/src/routes/_layout/admin.tsx`: `"Admin - FastAPI Template"` -> `"Admin - toki pona dojo"`
  - `frontend/src/routes/_layout/settings.tsx`: `"Settings - FastAPI Template"` -> `"Settings - toki pona dojo"`
  - `frontend/src/routes/login.tsx`: `"Log In - FastAPI Template"` -> `"Log In - toki pona dojo"`
  - `frontend/src/routes/signup.tsx`: `"Sign Up - FastAPI Template"` -> `"Sign Up - toki pona dojo"`
  - `frontend/src/routes/recover-password.tsx`: `"Recover Password - FastAPI Template"` -> `"Recover Password - toki pona dojo"`
  - `frontend/src/routes/reset-password.tsx`: `"Reset Password - FastAPI Template"` -> `"Reset Password - toki pona dojo"`

- [ ] **Step 3: Update the dashboard welcome message in `frontend/src/routes/_layout/index.tsx`**

  Replace the existing Dashboard component body:
  ```tsx
  function Dashboard() {
    const { user: currentUser } = useAuth()

    return (
      <div>
        <div>
          <h1 className="text-2xl truncate max-w-sm">
            Hi, {currentUser?.full_name || currentUser?.email} 👋
          </h1>
          <p className="text-muted-foreground">
            Welcome back, nice to see you again!!!
          </p>
        </div>
      </div>
    )
  }
  ```
  with:
  ```tsx
  function Dashboard() {
    const { user: currentUser } = useAuth()

    return (
      <div>
        <div>
          <h1 className="text-2xl truncate max-w-sm">
            toki pona dojo
          </h1>
          <p className="text-muted-foreground">
            o kama pona, {currentUser?.full_name || currentUser?.email}!
          </p>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 4: Update Logo component in `frontend/src/components/Common/Logo.tsx`**

  Replace the image-based logo with a text-based logo. The component currently imports FastAPI SVGs and renders `<img>` tags. Replace the entire component with a text-based version:

  ```tsx
  import { Link } from "@tanstack/react-router"

  import { cn } from "@/lib/utils"

  interface LogoProps {
    variant?: "full" | "icon" | "responsive"
    className?: string
    asLink?: boolean
  }

  export function Logo({
    variant = "full",
    className,
    asLink = true,
  }: LogoProps) {
    const content =
      variant === "responsive" ? (
        <>
          <span
            className={cn(
              "text-lg font-bold group-data-[collapsible=icon]:hidden",
              className,
            )}
          >
            toki pona dojo
          </span>
          <span
            className={cn(
              "text-lg font-bold hidden group-data-[collapsible=icon]:block",
              className,
            )}
          >
            tp
          </span>
        </>
      ) : (
        <span
          className={cn(
            variant === "full" ? "text-lg font-bold" : "text-lg font-bold",
            className,
          )}
        >
          {variant === "full" ? "toki pona dojo" : "tp"}
        </span>
      )

    if (!asLink) {
      return content
    }

    return <Link to="/">{content}</Link>
  }
  ```

  This removes the dependency on FastAPI SVG images and the `useTheme` hook import (from this component).

- [ ] **Step 5: Update Footer in `frontend/src/components/Common/Footer.tsx`**

  Replace `"Full Stack FastAPI Template"` with `"toki pona dojo"` in the footer text. Remove the FastAPI-specific social links. Replace with:

  ```tsx
  export function Footer() {
    const currentYear = new Date().getFullYear()

    return (
      <footer className="border-t py-4 px-6">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            toki pona dojo - {currentYear}
          </p>
        </div>
      </footer>
    )
  }
  ```

  Remove the unused imports (`FaGithub`, `FaLinkedinIn`, `FaXTwitter`, `socialLinks`).

- [ ] **Step 6: Verify no "FastAPI Template" or "Full Stack" branding references remain**
  ```bash
  grep -rn "FastAPI Template\|Full Stack FastAPI\|fastapi-logo\|fastapi-icon" frontend/src/ --include="*.tsx" --include="*.ts" --include="*.html"
  ```
  Expected: No output.

  Also check index.html:
  ```bash
  grep -n "FastAPI\|Full Stack" frontend/index.html
  ```
  Expected: No output.

- [ ] **Step 7: Commit**
  ```bash
  git add frontend/index.html \
    frontend/src/routes/_layout/index.tsx \
    frontend/src/routes/_layout/admin.tsx \
    frontend/src/routes/_layout/settings.tsx \
    frontend/src/routes/login.tsx \
    frontend/src/routes/signup.tsx \
    frontend/src/routes/recover-password.tsx \
    frontend/src/routes/reset-password.tsx \
    frontend/src/components/Common/Logo.tsx \
    frontend/src/components/Common/Footer.tsx
  git commit -m "Rebrand UI from FastAPI Template to toki pona dojo"
  ```

- [ ] **Step 8:** Record learnings to `.claude/learnings-rebrand-ui.md` using the surfacing-subagent-learnings skill.

---

## Task 8: Full verification and cleanup

**Files:**
- No new files. Verification only.

### Steps

- [ ] **Step 1: Run a codebase-wide grep to confirm no "Item" model/class references remain**
  ```bash
  grep -rn "class Item\|ItemBase\|ItemCreate\|ItemUpdate\|ItemPublic\|ItemsPublic\|create_item\|create_random_item" backend/ frontend/src/ --include="*.py" --include="*.tsx" --include="*.ts" | grep -v "__pycache__" | grep -v "node_modules" | grep -v "frontend/src/client/" | grep -v "routeTree.gen.ts"
  ```
  Expected: No output.

- [ ] **Step 2: Run backend tests**
  ```bash
  docker compose exec backend pytest -v
  ```
  Expected: All tests pass. The `test_items.py` file should no longer exist. User tests, login tests, and utility tests should all pass.

- [ ] **Step 3: Run backend linting and type checks**
  ```bash
  docker compose exec backend bash -c "ruff check . && mypy ."
  ```
  Expected: Clean output, no errors.

- [ ] **Step 4: Run frontend build to confirm no TypeScript errors**
  ```bash
  cd frontend && npm run build
  ```
  Expected: Build succeeds with no errors. TanStack Router will regenerate `routeTree.gen.ts` without the items route.

- [ ] **Step 5: Run frontend lint**
  ```bash
  cd frontend && npm run lint
  ```
  Expected: No errors.

- [ ] **Step 6: Start the full stack and verify manually**
  ```bash
  docker compose up --build -d
  ```
  Then verify:
  - `http://localhost:5173` loads the login page
  - After login, the dashboard shows "toki pona dojo" and "o kama pona, {name}!"
  - The sidebar shows only "Dashboard" and (for superusers) "Admin" — no "Items" link
  - No console errors in the browser (check with: navigate to a few pages)
  - The footer shows "toki pona dojo - 2026"
  - The browser tab title shows "toki pona dojo"

- [ ] **Step 7: Run Playwright E2E tests (if any exist that don't reference Items)**
  ```bash
  cd frontend && npm run test
  ```
  Expected: Tests pass or skip. Any Item-related E2E tests should have been deleted with the Items route.

- [ ] **Step 8: Final commit (if any linting auto-fixes were applied)**
  ```bash
  git status
  ```
  If there are changes:
  ```bash
  git add -A
  git commit -m "Apply auto-fixes from linting and final cleanup"
  ```

- [ ] **Step 9:** Record learnings to `.claude/learnings-full-verification.md` using the surfacing-subagent-learnings skill.

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|---------------|
| 1 | Remove Items from backend models | 5 min |
| 2 | Remove Items from backend CRUD and routes | 5 min |
| 3 | Remove Items from backend tests and utilities | 5 min |
| 4 | Reset Alembic migrations to User-only schema | 10 min |
| 5 | Remove Items from frontend | 5 min |
| 6 | Regenerate frontend API client | 5 min |
| 7 | Rebrand UI to "toki pona dojo" | 10 min |
| 8 | Full verification and cleanup | 10 min |

**Total estimated time:** ~55 minutes

**Parallelization notes:** Tasks 1-3 are sequential (each depends on prior removals compiling). Task 4 depends on Task 1 (models must be clean before generating migration). Task 5 is independent of Tasks 1-4 (frontend changes). Task 6 depends on Tasks 1-2 (backend must be clean for OpenAPI schema). Task 7 is independent. Task 8 depends on all others.

**Dependency graph:**
```
Task 1 -> Task 2 -> Task 3 -> Task 4
                                  \
                                   -> Task 6 -> Task 8
Task 5 -------------------------/
Task 7 -------------------------/
```

Possible parallel dispatch: Tasks 5 and 7 can run in parallel with Tasks 1-4. Task 6 waits for backend tasks (1-2) and Task 5. Task 8 waits for all.
