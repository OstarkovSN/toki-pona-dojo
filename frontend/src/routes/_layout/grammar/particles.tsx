import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/grammar/particles")({
  component: GrammarParticlesPage,
  head: () => ({
    meta: [{ title: "Particles — toki pona dojo" }],
  }),
})

function GrammarParticlesPage() {
  return <div>Particles — coming soon</div>
}
