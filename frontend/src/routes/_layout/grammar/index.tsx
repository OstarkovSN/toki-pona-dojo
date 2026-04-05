import { createFileRoute, Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"

export const Route = createFileRoute("/_layout/grammar/")({
  component: GrammarIndexPage,
  head: () => ({
    meta: [{ title: "Grammar — toki pona dojo" }],
  }),
})

const sections = [
  {
    number: "01",
    title: "Modifiers",
    description:
      "How toki pona builds meaning by stacking words after a head noun or verb. Learn modifier chains, pi groups, and the core head-first rule.",
    to: "/grammar/modifiers" as const,
  },
  {
    number: "02",
    title: "Particles",
    description:
      "The structural words that shape toki pona sentences: li, e, la, pi, and o. Learn sentence patterns and when to use each particle.",
    to: "/grammar/particles" as const,
  },
]

function GrammarIndexPage() {
  return (
    <div className="flex flex-col gap-8 py-6">
      <div>
        <h1 className="font-tp text-2xl">nasin toki</h1>
        <p className="text-sm text-zen-text3">grammar guide</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <Link
            key={section.number}
            to={section.to}
            className="group flex items-center gap-4 rounded-lg border border-zen-border bg-zen-bg p-5 transition-all hover:border-zen-border2 hover:shadow-sm"
          >
            <span className="font-tp text-2xl text-zen-text3 group-hover:text-zen-teal transition-colors">
              {section.number}
            </span>
            <div className="flex-1">
              <h2 className="font-tp text-lg group-hover:text-zen-teal transition-colors">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-zen-text3">
                {section.description}
              </p>
            </div>
            <ChevronRight className="size-5 text-zen-text3 group-hover:text-zen-teal transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}
