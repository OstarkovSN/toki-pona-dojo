import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"
import { type ChainWord, GrammarChain } from "@/components/GrammarChain"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_layout/grammar/modifiers")({
  component: GrammarModifiersPage,
  head: () => ({
    meta: [{ title: "Modifiers — toki pona dojo" }],
  }),
})

interface GrammarSection {
  id: string
  number: string
  title: string
  content: string
  chains?: { words: ChainWord[]; meaning: string }[]
  callouts?: { type: "rule" | "warning"; text: string }[]
}

interface GrammarComparison {
  title: string
  rows: { left: string; right: string; note?: string }[]
}

interface QuizQuestion {
  question: string
  options: string[]
  correct: number
}

interface GrammarData {
  sections: GrammarSection[]
  comparisons: GrammarComparison[]
  quiz: QuizQuestion[]
}

const FALLBACK_SECTIONS: GrammarSection[] = [
  {
    id: "core-rule",
    number: "01",
    title: "The core rule",
    content:
      "In toki pona, modifiers always come AFTER the word they describe. The first word is the head — it carries the core meaning. Everything after it narrows or describes it.",
    chains: [
      {
        words: [
          { word: "tomo", role: "head", gloss: "building" },
          { word: "telo", role: "modifier", gloss: "water" },
        ],
        meaning: "bathroom / water-building",
      },
      {
        words: [
          { word: "jan", role: "head", gloss: "person" },
          { word: "pona", role: "modifier", gloss: "good" },
        ],
        meaning: "good person",
      },
    ],
    callouts: [
      {
        type: "rule",
        text: "Head word always comes first. Modifiers follow and narrow the meaning.",
      },
    ],
  },
  {
    id: "stacking",
    number: "02",
    title: "Stacking modifiers",
    content:
      "You can stack multiple modifiers. Each one further narrows the meaning, reading left to right.",
    chains: [
      {
        words: [
          { word: "tomo", role: "head", gloss: "building" },
          { word: "telo", role: "modifier", gloss: "water" },
          { word: "suli", role: "modifier", gloss: "big" },
        ],
        meaning: "big bathroom",
      },
      {
        words: [
          { word: "jan", role: "head", gloss: "person" },
          { word: "pona", role: "modifier", gloss: "good" },
          { word: "mute", role: "modifier", gloss: "many" },
        ],
        meaning: "many good people",
      },
    ],
  },
  {
    id: "pi",
    number: "03",
    title: "Regrouping with pi",
    content:
      "Without pi, each modifier applies to the head individually. The particle pi creates a sub-group: everything after pi forms a modifier phrase that applies as a unit.",
    chains: [
      {
        words: [
          { word: "tomo", role: "head", gloss: "building" },
          { word: "pi", role: "particle" },
          { word: "telo", role: "pi-group", gloss: "water" },
          { word: "suli", role: "pi-group", gloss: "big" },
        ],
        meaning: "building of big-water (like a reservoir building)",
      },
    ],
    callouts: [
      {
        type: "rule",
        text: "pi regroups: without pi, each word modifies the head separately. With pi, the words after pi form a compound modifier.",
      },
      {
        type: "warning",
        text: "Never use pi with a single word after it — pi always needs at least two words to form a group.",
      },
    ],
  },
  {
    id: "comparison",
    number: "04",
    title: "With vs without pi",
    content:
      "The difference is in what modifies what. Compare these pairs carefully.",
    chains: [
      {
        words: [
          { word: "jan", role: "head" },
          { word: "sona", role: "modifier" },
          { word: "mute", role: "modifier" },
        ],
        meaning: "many knowledgeable people (mute modifies jan)",
      },
      {
        words: [
          { word: "jan", role: "head" },
          { word: "pi", role: "particle" },
          { word: "sona", role: "pi-group" },
          { word: "mute", role: "pi-group" },
        ],
        meaning: "person of much knowledge (mute modifies sona)",
      },
    ],
  },
]

const FALLBACK_COMPARISONS: GrammarComparison[] = [
  {
    title: "mute vs suli — placement matters",
    rows: [
      {
        left: "jan pona mute",
        right: "many good people",
        note: "mute modifies jan",
      },
      {
        left: "jan pi pona mute",
        right: "person of great goodness",
        note: "mute modifies pona",
      },
      {
        left: "tomo telo suli",
        right: "big bathroom",
        note: "suli modifies tomo",
      },
      {
        left: "tomo pi telo suli",
        right: "building of big water",
        note: "suli modifies telo",
      },
    ],
  },
]

const FALLBACK_QUIZ: QuizQuestion[] = [
  {
    question: "What does 'tomo telo suli' mean?",
    options: [
      "big bathroom",
      "building of big water",
      "big water building",
      "water of big building",
    ],
    correct: 0,
  },
  {
    question: "What does 'tomo pi telo suli' mean?",
    options: [
      "big bathroom",
      "building of big water",
      "big water building",
      "water of big building",
    ],
    correct: 1,
  },
  {
    question: "Which is correct for 'person of much knowledge'?",
    options: [
      "jan sona mute",
      "jan pi sona mute",
      "jan mute sona",
      "jan pi mute sona",
    ],
    correct: 1,
  },
]

