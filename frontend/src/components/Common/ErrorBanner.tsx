import { AlertTriangle, RefreshCw, WifiOff, Clock, Key } from "lucide-react"
import { Button } from "@/components/ui/button"

type ErrorType =
  | "api-unreachable"
  | "llm-unavailable"
  | "grade-timeout"
  | "byom-failure"
  | "rate-limit"
  | "network-offline"

interface ErrorBannerProps {
  type: ErrorType
  onRetry?: () => void
  onNavigateToSettings?: () => void
  suggestedAnswer?: string
}

const ERROR_CONFIG: Record<
  ErrorType,
  { icon: React.ElementType; title: string; description: string }
> = {
  "api-unreachable": {
    icon: AlertTriangle,
    title: "Unable to connect to server",
    description: "Please check your connection and try again.",
  },
  "llm-unavailable": {
    icon: AlertTriangle,
    title: "jan sona is resting",
    description:
      "The language assistant is temporarily unavailable. Try again later.",
  },
  "grade-timeout": {
    icon: Clock,
    title: "Couldn't grade your answer",
    description:
      "The grading took too long. Check your answer manually against the suggested answer below.",
  },
  "byom-failure": {
    icon: Key,
    title: "Could not connect to your API provider",
    description: "Check your API key and endpoint in settings.",
  },
  "rate-limit": {
    icon: AlertTriangle,
    title: "Daily message limit reached",
    description:
      "You've used your daily messages. Sign up for unlimited access or add your own API key.",
  },
  "network-offline": {
    icon: WifiOff,
    title: "You're offline",
    description:
      "Some features are unavailable. Exercises with local grading still work.",
  },
}

export function ErrorBanner({
  type,
  onRetry,
  onNavigateToSettings,
  suggestedAnswer,
}: ErrorBannerProps) {
  const config = ERROR_CONFIG[type]
  const Icon = config.icon

  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-4"
      role="alert"
      data-testid={`error-banner-${type}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
        <div className="flex-1 space-y-2">
          <h3 className="font-medium text-destructive">{config.title}</h3>
          <p className="text-sm text-muted-foreground">{config.description}</p>

          {type === "grade-timeout" && suggestedAnswer && (
            <div className="mt-2 rounded-md bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Suggested answer:
              </p>
              <p className="text-sm">{suggestedAnswer}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            )}
            {type === "byom-failure" && onNavigateToSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToSettings}
              >
                Go to Settings
              </Button>
            )}
            {type === "rate-limit" && onNavigateToSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToSettings}
              >
                <Key className="h-3.5 w-3.5 mr-1.5" />
                Add API Key
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
