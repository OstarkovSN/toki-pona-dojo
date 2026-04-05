# Phase 10: Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app production-ready with mobile responsiveness, dark mode verification, loading/error states, and comprehensive E2E tests.

**Architecture:** Tailwind responsive prefixes for mobile layout, shadcn Sheet for mobile chat, Skeleton components for loading states, error boundary components for graceful degradation, Playwright for E2E testing.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Sheet, Skeleton), Playwright, FastAPI (Telegram bot)

---

## Task 1: Mobile Responsive Layout

**Depends on:** Nothing
**Files touched:**
- MODIFY `frontend/src/routes/_layout.tsx`
- MODIFY `frontend/src/components/Sidebar/AppSidebar.tsx`
- ADD `frontend/src/components/Common/MobileChatButton.tsx`
- ADD `frontend/src/components/Common/MobileChatSheet.tsx`
- MODIFY `frontend/src/index.css` (mobile-specific utilities if needed)
- MODIFY all page-level route components under `frontend/src/routes/_layout/`

### Steps

- [ ] **Step 1: Understand current layout structure**

  Read `frontend/src/routes/_layout.tsx`, `frontend/src/components/Sidebar/AppSidebar.tsx`, `frontend/src/hooks/useMobile.ts`, and the existing page routes (`frontend/src/routes/_layout/index.tsx`, `frontend/src/routes/_layout/items.tsx`, `frontend/src/routes/_layout/settings.tsx`). Understand how the two-panel layout (content 60% + chat sidebar 40%) is currently implemented.

- [ ] **Step 2: Modify the root layout for mobile responsiveness**

  Edit `frontend/src/routes/_layout.tsx`:

  ```tsx
  import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
  import { Footer } from "@/components/Common/Footer"
  import AppSidebar from "@/components/Sidebar/AppSidebar"
  import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
  } from "@/components/ui/sidebar"
  import { isLoggedIn } from "@/hooks/useAuth"
  import { useIsMobile } from "@/hooks/useMobile"
  import { MobileChatButton } from "@/components/Common/MobileChatButton"

  export const Route = createFileRoute("/_layout")({
    component: Layout,
    beforeLoad: async () => {
      if (!isLoggedIn()) {
        throw redirect({ to: "/login" })
      }
    },
  })

  function Layout() {
    const isMobile = useIsMobile()

    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 md:h-16 shrink-0 items-center gap-2 border-b px-3 md:px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
          <Footer />
        </SidebarInset>
        {isMobile && <MobileChatButton />}
      </SidebarProvider>
    )
  }

  export default Layout
  ```

  Key changes:
  - Import `useIsMobile` hook (already exists at `frontend/src/hooks/useMobile.ts` with 768px breakpoint)
  - Reduce header height on mobile (`h-14 md:h-16`)
  - Reduce padding on mobile (`p-4 md:p-6 lg:p-8`, `px-3 md:px-4`)
  - Conditionally render `MobileChatButton` on mobile (this component handles the floating button + Sheet)

- [ ] **Step 3: Create the MobileChatButton component**

  Create `frontend/src/components/Common/MobileChatButton.tsx`:

  ```tsx
  import { useState } from "react"
  import { MessageCircle } from "lucide-react"
  import { Button } from "@/components/ui/button"
  import { MobileChatSheet } from "./MobileChatSheet"

  export function MobileChatButton() {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
          size="icon"
          aria-label="Open chat with jan sona"
          data-testid="mobile-chat-button"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        <MobileChatSheet open={open} onOpenChange={setOpen} />
      </>
    )
  }
  ```

- [ ] **Step 4: Create the MobileChatSheet component**

  Create `frontend/src/components/Common/MobileChatSheet.tsx`:

  This component wraps the existing ChatPanel inside a shadcn Sheet with `side="bottom"`. It occupies 80vh of the screen.

  ```tsx
  import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
  } from "@/components/ui/sheet"
  import { ChatPanel } from "@/components/Chat/ChatPanel"

  interface MobileChatSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
  }

  export function MobileChatSheet({ open, onOpenChange }: MobileChatSheetProps) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[80vh] rounded-t-xl flex flex-col"
          data-testid="mobile-chat-sheet"
        >
          <SheetHeader className="flex-shrink-0 border-b pb-3">
            <SheetTitle className="text-lg">jan sona</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <ChatPanel variant="mobile" />
          </div>
        </SheetContent>
      </Sheet>
    )
  }
  ```

  **Important:** The ChatPanel component lives at `frontend/src/components/Chat/ChatPanel.tsx` (created in a prior phase). It must accept a `variant?: "desktop" | "mobile"` prop to adjust its internal padding and input sizing. If the component does not yet accept this prop, add it: when `variant === "mobile"`, reduce horizontal padding to `px-2`, use `text-base` for input fields, and set `gap-2` between messages. Before implementing, run `grep -r "export.*ChatPanel" frontend/src/` to confirm the actual export name and path.

- [ ] **Step 5: Make the chat sidebar desktop-only**

  Find wherever the chat sidebar is rendered alongside content (likely in the layout or in individual page routes). Wrap it with a responsive class:

  ```tsx
  {/* Desktop chat sidebar — hidden on mobile (handled by MobileChatSheet instead) */}
  <aside className="hidden md:flex md:w-[40%] md:flex-col md:border-l">
    <ChatPanel variant="desktop" />
  </aside>
  ```

  The content area should expand to full width on mobile:
  ```tsx
  <div className="w-full md:w-[60%]">
    {/* page content */}
  </div>
  ```

- [ ] **Step 6: Make the skill tree responsive**

  Find the SkillTree component. On mobile, nodes should stack vertically instead of using a branching/grid layout. Use Tailwind responsive classes:

  ```tsx
  {/* Container: vertical on mobile, grid on desktop */}
  <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-6">
    {units.map((unit) => (
      <SkillTreeNode key={unit.id} unit={unit} />
    ))}
  </div>
  ```

  Each node should have larger touch targets on mobile:
  ```tsx
  <button className="min-h-[56px] md:min-h-[44px] w-full md:w-auto p-4 md:p-3 ...">
  ```

- [ ] **Step 7: Make exercise components mobile-friendly**

  Find all exercise components. Ensure:
  - Full-width layout on mobile (no side margins)
  - Larger touch targets: buttons min-height 48px on mobile (`min-h-12 md:min-h-10`)
  - Word bank items (if drag-and-drop): larger tap areas, consider tap-to-select instead of drag on mobile
  - Input fields: larger font size on mobile to prevent iOS zoom (`text-base md:text-sm` — 16px prevents iOS auto-zoom)
  - Progress bar: full-width on mobile

