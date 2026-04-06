import { WifiOff } from "lucide-react"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"

export function OfflineBanner() {
  const isOnline = useNetworkStatus()

  if (isOnline) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500 dark:bg-amber-600 px-4 py-2 text-sm font-medium text-white"
      role="alert"
      data-testid="offline-banner"
    >
      <WifiOff className="h-4 w-4" />
      <span>You're offline. Some features may not work.</span>
    </div>
  )
}
