import { MessageSquare, Send, Trash2, X } from "lucide-react"
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { ChatMessage } from "@/components/ChatMessage"
import { type ChatMode, ChatModeSelector } from "@/components/ChatModeSelector"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useChatContext } from "@/contexts/ChatContext"
import { useChat } from "@/hooks/useChat"
import { useIsMobile } from "@/hooks/useMobile"
import { cn } from "@/lib/utils"

/**
 * The chat panel interior — shared between desktop sidebar and mobile sheet.
 */
function ChatPanelContent({ onClose }: { onClose?: () => void }) {
  const [mode, setMode] = useState<ChatMode>("free")
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { messages, sendMessage, isStreaming, error, clearHistory, isBYOM } =
    useChat({
      mode,
      knownWords: [], // TODO: Wire to progress store in Phase 8
      currentUnit: 1, // TODO: Wire to progress store in Phase 8
      recentErrors: [], // TODO: Wire to progress store in Phase 8
    })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Auto-resize textarea
  const adjustTextarea = useCallback(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isStreaming) return
      const msg = input
      setInput("")
      // Reset textarea height
      if (textareaRef.current) textareaRef.current.style.height = "auto"
      await sendMessage(msg)
    },
    [input, isStreaming, sendMessage],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e as unknown as FormEvent)
      }
    },
    [handleSubmit],
  )

  return (
    <div className="flex h-full flex-col" data-testid="chat-panel">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-3 py-2.5"
        data-testid="chat-header"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">jan sona</span>
          <span
            className={cn(
              "text-xs",
              isStreaming ? "text-primary" : "text-muted-foreground",
            )}
          >
            {isStreaming ? "typing..." : "ready"}
          </span>
          {isBYOM && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary">
              BYOM
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearHistory}
            disabled={isStreaming || messages.length === 0}
            title="Clear chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              title="Close chat"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Mode selector */}
      <ChatModeSelector
        mode={mode}
        onModeChange={setMode}
        disabled={isStreaming}
      />

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <div className="space-y-1 text-muted-foreground">
              <MessageSquare className="mx-auto h-8 w-8 opacity-40" />
              <p className="text-sm font-mono">toki! mi jan sona.</p>
              <p className="text-xs">Ask me anything about toki pona.</p>
            </div>
          </div>
        )}
        {messages
          .filter((m) => m.role !== "system")
          .map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role as "user" | "assistant"}
              content={msg.content}
              isStreaming={
                isStreaming &&
                i === messages.filter((m) => m.role !== "system").length - 1
              }
            />
          ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-3 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              adjustTextarea()
            }}
            onKeyDown={handleKeyDown}
            placeholder="toki..."
            rows={1}
            disabled={isStreaming}
            className={cn(
              "flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:opacity-50",
              "font-mono",
            )}
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={!input.trim() || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

/**
 * ChatPanel — Desktop: renders as a sidebar column. Mobile: renders as a Sheet.
 */
export function ChatPanel() {
  const isMobile = useIsMobile()
  const { isChatOpen, setChatOpen, toggleChat } = useChatContext()

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        {/* Floating toggle button */}
        {!isChatOpen && (
          <button
            type="button"
            onClick={toggleChat}
            className={cn(
              "fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center",
              "rounded-full bg-primary text-primary-foreground shadow-lg",
              "hover:bg-primary/90 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Open chat"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        )}
        <Sheet open={isChatOpen} onOpenChange={setChatOpen}>
          <SheetContent
            side="bottom"
            className="h-[80vh] rounded-t-2xl p-0 [&>button:last-child]:hidden"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>jan sona chat</SheetTitle>
            </SheetHeader>
            <ChatPanelContent onClose={() => setChatOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Desktop: inline sidebar column
  if (!isChatOpen) {
    return (
      <button
        type="button"
        onClick={toggleChat}
        className={cn(
          "flex h-full w-10 items-center justify-center border-l",
          "bg-card text-muted-foreground hover:text-foreground transition-colors",
        )}
        aria-label="Open chat"
      >
        <MessageSquare className="h-4 w-4" />
      </button>
    )
  }

  return (
    <aside className="flex h-full w-full flex-col border-l bg-card">
      <ChatPanelContent onClose={() => setChatOpen(false)} />
    </aside>
  )
}