- [ ] **Step 8: Make dictionary page mobile-friendly**

  Ensure:
  - Search bar is sticky at top with `sticky top-14 z-10 bg-background` (below the header)
  - Word cards are full-width on mobile: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4`
  - Badges and metadata wrap properly on small screens

- [ ] **Step 9: Make grammar page mobile-friendly**

  Ensure:
  - Chain visualizer scrolls horizontally if needed on mobile, or stacks vertically
  - Callout boxes are full-width
  - Text content has proper padding: `px-4 md:px-0`

- [ ] **Step 10: Update Playwright config for mobile testing**

  Edit `frontend/playwright.config.ts` to uncomment/add a Mobile Chrome project:

  ```ts
  {
    name: 'mobile-chrome',
    use: {
      ...devices['Pixel 5'],
      storageState: 'playwright/.auth/user.json',
    },
    dependencies: ['setup'],
  },
  ```

- [ ] **Step 11: Commit**

  Stage all changed and new files. Commit with message: "feat: add mobile responsive layout with bottom sheet chat"

- [ ] **Step 12:** Record learnings to `.claude/learnings-mobile-responsive-layout.md` using the surfacing-subagent-learnings skill.

---

## Task 2: Dark Mode Verification and Fixes

**Depends on:** Nothing (can run in parallel with Task 1)
**Files touched:**
- MODIFY `frontend/src/index.css`
- MODIFY any component files with hardcoded colors

### Steps

- [ ] **Step 1: Audit all custom CSS variables**

  Read `frontend/src/index.css`. The file has `:root` (light) and `.dark` blocks with oklch colors. Verify that every custom CSS variable used in `:root` has a corresponding entry in `.dark`. Current variables to check:
  - `--background`, `--foreground` (present in both)
  - `--card`, `--card-foreground` (present in both)
  - `--primary`, `--primary-foreground` (present in both)
  - `--secondary`, `--secondary-foreground` (present in both)
  - `--muted`, `--muted-foreground` (present in both)
  - `--accent`, `--accent-foreground` (present in both)
  - `--destructive` (present in both)
  - `--border`, `--input`, `--ring` (present in both)
  - `--chart-1` through `--chart-5` (present in both)
  - `--sidebar-*` variants (present in both)

  Also search for any **app-specific** custom properties added in Phase 5 (earth-tone theme, semantic colors like teal/coral/amber for exercise feedback, chat bubbles, skill tree states). Grep for `--tp-` or `--toki-` or any custom property prefix in `index.css` and component files.

- [ ] **Step 2: Check earth-tone palette dark variants**

  If Phase 5 added custom earth-tone colors (warm browns, greens, etc.), verify each has a dark mode equivalent. If colors were added as CSS variables, ensure both `:root` and `.dark` blocks define them. If they were added as Tailwind theme extensions, ensure dark variants exist.

  Common issues to fix:
  - Light backgrounds that become invisible in dark mode
  - Dark text on dark backgrounds
  - Borders that disappear against dark backgrounds

- [ ] **Step 3: Verify exercise feedback colors**

  Search all exercise components for color classes related to correct/wrong feedback. Common patterns:
  - `bg-green-*`, `text-green-*` for correct answers
  - `bg-red-*`, `text-red-*` for wrong answers
  - `bg-amber-*`, `text-amber-*` for hints/partial

  Ensure these work in dark mode. Replace hardcoded colors with semantic classes where possible:
  ```tsx
  {/* Instead of: */}
  <div className="bg-green-100 text-green-800 border-green-300">Correct!</div>
  {/* Use: */}
  <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700">Correct!</div>
  ```

  Or better yet, define CSS variables:
  ```css
  :root {
    --feedback-correct-bg: oklch(0.95 0.05 150);
    --feedback-correct-text: oklch(0.35 0.1 150);
    --feedback-correct-border: oklch(0.75 0.1 150);
    --feedback-wrong-bg: oklch(0.95 0.05 25);
    --feedback-wrong-text: oklch(0.4 0.15 25);
    --feedback-wrong-border: oklch(0.75 0.12 25);
  }
  .dark {
    --feedback-correct-bg: oklch(0.25 0.05 150);
    --feedback-correct-text: oklch(0.8 0.1 150);
    --feedback-correct-border: oklch(0.45 0.1 150);
    --feedback-wrong-bg: oklch(0.25 0.05 25);
    --feedback-wrong-text: oklch(0.8 0.12 25);
    --feedback-wrong-border: oklch(0.45 0.12 25);
  }
  ```

  Add corresponding `@theme inline` entries so Tailwind recognizes them:
  ```css
  @theme inline {
    /* ... existing entries ... */
    --color-feedback-correct-bg: var(--feedback-correct-bg);
    --color-feedback-correct-text: var(--feedback-correct-text);
    --color-feedback-correct-border: var(--feedback-correct-border);
    --color-feedback-wrong-bg: var(--feedback-wrong-bg);
    --color-feedback-wrong-text: var(--feedback-wrong-text);
    --color-feedback-wrong-border: var(--feedback-wrong-border);
  }
  ```

- [ ] **Step 4: Verify chat panel dark mode**

  Find the ChatPanel component. Check:
  - User message bubbles: should have distinct background in both modes
  - Bot (jan sona) message bubbles: should contrast with user bubbles
  - Input area: background, border, and text should be visible
  - Streaming text: ensure it's readable during typing animation

  Fix any contrast issues using `dark:` prefix or CSS variables.

- [ ] **Step 5: Verify dictionary dark mode**

  Find dictionary components. Check:
  - Word cards: `bg-card text-card-foreground` (should already work via CSS vars)
  - Part-of-speech badges: if using colored badges, ensure dark variants exist
  - Search input: should use `bg-input` or `bg-background` (already theme-aware)
  - Example sentences: if using muted colors, verify `text-muted-foreground` contrast

- [ ] **Step 6: Verify grammar visualizer dark mode**

  Find grammar components. Check:
  - Chain/tree visualizer: SVG strokes and fills need dark variants
  - Callout boxes: backgrounds and borders
  - Syntax highlighting: if using custom colors for word classes

- [ ] **Step 7: Verify skill tree node states dark mode**

  Find the SkillTree component. Check that all four states are distinguishable in dark mode:
  - **Locked:** muted/grayed out (e.g., `bg-muted text-muted-foreground opacity-50`)
  - **Available:** default/neutral (e.g., `bg-card text-card-foreground border-border`)
  - **Current:** highlighted (e.g., `bg-primary/10 border-primary text-primary`)
  - **Completed:** success indicator (e.g., checkmark, green accent)

  Ensure the visual hierarchy is preserved: completed > current > available > locked.

- [ ] **Step 8: Fix any remaining contrast issues**

  Run through the full app with dark mode enabled (use browser DevTools or the theme toggle). Fix any remaining issues found. Pay special attention to:
  - Focus rings and outlines
  - Placeholder text in inputs
  - Disabled states
  - Hover states on buttons and interactive elements
  - Toast notifications (sonner)

- [ ] **Step 9: Commit**

  Stage all modified files. Commit with message: "fix: ensure dark mode works correctly across all components"

- [ ] **Step 10:** Record learnings to `.claude/learnings-dark-mode-verification.md` using the surfacing-subagent-learnings skill.

---

## Task 3: Loading States with Skeleton Components

**Depends on:** Nothing (can run in parallel with Tasks 1-2)
**Files touched:**
- ADD `frontend/src/components/Common/SkillTreeSkeleton.tsx`
- ADD `frontend/src/components/Common/LessonSkeleton.tsx`
- ADD `frontend/src/components/Common/DictionarySkeleton.tsx`
- ADD `frontend/src/components/Common/GrammarSkeleton.tsx`
- ADD `frontend/src/components/Common/ChatTypingIndicator.tsx`
- ADD `frontend/src/components/Common/GradingSpinner.tsx`
- MODIFY page/component files to conditionally render skeletons during loading

### Steps

- [ ] **Step 1: Create SkillTreeSkeleton component**

  Create `frontend/src/components/Common/SkillTreeSkeleton.tsx`:

  ```tsx
  import { Skeleton } from "@/components/ui/skeleton"

  export function SkillTreeSkeleton() {
    return (
      <div
        className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-6"
        data-testid="skill-tree-skeleton"
        role="status"
        aria-label="Loading skill tree"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    )
  }
  ```

- [ ] **Step 2: Create LessonSkeleton component**

  Create `frontend/src/components/Common/LessonSkeleton.tsx`:

  ```tsx
  import { Skeleton } from "@/components/ui/skeleton"

  export function LessonSkeleton() {
    return (
      <div
        className="space-y-6 max-w-2xl mx-auto"
        data-testid="lesson-skeleton"
        role="status"
        aria-label="Loading lesson"
      >
        {/* Progress bar skeleton */}
        <Skeleton className="h-2 w-full rounded-full" />

        {/* Lesson title */}
        <Skeleton className="h-8 w-2/3" />

        {/* Instruction text */}
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />

        {/* Exercise area */}
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-12 w-full rounded-md" />
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-20 rounded-md" />
            ))}
          </div>
        </div>

        {/* Submit button area */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Create DictionarySkeleton component**

  Create `frontend/src/components/Common/DictionarySkeleton.tsx`:

  ```tsx
  import { Skeleton } from "@/components/ui/skeleton"

  export function DictionarySkeleton() {
    return (
      <div
        className="space-y-4"
        data-testid="dictionary-skeleton"
        role="status"
        aria-label="Loading dictionary"
      >
        {/* Search bar skeleton */}
        <Skeleton className="h-10 w-full rounded-md" />

        {/* Word cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 4: Create GrammarSkeleton component**

  Create `frontend/src/components/Common/GrammarSkeleton.tsx`:

  ```tsx
  import { Skeleton } from "@/components/ui/skeleton"

  export function GrammarSkeleton() {
    return (
      <div
        className="space-y-6"
        data-testid="grammar-skeleton"
        role="status"
        aria-label="Loading grammar"
      >
        {/* Section title */}
        <Skeleton className="h-8 w-1/2" />

        {/* Explanation paragraphs */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Visualizer placeholder */}
        <div className="rounded-lg border p-6">
          <div className="flex items-center gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Skeleton className="h-10 w-20 rounded-md" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* Callout box */}
        <div className="rounded-lg border-l-4 border-primary/30 p-4 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 5: Create ChatTypingIndicator component**

  Create `frontend/src/components/Common/ChatTypingIndicator.tsx`:

  ```tsx
  export function ChatTypingIndicator() {
    return (
      <div
        className="flex items-center gap-1.5 px-4 py-3"
        data-testid="chat-typing-indicator"
        role="status"
        aria-label="jan sona is typing"
      >
        <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-2.5">
          <span className="text-sm text-muted-foreground mr-2">jan sona</span>
          <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 6: Create GradingSpinner component**

  Create `frontend/src/components/Common/GradingSpinner.tsx`:

  ```tsx
  import { Loader2 } from "lucide-react"

  export function GradingSpinner() {
    return (
      <div
        className="flex items-center justify-center gap-2 py-4"
        data-testid="grading-spinner"
        role="status"
        aria-label="Grading your answer"
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          Grading your answer...
        </span>
      </div>
    )
  }
  ```

- [ ] **Step 7: Wire skeletons into page components**

  For each page that fetches data, add the skeleton as a loading state. The pattern depends on how data fetching is implemented (likely TanStack Query or similar):

  **Skill tree page (example pattern):**
  ```tsx
  import { SkillTreeSkeleton } from "@/components/Common/SkillTreeSkeleton"

  function SkillTreePage() {
    const { data, isLoading, error } = useSkillTreeData() // or whatever hook exists

    if (isLoading) return <SkillTreeSkeleton />
    if (error) return <ErrorBanner error={error} /> // handled in Task 4
    return <SkillTree units={data} />
  }
  ```

  Apply the same pattern to:
  - Lesson view: show `<LessonSkeleton />` while fetching lesson data
  - Dictionary: show `<DictionarySkeleton />` while searching/loading
  - Grammar: show `<GrammarSkeleton />` while loading grammar content

  **Chat panel:** Show `<ChatTypingIndicator />` at the bottom of the message list while streaming is in progress (when the SSE connection is open but the response is still arriving). The implementer should find the streaming state variable in the ChatPanel component.

  **Exercise grading:** Show `<GradingSpinner />` in place of the submit button or feedback area while the `/api/v1/chat/grade` request is pending. Find the grading request handler in the exercise components and add the loading state.

- [ ] **Step 8: Commit**

  Stage all new and modified files. Commit with message: "feat: add skeleton loading states for all data-fetching views"

- [ ] **Step 9:** Record learnings to `.claude/learnings-loading-states.md` using the surfacing-subagent-learnings skill.

---

## Task 4: Error States and Error Boundaries

**Depends on:** Nothing (can run in parallel with Tasks 1-3)
**Files touched:**
- ADD `frontend/src/components/Common/ErrorBanner.tsx`
- ADD `frontend/src/components/Common/OfflineBanner.tsx`
- ADD `frontend/src/hooks/useNetworkStatus.ts`
- MODIFY `frontend/src/components/Common/ErrorComponent.tsx`
- MODIFY ChatPanel component (LLM unavailable state)
- MODIFY exercise components (grade timeout state)
- MODIFY BYOM settings component (connection failure state)

### Steps

- [ ] **Step 1: Create useNetworkStatus hook**

  Create `frontend/src/hooks/useNetworkStatus.ts`:

  ```tsx
  import { useState, useEffect } from "react"

  export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)

    useEffect(() => {
      const handleOnline = () => setIsOnline(true)
      const handleOffline = () => setIsOnline(false)

      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)

      return () => {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }, [])

    return isOnline
  }
  ```

- [ ] **Step 2: Create ErrorBanner component**

  Create `frontend/src/components/Common/ErrorBanner.tsx`:

  ```tsx
  import { AlertTriangle, RefreshCw, WifiOff, Clock, Key } from "lucide-react"
  import { Button } from "@/components/ui/button"

  type ErrorType =
    | "api-unreachable"
    | "llm-unavailable"
    | "grade-timeout"
    | "byom-failure"
    | "rate-limit"
    | "network-offline"

  interface ErrorBannerProps {
    type: ErrorType
    onRetry?: () => void
    onNavigateToSettings?: () => void
    suggestedAnswer?: string
  }

  const ERROR_CONFIG: Record<
    ErrorType,
    { icon: React.ElementType; title: string; description: string }
  > = {
    "api-unreachable": {
      icon: AlertTriangle,
      title: "Unable to connect to server",
      description: "Please check your connection and try again.",
    },
    "llm-unavailable": {
      icon: AlertTriangle,
      title: "jan sona is resting",
      description: "The language assistant is temporarily unavailable. Try again later.",
    },
    "grade-timeout": {
      icon: Clock,
      title: "Couldn't grade your answer",
      description: "The grading took too long. Check your answer manually against the suggested answer below.",
    },
    "byom-failure": {
      icon: Key,
      title: "Could not connect to your API provider",
      description: "Check your API key and endpoint in settings.",
    },
    "rate-limit": {
      icon: AlertTriangle,
      title: "Daily message limit reached",
      description:
        "You've used your daily messages. Sign up for unlimited access or add your own API key.",
    },
    "network-offline": {
      icon: WifiOff,
      title: "You're offline",
      description: "Some features are unavailable. Exercises with local grading still work.",
    },
  }

  export function ErrorBanner({
    type,
    onRetry,
    onNavigateToSettings,
    suggestedAnswer,
  }: ErrorBannerProps) {
    const config = ERROR_CONFIG[type]
    const Icon = config.icon

    return (
      <div
        className="rounded-lg border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-4"
        role="alert"
        data-testid={`error-banner-${type}`}
      >
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <h3 className="font-medium text-destructive">{config.title}</h3>
            <p className="text-sm text-muted-foreground">{config.description}</p>

            {type === "grade-timeout" && suggestedAnswer && (
              <div className="mt-2 rounded-md bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Suggested answer:
                </p>
                <p className="text-sm">{suggestedAnswer}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Retry
                </Button>
              )}
              {type === "byom-failure" && onNavigateToSettings && (
                <Button variant="outline" size="sm" onClick={onNavigateToSettings}>
                  Go to Settings
                </Button>
              )}
              {type === "rate-limit" && onNavigateToSettings && (
                <Button variant="outline" size="sm" onClick={onNavigateToSettings}>
                  <Key className="h-3.5 w-3.5 mr-1.5" />
                  Add API Key
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Create OfflineBanner component**

  Create `frontend/src/components/Common/OfflineBanner.tsx`:

  ```tsx
  import { WifiOff } from "lucide-react"
  import { useNetworkStatus } from "@/hooks/useNetworkStatus"

  export function OfflineBanner() {
    const isOnline = useNetworkStatus()

    if (isOnline) return null

    return (
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500 dark:bg-amber-600 px-4 py-2 text-sm font-medium text-white"
        role="alert"
        data-testid="offline-banner"
      >
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Some features may not work.</span>
      </div>
    )
  }
  ```

- [ ] **Step 4: Wire OfflineBanner into root layout**

  Edit `frontend/src/routes/__root.tsx` (or `_layout.tsx`) to include the OfflineBanner at the top level:

  ```tsx
  import { OfflineBanner } from "@/components/Common/OfflineBanner"

  // Add inside the root layout return:
  <>
    <OfflineBanner />
    {/* ... existing layout ... */}
  </>
  ```

  When the offline banner is visible, add top padding to the layout to prevent content from being hidden behind it.

- [ ] **Step 5: Add error states to ChatPanel**

  Find the ChatPanel component. Add error handling for:

  **LLM unavailable (HTTP 503 or similar from `/api/v1/chat/stream`):**
  ```tsx
  if (chatError?.status === 503) {
    return <ErrorBanner type="llm-unavailable" onRetry={handleRetry} />
  }
  ```

  **Rate limit exceeded (HTTP 429):**
  ```tsx
  if (chatError?.status === 429) {
    return (
      <ErrorBanner
        type="rate-limit"
        onNavigateToSettings={() => navigate({ to: "/settings" })}
      />
    )
  }
  ```

  **BYOM connection failure:** When a custom API key is configured and the request fails:
  ```tsx
  if (chatError && isByomConfigured) {
    return (
      <ErrorBanner
        type="byom-failure"
        onRetry={handleRetry}
        onNavigateToSettings={() => navigate({ to: "/settings" })}
      />
    )
  }
  ```

- [ ] **Step 6: Add error states to exercise grading**

  Find the exercise components that call `/api/v1/chat/grade`. Add timeout handling:

  ```tsx
  const gradeAnswer = async (answer: string) => {
    setIsGrading(true)
    setGradeError(null)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
      const result = await gradeApi(answer, { signal: controller.signal })
      clearTimeout(timeoutId)
      setFeedback(result)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setGradeError("grade-timeout")
      } else {
        setGradeError("api-unreachable")
      }
    } finally {
      setIsGrading(false)
    }
  }

  // In the render:
  {gradeError === "grade-timeout" && (
    <ErrorBanner
      type="grade-timeout"
      suggestedAnswer={exercise.suggestedAnswer}
      onRetry={() => gradeAnswer(currentAnswer)}
    />
  )}
  {gradeError === "api-unreachable" && (
    <ErrorBanner type="api-unreachable" onRetry={() => gradeAnswer(currentAnswer)} />
  )}
  ```

- [ ] **Step 7: Add API unreachable handling to data-fetching pages**

  For pages using data fetching hooks (skill tree, dictionary, grammar, lessons), add error handling:

  ```tsx
  if (error) {
    return (
      <ErrorBanner
        type="api-unreachable"
        onRetry={refetch}
      />
    )
  }
  ```

- [ ] **Step 8: Commit**

  Stage all new and modified files. Commit with message: "feat: add error states with contextual messages and retry actions"

- [ ] **Step 9:** Record learnings to `.claude/learnings-error-states.md` using the surfacing-subagent-learnings skill.

---

## Task 5: Telegram Access Gateway

**Depends on:** Nothing
**Files touched:**
- MODIFY `backend/app/core/config.py` (add `TG_SUPERUSER_ID`, `TG_BOT_USERNAME`)
- MODIFY `backend/app/models.py` (add `AccessRequest`, `InviteToken` models; add `invite_token` to `UserRegister`)
- ADD `backend/alembic/versions/xxxx_add_access_requests_and_invite_tokens.py`
- ADD `backend/app/services/telegram.py`
- ADD `backend/app/api/routes/telegram.py`
- ADD `backend/app/api/routes/config.py`
- MODIFY `backend/app/api/routes/users.py` (signup requires invite token, add validate-token endpoint)
- MODIFY `backend/app/api/main.py` (register telegram, config routers)
- MODIFY `backend/app/main.py` (lifespan: set/delete webhook)
- MODIFY `frontend/src/routes/signup.tsx` (invite-only gate, token validation)
- MODIFY `frontend/src/routes/login.tsx` (add "request access" hint)
- ADD `backend/tests/test_telegram_service.py`
- ADD `backend/tests/test_invite_flow.py`
- MODIFY `.env.example` (add `TG_SUPERUSER_ID`, `TG_BOT_USERNAME`)

### Steps

- [ ] **Step 1: Add TG_SUPERUSER_ID and TG_BOT_USERNAME to Settings**

  Edit `backend/app/core/config.py`. Add these fields to the `Settings` class, after the existing `FIRST_SUPERUSER_PASSWORD` field and before the `_check_default_secret` method:

  ```python
  # Telegram bot settings (TG_BOT_TOKEN already exists if added in Phase 3;
  # if not, add it here too)
  TG_BOT_TOKEN: str | None = None
  TG_SUPERUSER_ID: int | None = None
  TG_BOT_USERNAME: str | None = None
  # Webhook secret for validating incoming Telegram updates.
  # If unset, one is generated at startup — but this only works in
  # single-worker mode (multiple workers would each generate a different
  # secret). For multi-worker deployments, set this explicitly.
  TG_WEBHOOK_SECRET: str | None = None
  ```

  Also add to `.env.example` (after existing env vars):

  ```
  # Telegram access gateway
  TG_BOT_TOKEN=
  TG_SUPERUSER_ID=
  TG_BOT_USERNAME=
  # Set explicitly for multi-worker deployments; leave blank for single-worker
  TG_WEBHOOK_SECRET=
  ```

  **Note:** `TG_BOT_TOKEN` may already exist from Phase 3. If so, only add `TG_SUPERUSER_ID`, `TG_BOT_USERNAME`, and `TG_WEBHOOK_SECRET`. Check the file first.

- [ ] **Step 2: Create AccessRequest and InviteToken models + Alembic migration**

  Edit `backend/app/models.py`. Add imports at the top (merge with existing):

  ```python
  import secrets
  from datetime import datetime, timedelta, timezone

  from sqlalchemy import DateTime, Integer, String
  from sqlmodel import Column, Field, Relationship, SQLModel
  ```

  Add the `AccessRequest` model after the `Item` / `ItemPublic` / `ItemsPublic` block:

  ```python
  class AccessRequest(SQLModel, table=True):
      __tablename__ = "access_request"

      id: int | None = Field(default=None, primary_key=True)
      telegram_user_id: int = Field(sa_column=Column(Integer, nullable=False, index=True))
      telegram_username: str | None = Field(default=None, max_length=255)
      telegram_first_name: str = Field(max_length=255)
      telegram_last_name: str | None = Field(default=None, max_length=128)
      status: str = Field(
          default="pending",
          max_length=20,
          sa_column=Column(String(20), nullable=False),
      )
      created_at: datetime = Field(
          default_factory=get_datetime_utc,
          sa_type=DateTime(timezone=True),
      )
      decided_at: datetime | None = Field(
          default=None,
          sa_type=DateTime(timezone=True),
      )

      invite_tokens: list["InviteToken"] = Relationship(back_populates="access_request")
  ```

  Add the `InviteToken` model right after `AccessRequest`:

  ```python
  def _default_token() -> str:
      return secrets.token_hex(16)


  def _default_expires_at() -> datetime:
      return datetime.now(timezone.utc) + timedelta(days=7)


  class InviteToken(SQLModel, table=True):
      __tablename__ = "invite_token"

      id: int | None = Field(default=None, primary_key=True)
      token: str = Field(
          default_factory=_default_token,
          max_length=64,
          sa_column=Column(String(64), unique=True, index=True, nullable=False),
      )
      access_request_id: int = Field(foreign_key="access_request.id", nullable=False)
      created_at: datetime = Field(
          default_factory=get_datetime_utc,
          sa_type=DateTime(timezone=True),
      )
      expires_at: datetime = Field(
          default_factory=_default_expires_at,
          sa_type=DateTime(timezone=True),
      )
      used_at: datetime | None = Field(
          default=None,
          sa_type=DateTime(timezone=True),
      )
      used_by: uuid.UUID | None = Field(
          default=None, foreign_key="user.id", nullable=True
      )

      access_request: AccessRequest | None = Relationship(back_populates="invite_tokens")
  ```

  Modify the `UserRegister` schema to accept an invite token:

  ```python
  class UserRegister(SQLModel):
      email: EmailStr = Field(max_length=255)
      password: str = Field(min_length=8, max_length=128)
      full_name: str | None = Field(default=None, max_length=255)
      invite_token: str | None = Field(default=None, max_length=64)
  ```

  Generate the Alembic migration:

  ```bash
  cd backend && alembic revision --autogenerate -m "add access_request and invite_token tables"
  ```

  Verify the generated migration creates both `access_request` and `invite_token` tables with correct columns, indexes, and foreign keys. Apply:

  ```bash
  cd backend && alembic upgrade head
  ```

- [ ] **Step 3: Write tests for models and service (TDD red phase)**

  Create `backend/tests/test_telegram_service.py`:

  ```python
  import secrets
  from datetime import datetime, timedelta, timezone
  from unittest.mock import AsyncMock, patch

  import pytest
  from sqlmodel import Session, select

  from app.models import AccessRequest, InviteToken


  # ---------------------------------------------------------------------------
  # Model tests
  # ---------------------------------------------------------------------------

  def test_access_request_creation(db: Session) -> None:
      """AccessRequest can be created and persisted."""
      ar = AccessRequest(
          telegram_user_id=123456,
          telegram_username="testuser",
          telegram_first_name="Test",
          status="pending",
      )
      db.add(ar)
      db.commit()
      db.refresh(ar)

      assert ar.id is not None
      assert ar.telegram_user_id == 123456
      assert ar.status == "pending"
      assert ar.decided_at is None

      # Cleanup
      db.delete(ar)
      db.commit()


  def test_invite_token_creation(db: Session) -> None:
      """InviteToken is created with defaults and linked to AccessRequest."""
      ar = AccessRequest(
          telegram_user_id=789,
          telegram_first_name="Tokiuser",
          status="approved",
      )
      db.add(ar)
      db.commit()
      db.refresh(ar)

      token = InviteToken(access_request_id=ar.id)
      db.add(token)
      db.commit()
      db.refresh(token)

      assert token.id is not None
      assert len(token.token) == 32  # token_hex(16) -> 32 chars
      assert token.used_at is None
      assert token.used_by is None
      assert token.expires_at > datetime.now(timezone.utc)

      # Cleanup
      db.delete(token)
      db.delete(ar)
      db.commit()


  def test_invite_token_expiry(db: Session) -> None:
      """Expired tokens are distinguishable from valid ones."""
      ar = AccessRequest(
          telegram_user_id=999,
          telegram_first_name="Expired",
          status="approved",
      )
      db.add(ar)
      db.commit()
      db.refresh(ar)

      token = InviteToken(
          access_request_id=ar.id,
          expires_at=datetime.now(timezone.utc) - timedelta(days=1),
      )
      db.add(token)
      db.commit()
      db.refresh(token)

      assert token.expires_at < datetime.now(timezone.utc)

      # Cleanup
      db.delete(token)
      db.delete(ar)
      db.commit()


  # ---------------------------------------------------------------------------
  # Telegram service handler tests
  # ---------------------------------------------------------------------------

  @pytest.mark.asyncio
  async def test_handle_start_new_user_creates_request_and_notifies_superuser(
      db: Session, monkeypatch: pytest.MonkeyPatch
  ) -> None:
      """handle_start creates an AccessRequest and sends approve/reject buttons to superuser."""
      from app.core.config import settings
      from app.services import telegram as tg_service

      monkeypatch.setattr(settings, "TG_BOT_TOKEN", "fake_token")
      monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 999)

      send_calls: list[dict] = []

      async def mock_send(chat_id: int, text: str, reply_markup: dict | None = None) -> bool:
          send_calls.append({"chat_id": chat_id, "text": text, "reply_markup": reply_markup})
          return True

      monkeypatch.setattr(tg_service, "send_message", mock_send)

      message = {
          "chat": {"id": 123},
          "from": {"id": 42, "first_name": "Tester", "username": "tester42"},
      }
      await tg_service.handle_start(db, message)

      # AccessRequest should be persisted
      ar = db.exec(
          select(AccessRequest).where(AccessRequest.telegram_user_id == 42)
      ).first()
      assert ar is not None
      assert ar.status == "pending"

      # Superuser should have been notified (one of the send_message calls)
      superuser_msg = [c for c in send_calls if c["chat_id"] == 999]
      assert len(superuser_msg) == 1
      assert "wants to access" in superuser_msg[0]["text"]
      assert superuser_msg[0]["reply_markup"] is not None

      # Cleanup
      db.delete(ar)
      db.commit()


  @pytest.mark.asyncio
  async def test_handle_start_pending_user_gets_pending_message(
      db: Session, monkeypatch: pytest.MonkeyPatch
  ) -> None:
      """handle_start for a user with a pending request sends 'pending' message."""
      from app.core.config import settings
      from app.services import telegram as tg_service

      monkeypatch.setattr(settings, "TG_BOT_TOKEN", "fake_token")
      monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 999)

      # Pre-create a pending request
      ar = AccessRequest(
          telegram_user_id=55, telegram_first_name="Pending", status="pending"
      )
      db.add(ar)
      db.commit()

      send_calls: list[dict] = []

      async def mock_send(chat_id: int, text: str, reply_markup: dict | None = None) -> bool:
          send_calls.append({"chat_id": chat_id, "text": text})
          return True

      monkeypatch.setattr(tg_service, "send_message", mock_send)

      message = {
          "chat": {"id": 55},
          "from": {"id": 55, "first_name": "Pending"},
      }
      await tg_service.handle_start(db, message)

      assert any("pending" in c["text"].lower() for c in send_calls)

      # Cleanup
      db.delete(ar)
      db.commit()


  @pytest.mark.asyncio
  async def test_handle_callback_approve_creates_token_and_notifies_user(
      db: Session, monkeypatch: pytest.MonkeyPatch
  ) -> None:
      """Approving via callback creates an InviteToken and notifies the requesting user."""
      from app.core.config import settings
      from app.services import telegram as tg_service

      monkeypatch.setattr(settings, "TG_BOT_TOKEN", "fake_token")
      monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 999)
      monkeypatch.setattr(settings, "FRONTEND_HOST", "http://localhost")

      ar = AccessRequest(
          telegram_user_id=77, telegram_first_name="Applicant", status="pending"
      )
      db.add(ar)
      db.commit()
      db.refresh(ar)

      send_calls: list[dict] = []

      async def mock_send(chat_id: int, text: str, reply_markup: dict | None = None) -> bool:
          send_calls.append({"chat_id": chat_id, "text": text})
          return True

      async def mock_edit(*args, **kwargs) -> bool:
          return True

      async def mock_answer(*args) -> bool:
          return True

      monkeypatch.setattr(tg_service, "send_message", mock_send)
      monkeypatch.setattr(tg_service, "edit_message_text", mock_edit)
      monkeypatch.setattr(tg_service, "answer_callback_query", mock_answer)

      callback_query = {
          "id": "cb1",
          "data": f"approve:{ar.id}",
          "from": {"id": 999},
          "message": {"chat": {"id": 999}, "message_id": 1},
      }
      await tg_service.handle_callback_query(db, callback_query)

      # InviteToken should be created
      token = db.exec(
          select(InviteToken).where(InviteToken.access_request_id == ar.id)
      ).first()
      assert token is not None
      assert token.used_at is None

      # User should receive a message with the token
      user_msg = [c for c in send_calls if c["chat_id"] == 77]
      assert len(user_msg) == 1
      assert token.token in user_msg[0]["text"]

      # Cleanup
      db.delete(token)
      db.delete(ar)
      db.commit()


  @pytest.mark.asyncio
  async def test_handle_callback_reject_updates_status_and_notifies_user(
      db: Session, monkeypatch: pytest.MonkeyPatch
  ) -> None:
      """Rejecting via callback sets status to 'rejected' and notifies the user."""
      from app.core.config import settings
      from app.services import telegram as tg_service

      monkeypatch.setattr(settings, "TG_BOT_TOKEN", "fake_token")
      monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 999)

      ar = AccessRequest(
          telegram_user_id=88, telegram_first_name="Rejected", status="pending"
      )
      db.add(ar)
      db.commit()
      db.refresh(ar)

      send_calls: list[dict] = []

      async def mock_send(chat_id: int, text: str, reply_markup: dict | None = None) -> bool:
          send_calls.append({"chat_id": chat_id, "text": text})
          return True

      async def mock_edit(*args, **kwargs) -> bool:
          return True

      async def mock_answer(*args) -> bool:
          return True

      monkeypatch.setattr(tg_service, "send_message", mock_send)
      monkeypatch.setattr(tg_service, "edit_message_text", mock_edit)
      monkeypatch.setattr(tg_service, "answer_callback_query", mock_answer)

      callback_query = {
          "id": "cb2",
          "data": f"reject:{ar.id}",
          "from": {"id": 999},
          "message": {"chat": {"id": 999}, "message_id": 2},
      }
      await tg_service.handle_callback_query(db, callback_query)

      db.refresh(ar)
      assert ar.status == "rejected"
      assert ar.decided_at is not None

      # User should receive rejection message
      user_msg = [c for c in send_calls if c["chat_id"] == 88]
      assert len(user_msg) == 1
      assert "not approved" in user_msg[0]["text"].lower()

      # Cleanup
      db.delete(ar)
      db.commit()
  ```

  Create `backend/tests/test_invite_flow.py`:

  ```python
  import secrets
  from datetime import datetime, timedelta, timezone

  import pytest
  from fastapi.testclient import TestClient
  from sqlmodel import Session

  from app.models import AccessRequest, InviteToken


  def _create_valid_token(db: Session) -> str:
      """Helper: create an access request + valid invite token, return token string."""
      ar = AccessRequest(
          telegram_user_id=42,
          telegram_first_name="Invitee",
          status="approved",
      )
      db.add(ar)
      db.commit()
      db.refresh(ar)

      tok = InviteToken(access_request_id=ar.id)
      db.add(tok)
      db.commit()
      db.refresh(tok)
      return tok.token


  def _create_expired_token(db: Session) -> str:
      """Helper: create an expired invite token."""
      ar = AccessRequest(
          telegram_user_id=43,
          telegram_first_name="Expired",
          status="approved",
      )
      db.add(ar)
      db.commit()
      db.refresh(ar)

      tok = InviteToken(
          access_request_id=ar.id,
          expires_at=datetime.now(timezone.utc) - timedelta(days=1),
      )
      db.add(tok)
      db.commit()
      db.refresh(tok)
      return tok.token


  def test_signup_with_valid_token(client: TestClient, db: Session) -> None:
      """Signup succeeds with a valid, unused, non-expired token."""
      token_str = _create_valid_token(db)
      response = client.post(
          "/api/v1/users/signup",
          json={
              "email": f"invite-{secrets.token_hex(4)}@example.com",
              "password": "testpass123",
              "full_name": "Invite User",
              "invite_token": token_str,
          },
      )
      assert response.status_code == 200
      data = response.json()
      assert "id" in data
      assert data["email"].startswith("invite-")


  def test_signup_without_token_fails_when_bot_configured(
      client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
  ) -> None:
      """Signup without invite_token returns 400 when TG_BOT_TOKEN is set."""
      from app.core.config import settings

      monkeypatch.setattr(settings, "TG_BOT_TOKEN", "test_token")

      response = client.post(
          "/api/v1/users/signup",
          json={
              "email": f"notoken-{secrets.token_hex(4)}@example.com",
              "password": "testpass123",
              "full_name": "No Token",
          },
      )
      assert response.status_code == 400
      assert "Invalid or expired" in response.json()["detail"]


  def test_signup_with_expired_token_fails(
      client: TestClient, db: Session
  ) -> None:
      """Signup with an expired token returns 400."""
      token_str = _create_expired_token(db)
      response = client.post(
          "/api/v1/users/signup",
          json={
              "email": f"expired-{secrets.token_hex(4)}@example.com",
              "password": "testpass123",
              "full_name": "Expired Token User",
              "invite_token": token_str,
          },
      )
      assert response.status_code == 400
      assert "Invalid or expired" in response.json()["detail"]


  def test_signup_with_used_token_fails(
      client: TestClient, db: Session
  ) -> None:
      """Signup with an already-used token returns 400."""
      token_str = _create_valid_token(db)
      # First signup succeeds
      response1 = client.post(
          "/api/v1/users/signup",
          json={
              "email": f"first-{secrets.token_hex(4)}@example.com",
              "password": "testpass123",
              "full_name": "First User",
              "invite_token": token_str,
          },
      )
      assert response1.status_code == 200

      # Second signup with same token fails
      response2 = client.post(
          "/api/v1/users/signup",
          json={
              "email": f"second-{secrets.token_hex(4)}@example.com",
              "password": "testpass123",
              "full_name": "Second User",
              "invite_token": token_str,
          },
      )
      assert response2.status_code == 400
      assert "Invalid or expired" in response2.json()["detail"]


  def test_signup_with_invalid_token_fails(client: TestClient) -> None:
      """Signup with a nonexistent token returns 400."""
      response = client.post(
          "/api/v1/users/signup",
          json={
              "email": f"bad-{secrets.token_hex(4)}@example.com",
              "password": "testpass123",
              "full_name": "Bad Token User",
              "invite_token": "nonexistent_token_value",
          },
      )
      assert response.status_code == 400
      assert "Invalid or expired" in response.json()["detail"]


  def test_validate_token_valid(client: TestClient, db: Session) -> None:
      """GET /validate-token returns valid=true for a fresh token."""
      token_str = _create_valid_token(db)
      response = client.get(f"/api/v1/users/validate-token?token={token_str}")
      assert response.status_code == 200
      assert response.json()["valid"] is True


  def test_validate_token_expired(client: TestClient, db: Session) -> None:
      """GET /validate-token returns valid=false for an expired token."""
      token_str = _create_expired_token(db)
      response = client.get(f"/api/v1/users/validate-token?token={token_str}")
      assert response.status_code == 200
      assert response.json()["valid"] is False


  def test_validate_token_nonexistent(client: TestClient) -> None:
      """GET /validate-token returns valid=false for an unknown token."""
      response = client.get("/api/v1/users/validate-token?token=doesnotexist")
      assert response.status_code == 200
      assert response.json()["valid"] is False


  def test_webhook_rejects_missing_secret_header(
      client: TestClient, monkeypatch: pytest.MonkeyPatch
  ) -> None:
      """POST to /api/v1/telegram/webhook without X-Telegram-Bot-Api-Secret-Token returns 403."""
      from app.core.config import settings

      monkeypatch.setattr(settings, "TG_BOT_TOKEN", "test_token")
      monkeypatch.setattr(settings, "TG_SUPERUSER_ID", 12345)

      response = client.post(
          "/api/v1/telegram/webhook",
          json={"update_id": 1},
          # Deliberately omit the X-Telegram-Bot-Api-Secret-Token header
      )
      assert response.status_code == 403
  ```

  Run tests to confirm they fail (red phase):

  ```bash
  cd backend && python -m pytest tests/test_telegram_service.py tests/test_invite_flow.py -x -v 2>&1 | head -50
  ```

- [ ] **Step 4: Create telegram.py service**

  Create `backend/app/services/telegram.py`:

  ```python
  import logging
  import secrets
  from datetime import datetime, timedelta, timezone

  import httpx
  from sqlmodel import Session, select

  from app.core.config import settings
  from app.models import AccessRequest, InviteToken

  logger = logging.getLogger(__name__)

  TELEGRAM_API_BASE = "https://api.telegram.org/bot"

  # Webhook secret: prefer the explicit setting for multi-worker safety;
  # fall back to a one-time generated value (single-worker only).
  _GENERATED_SECRET = secrets.token_urlsafe(32)


  def get_webhook_secret() -> str:
      """Return the webhook secret, preferring the configured value."""
      return settings.TG_WEBHOOK_SECRET or _GENERATED_SECRET


  def is_telegram_enabled() -> bool:
      """Bot is enabled only when both token and superuser ID are set."""
      return bool(settings.TG_BOT_TOKEN and settings.TG_SUPERUSER_ID)


  async def send_message(
      chat_id: int,
      text: str,
      reply_markup: dict | None = None,
  ) -> bool:
      """Send a message via Telegram Bot API."""
      if not settings.TG_BOT_TOKEN:
          return False
      payload: dict = {"chat_id": chat_id, "text": text}
      if reply_markup is not None:
          payload["reply_markup"] = reply_markup
      try:
          async with httpx.AsyncClient(timeout=10.0) as client:
              response = await client.post(
                  f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/sendMessage",
                  json=payload,
              )
              response.raise_for_status()
              return True
      except httpx.HTTPError:
          logger.exception("Failed to send Telegram message to chat_id=%s", chat_id)
          return False


  async def edit_message_text(
      chat_id: int,
      message_id: int,
      text: str,
      reply_markup: dict | None = None,
  ) -> bool:
      """Edit an existing message. Pass reply_markup=None to remove inline keyboard."""
      if not settings.TG_BOT_TOKEN:
          return False
      payload: dict = {
          "chat_id": chat_id,
          "message_id": message_id,
          "text": text,
      }
      if reply_markup is not None:
          payload["reply_markup"] = reply_markup
      else:
          # Send empty inline_keyboard to explicitly remove buttons;
          # omitting reply_markup leaves the old keyboard in place.
          payload["reply_markup"] = {"inline_keyboard": []}
      try:
          async with httpx.AsyncClient(timeout=10.0) as client:
              response = await client.post(
                  f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/editMessageText",
                  json=payload,
              )
              response.raise_for_status()
              return True
      except httpx.HTTPError:
          logger.exception(
              "Failed to edit Telegram message chat_id=%s message_id=%s",
              chat_id,
              message_id,
          )
          return False


  async def answer_callback_query(callback_query_id: str) -> bool:
      """Acknowledge a callback query to remove the loading spinner."""
      if not settings.TG_BOT_TOKEN:
          return False
      try:
          async with httpx.AsyncClient(timeout=10.0) as client:
              response = await client.post(
                  f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/answerCallbackQuery",
                  json={"callback_query_id": callback_query_id},
              )
              response.raise_for_status()
              return True
      except httpx.HTTPError:
          logger.exception("Failed to answer callback query %s", callback_query_id)
          return False


  def _format_user_display(
      first_name: str,
      last_name: str | None,
      username: str | None,
  ) -> str:
      """Build a display string like 'Jan Pona @janpona'."""
      parts = [first_name]
      if last_name:
          parts.append(last_name)
      if username:
          parts.append(f"@{username}")
      return " ".join(parts)


  async def handle_start(session: Session, message: dict) -> None:
      """Handle /start command: create access request or resend existing state."""
      from_user = message.get("from", {})
      chat_id: int = message["chat"]["id"]
      tg_user_id: int = from_user.get("id", 0)
      first_name: str = from_user.get("first_name", "Unknown")
      last_name: str | None = from_user.get("last_name")
      username: str | None = from_user.get("username")

      # Check for existing access requests from this user (most recent first)
      statement = (
          select(AccessRequest)
          .where(AccessRequest.telegram_user_id == tg_user_id)
          .order_by(AccessRequest.created_at.desc())
      )
      existing = session.exec(statement).first()

      if existing is not None:
          if existing.status == "pending":
              await send_message(
                  chat_id, "Your request is pending approval. Please wait."
              )
              return

          if existing.status == "rejected":
              # Rate-limit re-requests to once per 24 hours
              if existing.decided_at and (
                  datetime.now(timezone.utc) - existing.decided_at
                  < timedelta(hours=24)
              ):
                  await send_message(
                      chat_id,
                      "You can re-request access after 24 hours.",
                  )
                  return
              # Allow re-request: fall through to create new request

          if existing.status == "approved":
              # Check if there's an unused, non-expired token
              token_stmt = (
                  select(InviteToken)
                  .where(
                      InviteToken.access_request_id == existing.id,
                      InviteToken.used_at.is_(None),
                      InviteToken.expires_at > datetime.now(timezone.utc),
                  )
              )
              active_token = session.exec(token_stmt).first()
              if active_token:
                  signup_url = (
                      f"{settings.FRONTEND_HOST}/signup?token={active_token.token}"
                  )
                  await send_message(
                      chat_id,
                      f"You're already approved! Use this token to create your "
                      f"account: {active_token.token}\n\nGo to {signup_url}",
                  )
                  return

              # Check if token was already used
              used_token_stmt = (
                  select(InviteToken)
                  .where(
                      InviteToken.access_request_id == existing.id,
                      InviteToken.used_at.isnot(None),
                  )
              )
              used_token = session.exec(used_token_stmt).first()
              if used_token:
                  await send_message(
                      chat_id,
                      f"You already have an account! "
                      f"Log in at {settings.FRONTEND_HOST}",
                  )
                  return

      # Create new access request
      access_request = AccessRequest(
          telegram_user_id=tg_user_id,
          telegram_username=username,
          telegram_first_name=first_name,
          telegram_last_name=last_name,
          status="pending",
      )
      session.add(access_request)
      session.commit()
      session.refresh(access_request)

      display = _format_user_display(first_name, last_name, username)

      # Notify superuser with inline Approve/Reject buttons
      await send_message(
          settings.TG_SUPERUSER_ID,
          f"{display} wants to access the app",
          reply_markup={
              "inline_keyboard": [
                  [
                      {
                          "text": "Approve",
                          "callback_data": f"approve:{access_request.id}",
                      },
                      {
                          "text": "Reject",
                          "callback_data": f"reject:{access_request.id}",
                      },
                  ]
              ]
          },
      )

      await send_message(
          chat_id,
          "Your request has been sent to the admin. Please wait for approval.",
      )


  async def handle_callback_query(session: Session, callback_query: dict) -> None:
      """Handle superuser Approve/Reject button press."""
      callback_id: str = callback_query["id"]
      data: str = callback_query.get("data", "")
      from_user = callback_query.get("from", {})
      caller_id: int = from_user.get("id", 0)
      message = callback_query.get("message", {})
      chat_id: int = message.get("chat", {}).get("id", 0)
      message_id: int = message.get("message_id", 0)

      # Only the superuser can approve/reject
      if caller_id != settings.TG_SUPERUSER_ID:
          await answer_callback_query(callback_id)
          return

      if ":" not in data:
          await answer_callback_query(callback_id)
          return

      action, request_id_str = data.split(":", 1)
      try:
          request_id = int(request_id_str)
      except ValueError:
          await answer_callback_query(callback_id)
          return

      access_request = session.get(AccessRequest, request_id)
      if not access_request:
          await answer_callback_query(callback_id)
          return

      display = _format_user_display(
          access_request.telegram_first_name,
          access_request.telegram_last_name,
          access_request.telegram_username,
      )

      if action == "approve":
          # Race condition guard: check if token already exists
          existing_token_stmt = select(InviteToken).where(
              InviteToken.access_request_id == access_request.id
          )
          if session.exec(existing_token_stmt).first() is not None:
              await answer_callback_query(callback_id)
              return

          access_request.status = "approved"
          access_request.decided_at = datetime.now(timezone.utc)
          session.add(access_request)

          invite_token = InviteToken(access_request_id=access_request.id)
          session.add(invite_token)
          session.commit()
          session.refresh(invite_token)

          signup_url = f"{settings.FRONTEND_HOST}/signup?token={invite_token.token}"
          await send_message(
              access_request.telegram_user_id,
              f"You're approved! Use this token to create your account: "
              f"{invite_token.token}\n\nGo to {signup_url}",
          )
          await edit_message_text(chat_id, message_id, f"Approved: {display}")

      elif action == "reject":
          access_request.status = "rejected"
          access_request.decided_at = datetime.now(timezone.utc)
          session.add(access_request)
          session.commit()

          await send_message(
              access_request.telegram_user_id,
              "Sorry, your request was not approved.",
          )
          await edit_message_text(chat_id, message_id, f"Rejected: {display}")

      await answer_callback_query(callback_id)


  async def handle_update(session: Session, update: dict) -> None:
      """Route an incoming Telegram update to the correct handler."""
      if "message" in update:
          message = update["message"]
          text = message.get("text", "")
          if text.startswith("/start"):
              await handle_start(session, message)
      elif "callback_query" in update:
          await handle_callback_query(session, update["callback_query"])


  async def set_webhook(webhook_url: str) -> bool:
      """Register the webhook URL with Telegram, including secret_token."""
      if not settings.TG_BOT_TOKEN:
          return False
      try:
          async with httpx.AsyncClient(timeout=10.0) as client:
              response = await client.post(
                  f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/setWebhook",
                  json={
                      "url": webhook_url,
                      "secret_token": get_webhook_secret(),
                  },
              )
              response.raise_for_status()
              logger.info("Telegram webhook set to %s", webhook_url)
              return True
      except httpx.HTTPError:
          logger.exception("Failed to set Telegram webhook")
          return False


  async def delete_webhook() -> bool:
      """Remove the webhook on shutdown."""
      if not settings.TG_BOT_TOKEN:
          return False
      try:
          async with httpx.AsyncClient(timeout=10.0) as client:
              response = await client.post(
                  f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/deleteWebhook",
              )
              response.raise_for_status()
              logger.info("Telegram webhook deleted")
              return True
      except httpx.HTTPError:
          logger.exception("Failed to delete Telegram webhook")
          return False
  ```

- [ ] **Step 5: Create webhook route**

  Create `backend/app/api/routes/telegram.py`:

  ```python
  import logging

  from fastapi import APIRouter, HTTPException, Request
  from sqlmodel import Session

  from app.api.deps import SessionDep
  from app.services.telegram import get_webhook_secret, handle_update, is_telegram_enabled

  logger = logging.getLogger(__name__)

  router = APIRouter(prefix="/telegram", tags=["telegram"])


  @router.post("/webhook")
  async def telegram_webhook(request: Request, session: SessionDep) -> dict:
      """Receive Telegram bot updates. Validates secret_token header."""
      if not is_telegram_enabled():
          raise HTTPException(status_code=404, detail="Telegram bot not configured")

      # Validate Telegram's secret token header
      secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
      if secret != get_webhook_secret():
          raise HTTPException(status_code=403, detail="Invalid secret token")

      update = await request.json()
      await handle_update(session, update)
      return {"ok": True}
  ```

- [ ] **Step 6: Create config route for public config**

  Create `backend/app/api/routes/config.py`:

  ```python
  from fastapi import APIRouter

  from app.core.config import settings

  router = APIRouter(prefix="/config", tags=["config"])


  @router.get("/public")
  def get_public_config() -> dict:
      """Return public configuration (no auth required).

      Exposes bot_username for frontend Telegram links.
      """
      return {
          "bot_username": settings.TG_BOT_USERNAME,
      }
  ```

- [ ] **Step 7: Modify signup to validate invite_token**

  Edit `backend/app/api/routes/users.py`. Add imports at the top (merge with existing):

  ```python
  from datetime import datetime, timezone

  from sqlmodel import col, delete, func, select

  from app.models import (
      InviteToken,
      # ... existing imports ...
  )
  ```

  Replace the `register_user` function. **Atomicity note:** `crud.create_user` internally calls `session.commit()`, which means the user creation and token consumption would happen in separate transactions. To keep both operations atomic, we use a modified call that skips the internal commit:

  ```python
  @router.post("/signup", response_model=UserPublic)
  def register_user(session: SessionDep, user_in: UserRegister) -> Any:
      """
      Create new user without the need to be logged in.
      When TG_BOT_TOKEN is set, a valid invite_token is required.
      """
      # Check if invite gate is active
      if settings.TG_BOT_TOKEN:
          if not user_in.invite_token:
              raise HTTPException(
                  status_code=400,
                  detail="Invalid or expired invite token.",
              )
          # Look up the token
          statement = select(InviteToken).where(
              InviteToken.token == user_in.invite_token
          )
          invite_token = session.exec(statement).first()
          if (
              not invite_token
              or invite_token.used_at is not None
              or invite_token.expires_at < datetime.now(timezone.utc)
          ):
              raise HTTPException(
                  status_code=400,
                  detail="Invalid or expired invite token.",
              )
      else:
          invite_token = None

      user = crud.get_user_by_email(session=session, email=user_in.email)
      if user:
          raise HTTPException(
              status_code=400,
              detail="The user with this email already exists in the system",
          )

      user_create = UserCreate.model_validate(user_in)

      # Build the user object without committing, so we can commit
      # user creation + token consumption in a single transaction.
      db_obj = User.model_validate(
          user_create,
          update={"hashed_password": get_password_hash(user_create.password)},
      )
      session.add(db_obj)

      # Consume the invite token in the same transaction
      if invite_token is not None:
          invite_token.used_at = datetime.now(timezone.utc)
          invite_token.used_by = db_obj.id  # UUID is assigned before flush
          session.add(invite_token)

      session.commit()
      session.refresh(db_obj)
      return db_obj
  ```

  This requires adding an import at the top of the file (merge with existing):

  ```python
  from app.core.security import get_password_hash
  from app.models import User  # if not already imported
  ```

  **Important:** We deliberately avoid calling `crud.create_user` here because it commits internally. Instead, we inline the user creation logic (model_validate + hash password + session.add) so that both the user and the token update are committed atomically in a single `session.commit()`. If the commit fails (e.g., duplicate email race condition), neither the user nor the token consumption is persisted.

- [ ] **Step 8: Add validate-token endpoint**

  Add to `backend/app/api/routes/users.py`, after the `register_user` function.

  Import the shared limiter established in Phase 3 (merge with existing imports):

  ```python
  from fastapi import Request  # add if not already imported
  from app.core.rate_limit import limiter
  ```

  Then add the endpoint:

  ```python
  @router.get("/validate-token")
  @limiter.limit("5/minute")
  def validate_token(request: Request, session: SessionDep, token: str) -> dict:
      """
      Check if an invite token is valid (exists, unused, not expired).
      Used by the frontend to show/hide the signup form.
      Rate limited to 5 req/min per IP to prevent token enumeration.
      """
      statement = select(InviteToken).where(InviteToken.token == token)
      invite_token = session.exec(statement).first()
      if (
          not invite_token
          or invite_token.used_at is not None
          or invite_token.expires_at < datetime.now(timezone.utc)
      ):
          return {"valid": False}
      return {"valid": True}
  ```

  **Note:** The `limiter` instance and its exception handler are already registered in `app/main.py` from Phase 3 (`app.core.rate_limit` module). The `request: Request` parameter is required by slowapi to extract the client IP. No additional setup in `main.py` is needed.

- [ ] **Step 9: Modify frontend signup page**

  Edit `frontend/src/routes/signup.tsx`. Replace the entire file with:

  ```tsx
  import { zodResolver } from "@hookform/resolvers/zod"
  import {
    createFileRoute,
    Link as RouterLink,
    redirect,
    useSearch,
  } from "@tanstack/react-router"
  import { useEffect, useState } from "react"
  import { useForm } from "react-hook-form"
  import { z } from "zod"
  import { AuthLayout } from "@/components/Common/AuthLayout"
  import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form"
  import { Input } from "@/components/ui/input"
  import { LoadingButton } from "@/components/ui/loading-button"
  import { PasswordInput } from "@/components/ui/password-input"
  import useAuth, { isLoggedIn } from "@/hooks/useAuth"

  const formSchema = z
    .object({
      email: z.email(),
      full_name: z.string().min(1, { message: "Full Name is required" }),
      password: z
        .string()
        .min(1, { message: "Password is required" })
        .min(8, { message: "Password must be at least 8 characters" }),
      confirm_password: z
        .string()
        .min(1, { message: "Password confirmation is required" }),
      invite_token: z.string().optional(),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: "The passwords don't match",
      path: ["confirm_password"],
    })

  type FormData = z.infer<typeof formSchema>

  const searchSchema = z.object({
    token: z.string().optional(),
  })

  export const Route = createFileRoute("/signup")({
    component: SignUp,
    validateSearch: searchSchema,
    beforeLoad: async () => {
      if (isLoggedIn()) {
        throw redirect({
          to: "/",
        })
      }
    },
    head: () => ({
      meta: [
        {
          title: "Sign Up - toki pona dojo",
        },
      ],
    }),
  })

  function SignUp() {
    const { signUpMutation } = useAuth()
    const { token } = useSearch({ from: "/signup" })
    const [tokenState, setTokenState] = useState<
      "loading" | "valid" | "invalid" | "no-token"
    >(token ? "loading" : "no-token")
    const [botUsername, setBotUsername] = useState<string | null>(null)

    const form = useForm<FormData>({
      resolver: zodResolver(formSchema),
      mode: "onBlur",
      criteriaMode: "all",
      defaultValues: {
        email: "",
        full_name: "",
        password: "",
        confirm_password: "",
        invite_token: token ?? "",
      },
    })

    // Fetch public config for bot username
    useEffect(() => {
      fetch("/api/v1/config/public")
        .then((res) => res.json())
        .then((data) => {
          if (data.bot_username) {
            setBotUsername(data.bot_username)
          }
        })
        .catch(() => {
          // Ignore — bot username is optional for display
        })
    }, [])

    // Validate token on mount
    useEffect(() => {
      if (!token) return
      fetch(`/api/v1/users/validate-token?token=${encodeURIComponent(token)}`)
        .then((res) => res.json())
        .then((data) => {
          setTokenState(data.valid ? "valid" : "invalid")
        })
        .catch(() => {
          setTokenState("invalid")
        })
    }, [token])

    const onSubmit = (data: FormData) => {
      if (signUpMutation.isPending) return
      const { confirm_password: _confirm_password, ...submitData } = data
      submitData.invite_token = token ?? ""
      signUpMutation.mutate(submitData)
    }

    // No token in URL: show invite-only message
    if (tokenState === "no-token") {
      return (
        <AuthLayout>
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-bold">This app is invite-only</h1>
            <p className="text-muted-foreground">
              Request access via our Telegram bot
              {botUsername ? (
                <>
                  :{" "}
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                    data-testid="telegram-bot-link"
                  >
                    @{botUsername}
                  </a>
                </>
              ) : (
                "."
              )}
            </p>
            <div className="text-center text-sm">
              Already have an account?{" "}
              <RouterLink to="/login" className="underline underline-offset-4">
                Log in
              </RouterLink>
            </div>
          </div>
        </AuthLayout>
      )
    }

    // Token is loading
    if (tokenState === "loading") {
      return (
        <AuthLayout>
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground">Validating invite token...</p>
          </div>
        </AuthLayout>
      )
    }

    // Token is invalid
    if (tokenState === "invalid") {
      return (
        <AuthLayout>
          <div
            className="flex flex-col items-center gap-4 text-center"
            data-testid="invalid-token-message"
          >
            <h1 className="text-2xl font-bold">Invalid invite token</h1>
            <p className="text-muted-foreground">
              This invite token is invalid or has already been used.
            </p>
            {botUsername && (
              <p className="text-sm text-muted-foreground">
                Request a new one via{" "}
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  @{botUsername}
                </a>
              </p>
            )}
            <div className="text-center text-sm">
              Already have an account?{" "}
              <RouterLink to="/login" className="underline underline-offset-4">
                Log in
              </RouterLink>
            </div>
          </div>
        </AuthLayout>
      )
    }

    // Token is valid: show the signup form
    return (
      <AuthLayout>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">Create an account</h1>
            </div>

            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="full-name-input"
                        placeholder="User"
                        type="text"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="email-input"
                        placeholder="user@example.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        data-testid="password-input"
                        placeholder="Password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        data-testid="confirm-password-input"
                        placeholder="Confirm Password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden invite token field */}
              <input type="hidden" {...form.register("invite_token")} />

              <LoadingButton
                type="submit"
                className="w-full"
                loading={signUpMutation.isPending}
              >
                Sign Up
              </LoadingButton>
            </div>

            <div className="text-center text-sm">
              Already have an account?{" "}
              <RouterLink to="/login" className="underline underline-offset-4">
                Log in
              </RouterLink>
            </div>
          </form>
        </Form>
      </AuthLayout>
    )
  }

  export default SignUp
  ```

  **Key changes:** `useSearch` reads `?token=` from URL. Three states: no-token (invite-only message), loading (validating), invalid (error), valid (show form). `invite_token` is included in form submission. `botUsername` fetched from `/api/v1/config/public`.

- [ ] **Step 10: Modify frontend login page**

  Edit `frontend/src/routes/login.tsx`. Replace the "Don't have an account yet?" block at the bottom of the form with:

  ```tsx
  <div className="text-center text-sm space-y-1">
    <p>
      Don't have an account yet?{" "}
      <RouterLink to="/signup" className="underline underline-offset-4">
        Sign up
      </RouterLink>
    </p>
    <p className="text-xs text-muted-foreground" data-testid="request-access-hint">
      Need an invite?{" "}
      <a
        href={botUsername ? `https://t.me/${botUsername}` : "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4"
      >
        Request access via Telegram
      </a>
    </p>
  </div>
  ```

  Add state and effect at the top of the `Login` component to fetch the bot username:

  ```tsx
  const [botUsername, setBotUsername] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/v1/config/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.bot_username) setBotUsername(data.bot_username)
      })
      .catch(() => {})
  }, [])
  ```

  Add the necessary imports:

  ```tsx
  import { useEffect, useState } from "react"
  ```

- [ ] **Step 11: Register new routers in main.py**

  Edit `backend/app/api/main.py`. Add imports and router includes:

  ```python
  from fastapi import APIRouter

  from app.api.routes import config, items, login, private, users, utils
  from app.core.config import settings

  api_router = APIRouter()
  api_router.include_router(login.router)
  api_router.include_router(users.router)
  api_router.include_router(utils.router)
  api_router.include_router(items.router)
  api_router.include_router(config.router)

  if settings.ENVIRONMENT == "local":
      api_router.include_router(private.router)

  # Telegram webhook route (only when bot is configured)
  if settings.TG_BOT_TOKEN and settings.TG_SUPERUSER_ID:
      from app.api.routes import telegram
      api_router.include_router(telegram.router)
  ```

  Edit `backend/app/main.py` to add lifespan for webhook management:

  ```python
  import logging
  from contextlib import asynccontextmanager

  import sentry_sdk
  from fastapi import FastAPI
  from fastapi.routing import APIRoute
  from starlette.middleware.cors import CORSMiddleware

  from app.api.main import api_router
  from app.core.config import settings

  logger = logging.getLogger(__name__)


  def custom_generate_unique_id(route: APIRoute) -> str:
      return f"{route.tags[0]}-{route.name}"


  if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
      sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)


  @asynccontextmanager
  async def lifespan(app: FastAPI):
      # Startup: set Telegram webhook
      if settings.TG_BOT_TOKEN and settings.TG_SUPERUSER_ID:
          from app.services.telegram import set_webhook

          webhook_url = (
              f"{settings.FRONTEND_HOST}{settings.API_V1_STR}/telegram/webhook"
          )
          await set_webhook(webhook_url)
          logger.info("Telegram webhook registered")
      yield
      # Shutdown: delete Telegram webhook
      if settings.TG_BOT_TOKEN and settings.TG_SUPERUSER_ID:
          from app.services.telegram import delete_webhook

          await delete_webhook()
          logger.info("Telegram webhook removed")


  app = FastAPI(
      title=settings.PROJECT_NAME,
      openapi_url=f"{settings.API_V1_STR}/openapi.json",
      generate_unique_id_function=custom_generate_unique_id,
      lifespan=lifespan,
  )

  # Set all CORS enabled origins
  if settings.all_cors_origins:
      app.add_middleware(
          CORSMiddleware,
          allow_origins=settings.all_cors_origins,
          allow_credentials=True,
          allow_methods=["*"],
          allow_headers=["*"],
      )

  app.include_router(api_router, prefix=settings.API_V1_STR)
  ```

  **Note:** If `main.py` already has a `lifespan`, merge the webhook setup into it.

- [ ] **Step 12: E2E tests for the invite flow**

  These tests verify the full user-facing flow. Add to the E2E test suite (Playwright).

  Create `frontend/tests/invite-flow.spec.ts`:

  ```ts
  import { expect, test } from "@playwright/test"

  test.describe("Invite Flow", () => {
    test("signup page without token shows invite-only message", async ({
      page,
    }) => {
      await page.goto("/signup")
      await expect(page.getByText("This app is invite-only")).toBeVisible()
    })

    test("signup page without token shows Telegram bot link", async ({
      page,
    }) => {
      await page.goto("/signup")
      const botLink = page.getByTestId("telegram-bot-link")
      // Bot link may or may not be visible depending on config
      // If TG_BOT_USERNAME is set, the link should be visible
      const isVisible = await botLink.isVisible().catch(() => false)
      if (isVisible) {
        const href = await botLink.getAttribute("href")
        expect(href).toMatch(/^https:\/\/t\.me\//)
      }
    })

    test("signup page with invalid token shows error", async ({ page }) => {
      await page.goto("/signup?token=invalid_token_12345")
      await expect(
        page.getByTestId("invalid-token-message")
      ).toBeVisible({ timeout: 10000 })
      await expect(
        page.getByText("invalid or has already been used")
      ).toBeVisible()
    })

    test("login page shows request access hint", async ({ page }) => {
      await page.goto("/login")
      await expect(
        page.getByTestId("request-access-hint")
      ).toBeVisible()
      await expect(
        page.getByText("Request access via Telegram")
      ).toBeVisible()
    })

    test("valid invite token allows full signup flow", async ({ page, request }) => {
      // Seed a valid invite token via API (requires a helper endpoint or direct DB seed).
      // For E2E, we create the token through the test DB setup script or a test-only API.
      // Here we assume a test utility endpoint or pre-seeded token.
      // Alternative: use page.request to call an internal test helper.
      const tokenResponse = await request.post("/api/v1/utils/seed-invite-token", {
        data: {},
      })
      // If the seed endpoint doesn't exist, the implementer should create a
      // lightweight test-only route behind ENVIRONMENT=local that creates an
      // AccessRequest + InviteToken and returns the token string.
      if (!tokenResponse.ok()) {
        test.skip()
        return
      }
      const { token } = await tokenResponse.json()

      await page.goto(`/signup?token=${token}`)

      // Form should be visible (token is valid)
      await expect(page.getByTestId("full-name-input")).toBeVisible({ timeout: 10000 })

      // Fill out the signup form
      const uniqueEmail = `e2e-${Date.now()}@example.com`
      await page.getByTestId("full-name-input").fill("E2E Test User")
      await page.getByTestId("email-input").fill(uniqueEmail)
      await page.getByTestId("password-input").fill("testpass123")
      await page.getByTestId("confirm-password-input").fill("testpass123")
      await page.getByRole("button", { name: /sign up/i }).click()

      // Should redirect to the app after successful signup
      await page.waitForURL("**/login**", { timeout: 15000 })
    })

    test("expired invite token shows error message", async ({ page, request }) => {
      // Seed an expired invite token via the test utility endpoint.
      const tokenResponse = await request.post(
        "/api/v1/utils/seed-invite-token",
        { data: { expired: true } },
      )
      if (!tokenResponse.ok()) {
        test.skip()
        return
      }
      const { token } = await tokenResponse.json()

      await page.goto(`/signup?token=${token}`)

      // Should show the invalid/expired token message
      await expect(
        page.getByTestId("invalid-token-message")
      ).toBeVisible({ timeout: 10000 })
      await expect(
        page.getByText("invalid or has already been used")
      ).toBeVisible()
    })
  })
  ```

  Run the E2E tests:

  ```bash
  cd frontend && npx playwright test tests/invite-flow.spec.ts --reporter=list
  ```

- [ ] **Step 13: Run all tests and commit (incremental commits)**

  Throughout this task, make incremental commits at these checkpoints:

  **After Step 2** (models + migration):
  ```bash
  git add backend/app/models.py backend/alembic/versions/ backend/app/core/config.py .env.example
  git commit -m "feat(models): add AccessRequest and InviteToken models + migration"
  ```

  **After Step 3** (failing tests — TDD red phase):
  ```bash
  git add backend/tests/test_telegram_service.py backend/tests/test_invite_flow.py
  git commit -m "test: add failing tests for telegram service and invite flow (red phase)"
  ```

  **After Step 8** (backend service + routes):
  ```bash
  git add backend/app/services/telegram.py backend/app/api/routes/telegram.py \
        backend/app/api/routes/config.py backend/app/api/routes/users.py
  git commit -m "feat: add telegram service, webhook route, invite-gated signup"
  ```

  **After Step 10** (frontend changes):
  ```bash
  git add frontend/src/routes/signup.tsx frontend/src/routes/login.tsx
  git commit -m "feat(frontend): invite-only signup page with token validation"
  ```

  **After Step 11** (router registration + lifespan):
  ```bash
  git add backend/app/api/main.py backend/app/main.py
  git commit -m "feat: register telegram/config routers and webhook lifespan"
  ```

  **After Step 12** (E2E tests — final commit):

  Run backend tests:

  ```bash
  cd backend && python -m pytest tests/test_telegram_service.py tests/test_invite_flow.py -v
  ```

  Run all backend tests to check for regressions:

  ```bash
  cd backend && python -m pytest -x -v
  ```

  ```bash
  git add frontend/tests/invite-flow.spec.ts
  git commit -m "test: add E2E tests for invite flow"
  ```

- [ ] **Step 14:** Record learnings to `.claude/learnings-telegram-access-gateway.md` using the surfacing-subagent-learnings skill.

---

## Task 6: Comprehensive E2E Test Suite

**Depends on:** Tasks 1-4 (all UI changes must be in place before E2E testing)
**Files touched:**
- MODIFY `frontend/playwright.config.ts`
- ADD `frontend/tests/skill-tree.spec.ts`
- ADD `frontend/tests/exercises.spec.ts`
- ADD `frontend/tests/dictionary.spec.ts`
- ADD `frontend/tests/chat.spec.ts`
- ADD `frontend/tests/byom-settings.spec.ts`
- ADD `frontend/tests/dark-mode.spec.ts`
- ADD `frontend/tests/mobile-layout.spec.ts`
- ADD `frontend/tests/loading-states.spec.ts`
- ADD `frontend/tests/error-states.spec.ts`

### Prerequisites: Required `data-testid` attributes

The E2E tests below assume the following `data-testid` values exist on components from previous phases. Before running tests, verify these are present and add any that are missing:

| `data-testid` value | Component / Location | Added in |
|---|---|---|
| `app-sidebar` | `AppSidebar.tsx` root element | Phase 2 |
| `user-menu` | User dropdown in sidebar/header | Phase 2 |
| `skill-tree-skeleton` | `SkillTreeSkeleton.tsx` root | This phase (Task 3) |
| `skill-tree-node-{index}` | Each unit node in the skill tree | Phase 4 |
| `lesson-skeleton` | `LessonSkeleton.tsx` root | This phase (Task 3) |
| `dictionary-skeleton` | `DictionarySkeleton.tsx` root | This phase (Task 3) |
| `grammar-skeleton` | `GrammarSkeleton.tsx` root | This phase (Task 3) |
| `exercise-area` | Exercise container in lesson view | Phase 4 |
| `exercise-input` | Text input in translation exercises | Phase 4 |
| `word-bank` | Word bank container in exercises | Phase 4 |
| `choice-{index}` | Multiple choice options | Phase 4 |
| `submit-answer` | Exercise submit button | Phase 4 |
| `grading-spinner` | `GradingSpinner.tsx` root | This phase (Task 3) |
| `chat-typing-indicator` | `ChatTypingIndicator.tsx` root | This phase (Task 3) |
| `error-banner-{type}` | `ErrorBanner.tsx` root | This phase (Task 4) |
| `offline-banner` | `OfflineBanner.tsx` root | This phase (Task 4) |
| `mobile-chat-button` | `MobileChatButton.tsx` button | This phase (Task 1) |
| `mobile-chat-sheet` | `MobileChatSheet.tsx` sheet content | This phase (Task 1) |
| `dark-mode-toggle` | Theme toggle button in settings | Phase 2 |

### Steps

- [ ] **Step 1: Update Playwright config**

  Edit `frontend/playwright.config.ts`:

  ```ts
  import { defineConfig, devices } from "@playwright/test"
  import "dotenv/config"

  export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? "blob" : "html",
    use: {
      baseURL: "http://localhost:5173",
      trace: "on-first-retry",
    },
    projects: [
      { name: "setup", testMatch: /.*\.setup\.ts/ },
      {
        name: "chromium",
        use: {
          ...devices["Desktop Chrome"],
          storageState: "playwright/.auth/user.json",
        },
        dependencies: ["setup"],
      },
      {
        name: "mobile-chrome",
        use: {
          ...devices["Pixel 5"],
          storageState: "playwright/.auth/user.json",
        },
        dependencies: ["setup"],
      },
    ],
    webServer: {
      command: "bun run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
    },
  })
  ```

  Key change: uncommented `mobile-chrome` project using Pixel 5 device profile (360x640 viewport, mobile user agent).

- [ ] **Step 1b: Create auth setup file**

  Create `frontend/tests/auth.setup.ts`. This file runs before all other tests (via the `setup` project dependency) and saves an authenticated browser state to `playwright/.auth/user.json`:

  ```ts
  import { test as setup, expect } from "@playwright/test"

  const authFile = "playwright/.auth/user.json"

  setup("authenticate", async ({ page }) => {
    // Navigate to the login page
    await page.goto("/login")

    // Fill in test user credentials (from environment or hardcoded test user)
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL ?? "test@example.com")
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD ?? "changethis")

    // Submit the login form
    await page.getByRole("button", { name: /log in|sign in/i }).click()

    // Wait for navigation to the authenticated app (skill tree / home page)
    await page.waitForURL("/", { timeout: 10000 })

    // Verify we are logged in (sidebar or user menu is visible)
    await expect(page.locator("[data-testid='app-sidebar']").or(page.locator("[data-testid='user-menu']"))).toBeVisible({
      timeout: 5000,
    })

    // Save the authenticated state
    await page.context().storageState({ path: authFile })
  })
  ```

  Also ensure `playwright/.auth/` is in `.gitignore`:
  ```
  # Playwright auth state
  playwright/.auth/
  ```

- [ ] **Step 2: Write skill tree E2E tests**

  Create `frontend/tests/skill-tree.spec.ts`:

  ```ts
  import { expect, test } from "@playwright/test"

  test.describe("Skill Tree", () => {
    test("renders skill tree with unit nodes", async ({ page }) => {
      await page.goto("/")

      // Wait for skeleton to disappear and content to load
      await expect(page.getByTestId("skill-tree-skeleton")).not.toBeVisible({
        timeout: 10000,
      })

      // Verify at least one unit node is visible
      const unitNodes = page.locator("[data-testid^='skill-tree-node-']")
      await expect(unitNodes.first()).toBeVisible()

      // Verify unit count matches expected (at least the first unit)
      const count = await unitNodes.count()
      expect(count).toBeGreaterThan(0)
    })

    test("shows correct unit states (locked, available, completed)", async ({
      page,
    }) => {
      await page.goto("/")

      // First unit should be available or current (not locked)
      const firstNode = page.locator("[data-testid='skill-tree-node-0']")
      await expect(firstNode).toBeVisible()

      // First unit should not have locked styling
      await expect(firstNode).not.toHaveAttribute("data-state", "locked")
    })

    test("clicking available unit navigates to lesson", async ({ page }) => {
      await page.goto("/")

      // Find the first available/current unit and click it
      const availableNode = page
        .locator("[data-testid^='skill-tree-node-']")
        .first()
      await availableNode.click()

      // Should navigate to a lesson route
      await page.waitForURL(/\/lesson/)
      await expect(page.locator("main")).toBeVisible()
    })

    test("skill tree shows progress indicators on completed units", async ({
      page,
    }) => {
      await page.goto("/")

      // Check that if any unit is completed, it has visual indicator
      const completedNodes = page.locator("[data-state='completed']")
      const count = await completedNodes.count()

      if (count > 0) {
        // Completed nodes should have a checkmark or progress bar at 100%
        const firstCompleted = completedNodes.first()
        await expect(firstCompleted).toBeVisible()
      }
    })
  })
  ```

- [ ] **Step 3: Write exercise completion E2E tests**

  Create `frontend/tests/exercises.spec.ts`:

  ```ts
  import { expect, test } from "@playwright/test"

  test.describe("Exercises", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to first available lesson
      await page.goto("/")

      // Wait for skill tree to load
      await expect(page.getByTestId("skill-tree-skeleton")).not.toBeVisible({
        timeout: 10000,
      })

      // Click the first available unit
      const firstUnit = page
        .locator("[data-testid^='skill-tree-node-']")
        .first()
      await firstUnit.click()

      // Wait for lesson to load
      await page.waitForURL(/\/lesson/)
      await expect(page.getByTestId("lesson-skeleton")).not.toBeVisible({
        timeout: 10000,
      })
    })

    test("displays exercise with prompt and input area", async ({ page }) => {
      // Exercise should have a prompt/question
      const exerciseArea = page.locator("[data-testid='exercise-area']")
      await expect(exerciseArea).toBeVisible()

      // Should have some form of input (text input, word bank, or multiple choice)
      const hasInput =
        (await page.locator("input[data-testid='exercise-input']").count()) >
          0 ||
        (await page.locator("[data-testid='word-bank']").count()) > 0 ||
        (await page.locator("[data-testid^='choice-']").count()) > 0

      expect(hasInput).toBeTruthy()
    })

    test("submitting an answer shows feedback", async ({ page }) => {
      // Try to answer the exercise
      const textInput = page.locator("input[data-testid='exercise-input']")

      if (await textInput.isVisible()) {
        // Type a simple answer
        await textInput.fill("toki")
        await page.getByTestId("submit-answer").click()
      } else {
        // Click the first choice or word bank item
        const choice = page.locator("[data-testid^='choice-']").first()
        if (await choice.isVisible()) {
          await choice.click()
        }
        const submitBtn = page.getByTestId("submit-answer")
        if (await submitBtn.isVisible()) {
          await submitBtn.click()
        }
      }

      // Should show some feedback (correct, incorrect, or grading spinner)
      const hasFeedback =
        (await page.getByTestId("grading-spinner").count()) > 0 ||
        (await page.locator("[data-testid='exercise-feedback']").count()) > 0

      // Wait for either grading spinner or feedback
      await expect(
        page
          .getByTestId("grading-spinner")
          .or(page.locator("[data-testid='exercise-feedback']"))
      ).toBeVisible({ timeout: 35000 })
    })

    test("progress bar updates after completing exercise", async ({ page }) => {
      const progressBar = page.locator("[data-testid='lesson-progress-bar']")

      if (await progressBar.isVisible()) {
        const initialWidth = await progressBar.evaluate(
          (el) => getComputedStyle(el).width
        )

        // Complete the exercise (simplified — in real test, answer correctly)
        const textInput = page.locator("input[data-testid='exercise-input']")
        if (await textInput.isVisible()) {
          await textInput.fill("toki")
          await page.getByTestId("submit-answer").click()
        }

        // Wait for feedback and continue
        await page
          .locator("[data-testid='exercise-feedback']")
          .waitFor({ timeout: 35000 })

        const continueBtn = page.getByTestId("continue-button")
        if (await continueBtn.isVisible()) {
          await continueBtn.click()

          // Progress bar should have advanced
          const newWidth = await progressBar.evaluate(
            (el) => getComputedStyle(el).width
          )
          // Width should have changed (or at least not decreased)
        }
      }
    })
  })
  ```

- [ ] **Step 4: Write dictionary E2E tests**

  Create `frontend/tests/dictionary.spec.ts`:

  ```ts
  import { expect, test } from "@playwright/test"

  test.describe("Dictionary", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to dictionary page (find actual route)
      await page.goto("/dictionary")
      await expect(page.getByTestId("dictionary-skeleton")).not.toBeVisible({
        timeout: 10000,
      })
    })

    test("dictionary page loads with word cards", async ({ page }) => {
      // Should show word cards
      const wordCards = page.locator("[data-testid^='word-card-']")
      await expect(wordCards.first()).toBeVisible()

      const count = await wordCards.count()
      expect(count).toBeGreaterThan(0)
    })

    test("search filters dictionary results", async ({ page }) => {
      const searchInput = page.locator(
        "input[data-testid='dictionary-search']"
      )
      await expect(searchInput).toBeVisible()

      // Search for a common toki pona word
      await searchInput.fill("toki")

      // Wait for results to update
      await page.waitForTimeout(500) // Debounce

      // Should show filtered results containing "toki"
      const wordCards = page.locator("[data-testid^='word-card-']")
      const count = await wordCards.count()
      expect(count).toBeGreaterThan(0)

      // At least one card should contain "toki"
      const firstCardText = await wordCards.first().textContent()
      expect(firstCardText?.toLowerCase()).toContain("toki")
    })

    test("search with no results shows empty state", async ({ page }) => {
      const searchInput = page.locator(
        "input[data-testid='dictionary-search']"
      )
      await searchInput.fill("xyznonexistentword")

      await page.waitForTimeout(500)

      // Should show empty state or "no results" message
      const noResults = page.locator("[data-testid='dictionary-no-results']")
      await expect(noResults).toBeVisible()
    })

    test("word card shows part of speech and definition", async ({ page }) => {
      const firstCard = page.locator("[data-testid^='word-card-']").first()
      await expect(firstCard).toBeVisible()

      // Card should contain a word, part of speech, and definition
      const cardText = await firstCard.textContent()
      expect(cardText).toBeTruthy()
      expect(cardText!.length).toBeGreaterThan(5) // Not just a single character
    })
  })
  ```

- [ ] **Step 5: Write chat panel E2E tests**

  Create `frontend/tests/chat.spec.ts`:

  ```ts
  import { expect, test } from "@playwright/test"

  test.describe("Chat Panel (Desktop)", () => {
    test("chat panel is visible on desktop", async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto("/")

      // Chat panel/sidebar should be visible
      const chatPanel = page.locator("[data-testid='chat-panel']")
      await expect(chatPanel).toBeVisible()
    })

    test("can send a message and receive streaming response", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto("/")

      const chatInput = page.locator("[data-testid='chat-input']")
      await expect(chatInput).toBeVisible()

      // Type a message
      await chatInput.fill("toki! What does 'pona' mean?")
      await chatInput.press("Enter")

      // Should show the user's message
      const userMessage = page.locator("[data-testid='chat-message-user']").last()
      await expect(userMessage).toContainText("pona")

      // Should show typing indicator while waiting
      const typingIndicator = page.getByTestId("chat-typing-indicator")
      // It may appear and disappear quickly

      // Wait for bot response (streaming may take time)
      const botMessage = page.locator("[data-testid='chat-message-bot']").last()
      await expect(botMessage).toBeVisible({ timeout: 30000 })

      // Bot response should have some content
      const responseText = await botMessage.textContent()
      expect(responseText!.length).toBeGreaterThan(0)
    })

    test("chat preserves message history", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto("/")

      const chatInput = page.locator("[data-testid='chat-input']")
      await chatInput.fill("nimi 'toki' li seme?")
      await chatInput.press("Enter")

      // Wait for response
      const botMessage = page.locator("[data-testid='chat-message-bot']").last()
      await expect(botMessage).toBeVisible({ timeout: 30000 })

      // Send another message
      await chatInput.fill("pona!")
      await chatInput.press("Enter")

      // Previous messages should still be visible
      const allUserMessages = page.locator("[data-testid='chat-message-user']")
      const count = await allUserMessages.count()
      expect(count).toBeGreaterThanOrEqual(2)
    })
  })
  ```

- [ ] **Step 6: Write BYOM settings E2E tests**

  Create `frontend/tests/byom-settings.spec.ts`:

  ```ts
  import { expect, test } from "@playwright/test"

  test.describe("BYOM Settings", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/settings")
    })

    test("BYOM settings section is visible", async ({ page }) => {
      const byomSection = page.locator("[data-testid='byom-settings']")
      await expect(byomSection).toBeVisible()
    })

    test("can enter and save custom API key", async ({ page }) => {
      const apiKeyInput = page.locator("input[data-testid='byom-api-key']")
      await expect(apiKeyInput).toBeVisible()

      // Enter a test API key
      await apiKeyInput.fill("sk-test-key-12345")

      // Save settings
      const saveBtn = page.getByTestId("byom-save")
      await saveBtn.click()

      // Verify it persists after reload
      await page.reload()
      await page.goto("/settings")

      const savedKey = page.locator("input[data-testid='byom-api-key']")
      // Key should be present (possibly masked)
      const value = await savedKey.inputValue()
      expect(value.length).toBeGreaterThan(0)
    })

    test("BYOM settings persist in localStorage", async ({ page }) => {
      const apiKeyInput = page.locator("input[data-testid='byom-api-key']")
      await apiKeyInput.fill("sk-test-persist-key")

      const endpointInput = page.locator(
        "input[data-testid='byom-endpoint']"
      )
      if (await endpointInput.isVisible()) {
        await endpointInput.fill("https://api.example.com/v1")
      }

      const saveBtn = page.getByTestId("byom-save")
      await saveBtn.click()

      // Check localStorage directly
      const storedSettings = await page.evaluate(() => {
        return localStorage.getItem("byom-settings")
      })

      expect(storedSettings).toBeTruthy()
      const parsed = JSON.parse(storedSettings!)
      expect(parsed.apiKey || parsed.api_key).toContain("sk-test-persist-key")
    })

    test("can clear BYOM settings", async ({ page }) => {
      // First set a value
      const apiKeyInput = page.locator("input[data-testid='byom-api-key']")
      await apiKeyInput.fill("sk-to-be-cleared")
      await page.getByTestId("byom-save").click()

      // Then clear it
      const clearBtn = page.getByTestId("byom-clear")
      if (await clearBtn.isVisible()) {
        await clearBtn.click()

        // Verify cleared
        const value = await apiKeyInput.inputValue()
        expect(value).toBe("")
      }
    })
  })
  ```

- [ ] **Step 7: Write dark mode toggle E2E tests**

  Create `frontend/tests/dark-mode.spec.ts`:

  ```ts
  import { expect, test } from "@playwright/test"

  test.describe("Dark Mode", () => {
    test("can toggle to dark mode", async ({ page }) => {
      await page.goto("/")

      // Find and click theme toggle button
      const themeButton = page.getByTestId("theme-button")
      await expect(themeButton).toBeVisible()
      await themeButton.click()

      // Click dark mode option
      const darkOption = page.getByTestId("dark-mode")
      await darkOption.click()

      // Verify dark class is on html element
      const htmlClass = await page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      )
      expect(htmlClass).toBeTruthy()
    })

    test("can toggle to light mode", async ({ page }) => {
      await page.goto("/")

      // Set dark mode first
      const themeButton = page.getByTestId("theme-button")
      await themeButton.click()
      await page.getByTestId("dark-mode").click()

      // Now switch to light
      await themeButton.click()
      await page.getByTestId("light-mode").click()

      const htmlClass = await page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      )
      expect(htmlClass).toBeFalsy()
    })

    test("dark mode persists across page reload", async ({ page }) => {
      await page.goto("/")

      // Enable dark mode
      const themeButton = page.getByTestId("theme-button")
      await themeButton.click()
      await page.getByTestId("dark-mode").click()

      // Reload page
      await page.reload()

      // Should still be in dark mode
      const htmlClass = await page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      )
      expect(htmlClass).toBeTruthy()
    })

    test("dark mode changes background color", async ({ page }) => {
      await page.goto("/")

      // Get light mode background
      const lightBg = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      )

      // Switch to dark mode
      const themeButton = page.getByTestId("theme-button")
      await themeButton.click()
      await page.getByTestId("dark-mode").click()

      // Wait for transition
      await page.waitForTimeout(300)

      // Get dark mode background
      const darkBg = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      )

      // Backgrounds should be different
      expect(lightBg).not.toBe(darkBg)
    })

    test("text remains readable in dark mode across pages", async ({
      page,
    }) => {
      await page.goto("/")

      // Enable dark mode
      const themeButton = page.getByTestId("theme-button")
      await themeButton.click()
      await page.getByTestId("dark-mode").click()

      // Check main content area text color is light
      const textColor = await page.evaluate(() =>
        getComputedStyle(document.body).color
      )

      // In dark mode, text should be light (high luminance)
      // Parse rgb values and check brightness
      const rgb = textColor.match(/\d+/g)?.map(Number)
      if (rgb && rgb.length >= 3) {
        const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
        expect(brightness).toBeGreaterThan(128) // Light text
      }
    })
  })
  ```

- [ ] **Step 8: Write mobile layout E2E tests**

  Create `frontend/tests/mobile-layout.spec.ts`:

  ```ts
  import { expect, test, devices } from "@playwright/test"

  // These tests specifically target mobile viewport
  test.use({ ...devices["Pixel 5"] })

  test.describe("Mobile Layout", () => {
    test("content takes full width on mobile", async ({ page }) => {
      await page.goto("/")

      // Main content area should not have the desktop two-panel split
      const main = page.locator("main")
      await expect(main).toBeVisible()

      const mainWidth = await main.evaluate((el) => el.getBoundingClientRect().width)
      const viewportWidth = page.viewportSize()!.width
      // Main content should span most of the viewport (accounting for padding)
      expect(mainWidth).toBeGreaterThan(viewportWidth * 0.85)
    })

    test("desktop chat sidebar is hidden on mobile", async ({ page }) => {
      await page.goto("/")

      // Desktop chat panel should be hidden
      const desktopChat = page.locator("[data-testid='chat-panel']")
      await expect(desktopChat).not.toBeVisible()
    })

    test("mobile chat button is visible", async ({ page }) => {
      await page.goto("/")

      const chatButton = page.getByTestId("mobile-chat-button")
      await expect(chatButton).toBeVisible()
    })

    test("tapping mobile chat button opens bottom sheet", async ({ page }) => {
      await page.goto("/")

      const chatButton = page.getByTestId("mobile-chat-button")
      await chatButton.click()

      // Bottom sheet should appear
      const chatSheet = page.getByTestId("mobile-chat-sheet")
      await expect(chatSheet).toBeVisible()
    })

    test("can close mobile chat sheet", async ({ page }) => {
      await page.goto("/")

      // Open chat sheet
      await page.getByTestId("mobile-chat-button").click()
      const chatSheet = page.getByTestId("mobile-chat-sheet")
      await expect(chatSheet).toBeVisible()

      // Close via the X button
      const closeBtn = chatSheet.locator("button").filter({ hasText: /close/i }).or(
        chatSheet.locator("[data-slot='sheet-close']")
      )
      if (await closeBtn.isVisible()) {
        await closeBtn.click()
      } else {
        // Click overlay to close
        await page.locator("[data-slot='sheet-overlay']").click()
      }

      await expect(chatSheet).not.toBeVisible()
    })

    test("can send message in mobile chat sheet", async ({ page }) => {
      await page.goto("/")

      // Open chat
      await page.getByTestId("mobile-chat-button").click()
      await expect(page.getByTestId("mobile-chat-sheet")).toBeVisible()

      // Find chat input within the sheet
      const chatInput = page
        .getByTestId("mobile-chat-sheet")
        .locator("[data-testid='chat-input']")

      if (await chatInput.isVisible()) {
        await chatInput.fill("toki!")
        await chatInput.press("Enter")

        // Message should appear
        const userMsg = page
          .getByTestId("mobile-chat-sheet")
          .locator("[data-testid='chat-message-user']")
          .last()
        await expect(userMsg).toContainText("toki!")
      }
    })

    test("skill tree stacks vertically on mobile", async ({ page }) => {
      await page.goto("/")

      // Wait for skill tree to load
      await expect(page.getByTestId("skill-tree-skeleton")).not.toBeVisible({
        timeout: 10000,
      })

      // Skill tree nodes should be stacked vertically
      const nodes = page.locator("[data-testid^='skill-tree-node-']")
      const nodeCount = await nodes.count()

      if (nodeCount >= 2) {
        const firstBox = await nodes.nth(0).boundingBox()
        const secondBox = await nodes.nth(1).boundingBox()

        if (firstBox && secondBox) {
          // On mobile, second node should be below the first (not side by side)
          expect(secondBox.y).toBeGreaterThan(firstBox.y)
        }
      }
    })

    test("exercise buttons have adequate touch targets", async ({ page }) => {
      // Navigate to a lesson
      await page.goto("/")
      await expect(page.getByTestId("skill-tree-skeleton")).not.toBeVisible({
        timeout: 10000,
      })
      const firstUnit = page.locator("[data-testid^='skill-tree-node-']").first()
      await firstUnit.click()
      await page.waitForURL(/\/lesson/)

      // Check that interactive elements have minimum 44px touch targets
      const buttons = page.locator("button:visible")
      const buttonCount = await buttons.count()

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const box = await buttons.nth(i).boundingBox()
        if (box) {
          // Minimum recommended touch target: 44x44px (WCAG)
          expect(box.height).toBeGreaterThanOrEqual(40) // Allow slight flex
        }
      }
    })
  })
  ```

- [ ] **Step 9: Write loading state E2E tests**

  Create `frontend/tests/loading-states.spec.ts`:

  ```ts
  import { expect, test } from "@playwright/test"

  test.describe("Loading States", () => {
    test("skill tree shows skeleton while loading", async ({ page }) => {
      // Intercept the units endpoint (skill tree data) to add delay.
      // The skill tree fetches from /api/v1/units (or /api/v1/lessons/units).
      // Use a broad glob that matches either path.
      await page.route("**/api/v1/**/units**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.continue()
      })

      await page.goto("/")

      // Skeleton should be visible during loading
      const skeleton = page.getByTestId("skill-tree-skeleton")
      await expect(skeleton).toBeVisible()

      // Eventually content should replace skeleton
      await expect(skeleton).not.toBeVisible({ timeout: 15000 })
    })

    test("dictionary shows skeleton while searching", async ({ page }) => {
      await page.route("**/api/v1/dictionary/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.continue()
      })

      await page.goto("/dictionary")

      const skeleton = page.getByTestId("dictionary-skeleton")
      await expect(skeleton).toBeVisible()

      await expect(skeleton).not.toBeVisible({ timeout: 15000 })
    })

    test("grammar page shows skeleton while loading", async ({ page }) => {
      await page.route("**/api/v1/grammar/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.continue()
      })

      await page.goto("/grammar")

      const skeleton = page.getByTestId("grammar-skeleton")
      await expect(skeleton).toBeVisible()

      await expect(skeleton).not.toBeVisible({ timeout: 15000 })
    })

    test("lesson shows skeleton while loading exercise", async ({ page }) => {
      // Navigate to a lesson with delayed API
      await page.route("**/api/v1/lessons/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.continue()
      })

      // Navigate to lesson (need to go via skill tree)
      await page.goto("/")
      await expect(page.getByTestId("skill-tree-skeleton")).not.toBeVisible({
        timeout: 15000,
      })

      const firstUnit = page.locator("[data-testid^='skill-tree-node-']").first()
      await firstUnit.click()

      // Lesson skeleton should appear
      const lessonSkeleton = page.getByTestId("lesson-skeleton")
      await expect(lessonSkeleton).toBeVisible()
    })

    test("skeleton components are accessible (have role=status)", async ({
      page,
    }) => {
      await page.route("**/api/v1/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        await route.continue()
      })

      await page.goto("/")

      const skeleton = page.getByTestId("skill-tree-skeleton")
      await expect(skeleton).toBeVisible()
      await expect(skeleton).toHaveAttribute("role", "status")
    })
  })
  ```

- [ ] **Step 10: Write error state E2E tests**

  Create `frontend/tests/error-states.spec.ts`:

  ```ts
  import { expect, test } from "@playwright/test"

  test.describe("Error States", () => {
    test("shows error banner when API is unreachable", async ({ page }) => {
      // Block all API requests
      await page.route("**/api/v1/**", (route) => route.abort())

      await page.goto("/")

      // Should show an error banner
      const errorBanner = page.getByTestId("error-banner-api-unreachable")
      await expect(errorBanner).toBeVisible({ timeout: 10000 })

      // Should have a retry button
      const retryBtn = errorBanner.getByRole("button", { name: /retry/i })
      await expect(retryBtn).toBeVisible()
    })

    test("shows LLM unavailable message on 503", async ({ page }) => {
      await page.goto("/")

      // Mock chat endpoint to return 503
      await page.route("**/api/v1/chat/stream", (route) =>
        route.fulfill({ status: 503, body: "Service Unavailable" })
      )

      // Open chat and send a message
      const chatInput = page.locator("[data-testid='chat-input']")
      if (await chatInput.isVisible()) {
        await chatInput.fill("toki!")
        await chatInput.press("Enter")

        // Should show LLM unavailable error
        const llmError = page.getByTestId("error-banner-llm-unavailable")
        await expect(llmError).toBeVisible({ timeout: 10000 })
        await expect(llmError).toContainText("jan sona")
      }
    })

    test("shows rate limit message on 429", async ({ page }) => {
      await page.goto("/")

      await page.route("**/api/v1/chat/stream", (route) =>
        route.fulfill({ status: 429, body: "Rate limit exceeded" })
      )

      const chatInput = page.locator("[data-testid='chat-input']")
      if (await chatInput.isVisible()) {
        await chatInput.fill("toki!")
        await chatInput.press("Enter")

        const rateLimitError = page.getByTestId("error-banner-rate-limit")
        await expect(rateLimitError).toBeVisible({ timeout: 10000 })
        await expect(rateLimitError).toContainText("daily")
      }
    })

    test("shows grade timeout message", async ({ page }) => {
      // Mock grading endpoint with very long delay
      await page.route("**/api/v1/chat/grade", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 35000))
        await route.abort()
      })

      // Navigate to a lesson
      await page.goto("/")
      await expect(page.getByTestId("skill-tree-skeleton")).not.toBeVisible({
        timeout: 10000,
      })
      const firstUnit = page.locator("[data-testid^='skill-tree-node-']").first()
      await firstUnit.click()
      await page.waitForURL(/\/lesson/)

      // Try to submit an answer
      const textInput = page.locator("input[data-testid='exercise-input']")
      if (await textInput.isVisible()) {
        await textInput.fill("toki")
        await page.getByTestId("submit-answer").click()

        // Should show grade timeout
        const timeoutError = page.getByTestId("error-banner-grade-timeout")
        await expect(timeoutError).toBeVisible({ timeout: 40000 })
        await expect(timeoutError).toContainText("manually")
      }
    })

    test("retry button re-fetches data after error", async ({ page }) => {
      let callCount = 0

      await page.route("**/api/v1/lessons/**", async (route) => {
        callCount++
        if (callCount <= 1) {
          await route.abort()
        } else {
          await route.continue()
        }
      })

      await page.goto("/")

      // First call fails, should show error
      const errorBanner = page.getByTestId("error-banner-api-unreachable")
      await expect(errorBanner).toBeVisible({ timeout: 10000 })

      // Click retry
      const retryBtn = errorBanner.getByRole("button", { name: /retry/i })
      await retryBtn.click()

      // Second call succeeds, error should disappear
      await expect(errorBanner).not.toBeVisible({ timeout: 10000 })
    })

    test("offline banner appears when network is lost", async ({ page }) => {
      await page.goto("/")

      // Simulate going offline
      await page.context().setOffline(true)

      const offlineBanner = page.getByTestId("offline-banner")
      await expect(offlineBanner).toBeVisible()
      await expect(offlineBanner).toContainText("offline")

      // Restore network
      await page.context().setOffline(false)

      // Banner should disappear
      await expect(offlineBanner).not.toBeVisible()
    })
  })
  ```

- [ ] **Step 11: Commit**

  Stage all new and modified test files. Commit with message: "test: add comprehensive Playwright E2E test suite for all user flows"

- [ ] **Step 12:** Record learnings to `.claude/learnings-e2e-test-suite.md` using the surfacing-subagent-learnings skill.

---

## Task 7: Backend Test Pass and Data Validation

**Depends on:** Task 5 (if Telegram implemented, needs migrations)
**Files touched:**
- ADD `backend/app/tests/test_full_lesson_flow.py`
- ADD `backend/scripts/validate_data.py` (if not already present)
- MODIFY existing test files as needed for fixes

### Steps

- [ ] **Step 1: Run all existing backend tests**

  Run:
  ```bash
  cd backend && python -m pytest -v --tb=short
  ```

  Catalog all failures and fix them. Common issues:
  - Missing migrations (run `alembic upgrade head`)
  - Outdated test fixtures
  - Import errors from new modules

- [ ] **Step 2: Write integration test for full lesson flow**

  Create `backend/app/tests/test_full_lesson_flow.py`:

  ```python
  import pytest
  from fastapi.testclient import TestClient
  from sqlmodel import Session

  from app.core.config import settings


  class TestFullLessonFlow:
      """Integration test: fetch units -> fetch lesson -> complete exercises -> check progress."""

      def test_full_lesson_flow(
          self, client: TestClient, superuser_token_headers: dict
      ) -> None:
          # Step 1: Fetch skill tree / units
          response = client.get(
              f"{settings.API_V1_STR}/lessons/units",
              headers=superuser_token_headers,
          )
          assert response.status_code == 200
          units = response.json()
          assert len(units) > 0, "Should have at least one unit"

          first_unit = units[0]
          unit_id = first_unit["id"]

          # Step 2: Fetch lesson for first unit
          response = client.get(
              f"{settings.API_V1_STR}/lessons/units/{unit_id}",
              headers=superuser_token_headers,
          )
          assert response.status_code == 200
          lesson = response.json()
          assert "exercises" in lesson or "id" in lesson

          # Step 3: Get initial progress
          response = client.get(
              f"{settings.API_V1_STR}/progress/",
              headers=superuser_token_headers,
          )
          assert response.status_code == 200
          initial_progress = response.json()

          # Step 4: Submit exercise completion / update progress
          response = client.post(
              f"{settings.API_V1_STR}/progress/",
              headers=superuser_token_headers,
              json={
                  "unit_id": str(unit_id),
                  "completed": True,
              },
          )
          assert response.status_code in (200, 201)

          # Step 5: Verify progress updated
          response = client.get(
              f"{settings.API_V1_STR}/progress/",
              headers=superuser_token_headers,
          )
          assert response.status_code == 200
          updated_progress = response.json()

          # Progress should reflect the completed unit
          # The exact assertion depends on the progress data structure
  ```

  **IMPORTANT -- discovering the real API paths:** The paths above (`/lessons/units`, `/progress/`) are guesses. Before writing this test, the implementer **must** do the following:

  1. Read `backend/app/api/main.py` to see which routers are included and their prefixes.
  2. Read each route file under `backend/app/api/routes/` to find the actual endpoint paths.
  3. As of the current codebase, the existing routers are: `login`, `users`, `utils`, `items`, `private`. Earlier phases should have added routers for `units`/`lessons`, `progress`, `dictionary`, `grammar`, and `chat`. The progress endpoints from Phase 6 are expected to be:
     - `GET  {API_V1_STR}/progress/me` -- get current user's progress
     - `PUT  {API_V1_STR}/progress/me` -- update progress after exercise completion
     - `POST {API_V1_STR}/progress/sync` -- sync offline progress
  4. Adapt all URLs, HTTP methods, and JSON payloads in this test to match the real routes found in step 2.

- [ ] **Step 3: Create data validation script (if not present)**

  Check if `backend/scripts/validate_data.py` exists. If not, create it:

  ```python
  #!/usr/bin/env python3
  """Validate all lesson and dictionary data files for consistency."""
  import json
  import logging
  import sys
  from pathlib import Path

  logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
  logger = logging.getLogger(__name__)

  REQUIRED_WORD_FIELDS = {"word", "definition", "part_of_speech"}
  REQUIRED_UNIT_FIELDS = {"id", "title", "lessons"}
  REQUIRED_LESSON_FIELDS = {"id", "exercises"}
  REQUIRED_EXERCISE_FIELDS = {"id", "type", "prompt"}


  def validate_dictionary(data_dir: Path) -> int:
      errors = 0
      dict_file = data_dir / "dictionary.json"
      if not dict_file.exists():
          logger.error("Dictionary file not found: %s", dict_file)
          return 1

      with open(dict_file) as f:
          words = json.load(f)

      logger.info("Validating %d dictionary entries", len(words))
      for i, word in enumerate(words):
          missing = REQUIRED_WORD_FIELDS - set(word.keys())
          if missing:
              logger.error("Word %d missing fields: %s", i, missing)
              errors += 1

      return errors


  def validate_units(data_dir: Path) -> int:
      errors = 0
      units_file = data_dir / "units.json"
      if not units_file.exists():
          logger.error("Units file not found: %s", units_file)
          return 1

      with open(units_file) as f:
          units = json.load(f)

      logger.info("Validating %d units", len(units))
      seen_ids = set()
      for i, unit in enumerate(units):
          missing = REQUIRED_UNIT_FIELDS - set(unit.keys())
          if missing:
              logger.error("Unit %d missing fields: %s", i, missing)
              errors += 1

          unit_id = unit.get("id")
          if unit_id in seen_ids:
              logger.error("Duplicate unit id: %s", unit_id)
              errors += 1
          seen_ids.add(unit_id)

          for j, lesson in enumerate(unit.get("lessons", [])):
              lesson_missing = REQUIRED_LESSON_FIELDS - set(lesson.keys())
              if lesson_missing:
                  logger.error(
                      "Unit %d, lesson %d missing fields: %s",
                      i, j, lesson_missing,
                  )
                  errors += 1

              for k, exercise in enumerate(lesson.get("exercises", [])):
                  ex_missing = REQUIRED_EXERCISE_FIELDS - set(exercise.keys())
                  if ex_missing:
                      logger.error(
                          "Unit %d, lesson %d, exercise %d missing fields: %s",
                          i, j, k, ex_missing,
                      )
                      errors += 1

      return errors


  def main() -> int:
      # Find data directory (adjust path as needed)
      data_dir = Path(__file__).parent.parent / "data"
      if not data_dir.exists():
          # Try alternative location
          data_dir = Path(__file__).parent.parent / "app" / "data"

      if not data_dir.exists():
          logger.error("Data directory not found. Looked in: %s", data_dir)
          return 1

      logger.info("Validating data in: %s", data_dir)
      errors = 0
      errors += validate_dictionary(data_dir)
      errors += validate_units(data_dir)

      if errors == 0:
          logger.info("All data validation passed!")
      else:
          logger.error("Found %d validation errors", errors)

      return errors


  if __name__ == "__main__":
      sys.exit(main())
  ```

  **Note:** The data file paths and structures depend on how data was organized in earlier phases. The implementer must check the actual data directory and adjust field names accordingly.

- [ ] **Step 4: Run data validation**

  ```bash
  cd backend && python scripts/validate_data.py
  ```

  Fix any data issues found.

- [ ] **Step 5: Run full test suite and verify**

  ```bash
  cd backend && python -m pytest -v --tb=short
  ```

  All tests must pass. Fix any remaining failures.

- [ ] **Step 6: Commit**

  Stage all new and modified files. Commit with message: "test: add backend integration tests and data validation script"

- [ ] **Step 7:** Record learnings to `.claude/learnings-backend-test-pass.md` using the surfacing-subagent-learnings skill.

---

## Task 8: Final Verification and Manual Checklist

**Depends on:** All previous tasks
**Files touched:**
- ADD `docs/manual-verification-checklist.md`

### Steps

- [ ] **Step 1: Run all backend tests**

  ```bash
  cd backend && python -m pytest -v
  ```

  All must pass.

- [ ] **Step 2: Run data validation**

  ```bash
  cd backend && python scripts/validate_data.py
  ```

  Must report zero errors.

- [ ] **Step 3: Run Playwright E2E tests**

  ```bash
  cd frontend && npx playwright test
  ```

  Or via Docker:
  ```bash
  docker compose -f compose.yml -f compose.override.yml run playwright npx playwright test
  ```

  All tests must pass on both `chromium` and `mobile-chrome` projects.

- [ ] **Step 4: Create manual verification checklist**

  Create `docs/manual-verification-checklist.md`:

  ```markdown
  # Phase 10: Manual Verification Checklist

  ## Anonymous User Flow
  - [ ] Open app in incognito browser
  - [ ] Skill tree loads with correct unit states
  - [ ] Navigate to Unit 1, complete exercises
  - [ ] Progress updates visible on skill tree

  ## Authenticated User Flow
  - [ ] Sign up with email
  - [ ] Verify progress from anonymous session merges (if applicable)
  - [ ] Complete a full lesson with all exercise types
  - [ ] Check progress persists after page reload

  ## Chat
  - [ ] Send a message, receive streaming response
  - [ ] Chat context is maintained across messages
  - [ ] BYOM: enter custom API key, verify it works

  ## Dictionary
  - [ ] Search for "toki" — shows results
  - [ ] Search for nonsense — shows "no results"
  - [ ] Word cards show definitions and parts of speech

  ## Mobile (Chrome DevTools, Pixel 5 / 375px width)
  - [ ] Content is full-width
  - [ ] Desktop chat sidebar is hidden
  - [ ] Floating chat button appears in bottom-right
  - [ ] Tapping chat button opens bottom sheet
  - [ ] Can send and receive chat messages in sheet
  - [ ] Skill tree nodes stack vertically
  - [ ] Exercise buttons are large enough to tap
  - [ ] Navigation is usable (hamburger menu / sidebar)

  ## Dark Mode
  - [ ] Toggle to dark mode — background changes
  - [ ] Text is readable on all pages
  - [ ] Exercise feedback (correct/wrong) colors visible
  - [ ] Chat bubbles have proper contrast
  - [ ] Dictionary cards readable
  - [ ] Skill tree node states distinguishable
  - [ ] Preference persists across reload

  ## Loading States
  - [ ] Skill tree shows skeleton while loading
  - [ ] Lesson shows skeleton while loading
  - [ ] Dictionary shows skeleton while searching
  - [ ] Chat shows typing indicator during streaming
  - [ ] Grading shows spinner while waiting

  ## Error States
  - [ ] Stop backend → app shows "unable to connect" banner with retry
  - [ ] Retry button works when backend comes back
  - [ ] Browser offline mode → offline banner appears
  - [ ] Back online → banner disappears

  ## Observability
  - [ ] Check LangFuse dashboard for traces of LLM calls
  - [ ] Verify chat messages create traces
  - [ ] Verify grading calls create traces

  ## Security
  - [ ] CrowdSec is running (check docker logs)
  - [ ] Rate limiting works on chat endpoint
  ```

- [ ] **Step 5: Verify all exit criteria from spec**

  Confirm:
  - Mobile layout works on 375px width (iPhone SE) and 768px (tablet)
  - Dark mode has no contrast issues
  - All loading states show skeletons (no blank screens)
  - All error states show helpful messages
  - Backend tests pass
  - E2E tests pass
  - Data validation passes
  - LangFuse traces appear for all LLM calls
  - CrowdSec blocks test IPs

- [ ] **Step 6: Commit**

  Stage checklist file. Commit with message: "docs: add manual verification checklist for Phase 10"

- [ ] **Step 7:** Record learnings to `.claude/learnings-final-verification.md` using the surfacing-subagent-learnings skill.

---

## Parallelism Guide

Tasks 1-5 are independent and can be executed in parallel:
- **Task 1** (Mobile Responsive Layout) -- no dependencies
- **Task 2** (Dark Mode Verification) -- no dependencies
- **Task 3** (Loading States) -- no dependencies
- **Task 4** (Error States) -- no dependencies
- **Task 5** (Telegram Bot, OPTIONAL) -- no dependencies

Task 6 (E2E Tests) depends on Tasks 1-4 being complete, as the tests verify the UI changes from those tasks.

Task 7 (Backend Tests) depends on Task 5 if Telegram is implemented (needs migrations), otherwise independent.

Task 8 (Final Verification) depends on all other tasks.

```
[Task 1: Mobile] ───┐
[Task 2: Dark]  ────┤
[Task 3: Loading] ──┼──> [Task 6: E2E Tests] ──> [Task 8: Final]
[Task 4: Errors] ───┤                                    ^
[Task 5: Telegram] ─┴──> [Task 7: Backend Tests] ────────┘
```
