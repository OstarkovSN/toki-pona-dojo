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
              extraClasses =
                "bg-coral text-white border-coral hover:bg-coral/90"
            }
          }
          return (
            <Button
              key={i}
              type="button"
              variant={variant}
              className={cn(
                "w-full justify-start text-left py-4 h-auto min-h-12 md:min-h-10 text-base md:text-sm",
                extraClasses,
              )}
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
