import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

export const Route = createFileRoute("/_layout/grammar/particles")({
  component: GrammarParticlesPage,
  head: () => ({
    meta: [{ title: "Particles — toki pona dojo" }],
  }),
})

interface ParticleExample {
  tp: string
  en: string
}

interface ParticleSection {
  particle: string
  name: string
  rule: string
  examples: ParticleExample[]
  mistakes?: string[]
}

const PARTICLES: ParticleSection[] = [
  {
    particle: "li",
    name: "predicate marker",
    rule: "li separates the subject from the predicate. It is required unless the subject is 'mi' or 'sina' alone (no modifiers).",
    examples: [
      { tp: "ona li pona", en: "they are good" },
      { tp: "jan Ali li moku", en: "Ali eats" },
      { tp: "mi pona", en: "I am good (no li needed)" },
      { tp: "sina moku", en: "you eat (no li needed)" },
      {
        tp: "mi mute li tawa",
        en: "we go (li needed because 'mi' has modifier)",
      },
    ],
    mistakes: [
      "mi li pona -- wrong: don't use li after bare 'mi'",
      "jan moku -- ambiguous without li: is it 'a food person' or 'a person eats'?",
    ],
  },
  {
    particle: "e",
    name: "direct object marker",
    rule: "e marks the direct object -- the thing being acted upon. It comes after the predicate and before the object.",
    examples: [
      { tp: "mi moku e kili", en: "I eat fruit" },
      { tp: "ona li lukin e tomo", en: "they see the building" },
      { tp: "jan li pali e ilo", en: "the person makes a tool" },
    ],
    mistakes: [
      "mi moku kili -- grammatically off: use 'e' for the direct object",
      "mi e moku -- wrong: 'e' goes after the verb, not after the subject",
    ],
  },
  {
    particle: "la",
    name: "context marker",
    rule: "la separates a context phrase from the main sentence. The context comes first: 'context la main-sentence'. It can express time, conditions, or topic.",
    examples: [
      { tp: "tenpo ni la mi moku", en: "now I eat (at this time, I eat)" },
      { tp: "sina pona la mi pilin pona", en: "if you are good, I feel good" },
      {
        tp: "toki pona la jan li ken toki kepeken nimi lili",
        en: "in toki pona, people can speak with few words",
      },
    ],
    mistakes: [
      "mi moku la tenpo ni -- wrong: context goes BEFORE la, not after",
    ],
  },
  {
    particle: "pi",
    name: "regrouping particle",
    rule: "pi regroups modifiers. Without pi, each modifier applies to the head word directly. With pi, the words after pi form a compound modifier. Always needs at least two words after it.",
    examples: [
      { tp: "tomo telo suli", en: "big bathroom (suli modifies tomo)" },
      {
        tp: "tomo pi telo suli",
        en: "building of big water (suli modifies telo)",
      },
      {
        tp: "jan pi sona mute",
        en: "person of much knowledge (knowledgeable person)",
      },
    ],
    mistakes: [
      "jan pi sona -- wrong: pi needs at least two words after it",
      "jan pi pi sona mute -- wrong: never stack pi",
    ],
  },
  {
    particle: "o",
    name: "command / vocative",
    rule: "o has two uses: (1) commands -- 'o verb' means 'do the verb!'; (2) vocative -- 'name o' means addressing someone by name. Can combine: 'name o, verb' = 'name, do the verb!'",
    examples: [
      { tp: "o moku!", en: "eat!" },
      { tp: "o kama!", en: "come!" },
      { tp: "jan Ali o!", en: "hey Ali!" },
      { tp: "jan Ali o, o moku!", en: "Ali, eat!" },
      { tp: "mi o pali", en: "I should work (self-command)" },
    ],
    mistakes: ["moku o -- wrong for commands: o comes BEFORE the verb"],
  },
]

function GrammarParticlesPage() {
  return (
    <div className="flex flex-col gap-8 py-6">
      <Link
        to="/grammar"
        className="inline-flex items-center gap-1 text-sm text-zen-text3 hover:text-zen-text2 transition-colors"
      >
        <ArrowLeft className="size-3" /> grammar
      </Link>

      <div>
        <h1 className="font-tp text-2xl">nimi lili</h1>
        <p className="text-sm text-zen-text3">particles guide</p>
      </div>

      {PARTICLES.map((section) => (
        <section key={section.particle} className="space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="font-tp text-3xl text-zen-teal">
              {section.particle}
            </span>
            <span className="font-label text-zen-text3">{section.name}</span>
          </div>

          <p className="text-zen-text2 leading-relaxed">{section.rule}</p>

          <div className="space-y-2">
            {section.examples.map((ex, i) => (
              <div
                key={i}
                className="flex flex-col gap-0.5 rounded-md bg-zen-bg2 px-4 py-2"
              >
                <span className="font-tp text-sm">{ex.tp}</span>
                <span className="text-xs text-zen-text3">{ex.en}</span>
              </div>
            ))}
          </div>

          {section.mistakes && section.mistakes.length > 0 && (
            <div className="rounded-lg border-l-4 border-l-zen-coral bg-zen-bg2 p-4">
              <p className="font-label text-zen-coral mb-2">common mistakes</p>
              <div className="space-y-1">
                {section.mistakes.map((m, i) => (
                  <p key={i} className="text-sm text-zen-text2">
                    {m}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="border-b border-zen-border" />
        </section>
      ))}
    </div>
  )
}
