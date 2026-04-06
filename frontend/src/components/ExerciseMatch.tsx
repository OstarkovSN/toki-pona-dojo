import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { ExerciseProps } from "@/types/exercises"

interface ItemState {
  text: string
  matched: boolean
}

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function ExerciseMatch({ exercise, onComplete }: ExerciseProps) {
  const pairs = exercise.pairs ?? []
  const total = pairs.length

  const [leftItems, setLeftItems] = useState<ItemState[]>(() =>
    shuffle(pairs.map((p) => ({ text: p.tokiPona, matched: false }))),
  )
  const [rightItems, setRightItems] = useState<ItemState[]>(() =>
    shuffle(pairs.map((p) => ({ text: p.english, matched: false }))),
  )
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [selectedRight, setSelectedRight] = useState<number | null>(null)
  const [flashWrong, setFlashWrong] = useState<{
    left: number
    right: number
  } | null>(null)
  const [firstTryCorrect, setFirstTryCorrect] = useState(0)
  const [matchedCount, setMatchedCount] = useState(0)
  const [attempts, setAttempts] = useState<Set<string>>(new Set())

  const tryMatch = useCallback(
    (leftIdx: number, rightIdx: number) => {
      const leftText = leftItems[leftIdx].text
      const rightText = rightItems[rightIdx].text
      const isCorrect = pairs.some(
        (p) => p.tokiPona === leftText && p.english === rightText,
      )
      const pairKey = `${leftText}:${rightText}`
      const isFirstAttemptForPair = !attempts.has(pairKey)
      setAttempts((prev) => new Set(prev).add(pairKey))

      if (isCorrect) {
        setLeftItems((prev) =>
          prev.map((item, i) =>
            i === leftIdx ? { ...item, matched: true } : item,
          ),
        )
        setRightItems((prev) =>
          prev.map((item, i) =>
            i === rightIdx ? { ...item, matched: true } : item,
          ),
        )
        const newFirstTry = isFirstAttemptForPair
          ? firstTryCorrect + 1
          : firstTryCorrect
        setFirstTryCorrect(newFirstTry)
        const newMatchedCount = matchedCount + 1
        setMatchedCount(newMatchedCount)
        setSelectedLeft(null)
        setSelectedRight(null)
        if (newMatchedCount === total) {
          onComplete({
            correct: newFirstTry === total,
            score: total > 0 ? newFirstTry / total : 1,
            feedback:
              newFirstTry === total
                ? "All matched on first try!"
                : `${newFirstTry}/${total} matched on first try.`,
            words: exercise.words,
          })
        }
      } else {
        setFlashWrong({ left: leftIdx, right: rightIdx })
        setTimeout(() => {
          setFlashWrong(null)
          setSelectedLeft(null)
          setSelectedRight(null)
        }, 500)
      }
    },
    [
      leftItems,
      rightItems,
      pairs,
      attempts,
      firstTryCorrect,
      matchedCount,
      total,
      exercise.words,
      onComplete,
    ],
  )

  useEffect(() => {
    if (selectedLeft !== null && selectedRight !== null) {
      tryMatch(selectedLeft, selectedRight)
    }
  }, [selectedLeft, selectedRight, tryMatch])

  const handleLeftClick = (idx: number) => {
    if (leftItems[idx].matched || flashWrong) return
    setSelectedLeft(idx)
  }
  const handleRightClick = (idx: number) => {
    if (rightItems[idx].matched || flashWrong) return
    setSelectedRight(idx)
  }

  return (
    <div>
      <p className="mb-4 font-serif text-lg">{exercise.prompt}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
        <div className="flex flex-col gap-2">
          {leftItems.map((item, i) => (
            <button
              key={`left-${i}`}
              type="button"
              data-testid={`match-left-${i}`}
              aria-label={`toki pona: ${item.text}`}
              disabled={item.matched}
              onClick={() => handleLeftClick(i)}
              className={cn(
                "min-h-[44px] rounded-md border px-4 py-3 text-left font-mono text-sm transition-colors",
                item.matched && "bg-teal/15 border-teal/30 text-teal",
                !item.matched &&
                  selectedLeft === i &&
                  "border-primary bg-primary/10",
                !item.matched &&
                  selectedLeft !== i &&
                  "border-border hover:border-primary/50",
                flashWrong?.left === i && "bg-coral/15 border-coral/30",
              )}
            >
              {item.text}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {rightItems.map((item, i) => (
            <button
              key={`right-${i}`}
              type="button"
              data-testid={`match-right-${i}`}
              aria-label={`english: ${item.text}`}
              disabled={item.matched}
              onClick={() => handleRightClick(i)}
              className={cn(
                "min-h-[44px] rounded-md border px-4 py-3 text-left text-sm transition-colors",
                item.matched && "bg-teal/15 border-teal/30 text-teal",
                !item.matched &&
                  selectedRight === i &&
                  "border-primary bg-primary/10",
                !item.matched &&
                  selectedRight !== i &&
                  "border-border hover:border-primary/50",
                flashWrong?.right === i && "bg-coral/15 border-coral/30",
              )}
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
