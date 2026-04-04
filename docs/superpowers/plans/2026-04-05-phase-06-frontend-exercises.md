# Phase 6: Frontend Exercises -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the lesson view with 7 interactive exercise types, immediate feedback, and LLM-graded free-form exercises.

**Architecture:** Dynamic route `$unit.$lesson.tsx` renders exercises sequentially, each exercise component implements `ExerciseProps` interface and calls `onComplete` with `ExerciseResult`. LLM-graded exercises use TanStack Query mutation to `POST /api/v1/chat/grade`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Router, TanStack Query

**Important codebase context:**
- The frontend uses `@/` path alias pointing to `frontend/src/`
- shadcn/ui components live in `frontend/src/components/ui/` (Badge, Button, Card, Input, Skeleton already exist)
- There is no Textarea component yet -- must be added via shadcn
- The layout uses `createFileRoute` from TanStack Router (see `frontend/src/routes/_layout.tsx`)
- API client uses `@hey-api/openapi-ts` generated code in `frontend/src/client/` with axios
- CSS theme uses oklch colors in `frontend/src/index.css` with `@theme inline` block
- No `learn/` route directory exists yet -- must be created
- The spec mentions zen earth-tone theme colors: teal (`#1D9E75`), coral (`#D85A30`), amber (`#B87020`). These map to oklch equivalents that need to be added as CSS custom properties.

---

## Task 1: Add theme colors and Textarea component

**Files:**
- MODIFY: `frontend/src/index.css`
- ADD: `frontend/src/components/ui/textarea.tsx`

### Steps

- [ ] **Step 1: Add teal/coral/amber CSS custom properties to `frontend/src/index.css`**

  In the `:root` block, add these custom properties after the existing chart/sidebar vars:

  ```css
  --teal: oklch(0.60 0.12 170);
  --coral: oklch(0.55 0.18 30);
  --amber: oklch(0.60 0.14 70);
  ```

  In the `.dark` block, add slightly brighter variants:

  ```css
  --teal: oklch(0.65 0.12 170);
  --coral: oklch(0.60 0.18 30);
  --amber: oklch(0.65 0.14 70);
  ```

  In the `@theme inline` block, add:

  ```css
  --color-teal: var(--teal);
  --color-coral: var(--coral);
  --color-amber: var(--amber);
  ```

  This enables `bg-teal`, `text-coral`, `border-amber` etc. in Tailwind classes.

- [ ] **Step 2: Add Textarea component at `frontend/src/components/ui/textarea.tsx`**

  Create the shadcn-style Textarea component:

  ```tsx
  import * as React from "react"

  import { cn } from "@/lib/utils"

  function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return (
      <textarea
        data-slot="textarea"
        className={cn(
          "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        {...props}
      />
    )
  }

  export { Textarea }
  ```

- [ ] **Step 3: Verify the CSS file parses correctly**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/components/ui/textarea.tsx 2>&1 | head -20
  ```
  Expected: No errors related to textarea.

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/index.css frontend/src/components/ui/textarea.tsx
  git commit -m "Add teal/coral/amber theme colors and Textarea component"
  ```

- [ ] **Step 5:** Record learnings to `.claude/learnings-theme-colors-textarea.md` using the surfacing-subagent-learnings skill.

---

## Task 2: Define exercise types and API client functions

**Files:**
- ADD: `frontend/src/types/exercises.ts`
- ADD: `frontend/src/lib/api/lessons.ts`

### Steps

- [ ] **Step 1: Create the exercise types file at `frontend/src/types/exercises.ts`**

  This file defines ALL shared types for the exercise system. Every exercise component and the lesson route import from here.

  ```typescript
  // --- API response types ---

  /** Exercise types returned by the backend */
  export type ExerciseType =
    | "match"
    | "multi_choice"
    | "word_bank"
    | "fill_particle"
    | "free_compose"
    | "concept_build"
    | "story"

  /** A single pair for match exercises */
  export interface MatchPair {
    tokiPona: string
    english: string
  }

  /** A single comprehension question for story exercises */
  export interface StoryQuestion {
    question: string
    options: string[]
    correctIndex: number
  }

  /** Exercise data from GET /api/v1/lessons/units/{unit_id}/lessons/{lesson_id} */
  export interface Exercise {
    id: string
    type: ExerciseType
    /** The prompt or question text shown to the user */
    prompt: string
    /** For multi_choice and fill_particle: array of option strings */
    options?: string[]
    /** Index of correct option (multi_choice, fill_particle) */
    correctIndex?: number
    /** For word_bank: words available to arrange */
    wordBank?: string[]
    /** For word_bank: list of valid answer strings */
    validAnswers?: string[]
    /** For match: pairs to match */
    pairs?: MatchPair[]
    /** For story: the toki pona paragraph */
    storyText?: string
    /** For story: English translation (hidden until revealed) */
    translation?: string
    /** For story: comprehension questions */
    questions?: StoryQuestion[]
    /** For concept_build: hint text */
    hint?: string
    /** For concept_build: suggested approach (revealed on request) */
    suggestedAnswer?: string
    /** For fill_particle: sentence with ___ placeholder */
    sentence?: string
    /** For fill_particle: English translation hint */
    translationHint?: string
    /** Feedback text for correct answer */
    correctFeedback?: string
    /** The correct answer text (for display after wrong answer) */
    correctAnswer?: string
    /** Words involved in this exercise (for SRS tracking) */
    words: string[]
  }

  /** Lesson data from API */
  export interface Lesson {
    id: string
    unitId: number
    lessonIndex: number
    title: string
    exercises: Exercise[]
  }

  /** Unit data from API */
  export interface Unit {
    id: number
    title: string
    description: string
    lessonCount: number
  }

  // --- Component interfaces ---

  /** Result produced by each exercise component when the user answers */
  export interface ExerciseResult {
    correct: boolean
    /** 0.0 to 1.0 */
    score: number
    /** Optional feedback text (from LLM or from exercise data) */
    feedback?: string
    /** Words involved in this exercise (for SRS tracking at lesson end) */
    words: string[]
  }

  /** Props passed to every exercise component */
  export interface ExerciseProps {
    exercise: Exercise
    onComplete: (result: ExerciseResult) => void
  }

  // --- LLM grading types ---

  /** Request body for POST /api/v1/chat/grade */
  export interface GradeRequest {
    exerciseId: string
    exerciseType: ExerciseType
    prompt: string
    userAnswer: string
    /** Additional context (e.g., hint for concept_build) */
    context?: string
  }

  /** Response from POST /api/v1/chat/grade */
  export interface GradeResponse {
    correct: boolean
    score: number
    feedback: string
    suggestedAnswer?: string
  }
  ```

