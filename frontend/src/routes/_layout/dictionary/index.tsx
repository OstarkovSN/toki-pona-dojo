import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/dictionary/")({
  component: DictionaryPage,
  head: () => ({
    meta: [{ title: "Dictionary — toki pona dojo" }],
  }),
})

function DictionaryPage() {
  return <div>Dictionary — coming soon</div>
}
