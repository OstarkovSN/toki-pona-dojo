import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ExerciseProps } from "@/types/exercises"

export function ExerciseStory({ exercise, onComplete }: ExerciseProps) {
  const questions = exercise.questions ?? []
  const totalQuestions = questions.length
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    new Array(totalQuestions).fill(null),
  )
  const [showTranslation, setShowTranslation] = useState(false)
  const [completed, setCompleted] = useState(false)

  const handleAnswer = (questionIdx: number, optionIdx: number) => {
    if (answers[questionIdx] !== null) return
    const newAnswers = [...answers]
    newAnswers[questionIdx] = optionIdx
    setAnswers(newAnswers)
    const nowAnsweredCount = newAnswers.filter((a) => a !== null).length
    if (nowAnsweredCount === totalQuestions && !completed) {
      setCompleted(true)
      const correctCount = newAnswers.reduce<number>(
        (acc, ans, i) => acc + (ans === questions[i].correctIndex ? 1 : 0),
        0,
      )
      const score = totalQuestions > 0 ? correctCount / totalQuestions : 1
      onComplete({
        correct: correctCount === totalQuestions,
        score,
        feedback: `${correctCount}/${totalQuestions} questions correct.`,
        words: exercise.words,
      })
    }
  }

  return (
    <div>
      <p className="mb-4 font-serif text-lg">{exercise.prompt}</p>
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="font-mono text-base leading-relaxed whitespace-pre-line">
            {exercise.storyText}
          </p>
        </CardContent>
      </Card>
      {exercise.translation && (
        <div className="mb-4">
          {!showTranslation ? (
            <Button
              type="button"
              variant="ghost"
              className="text-sm text-muted-foreground"
              onClick={() => setShowTranslation(true)}
            >
              reveal translation
            </Button>
          ) : (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {exercise.translation}
              </p>
            </div>
          )}
        </div>
      )}
      <div className="space-y-6">
        {questions.map((q, qIdx) => {
          const userAnswer = answers[qIdx]
          const isAnswered = userAnswer !== null
          return (
            <div key={qIdx}>
              <p className="mb-2 text-sm font-medium">{q.question}</p>
              <div className="flex flex-col gap-2">
                {q.options.map((option, oIdx) => {
                  const isSelected = userAnswer === oIdx
                  const isCorrectOption = oIdx === q.correctIndex
                  return (
                    <button
                      key={oIdx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleAnswer(qIdx, oIdx)}
                      className={cn(
                        "rounded-md border px-4 py-2.5 text-left text-sm transition-colors",
                        !isAnswered && "border-border hover:border-primary/50",
                        isAnswered &&
                          isCorrectOption &&
                          "bg-teal/15 border-teal/30 text-teal",
                        isAnswered &&
                          isSelected &&
                          !isCorrectOption &&
                          "bg-coral/15 border-coral/30 text-coral",
                        isAnswered &&
                          !isSelected &&
                          !isCorrectOption &&
                          "opacity-40",
                      )}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