function CalloutBox({
  type,
  text,
}: {
  type: "rule" | "warning"
  text: string
}) {
  return (
    <div
      className={cn(
        "my-3 rounded-lg border-l-4 bg-zen-bg2 p-4 text-sm",
        type === "rule" ? "border-l-zen-teal" : "border-l-zen-coral",
      )}
    >
      <span
        className={cn(
          "font-label mr-2",
          type === "rule" ? "text-zen-teal" : "text-zen-coral",
        )}
      >
        {type === "rule" ? "rule" : "warning"}
      </span>
      <span className="text-zen-text2">{text}</span>
    </div>
  )
}

function QuizSection({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number | null>>({})

  const handleAnswer = (qIndex: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }))
  }

  return (
    <div className="space-y-6">
      <h2 className="font-tp text-xl">quiz</h2>
      {questions.map((q, qi) => {
        const answered = answers[qi] !== undefined && answers[qi] !== null
        const correct = answered && answers[qi] === q.correct
        return (
          <div
            key={qi}
            className="rounded-lg border border-zen-border bg-zen-bg p-4"
          >
            <p className="mb-3 font-tp">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <button
                  type="button"
                  key={oi}
                  onClick={() => !answered && handleAnswer(qi, oi)}
                  disabled={answered}
                  className={cn(
                    "w-full rounded-md border px-4 py-2 text-left text-sm transition-colors",
                    !answered &&
                      "border-zen-border hover:border-zen-border2 hover:bg-zen-bg2",
                    answered &&
                      oi === q.correct &&
                      "border-zen-teal bg-zen-teal-bg text-zen-teal-dark",
                    answered &&
                      oi === answers[qi] &&
                      oi !== q.correct &&
                      "border-zen-coral bg-zen-coral-bg text-zen-coral-dark",
                    answered &&
                      oi !== q.correct &&
                      oi !== answers[qi] &&
                      "border-zen-border opacity-50",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
            {answered && (
              <p
                className={cn(
                  "mt-2 text-sm",
                  correct ? "text-zen-teal" : "text-zen-coral",
                )}
              >
                {correct
                  ? "pona! correct!"
                  : `not quite -- the answer is: ${q.options[q.correct]}`}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function GrammarModifiersPage() {
  const { data, isLoading } = useQuery<GrammarData>({
    queryKey: ["grammar"],
    queryFn: async () => {
      const res = await fetch("/api/v1/dictionary/grammar")
      if (!res.ok) throw new Error("Failed to fetch grammar data")
      return res.json()
    },
    retry: false,
  })

  const sections = data?.sections ?? FALLBACK_SECTIONS
  const comparisons = data?.comparisons ?? FALLBACK_COMPARISONS
  const quiz = data?.quiz ?? FALLBACK_QUIZ

  return (
    <div className="flex flex-col gap-8 py-6">
      <Link
        to="/grammar"
        className="inline-flex items-center gap-1 text-sm text-zen-text3 hover:text-zen-text2 transition-colors"
      >
        <ArrowLeft className="size-3" /> grammar
      </Link>

      <div>
        <h1 className="font-tp text-2xl">nasin nimi</h1>
        <p className="text-sm text-zen-text3">modifier rules</p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      )}

      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="font-tp text-xl">
            <span className="text-zen-text3 mr-2">{section.number}</span>
            {section.title}
          </h2>
          <p className="text-zen-text2 leading-relaxed">{section.content}</p>
          {section.chains?.map((chain, i) => (
            <GrammarChain key={i} words={chain.words} meaning={chain.meaning} />
          ))}
          {section.callouts?.map((callout, i) => (
            <CalloutBox key={i} type={callout.type} text={callout.text} />
          ))}
        </section>
      ))}

      {comparisons.map((comp, ci) => (
        <section key={ci} className="space-y-3">
          <h2 className="font-tp text-xl">{comp.title}</h2>
          <div className="rounded-lg border border-zen-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zen-bg2">
                  <th className="font-label px-4 py-2 text-left text-zen-text3">
                    toki pona
                  </th>
                  <th className="font-label px-4 py-2 text-left text-zen-text3">
                    english
                  </th>
                  <th className="font-label px-4 py-2 text-left text-zen-text3">
                    note
                  </th>
                </tr>
              </thead>
              <tbody>
                {comp.rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-zen-border">
                    <td className="font-tp px-4 py-2">{row.left}</td>
                    <td className="px-4 py-2 text-zen-text2">{row.right}</td>
                    <td className="px-4 py-2 text-xs text-zen-text3">
                      {row.note || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <QuizSection questions={quiz} />
    </div>
  )
}
