import { Link } from "@tanstack/react-router"
import { Check, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

export type UnitStatus = "locked" | "available" | "current" | "completed"

export interface UnitNodeProps {
  unitNumber: number
  name: string
  topic: string
  status: UnitStatus
  prerequisites?: number[]
}

export function UnitNode({
  unitNumber,
  name,
  topic,
  status,
  prerequisites,
}: UnitNodeProps) {
  const isClickable = status === "available" || status === "current"

  const nodeContent = (
    <div
      className={cn(
        "group relative flex w-full md:w-56 flex-col items-center rounded-xl border-2 px-4 py-5 text-center transition-all duration-200",
        status === "locked" &&
          "border-zen-border bg-zen-bg2 opacity-60 cursor-not-allowed",
        status === "available" &&
          "border-zen-teal bg-zen-bg hover:bg-zen-teal-bg cursor-pointer hover:shadow-md",
        status === "current" &&
          "border-zen-teal bg-zen-teal-bg cursor-pointer shadow-md",
        status === "completed" &&
          "border-zen-teal bg-zen-teal-bg/50 cursor-default",
      )}
      title={
        status === "locked" && prerequisites?.length
          ? `Requires unit${prerequisites.length > 1 ? "s" : ""} ${prerequisites.join(" & ")}`
          : undefined
      }
    >
      {/* Status indicator */}
      <div
        className={cn(
          "mb-2 flex size-8 items-center justify-center rounded-full text-sm font-bold",
          status === "locked" && "bg-zen-bg3 text-zen-text3",
          status === "available" && "bg-zen-teal/10 text-zen-teal",
          status === "current" && "bg-zen-teal text-white",
          status === "completed" && "bg-zen-teal text-white",
        )}
      >
        {status === "completed" ? (
          <Check className="size-4" />
        ) : status === "locked" ? (
          <Lock className="size-3" />
        ) : (
          unitNumber
        )}
      </div>

      {/* Current indicator dot */}
      {status === "current" && (
        <span
          className="absolute -top-1 -right-1 flex size-3"
          data-testid="unit-current"
        >
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-zen-teal opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-zen-teal" />
        </span>
      )}

      <p className="font-tp text-base">{name}</p>
      <p className="mt-0.5 text-xs text-zen-text3">{topic}</p>
    </div>
  )

  if (isClickable) {
    return (
      <Link
        to="/learn/$unit/$lesson"
        params={{ unit: String(unitNumber), lesson: "1" }}
      >
        {nodeContent}
      </Link>
    )
  }

  return nodeContent
}
