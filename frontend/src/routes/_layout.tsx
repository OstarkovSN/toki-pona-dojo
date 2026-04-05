import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { ChatPanel } from "@/components/ChatPanel"
import { Footer } from "@/components/Common/Footer"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ChatProvider } from "@/contexts/ChatContext"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  return (
    <ChatProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-full">
            {/* Main content column */}
            <div className="flex flex-1 flex-col min-w-0">
              <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1 text-muted-foreground" />
              </header>
              <main className="flex-1 p-6 md:p-8">
                <div className="mx-auto max-w-7xl">
                  <Outlet />
                </div>
              </main>
              <Footer />
            </div>

            {/* Chat panel column — hidden on mobile (uses Sheet instead) */}
            <div className="hidden md:flex md:w-[340px] lg:w-[400px] shrink-0">
              <ChatPanel />
            </div>

            {/* Mobile chat (floating button + bottom sheet) — visible only on mobile */}
            <div className="md:hidden">
              <ChatPanel />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ChatProvider>
  )
}

export default Layout
