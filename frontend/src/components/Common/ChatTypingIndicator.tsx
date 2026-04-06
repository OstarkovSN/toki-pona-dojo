export function ChatTypingIndicator() {
  return (
    <div
      className="flex items-center gap-1.5 px-4 py-3"
      data-testid="chat-typing-indicator"
      role="status"
      aria-label="jan sona is typing"
    >
      <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-2.5">
        <span className="text-sm text-muted-foreground mr-2">jan sona</span>
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}
