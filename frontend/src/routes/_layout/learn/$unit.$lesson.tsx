import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { ExerciseConceptBuild } from "@/components/ExerciseConceptBuild"
import { ExerciseFillParticle } from "@/components/ExerciseFillParticle"
import { ExerciseFreeCompose } from "@/components/ExerciseFreeCompose"
import { ExerciseMatch } from "@/components/ExerciseMatch"
import { ExerciseMultiChoice } from "@/components/ExerciseMultiChoice"
import { ExerciseStory } from "@/components/ExerciseStory"
import { ExerciseWordBank } from "@/components/ExerciseWordBank"
import { FeedbackToast } from "@/components/FeedbackToast"
import { LessonComplete } from "@/components/LessonComplete"
import { ProgressBar } from "@/components/ProgressBar"
import { Skeleton } from "@/components/ui/skeleton"
import { useLessons } from "@/hooks/useLessons"
import { useProgress } from "@/hooks/useProgress"
import type { Exercise, ExerciseResult } from "@/types/exercises"

export const Route = createFileRoute("/_layout/learn/$unit/$lesson")({
  component: LessonPage,
})

function ExerciseRenderer({
  exercise,
  onComplete,
}: {
  exercise: Exercise
  onComplete: (result: ExerciseResult) => void
}) {
  switch (exercise.type) {
    case "match":
      return <ExerciseMatch exercise={exercise} onComplete={onComplete} />
    case "multi_choice":
      return <ExerciseMultiChoice exercise={exercise} onComplete={onComplete} />
    case "word_bank":
      return <ExerciseWordBank exercise={exercise} onComplete={onComplete} />
    case "fill_particle":
      return (
        <ExerciseFillParticle exercise={exercise} onComplete={onComplete} />
      )
    case "free_compose":
      return <ExerciseFreeCompose exercise={exercise} onComplete={onComplete} />
    case "concept_build":
      return (
        <ExerciseConceptBuild exercise={exercise} onComplete={onComplete} />
      )
    case "story":
      return <ExerciseStory exercise={exercise} onComplete={onComplete} />
    default:
      return (
        <p className="text-sm text-muted-foreground">
          Unknown exercise type: {(exercise as Exercise).type}
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

  const { updateAfterExercise, updateAfterLesson } = useProgress()

  const [lastResult, setLastResult] = useState<ExerciseResult | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  // Call updateAfterLesson exactly once when the lesson transitions to complete
  const lessonCompleteFired = useRef(false)
  useEffect(() => {
    if (isLessonComplete && !lessonCompleteFired.current) {
      lessonCompleteFired.current = true
      updateAfterLesson(unitId, lessonId)
    }
  }, [isLessonComplete, unitId, lessonId, updateAfterLesson])

  const handleExerciseComplete = useCallback(
    (result: ExerciseResult) => {
      recordResult(result)
      setLastResult(result)
      setShowFeedback(true)
      // Adapt local ExerciseResult (correct: boolean) to progress format (correct: number)
      updateAfterExercise({
        score: result.score,
        words: result.words,
        correct: result.correct ? 1 : 0,
        total: 1,
      })
    },
    [recordResult, updateAfterExercise],
  )

  const handleNext = useCallback(() => {
    setShowFeedback(false)
    setLastResult(null)
    nextExercise()
  }, [nextExercise])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-12 text-center">
        <p className="font-mono text-lg text-coral">Failed to load lesson.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
      </div>
    )
  }

  if (isLessonComplete) {
    return (
      <LessonComplete
        score={score}
        wordsPracticed={wordsPracticed}
        unitTitle={lesson?.title}
      />
    )
  }

  if (!currentExercise) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto">
      <ProgressBar
        current={currentExerciseIndex + (showFeedback ? 1 : 0)}
        total={totalExercises}
      />
      <p className="mt-3 mb-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        unit {unitId} &middot; {lesson?.title ?? ""} &middot; exercise{" "}
        {currentExerciseIndex + 1} of {totalExercises}
      </p>
      <div key={currentExercise.id}>
        <ExerciseRenderer
          exercise={currentExercise}
          onComplete={handleExerciseComplete}
        />
      </div>
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
