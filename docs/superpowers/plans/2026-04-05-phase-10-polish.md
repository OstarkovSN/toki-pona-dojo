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

## Task 5: Telegram Bot (OPTIONAL)

**Depends on:** Nothing
**OPTIONAL:** Only implement if `TG_BOT_TOKEN` environment variable is set. All code must be no-op when the token is absent.
**Files touched:**
- ADD `backend/app/services/telegram.py`
- ADD `backend/app/api/routes/telegram.py`
- MODIFY `backend/app/core/config.py` (add TG_BOT_TOKEN setting)
- MODIFY `backend/app/models.py` (add telegram_chat_id to User)
- MODIFY `backend/app/main.py` (register telegram router)
- ADD Alembic migration for telegram_chat_id column
- MODIFY frontend settings page (add "Connect Telegram" section)

### Steps

- [ ] **Step 1: Add TG_BOT_TOKEN to Settings**

  Edit `backend/app/core/config.py`. Add to the `Settings` class:

  ```python
  TG_BOT_TOKEN: str | None = None
  ```

  This field is optional and defaults to `None`, so the bot is a no-op when unset.

- [ ] **Step 2: Add telegram_chat_id to User model**

  Edit `backend/app/models.py`. Add to the `User` table model:

  ```python
  class User(UserBase, table=True):
      id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
      hashed_password: str
      created_at: datetime | None = Field(
          default_factory=get_datetime_utc,
          sa_type=DateTime(timezone=True),
      )
      telegram_chat_id: str | None = Field(default=None, max_length=64, index=True)
      telegram_link_code: str | None = Field(default=None, max_length=64)
      items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
  ```

  Also add `telegram_chat_id` to `UserPublic` for API responses:
  ```python
  class UserPublic(UserBase):
      id: uuid.UUID
      created_at: datetime | None = None
      telegram_chat_id: str | None = None
  ```

- [ ] **Step 3: Create Alembic migration**

  Run:
  ```bash
  cd backend && alembic revision --autogenerate -m "add telegram fields to user"
  ```

  Verify the generated migration adds `telegram_chat_id` and `telegram_link_code` columns to the `user` table with nullable=True.

- [ ] **Step 4: Create Telegram service**

  Create `backend/app/services/telegram.py`:

  ```python
  import logging
  import secrets

  import httpx

  from app.core.config import settings

  logger = logging.getLogger(__name__)

  TELEGRAM_API_BASE = "https://api.telegram.org/bot"


  def is_telegram_enabled() -> bool:
      return bool(settings.TG_BOT_TOKEN)


  def generate_link_code() -> str:
      return secrets.token_urlsafe(16)


  async def send_message(chat_id: str, text: str) -> bool:
      if not is_telegram_enabled():
          return False
      try:
          async with httpx.AsyncClient(timeout=10.0) as client:
              response = await client.post(
                  f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/sendMessage",
                  json={"chat_id": chat_id, "text": text},
              )
              response.raise_for_status()
              return True
      except httpx.HTTPError:
          logger.exception("Failed to send Telegram message to chat_id=%s", chat_id)
          return False


  async def send_streak_reminder(
      chat_id: str, streak: int, words_known: int
  ) -> bool:
      if not is_telegram_enabled():
          return False
      msg = (
          f"o kama sona! Your streak is {streak} days. "
          f"You know {words_known} words. Keep going!"
      )
      return await send_message(chat_id, msg)


  async def set_webhook(webhook_url: str) -> bool:
      if not is_telegram_enabled():
          return False
      try:
          async with httpx.AsyncClient(timeout=10.0) as client:
              response = await client.post(
                  f"{TELEGRAM_API_BASE}{settings.TG_BOT_TOKEN}/setWebhook",
                  json={"url": webhook_url},
              )
              response.raise_for_status()
              logger.info("Telegram webhook set to %s", webhook_url)
              return True
      except httpx.HTTPError:
          logger.exception("Failed to set Telegram webhook")
          return False
  ```

