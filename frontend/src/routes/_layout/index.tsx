import { createFileRoute } from "@tanstack/react-router"

import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard - toki pona dojo",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()

  return (
    <div>
      <div>
        <h1 className="text-2xl truncate max-w-sm">toki pona dojo</h1>
        <p className="text-muted-foreground">
          o kama pona, {currentUser?.full_name || currentUser?.email}!
        </p>
      </div>
    </div>
  )
}
