import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WordChip } from "@/components/WordChip"
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
      <div className="flex flex-wrap gap-2 mb-4">
        {bankWords.map((word, i) => (
          <WordChip
            key={`bank-${i}`}
            word={word}
            className="text-sm px-3 py-1.5 hover:bg-primary/10"
            onSelect={() => handleTapBank(word, i)}
          />
        ))}
      </div>
      {!checked && (
        <Button
          type="button"
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
