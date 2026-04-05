import { Link, useRouterState } from "@tanstack/react-router"
import { Moon, Sun, Monitor, MessageCircle } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Routes for dictionary/grammar added in Task 3 — cast to any until then
const navLinks: { to: string; label: string }[] = [
  { to: "/", label: "learn" },
  { to: "/dictionary", label: "dictionary" },
  { to: "/grammar", label: "grammar" },
]

interface TopNavProps {
  onToggleChat: () => void
  chatOpen: boolean
}

export function TopNav({ onToggleChat, chatOpen }: TopNavProps) {
  const { setTheme } = useTheme()
  const router = useRouterState()
  const currentPath = router.location.pathname

  const isActive = (to: string) => {
    if (to === "/") return currentPath === "/"
    return currentPath.startsWith(to)
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-zen-border bg-zen-bg/95 backdrop-blur-sm px-6">
      <nav className="flex items-center gap-6">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to={link.to as any}
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

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleChat}
          className={cn(
            "text-zen-text3 hover:text-zen-text2",
            chatOpen && "text-zen-teal",
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
            <DropdownMenuItem data-testid="light-mode" onClick={() => setTheme("light")}>
              <Sun className="mr-2 size-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="dark-mode" onClick={() => setTheme("dark")}>
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