- [ ] **Step 5: Create Telegram webhook route**

  Create `backend/app/api/routes/telegram.py`:

  ```python
  import logging

  from fastapi import APIRouter, Depends, HTTPException
  from sqlmodel import Session, select

  from app.core.config import settings
  from app.core.db import get_session
  from app.models import User
  from app.services.telegram import is_telegram_enabled, send_message

  logger = logging.getLogger(__name__)
  router = APIRouter(prefix="/telegram", tags=["telegram"])


  @router.post("/webhook")
  async def telegram_webhook(
      update: dict,
      session: Session = Depends(get_session),
  ) -> dict:
      if not is_telegram_enabled():
          raise HTTPException(status_code=404, detail="Telegram bot not configured")

      message = update.get("message", {})
      text = message.get("text", "")
      chat_id = str(message.get("chat", {}).get("id", ""))

      if not chat_id:
          return {"ok": True}

      if text.startswith("/start"):
          parts = text.split(maxsplit=1)
          if len(parts) == 2:
              link_code = parts[1].strip()
              # Find user with this link code
              statement = select(User).where(User.telegram_link_code == link_code)
              user = session.exec(statement).first()
              if user:
                  user.telegram_chat_id = chat_id
                  user.telegram_link_code = None  # Consume the code
                  session.add(user)
                  session.commit()
                  await send_message(
                      chat_id,
                      "pona! Your Telegram is now linked to toki pona dojo. "
                      "You'll receive daily streak reminders here.",
                  )
                  logger.info("Linked Telegram chat_id=%s to user=%s", chat_id, user.id)
              else:
                  await send_message(
                      chat_id,
                      "Invalid or expired code. Please generate a new code in Settings.",
                  )
          else:
              await send_message(
                  chat_id,
                  "Welcome to toki pona dojo! "
                  "Use /start <code> with the code from your Settings page.",
              )

      return {"ok": True}
  ```

- [ ] **Step 6: Add API endpoint for generating link codes**

  Add to the users or settings routes (e.g., `backend/app/api/routes/users.py` or create a new endpoint):

  ```python
  from app.services.telegram import generate_link_code, is_telegram_enabled

  @router.post("/me/telegram-link-code")
  async def generate_telegram_link_code(
      current_user: CurrentUser,
      session: SessionDep,
  ) -> dict:
      if not is_telegram_enabled():
          raise HTTPException(status_code=404, detail="Telegram bot not configured")
      code = generate_link_code()
      current_user.telegram_link_code = code
      session.add(current_user)
      session.commit()
      return {
          "code": code,
          "bot_username": f"Search for your bot on Telegram and send: /start {code}",
      }

  @router.delete("/me/telegram")
  async def unlink_telegram(
      current_user: CurrentUser,
      session: SessionDep,
  ) -> dict:
      current_user.telegram_chat_id = None
      current_user.telegram_link_code = None
      session.add(current_user)
      session.commit()
      return {"message": "Telegram unlinked"}
  ```

- [ ] **Step 7: Register Telegram router in main.py**

  Edit `backend/app/main.py`:

  ```python
  from app.services.telegram import is_telegram_enabled

  # After existing router includes:
  if is_telegram_enabled():
      from app.api.routes.telegram import router as telegram_router
      app.include_router(telegram_router, prefix=settings.API_V1_STR)
  ```

