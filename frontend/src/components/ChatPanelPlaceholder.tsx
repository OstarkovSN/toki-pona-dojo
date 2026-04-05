import { MessageCircle } from "lucide-react"

export function ChatPanelPlaceholder() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 bg-zen-bg2 p-8 text-center"
      data-testid="chat-panel"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-zen-bg3">
        <MessageCircle className="size-8 text-zen-text3" />
      </div>
      <div>
        <p className="font-tp text-lg text-zen-text2">jan sona</p>
        <p className="mt-1 text-sm text-zen-text3">
          your toki pona tutor — coming soon
        </p>
      </div>
    </div>
  )
}
