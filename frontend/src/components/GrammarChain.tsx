import { cn } from "@/lib/utils"

type WordRole = "head" | "modifier" | "particle" | "pi-group" | "predicate"

export interface ChainWord {
  word: string
  role: WordRole
  gloss?: string
}

export interface GrammarChainProps {
  words: ChainWord[]
  meaning: string
}

const ROLE_COLORS: Record<WordRole, string> = {
  head: "bg-zen-teal-bg text-zen-teal-dark border-zen-teal/30",
  modifier: "bg-zen-amber-bg text-zen-amber-dark border-zen-amber/30",
  particle: "bg-zen-coral-bg text-zen-coral-dark border-zen-coral/30",
  "pi-group": "bg-zen-blue-bg text-zen-blue-dark border-blue-500/30",
  predicate: "bg-zen-bg3 text-zen-text2 border-zen-border2",
}

const ROLE_LABELS: Record<WordRole, string> = {
  head: "head",
  modifier: "mod",
  particle: "particle",
  "pi-group": "pi-group",
  predicate: "predicate",
}

export function GrammarChain({ words, meaning }: GrammarChainProps) {
  return (
    <div className="my-4 rounded-lg border border-zen-border bg-zen-bg2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {words.map((w, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-3 py-1 font-tp text-sm",
                ROLE_COLORS[w.role],
              )}
            >
              {w.word}
            </span>
            <span className="text-[9px] font-label text-zen-text3">
              {w.gloss || ROLE_LABELS[w.role]}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-zen-text2 italic">
        = {meaning}
      </p>
    </div>
  )
}