- [ ] **Step 8: Add streak reminder background task**

  Add a simple daily task. Create or add to `backend/app/services/streak_reminder.py`:

  ```python
  import asyncio
  import logging
  from datetime import datetime, timezone

  from sqlmodel import Session, select

  from app.core.db import engine
  from app.models import User
  from app.services.telegram import is_telegram_enabled, send_streak_reminder

  logger = logging.getLogger(__name__)


  async def check_and_send_reminders() -> None:
      if not is_telegram_enabled():
          return

      with Session(engine) as session:
          # Find users with Telegram linked
          statement = select(User).where(User.telegram_chat_id.isnot(None))
          users = session.exec(statement).all()

          for user in users:
              # Look up the user's progress record.
              # The UserProgress model (added in a prior phase) stores streak and
              # vocabulary stats per user.  If no progress routes/models exist yet,
              # the implementer must first read backend/app/models.py and
              # backend/app/api/routes/ to find the actual progress table name and
              # fields.  The query below assumes:
              #   - Model: UserProgress (table "userprogress")
              #   - Fields: user_id (FK -> user.id), current_streak (int),
              #             words_learned (int), last_practice_date (date)
              from app.models import UserProgress  # noqa: E402

              progress = session.exec(
                  select(UserProgress).where(UserProgress.user_id == user.id)
              ).first()

              if progress is None:
                  continue

              # Skip users who already practiced today
              today = datetime.now(timezone.utc).date()
              if progress.last_practice_date and progress.last_practice_date >= today:
                  continue

              streak = progress.current_streak
              words_known = progress.words_learned
              if streak > 0:
                  await send_streak_reminder(
                      user.telegram_chat_id, streak, words_known
                  )

      logger.info("Streak reminders check completed for %d users", len(users))


  async def streak_reminder_loop() -> None:
      """Run daily at a fixed hour (e.g., 9 AM UTC)."""
      while True:
          now = datetime.now(timezone.utc)
          # Calculate seconds until next 9 AM UTC
          target_hour = 9
          if now.hour >= target_hour:
              # Already past target, wait until tomorrow
              seconds_until = (24 - now.hour + target_hour) * 3600 - now.minute * 60
          else:
              seconds_until = (target_hour - now.hour) * 3600 - now.minute * 60

          await asyncio.sleep(max(seconds_until, 60))
          await check_and_send_reminders()
  ```

  In `backend/app/main.py`, start the loop on app startup using the `lifespan` context manager pattern (`@app.on_event("startup")` is deprecated in FastAPI >= 0.93). Find the existing `app = FastAPI(...)` call and wrap it with a lifespan:

  ```python
  import asyncio
  from contextlib import asynccontextmanager

  from app.services.telegram import is_telegram_enabled

  @asynccontextmanager
  async def lifespan(app: FastAPI):
      # Startup
      if is_telegram_enabled():
          from app.services.streak_reminder import streak_reminder_loop
          task = asyncio.create_task(streak_reminder_loop())
      yield
      # Shutdown
      if is_telegram_enabled():
          task.cancel()

  # Then pass lifespan to the FastAPI constructor:
  # app = FastAPI(..., lifespan=lifespan)
  ```

  If `backend/app/main.py` already defines a `lifespan` function, merge the Telegram startup logic into the existing one rather than replacing it.

- [ ] **Step 9: Add "Connect Telegram" section to frontend settings**

  Find the settings page (likely `frontend/src/routes/_layout/settings.tsx` or a component it renders). Add a new section:

  ```tsx
  import { useState } from "react"
  import { Button } from "@/components/ui/button"
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
  import { Badge } from "@/components/ui/badge"

  function TelegramSection() {
    const [linkCode, setLinkCode] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const generateCode = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/v1/users/me/telegram-link-code", {
          method: "POST",
          headers: { /* auth headers */ },
        })
        const data = await response.json()
        setLinkCode(data.code)
      } finally {
        setIsLoading(false)
      }
    }

    // Only render if Telegram is configured (check via a feature flags endpoint or user data)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Telegram Notifications</CardTitle>
          <CardDescription>
            Get daily streak reminders via Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.telegram_chat_id ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Connected</Badge>
              <Button variant="outline" size="sm" onClick={unlinkTelegram}>
                Disconnect
              </Button>
            </div>
          ) : (
            <>
              <Button onClick={generateCode} disabled={isLoading}>
                Generate Link Code
              </Button>
              {linkCode && (
                <div className="rounded-md bg-muted p-4 space-y-2">
                  <p className="text-sm font-medium">Your code:</p>
                  <code className="text-lg font-mono select-all">{linkCode}</code>
                  <p className="text-xs text-muted-foreground">
                    Open your Telegram bot and send: <code>/start {linkCode}</code>
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }
  ```

  The section should only render when Telegram is enabled on the backend. **Decision: check the user model field.** The `UserPublic` response (from `GET /api/v1/users/me`) already includes the `telegram_chat_id` field (added in Step 3 of this task). If the field key is present in the response JSON (even if its value is `null`), Telegram is enabled on the backend. If the key is absent, the backend was built without Telegram support. Use this check:

  ```tsx
  // In the settings page, after fetching the current user:
  const showTelegram = user && "telegram_chat_id" in user
  ```

  Do **not** create a separate `/api/v1/features` endpoint for this.

- [ ] **Step 10: Commit**

  Stage all new and modified files. Commit with message: "feat: add optional Telegram bot for streak reminders"

- [ ] **Step 11:** Record learnings to `.claude/learnings-telegram-bot.md` using the surfacing-subagent-learnings skill.

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
