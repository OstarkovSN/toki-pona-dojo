import { Loader2 } from "lucide-react"

export function GradingSpinner() {
  return (
    <div
      className="flex items-center justify-center gap-2 py-4"
      data-testid="grading-spinner"
      role="status"
      aria-label="Grading your answer"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">
        Grading your answer...
      </span>
    </div>
  )
}
