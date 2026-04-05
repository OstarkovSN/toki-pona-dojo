import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/grammar/modifiers")({
  component: GrammarModifiersPage,
  head: () => ({
    meta: [{ title: "Modifiers — toki pona dojo" }],
  }),
})

function GrammarModifiersPage() {
  return <div>Modifiers — coming soon</div>
}
