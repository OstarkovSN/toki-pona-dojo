import { Link, useRouterState } from "@tanstack/react-router"
import { MessageCircle, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useChatContext } from "@/contexts/ChatContext"
import { cn } from "@/lib/utils"

const navLinks = [
  { to: "/" as const, label: "learn" },
  { to: "/dictionary" as const, label: "dictionary" },
  { to: "/grammar" as const, label: "grammar" },
]

export function TopNav() {
  const { isChatOpen, toggleChat } = useChatContext()
  const { setTheme } = useTheme()
  const router = useRouterState()
  const currentPath = router.location.pathname

  const isActive = (to: string) => {
    if (to === "/") return currentPath === "/"
    return currentPath.startsWith(to)
  }

  return (
    <header className="sticky top-0 z-50 flex shrink-0 h-14 md:h-16 items-center justify-between border-b border-zen-border bg-zen-bg/95 backdrop-blur-sm px-3 md:px-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1 text-muted-foreground" />
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "font-label relative py-4 transition-colors",
                isActive(link.to)
                  ? "text-zen-teal"
                  : "text-zen-text3 hover:text-zen-text2",
              )}
            >
              {link.label}
              {isActive(link.to) && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zen-teal" />
              )}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChat}
          className={cn(
            "text-zen-text3 hover:text-zen-text2",
            isChatOpen && "text-zen-teal",
          )}
          aria-label="Toggle chat panel"
        >
          <MessageCircle className="size-4" />
        </Button>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="theme-button"
              className="text-zen-text3 hover:text-zen-text2"
            >
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              data-testid="light-mode"
              onClick={() => setTheme("light")}
            >
              <Sun className="mr-2 size-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="dark-mode"
              onClick={() => setTheme("dark")}
            >
              <Moon className="mr-2 size-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="mr-2 size-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link
          to="/settings"
          className="font-label text-zen-text3 hover:text-zen-text2 transition-colors py-4"
        >
          settings
        </Link>
      </div>
    </header>
  )
}
