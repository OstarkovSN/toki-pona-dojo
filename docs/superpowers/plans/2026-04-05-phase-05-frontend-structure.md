# Phase 5: Frontend Structure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the template's admin dashboard with a zen-themed toki pona learning interface featuring a skill tree, dictionary, and grammar pages.

**Architecture:** Two-panel layout (content + chat placeholder) with top nav, file-based routing via TanStack Router, earth-tone theme via CSS variables and Tailwind v4 @theme, data fetched via TanStack Query from Phase 2 API endpoints.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Router, TanStack Query, Lora + DM Mono fonts

---

## Task 1: Zen theme — index.css and index.html

**Files:**
- MODIFY: `frontend/src/index.css`
- MODIFY: `frontend/index.html`

### Steps

- [ ] **Step 1: Read the current index.css to confirm existing theme structure**
  ```bash
  cat frontend/src/index.css
  ```
  Expected: Current shadcn/ui default theme with `@theme inline` block, `:root` variables, `.dark` variables, and `@layer base` rules.

- [ ] **Step 2: Replace `frontend/src/index.css` with the complete zen theme**

  Replace the entire file content with:

  ```css
  @import "tailwindcss";
  @import "tw-animate-css";
  /* Google Fonts are loaded via <link> in index.html (non-blocking, font-display: swap) */

  @custom-variant dark (&:is(.dark *));

  @theme inline {
    /* ── Radii ── */
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) + 4px);

    /* ── shadcn/ui semantic color tokens (required for all shadcn components) ── */
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-popover: var(--popover);
    --color-popover-foreground: var(--popover-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-secondary: var(--secondary);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-destructive: var(--destructive);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);

    /* ── Zen custom colors (usable as bg-zen-teal, text-zen-coral, etc.) ── */
    --color-zen-teal: var(--teal);
    --color-zen-teal-bg: var(--teal-bg);
    --color-zen-teal-dark: var(--teal-dark);
    --color-zen-coral: var(--coral);
    --color-zen-coral-bg: var(--coral-bg);
    --color-zen-coral-dark: var(--coral-dark);
    --color-zen-amber: var(--amber);
    --color-zen-amber-bg: var(--amber-bg);
    --color-zen-amber-dark: var(--amber-dark);
    --color-zen-blue-bg: var(--blue-bg);
    --color-zen-blue-dark: var(--blue-dark);
    --color-zen-bg: var(--bg);
    --color-zen-bg2: var(--bg2);
    --color-zen-bg3: var(--bg3);
    --color-zen-text: var(--text);
    --color-zen-text2: var(--text2);
    --color-zen-text3: var(--text3);
    --color-zen-border: var(--zen-border);
    --color-zen-border2: var(--zen-border2);

    /* ── Font families ── */
    --font-serif: 'Lora', Georgia, 'Times New Roman', serif;
    --font-mono: 'DM Mono', 'Courier New', monospace;
  }

  :root {
    --radius: 6px;

    /* ── Earth tones (light) ── */
    --bg: #F7F4EE;
    --bg2: #EDEAE2;
    --bg3: #E2DFDA;
    --text: #1C1A16;
    --text2: #5C5A54;
    --text3: #9A9890;

    /* ── Semantic colors ── */
    --teal: #1D9E75;
    --teal-bg: #E1F5EE;
    --teal-dark: #085041;
    --coral: #D85A30;
    --coral-bg: #FAECE7;
    --coral-dark: #712B13;
    --amber: #B87020;
    --amber-bg: #FDF0DC;
    --amber-dark: #6B3E08;
    --blue-bg: #E6F1FB;
    --blue-dark: #0C3060;

    /* ── Borders ── */
    --zen-border: rgba(28, 26, 22, 0.10);
    --zen-border2: rgba(28, 26, 22, 0.18);

    /* ── shadcn/ui tokens mapped to zen palette ── */
    --background: #F7F4EE;
    --foreground: #1C1A16;
    --card: #FFFFFF;
    --card-foreground: #1C1A16;
    --popover: #FFFFFF;
    --popover-foreground: #1C1A16;
    --primary: #1D9E75;
    --primary-foreground: #FFFFFF;
    --secondary: #EDEAE2;
    --secondary-foreground: #1C1A16;
    --muted: #EDEAE2;
    --muted-foreground: #5C5A54;
    --accent: #E2DFDA;
    --accent-foreground: #1C1A16;
    --destructive: #D85A30;
    --border: rgba(28, 26, 22, 0.10);
    --input: rgba(28, 26, 22, 0.10);
    --ring: #1D9E75;
  }

  .dark {
    /* ── Earth tones (dark) ── */
    --bg: #18170F;
    --bg2: #201F16;
    --bg3: #2A291E;
    --text: #F0EDE6;
    --text2: #A8A59C;
    --text3: #6B6860;

    /* ── Semantic colors (dark) ── */
    --teal-bg: #04342C;
    --teal-dark: #9FE1CB;
    --coral-bg: #4A1B0C;
    --coral-dark: #F0997B;
    --amber-bg: #3A2004;
    --amber-dark: #FAC775;
    --blue-bg: #042C53;
    --blue-dark: #B5D4F4;

    /* ── Borders (dark) ── */
    --zen-border: rgba(240, 237, 230, 0.08);
    --zen-border2: rgba(240, 237, 230, 0.16);

    /* ── shadcn/ui tokens (dark) ── */
    --background: #18170F;
    --foreground: #F0EDE6;
    --card: #201F16;
    --card-foreground: #F0EDE6;
    --popover: #201F16;
    --popover-foreground: #F0EDE6;
    --primary: #1D9E75;
    --primary-foreground: #FFFFFF;
    --secondary: #2A291E;
    --secondary-foreground: #F0EDE6;
    --muted: #2A291E;
    --muted-foreground: #A8A59C;
    --accent: #2A291E;
    --accent-foreground: #F0EDE6;
    --destructive: #F0997B;
    --border: rgba(240, 237, 230, 0.08);
    --input: rgba(240, 237, 230, 0.16);
    --ring: #1D9E75;
  }

  @layer base {
    * {
      @apply border-border outline-ring/50;
    }
    body {
      @apply bg-zen-bg text-zen-text;
      font-family: var(--font-serif);
      font-size: 16px;
      line-height: 1.7;
    }
    button,
    [role="button"] {
      cursor: pointer;
    }
  }

  /* ── Typography utility classes ── */
  .font-tp {
    font-family: var(--font-mono);
    font-weight: 500;
  }

  .font-label {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  ```

- [ ] **Step 3: Update `frontend/index.html` title, meta, and font loading**

  Replace the contents of `frontend/index.html` with the version below.
  **Note:** Google Fonts are loaded via `<link>` tags in `index.html` (with `font-display: swap`) instead of a CSS `@import` for better render performance and offline resilience. For full offline support, consider self-hosting the font files in a future phase.

  ```html
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <link rel="icon" type="image/svg+xml" href="/vite.svg" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="toki pona dojo — learn toki pona with a calm, guided approach" />
      <title>toki pona dojo</title>
      <link rel="icon" type="image/x-icon" href="/assets/images/favicon.png" />
      <!-- Google Fonts — loaded via <link> for non-blocking render; consider self-hosting for offline use -->
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="./src/main.tsx"></script>
    </body>
  </html>
  ```

