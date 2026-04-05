import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useState } from "react"
import { ChatPanelPlaceholder } from "@/components/ChatPanelPlaceholder"
import { TopNav } from "@/components/TopNav"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_layout")({
  component: Layout,
})

function Layout() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-zen-bg">
      <TopNav
        onToggleChat={() => setChatOpen((prev) => !prev)}
        chatOpen={chatOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Content panel */}
        <main
          className={cn(
            "flex-1 overflow-y-auto p-6 md:p-8 transition-all duration-300",
            chatOpen ? "md:w-3/5" : "w-full",
          )}
        >
          <div className="mx-auto max-w-4xl">
            <Outlet />
          </div>
        </main>

        {/* Chat panel (placeholder) */}
        {chatOpen && (
          <aside className="hidden md:flex md:w-2/5 border-l border-zen-border overflow-y-auto">
            <div className="flex-1">
              <ChatPanelPlaceholder />
            </div>
          </aside>
        )}

        {/* Mobile: chat as bottom sheet (placeholder) */}
        {chatOpen && (
          <div className="fixed inset-x-0 bottom-0 z-40 h-1/2 border-t border-zen-border md:hidden">
            <ChatPanelPlaceholder />
          </div>
        )}
      </div>
    </div>
  )
}

export default Layout
