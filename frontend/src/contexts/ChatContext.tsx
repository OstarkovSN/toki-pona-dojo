import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react"

export interface ChatRouteContext {
  /** E.g. "lesson", "dictionary", "grammar", "home" */
  page: string
  /** Extra detail: unit number, word being viewed, grammar topic, etc. */
  detail: string
}

interface ChatContextValue {
  routeContext: ChatRouteContext
  setRouteContext: (ctx: ChatRouteContext) => void
  isChatOpen: boolean
  toggleChat: () => void
  setChatOpen: (open: boolean) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [routeContext, setRouteContext] = useState<ChatRouteContext>({
    page: "home",
    detail: "",
  })

  // Persist collapsed state in localStorage
  const [isChatOpen, setIsChatOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem("tp-chat-open")
    return stored === null ? true : stored === "true"
  })

  const setChatOpen = useCallback((open: boolean) => {
    setIsChatOpen(open)
    localStorage.setItem("tp-chat-open", String(open))
  }, [])

  const toggleChat = useCallback(() => {
    setChatOpen(!isChatOpen)
  }, [isChatOpen, setChatOpen])

  return (
    <ChatContext.Provider
      value={{
        routeContext,
        setRouteContext,
        isChatOpen,
        toggleChat,
        setChatOpen,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider")
  return ctx
}