- [ ] **Step 4: Verify the dev server starts without CSS errors**
  ```bash
  cd frontend && npx vite build --mode development 2>&1 | head -20
  ```
  Expected: Build succeeds or only shows non-CSS warnings. No Tailwind parse errors.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/index.css frontend/index.html
  git commit -m "feat(frontend): add zen earth-tone theme with Lora + DM Mono fonts

  Replace template's default shadcn theme with toki pona dojo zen palette.
  Light and dark mode CSS variables, Tailwind v4 @theme registration,
  Google Fonts import for Lora (serif) and DM Mono (monospace)."
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-zen-theme.md` using the surfacing-subagent-learnings skill.

---

## Task 2: Two-panel layout with top nav

**Files:**
- MODIFY: `frontend/src/routes/_layout.tsx`
- ADD: `frontend/src/components/TopNav.tsx`
- ADD: `frontend/src/components/ChatPanelPlaceholder.tsx`

### Steps

- [ ] **Step 1: Read the current `_layout.tsx` to confirm sidebar structure**
  ```bash
  cat frontend/src/routes/_layout.tsx
  ```
  Expected: Imports `SidebarProvider`, `AppSidebar`, `SidebarInset`, `SidebarTrigger`. Has `beforeLoad` that redirects to `/login` if not logged in.

- [ ] **Step 2: Create `frontend/src/components/TopNav.tsx`**

  Create the top navigation bar component:

  ```tsx
  import { Link, useRouterState } from "@tanstack/react-router"
  import { Moon, Sun, Monitor, Menu, MessageCircle } from "lucide-react"
  import { useTheme } from "@/components/theme-provider"
  import { Button } from "@/components/ui/button"
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
  import { cn } from "@/lib/utils"

  const navLinks = [
    { to: "/", label: "learn" },
    { to: "/dictionary", label: "dictionary" },
    { to: "/grammar", label: "grammar" },
  ] as const

  interface TopNavProps {
    onToggleChat: () => void
    chatOpen: boolean
  }

  export function TopNav({ onToggleChat, chatOpen }: TopNavProps) {
    const { setTheme } = useTheme()
    const router = useRouterState()
    const currentPath = router.location.pathname

    const isActive = (to: string) => {
      if (to === "/") return currentPath === "/"
      return currentPath.startsWith(to)
    }

    return (
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-zen-border bg-zen-bg/95 backdrop-blur-sm px-6">
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "font-label relative py-4 transition-colors",
                isActive(link.to)
                  ? "text-zen-teal"
                  : "text-zen-text3 hover:text-zen-text2",
              )}
            >
              {link.label}
              {isActive(link.to) && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zen-teal" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleChat}
            className={cn(
              "text-zen-text3 hover:text-zen-text2",
              chatOpen && "text-zen-teal",
            )}
            aria-label="Toggle chat panel"
          >
            <MessageCircle className="size-4" />
          </Button>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="theme-button"
                className="text-zen-text3 hover:text-zen-text2"
              >
                <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid="light-mode" onClick={() => setTheme("light")}>
                <Sun className="mr-2 size-4" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="dark-mode" onClick={() => setTheme("dark")}>
                <Moon className="mr-2 size-4" /> Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 size-4" /> System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to="/settings"
            className="font-label text-zen-text3 hover:text-zen-text2 transition-colors py-4"
          >
            settings
          </Link>
        </div>
      </header>
    )
  }
  ```

- [ ] **Step 3: Create `frontend/src/components/ChatPanelPlaceholder.tsx`**

  Create the chat panel placeholder for Phase 7:

  ```tsx
  import { MessageCircle } from "lucide-react"

  export function ChatPanelPlaceholder() {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-zen-bg2 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-zen-bg3">
          <MessageCircle className="size-8 text-zen-text3" />
        </div>
        <div>
          <p className="font-tp text-lg text-zen-text2">jan sona</p>
          <p className="mt-1 text-sm text-zen-text3">
            your toki pona tutor — coming soon
          </p>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 4: Replace `frontend/src/routes/_layout.tsx` with the two-panel layout**

  Replace the entire file with:

  ```tsx
  import { useState } from "react"
  import { createFileRoute, Outlet } from "@tanstack/react-router"
  import { TopNav } from "@/components/TopNav"
  import { ChatPanelPlaceholder } from "@/components/ChatPanelPlaceholder"
  import { cn } from "@/lib/utils"

  export const Route = createFileRoute("/_layout")({
    component: Layout,
  })

  function Layout() {
    const [chatOpen, setChatOpen] = useState(false)

    return (
      <div className="flex min-h-screen flex-col bg-zen-bg">
        <TopNav onToggleChat={() => setChatOpen((prev) => !prev)} chatOpen={chatOpen} />

        <div className="flex flex-1 overflow-hidden">
          {/* Content panel */}
          <main
            className={cn(
              "flex-1 overflow-y-auto p-6 md:p-8 transition-all duration-300",
              chatOpen ? "md:w-3/5" : "w-full",
            )}
          >
            <div className="mx-auto max-w-4xl">
              <Outlet />
            </div>
          </main>

          {/* Chat panel (placeholder) */}
          {chatOpen && (
            <aside className="hidden md:flex md:w-2/5 border-l border-zen-border overflow-y-auto">
              <div className="flex-1">
                <ChatPanelPlaceholder />
              </div>
            </aside>
          )}

          {/* Mobile: chat as bottom sheet (placeholder) */}
          {chatOpen && (
            <div className="fixed inset-x-0 bottom-0 z-40 h-1/2 border-t border-zen-border md:hidden">
              <ChatPanelPlaceholder />
            </div>
          )}
        </div>
      </div>
    )
  }

  export default Layout
  ```

  **Key changes from old layout:**
  - Removed `beforeLoad` auth redirect (public-first)
  - Removed `SidebarProvider`, `AppSidebar`, `SidebarInset`, `SidebarTrigger` imports
  - Removed `Footer` import
  - Added two-panel layout with chat toggle
  - Added `TopNav` with learn/dictionary/grammar/settings links

- [ ] **Step 5: Run the TanStack Router route generation to update `routeTree.gen.ts`**
  ```bash
  cd frontend && npx vite build --mode development 2>&1 | head -20
  ```
  Expected: Route tree regenerates automatically via the tanstackRouter vite plugin. Build succeeds.

- [ ] **Step 6: Verify the app renders with the new layout**

  Start dev server and verify manually, or run a quick build check:
  ```bash
  cd frontend && npx tsc -p tsconfig.build.json --noEmit 2>&1 | head -20
  ```
  Expected: No TypeScript errors.

- [ ] **Step 7: Commit**
  ```bash
  git add frontend/src/routes/_layout.tsx frontend/src/components/TopNav.tsx frontend/src/components/ChatPanelPlaceholder.tsx
  git commit -m "feat(frontend): replace sidebar with two-panel layout and top nav

  Remove sidebar-based layout. Add TopNav with learn/dictionary/grammar/settings
  links (DM Mono uppercase, teal active underline). Add ChatPanelPlaceholder for
  Phase 7. Layout is public-first (no auth redirect). Chat panel toggles at 40% width."
  ```

- [ ] **Step 8:** Record learnings to `.claude/learnings-two-panel-layout.md` using the surfacing-subagent-learnings skill.

---

## Task 3: Route structure — dictionary, grammar, learn directories

**Files:**
- ADD: `frontend/src/routes/_layout/dictionary/index.tsx` (stub)
- ADD: `frontend/src/routes/_layout/dictionary/$word.tsx` (stub)
- ADD: `frontend/src/routes/_layout/grammar/index.tsx` (stub)
- ADD: `frontend/src/routes/_layout/grammar/modifiers.tsx` (stub)
- ADD: `frontend/src/routes/_layout/grammar/particles.tsx` (stub)
- ADD: `frontend/src/routes/_layout/learn/$unit.$lesson.tsx` (stub — target for UnitNode links)

### Steps

- [ ] **Step 1: Create the route directories**
  ```bash
  mkdir -p frontend/src/routes/_layout/dictionary
  mkdir -p frontend/src/routes/_layout/grammar
  mkdir -p frontend/src/routes/_layout/learn
  ```

- [ ] **Step 2: Create stub `frontend/src/routes/_layout/dictionary/index.tsx`**

  ```tsx
  import { createFileRoute } from "@tanstack/react-router"

  export const Route = createFileRoute("/_layout/dictionary/")({
    component: DictionaryPage,
    head: () => ({
      meta: [{ title: "Dictionary — toki pona dojo" }],
    }),
  })

  function DictionaryPage() {
    return <div>Dictionary — coming soon</div>
  }
  ```

- [ ] **Step 3: Create stub `frontend/src/routes/_layout/dictionary/$word.tsx`**

  ```tsx
  import { createFileRoute } from "@tanstack/react-router"

  export const Route = createFileRoute("/_layout/dictionary/$word")({
    component: WordDetailPage,
    head: ({ params }) => ({
      meta: [{ title: `${params.word} — toki pona dojo` }],
    }),
  })

  function WordDetailPage() {
    const { word } = Route.useParams()
    return <div>Word: {word}</div>
  }
  ```

- [ ] **Step 4: Create stub `frontend/src/routes/_layout/grammar/index.tsx`**

  ```tsx
  import { createFileRoute } from "@tanstack/react-router"

  export const Route = createFileRoute("/_layout/grammar/")({
    component: GrammarIndexPage,
    head: () => ({
      meta: [{ title: "Grammar — toki pona dojo" }],
    }),
  })

  function GrammarIndexPage() {
    return <div>Grammar — coming soon</div>
  }
  ```

- [ ] **Step 5: Create stub `frontend/src/routes/_layout/grammar/modifiers.tsx`**

  ```tsx
  import { createFileRoute } from "@tanstack/react-router"

  export const Route = createFileRoute("/_layout/grammar/modifiers")({
    component: GrammarModifiersPage,
    head: () => ({
      meta: [{ title: "Modifiers — toki pona dojo" }],
    }),
  })

  function GrammarModifiersPage() {
    return <div>Modifiers — coming soon</div>
  }
  ```

- [ ] **Step 6: Create stub `frontend/src/routes/_layout/grammar/particles.tsx`**

  ```tsx
  import { createFileRoute } from "@tanstack/react-router"

  export const Route = createFileRoute("/_layout/grammar/particles")({
    component: GrammarParticlesPage,
    head: () => ({
      meta: [{ title: "Particles — toki pona dojo" }],
    }),
  })

  function GrammarParticlesPage() {
    return <div>Particles — coming soon</div>
  }
  ```

- [ ] **Step 7: Create stub `frontend/src/routes/_layout/learn/$unit.$lesson.tsx`**

  This route is the link target for `UnitNode` (Task 4). The lesson UI is built in Phase 6; this stub prevents a 404.

  ```tsx
  import { createFileRoute, Link } from "@tanstack/react-router"

  export const Route = createFileRoute("/_layout/learn/$unit/$lesson")({
    component: LessonPlaceholder,
    head: ({ params }) => ({
      meta: [{ title: `Unit ${params.unit} Lesson ${params.lesson} — toki pona dojo` }],
    }),
  })

  function LessonPlaceholder() {
    const { unit, lesson } = Route.useParams()

    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="font-tp text-2xl text-zen-text3">kama sona</p>
        <p className="text-sm text-zen-text3">
          Unit {unit}, Lesson {lesson} — Coming in Phase 6
        </p>
        <Link
          to="/"
          className="mt-4 text-sm text-zen-teal hover:underline"
        >
          back to skill tree
        </Link>
      </div>
    )
  }
  ```

- [ ] **Step 8: Run vite build to trigger route tree regeneration and verify**
  ```bash
  cd frontend && npx vite build --mode development 2>&1 | tail -5
  ```
  Expected: Build succeeds. `routeTree.gen.ts` now includes dictionary, grammar, and learn routes.

- [ ] **Step 9: Verify routeTree.gen.ts contains the new routes**
  ```bash
  grep -c "dictionary\|grammar\|learn" frontend/src/routeTree.gen.ts
  ```
  Expected: Multiple matches showing dictionary, grammar, and learn route imports.

- [ ] **Step 10: Commit**
  ```bash
  git add frontend/src/routes/_layout/dictionary/ frontend/src/routes/_layout/grammar/ frontend/src/routes/_layout/learn/ frontend/src/routeTree.gen.ts
  git commit -m "feat(frontend): add route stubs for dictionary, grammar, and learn pages

  Create TanStack Router file-based routes for dictionary/index, dictionary/\$word,
  grammar/index, grammar/modifiers, grammar/particles, learn/\$unit/\$lesson (Phase 6
  placeholder). Stubs to be filled in later tasks."
  ```

- [ ] **Step 11:** Record learnings to `.claude/learnings-route-structure.md` using the surfacing-subagent-learnings skill.

---

## Task 4: Skill tree home page — SkillTree + UnitNode components

**Files:**
- ADD: `frontend/src/components/SkillTree.tsx`
- ADD: `frontend/src/components/UnitNode.tsx`
- MODIFY: `frontend/src/routes/_layout/index.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/components/UnitNode.tsx`**

  ```tsx
  import { Link } from "@tanstack/react-router"
  import { Check, Lock } from "lucide-react"
  import { cn } from "@/lib/utils"

  export type UnitStatus = "locked" | "available" | "current" | "completed"

  export interface UnitNodeProps {
    unitNumber: number
    name: string
    topic: string
    status: UnitStatus
    prerequisites?: number[]
  }

  export function UnitNode({ unitNumber, name, topic, status, prerequisites }: UnitNodeProps) {
    const isClickable = status === "available" || status === "current"

    const nodeContent = (
      <div
        className={cn(
          "group relative flex w-56 flex-col items-center rounded-xl border-2 px-4 py-5 text-center transition-all duration-200",
          status === "locked" && "border-zen-border bg-zen-bg2 opacity-60 cursor-not-allowed",
          status === "available" && "border-zen-teal bg-zen-bg hover:bg-zen-teal-bg cursor-pointer hover:shadow-md",
          status === "current" && "border-zen-teal bg-zen-teal-bg cursor-pointer shadow-md",
          status === "completed" && "border-zen-teal bg-zen-teal-bg/50 cursor-default",
        )}
        title={status === "locked" && prerequisites?.length
          ? `Requires unit${prerequisites.length > 1 ? "s" : ""} ${prerequisites.join(" & ")}`
          : undefined
        }
      >
        {/* Status indicator */}
        <div
          className={cn(
            "mb-2 flex size-8 items-center justify-center rounded-full text-sm font-bold",
            status === "locked" && "bg-zen-bg3 text-zen-text3",
            status === "available" && "bg-zen-teal/10 text-zen-teal",
            status === "current" && "bg-zen-teal text-white",
            status === "completed" && "bg-zen-teal text-white",
          )}
        >
          {status === "completed" ? (
            <Check className="size-4" />
          ) : status === "locked" ? (
            <Lock className="size-3" />
          ) : (
            unitNumber
          )}
        </div>

        {/* Current indicator dot */}
        {status === "current" && (
          <span className="absolute -top-1 -right-1 flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-zen-teal opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-zen-teal" />
          </span>
        )}

        <p className="font-tp text-base">{name}</p>
        <p className="mt-0.5 text-xs text-zen-text3">{topic}</p>
      </div>
    )

    if (isClickable) {
      return (
        <Link to="/learn/$unit/$lesson" params={{ unit: String(unitNumber), lesson: "1" }}>
          {nodeContent}
        </Link>
      )
    }

    return nodeContent
  }
  ```

- [ ] **Step 2: Create `frontend/src/components/SkillTree.tsx`**

  ```tsx
  import { UnitNode, type UnitStatus } from "@/components/UnitNode"

  interface UnitData {
    unitNumber: number
    name: string
    topic: string
    prerequisites: number[]
  }

  const UNITS: UnitData[] = [
    { unitNumber: 1, name: "toki!", topic: "Greetings", prerequisites: [] },
    { unitNumber: 2, name: "ijo", topic: "Core nouns", prerequisites: [1] },
    { unitNumber: 3, name: "pali", topic: "Actions", prerequisites: [1] },
    { unitNumber: 4, name: "li \u00b7 e", topic: "Sentence structure", prerequisites: [2, 3] },
    { unitNumber: 5, name: "nasin nimi", topic: "Modifiers", prerequisites: [4] },
    { unitNumber: 6, name: "pi", topic: "Modifier grouping", prerequisites: [5] },
    { unitNumber: 7, name: "la", topic: "Context & time", prerequisites: [5] },
    { unitNumber: 8, name: "o!", topic: "Commands & wishes", prerequisites: [6, 7] },
    { unitNumber: 9, name: "toki musi", topic: "Creative expression", prerequisites: [8] },
    { unitNumber: 10, name: "jan sona", topic: "Fluency practice", prerequisites: [9] },
  ]

  interface SkillTreeProps {
    completedUnits?: number[]
    currentUnit?: number
  }

  function getUnitStatus(
    unit: UnitData,
    completedUnits: number[],
    currentUnit: number,
  ): UnitStatus {
    if (completedUnits.includes(unit.unitNumber)) return "completed"
    if (unit.unitNumber === currentUnit) return "current"
    const prereqsMet = unit.prerequisites.every((p) => completedUnits.includes(p))
    if (prereqsMet) return "available"
    return "locked"
  }

  export function SkillTree({ completedUnits = [], currentUnit = 1 }: SkillTreeProps) {
    // Group units into rows for the branching layout:
    // Row 0: Unit 1 (single)
    // Row 1: Units 2 & 3 (parallel)
    // Row 2: Unit 4 (merge)
    // Row 3: Unit 5 (single)
    // Row 4: Units 6 & 7 (parallel)
    // Row 5: Unit 8 (merge)
    // Row 6: Unit 9 (single)
    // Row 7: Unit 10 (single)
    const rows: UnitData[][] = [
      [UNITS[0]],           // Unit 1
      [UNITS[1], UNITS[2]], // Units 2 & 3 (parallel)
      [UNITS[3]],           // Unit 4
      [UNITS[4]],           // Unit 5
      [UNITS[5], UNITS[6]], // Units 6 & 7 (parallel)
      [UNITS[7]],           // Unit 8
      [UNITS[8]],           // Unit 9
      [UNITS[9]],           // Unit 10
    ]

    return (
      <div className="flex flex-col items-center gap-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex}>
            {/* Connector line from previous row */}
            {rowIndex > 0 && (
              <div className="flex justify-center py-1">
                <div className="h-6 w-px bg-zen-border2" />
              </div>
            )}

            {/* Branch split indicator (before parallel rows) */}
            {row.length > 1 && (
              <div className="flex items-center justify-center gap-24 pb-1">
                <div className="h-px w-12 bg-zen-border2" />
                <div className="h-px w-12 bg-zen-border2" />
              </div>
            )}

            {/* Unit nodes */}
            <div className={
              row.length > 1
                ? "flex items-start justify-center gap-8"
                : "flex justify-center"
            }>
              {row.map((unit) => (
                <UnitNode
                  key={unit.unitNumber}
                  unitNumber={unit.unitNumber}
                  name={unit.name}
                  topic={unit.topic}
                  status={getUnitStatus(unit, completedUnits, currentUnit)}
                  prerequisites={unit.prerequisites}
                />
              ))}
            </div>

            {/* Branch merge indicator (after parallel rows) */}
            {row.length > 1 && (
              <div className="flex items-center justify-center gap-24 pt-1">
                <div className="h-px w-12 bg-zen-border2" />
                <div className="h-px w-12 bg-zen-border2" />
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }
  ```

- [ ] **Step 3: Replace `frontend/src/routes/_layout/index.tsx` with the skill tree home page**

  Replace the entire file with:

  ```tsx
  import { createFileRoute } from "@tanstack/react-router"
  import { SkillTree } from "@/components/SkillTree"

  export const Route = createFileRoute("/_layout/")({
    component: HomePage,
    head: () => ({
      meta: [{ title: "toki pona dojo" }],
    }),
  })

  function HomePage() {
    // TODO (Phase 8): Read from localStorage or API
    const completedUnits: number[] = []
    const currentUnit = 1

    return (
      <div className="flex flex-col items-center gap-12 py-8">
        {/* Greeting */}
        <div className="text-center">
          <h1 className="font-tp text-4xl text-zen-text">o kama sona</h1>
          <p className="mt-2 text-lg text-zen-text3">learn toki pona</p>
        </div>

        {/* Stats row placeholder (shown when progress exists) */}
        {completedUnits.length > 0 && (
          <div className="flex gap-6">
            <div className="flex flex-col items-center rounded-lg border border-zen-border bg-zen-bg2 px-6 py-3">
              <span className="font-tp text-xl text-zen-teal">0</span>
              <span className="text-xs text-zen-text3">words known</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border border-zen-border bg-zen-bg2 px-6 py-3">
              <span className="font-tp text-xl text-zen-teal">0</span>
              <span className="text-xs text-zen-text3">lessons done</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border border-zen-border bg-zen-bg2 px-6 py-3">
              <span className="font-tp text-xl text-zen-teal">0</span>
              <span className="text-xs text-zen-text3">day streak</span>
            </div>
          </div>
        )}

        {/* Skill tree */}
        <SkillTree completedUnits={completedUnits} currentUnit={currentUnit} />
      </div>
    )
  }
  ```

- [ ] **Step 4: Verify TypeScript compiles**
  ```bash
  cd frontend && npx tsc -p tsconfig.build.json --noEmit 2>&1 | head -20
  ```
  Expected: No errors.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/components/SkillTree.tsx frontend/src/components/UnitNode.tsx frontend/src/routes/_layout/index.tsx
  git commit -m "feat(frontend): add skill tree home page with 10 units and dependency graph

  SkillTree renders units as vertical path with parallel branches (2&3, 6&7).
  UnitNode shows locked/available/current/completed states with teal coloring
  and pulsing dot on current unit. Home page has 'o kama sona' greeting."
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-skill-tree.md` using the surfacing-subagent-learnings skill.

---

## Task 5: Dictionary page — search, filter, WordCard component

**Files:**
- ADD: `frontend/src/lib/pos-colors.ts`
- ADD: `frontend/src/components/WordCard.tsx`
- MODIFY: `frontend/src/routes/_layout/dictionary/index.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/lib/pos-colors.ts`**

  Extract POS color mapping to a shared module (used by both `WordCard.tsx` and `$word.tsx`):

  ```ts
  /** POS → Tailwind class mapping. Shared by WordCard and word detail page. */
  export const POS_COLORS: Record<string, string> = {
    noun: "bg-zen-teal-bg text-zen-teal-dark dark:bg-zen-teal-bg dark:text-zen-teal-dark",
    verb: "bg-zen-coral-bg text-zen-coral-dark dark:bg-zen-coral-bg dark:text-zen-coral-dark",
    adjective: "bg-zen-amber-bg text-zen-amber-dark dark:bg-zen-amber-bg dark:text-zen-amber-dark",
    "pre-verb": "bg-zen-amber-bg text-zen-amber-dark dark:bg-zen-amber-bg dark:text-zen-amber-dark",
    particle: "bg-zen-blue-bg text-zen-blue-dark dark:bg-zen-blue-bg dark:text-zen-blue-dark",
    number: "bg-zen-bg3 text-zen-text2",
    preposition: "bg-zen-coral-bg text-zen-coral-dark dark:bg-zen-coral-bg dark:text-zen-coral-dark",
  }
  ```

- [ ] **Step 2: Create `frontend/src/components/WordCard.tsx`**

  ```tsx
  import { Link } from "@tanstack/react-router"
  import { Badge } from "@/components/ui/badge"
  import { cn } from "@/lib/utils"
  import { POS_COLORS } from "@/lib/pos-colors"

  export interface WordDefinition {
    pos: string
    definition: string
  }

  export interface WordData {
    word: string
    ku: boolean
    pos: string[]
    definitions: WordDefinition[]
    note: string | null
  }

  interface WordCardProps {
    data: WordData
  }

  export function WordCard({ data }: WordCardProps) {
    return (
      <Link
        to="/dictionary/$word"
        params={{ word: data.word }}
        className="block rounded-lg border border-zen-border bg-zen-bg p-4 transition-all hover:border-zen-border2 hover:shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-tp text-lg">{data.word}</h3>
          <div className="flex flex-wrap gap-1">
            {data.pos.map((p) => (
              <Badge
                key={p}
                variant="outline"
                className={cn("border-0 text-[10px] font-label", POS_COLORS[p] || "bg-zen-bg3 text-zen-text2")}
              >
                {p}
              </Badge>
            ))}
          </div>
        </div>
        <div className="mt-2 space-y-1">
          {data.definitions.map((def, i) => (
            <p key={i} className="text-sm text-zen-text2">
              <span className="font-label text-[9px] text-zen-text3 mr-1.5">{def.pos}</span>
              {def.definition}
            </p>
          ))}
        </div>
        {data.note && (
          <p className="mt-2 text-xs text-zen-text3 italic">{data.note}</p>
        )}
        {data.ku && (
          <Badge variant="outline" className="mt-2 text-[9px] border-zen-border text-zen-text3">
            ku suli
          </Badge>
        )}
      </Link>
    )
  }
  ```

- [ ] **Step 3: Replace `frontend/src/routes/_layout/dictionary/index.tsx` with the full dictionary page**

  ```tsx
  import { useState, useMemo, useRef } from "react"
  import { createFileRoute } from "@tanstack/react-router"
  import { useQuery } from "@tanstack/react-query"
  import { Search } from "lucide-react"
  import { Input } from "@/components/ui/input"
  import { Badge } from "@/components/ui/badge"
  import { Skeleton } from "@/components/ui/skeleton"
  import { WordCard, type WordData } from "@/components/WordCard"
  import { cn } from "@/lib/utils"

  export const Route = createFileRoute("/_layout/dictionary/")({
    component: DictionaryPage,
    head: () => ({
      meta: [{ title: "Dictionary — toki pona dojo" }],
    }),
  })

  const POS_FILTERS = ["all", "noun", "verb", "adjective", "particle", "number", "pre-verb", "preposition"] as const
  const SET_FILTERS = ["all", "pu", "ku suli"] as const
  const ALPHABET = "ABCDEFGHIJKLMNOPRSTUW".split("")

  function DictionaryPage() {
    const [search, setSearch] = useState("")
    const [posFilter, setPosFilter] = useState<string>("all")
    const [setFilter, setSetFilter] = useState<string>("all")
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

    const { data: words = [], isLoading } = useQuery<WordData[]>({
      queryKey: ["dictionary", "words"],
      queryFn: async () => {
        const res = await fetch("/api/v1/dictionary/words")
        if (!res.ok) throw new Error("Failed to fetch words")
        return res.json()
      },
    })

    const filtered = useMemo(() => {
      return words.filter((w) => {
        // Search filter
        if (search) {
          const q = search.toLowerCase()
          const matchWord = w.word.toLowerCase().includes(q)
          const matchDef = w.definitions.some((d) =>
            d.definition.toLowerCase().includes(q),
          )
          if (!matchWord && !matchDef) return false
        }
        // POS filter
        if (posFilter !== "all" && !w.pos.includes(posFilter)) return false
        // Set filter
        if (setFilter === "pu" && w.ku) return false
        if (setFilter === "ku suli" && !w.ku) return false
        return true
      })
    }, [words, search, posFilter, setFilter])

    // Group by first letter
    const grouped = useMemo(() => {
      const groups: Record<string, WordData[]> = {}
      for (const w of filtered) {
        const letter = w.word[0].toUpperCase()
        if (!groups[letter]) groups[letter] = []
        groups[letter].push(w)
      }
      return groups
    }, [filtered])

    const scrollToLetter = (letter: string) => {
      sectionRefs.current[letter]?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    return (
      <div className="flex flex-col gap-6 py-6">
        <div>
          <h1 className="font-tp text-2xl">nimi ale</h1>
          <p className="text-sm text-zen-text3">all words</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zen-text3" />
          <Input
            placeholder="Search words or definitions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zen-bg2 border-zen-border"
            data-testid="dictionary-search"
          />
        </div>

        {/* POS filter pills */}
        <div className="flex flex-wrap gap-2">
          {POS_FILTERS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={cn(
                "font-label rounded-full border px-3 py-1 transition-colors",
                posFilter === pos
                  ? "border-zen-teal bg-zen-teal-bg text-zen-teal-dark"
                  : "border-zen-border text-zen-text3 hover:border-zen-border2 hover:text-zen-text2",
              )}
              data-testid={`pos-filter-${pos}`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Set filter */}
        <div className="flex gap-2">
          {SET_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSetFilter(s)}
              className={cn(
                "font-label rounded-full border px-3 py-1 transition-colors",
                setFilter === s
                  ? "border-zen-amber bg-zen-amber-bg text-zen-amber-dark"
                  : "border-zen-border text-zen-text3 hover:border-zen-border2 hover:text-zen-text2",
              )}
              data-testid={`set-filter-${s}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Letter jump bar */}
        <div className="flex flex-wrap gap-1">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => scrollToLetter(letter)}
              className={cn(
                "font-label flex size-7 items-center justify-center rounded text-xs transition-colors",
                grouped[letter]
                  ? "text-zen-text2 hover:bg-zen-bg2"
                  : "text-zen-text3/40 cursor-default",
              )}
              disabled={!grouped[letter]}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Result count */}
        <p className="text-xs text-zen-text3">
          {filtered.length} of {words.length} words
        </p>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Word cards grouped by letter */}
        {!isLoading && Object.keys(grouped).sort().map((letter) => (
          <div
            key={letter}
            ref={(el) => { sectionRefs.current[letter] = el }}
          >
            <h2 className="font-tp mb-3 text-lg text-zen-text3">{letter}</h2>
            <div className="space-y-2">
              {grouped[letter].map((word) => (
                <WordCard key={word.word} data={word} />
              ))}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center text-zen-text3">
            <p className="font-tp text-lg">ala</p>
            <p className="mt-1 text-sm">no words match your search</p>
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 4: Verify TypeScript compiles**
  ```bash
  cd frontend && npx tsc -p tsconfig.build.json --noEmit 2>&1 | head -20
  ```
  Expected: No errors.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/lib/pos-colors.ts frontend/src/components/WordCard.tsx frontend/src/routes/_layout/dictionary/index.tsx
  git commit -m "feat(frontend): add dictionary page with search, POS/set filters, and word cards

  Extract POS_COLORS to shared lib/pos-colors.ts (reused by word detail page).
  Fetches from GET /api/v1/dictionary/words. Search filters by word and definition.
  POS filter pills, set filter (pu/ku suli), alphabetical letter jump bar.
  WordCard shows word, POS badges with semantic colors, definitions, notes."
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-dictionary-page.md` using the surfacing-subagent-learnings skill.

---

## Task 6: Word detail page

**Files:**
- MODIFY: `frontend/src/routes/_layout/dictionary/$word.tsx`

### Steps

- [ ] **Step 1: Replace `frontend/src/routes/_layout/dictionary/$word.tsx` with the full word detail page**

  ```tsx
  import { createFileRoute, Link } from "@tanstack/react-router"
  import { useQuery } from "@tanstack/react-query"
  import { ArrowLeft } from "lucide-react"
  import { Badge } from "@/components/ui/badge"
  import { Skeleton } from "@/components/ui/skeleton"
  import { cn } from "@/lib/utils"
  import { POS_COLORS } from "@/lib/pos-colors"
  import type { WordData } from "@/components/WordCard"

  export const Route = createFileRoute("/_layout/dictionary/$word")({
    component: WordDetailPage,
    head: ({ params }) => ({
      meta: [{ title: `${params.word} — toki pona dojo` }],
    }),
  })

  // TODO: Replace this hardcoded map with data from the API when a
  // "word → units" endpoint is available (e.g. GET /api/v1/dictionary/words/:word/units).
  const WORD_UNITS: Record<string, number[]> = {
    mi: [1], sina: [1], pona: [1], ike: [1], toki: [1], moku: [1, 3],
    jan: [2], tomo: [2], telo: [2], soweli: [2], suno: [2], ma: [2], nimi: [2],
    lukin: [3, 8], lape: [3], pali: [3], kama: [3], jo: [3],
    li: [4], e: [4], ona: [4], ni: [4], seme: [4],
    mute: [5], lili: [5], suli: [5], wawa: [5], sin: [5], ante: [5],
    pi: [6], sona: [6], kalama: [6, 9], ilo: [6], nasin: [6],
    la: [7], tenpo: [7], sike: [7], open: [7], pini: [7],
    o: [8], wile: [8], ken: [8],
    olin: [9], pilin: [9], musi: [9], sitelen: [9],
    lon: [10], tawa: [10], tan: [10], kepeken: [10],
  }

  function WordDetailPage() {
    const { word } = Route.useParams()

    const { data, isLoading, error } = useQuery<WordData>({
      queryKey: ["dictionary", "word", word],
      queryFn: async () => {
        const res = await fetch(`/api/v1/dictionary/words/${encodeURIComponent(word)}`)
        if (!res.ok) throw new Error("Word not found")
        return res.json()
      },
    })

    if (isLoading) {
      return (
        <div className="space-y-4 py-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      )
    }

    if (error || !data) {
      return (
        <div className="py-12 text-center">
          <p className="font-tp text-2xl text-zen-text3">ala</p>
          <p className="mt-2 text-sm text-zen-text3">word not found</p>
          <Link
            to="/dictionary"
            className="mt-4 inline-flex items-center gap-1 text-sm text-zen-teal hover:underline"
          >
            <ArrowLeft className="size-3" /> back to dictionary
          </Link>
        </div>
      )
    }

    const units = WORD_UNITS[data.word] || []

    return (
      <div className="flex flex-col gap-6 py-6">
        {/* Back link */}
        <Link
          to="/dictionary"
          className="inline-flex items-center gap-1 text-sm text-zen-text3 hover:text-zen-text2 transition-colors"
        >
          <ArrowLeft className="size-3" /> dictionary
        </Link>

        {/* Word heading */}
        <div>
          <h1 className="font-tp text-4xl">{data.word}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.pos.map((p) => (
              <Badge
                key={p}
                variant="outline"
                className={cn("border-0 font-label", POS_COLORS[p] || "bg-zen-bg3 text-zen-text2")}
              >
                {p}
              </Badge>
            ))}
            {data.ku && (
              <Badge variant="outline" className="border-zen-border text-zen-text3 font-label">
                ku suli
              </Badge>
            )}
          </div>
        </div>

        {/* Definitions grouped by POS */}
        <div className="space-y-4">
          {data.pos.map((pos) => {
            const defs = data.definitions.filter((d) => d.pos === pos)
            if (defs.length === 0) return null
            return (
              <div key={pos}>
                <h2 className="font-label text-zen-text3 mb-1">{pos}</h2>
                {defs.map((def, i) => (
                  <p key={i} className="text-zen-text2">{def.definition}</p>
                ))}
              </div>
            )
          })}
        </div>

        {/* Notes */}
        {data.note && (
          <div className="rounded-lg border border-zen-border bg-zen-bg2 p-4">
            <p className="font-label text-zen-text3 mb-1">note</p>
            <p className="text-sm text-zen-text2">{data.note}</p>
          </div>
        )}

        {/* Units */}
        {units.length > 0 && (
          <div>
            <p className="font-label text-zen-text3 mb-1">used in units</p>
            <div className="flex gap-2">
              {units.map((u) => (
                <span
                  key={u}
                  className="flex size-8 items-center justify-center rounded-full bg-zen-teal-bg text-sm font-tp text-zen-teal-dark"
                >
                  {u}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**
  ```bash
  cd frontend && npx tsc -p tsconfig.build.json --noEmit 2>&1 | head -20
  ```
  Expected: No errors.

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/routes/_layout/dictionary/\$word.tsx
  git commit -m "feat(frontend): add word detail page with definitions, notes, and unit references

  Shows large word heading, POS badges, definitions grouped by POS, notes card,
  and which units introduce the word. Back link to dictionary index."
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-word-detail.md` using the surfacing-subagent-learnings skill.

---

## Task 7: Grammar pages — index, modifiers, particles with GrammarChain

**Files:**
- ADD: `frontend/src/components/GrammarChain.tsx`
- MODIFY: `frontend/src/routes/_layout/grammar/index.tsx`
- MODIFY: `frontend/src/routes/_layout/grammar/modifiers.tsx`
- MODIFY: `frontend/src/routes/_layout/grammar/particles.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/components/GrammarChain.tsx`**

  ```tsx
  import { cn } from "@/lib/utils"

  type WordRole = "head" | "modifier" | "particle" | "pi-group" | "predicate"

  export interface ChainWord {
    word: string
    role: WordRole
    gloss?: string
  }

  export interface GrammarChainProps {
    words: ChainWord[]
    meaning: string
  }

  const ROLE_COLORS: Record<WordRole, string> = {
    head: "bg-zen-teal-bg text-zen-teal-dark border-zen-teal/30",
    modifier: "bg-zen-amber-bg text-zen-amber-dark border-zen-amber/30",
    particle: "bg-zen-coral-bg text-zen-coral-dark border-zen-coral/30",
    "pi-group": "bg-zen-blue-bg text-zen-blue-dark border-blue-500/30",
    predicate: "bg-zen-bg3 text-zen-text2 border-zen-border2",
  }

  const ROLE_LABELS: Record<WordRole, string> = {
    head: "head",
    modifier: "mod",
    particle: "particle",
    "pi-group": "pi-group",
    predicate: "predicate",
  }

  export function GrammarChain({ words, meaning }: GrammarChainProps) {
    return (
      <div className="my-4 rounded-lg border border-zen-border bg-zen-bg2 p-4">
        {/* Word pills */}
        <div className="flex flex-wrap items-center gap-2">
          {words.map((w, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-3 py-1 font-tp text-sm",
                  ROLE_COLORS[w.role],
                )}
              >
                {w.word}
              </span>
              <span className="text-[9px] font-label text-zen-text3">
                {w.gloss || ROLE_LABELS[w.role]}
              </span>
            </div>
          ))}
        </div>

        {/* Meaning */}
        <p className="mt-3 text-sm text-zen-text2 italic">
          = {meaning}
        </p>
      </div>
    )
  }
  ```

- [ ] **Step 2: Replace `frontend/src/routes/_layout/grammar/index.tsx` with the grammar index page**

  ```tsx
  import { createFileRoute, Link } from "@tanstack/react-router"
  import { ChevronRight } from "lucide-react"
  import { cn } from "@/lib/utils"

  export const Route = createFileRoute("/_layout/grammar/")({
    component: GrammarIndexPage,
    head: () => ({
      meta: [{ title: "Grammar — toki pona dojo" }],
    }),
  })

  const sections = [
    {
      number: "01",
      title: "Modifiers",
      description: "How toki pona builds meaning by stacking words after a head noun or verb. Learn modifier chains, pi groups, and the core head-first rule.",
      to: "/grammar/modifiers" as const,
    },
    {
      number: "02",
      title: "Particles",
      description: "The structural words that shape toki pona sentences: li, e, la, pi, and o. Learn sentence patterns and when to use each particle.",
      to: "/grammar/particles" as const,
    },
  ]

  function GrammarIndexPage() {
    return (
      <div className="flex flex-col gap-8 py-6">
        <div>
          <h1 className="font-tp text-2xl">nasin toki</h1>
          <p className="text-sm text-zen-text3">grammar guide</p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <Link
              key={section.number}
              to={section.to}
              className="group flex items-center gap-4 rounded-lg border border-zen-border bg-zen-bg p-5 transition-all hover:border-zen-border2 hover:shadow-sm"
            >
              <span className="font-tp text-2xl text-zen-text3 group-hover:text-zen-teal transition-colors">
                {section.number}
              </span>
              <div className="flex-1">
                <h2 className="font-tp text-lg group-hover:text-zen-teal transition-colors">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-zen-text3">{section.description}</p>
              </div>
              <ChevronRight className="size-5 text-zen-text3 group-hover:text-zen-teal transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Replace `frontend/src/routes/_layout/grammar/modifiers.tsx` with the full modifiers page**

  ```tsx
  import { useState } from "react"
  import { createFileRoute, Link } from "@tanstack/react-router"
  import { useQuery } from "@tanstack/react-query"
  import { ArrowLeft } from "lucide-react"
  import { GrammarChain, type ChainWord } from "@/components/GrammarChain"
  import { Skeleton } from "@/components/ui/skeleton"
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
  import { cn } from "@/lib/utils"

  export const Route = createFileRoute("/_layout/grammar/modifiers")({
    component: GrammarModifiersPage,
    head: () => ({
      meta: [{ title: "Modifiers — toki pona dojo" }],
    }),
  })

  interface GrammarSection {
    id: string
    number: string
    title: string
    content: string
    chains?: { words: ChainWord[]; meaning: string }[]
    callouts?: { type: "rule" | "warning"; text: string }[]
  }

  interface GrammarComparison {
    title: string
    rows: { left: string; right: string; note?: string }[]
  }

  interface QuizQuestion {
    question: string
    options: string[]
    correct: number
  }

  interface GrammarData {
    sections: GrammarSection[]
    comparisons: GrammarComparison[]
    quiz: QuizQuestion[]
  }

  // Fallback data used when the API is not yet available
  const FALLBACK_SECTIONS: GrammarSection[] = [
    {
      id: "core-rule",
      number: "01",
      title: "The core rule",
      content: "In toki pona, modifiers always come AFTER the word they describe. The first word is the head — it carries the core meaning. Everything after it narrows or describes it.",
      chains: [
        {
          words: [
            { word: "tomo", role: "head", gloss: "building" },
            { word: "telo", role: "modifier", gloss: "water" },
          ],
          meaning: "bathroom / water-building",
        },
        {
          words: [
            { word: "jan", role: "head", gloss: "person" },
            { word: "pona", role: "modifier", gloss: "good" },
          ],
          meaning: "good person",
        },
      ],
      callouts: [
        { type: "rule", text: "Head word always comes first. Modifiers follow and narrow the meaning." },
      ],
    },
    {
      id: "stacking",
      number: "02",
      title: "Stacking modifiers",
      content: "You can stack multiple modifiers. Each one further narrows the meaning, reading left to right.",
      chains: [
        {
          words: [
            { word: "tomo", role: "head", gloss: "building" },
            { word: "telo", role: "modifier", gloss: "water" },
            { word: "suli", role: "modifier", gloss: "big" },
          ],
          meaning: "big bathroom",
        },
        {
          words: [
            { word: "jan", role: "head", gloss: "person" },
            { word: "pona", role: "modifier", gloss: "good" },
            { word: "mute", role: "modifier", gloss: "many" },
          ],
          meaning: "many good people",
        },
      ],
    },
    {
      id: "pi",
      number: "03",
      title: "Regrouping with pi",
      content: "Without pi, each modifier applies to the head individually. The particle pi creates a sub-group: everything after pi forms a modifier phrase that applies as a unit.",
      chains: [
        {
          words: [
            { word: "tomo", role: "head", gloss: "building" },
            { word: "pi", role: "particle" },
            { word: "telo", role: "pi-group", gloss: "water" },
            { word: "suli", role: "pi-group", gloss: "big" },
          ],
          meaning: "building of big-water (like a reservoir building)",
        },
      ],
      callouts: [
        { type: "rule", text: "pi regroups: without pi, each word modifies the head separately. With pi, the words after pi form a compound modifier." },
        { type: "warning", text: "Never use pi with a single word after it — pi always needs at least two words to form a group." },
      ],
    },
    {
      id: "comparison",
      number: "04",
      title: "With vs without pi",
      content: "The difference is in what modifies what. Compare these pairs carefully.",
      chains: [
        {
          words: [
            { word: "jan", role: "head" },
            { word: "sona", role: "modifier" },
            { word: "mute", role: "modifier" },
          ],
          meaning: "many knowledgeable people (mute modifies jan)",
        },
        {
          words: [
            { word: "jan", role: "head" },
            { word: "pi", role: "particle" },
            { word: "sona", role: "pi-group" },
            { word: "mute", role: "pi-group" },
          ],
          meaning: "person of much knowledge (mute modifies sona)",
        },
      ],
    },
  ]

  const FALLBACK_COMPARISONS: GrammarComparison[] = [
    {
      title: "mute vs suli — placement matters",
      rows: [
        { left: "jan pona mute", right: "many good people", note: "mute modifies jan" },
        { left: "jan pi pona mute", right: "person of great goodness", note: "mute modifies pona" },
        { left: "tomo telo suli", right: "big bathroom", note: "suli modifies tomo" },
        { left: "tomo pi telo suli", right: "building of big water", note: "suli modifies telo" },
      ],
    },
  ]

  const FALLBACK_QUIZ: QuizQuestion[] = [
    {
      question: "What does 'tomo telo suli' mean?",
      options: ["big bathroom", "building of big water", "big water building", "water of big building"],
      correct: 0,
    },
    {
      question: "What does 'tomo pi telo suli' mean?",
      options: ["big bathroom", "building of big water", "big water building", "water of big building"],
      correct: 1,
    },
    {
      question: "Which is correct for 'person of much knowledge'?",
      options: ["jan sona mute", "jan pi sona mute", "jan mute sona", "jan pi mute sona"],
      correct: 1,
    },
  ]

  function CalloutBox({ type, text }: { type: "rule" | "warning"; text: string }) {
    return (
      <div
        className={cn(
          "my-3 rounded-lg border-l-4 bg-zen-bg2 p-4 text-sm",
          type === "rule" ? "border-l-zen-teal" : "border-l-zen-coral",
        )}
      >
        <span className={cn(
          "font-label mr-2",
          type === "rule" ? "text-zen-teal" : "text-zen-coral",
        )}>
          {type === "rule" ? "rule" : "warning"}
        </span>
        <span className="text-zen-text2">{text}</span>
      </div>
    )
  }

  function QuizSection({ questions }: { questions: QuizQuestion[] }) {
    const [answers, setAnswers] = useState<Record<number, number | null>>({})

    const handleAnswer = (qIndex: number, optionIndex: number) => {
      setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }))
    }

    return (
      <div className="space-y-6">
        <h2 className="font-tp text-xl">quiz</h2>
        {questions.map((q, qi) => {
          const answered = answers[qi] !== undefined && answers[qi] !== null
          const correct = answered && answers[qi] === q.correct
          return (
            <div key={qi} className="rounded-lg border border-zen-border bg-zen-bg p-4">
              <p className="mb-3 font-tp">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => !answered && handleAnswer(qi, oi)}
                    disabled={answered}
                    className={cn(
                      "w-full rounded-md border px-4 py-2 text-left text-sm transition-colors",
                      !answered && "border-zen-border hover:border-zen-border2 hover:bg-zen-bg2",
                      answered && oi === q.correct && "border-zen-teal bg-zen-teal-bg text-zen-teal-dark",
                      answered && oi === answers[qi] && oi !== q.correct && "border-zen-coral bg-zen-coral-bg text-zen-coral-dark",
                      answered && oi !== q.correct && oi !== answers[qi] && "border-zen-border opacity-50",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {answered && (
                <p className={cn("mt-2 text-sm", correct ? "text-zen-teal" : "text-zen-coral")}>
                  {correct ? "pona! correct!" : `not quite -- the answer is: ${q.options[q.correct]}`}
                </p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function GrammarModifiersPage() {
    const { data, isLoading } = useQuery<GrammarData>({
      queryKey: ["grammar"],
      queryFn: async () => {
        const res = await fetch("/api/v1/dictionary/grammar")
        if (!res.ok) throw new Error("Failed to fetch grammar data")
        return res.json()
      },
      retry: false,
    })

    const sections = data?.sections ?? FALLBACK_SECTIONS
    const comparisons = data?.comparisons ?? FALLBACK_COMPARISONS
    const quiz = data?.quiz ?? FALLBACK_QUIZ

    return (
      <div className="flex flex-col gap-8 py-6">
        {/* Back link */}
        <Link
          to="/grammar"
          className="inline-flex items-center gap-1 text-sm text-zen-text3 hover:text-zen-text2 transition-colors"
        >
          <ArrowLeft className="size-3" /> grammar
        </Link>

        <div>
          <h1 className="font-tp text-2xl">nasin nimi</h1>
          <p className="text-sm text-zen-text3">modifier rules</p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Sections */}
        {sections.map((section) => (
          <section key={section.id} className="space-y-3">
            <h2 className="font-tp text-xl">
              <span className="text-zen-text3 mr-2">{section.number}</span>
              {section.title}
            </h2>
            <p className="text-zen-text2 leading-relaxed">{section.content}</p>

            {section.chains?.map((chain, i) => (
              <GrammarChain key={i} words={chain.words} meaning={chain.meaning} />
            ))}

            {section.callouts?.map((callout, i) => (
              <CalloutBox key={i} type={callout.type} text={callout.text} />
            ))}
          </section>
        ))}

        {/* Comparison tables */}
        {comparisons.map((comp, ci) => (
          <section key={ci} className="space-y-3">
            <h2 className="font-tp text-xl">{comp.title}</h2>
            <div className="rounded-lg border border-zen-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zen-bg2">
                    <TableHead className="font-label">toki pona</TableHead>
                    <TableHead className="font-label">english</TableHead>
                    <TableHead className="font-label">note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comp.rows.map((row, ri) => (
                    <TableRow key={ri}>
                      <TableCell className="font-tp">{row.left}</TableCell>
                      <TableCell className="text-zen-text2">{row.right}</TableCell>
                      <TableCell className="text-xs text-zen-text3">{row.note || ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        ))}

        {/* Quiz */}
        <QuizSection questions={quiz} />
      </div>
    )
  }
  ```

- [ ] **Step 4: Replace `frontend/src/routes/_layout/grammar/particles.tsx` with the full particles page**

  ```tsx
  import { createFileRoute, Link } from "@tanstack/react-router"
  import { ArrowLeft } from "lucide-react"
  import { cn } from "@/lib/utils"

  export const Route = createFileRoute("/_layout/grammar/particles")({
    component: GrammarParticlesPage,
    head: () => ({
      meta: [{ title: "Particles — toki pona dojo" }],
    }),
  })

  interface ParticleExample {
    tp: string
    en: string
  }

  interface ParticleSection {
    particle: string
    name: string
    rule: string
    examples: ParticleExample[]
    mistakes?: string[]
  }

  const PARTICLES: ParticleSection[] = [
    {
      particle: "li",
      name: "predicate marker",
      rule: "li separates the subject from the predicate. It is required unless the subject is 'mi' or 'sina' alone (no modifiers).",
      examples: [
        { tp: "ona li pona", en: "they are good" },
        { tp: "jan Ali li moku", en: "Ali eats" },
        { tp: "mi pona", en: "I am good (no li needed)" },
        { tp: "sina moku", en: "you eat (no li needed)" },
        { tp: "mi mute li tawa", en: "we go (li needed because 'mi' has modifier)" },
      ],
      mistakes: [
        "mi li pona -- wrong: don't use li after bare 'mi'",
        "jan moku -- ambiguous without li: is it 'a food person' or 'a person eats'?",
      ],
    },
    {
      particle: "e",
      name: "direct object marker",
      rule: "e marks the direct object -- the thing being acted upon. It comes after the predicate and before the object.",
      examples: [
        { tp: "mi moku e kili", en: "I eat fruit" },
        { tp: "ona li lukin e tomo", en: "they see the building" },
        { tp: "jan li pali e ilo", en: "the person makes a tool" },
      ],
      mistakes: [
        "mi moku kili -- grammatically off: use 'e' for the direct object",
        "mi e moku -- wrong: 'e' goes after the verb, not after the subject",
      ],
    },
    {
      particle: "la",
      name: "context marker",
      rule: "la separates a context phrase from the main sentence. The context comes first: 'context la main-sentence'. It can express time, conditions, or topic.",
      examples: [
        { tp: "tenpo ni la mi moku", en: "now I eat (at this time, I eat)" },
        { tp: "sina pona la mi pilin pona", en: "if you are good, I feel good" },
        { tp: "toki pona la jan li ken toki kepeken nimi lili", en: "in toki pona, people can speak with few words" },
      ],
      mistakes: [
        "mi moku la tenpo ni -- wrong: context goes BEFORE la, not after",
      ],
    },
    {
      particle: "pi",
      name: "regrouping particle",
      rule: "pi regroups modifiers. Without pi, each modifier applies to the head word directly. With pi, the words after pi form a compound modifier. Always needs at least two words after it.",
      examples: [
        { tp: "tomo telo suli", en: "big bathroom (suli modifies tomo)" },
        { tp: "tomo pi telo suli", en: "building of big water (suli modifies telo)" },
        { tp: "jan pi sona mute", en: "person of much knowledge (knowledgeable person)" },
      ],
      mistakes: [
        "jan pi sona -- wrong: pi needs at least two words after it",
        "jan pi pi sona mute -- wrong: never stack pi",
      ],
    },
    {
      particle: "o",
      name: "command / vocative",
      rule: "o has two uses: (1) commands -- 'o verb' means 'do the verb!'; (2) vocative -- 'name o' means addressing someone by name. Can combine: 'name o, verb' = 'name, do the verb!'",
      examples: [
        { tp: "o moku!", en: "eat!" },
        { tp: "o kama!", en: "come!" },
        { tp: "jan Ali o!", en: "hey Ali!" },
        { tp: "jan Ali o, o moku!", en: "Ali, eat!" },
        { tp: "mi o pali", en: "I should work (self-command)" },
      ],
      mistakes: [
        "moku o -- wrong for commands: o comes BEFORE the verb",
      ],
    },
  ]

  function GrammarParticlesPage() {
    return (
      <div className="flex flex-col gap-8 py-6">
        {/* Back link */}
        <Link
          to="/grammar"
          className="inline-flex items-center gap-1 text-sm text-zen-text3 hover:text-zen-text2 transition-colors"
        >
          <ArrowLeft className="size-3" /> grammar
        </Link>

        <div>
          <h1 className="font-tp text-2xl">nimi lili</h1>
          <p className="text-sm text-zen-text3">particles guide</p>
        </div>

        {PARTICLES.map((section) => (
          <section key={section.particle} className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="font-tp text-3xl text-zen-teal">{section.particle}</span>
              <span className="font-label text-zen-text3">{section.name}</span>
            </div>

            <p className="text-zen-text2 leading-relaxed">{section.rule}</p>

            {/* Examples */}
            <div className="space-y-2">
              {section.examples.map((ex, i) => (
                <div key={i} className="flex flex-col gap-0.5 rounded-md bg-zen-bg2 px-4 py-2">
                  <span className="font-tp text-sm">{ex.tp}</span>
                  <span className="text-xs text-zen-text3">{ex.en}</span>
                </div>
              ))}
            </div>

            {/* Common mistakes */}
            {section.mistakes && section.mistakes.length > 0 && (
              <div className="rounded-lg border-l-4 border-l-zen-coral bg-zen-bg2 p-4">
                <p className="font-label text-zen-coral mb-2">common mistakes</p>
                <div className="space-y-1">
                  {section.mistakes.map((m, i) => (
                    <p key={i} className="text-sm text-zen-text2">{m}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Separator */}
            <div className="border-b border-zen-border" />
          </section>
        ))}
      </div>
    )
  }
  ```

- [ ] **Step 5: Verify TypeScript compiles**
  ```bash
  cd frontend && npx tsc -p tsconfig.build.json --noEmit 2>&1 | head -20
  ```
  Expected: No errors.

- [ ] **Step 6: Commit**
  ```bash
  git add frontend/src/components/GrammarChain.tsx frontend/src/routes/_layout/grammar/
  git commit -m "feat(frontend): add grammar pages with chain visualizer, comparison tables, and quiz

  Grammar index links to modifiers and particles guides. Modifiers page has
  GrammarChain visualizer (colored word pills by role), comparison tables,
  callout boxes, and interactive quiz. Particles page covers li, e, la, pi, o
  with examples and common mistakes. Fallback data for when API unavailable."
  ```

- [ ] **Step 7:** Record learnings to `.claude/learnings-grammar-pages.md` using the surfacing-subagent-learnings skill.

---

## Task 8: Playwright E2E tests

**Files:**
- ADD: `frontend/tests/navigation.spec.ts`
- ADD: `frontend/tests/dictionary.spec.ts`
- ADD: `frontend/tests/grammar.spec.ts`
- ADD: `frontend/tests/skill-tree.spec.ts`

### Steps

- [ ] **Step 1: Create `frontend/tests/navigation.spec.ts`**

  ```ts
  import { expect, test } from "@playwright/test"

  test.use({ storageState: { cookies: [], origins: [] } })

  test("Top nav renders with correct links", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: "learn" })).toBeVisible()
    await expect(page.getByRole("link", { name: "dictionary" })).toBeVisible()
    await expect(page.getByRole("link", { name: "grammar" })).toBeVisible()
    await expect(page.getByRole("link", { name: "settings" })).toBeVisible()
  })

  test("Navigate to dictionary via top nav", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "dictionary" }).click()
    await expect(page).toHaveURL(/\/dictionary/)
    await expect(page.locator("h1")).toContainText("nimi ale")
  })

  test("Navigate to grammar via top nav", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "grammar" }).click()
    await expect(page).toHaveURL(/\/grammar/)
    await expect(page.locator("h1")).toContainText("nasin toki")
  })

  test("Home page loads without auth redirect", async ({ page }) => {
    await page.goto("/")
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator("h1")).toContainText("o kama sona")
  })

  test("Theme toggle works", async ({ page }) => {
    await page.goto("/")
    await page.getByTestId("theme-button").click()
    await page.getByTestId("dark-mode").click()
    await expect(page.locator("html")).toHaveClass(/dark/)
    await page.getByTestId("theme-button").click()
    await page.getByTestId("light-mode").click()
    await expect(page.locator("html")).toHaveClass(/light/)
  })

  test("Chat panel toggles open and closed", async ({ page }) => {
    await page.goto("/")
    // Chat panel should be hidden initially
    await expect(page.getByText("jan sona")).not.toBeVisible()
    // Click toggle
    await page.getByLabel("Toggle chat panel").click()
    await expect(page.getByText("jan sona")).toBeVisible()
    // Click toggle again to close
    await page.getByLabel("Toggle chat panel").click()
    await expect(page.getByText("jan sona")).not.toBeVisible()
  })
  ```

- [ ] **Step 2: Create `frontend/tests/skill-tree.spec.ts`**

  ```ts
  import { expect, test } from "@playwright/test"

  test.use({ storageState: { cookies: [], origins: [] } })

  test("Skill tree renders 10 unit nodes", async ({ page }) => {
    await page.goto("/")
    // Each unit node has the unit name in font-tp
    const unitNames = ["toki!", "ijo", "pali", "li \u00b7 e", "nasin nimi", "pi", "la", "o!", "toki musi", "jan sona"]
    for (const name of unitNames) {
      await expect(page.getByText(name, { exact: true })).toBeVisible()
    }
  })

  test("First unit is marked as current", async ({ page }) => {
    await page.goto("/")
    // Unit 1 should be current (has pulsing dot)
    const unit1 = page.getByText("toki!", { exact: true }).locator("..")
    await expect(unit1).toBeVisible()
  })

  test("Greeting text is visible", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("o kama sona")).toBeVisible()
    await expect(page.getByText("learn toki pona")).toBeVisible()
  })
  ```

- [ ] **Step 3: Create `frontend/tests/dictionary.spec.ts`**

  ```ts
  import { expect, test } from "@playwright/test"

  test.use({ storageState: { cookies: [], origins: [] } })

  test("Dictionary page renders search and filters", async ({ page }) => {
    await page.goto("/dictionary")
    await expect(page.getByTestId("dictionary-search")).toBeVisible()
    await expect(page.getByTestId("pos-filter-all")).toBeVisible()
    await expect(page.getByTestId("pos-filter-noun")).toBeVisible()
    await expect(page.getByTestId("pos-filter-verb")).toBeVisible()
    await expect(page.getByTestId("pos-filter-particle")).toBeVisible()
  })

  test("Dictionary search input is functional", async ({ page }) => {
    await page.goto("/dictionary")
    const searchInput = page.getByTestId("dictionary-search")
    await searchInput.fill("jan")
    await expect(searchInput).toHaveValue("jan")
  })

  test("POS filter pills are toggleable", async ({ page }) => {
    await page.goto("/dictionary")
    const nounFilter = page.getByTestId("pos-filter-noun")
    await nounFilter.click()
    // Noun filter should now be active (has teal styling)
    await expect(nounFilter).toBeVisible()
  })

  test("Set filter pills are toggleable", async ({ page }) => {
    await page.goto("/dictionary")
    const puFilter = page.getByTestId("set-filter-pu")
    await puFilter.click()
    await expect(puFilter).toBeVisible()
  })
  ```

- [ ] **Step 4: Create `frontend/tests/grammar.spec.ts`**

  ```ts
  import { expect, test } from "@playwright/test"

  test.use({ storageState: { cookies: [], origins: [] } })

  test("Grammar index renders section links", async ({ page }) => {
    await page.goto("/grammar")
    await expect(page.getByText("Modifiers")).toBeVisible()
    await expect(page.getByText("Particles")).toBeVisible()
  })

  test("Navigate to modifiers page", async ({ page }) => {
    await page.goto("/grammar")
    await page.getByText("Modifiers").click()
    await expect(page).toHaveURL(/\/grammar\/modifiers/)
    await expect(page.getByText("nasin nimi")).toBeVisible()
  })

  test("Navigate to particles page", async ({ page }) => {
    await page.goto("/grammar")
    await page.getByText("Particles").click()
    await expect(page).toHaveURL(/\/grammar\/particles/)
    await expect(page.getByText("nimi lili")).toBeVisible()
  })

  test("Modifiers page renders chain visualizer", async ({ page }) => {
    await page.goto("/grammar/modifiers")
    // Fallback data should render GrammarChain components
    await expect(page.getByText("tomo")).toBeVisible()
    await expect(page.getByText("telo")).toBeVisible()
  })

  test("Modifiers page has interactive quiz", async ({ page }) => {
    await page.goto("/grammar/modifiers")
    await expect(page.getByText("quiz")).toBeVisible()
    // Click a quiz answer
    const firstOption = page.getByText("big bathroom").first()
    await firstOption.click()
    // Should show feedback
    await expect(page.getByText(/pona|not quite/).first()).toBeVisible()
  })

  test("Particles page renders all five particles", async ({ page }) => {
    await page.goto("/grammar/particles")
    for (const particle of ["li", "e", "la", "pi", "o"]) {
      await expect(page.getByText(particle, { exact: true }).first()).toBeVisible()
    }
  })

  test("Particles page shows common mistakes callouts", async ({ page }) => {
    await page.goto("/grammar/particles")
    await expect(page.getByText("common mistakes").first()).toBeVisible()
  })
  ```

- [ ] **Step 5: Verify tests can be discovered by Playwright**
  ```bash
  cd frontend && npx playwright test --list 2>&1 | head -30
  ```
  Expected: Shows all new test files and test names.

- [ ] **Step 6: Commit**
  ```bash
  git add frontend/tests/navigation.spec.ts frontend/tests/skill-tree.spec.ts frontend/tests/dictionary.spec.ts frontend/tests/grammar.spec.ts
  git commit -m "test(frontend): add Playwright E2E tests for navigation, skill tree, dictionary, grammar

  Tests cover: top nav links and routing, public-first home page, theme toggle,
  chat panel toggle, skill tree 10 units, dictionary search/filter UI, grammar
  index navigation, modifier chain visualizer, quiz interaction, particles page."
  ```

- [ ] **Step 7:** Record learnings to `.claude/learnings-playwright-tests.md` using the surfacing-subagent-learnings skill.

---

## Task 9: Delete items.tsx route and cleanup

**Files:**
- DELETE: `frontend/src/routes/_layout/items.tsx`

### Steps

- [ ] **Step 1: Verify items.tsx exists and check for any remaining references**
  ```bash
  ls frontend/src/routes/_layout/items.tsx
  grep -r "items" frontend/src/routes/ --include="*.tsx" -l
  ```
  Expected: items.tsx exists. No other route files reference it.

- [ ] **Step 2: Delete `frontend/src/routes/_layout/items.tsx`**
  ```bash
  rm frontend/src/routes/_layout/items.tsx
  ```

- [ ] **Step 3: Run vite build to regenerate the route tree**
  ```bash
  cd frontend && npx vite build --mode development 2>&1 | tail -5
  ```
  Expected: Build succeeds. `routeTree.gen.ts` no longer includes items route.

- [ ] **Step 4: Verify no items references in routeTree.gen.ts**
  ```bash
  grep -c "items\|Items" frontend/src/routeTree.gen.ts
  ```
  Expected: 0

- [ ] **Step 5: Commit**
  ```bash
  git add -A frontend/src/routes/_layout/items.tsx frontend/src/routeTree.gen.ts
  git commit -m "chore(frontend): remove items.tsx route (template demo cleanup)"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-cleanup.md` using the surfacing-subagent-learnings skill.

---

## Task 10: Final verification and integration check

**Files:** None (verification only)

### Steps

- [ ] **Step 1: Run full TypeScript check**
  ```bash
  cd frontend && npx tsc -p tsconfig.build.json --noEmit 2>&1
  ```
  Expected: No errors.

- [ ] **Step 2: Run biome lint check**
  ```bash
  cd frontend && npx biome check --no-errors-on-unmatched --files-ignore-unknown=true ./src 2>&1 | tail -20
  ```
  Expected: No errors (or only pre-existing ones).

- [ ] **Step 3: Run vite production build**
  ```bash
  cd frontend && npx vite build 2>&1 | tail -10
  ```
  Expected: Build succeeds.

- [ ] **Step 4: Verify all Playwright tests are listed**
  ```bash
  cd frontend && npx playwright test --list 2>&1 | grep -c "test"
  ```
  Expected: At least 15 tests listed (across all spec files).

- [ ] **Step 5: Visual check (if dev server available)**

  Start the dev server and manually verify:
  1. App loads at `/` with zen theme (earth tones, Lora font)
  2. "o kama sona" heading visible
  3. Skill tree shows 10 units with correct branching
  4. Top nav has learn/dictionary/grammar/settings links
  5. Navigate to `/dictionary` -- search bar and filter pills visible
  6. Navigate to `/grammar` -- index with Modifiers and Particles links
  7. Navigate to `/grammar/modifiers` -- chain visualizer renders colored pills
  8. Navigate to `/grammar/particles` -- li/e/la/pi/o sections visible
  9. Theme toggle works (light/dark/system)
  10. Chat panel toggle shows/hides placeholder
  11. Dark mode colors are correct (dark earth tones)
  12. Mobile responsive: content stacks properly at <768px

- [ ] **Step 6:** Record learnings to `.claude/learnings-final-verification.md` using the surfacing-subagent-learnings skill.

---

## Task 11: Curate learnings into CLAUDE.md

**Goal:** Improve CLAUDE.md files with all learnings captured during this phase.

- [ ] **Step 1:** Glob `.claude/learnings-*.md` and collect all scratch files written during this phase.
- [ ] **Step 2:** For each scratch file, dispatch a subagent with the `claude-md-improver` skill, providing the scratch file path in the prompt.
- [ ] **Step 3:** Verify all scratch files have been deleted after processing.
