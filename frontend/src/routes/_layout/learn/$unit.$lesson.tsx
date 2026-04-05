import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/learn/$unit/$lesson")({
  component: LessonPlaceholder,
  head: ({ params }) => ({
    meta: [
      {
        title: `Unit ${params.unit} Lesson ${params.lesson} — toki pona dojo`,
      },
    ],
  }),
})

function LessonPlaceholder() {
  const { unit, lesson } = Route.useParams()

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="font-tp text-2xl text-zen-text3">kama sona</p>
      <p className="text-sm text-zen-text3">
        Unit {unit}, Lesson {lesson} — Coming in Phase 6
      </p>
      <Link to="/" className="mt-4 text-sm text-zen-teal hover:underline">
        back to skill tree
      </Link>
    </div>
  )
}