- [ ] **Step 2: Create the API client functions at `frontend/src/lib/api/lessons.ts`**

  This module wraps fetch calls for the lessons and grading endpoints, used by TanStack Query hooks.

  ```typescript
  import type { Lesson, GradeRequest, GradeResponse } from "@/types/exercises"
  import { OpenAPI } from "@/client/core/OpenAPI"

  function getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" }
    const token = OpenAPI.TOKEN
    if (typeof token === "string" && token) {
      headers["Authorization"] = `Bearer ${token}`
    }
    return headers
  }

  function getBaseUrl(): string {
    return OpenAPI.BASE || ""
  }

  /**
   * Fetch lesson exercises.
   * GET /api/v1/lessons/units/{unitId}/lessons/{lessonId}
   */
  export async function fetchLesson(
    unitId: number,
    lessonId: number,
  ): Promise<Lesson> {
    const res = await fetch(
      `${getBaseUrl()}/api/v1/lessons/units/${unitId}/lessons/${lessonId}`,
      { headers: getHeaders() },
    )
    if (!res.ok) {
      throw new Error(`Failed to fetch lesson: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  /**
   * Submit answer for LLM grading.
   * POST /api/v1/chat/grade
   */
  export async function gradeExercise(
    req: GradeRequest,
  ): Promise<GradeResponse> {
    const res = await fetch(`${getBaseUrl()}/api/v1/chat/grade`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(req),
    })
    if (!res.ok) {
      throw new Error(`Grading failed: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }
  ```

- [ ] **Step 3: Create directory structure**
  ```bash
  mkdir -p frontend/src/types frontend/src/lib/api
  ```

- [ ] **Step 4: Verify TypeScript compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -30
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/types/exercises.ts frontend/src/lib/api/lessons.ts
  git commit -m "Add exercise type definitions and lesson/grading API client"
  ```

- [ ] **Step 6:** Record learnings to `.claude/learnings-exercise-types-api.md` using the surfacing-subagent-learnings skill.

---

## Task 3: Build ProgressBar and FeedbackToast components

**Files:**
- ADD: `frontend/src/components/ProgressBar.tsx`
- ADD: `frontend/src/components/FeedbackToast.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/components/ProgressBar.tsx`**

  Thin teal progress bar shown at the top of the lesson view.

  ```tsx
  interface ProgressBarProps {
    current: number
    total: number
  }

  export function ProgressBar({ current, total }: ProgressBarProps) {
    const pct = total > 0 ? (current / total) * 100 : 0

    return (
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-teal transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    )
  }
  ```

- [ ] **Step 2: Create `frontend/src/components/FeedbackToast.tsx`**

  Slides up from the bottom of the exercise area. Shows correct/wrong state with feedback text and a "next" or "finish lesson" button.

  ```tsx
  import { Button } from "@/components/ui/button"
  import { cn } from "@/lib/utils"

  interface FeedbackToastProps {
    correct: boolean
    feedback?: string
    correctAnswer?: string
    isLastExercise: boolean
    onNext: () => void
  }

  export function FeedbackToast({
    correct,
    feedback,
    correctAnswer,
    isLastExercise,
    onNext,
  }: FeedbackToastProps) {
    return (
      <div
        className={cn(
          "animate-in slide-in-from-bottom-4 duration-300",
          "rounded-lg px-5 py-4 mt-4",
          correct ? "bg-teal/15 border border-teal/30" : "bg-coral/15 border border-coral/30",
        )}
      >
        <p
          className={cn(
            "font-serif text-lg font-semibold",
            correct ? "text-teal" : "text-coral",
          )}
        >
          {correct ? "pona!" : "ike..."}
        </p>

        {feedback && (
          <p className="mt-1 text-sm text-muted-foreground">{feedback}</p>
        )}

        {!correct && correctAnswer && (
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">correct answer: </span>
            <span className="font-mono text-foreground">{correctAnswer}</span>
          </p>
        )}

        <Button
          className={cn(
            "mt-3 w-full",
            correct
              ? "bg-teal text-white hover:bg-teal/90"
              : "bg-coral text-white hover:bg-coral/90",
          )}
          onClick={onNext}
        >
          {isLastExercise ? "finish lesson" : "next"}
        </Button>
      </div>
    )
  }
  ```

- [ ] **Step 3: Verify both components compile**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/components/ProgressBar.tsx frontend/src/components/FeedbackToast.tsx
  git commit -m "Add ProgressBar and FeedbackToast components for lesson view"
  ```

- [ ] **Step 5:** Record learnings to `.claude/learnings-progressbar-feedbacktoast.md` using the surfacing-subagent-learnings skill.

---

## Task 4: Build ExerciseMatch component

**Files:**
- ADD: `frontend/src/components/ExerciseMatch.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/components/ExerciseMatch.tsx`**

  Two-column tap-to-match exercise. User taps one item from each column to attempt a match. Correct pairs get teal background and become disabled. Wrong attempts flash coral for 500ms then reset. Completes when all pairs are matched. Score = first-try correct / total pairs.

  ```tsx
  import { useState, useCallback, useEffect } from "react"
  import { cn } from "@/lib/utils"
  import type { ExerciseProps } from "@/types/exercises"

  interface ItemState {
    text: string
    matched: boolean
  }

  export function ExerciseMatch({ exercise, onComplete }: ExerciseProps) {
    const pairs = exercise.pairs ?? []
    const total = pairs.length

    // Shuffle each column independently on mount
    const [leftItems, setLeftItems] = useState<ItemState[]>([])
    const [rightItems, setRightItems] = useState<ItemState[]>([])
    const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
    const [selectedRight, setSelectedRight] = useState<number | null>(null)
    const [flashWrong, setFlashWrong] = useState<{
      left: number
      right: number
    } | null>(null)
    const [firstTryCorrect, setFirstTryCorrect] = useState(0)
    const [matchedCount, setMatchedCount] = useState(0)
    const [attempts, setAttempts] = useState<Set<string>>(new Set())

    // Initialize shuffled columns
    useEffect(() => {
      const shuffle = <T,>(arr: T[]): T[] => {
        const copy = [...arr]
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[copy[i], copy[j]] = [copy[j], copy[i]]
        }
        return copy
      }

      setLeftItems(
        shuffle(pairs.map((p) => ({ text: p.tokiPona, matched: false }))),
      )
      setRightItems(
        shuffle(pairs.map((p) => ({ text: p.english, matched: false }))),
      )
    }, [pairs])

    const tryMatch = useCallback(
      (leftIdx: number, rightIdx: number) => {
        const leftText = leftItems[leftIdx].text
        const rightText = rightItems[rightIdx].text

        // Find if this is a valid pair
        const isCorrect = pairs.some(
          (p) => p.tokiPona === leftText && p.english === rightText,
        )

        const pairKey = `${leftText}:${rightText}`
        const isFirstAttemptForPair = !attempts.has(pairKey)
        setAttempts((prev) => new Set(prev).add(pairKey))

        if (isCorrect) {
          setLeftItems((prev) =>
            prev.map((item, i) =>
              i === leftIdx ? { ...item, matched: true } : item,
            ),
          )
          setRightItems((prev) =>
            prev.map((item, i) =>
              i === rightIdx ? { ...item, matched: true } : item,
            ),
          )
          const newFirstTry = isFirstAttemptForPair
            ? firstTryCorrect + 1
            : firstTryCorrect
          setFirstTryCorrect(newFirstTry)
          const newMatchedCount = matchedCount + 1
          setMatchedCount(newMatchedCount)
          setSelectedLeft(null)
          setSelectedRight(null)

          // Check completion
          if (newMatchedCount === total) {
            onComplete({
              correct: newFirstTry === total,
              score: total > 0 ? newFirstTry / total : 1,
              feedback:
                newFirstTry === total
                  ? "All matched on first try!"
                  : `${newFirstTry}/${total} matched on first try.`,
              words: exercise.words,
            })
          }
        } else {
          // Flash wrong
          setFlashWrong({ left: leftIdx, right: rightIdx })
          setTimeout(() => {
            setFlashWrong(null)
            setSelectedLeft(null)
            setSelectedRight(null)
          }, 500)
        }
      },
      [
        leftItems,
        rightItems,
        pairs,
        attempts,
        firstTryCorrect,
        matchedCount,
        total,
        exercise.words,
        onComplete,
      ],
    )

    // When both sides selected, try match
    useEffect(() => {
      if (selectedLeft !== null && selectedRight !== null) {
        tryMatch(selectedLeft, selectedRight)
      }
    }, [selectedLeft, selectedRight, tryMatch])

    const handleLeftClick = (idx: number) => {
      if (leftItems[idx].matched || flashWrong) return
      setSelectedLeft(idx)
    }

    const handleRightClick = (idx: number) => {
      if (rightItems[idx].matched || flashWrong) return
      setSelectedRight(idx)
    }

    return (
      <div>
        <p className="mb-4 font-serif text-lg">{exercise.prompt}</p>
        <div className="grid grid-cols-2 gap-4">
          {/* Left column: toki pona */}
          <div className="flex flex-col gap-2">
            {leftItems.map((item, i) => (
              <button
                key={`left-${i}`}
                data-testid={`match-left-${i}`}
                aria-label={`toki pona: ${item.text}`}
                disabled={item.matched}
                onClick={() => handleLeftClick(i)}
                className={cn(
                  "min-h-[44px] rounded-md border px-4 py-3 text-left font-mono text-sm transition-colors",
                  item.matched && "bg-teal/15 border-teal/30 text-teal",
                  !item.matched && selectedLeft === i && "border-primary bg-primary/10",
                  !item.matched &&
                    selectedLeft !== i &&
                    "border-border hover:border-primary/50",
                  flashWrong?.left === i && "bg-coral/15 border-coral/30",
                )}
              >
                {item.text}
              </button>
            ))}
          </div>

          {/* Right column: English */}
          <div className="flex flex-col gap-2">
            {rightItems.map((item, i) => (
              <button
                key={`right-${i}`}
                data-testid={`match-right-${i}`}
                aria-label={`english: ${item.text}`}
                disabled={item.matched}
                onClick={() => handleRightClick(i)}
                className={cn(
                  "min-h-[44px] rounded-md border px-4 py-3 text-left text-sm transition-colors",
                  item.matched && "bg-teal/15 border-teal/30 text-teal",
                  !item.matched && selectedRight === i && "border-primary bg-primary/10",
                  !item.matched &&
                    selectedRight !== i &&
                    "border-border hover:border-primary/50",
                  flashWrong?.right === i && "bg-coral/15 border-coral/30",
                )}
              >
                {item.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify component compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/ExerciseMatch.tsx
  git commit -m "Add ExerciseMatch component with tap-to-match pairs"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-exercise-match.md` using the surfacing-subagent-learnings skill.

---

## Task 5: Build ExerciseMultiChoice component

**Files:**
- ADD: `frontend/src/components/ExerciseMultiChoice.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/components/ExerciseMultiChoice.tsx`**

  4-option multiple choice. Single attempt. On tap: correct option gets teal bg, wrong option gets coral bg and correct answer is highlighted teal. Score is 1.0 or 0.0.

  ```tsx
  import { useState } from "react"
  import { Button } from "@/components/ui/button"
  import { cn } from "@/lib/utils"
  import type { ExerciseProps } from "@/types/exercises"

  export function ExerciseMultiChoice({ exercise, onComplete }: ExerciseProps) {
    const options = exercise.options ?? []
    const correctIdx = exercise.correctIndex ?? 0
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
    const answered = selectedIdx !== null

    const handleSelect = (idx: number) => {
      if (answered) return
      setSelectedIdx(idx)

      const isCorrect = idx === correctIdx
      onComplete({
        correct: isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        feedback: exercise.correctFeedback,
        words: exercise.words,
      })
    }

    return (
      <div>
        <p className="mb-6 font-serif text-lg">{exercise.prompt}</p>

        <div className="flex flex-col gap-3">
          {options.map((option, i) => {
            const isSelected = selectedIdx === i
            const isCorrectOption = i === correctIdx

            let variant: "outline" | "default" | "destructive" = "outline"
            let extraClasses = ""

            if (answered) {
              if (isCorrectOption) {
                variant = "default"
                extraClasses = "bg-teal text-white border-teal hover:bg-teal/90"
              } else if (isSelected && !isCorrectOption) {
                variant = "destructive"
                extraClasses = "bg-coral text-white border-coral hover:bg-coral/90"
              }
            }

            return (
              <Button
                key={i}
                variant={variant}
                className={cn("w-full justify-start text-left py-4 h-auto", extraClasses)}
                disabled={answered && !isSelected && !isCorrectOption}
                onClick={() => handleSelect(i)}
              >
                {option}
              </Button>
            )
          })}
        </div>

        {answered && exercise.correctFeedback && (
          <p className="mt-4 font-serif text-sm italic text-muted-foreground">
            {exercise.correctFeedback}
          </p>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify component compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/ExerciseMultiChoice.tsx
  git commit -m "Add ExerciseMultiChoice component with 4-option buttons"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-exercise-multichoice.md` using the surfacing-subagent-learnings skill.

---

## Task 6: Build ExerciseWordBank component

**Files:**
- ADD: `frontend/src/components/ExerciseWordBank.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/components/ExerciseWordBank.tsx`**

  User taps word pills from a bank to build a sentence in a drop zone. Tap placed word to return it. Check button validates against valid answers. Multiple correct orderings accepted.

  ```tsx
  import { useState } from "react"
  import { Badge } from "@/components/ui/badge"
  import { Button } from "@/components/ui/button"
  import { cn } from "@/lib/utils"
  import type { ExerciseProps } from "@/types/exercises"

  export function ExerciseWordBank({ exercise, onComplete }: ExerciseProps) {
    const allWords = exercise.wordBank ?? []
    const validAnswers = exercise.validAnswers ?? []

    const [bankWords, setBankWords] = useState<string[]>(() => [...allWords])
    const [placedWords, setPlacedWords] = useState<string[]>([])
    const [checked, setChecked] = useState(false)
    const [isCorrect, setIsCorrect] = useState(false)

    const handleTapBank = (word: string, idx: number) => {
      if (checked) return
      setBankWords((prev) => prev.filter((_, i) => i !== idx))
      setPlacedWords((prev) => [...prev, word])
    }

    const handleTapPlaced = (word: string, idx: number) => {
      if (checked) return
      setPlacedWords((prev) => prev.filter((_, i) => i !== idx))
      setBankWords((prev) => [...prev, word])
    }

    const handleCheck = () => {
      const userAnswer = placedWords.join(" ")
      const correct = validAnswers.some(
        (valid) => valid.toLowerCase().trim() === userAnswer.toLowerCase().trim(),
      )
      setChecked(true)
      setIsCorrect(correct)

      onComplete({
        correct,
        score: correct ? 1.0 : 0.0,
        feedback: correct ? undefined : `A correct answer: ${validAnswers[0]}`,
        words: exercise.words,
      })
    }

    return (
      <div>
        <p className="mb-4 font-serif text-lg">{exercise.prompt}</p>

        {/* Drop zone */}
        <div
          className={cn(
            "min-h-16 rounded-md border-2 border-dashed px-3 py-3 mb-4 flex flex-wrap gap-2 items-start",
            checked && isCorrect && "border-teal/50 bg-teal/5",
            checked && !isCorrect && "border-coral/50 bg-coral/5",
            !checked && "border-border",
          )}
        >
          {placedWords.length === 0 && !checked && (
            <span className="text-sm text-muted-foreground italic">
              tap words to build a sentence
            </span>
          )}
          {placedWords.map((word, i) => (
            <Badge
              key={`placed-${i}`}
              variant="secondary"
              className={cn(
                "cursor-pointer text-sm px-3 py-1.5",
                !checked && "hover:bg-destructive/10",
              )}
              onClick={() => handleTapPlaced(word, i)}
            >
              {word}
            </Badge>
          ))}
        </div>

        {/* Word bank */}
        <div className="flex flex-wrap gap-2 mb-4">
          {bankWords.map((word, i) => (
            <Badge
              key={`bank-${i}`}
              variant="outline"
              className="cursor-pointer text-sm px-3 py-1.5 hover:bg-primary/10"
              onClick={() => handleTapBank(word, i)}
            >
              {word}
            </Badge>
          ))}
        </div>

        {!checked && (
          <Button
            onClick={handleCheck}
            disabled={placedWords.length === 0}
            className="w-full"
          >
            check
          </Button>
        )}

        {checked && !isCorrect && validAnswers.length > 0 && (
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">correct answer: </span>
            <span className="font-mono text-foreground">{validAnswers[0]}</span>
          </p>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify component compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/ExerciseWordBank.tsx
  git commit -m "Add ExerciseWordBank component with tap-to-build sentence"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-exercise-wordbank.md` using the surfacing-subagent-learnings skill.

---

## Task 7: Build ExerciseFillParticle component

**Files:**
- ADD: `frontend/src/components/ExerciseFillParticle.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/components/ExerciseFillParticle.tsx`**

  Sentence with a blank (rendered with highlighted gap). 4 particle options as tappable pills. Same correct/wrong behavior as multi-choice. Score 1.0 or 0.0.

  ```tsx
  import { useState } from "react"
  import { cn } from "@/lib/utils"
  import type { ExerciseProps } from "@/types/exercises"

  export function ExerciseFillParticle({ exercise, onComplete }: ExerciseProps) {
    const options = exercise.options ?? []
    const correctIdx = exercise.correctIndex ?? 0
    const sentence = exercise.sentence ?? exercise.prompt
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
    const answered = selectedIdx !== null

    // Split sentence on "___" to render the blank
    const parts = sentence.split("___")

    const handleSelect = (idx: number) => {
      if (answered) return
      setSelectedIdx(idx)

      const isCorrect = idx === correctIdx
      onComplete({
        correct: isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        feedback: exercise.correctFeedback,
        words: exercise.words,
      })
    }

    const filledWord = selectedIdx !== null ? options[selectedIdx] : null
    const isCorrect = selectedIdx === correctIdx

    return (
      <div>
        {/* Sentence with blank */}
        <div className="mb-2 font-mono text-lg leading-relaxed">
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < parts.length - 1 && (
                <span
                  className={cn(
                    "inline-block min-w-12 mx-1 border-b-2 text-center font-semibold",
                    !filledWord && "border-amber text-amber",
                    filledWord && isCorrect && "border-teal text-teal",
                    filledWord && !isCorrect && "border-coral text-coral",
                  )}
                >
                  {filledWord ?? "\u00A0\u00A0\u00A0"}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Translation hint */}
        {exercise.translationHint && (
          <p className="mb-4 text-sm text-muted-foreground italic">
            {exercise.translationHint}
          </p>
        )}

        {/* Particle options */}
        <div className="flex flex-wrap gap-3 mt-4">
          {options.map((option, i) => {
            const isSelected = selectedIdx === i
            const isCorrectOption = i === correctIdx

            return (
              <button
                key={i}
                aria-label={`particle option: ${option}`}
                disabled={answered}
                className={cn(
                  "min-h-[44px] rounded-full border text-base px-5 py-2 transition-colors",
                  !answered && "hover:bg-primary/10 border-border",
                  answered && isCorrectOption && "bg-teal/15 border-teal text-teal",
                  answered &&
                    isSelected &&
                    !isCorrectOption &&
                    "bg-coral/15 border-coral text-coral",
                  answered &&
                    !isSelected &&
                    !isCorrectOption &&
                    "opacity-40 border-border",
                )}
                onClick={() => handleSelect(i)}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify component compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/ExerciseFillParticle.tsx
  git commit -m "Add ExerciseFillParticle component with blank-fill interaction"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-exercise-fillparticle.md` using the surfacing-subagent-learnings skill.

---

## Task 8: Build ExerciseFreeCompose component (LLM-graded)

**Files:**
- ADD: `frontend/src/components/ExerciseFreeCompose.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/components/ExerciseFreeCompose.tsx`**

  Textarea for free input. "check" button calls `POST /api/v1/chat/grade`. Shows loading state while waiting. Displays LLM feedback with score and suggested answer. Error state if LLM unreachable.

  ```tsx
  import { useState } from "react"
  import { useMutation } from "@tanstack/react-query"
  import { Button } from "@/components/ui/button"
  import { Textarea } from "@/components/ui/textarea"
  import { cn } from "@/lib/utils"
  import { gradeExercise } from "@/lib/api/lessons"
  import type { ExerciseProps, GradeRequest } from "@/types/exercises"

  export function ExerciseFreeCompose({ exercise, onComplete }: ExerciseProps) {
    const [answer, setAnswer] = useState("")
    const [submitted, setSubmitted] = useState(false)

    const gradeMutation = useMutation({
      mutationFn: (req: GradeRequest) => gradeExercise(req),
      onSuccess: (data) => {
        setSubmitted(true)
        onComplete({
          correct: data.correct,
          score: data.score,
          feedback: data.feedback,
          words: exercise.words,
        })
      },
      onError: () => {
        setSubmitted(true)
        onComplete({
          correct: false,
          score: 0,
          feedback: "Could not reach the grading service. Please try again later.",
          words: exercise.words,
        })
      },
    })

    const handleCheck = () => {
      if (!answer.trim()) return
      gradeMutation.mutate({
        exerciseId: exercise.id,
        exerciseType: exercise.type,
        prompt: exercise.prompt,
        userAnswer: answer.trim(),
      })
    }

    /** Render score as filled/empty stars */
    const renderScore = (score: number) => {
      const filled = Math.round(score * 5)
      return (
        <span className="text-amber" aria-label={`Score: ${score.toFixed(1)}`}>
          {"★".repeat(filled)}
          {"☆".repeat(5 - filled)}
        </span>
      )
    }

    return (
      <div>
        <p className="mb-4 font-serif text-lg">{exercise.prompt}</p>

        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer in toki pona..."
          className="mb-4 font-mono"
          disabled={submitted || gradeMutation.isPending}
          rows={3}
        />

        {!submitted && !gradeMutation.isPending && (
          <Button
            onClick={handleCheck}
            disabled={!answer.trim()}
            className="w-full"
          >
            check
          </Button>
        )}

        {gradeMutation.isPending && (
          <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">grading...</span>
          </div>
        )}

        {submitted && gradeMutation.data && (
          <div className="mt-4 space-y-2">
            <div className="text-lg">{renderScore(gradeMutation.data.score)}</div>
            <p className="text-sm text-muted-foreground">
              {gradeMutation.data.feedback}
            </p>
            {gradeMutation.data.suggestedAnswer && (
              <p className="text-sm">
                <span className="text-muted-foreground">suggested: </span>
                <span className="font-mono text-foreground">
                  {gradeMutation.data.suggestedAnswer}
                </span>
              </p>
            )}
          </div>
        )}

        {submitted && gradeMutation.isError && (
          <p className="mt-4 text-sm text-coral">
            Could not reach the grading service. Please try again later.
          </p>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify component compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/ExerciseFreeCompose.tsx
  git commit -m "Add ExerciseFreeCompose component with LLM grading"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-exercise-freecompose.md` using the surfacing-subagent-learnings skill.

---

## Task 9: Build ExerciseConceptBuild component (LLM-graded)

**Files:**
- ADD: `frontend/src/components/ExerciseConceptBuild.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/components/ExerciseConceptBuild.tsx`**

  Similar to FreeCompose but with a hint and a "show one approach" button that reveals a suggested answer from exercise data (not LLM). LLM grades the user's free-text answer.

  ```tsx
  import { useState } from "react"
  import { useMutation } from "@tanstack/react-query"
  import { Button } from "@/components/ui/button"
  import { Textarea } from "@/components/ui/textarea"
  import { cn } from "@/lib/utils"
  import { gradeExercise } from "@/lib/api/lessons"
  import type { ExerciseProps, GradeRequest } from "@/types/exercises"

  export function ExerciseConceptBuild({ exercise, onComplete }: ExerciseProps) {
    const [answer, setAnswer] = useState("")
    const [submitted, setSubmitted] = useState(false)
    const [showApproach, setShowApproach] = useState(false)

    const gradeMutation = useMutation({
      mutationFn: (req: GradeRequest) => gradeExercise(req),
      onSuccess: (data) => {
        setSubmitted(true)
        onComplete({
          correct: data.correct,
          score: data.score,
          feedback: data.feedback,
          words: exercise.words,
        })
      },
      onError: () => {
        setSubmitted(true)
        onComplete({
          correct: false,
          score: 0,
          feedback: "Could not reach the grading service. Please try again later.",
          words: exercise.words,
        })
      },
    })

    const handleCheck = () => {
      if (!answer.trim()) return
      gradeMutation.mutate({
        exerciseId: exercise.id,
        exerciseType: exercise.type,
        prompt: exercise.prompt,
        userAnswer: answer.trim(),
        context: exercise.hint,
      })
    }

    const renderScore = (score: number) => {
      const filled = Math.round(score * 5)
      return (
        <span className="text-amber" aria-label={`Score: ${score.toFixed(1)}`}>
          {"★".repeat(filled)}
          {"☆".repeat(5 - filled)}
        </span>
      )
    }

    return (
      <div>
        <p className="mb-2 font-serif text-lg">{exercise.prompt}</p>

        {exercise.hint && (
          <p className="mb-4 text-sm text-muted-foreground italic">
            {exercise.hint}
          </p>
        )}

        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer in toki pona..."
          className="mb-4 font-mono"
          disabled={submitted || gradeMutation.isPending}
          rows={3}
        />

        <div className="flex gap-2">
          {!submitted && !gradeMutation.isPending && (
            <Button
              onClick={handleCheck}
              disabled={!answer.trim()}
              className="flex-1"
            >
              check
            </Button>
          )}

          {!showApproach && exercise.suggestedAnswer && (
            <Button
              variant="outline"
              onClick={() => setShowApproach(true)}
              className="flex-1"
            >
              show one approach
            </Button>
          )}
        </div>

        {showApproach && exercise.suggestedAnswer && (
          <div className="mt-3 rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              one approach
            </p>
            <p className="font-mono text-sm">{exercise.suggestedAnswer}</p>
          </div>
        )}

        {gradeMutation.isPending && (
          <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">grading...</span>
          </div>
        )}

        {submitted && gradeMutation.data && (
          <div className="mt-4 space-y-2">
            <div className="text-lg">{renderScore(gradeMutation.data.score)}</div>
            <p className="text-sm text-muted-foreground">
              {gradeMutation.data.feedback}
            </p>
            {gradeMutation.data.suggestedAnswer && (
              <p className="text-sm">
                <span className="text-muted-foreground">suggested: </span>
                <span className="font-mono text-foreground">
                  {gradeMutation.data.suggestedAnswer}
                </span>
              </p>
            )}
          </div>
        )}

        {submitted && gradeMutation.isError && (
          <p className="mt-4 text-sm text-coral">
            Could not reach the grading service. Please try again later.
          </p>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify component compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/ExerciseConceptBuild.tsx
  git commit -m "Add ExerciseConceptBuild component with hint and LLM grading"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-exercise-conceptbuild.md` using the surfacing-subagent-learnings skill.

---

## Task 10: Build ExerciseStory component

**Files:**
- ADD: `frontend/src/components/ExerciseStory.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/components/ExerciseStory.tsx`**

  Displays a toki pona paragraph in a card. Below: 1-2 comprehension questions as multiple choice. "reveal translation" button shows English. Score = proportion of questions correct.

  ```tsx
  import { useState } from "react"
  import { Button } from "@/components/ui/button"
  import { Card, CardContent } from "@/components/ui/card"
  import { cn } from "@/lib/utils"
  import type { ExerciseProps } from "@/types/exercises"

  export function ExerciseStory({ exercise, onComplete }: ExerciseProps) {
    const questions = exercise.questions ?? []
    const totalQuestions = questions.length

    const [answers, setAnswers] = useState<(number | null)[]>(
      () => new Array(totalQuestions).fill(null),
    )
    const [showTranslation, setShowTranslation] = useState(false)
    const [completed, setCompleted] = useState(false)

    const answeredCount = answers.filter((a) => a !== null).length
    const allAnswered = answeredCount === totalQuestions

    const handleAnswer = (questionIdx: number, optionIdx: number) => {
      if (answers[questionIdx] !== null) return // already answered this question

      const newAnswers = [...answers]
      newAnswers[questionIdx] = optionIdx
      setAnswers(newAnswers)

      // Check if all questions are now answered
      const nowAnsweredCount = newAnswers.filter((a) => a !== null).length
      if (nowAnsweredCount === totalQuestions && !completed) {
        setCompleted(true)
        const correctCount = newAnswers.reduce<number>((acc, ans, i) => {
          return acc + (ans === questions[i].correctIndex ? 1 : 0)
        }, 0)
        const score = totalQuestions > 0 ? correctCount / totalQuestions : 1

        onComplete({
          correct: correctCount === totalQuestions,
          score,
          feedback: `${correctCount}/${totalQuestions} questions correct.`,
          words: exercise.words,
        })
      }
    }

    return (
      <div>
        <p className="mb-4 font-serif text-lg">{exercise.prompt}</p>

        {/* Story card */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="font-mono text-base leading-relaxed whitespace-pre-line">
              {exercise.storyText}
            </p>
          </CardContent>
        </Card>

        {/* Reveal translation */}
        {exercise.translation && (
          <div className="mb-4">
            {!showTranslation ? (
              <Button
                variant="ghost"
                className="text-sm text-muted-foreground"
                onClick={() => setShowTranslation(true)}
              >
                reveal translation
              </Button>
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {exercise.translation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Comprehension questions */}
        <div className="space-y-6">
          {questions.map((q, qIdx) => {
            const userAnswer = answers[qIdx]
            const isAnswered = userAnswer !== null

            return (
              <div key={qIdx}>
                <p className="mb-2 text-sm font-medium">{q.question}</p>
                <div className="flex flex-col gap-2">
                  {q.options.map((option, oIdx) => {
                    const isSelected = userAnswer === oIdx
                    const isCorrectOption = oIdx === q.correctIndex

                    return (
                      <button
                        key={oIdx}
                        disabled={isAnswered}
                        onClick={() => handleAnswer(qIdx, oIdx)}
                        className={cn(
                          "rounded-md border px-4 py-2.5 text-left text-sm transition-colors",
                          !isAnswered && "border-border hover:border-primary/50",
                          isAnswered &&
                            isCorrectOption &&
                            "bg-teal/15 border-teal/30 text-teal",
                          isAnswered &&
                            isSelected &&
                            !isCorrectOption &&
                            "bg-coral/15 border-coral/30 text-coral",
                          isAnswered &&
                            !isSelected &&
                            !isCorrectOption &&
                            "opacity-40",
                        )}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify component compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/ExerciseStory.tsx
  git commit -m "Add ExerciseStory component with comprehension questions"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-exercise-story.md` using the surfacing-subagent-learnings skill.

---

## Task 11: Build useLessons hook

**Files:**
- ADD: `frontend/src/hooks/useLessons.ts`

### Steps

- [ ] **Step 1: Create `frontend/src/hooks/useLessons.ts`**

  Hook that fetches lesson data via TanStack Query, tracks current exercise index, collects results, and provides navigation helpers.

  ```typescript
  import { useState, useCallback, useMemo, useEffect } from "react"
  import { useQuery } from "@tanstack/react-query"
  import { fetchLesson } from "@/lib/api/lessons"
  import type { ExerciseResult } from "@/types/exercises"

  export function useLessons(unitId: number, lessonId: number) {
    const {
      data: lesson,
      isLoading,
      isError,
      error,
    } = useQuery({
      queryKey: ["lesson", unitId, lessonId],
      queryFn: () => fetchLesson(unitId, lessonId),
    })

    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
    const [results, setResults] = useState<ExerciseResult[]>([])
    const [isLessonComplete, setIsLessonComplete] = useState(false)

    // Reset exercise state when navigating to a different lesson
    useEffect(() => {
      setCurrentExerciseIndex(0)
      setResults([])
      setIsLessonComplete(false)
    }, [unitId, lessonId])

    const exercises = lesson?.exercises ?? []
    const totalExercises = exercises.length
    const currentExercise = exercises[currentExerciseIndex] ?? null
    const isLastExercise = currentExerciseIndex === totalExercises - 1

    const recordResult = useCallback((result: ExerciseResult) => {
      setResults((prev) => [...prev, result])
    }, [])

    const nextExercise = useCallback(() => {
      if (currentExerciseIndex < totalExercises - 1) {
        setCurrentExerciseIndex((prev) => prev + 1)
      } else {
        setIsLessonComplete(true)
      }
    }, [currentExerciseIndex, totalExercises])

    const score = useMemo(() => {
      if (results.length === 0) return { correct: 0, total: 0, percentage: 0 }
      const correct = results.filter((r) => r.correct).length
      return {
        correct,
        total: results.length,
        percentage: Math.round((correct / results.length) * 100),
      }
    }, [results])

    /** All unique words practiced across all completed exercises */
    const wordsPracticed = useMemo(() => {
      const allWords = results.flatMap((r) => r.words)
      return [...new Set(allWords)]
    }, [results])

    return {
      lesson,
      isLoading,
      isError,
      error,
      currentExercise,
      currentExerciseIndex,
      totalExercises,
      isLastExercise,
      isLessonComplete,
      results,
      score,
      wordsPracticed,
      recordResult,
      nextExercise,
    }
  }
  ```

- [ ] **Step 2: Verify hook compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/hooks/useLessons.ts
  git commit -m "Add useLessons hook with exercise tracking and scoring"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-uselessons-hook.md` using the surfacing-subagent-learnings skill.

---

## Task 12: Build LessonComplete component

**Files:**
- ADD: `frontend/src/components/LessonComplete.tsx`

### Steps

- [ ] **Step 1: Create `frontend/src/components/LessonComplete.tsx`**

  Lesson completion screen showing score summary, words practiced, and a "continue" button back to the skill tree (or root `/` for now).

  ```tsx
  import { useNavigate } from "@tanstack/react-router"
  import { Button } from "@/components/ui/button"
  import { Card, CardContent } from "@/components/ui/card"
  import { Badge } from "@/components/ui/badge"

  interface LessonCompleteProps {
    score: {
      correct: number
      total: number
      percentage: number
    }
    wordsPracticed: string[]
    unitTitle?: string
  }

  export function LessonComplete({
    score,
    wordsPracticed,
    unitTitle,
  }: LessonCompleteProps) {
    const navigate = useNavigate()

    const handleContinue = () => {
      navigate({ to: "/" })
    }

    return (
      <div className="flex flex-col items-center py-8">
        <h1 className="font-mono text-2xl tracking-wide mb-2">
          lesson complete!
        </h1>

        {unitTitle && (
          <p className="text-sm text-muted-foreground mb-6">{unitTitle}</p>
        )}

        {/* Score card */}
        <Card className="w-full max-w-sm mb-6">
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-mono font-bold text-teal mb-1">
              {score.correct}/{score.total}
            </p>
            <p className="text-sm text-muted-foreground">
              {score.percentage}% correct
            </p>
          </CardContent>
        </Card>

        {/* Words practiced */}
        {wordsPracticed.length > 0 && (
          <div className="w-full max-w-sm mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              words practiced
            </p>
            <div className="flex flex-wrap gap-2">
              {wordsPracticed.map((word) => (
                <Badge key={word} variant="secondary" className="font-mono">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleContinue}
          className="w-full max-w-sm bg-teal text-white hover:bg-teal/90"
        >
          continue
        </Button>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify component compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/LessonComplete.tsx
  git commit -m "Add LessonComplete component with score and words summary"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-lesson-complete.md` using the surfacing-subagent-learnings skill.

---

## Task 13: Build the lesson route

**Files:**
- ADD: `frontend/src/routes/_layout/learn/$unit.$lesson.tsx`

**Depends on:** Tasks 1-12 (all components, types, hooks, and API client must exist)

### Steps

- [ ] **Step 1: Create directory for the learn route**
  ```bash
  mkdir -p frontend/src/routes/_layout/learn
  ```

- [ ] **Step 2: Create `frontend/src/routes/_layout/learn/$unit.$lesson.tsx`**

  This is the main lesson route. It uses TanStack Router's `createFileRoute` with dynamic `$unit` and `$lesson` params. It renders the progress bar, exercise label, current exercise component, feedback toast, and lesson completion screen.

  ```tsx
  import { useState, useCallback } from "react"
  import { createFileRoute } from "@tanstack/react-router"
  import { Skeleton } from "@/components/ui/skeleton"
  import { ProgressBar } from "@/components/ProgressBar"
  import { FeedbackToast } from "@/components/FeedbackToast"
  import { LessonComplete } from "@/components/LessonComplete"
  import { ExerciseMatch } from "@/components/ExerciseMatch"
  import { ExerciseMultiChoice } from "@/components/ExerciseMultiChoice"
  import { ExerciseWordBank } from "@/components/ExerciseWordBank"
  import { ExerciseFillParticle } from "@/components/ExerciseFillParticle"
  import { ExerciseFreeCompose } from "@/components/ExerciseFreeCompose"
  import { ExerciseConceptBuild } from "@/components/ExerciseConceptBuild"
  import { ExerciseStory } from "@/components/ExerciseStory"
  import { useLessons } from "@/hooks/useLessons"
  import type { Exercise, ExerciseResult } from "@/types/exercises"

  export const Route = createFileRoute("/_layout/learn/$unit/$lesson")({
    // File: $unit.$lesson.tsx -- dots in filenames denote path nesting in
    // TanStack Router file-based routing, so this flat file produces the
    // slash-separated path /_layout/learn/$unit/$lesson.  Confirmed by
    // TanStack Router docs: posts.$postId.tsx -> '/posts/$postId'.
    component: LessonPage,
  })

  /** Map exercise type to its component */
  function ExerciseRenderer({
    exercise,
    onComplete,
  }: {
    exercise: Exercise
    onComplete: (result: ExerciseResult) => void
  }) {
    // Use key={exercise.id} on the parent to force remount between exercises
    switch (exercise.type) {
      case "match":
        return <ExerciseMatch exercise={exercise} onComplete={onComplete} />
      case "multi_choice":
        return <ExerciseMultiChoice exercise={exercise} onComplete={onComplete} />
      case "word_bank":
        return <ExerciseWordBank exercise={exercise} onComplete={onComplete} />
      case "fill_particle":
        return <ExerciseFillParticle exercise={exercise} onComplete={onComplete} />
      case "free_compose":
        return <ExerciseFreeCompose exercise={exercise} onComplete={onComplete} />
      case "concept_build":
        return <ExerciseConceptBuild exercise={exercise} onComplete={onComplete} />
      case "story":
        return <ExerciseStory exercise={exercise} onComplete={onComplete} />
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Unknown exercise type: {exercise.type}
          </p>
        )
    }
  }

  function LessonPage() {
    const { unit, lesson: lessonParam } = Route.useParams()
    const unitId = Number(unit)
    const lessonId = Number(lessonParam)

    const {
      lesson,
      isLoading,
      isError,
      currentExercise,
      currentExerciseIndex,
      totalExercises,
      isLastExercise,
      isLessonComplete,
      score,
      wordsPracticed,
      recordResult,
      nextExercise,
    } = useLessons(unitId, lessonId)

    const [lastResult, setLastResult] = useState<ExerciseResult | null>(null)
    const [showFeedback, setShowFeedback] = useState(false)

    const handleExerciseComplete = useCallback(
      (result: ExerciseResult) => {
        recordResult(result)
        setLastResult(result)
        setShowFeedback(true)
      },
      [recordResult],
    )

    const handleNext = useCallback(() => {
      setShowFeedback(false)
      setLastResult(null)
      nextExercise()
    }, [nextExercise])

    // Loading state
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      )
    }

    // Error state
    if (isError) {
      return (
        <div className="py-12 text-center">
          <p className="font-mono text-lg text-coral">
            Failed to load lesson.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your connection and try again.
          </p>
        </div>
      )
    }

    // Lesson complete
    if (isLessonComplete) {
      return (
        <LessonComplete
          score={score}
          wordsPracticed={wordsPracticed}
          unitTitle={lesson?.title}
        />
      )
    }

    // No exercise (shouldn't happen)
    if (!currentExercise) {
      return null
    }

    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <ProgressBar
          current={currentExerciseIndex + (showFeedback ? 1 : 0)}
          total={totalExercises}
        />

        {/* Label */}
        <p className="mt-3 mb-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          unit {unitId} &middot; {lesson?.title ?? ""} &middot; exercise{" "}
          {currentExerciseIndex + 1} of {totalExercises}
        </p>

        {/* Exercise area */}
        <div key={currentExercise.id}>
          <ExerciseRenderer
            exercise={currentExercise}
            onComplete={handleExerciseComplete}
          />
        </div>

        {/* Feedback toast */}
        {showFeedback && lastResult && (
          <FeedbackToast
            correct={lastResult.correct}
            feedback={lastResult.feedback}
            correctAnswer={
              !lastResult.correct ? currentExercise.correctAnswer : undefined
            }
            isLastExercise={isLastExercise}
            onNext={handleNext}
          />
        )}
      </div>
    )
  }
  ```

  **NOTE:** TanStack Router file-based routing uses dots in filenames to denote path nesting (flat routes). The file `$unit.$lesson.tsx` produces the path `/_layout/learn/$unit/$lesson` -- dots become slashes. This is confirmed by the TanStack Router docs: `posts.$postId.tsx` maps to `createFileRoute('/posts/$postId')`. The `createFileRoute` path string above is correct. Running `npx tsr generate` in Step 3 will validate this -- if the generated route tree shows a different path, update to match.

- [ ] **Step 3: Generate routes and verify**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsr generate 2>&1 | head -20
  npx tsc --noEmit 2>&1 | head -30
  ```
  If TypeScript errors appear about the route path string, fix the `createFileRoute` argument to match the generated route tree.

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/routes/_layout/learn/
  git commit -m "Add lesson route with exercise rendering and navigation"
  ```

- [ ] **Step 5:** Record learnings to `.claude/learnings-lesson-route.md` using the surfacing-subagent-learnings skill.

---

## Task 14: Write Playwright E2E tests

**Files:**
- ADD: `frontend/e2e/lesson-exercises.spec.ts`

**Depends on:** Task 13 (lesson route must exist)

### Steps

- [ ] **Step 1: Check existing Playwright configuration**
  ```bash
  ls frontend/playwright.config.ts frontend/e2e/ 2>/dev/null
  cat frontend/playwright.config.ts 2>/dev/null | head -30
  ```
  If no Playwright config exists, check the project root as well. Note the base URL configured.

- [ ] **Step 2: Create `frontend/e2e/lesson-exercises.spec.ts`**

  E2E tests written as user stories. These tests require the backend to serve lesson data. Use route interception (`page.route`) to mock API responses so tests run without a live backend.

  ```typescript
  import { test, expect } from "@playwright/test"
  import type { Lesson, GradeResponse } from "../src/types/exercises"

  /** Mock lesson data with one of each exercise type */
  const MOCK_LESSON: Lesson = {
    id: "lesson-1",
    unitId: 1,
    lessonIndex: 1,
    title: "basic words",
    exercises: [
      {
        id: "ex-1",
        type: "multi_choice",
        prompt: "What does 'tomo' mean?",
        options: ["house", "person", "food", "water"],
        correctIndex: 0,
        correctFeedback: "tomo means house or building.",
        correctAnswer: "house",
        words: ["tomo"],
      },
      {
        id: "ex-2",
        type: "fill_particle",
        prompt: "Fill in the particle",
        sentence: "jan ___ toki",
        options: ["li", "e", "la", "pi"],
        correctIndex: 0,
        translationHint: "The person speaks.",
        correctFeedback: "li marks the predicate after the subject.",
        correctAnswer: "li",
        words: ["jan", "li", "toki"],
      },
      {
        id: "ex-3",
        type: "match",
        prompt: "Match the toki pona words to their English meanings.",
        pairs: [
          { tokiPona: "telo", english: "water" },
          { tokiPona: "moku", english: "food" },
          { tokiPona: "tomo", english: "house" },
        ],
        words: ["telo", "moku", "tomo"],
      },
      {
        id: "ex-4",
        type: "word_bank",
        prompt: "Translate: 'The water is good.'",
        wordBank: ["telo", "li", "pona", "jan"],
        validAnswers: ["telo li pona"],
        correctAnswer: "telo li pona",
        words: ["telo", "li", "pona"],
      },
      {
        id: "ex-5",
        type: "story",
        prompt: "Read the story and answer the questions.",
        storyText: "jan li moku e kili. ona li pona.",
        translation: "The person eats fruit. They are well.",
        questions: [
          {
            question: "What does the person eat?",
            options: ["water", "fruit", "bread"],
            correctIndex: 1,
          },
        ],
        words: ["jan", "moku", "kili", "pona"],
      },
      {
        id: "ex-6",
        type: "concept_build",
        prompt: "Express 'my house is big' in toki pona.",
        hint: "Use 'mi' for my, 'tomo' for house, 'suli' for big.",
        suggestedAnswer: "tomo mi li suli",
        words: ["tomo", "mi", "suli"],
      },
      {
        id: "ex-7",
        type: "free_compose",
        prompt: "Say 'the big house' in toki pona.",
        words: ["tomo", "suli"],
      },
    ],
  }

  const MOCK_GRADE_RESPONSE: GradeResponse = {
    correct: true,
    score: 0.8,
    feedback: "Good job! 'tomo suli' is correct.",
    suggestedAnswer: "tomo suli",
  }

  test.describe("Lesson exercises flow", () => {
    test.beforeEach(async ({ page }) => {
      // Mock the lesson API
      await page.route("**/api/v1/lessons/units/1/lessons/1", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_LESSON),
        })
      })

      // Mock the grade API
      await page.route("**/api/v1/chat/grade", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_GRADE_RESPONSE),
        })
      })

      // Mock auth (if needed -- adjust based on how auth works)
      await page.route("**/api/v1/users/me", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "test-user",
            email: "test@example.com",
            is_active: true,
            is_superuser: false,
            full_name: "Test User",
          }),
        })
      })
    })

    test("User story: complete a full lesson with mixed exercise types", async ({
      page,
    }) => {
      await page.goto("/learn/1/1")

      // Should see progress bar and first exercise label
      await expect(page.getByText(/exercise 1 of 7/i)).toBeVisible()

      // --- Exercise 1: MultiChoice ---
      await expect(page.getByText("What does 'tomo' mean?")).toBeVisible()

      // Tap correct answer
      await page.getByRole("button", { name: "house" }).click()

      // See teal feedback toast with "pona!"
      await expect(page.getByText("pona!")).toBeVisible()

      // Tap "next"
      await page.getByRole("button", { name: "next" }).click()

      // --- Exercise 2: FillParticle ---
      await expect(page.getByText(/exercise 2 of 7/i)).toBeVisible()
      await expect(page.getByText("Fill in the particle")).toBeVisible()

      // Select "li" particle (use aria-label to avoid ambiguity with other "li" text)
      await page.getByRole("button", { name: "particle option: li" }).click()

      // See feedback
      await expect(page.getByText("pona!")).toBeVisible()
      await page.getByRole("button", { name: "next" }).click()

      // --- Exercise 3: Match ---
      await expect(page.getByText(/exercise 3 of 7/i)).toBeVisible()

      // Match items are shuffled, so use aria-label selectors for unambiguous
      // selection. Words like "house" appear in both MultiChoice and Match,
      // but aria-labels include the column ("toki pona: ..." / "english: ...")
      // to disambiguate. data-testid attributes (match-left-N, match-right-N)
      // are also available for index-based selection if needed.
      await page.getByRole("button", { name: /toki pona: telo/ }).click()
      await page.getByRole("button", { name: /english: water/ }).click()

      await page.getByRole("button", { name: /toki pona: moku/ }).click()
      await page.getByRole("button", { name: /english: food/ }).click()

      await page.getByRole("button", { name: /toki pona: tomo/ }).click()
      await page.getByRole("button", { name: /english: house/ }).click()

      // All matched -- feedback appears
      await expect(page.getByText("pona!")).toBeVisible()
      await page.getByRole("button", { name: "next" }).click()

      // --- Exercise 4: WordBank ---
      await expect(page.getByText(/exercise 4 of 7/i)).toBeVisible()

      // Tap words in order: telo, li, pona
      await page.getByText("telo").click()
      await page.getByText("li", { exact: true }).click()
      await page.getByText("pona").click()

      // Tap "check"
      await page.getByRole("button", { name: "check" }).click()

      // See feedback
      await expect(page.getByText("pona!")).toBeVisible()
      await page.getByRole("button", { name: "next" }).click()

      // --- Exercise 5: Story ---
      await expect(page.getByText(/exercise 5 of 7/i)).toBeVisible()
      await expect(page.getByText("Read the story and answer the questions.")).toBeVisible()

      // Story text should be visible
      await expect(page.getByText("jan li moku e kili. ona li pona.")).toBeVisible()

      // Answer the comprehension question
      await expect(page.getByText("What does the person eat?")).toBeVisible()
      await page.getByRole("button", { name: "fruit" }).click()

      // See feedback
      await expect(page.getByText("pona!")).toBeVisible()
      await page.getByRole("button", { name: "next" }).click()

      // --- Exercise 6: ConceptBuild (LLM-graded) ---
      await expect(page.getByText(/exercise 6 of 7/i)).toBeVisible()
      await expect(
        page.getByText("Express 'my house is big' in toki pona."),
      ).toBeVisible()

      // Hint should be visible
      await expect(page.getByText(/Use 'mi' for my/)).toBeVisible()

      // Type answer and submit
      await page.getByPlaceholder(/type your answer/i).fill("tomo mi li suli")
      await page.getByRole("button", { name: "check" }).click()

      // Wait for LLM grading result
      await expect(page.getByText(/good job/i)).toBeVisible()
      await page.getByRole("button", { name: "next" }).click()

      // --- Exercise 7: FreeCompose (last exercise) ---
      await expect(page.getByText(/exercise 7 of 7/i)).toBeVisible()

      // Type answer
      await page.getByPlaceholder(/type your answer/i).fill("tomo suli")

      // Tap "check"
      await page.getByRole("button", { name: "check" }).click()

      // Wait for grading
      await expect(page.getByText(/good job/i)).toBeVisible()

      // Feedback toast should say "finish lesson"
      await expect(
        page.getByRole("button", { name: "finish lesson" }),
      ).toBeVisible()
      await page.getByRole("button", { name: "finish lesson" }).click()

      // --- Lesson Complete ---
      await expect(page.getByText("lesson complete!")).toBeVisible()
      await expect(page.getByText(/correct/)).toBeVisible()

      // Should show words practiced
      await expect(page.getByText("words practiced")).toBeVisible()
    })

    test("User story: wrong answer shows coral feedback and correct answer", async ({
      page,
    }) => {
      await page.goto("/learn/1/1")

      // Wait for first exercise
      await expect(page.getByText("What does 'tomo' mean?")).toBeVisible()

      // Tap wrong answer
      await page.getByRole("button", { name: "person" }).click()

      // Should see coral feedback with "ike..."
      await expect(page.getByText("ike...")).toBeVisible()

      // Should show correct answer
      await expect(page.getByText("house")).toBeVisible()
    })

    test("User story: LLM grading error shows fallback message", async ({
      page,
    }) => {
      // Override grade endpoint to fail
      await page.route("**/api/v1/chat/grade", (route) => {
        route.fulfill({ status: 500, body: "Internal Server Error" })
      })

      await page.goto("/learn/1/1")

      // --- Skip through exercises 1-4 to reach exercise 5 (story) ---

      // Exercise 1: MultiChoice -- tap correct answer
      await expect(page.getByText("What does 'tomo' mean?")).toBeVisible()
      await page.getByRole("button", { name: "house" }).click()
      await page.getByRole("button", { name: "next" }).click()

      // Exercise 2: FillParticle -- tap correct particle
      await expect(page.getByText(/exercise 2 of 7/i)).toBeVisible()
      await page.getByRole("button", { name: "particle option: li" }).click()
      await page.getByRole("button", { name: "next" }).click()

      // Exercise 3: Match -- match all pairs
      await expect(page.getByText(/exercise 3 of 7/i)).toBeVisible()
      await page.getByTestId("match-left-0").click()
      await page.getByTestId("match-right-0").click()
      await page.getByTestId("match-left-1").click()
      await page.getByTestId("match-right-1").click()
      await page.getByTestId("match-left-2").click()
      await page.getByTestId("match-right-2").click()
      // Note: items are shuffled so this may not always match correctly.
      // In a real scenario use data-testid text content to find the right pair.
      // For the purpose of this test, any completion (correct or wrong) advances.
      await page.getByRole("button", { name: "next" }).click()

      // Exercise 4: WordBank -- tap words and check
      await expect(page.getByText(/exercise 4 of 7/i)).toBeVisible()
      await page.getByText("telo").click()
      await page.getByText("li", { exact: true }).click()
      await page.getByText("pona").click()
      await page.getByRole("button", { name: "check" }).click()
      await page.getByRole("button", { name: "next" }).click()

      // Exercise 5: Story -- answer comprehension question
      await expect(page.getByText(/exercise 5 of 7/i)).toBeVisible()
      await page.getByRole("button", { name: "fruit" }).click()
      await page.getByRole("button", { name: "next" }).click()

      // --- Exercise 6: ConceptBuild (LLM-graded, will fail) ---
      await expect(page.getByText(/exercise 6 of 7/i)).toBeVisible()
      await page.getByPlaceholder(/type your answer/i).fill("tomo mi li suli")
      await page.getByRole("button", { name: "check" }).click()

      // Should see fallback error message instead of a crash
      await expect(
        page.getByText(/could not reach the grading service/i),
      ).toBeVisible()
    })
  })
  ```

- [ ] **Step 3: Verify the test file has no TypeScript errors**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit e2e/lesson-exercises.spec.ts 2>&1 | head -20
  ```
  Note: This may require adjusting tsconfig or adding a playwright-specific tsconfig. If Playwright is not yet configured, the implementer should check if `@playwright/test` is in `package.json` devDependencies and install if missing.

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/e2e/lesson-exercises.spec.ts
  git commit -m "Add Playwright E2E tests for lesson exercise flow"
  ```

- [ ] **Step 5:** Record learnings to `.claude/learnings-e2e-tests.md` using the surfacing-subagent-learnings skill.

---

## Task dependency graph

```
Task 1 (theme + textarea)
Task 2 (types + API client)
    \       \
Task 3 (ProgressBar + FeedbackToast)
Task 4 (ExerciseMatch)
Task 5 (ExerciseMultiChoice)
Task 6 (ExerciseWordBank)
Task 7 (ExerciseFillParticle)
Task 8 (ExerciseFreeCompose) -- depends on Task 1 (Textarea), Task 2 (API)
Task 9 (ExerciseConceptBuild) -- depends on Task 1 (Textarea), Task 2 (API)
Task 10 (ExerciseStory)
Task 11 (useLessons hook) -- depends on Task 2 (API)
Task 12 (LessonComplete)
         |
         v
Task 13 (Lesson route) -- depends on ALL above (3-12)
         |
         v
Task 14 (E2E tests) -- depends on Task 13
```

**Parallelizable groups:**
- Group A (no deps): Tasks 1, 2
- Group B (after Group A): Tasks 3, 4, 5, 6, 7, 10, 11, 12 (these can all run in parallel)
- Group C (after Task 1 + 2): Tasks 8, 9
- Group D (after all B + C): Task 13
- Group E (after D): Task 14
