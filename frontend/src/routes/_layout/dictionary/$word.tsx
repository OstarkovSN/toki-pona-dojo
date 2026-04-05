import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/dictionary/$word")({
  component: WordDetailPage,
  head: ({ params }) => ({
    meta: [{ title: `${params.word} — toki pona dojo` }],
  }),
})

function WordDetailPage() {
  const { word } = Route.useParams()
  return <div>Word: {word}</div>
}
