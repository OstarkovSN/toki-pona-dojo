import { useNavigate } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface LessonCompleteProps {
  score: { correct: number; total: number; percentage: number }
  wordsPracticed: string[]
  unitTitle?: string
}

export function LessonComplete({
  score,
  wordsPracticed,
  unitTitle,
}: LessonCompleteProps) {
  const navigate = useNavigate()
  const handleContinue = () => {
    navigate({ to: "/" })
  }

  return (
    <div className="flex flex-col items-center py-8">
      <h1 className="font-mono text-2xl tracking-wide mb-2">
        lesson complete!
      </h1>
      {unitTitle && (
        <p className="text-sm text-muted-foreground mb-6">{unitTitle}</p>
      )}
      <Card className="w-full max-w-sm mb-6">
        <CardContent className="p-6 text-center">
          <p className="text-4xl font-mono font-bold text-teal mb-1">
            {score.correct}/{score.total}
          </p>
          <p className="text-sm text-muted-foreground">
            {score.percentage}% correct
          </p>
        </CardContent>
      </Card>
      {wordsPracticed.length > 0 && (
        <div className="w-full max-w-sm mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            words practiced
          </p>
          <div className="flex flex-wrap gap-2">
            {wordsPracticed.map((word) => (
              <Badge key={word} variant="secondary" className="font-mono">
                {word}
              </Badge>
            ))}
          </div>
        </div>
      )}
      <Button
        type="button"
        onClick={handleContinue}
        className="w-full max-w-sm bg-teal text-white hover:bg-teal/90"
      >
        continue
      </Button>
    </div>
  )
}
