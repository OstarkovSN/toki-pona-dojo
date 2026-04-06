import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useSyncExternalStore } from "react"
import { ProgressService } from "@/client"
import {
  type ErrorEntry,
  ensureWordInSRS,
  getProgress,
  getSRS,
  getStreak,
  type ProgressData,
  recordActivity,
  updateProgress,
  updateWordSRS,
} from "@/lib/progress-store"
import { isLoggedIn } from "./useAuth"

// --- Types ---

export interface ExerciseResult {
  /** Score from 0.0 to 1.0 */
  score: number
  /** Words that appeared in this exercise */
  words: string[]
  /** Number of correct answers in the exercise */
  correct: number
  /** Total questions in the exercise */
  total: number
  /** Errors made during the exercise */
  errors?: Array<{ word: string; type: string; context: string }>
}

// --- localStorage subscription for React re-renders ---

let progressVersion = 0
const progressListeners = new Set<() => void>()

function subscribeProgress(callback: () => void): () => void {
  progressListeners.add(callback)
  return () => progressListeners.delete(callback)
}

function getProgressSnapshot(): number {
  return progressVersion
}

function notifyProgressChanged(): void {
  progressVersion++
  for (const cb of progressListeners) {
    cb()
  }
}

// --- Hook ---

export function useProgress() {
  const queryClient = useQueryClient()
  const authenticated = isLoggedIn()

  // Subscribe to localStorage changes for re-renders
  useSyncExternalStore(subscribeProgress, getProgressSnapshot)

  // Fetch server progress for authenticated users
  const { data: serverProgress, isLoading } = useQuery({
    queryKey: ["progress"],
    queryFn: () => ProgressService.getMyProgress(),
    enabled: authenticated,
  })

  // Mutation to update server progress
  const updateServerMutation = useMutation({
    mutationFn: (data: Partial<ProgressData>) =>
      ProgressService.updateMyProgress({
        requestBody: {
          completed_units: data.completedUnits,
          completed_lessons: data.completedLessons,
          current_unit: data.currentUnit,
          total_correct: data.totalCorrect,
          total_answered: data.totalAnswered,
          known_words: data.knownWords,
          recent_errors: data.recentErrors as
            | Array<Record<string, unknown>>
            | undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] })
    },
  })

  // Sync mutation for post-login merge
  const syncMutation = useMutation({
    mutationFn: () => {
      const progress = getProgress()
      const srs = getSRS()
      const streak = getStreak()
      return ProgressService.syncProgress({
        requestBody: {
          completed_units: progress.completedUnits,
          completed_lessons: progress.completedLessons,
          current_unit: progress.currentUnit,
          total_correct: progress.totalCorrect,
          total_answered: progress.totalAnswered,
          known_words: progress.knownWords,
          recent_errors: progress.recentErrors as unknown as Array<
            Record<string, unknown>
          >,
          srs_data: srs as Record<string, unknown>,
          streak_days: streak.currentStreak,
          last_activity: streak.lastActivityDate
            ? new Date(streak.lastActivityDate).toISOString()
            : null,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] })
    },
  })

  const progress = getProgress()
  const streak = getStreak()

  const updateAfterExercise = useCallback(
    (result: ExerciseResult) => {
      const current = getProgress()

      // Update totals
      const newTotalCorrect = current.totalCorrect + result.correct
      const newTotalAnswered = current.totalAnswered + result.total

      // Add new words to known list
      const knownSet = new Set(current.knownWords)
      for (const word of result.words) {
        knownSet.add(word)
      }
      const newKnownWords = [...knownSet].sort()

      // Update SRS for each word
      const errorWords = new Set((result.errors ?? []).map((e) => e.word))
      for (const word of result.words) {
        ensureWordInSRS(word)
        const quality = errorWords.has(word) ? 1 : 5
        updateWordSRS(word, quality)
      }

      // Append errors
      let newErrors = [...current.recentErrors]
      if (result.errors && result.errors.length > 0) {
        const now = new Date().toISOString()
        const errorEntries: ErrorEntry[] = result.errors.map((e) => ({
          word: e.word,
          type: e.type,
          context: e.context,
          timestamp: now,
        }))
        newErrors = [...errorEntries, ...newErrors].slice(0, 20)
      }

      // Record activity for streak
      recordActivity()

      const updated = updateProgress({
        totalCorrect: newTotalCorrect,
        totalAnswered: newTotalAnswered,
        knownWords: newKnownWords,
        recentErrors: newErrors,
      })

      notifyProgressChanged()

      // Sync to server if authenticated
      if (authenticated) {
        updateServerMutation.mutate({
          totalCorrect: updated.totalCorrect,
          totalAnswered: updated.totalAnswered,
          knownWords: updated.knownWords,
          recentErrors: updated.recentErrors,
        })
      }
    },
    [authenticated, updateServerMutation],
  )

  const updateAfterLesson = useCallback(
    (unitId: number, lessonId: number) => {
      const current = getProgress()

      // Add lesson to completed set
      const lessonKey = `${unitId}:${lessonId}`
      const lessonsSet = new Set(current.completedLessons)
      lessonsSet.add(lessonKey)
      const newCompletedLessons = [...lessonsSet].sort()

      // Placeholder: 3 lessons per unit
      const totalLessonsInUnit = 3
      const unitLessons = newCompletedLessons.filter((l) =>
        l.startsWith(`${unitId}:`),
      )
      const unitsSet = new Set(current.completedUnits)
      let newCurrentUnit = current.currentUnit

      if (unitLessons.length >= totalLessonsInUnit) {
        unitsSet.add(unitId)
        newCurrentUnit = Math.max(current.currentUnit, unitId + 1)
      }

      const updated = updateProgress({
        completedLessons: newCompletedLessons,
        completedUnits: [...unitsSet].sort(),
        currentUnit: newCurrentUnit,
      })

      notifyProgressChanged()

      // Sync to server if authenticated
      if (authenticated) {
        updateServerMutation.mutate({
          completedLessons: updated.completedLessons,
          completedUnits: updated.completedUnits,
          currentUnit: updated.currentUnit,
        })
      }
    },
    [authenticated, updateServerMutation],
  )

  return {
    progress,
    streak,
    serverProgress,
    updateAfterExercise,
    updateAfterLesson,
    syncToServer: syncMutation.mutate,
    isLoading,
    isSyncing: syncMutation.isPending,
  }
}
