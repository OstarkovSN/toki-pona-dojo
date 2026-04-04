# Phase 6: Frontend — Exercises

> Build the lesson view and all 7 exercise components. Wire exercises to the backend lessons API.

---

## Goal

Users can click a unit node, enter a lesson, and complete 5-7 exercises of varied types. Feedback is immediate. LLM-graded exercises call the backend grade endpoint.

## Prerequisites

- Phase 5 complete (layout, routing, skill tree)
- Phase 3 complete (grade endpoint for LLM-graded exercises)

## Lesson Flow

```
Skill Tree → Click unit → Lesson View (5-7 exercises) → Completion Screen → Back to Skill Tree
```

Each unit has 3-5 lessons. Each lesson has 5-7 exercises. Exercise types are determined by the unit level (see unit structure in Phase 2 spec).

## Steps

### 6.1 Lesson route — `_layout/learn/$unit.$lesson.tsx`

URL pattern: `/learn/4/2` = Unit 4, Lesson 2.

Fetches exercises from `GET /api/v1/lessons/units/{unit_id}/lessons/{lesson_id}`.

**Layout:**
1. **Progress bar** — thin bar at top, teal fill, no percentage text. Width = `(current exercise index / total) * 100%`.
2. **Label** — "unit 4 · particles · exercise 3 of 5" (DM Mono, 11px, uppercase, muted)
3. **Exercise area** — renders the current exercise component
4. **Feedback overlay** — slides up from bottom of exercise area on answer
5. **Next button** — appears after answering. "next" or "finish lesson" on last exercise.

**State management:**
- Current exercise index
- Answers given (for scoring at end)
- Exercise list from API

### 6.2 Exercise components

All exercise components share a common interface:

```typescript
interface ExerciseProps {
  exercise: Exercise;          // exercise data from API
  onComplete: (result: ExerciseResult) => void;  // called when user answers
}

interface ExerciseResult {
  correct: boolean;
  score: number;     // 0.0-1.0
  feedback?: string;
  words: string[];   // words involved (for SRS tracking)
}
```

#### 6.2.1 ExerciseMatch

- Two columns: toki pona words (left), English meanings (right)
- 4-6 pairs per exercise
- Tap one from each side to attempt a match
- **Correct:** both items get teal background, become disabled
- **Wrong:** both flash coral for 500ms, then reset
- Complete when all pairs matched
- `onComplete` called with score = (first-try correct / total pairs)

#### 6.2.2 ExerciseMultiChoice

- Prompt: toki pona sentence OR English sentence (varies)
- 4 options as full-width buttons (shadcn Button variant="outline")
- On tap: correct → teal bg, wrong → coral bg + correct answer highlighted in teal
- Feedback text appears below options (Lora, italic)
- Single attempt — score is 1.0 or 0.0

#### 6.2.3 ExerciseWordBank

- English sentence as prompt
- **Drop zone:** dashed border container, placeholder text "tap words to build a sentence"
- **Word bank:** row of tappable pills below (shadcn Badge, clickable)
- Tap pill → moves to drop zone (appended). Tap placed word → returns to bank.
- "check" button validates against correct answer(s)
- Multiple correct orderings accepted (the API returns a list of valid answers)
- Score: 1.0 if matches any valid answer, 0.0 otherwise
- On wrong: show one correct answer below

#### 6.2.4 ExerciseFillParticle

- Sentence with blank: "jan ___ toki" rendered with a highlighted gap
- 4 particle options: li, e, la, pi (as tappable pills)
- English translation hint below the sentence (muted text)
- Same correct/wrong behavior as multichoice
- Score: 1.0 or 0.0

#### 6.2.5 ExerciseFreeCompose (LLM-graded)

- Prompt: "Say 'the big house' in toki pona" (Lora)
- Textarea (shadcn Input/Textarea) for free input
- "check" button → calls `POST /api/v1/chat/grade` with exercise context
- Loading state while waiting for LLM response
- Shows LLM feedback: score (as stars or fraction), feedback text, suggested answer if provided
- Score from LLM response (0.0-1.0)

#### 6.2.6 ExerciseConceptBuild (LLM-graded)

- Prompt: concept in English (e.g., "library")
- Hint text (e.g., "think: a place for knowledge/books") — muted, italic
- Textarea for free input
- "check" button → LLM grades (same endpoint as FreeCompose)
- "show one approach" button reveals a suggested answer (from exercise data, not LLM)
- Score from LLM response

#### 6.2.7 ExerciseStory

- toki pona paragraph displayed in a card (DM Mono, larger text)
- 1-2 multiple choice comprehension questions below
- "reveal translation" button shows English translation (initially hidden)
- Score = proportion of questions answered correctly

### 6.3 FeedbackToast component

After each exercise answer:
- **Correct:** teal background, "pona!" with brief explanation
- **Wrong:** coral background, "ike..." with the correct answer and explanation
- Slides up from bottom of exercise area
- Contains the "next" button

### 6.4 Lesson completion screen

After the last exercise:
- Summary: "lesson complete!" (DM Mono, large)
- Score: X/Y correct
- Words practiced (list of toki pona words with their meanings)
- "continue" button → back to skill tree
- If all lessons in a unit complete → "unit complete!" celebration state

### 6.5 API client integration

Use TanStack Query to fetch lesson data:
```typescript
const { data: exercises } = useQuery({
  queryKey: ["lesson", unitId, lessonId],
  queryFn: () => fetchLesson(unitId, lessonId),
});
```

For LLM-graded exercises, use a mutation:
```typescript
const gradeMutation = useMutation({
  mutationFn: (req: GradeRequest) => gradeExercise(req),
});
```

### 6.6 Hook: useLessons

```typescript
function useLessons(unitId: number) {
  // Fetches unit data (lesson count, exercise types)
  // Tracks current lesson index
  // Returns: { lessons, currentLesson, nextLesson, isUnitComplete }
}
```

## Files touched

| Action | Path |
|--------|------|
| ADD | `frontend/src/routes/_layout/learn/$unit.$lesson.tsx` |
| ADD | `frontend/src/components/ExerciseMatch.tsx` |
| ADD | `frontend/src/components/ExerciseMultiChoice.tsx` |
| ADD | `frontend/src/components/ExerciseWordBank.tsx` |
| ADD | `frontend/src/components/ExerciseFillParticle.tsx` |
| ADD | `frontend/src/components/ExerciseFreeCompose.tsx` |
| ADD | `frontend/src/components/ExerciseConceptBuild.tsx` |
| ADD | `frontend/src/components/ExerciseStory.tsx` |
| ADD | `frontend/src/components/LessonCard.tsx` |
| ADD | `frontend/src/components/FeedbackToast.tsx` |
| ADD | `frontend/src/components/ProgressBar.tsx` |
| ADD | `frontend/src/hooks/useLessons.ts` |

## Risks

- LLM-graded exercises depend on the LLM being configured and reachable. If the LLM is down, FreeCompose and ConceptBuild should show an error state, not crash.
- TanStack Router's file-based routing uses `$` for dynamic segments. The route file must be named exactly `$unit.$lesson.tsx` for the URL pattern `/learn/:unit/:lesson` to work.
- Exercise data from the API must include enough metadata for each component to render (question text, options, correct answers). The backend lesson endpoint must shape the data appropriately per exercise type.

## Exit criteria

- All 7 exercise types render and respond to user input
- Correct/wrong feedback shows with appropriate colors
- LLM-graded exercises call the grade endpoint and display results
- Lesson progress bar advances through exercises
- Lesson completion screen shows score
- Navigation: skill tree → lesson → exercises → completion → skill tree
