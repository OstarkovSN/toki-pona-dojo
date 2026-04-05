import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/grammar/")({
  component: GrammarIndexPage,
  head: () => ({
    meta: [{ title: "Grammar — toki pona dojo" }],
  }),
})

function GrammarIndexPage() {
  return <div>Grammar — coming soon</div>
}
