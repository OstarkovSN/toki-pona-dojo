import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { DictionarySkeleton } from "@/components/Common/DictionarySkeleton"
import { ErrorBanner } from "@/components/Common/ErrorBanner"
import { Input } from "@/components/ui/input"
import { WordCard, type WordData } from "@/components/WordCard"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_layout/dictionary/")({
  component: DictionaryPage,
  head: () => ({
    meta: [{ title: "Dictionary — toki pona dojo" }],
  }),
})

const POS_FILTERS = [
  "all",
  "noun",
  "verb",
  "adjective",
  "particle",
  "number",
  "pre-verb",
  "preposition",
] as const
const SET_FILTERS = ["all", "pu", "ku suli"] as const
const ALPHABET = "ABCDEFGHIJKLMNOPRSTUW".split("")

function DictionaryPage() {
  const [search, setSearch] = useState("")
  const [posFilter, setPosFilter] = useState<string>("all")
  const [setFilter, setSetFilter] = useState<string>("all")
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const {
    data: words = [],
    isLoading,
    error,
    refetch,
  } = useQuery<WordData[]>({
    queryKey: ["dictionary", "words"],
    queryFn: async () => {
      const res = await fetch("/api/v1/dictionary/words")
      if (!res.ok) throw new Error("Failed to fetch words")
      return res.json()
    },
  })

  const filtered = useMemo(() => {
    return words.filter((w) => {
      if (search) {
        const q = search.toLowerCase()
        const matchWord = w.word.toLowerCase().includes(q)
        const matchDef = w.definitions.some((d) =>
          d.definition.toLowerCase().includes(q),
        )
        if (!matchWord && !matchDef) return false
      }
      if (posFilter !== "all" && !w.pos.includes(posFilter)) return false
      if (setFilter === "pu" && w.ku) return false
      if (setFilter === "ku suli" && !w.ku) return false
      return true
    })
  }, [words, search, posFilter, setFilter])

  const grouped = useMemo(() => {
    const groups: Record<string, WordData[]> = {}
    for (const w of filtered) {
      const letter = w.word[0].toUpperCase()
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(w)
    }
    return groups
  }, [filtered])

  const scrollToLetter = (letter: string) => {
    sectionRefs.current[letter]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="font-tp text-2xl">nimi ale</h1>
        <p className="text-sm text-zen-text3">all words</p>
      </div>

      <div className="sticky top-14 md:top-16 z-10 -mx-4 md:mx-0 bg-background px-4 md:px-0 py-2 md:py-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zen-text3" />
          <Input
            placeholder="Search words or definitions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zen-bg2 border-zen-border text-base md:text-sm"
            data-testid="dictionary-search"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {POS_FILTERS.map((pos) => (
          <button
            type="button"
            key={pos}
            onClick={() => setPosFilter(pos)}
            aria-pressed={posFilter === pos}
            className={cn(
              "font-label rounded-full border px-3 py-1 transition-colors",
              posFilter === pos
                ? "border-zen-teal bg-zen-teal-bg text-zen-teal-dark"
                : "border-zen-border text-zen-text3 hover:border-zen-border2 hover:text-zen-text2",
            )}
            data-testid={`pos-filter-${pos}`}
          >
            {pos}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {SET_FILTERS.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setSetFilter(s)}
            aria-pressed={setFilter === s}
            className={cn(
              "font-label rounded-full border px-3 py-1 transition-colors",
              setFilter === s
                ? "border-zen-amber bg-zen-amber-bg text-zen-amber-dark"
                : "border-zen-border text-zen-text3 hover:border-zen-border2 hover:text-zen-text2",
            )}
            data-testid={`set-filter-${s}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {ALPHABET.map((letter) => (
          <button
            type="button"
            key={letter}
            onClick={() => scrollToLetter(letter)}
            className={cn(
              "font-label flex size-7 items-center justify-center rounded text-xs transition-colors",
              grouped[letter]
                ? "text-zen-text2 hover:bg-zen-bg2"
                : "text-zen-text3/40 cursor-default",
            )}
            disabled={!grouped[letter]}
          >
            {letter}
          </button>
        ))}
      </div>

      <p className="text-xs text-zen-text3">
        {filtered.length} of {words.length} words
      </p>

      {isLoading && <DictionarySkeleton />}

      {error && !isLoading && (
        <ErrorBanner type="api-unreachable" onRetry={() => refetch()} />
      )}

      {!isLoading &&
        !error &&
        Object.keys(grouped)
          .sort()
          .map((letter) => (
            <div
              key={letter}
              ref={(el) => {
                sectionRefs.current[letter] = el
              }}
            >
              <h2 className="font-tp mb-3 text-lg text-zen-text3">{letter}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                {grouped[letter].map((word) => (
                  <WordCard key={word.word} data={word} />
                ))}
              </div>
            </div>
          ))}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-12 text-center text-zen-text3">
          <p className="font-tp text-lg">ala</p>
          <p className="mt-1 text-sm">no words match your search</p>
        </div>
      )}
    </div>
  )
}
