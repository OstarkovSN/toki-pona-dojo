import { useState } from "react"
import { cn } from "@/lib/utils"
import type { ExerciseProps } from "@/types/exercises"

export function ExerciseFillParticle({ exercise, onComplete }: ExerciseProps) {
  const options = exercise.options ?? []
  const correctIdx = exercise.correctIndex ?? 0
  const sentence = exercise.sentence ?? exercise.prompt
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const answered = selectedIdx !== null
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
      {exercise.translationHint && (
        <p className="mb-4 text-sm text-muted-foreground italic">
          {exercise.translationHint}
        </p>
      )}
      <div className="flex flex-wrap gap-3 mt-4">
        {options.map((option, i) => {
          const isSelected = selectedIdx === i
          const isCorrectOption = i === correctIdx
          return (
            <button
              key={i}
              type="button"
              aria-label={`particle option: ${option}`}
              disabled={answered}
              className={cn(
                "min-h-[44px] rounded-full border text-base px-5 py-2 transition-colors",
                !answered && "hover:bg-primary/10 border-border",
                answered &&
                  isCorrectOption &&
                  "bg-teal/15 border-teal text-teal",
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
