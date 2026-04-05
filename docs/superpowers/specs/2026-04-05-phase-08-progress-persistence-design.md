# Phase 8: Progress & Persistence

> Implement localStorage progress for anonymous users, server-synced progress for authenticated users, SRS algorithm, and streak tracking.

---

## Goal

All users (anonymous and authenticated) have persistent learning progress. Anonymous progress lives in localStorage. Authenticated progress syncs to the server. Signing up after playing anonymously merges the two.

## Prerequisites

- Phase 2 complete (UserProgress model exists in DB)
- Phase 6 complete (exercises report results via `onComplete`)

## Architecture

```
Anonymous user:
  Exercise result → useProgress hook → localStorage
  SRS scheduling → useSRS hook → localStorage
  
Authenticated user:
  Exercise result → useProgress hook → localStorage (write-ahead) → POST /api/v1/progress/me
  SRS scheduling → useSRS hook → localStorage → synced to server
  
Sign-up merge:
  localStorage progress → POST /api/v1/progress/sync → server takes max(local, server) per field
```

## Steps

### 8.1 Progress store — `frontend/src/lib/progress-store.ts`

localStorage wrapper with typed access:

```typescript
interface ProgressData {
  completedUnits: number[];
  completedLessons: string[];  // "unit:lesson" format
  currentUnit: number;
  totalCorrect: number;
  totalAnswered: number;
  knownWords: string[];
  recentErrors: Array<{ word: string; type: string; context: string; timestamp: string }>;
}

interface SRSData {
  [word: string]: {
    interval: number;
    ease: number;
    due: string;  // ISO date
    reps: number;
  };
}

interface StreakData {
  currentStreak: number;
  lastActivityDate: string;  // ISO date
}
```

localStorage keys: `tp-progress`, `tp-srs`, `tp-streak`

Functions:
- `getProgress(): ProgressData`
- `updateProgress(update: Partial<ProgressData>): void`
- `getSRS(): SRSData`
- `updateWordSRS(word: string, quality: number): void`
- `getStreak(): StreakData`
- `recordActivity(): void` — updates streak (increments if last activity was yesterday, resets if gap > 1 day)

### 8.2 SRS algorithm — `frontend/src/lib/srs.ts`

Client-side SM-2 implementation:

```typescript
function sm2(quality: number, reps: number, ease: number, interval: number): {
  reps: number;
  ease: number;
  interval: number;
}
```

Quality mapping from exercise results:
- `score >= 0.9` → quality 5 (perfect)
- `score >= 0.7` → quality 4 (easy)
- `score >= 0.5` → quality 3 (ok)
- `score >= 0.3` → quality 2 (hard)
- `score > 0` → quality 1 (wrong but close)
- `score == 0` → quality 0 (wrong)

### 8.3 useProgress hook — `frontend/src/hooks/useProgress.ts`

```typescript
function useProgress() {
  // Reads from localStorage
  // If authenticated, also syncs to server via TanStack Query
  // Returns: { progress, updateAfterExercise, updateAfterLesson, isLoading }
}
```

`updateAfterExercise(result: ExerciseResult)`:
- Updates `totalCorrect`, `totalAnswered`
- Adds new words to `knownWords`
- Updates SRS for each word in the exercise
- Appends to `recentErrors` if wrong (capped at 20 entries)
- Calls `recordActivity()` for streak

`updateAfterLesson(unitId: number, lessonId: number)`:
- Adds `"unitId:lessonId"` to `completedLessons`
- If all lessons in unit complete → adds to `completedUnits`, advances `currentUnit`

### 8.4 useSRS hook — `frontend/src/hooks/useSRS.ts`

```typescript
function useSRS() {
  // Returns words due for review
  // Returns: { dueWords, reviewWord(word, quality), stats }
}
```

`dueWords`: words where `srs.due <= today`. Sorted by overdue-ness.
`reviewWord(word, quality)`: runs SM-2, updates localStorage.
`stats`: total words in SRS, due today, average ease.

### 8.5 Backend progress endpoints — `backend/app/api/routes/progress.py`

**`GET /api/v1/progress/me`** — returns the authenticated user's `UserProgress` record. Creates one if it doesn't exist (with defaults).

**`PUT /api/v1/progress/me`** — updates progress fields. Accepts partial updates. Updates `updated_at` timestamp.

**`POST /api/v1/progress/sync`** — merge endpoint for sign-up flow:
- Receives localStorage progress data
- For each field, takes the higher/more-complete value:
  - `completedUnits`: union of both sets
  - `completedLessons`: union
  - `currentUnit`: max
  - `totalCorrect` / `totalAnswered`: max
  - `knownWords`: union
  - `srs_data`: for each word, keep the entry with more reps
  - `streak_days`: max
- Returns the merged result

### 8.6 Wire exercises to progress

In the lesson view (`$unit.$lesson.tsx`), after each exercise `onComplete`:
```typescript
const { updateAfterExercise } = useProgress();
// ... in onComplete handler:
updateAfterExercise(result);
```

After lesson completion:
```typescript
const { updateAfterLesson } = useProgress();
updateAfterLesson(unitId, lessonId);
```

### 8.7 Wire skill tree to progress

In the skill tree (`index.tsx`), read progress to determine unit states:
- Unit is `completed` if in `completedUnits`
- Unit is `available` if all prerequisites are in `completedUnits`
- Unit is `current` if it's `available` and equals `currentUnit`
- Otherwise `locked`

### 8.8 Stats display

On the home page stats row:
- Words known: `progress.knownWords.length`
- Lessons done: `progress.completedLessons.length`
- Day streak: `streak.currentStreak`

## Files touched

| Action | Path |
|--------|------|
| ADD | `frontend/src/lib/progress-store.ts` |
| ADD | `frontend/src/lib/srs.ts` |
| ADD | `frontend/src/hooks/useProgress.ts` |
| ADD | `frontend/src/hooks/useSRS.ts` |
| ADD | `backend/app/api/routes/progress.py` |
| ADD | `backend/app/tests/api/test_progress.py` |
| ADD | `backend/app/tests/services/test_srs.py` |
| MODIFY | `backend/app/api/main.py` (register progress router) |
| MODIFY | `frontend/src/routes/_layout/learn/$unit.$lesson.tsx` (wire progress) |
| MODIFY | `frontend/src/routes/_layout/index.tsx` (wire skill tree states + stats) |

## Risks

- localStorage has a ~5MB limit. SRS data for 137 words with history is well within this, but `recentErrors` must be capped.
- The merge algorithm in `/sync` must be idempotent — calling it twice with the same data should produce the same result.
- Streak calculation edge case: timezone. The client sends dates in local time. The server should store UTC. The `recordActivity()` function should use the user's local date for streak comparison.

## Exit criteria

- Exercise results update progress in localStorage
- Skill tree reflects completion state
- Stats row shows correct numbers
- SRS tracks word review intervals
- Streak increments on consecutive days
- Authenticated users: progress syncs to server
- Sign-up merge: localStorage progress merges into server record
- Backend progress tests pass
