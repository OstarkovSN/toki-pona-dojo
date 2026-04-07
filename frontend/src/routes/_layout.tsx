import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { ChatPanel } from "@/components/ChatPanel"
import { Footer } from "@/components/Common/Footer"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import { TopNav } from "@/components/TopNav"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ChatProvider } from "@/contexts/ChatContext"
import { isLoggedIn } from "@/hooks/useAuth"
import { useIsMobile } from "@/hooks/useMobile"

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
  const isMobile = useIsMobile()

  return (
    <ChatProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-full">
            {/* Main content column */}
            <div className="flex flex-1 flex-col min-w-0">
              <TopNav />
              <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="mx-auto max-w-7xl">
                  <Outlet />
                </div>
              </main>
              <Footer />
            </div>

            {/* Chat panel — desktop sidebar only; mobile handled via floating button inside ChatPanel */}
            {!isMobile && (
              <div className="md:w-[340px] lg:w-[400px] shrink-0">
                <ChatPanel />
              </div>
            )}
          </div>
        </SidebarInset>
        {/* Mobile chat: floating button + sheet, rendered outside SidebarInset to avoid clipping */}
        {isMobile && <ChatPanel />}
      </SidebarProvider>
    </ChatProvider>
  )
}

export default Layout
