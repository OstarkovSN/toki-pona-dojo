import { createFileRoute } from "@tanstack/react-router"
import { SkillTree } from "@/components/SkillTree"
import { useProgress } from "@/hooks/useProgress"

export const Route = createFileRoute("/_layout/")({
  component: HomePage,
  head: () => ({
    meta: [{ title: "toki pona dojo" }],
  }),
})

function HomePage() {
  const { progress, streak } = useProgress()
  const completedCount = progress.completedUnits.length

  return (
    <div className="flex flex-col items-center gap-12 py-8">
      <div className="text-center">
        <h1 className="font-tp text-4xl text-zen-text">o kama sona</h1>
        <p className="mt-2 text-lg text-zen-text3">
          {completedCount > 0
            ? `${completedCount} of 10 units complete`
            : "learn toki pona"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 md:gap-6">
        <div className="flex flex-col items-center rounded-lg border border-zen-border bg-zen-bg2 px-6 py-3">
          <span className="font-tp text-xl text-zen-teal">
            {progress.knownWords.length}
          </span>
          <span className="text-xs text-zen-text3">words known</span>
        </div>
        <div className="flex flex-col items-center rounded-lg border border-zen-border bg-zen-bg2 px-6 py-3">
          <span className="font-tp text-xl text-zen-teal">
            {progress.completedLessons.length}
          </span>
          <span className="text-xs text-zen-text3">lessons done</span>
        </div>
        <div className="flex flex-col items-center rounded-lg border border-zen-border bg-zen-bg2 px-6 py-3">
          <span className="font-tp text-xl text-zen-teal">
            {streak.currentStreak}
          </span>
          <span className="text-xs text-zen-text3">day streak</span>
        </div>
      </div>

      <SkillTree
        completedUnits={progress.completedUnits}
        currentUnit={progress.currentUnit}
      />
    </div>
  )
}
