import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"
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

  useEffect(() => {
    setCurrentExerciseIndex(0)
    setResults([])
    setIsLessonComplete(false)
  }, [])

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
