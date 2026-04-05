import { Link } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { POS_COLORS } from "@/lib/pos-colors"
import { cn } from "@/lib/utils"

export interface WordDefinition {
  pos: string
  definition: string
}

export interface WordData {
  word: string
  ku: boolean
  pos: string[]
  definitions: WordDefinition[]
  note: string | null
}

interface WordCardProps {
  data: WordData
}

export function WordCard({ data }: WordCardProps) {
  return (
    <Link
      to="/dictionary/$word"
      params={{ word: data.word }}
      className="block rounded-lg border border-zen-border bg-zen-bg p-4 transition-all hover:border-zen-border2 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-tp text-lg">{data.word}</h3>
        <div className="flex flex-wrap gap-1">
          {data.pos.map((p) => (
            <Badge
              key={p}
              variant="outline"
              className={cn(
                "border-0 text-[10px] font-label",
                POS_COLORS[p] || "bg-zen-bg3 text-zen-text2",
              )}
            >
              {p}
            </Badge>
          ))}
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {data.definitions.map((def, i) => (
          <p key={i} className="text-sm text-zen-text2">
            <span className="font-label text-[9px] text-zen-text3 mr-1.5">
              {def.pos}
            </span>
            {def.definition}
          </p>
        ))}
      </div>
      {data.note && (
        <p className="mt-2 text-xs text-zen-text3 italic">{data.note}</p>
      )}
      {data.ku && (
        <Badge
          variant="outline"
          className="mt-2 text-[9px] border-zen-border text-zen-text3"
        >
          ku suli
        </Badge>
      )}
    </Link>
  )
}
