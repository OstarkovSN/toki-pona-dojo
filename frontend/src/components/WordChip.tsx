import { Link } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface WordChipProps {
  word: string
  className?: string
  /** When provided, clicking selects the word instead of navigating to the dictionary. */
  onSelect?: (word: string) => void
}

export function WordChip({ word, className, onSelect }: WordChipProps) {
  return (
    <Link
      to="/dictionary/$word"
      params={{ word }}
      onClick={
        onSelect
          ? (e) => {
              e.preventDefault()
              onSelect(word)
            }
          : undefined
      }
    >
      <Badge
        variant="outline"
        data-testid={`word-chip-${word}`}
        className={cn(
          "font-tp cursor-pointer hover:border-zen-teal hover:text-zen-teal transition-colors",
          className,
        )}
      >
        {word}
      </Badge>
    </Link>
  )
}
