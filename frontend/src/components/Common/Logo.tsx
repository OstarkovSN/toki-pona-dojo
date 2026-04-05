import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <span
          className={cn(
            "text-lg font-bold group-data-[collapsible=icon]:hidden",
            className,
          )}
        >
          toki pona dojo
        </span>
        <span
          className={cn(
            "text-lg font-bold hidden group-data-[collapsible=icon]:block",
            className,
          )}
        >
          tp
        </span>
      </>
    ) : (
      <span className={cn("text-lg font-bold", className)}>
        {variant === "full" ? "toki pona dojo" : "tp"}
      </span>
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}
