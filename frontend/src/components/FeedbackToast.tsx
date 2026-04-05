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
        correct
          ? "bg-teal/15 border border-teal/30"
          : "bg-coral/15 border border-coral/30",
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
        type="button"
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
