import { createFileRoute } from "@tanstack/react-router"
import { SkillTree } from "@/components/SkillTree"

export const Route = createFileRoute("/_layout/")({
  component: HomePage,
  head: () => ({
    meta: [{ title: "toki pona dojo" }],
  }),
})

function HomePage() {
  const completedUnits: number[] = []
  const currentUnit = 1

  return (
    <div className="flex flex-col items-center gap-12 py-8">
      <div className="text-center">
        <h1 className="font-tp text-4xl text-zen-text">o kama sona</h1>
        <p className="mt-2 text-lg text-zen-text3">learn toki pona</p>
      </div>

      {completedUnits.length > 0 && (
        <div className="flex gap-6">
          <div className="flex flex-col items-center rounded-lg border border-zen-border bg-zen-bg2 px-6 py-3">
            <span className="font-tp text-xl text-zen-teal">0</span>
            <span className="text-xs text-zen-text3">words known</span>
          </div>
          <div className="flex flex-col items-center rounded-lg border border-zen-border bg-zen-bg2 px-6 py-3">
            <span className="font-tp text-xl text-zen-teal">0</span>
            <span className="text-xs text-zen-text3">lessons done</span>
          </div>
          <div className="flex flex-col items-center rounded-lg border border-zen-border bg-zen-bg2 px-6 py-3">
            <span className="font-tp text-xl text-zen-teal">0</span>
            <span className="text-xs text-zen-text3">day streak</span>
          </div>
        </div>
      )}

      <SkillTree completedUnits={completedUnits} currentUnit={currentUnit} />
    </div>
  )
}
