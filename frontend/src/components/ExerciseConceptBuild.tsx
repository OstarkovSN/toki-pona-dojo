import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
        feedback:
          "Could not reach the grading service. Please try again later.",
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
      <span
        role="img"
        className="text-amber"
        aria-label={`Score: ${score.toFixed(1)}`}
      >
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
            type="button"
            onClick={handleCheck}
            disabled={!answer.trim()}
            className="flex-1"
          >
            check
          </Button>
        )}
        {!showApproach && exercise.suggestedAnswer && (
          <Button
            type="button"
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
