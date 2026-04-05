import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useChatContext } from "@/contexts/ChatContext"
import {
  type BYOMConfig,
  buildSystemPrompt,
  type ChatContext,
  type ChatMessage,
  callProviderDirect,
  callServerProxy,
  getBYOMConfig,
} from "@/lib/llm-client"

// ---- Session storage persistence ------------------------------------------

const SESSION_KEY = "tp-chat-messages"

function loadMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChatMessage[]
  } catch {
    return []
  }
}

function saveMessages(messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages))
  } catch {
    // sessionStorage full or unavailable — silently ignore
  }
}

// ---- Hook -----------------------------------------------------------------

export interface UseChatOptions {
  mode: "free" | "grammar" | "translate"
  knownWords: string[]
  currentUnit: number
  recentErrors: Array<{ word: string; context: string }>
}

export interface UseChatReturn {
  messages: ChatMessage[]
  sendMessage: (content: string) => Promise<void>
  isStreaming: boolean
  error: string | null
  clearHistory: () => void
  /** Whether BYOM is currently active */
  isBYOM: boolean
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const { routeContext } = useChatContext()
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Memoize BYOM config based on serialized localStorage values to avoid
  // creating a new object reference every render (which would destabilize
  // any dependency array that includes it).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const byomConfig = useMemo<BYOMConfig | null>(() => getBYOMConfig(), [])
  const isBYOM = byomConfig !== null

  // Persist messages to sessionStorage whenever they change
  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  // Build route hint string from context
  const buildRouteHint = useCallback((): string | undefined => {
    const { page, detail } = routeContext
    switch (page) {
      case "lesson":
        return detail ? `The learner is currently on ${detail}` : undefined
      case "dictionary":
        return detail
          ? `The learner is looking at the word '${detail}'`
          : undefined
      case "grammar":
        return detail ? `The learner is reading about ${detail}` : undefined
      default:
        return undefined
    }
  }, [routeContext])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return

      setError(null)

      // Append user message using functional update to avoid stale closure.
      // Capture the messages-with-user-msg for the API call via a variable
      // populated inside the functional updater.
      const userMsg: ChatMessage = { role: "user", content: content.trim() }
      let messagesForApi: ChatMessage[] = []
      setMessages((prev) => {
        messagesForApi = [...prev, userMsg]
        return messagesForApi
      })

      // Add empty assistant message that we will stream into
      setMessages((prev) => [
        ...prev,
        { role: "assistant" as const, content: "" },
      ])
      setIsStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      const chatCtx: ChatContext = {
        mode: options.mode,
        knownWords: options.knownWords,
        currentUnit: options.currentUnit,
        recentErrors: options.recentErrors,
        routeHint: buildRouteHint(),
      }

      const onChunk = (text: string) => {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + text,
            }
          }
          return updated
        })
      }

      try {
        if (byomConfig) {
          // Path 2: BYOM direct call
          const systemPrompt = buildSystemPrompt(chatCtx)
          const fullMessages: ChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...messagesForApi,
          ]
          await callProviderDirect(
            byomConfig,
            fullMessages,
            onChunk,
            controller.signal,
          )
        } else {
          // Path 1: Server proxy
          await callServerProxy(
            messagesForApi,
            chatCtx,
            onChunk,
            controller.signal,
          )
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled — not an error
        } else {
          const message =
            err instanceof Error ? err.message : "Something went wrong"
          setError(message)
          // Remove the empty assistant message on error
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.role === "assistant" && last.content === "") {
              return updated.slice(0, -1)
            }
            return updated
          })
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [
      isStreaming,
      options.mode,
      options.knownWords,
      options.currentUnit,
      options.recentErrors,
      byomConfig,
      buildRouteHint,
    ],
  )

  const clearHistory = useCallback(() => {
    // Abort any in-progress stream
    abortRef.current?.abort()
    setMessages([])
    setIsStreaming(false)
    setError(null)
    sessionStorage.removeItem(SESSION_KEY)
  }, [])

  return {
    messages,
    sendMessage,
    isStreaming,
    error,
    clearHistory,
    isBYOM,
  }
}
