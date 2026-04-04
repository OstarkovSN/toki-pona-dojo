# Phase 7: Frontend Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the always-on chat sidebar with jan sona tutor, supporting streaming responses, BYOM direct calls, and route-aware context.

**Architecture:** ChatPanel fills the 40% right panel, useChat hook handles two paths (server SSE proxy vs BYOM direct call), context passed via React context from layout. Mobile uses shadcn Sheet as bottom sheet.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui Sheet, SSE/fetch streaming, localStorage/sessionStorage

**Existing codebase reference:**
- Layout: `frontend/src/routes/_layout.tsx` (SidebarProvider + SidebarInset + header + main + footer)
- Sheet component: `frontend/src/components/ui/sheet.tsx` (SheetContent with side="bottom" supported)
- Mobile hook: `frontend/src/hooks/useMobile.ts` (useIsMobile, breakpoint 768px)
- Input component: `frontend/src/components/ui/input.tsx`
- Badge component: `frontend/src/components/ui/badge.tsx`
- Button component: `frontend/src/components/ui/button.tsx`
- Theme: `frontend/src/index.css` (oklch vars: --primary = teal, --destructive = coral, --background, --foreground, --card, --muted, etc.)
- Auth: `frontend/src/hooks/useAuth.ts` (isLoggedIn checks localStorage access_token)
- Backend chat endpoint: `POST /api/v1/chat/stream` accepts `{messages, mode, known_words, current_unit, recent_errors}`, returns SSE with `data: {"content":"..."}` chunks and `data: [DONE]` terminator

---

## Task 1: Create ChatContext for route-aware context passing

**Files:**
- ADD: `frontend/src/contexts/ChatContext.tsx`

### Steps

- [ ] **Step 1: Create the ChatContext file**

  Create `frontend/src/contexts/ChatContext.tsx`:

  ```tsx
  import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

  export interface ChatRouteContext {
    /** E.g. "lesson", "dictionary", "grammar", "home" */
    page: string;
    /** Extra detail: unit number, word being viewed, grammar topic, etc. */
    detail: string;
  }

  interface ChatContextValue {
    routeContext: ChatRouteContext;
    setRouteContext: (ctx: ChatRouteContext) => void;
    isChatOpen: boolean;
    toggleChat: () => void;
    setChatOpen: (open: boolean) => void;
  }

  const ChatContext = createContext<ChatContextValue | null>(null);

  export function ChatProvider({ children }: { children: ReactNode }) {
    const [routeContext, setRouteContext] = useState<ChatRouteContext>({
      page: "home",
      detail: "",
    });

    // Persist collapsed state in localStorage
    const [isChatOpen, setIsChatOpen] = useState<boolean>(() => {
      const stored = localStorage.getItem("tp-chat-open");
      return stored === null ? true : stored === "true";
    });

    const setChatOpen = useCallback((open: boolean) => {
      setIsChatOpen(open);
      localStorage.setItem("tp-chat-open", String(open));
    }, []);

    const toggleChat = useCallback(() => {
      setChatOpen(!isChatOpen);
    }, [isChatOpen, setChatOpen]);

    return (
      <ChatContext.Provider
        value={{ routeContext, setRouteContext, isChatOpen, toggleChat, setChatOpen }}
      >
        {children}
      </ChatContext.Provider>
    );
  }

  export function useChatContext() {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
    return ctx;
  }
  ```

- [ ] **Step 2: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/contexts/ChatContext.tsx 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/contexts/ChatContext.tsx
  git commit -m "Add ChatContext for route-aware context and chat open/close state"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-chat-context.md` using the surfacing-subagent-learnings skill.

---

## Task 2: Create llm-client.ts — BYOM direct call + system prompt

**Files:**
- ADD: `frontend/src/lib/llm-client.ts`

### Steps

- [ ] **Step 1: Create the llm-client.ts file**

  Create `frontend/src/lib/llm-client.ts`:

  ```typescript
  // ---------------------------------------------------------------------------
  // llm-client.ts — BYOM (Bring Your Own Model) direct browser-to-provider call
  // ---------------------------------------------------------------------------

  // ---- BYOM localStorage keys ------------------------------------------------
  export const BYOM_URL_KEY = "tp-byom-url";
  export const BYOM_KEY_KEY = "tp-byom-key";
  export const BYOM_MODEL_KEY = "tp-byom-model";

  // ---- BYOM helpers ----------------------------------------------------------

  export interface BYOMConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
  }

  /**
   * Read BYOM config from localStorage. Returns null if not fully configured.
   */
  export function getBYOMConfig(): BYOMConfig | null {
    const baseUrl = localStorage.getItem(BYOM_URL_KEY);
    const apiKey = localStorage.getItem(BYOM_KEY_KEY);
    const model = localStorage.getItem(BYOM_MODEL_KEY);
    if (!baseUrl || !apiKey) return null;
    return {
      baseUrl: baseUrl.replace(/\/+$/, ""),
      apiKey,
      model: model || "gpt-4o-mini",
    };
  }

  export function saveBYOMConfig(config: BYOMConfig): void {
    localStorage.setItem(BYOM_URL_KEY, config.baseUrl);
    localStorage.setItem(BYOM_KEY_KEY, config.apiKey);
    localStorage.setItem(BYOM_MODEL_KEY, config.model);
  }

  export function clearBYOMConfig(): void {
    localStorage.removeItem(BYOM_URL_KEY);
    localStorage.removeItem(BYOM_KEY_KEY);
    localStorage.removeItem(BYOM_MODEL_KEY);
  }

  // ---- System prompt (identical to backend SYSTEM_PROMPT_CHAT) ---------------

  const SYSTEM_PROMPT_CHAT = `You are jan sona, a toki pona tutor on the site "toki pona dojo."

  LEARNER CONTEXT:
  - Current unit: {unit}
  - Known words: {words}
  - Recent errors: {errors}
  - Chat mode: {mode}

  RULES:
  - Use ONLY words from the known list in your toki pona. Gloss unknown words in parentheses: "kasi (plant)"
  - In free chat mode: respond in toki pona first, then provide an English translation below, separated by a blank line
  - For grammar questions: explain in clear English with toki pona examples
  - For translation requests: show multiple valid toki pona approaches with explanations
  - Keep responses concise (2-4 sentences in each language)
  - Gently correct mistakes inline — show the correction, explain briefly why
  - Be warm, patient, encouraging
  - Never break character as jan sona
  - If the user writes in English, respond in English but include toki pona examples
  - If the user writes in toki pona, respond primarily in toki pona`;

  export interface ChatContext {
    mode: "free" | "grammar" | "translate";
    knownWords: string[];
    currentUnit: number;
    recentErrors: Array<{ word: string; context: string }>;
    /** Extra route-based context line, e.g. "The learner is currently on unit 3, exercise about li" */
    routeHint?: string;
  }

  export function buildSystemPrompt(ctx: ChatContext): string {
    const errorsStr =
      ctx.recentErrors
        .slice(-5)
        .map((e) => `${e.word}: ${e.context}`)
        .join("; ") || "none";
    const wordsStr = ctx.knownWords.length
      ? ctx.knownWords.join(", ")
      : "mi, sina, pona, ike, toki";
    let prompt = SYSTEM_PROMPT_CHAT
      .replace("{unit}", String(ctx.currentUnit))
      .replace("{words}", wordsStr)
      .replace("{errors}", errorsStr)
      .replace("{mode}", ctx.mode);
    if (ctx.routeHint) {
      prompt += `\n\nCURRENT PAGE CONTEXT:\n${ctx.routeHint}`;
    }
    return prompt;
  }

  // ---- Message type ----------------------------------------------------------

  export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
  }

  // ---- SSE line buffer -------------------------------------------------------

  /**
   * Accumulates partial lines from SSE chunks. Handles the case where a chunk
   * ends mid-line (no trailing newline). Calls `onContent` for each token.
   * Returns the unfinished trailing fragment (to be prepended to the next chunk).
   */
  export function processSSEChunk(
    chunk: string,
    buffer: string,
    onContent: (text: string) => void,
  ): { buffer: string; done: boolean } {
    const combined = buffer + chunk;
    const lines = combined.split("\n");
    // Last element may be incomplete — keep it as the new buffer
    const newBuffer = lines.pop() ?? "";
    let done = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "data: [DONE]") {
        done = true;
        break;
      }
      if (trimmed.startsWith("data: ")) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) onContent(content);
        } catch {
          // Ignore malformed JSON lines (e.g. partial chunks)
        }
      }
    }
    return { buffer: newBuffer, done };
  }

  // ---- BYOM direct call ------------------------------------------------------

  /**
   * Call the user's OpenAI-compatible provider directly from the browser.
   *
   * @throws Error on non-200 response or network failure.
   */
  export async function callProviderDirect(
    config: BYOMConfig,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const url = `${config.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Provider returned ${response.status}: ${errorBody || response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body is not readable");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        const chunk = decoder.decode(value, { stream: true });
        const result = processSSEChunk(chunk, buffer, onChunk);
        buffer = result.buffer;
        if (result.done) break;
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ---- Server proxy call -----------------------------------------------------

  /**
   * Call the toki pona dojo backend's /api/v1/chat/stream SSE endpoint.
   */
  export async function callServerProxy(
    messages: ChatMessage[],
    context: ChatContext,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const token = localStorage.getItem("access_token");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch("/api/v1/chat/stream", {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: messages.filter((m) => m.role !== "system"),
        mode: context.mode,
        known_words: context.knownWords,
        current_unit: context.currentUnit,
        recent_errors: context.recentErrors,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      if (response.status === 429) {
        throw new Error("Rate limit reached. Try again later or add your own API key in Settings.");
      }
      throw new Error(
        `Server returned ${response.status}: ${errorBody || response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body is not readable");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        const chunk = decoder.decode(value, { stream: true });
        const result = processSSEChunk(chunk, buffer, onChunk);
        buffer = result.buffer;
        if (result.done) break;
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ---- Test connection -------------------------------------------------------

  /**
   * Sends a tiny test prompt to verify BYOM connectivity.
   * Returns true on success, throws on failure.
   */
  export async function testBYOMConnection(config: BYOMConfig): Promise<boolean> {
    const url = `${config.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "toki" }],
        max_tokens: 5,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Connection failed (${response.status}): ${errorBody || response.statusText}`,
      );
    }

    // If we get a valid response, connection works
    await response.json();
    return true;
  }
  ```

- [ ] **Step 2: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/lib/llm-client.ts 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/lib/llm-client.ts
  git commit -m "Add llm-client with BYOM direct call, server proxy, SSE parsing, and system prompt"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-llm-client.md` using the surfacing-subagent-learnings skill.

---

## Task 3: Create useChat hook

**Files:**
- ADD: `frontend/src/hooks/useChat.ts`

**Depends on:** Task 1 (ChatContext), Task 2 (llm-client)

### Steps

- [ ] **Step 1: Create the useChat hook**

  Create `frontend/src/hooks/useChat.ts`:

  ```typescript
  import { useState, useCallback, useRef, useEffect } from "react";
  import {
    type ChatMessage,
    type ChatContext,
    type BYOMConfig,
    getBYOMConfig,
    buildSystemPrompt,
    callProviderDirect,
    callServerProxy,
  } from "@/lib/llm-client";
  import { useChatContext } from "@/contexts/ChatContext";

  // ---- Session storage persistence ------------------------------------------

  const SESSION_KEY = "tp-chat-messages";

  function loadMessages(): ChatMessage[] {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as ChatMessage[];
    } catch {
      return [];
    }
  }

  function saveMessages(messages: ChatMessage[]): void {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
    } catch {
      // sessionStorage full or unavailable — silently ignore
    }
  }

  // ---- Hook -----------------------------------------------------------------

  export interface UseChatOptions {
    mode: "free" | "grammar" | "translate";
    knownWords: string[];
    currentUnit: number;
    recentErrors: Array<{ word: string; context: string }>;
  }

  export interface UseChatReturn {
    messages: ChatMessage[];
    sendMessage: (content: string) => Promise<void>;
    isStreaming: boolean;
    error: string | null;
    clearHistory: () => void;
    /** Whether BYOM is currently active */
    isBYOM: boolean;
  }

  export function useChat(options: UseChatOptions): UseChatReturn {
    const { routeContext } = useChatContext();
    const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Check BYOM config on each render (cheap localStorage reads)
    const byomConfig = getBYOMConfig();
    const isBYOM = byomConfig !== null;

    // Persist messages to sessionStorage whenever they change
    useEffect(() => {
      saveMessages(messages);
    }, [messages]);

    // Build route hint string from context
    const buildRouteHint = useCallback((): string | undefined => {
      const { page, detail } = routeContext;
      switch (page) {
        case "lesson":
          return detail
            ? `The learner is currently on ${detail}`
            : undefined;
        case "dictionary":
          return detail
            ? `The learner is looking at the word '${detail}'`
            : undefined;
        case "grammar":
          return detail
            ? `The learner is reading about ${detail}`
            : undefined;
        default:
          return undefined;
      }
    }, [routeContext]);

    const sendMessage = useCallback(
      async (content: string) => {
        if (!content.trim() || isStreaming) return;

        setError(null);

        // Append user message
        const userMsg: ChatMessage = { role: "user", content: content.trim() };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);

        // Add empty assistant message that we will stream into
        const assistantMsg: ChatMessage = { role: "assistant", content: "" };
        setMessages([...updatedMessages, assistantMsg]);
        setIsStreaming(true);

        const controller = new AbortController();
        abortRef.current = controller;

        const chatCtx: ChatContext = {
          mode: options.mode,
          knownWords: options.knownWords,
          currentUnit: options.currentUnit,
          recentErrors: options.recentErrors,
          routeHint: buildRouteHint(),
        };

        const onChunk = (text: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + text,
              };
            }
            return updated;
          });
        };

        try {
          if (byomConfig) {
            // Path 2: BYOM direct call
            const systemPrompt = buildSystemPrompt(chatCtx);
            const fullMessages: ChatMessage[] = [
              { role: "system", content: systemPrompt },
              ...updatedMessages,
            ];
            await callProviderDirect(
              byomConfig,
              fullMessages,
              onChunk,
              controller.signal,
            );
          } else {
            // Path 1: Server proxy
            await callServerProxy(
              updatedMessages,
              chatCtx,
              onChunk,
              controller.signal,
            );
          }
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === "AbortError") {
            // User cancelled — not an error
          } else {
            const message =
              err instanceof Error ? err.message : "Something went wrong";
            setError(message);
            // Remove the empty assistant message on error
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant" && last.content === "") {
                return updated.slice(0, -1);
              }
              return updated;
            });
          }
        } finally {
          setIsStreaming(false);
          abortRef.current = null;
        }
      },
      [
        messages,
        isStreaming,
        options.mode,
        options.knownWords,
        options.currentUnit,
        options.recentErrors,
        byomConfig,
        buildRouteHint,
      ],
    );

    const clearHistory = useCallback(() => {
      // Abort any in-progress stream
      abortRef.current?.abort();
      setMessages([]);
      setIsStreaming(false);
      setError(null);
      sessionStorage.removeItem(SESSION_KEY);
    }, []);

    return {
      messages,
      sendMessage,
      isStreaming,
      error,
      clearHistory,
      isBYOM,
    };
  }
  ```

- [ ] **Step 2: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/hooks/useChat.ts 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/hooks/useChat.ts
  git commit -m "Add useChat hook with dual-path streaming, session persistence, and route context"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-use-chat-hook.md` using the surfacing-subagent-learnings skill.

---

## Task 4: Create ChatModeSelector component

**Files:**
- ADD: `frontend/src/components/ChatModeSelector.tsx`

### Steps

- [ ] **Step 1: Create the ChatModeSelector component**

  Create `frontend/src/components/ChatModeSelector.tsx`:

  ```tsx
  import { cn } from "@/lib/utils";

  export type ChatMode = "free" | "grammar" | "translate";

  interface ChatModeSelectorProps {
    mode: ChatMode;
    onModeChange: (mode: ChatMode) => void;
    disabled?: boolean;
  }

  const modes: { value: ChatMode; label: string }[] = [
    { value: "free", label: "free chat" },
    { value: "grammar", label: "grammar" },
    { value: "translate", label: "translate" },
  ];

  export function ChatModeSelector({
    mode,
    onModeChange,
    disabled = false,
  }: ChatModeSelectorProps) {
    return (
      <div className="flex gap-1.5 px-3 py-2" role="radiogroup" aria-label="Chat mode">
        {modes.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mode === m.value}
            disabled={disabled}
            onClick={() => onModeChange(m.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium font-mono transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:pointer-events-none disabled:opacity-50",
              mode === m.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/components/ChatModeSelector.tsx 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/ChatModeSelector.tsx
  git commit -m "Add ChatModeSelector pill component for free/grammar/translate modes"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-chat-mode-selector.md` using the surfacing-subagent-learnings skill.

---

## Task 5: Create ChatMessage component

**Files:**
- ADD: `frontend/src/components/ChatMessage.tsx`

### Steps

- [ ] **Step 1: Create the ChatMessage component**

  The component renders user and assistant messages with appropriate alignment and styling. toki pona text (detected heuristically by common toki pona words) uses `font-mono` (DM Mono). English text uses `font-serif` (Lora). Messages with blank-line separation get each paragraph styled independently.

  Create `frontend/src/components/ChatMessage.tsx`:

  ```tsx
  import { cn } from "@/lib/utils";

  interface ChatMessageProps {
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
  }

  // Common toki pona words used for heuristic language detection
  const TP_MARKERS = new Set([
    "mi", "sina", "ona", "li", "e", "la", "pi", "o",
    "pona", "ike", "toki", "jan", "ni", "ala", "ale",
    "moku", "telo", "suli", "lili", "wile", "ken",
    "kama", "pali", "sona", "lukin", "kepeken", "lon",
    "tawa", "tan", "sama", "mute", "wan", "tu",
  ]);

  /**
   * Heuristic: a line is "toki pona" if >40% of its words are TP markers
   * and it has at least 2 words.
   */
  function isTokiPona(line: string): boolean {
    const words = line.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length < 2) return false;
    const tpCount = words.filter((w) => TP_MARKERS.has(w.replace(/[.,!?]/g, ""))).length;
    return tpCount / words.length > 0.4;
  }

  /**
   * Split content on blank lines into paragraphs. Each paragraph is rendered
   * with the font matching its detected language.
   */
  function renderContent(content: string) {
    const paragraphs = content.split(/\n\s*\n/);
    return paragraphs.map((para, i) => {
      const trimmed = para.trim();
      if (!trimmed) return null;
      const isTP = isTokiPona(trimmed);
      return (
        <p
          key={i}
          className={cn(
            "whitespace-pre-wrap leading-relaxed",
            isTP ? "font-mono font-medium" : "font-serif",
          )}
        >
          {trimmed}
        </p>
      );
    });
  }

  export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
    const isUser = role === "user";

    return (
      <div
        className={cn(
          "flex w-full",
          isUser ? "justify-end" : "justify-start",
        )}
      >
        <div
          className={cn(
            "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm space-y-2",
            isUser
              ? "bg-muted text-foreground rounded-br-md"
              : "bg-card border border-border text-foreground rounded-bl-md",
          )}
        >
          {content ? (
            renderContent(content)
          ) : isStreaming ? (
            <span className="inline-flex gap-1">
              <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:300ms]" />
            </span>
          ) : null}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/components/ChatMessage.tsx 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/ChatMessage.tsx
  git commit -m "Add ChatMessage component with language-aware font rendering"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-chat-message.md` using the surfacing-subagent-learnings skill.

---

## Task 6: Create ChatPanel component

**Files:**
- ADD: `frontend/src/components/ChatPanel.tsx`

**Depends on:** Task 1 (ChatContext), Task 3 (useChat), Task 4 (ChatModeSelector), Task 5 (ChatMessage)

### Steps

- [ ] **Step 1: Create the ChatPanel component**

  The ChatPanel renders as a fixed right column on desktop and a bottom Sheet on mobile. It contains the header, mode selector, scrollable message list, and input area.

  Create `frontend/src/components/ChatPanel.tsx`:

  ```tsx
  import { useState, useRef, useEffect, useCallback, type FormEvent, type KeyboardEvent } from "react";
  import { MessageSquare, Trash2, Send, X } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
  import { ChatMessage } from "@/components/ChatMessage";
  import { ChatModeSelector, type ChatMode } from "@/components/ChatModeSelector";
  import { useChat } from "@/hooks/useChat";
  import { useChatContext } from "@/contexts/ChatContext";
  import { useIsMobile } from "@/hooks/useMobile";
  import { cn } from "@/lib/utils";

  /**
   * The chat panel interior — shared between desktop sidebar and mobile sheet.
   */
  function ChatPanelContent({ onClose }: { onClose?: () => void }) {
    const [mode, setMode] = useState<ChatMode>("free");
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { messages, sendMessage, isStreaming, error, clearHistory, isBYOM } =
      useChat({
        mode,
        knownWords: [], // TODO: Wire to progress store in Phase 8
        currentUnit: 1, // TODO: Wire to progress store in Phase 8
        recentErrors: [], // TODO: Wire to progress store in Phase 8
      });

    // Auto-scroll to bottom on new messages
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    const adjustTextarea = useCallback(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
      }
    }, []);

    const handleSubmit = useCallback(
      async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;
        const msg = input;
        setInput("");
        // Reset textarea height
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        await sendMessage(msg);
      },
      [input, isStreaming, sendMessage],
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSubmit(e as unknown as FormEvent);
        }
      },
      [handleSubmit],
    );

    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2.5">
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
        <ChatModeSelector mode={mode} onModeChange={setMode} disabled={isStreaming} />

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
        <form
          onSubmit={handleSubmit}
          className="border-t p-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextarea();
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
    );
  }

  /**
   * ChatPanel — Desktop: renders as a sidebar column. Mobile: renders as a Sheet.
   */
  export function ChatPanel() {
    const isMobile = useIsMobile();
    const { isChatOpen, setChatOpen, toggleChat } = useChatContext();

    // Mobile: bottom sheet
    if (isMobile) {
      return (
        <>
          {/* Floating toggle button */}
          {!isChatOpen && (
            <button
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
      );
    }

    // Desktop: inline sidebar column
    if (!isChatOpen) {
      return (
        <button
          onClick={toggleChat}
          className={cn(
            "flex h-full w-10 items-center justify-center border-l",
            "bg-card text-muted-foreground hover:text-foreground transition-colors",
          )}
          aria-label="Open chat"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      );
    }

    return (
      <aside className="flex h-full w-full flex-col border-l bg-card">
        <ChatPanelContent onClose={() => setChatOpen(false)} />
      </aside>
    );
  }
  ```

- [ ] **Step 2: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/components/ChatPanel.tsx 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/ChatPanel.tsx
  git commit -m "Add ChatPanel component with desktop sidebar and mobile bottom sheet"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-chat-panel.md` using the surfacing-subagent-learnings skill.

---

## Task 7: Create ProviderSettings component

**Files:**
- ADD: `frontend/src/components/ProviderSettings.tsx`

### Steps

- [ ] **Step 1: Create the ProviderSettings component**

  Create `frontend/src/components/ProviderSettings.tsx`:

  ```tsx
  import { useState, useCallback, useEffect } from "react";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import {
    type BYOMConfig,
    getBYOMConfig,
    saveBYOMConfig,
    clearBYOMConfig,
    testBYOMConnection,
  } from "@/lib/llm-client";
  import { cn } from "@/lib/utils";

  type ConnectionStatus = "idle" | "testing" | "connected" | "error" | "server-default";

  export function ProviderSettings() {
    const [baseUrl, setBaseUrl] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [model, setModel] = useState("");
    const [status, setStatus] = useState<ConnectionStatus>("server-default");
    const [errorMessage, setErrorMessage] = useState("");
    const [isTesting, setIsTesting] = useState(false);

    // Load existing config on mount
    useEffect(() => {
      const config = getBYOMConfig();
      if (config) {
        setBaseUrl(config.baseUrl);
        setApiKey(config.apiKey);
        setModel(config.model);
        setStatus("connected");
      } else {
        setStatus("server-default");
      }
    }, []);

    const handleSave = useCallback(() => {
      if (!baseUrl.trim() || !apiKey.trim()) return;
      const config: BYOMConfig = {
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim() || "gpt-4o-mini",
      };
      saveBYOMConfig(config);
      setStatus("connected");
      setErrorMessage("");
    }, [baseUrl, apiKey, model]);

    const handleTestConnection = useCallback(async () => {
      if (!baseUrl.trim() || !apiKey.trim()) return;

      setIsTesting(true);
      setStatus("testing");
      setErrorMessage("");

      const config: BYOMConfig = {
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim() || "gpt-4o-mini",
      };

      try {
        await testBYOMConnection(config);
        saveBYOMConfig(config);
        setStatus("connected");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setStatus("error");
        setErrorMessage(msg);
      } finally {
        setIsTesting(false);
      }
    }, [baseUrl, apiKey, model]);

    const handleClear = useCallback(() => {
      clearBYOMConfig();
      setBaseUrl("");
      setApiKey("");
      setModel("");
      setStatus("server-default");
      setErrorMessage("");
    }, []);

    const statusLabel = {
      idle: "",
      testing: "Testing connection...",
      connected: "Connected to your provider",
      error: "Connection error",
      "server-default": "Using server default",
    }[status];

    const statusColor = {
      idle: "text-muted-foreground",
      testing: "text-muted-foreground",
      connected: "text-primary",
      error: "text-destructive",
      "server-default": "text-muted-foreground",
    }[status];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">LLM Provider (BYOM)</h3>
          <p className="text-sm text-muted-foreground">
            Bring your own model. Connect your OpenAI-compatible API to chat
            directly without server limits. Your key is stored only in this
            browser.
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              status === "connected" && "bg-primary",
              status === "error" && "bg-destructive",
              status === "testing" && "bg-muted-foreground animate-pulse",
              (status === "server-default" || status === "idle") && "bg-muted-foreground",
            )}
          />
          <span className={cn("text-sm", statusColor)}>{statusLabel}</span>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="byom-url">API Base URL</Label>
            <Input
              id="byom-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              autoComplete="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="byom-key">API Key</Label>
            <Input
              id="byom-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="byom-model">Model Name (optional)</Label>
            <Input
              id="byom-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
            />
          </div>
        </div>

        {/* Error details */}
        {errorMessage && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleTestConnection}
            disabled={!baseUrl.trim() || !apiKey.trim() || isTesting}
          >
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!baseUrl.trim() || !apiKey.trim()}
          >
            Save
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={status === "server-default"}
            className="text-destructive hover:text-destructive"
          >
            Clear Credentials
          </Button>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify the file compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit src/components/ProviderSettings.tsx 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/ProviderSettings.tsx
  git commit -m "Add ProviderSettings component for BYOM API key configuration"
  ```

- [ ] **Step 4:** Record learnings to `.claude/learnings-provider-settings.md` using the surfacing-subagent-learnings skill.

---

## Task 8: Wire ChatPanel into layout and ProviderSettings into settings page

**Files:**
- MODIFY: `frontend/src/routes/_layout.tsx`
- MODIFY: `frontend/src/routes/_layout/settings.tsx`

**Depends on:** Task 1 (ChatContext), Task 6 (ChatPanel), Task 7 (ProviderSettings)

### Steps

- [ ] **Step 1: Read current layout file**
  ```bash
  cat frontend/src/routes/_layout.tsx
  ```

- [ ] **Step 2: Modify `frontend/src/routes/_layout.tsx`**

  Wrap the layout in `ChatProvider`, add the ChatPanel as a right column alongside the main content. The layout becomes a two-column flex container on desktop.

  Replace the entire `_layout.tsx` with:

  ```tsx
  import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

  import { Footer } from "@/components/Common/Footer"
  import AppSidebar from "@/components/Sidebar/AppSidebar"
  import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
  } from "@/components/ui/sidebar"
  import { isLoggedIn } from "@/hooks/useAuth"
  import { ChatProvider } from "@/contexts/ChatContext"
  import { ChatPanel } from "@/components/ChatPanel"

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
    return (
      <ChatProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="flex h-full">
              {/* Main content column */}
              <div className="flex flex-1 flex-col min-w-0">
                <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
                  <SidebarTrigger className="-ml-1 text-muted-foreground" />
                </header>
                <main className="flex-1 p-6 md:p-8">
                  <div className="mx-auto max-w-7xl">
                    <Outlet />
                  </div>
                </main>
                <Footer />
              </div>

              {/* Chat panel column — hidden on mobile (uses Sheet instead) */}
              <div className="hidden md:flex md:w-[340px] lg:w-[400px] shrink-0">
                <ChatPanel />
              </div>

              {/* Mobile chat (floating button + bottom sheet) — visible only on mobile */}
              <div className="md:hidden">
                <ChatPanel />
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ChatProvider>
    )
  }

  export default Layout
  ```

- [ ] **Step 3: Read current settings file**
  ```bash
  cat frontend/src/routes/_layout/settings.tsx
  ```

- [ ] **Step 4: Modify `frontend/src/routes/_layout/settings.tsx`**

  Add a new "LLM Provider" tab that renders the ProviderSettings component.

  Replace the `tabsConfig` and imports:

  ```tsx
  import { createFileRoute } from "@tanstack/react-router"

  import ChangePassword from "@/components/UserSettings/ChangePassword"
  import DeleteAccount from "@/components/UserSettings/DeleteAccount"
  import UserInformation from "@/components/UserSettings/UserInformation"
  import { ProviderSettings } from "@/components/ProviderSettings"
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
  import useAuth from "@/hooks/useAuth"

  const tabsConfig = [
    { value: "my-profile", title: "My profile", component: UserInformation },
    { value: "password", title: "Password", component: ChangePassword },
    { value: "llm-provider", title: "LLM Provider", component: ProviderSettings },
    { value: "danger-zone", title: "Danger zone", component: DeleteAccount },
  ]

  export const Route = createFileRoute("/_layout/settings")({
    component: UserSettings,
    head: () => ({
      meta: [
        {
          title: "Settings - toki pona dojo",
        },
      ],
    }),
  })

  function UserSettings() {
    const { user: currentUser } = useAuth()
    const finalTabs = currentUser?.is_superuser
      ? tabsConfig.slice(0, 4)
      : tabsConfig

    if (!currentUser) {
      return null
    }

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="my-profile">
          <TabsList>
            {finalTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {finalTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <tab.component />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  }
  ```

- [ ] **Step 5: Verify the app compiles**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1 | head -30
  ```

- [ ] **Step 6: Commit**
  ```bash
  git add frontend/src/routes/_layout.tsx frontend/src/routes/_layout/settings.tsx
  git commit -m "Wire ChatPanel into layout and ProviderSettings into settings page"
  ```

- [ ] **Step 7:** Record learnings to `.claude/learnings-wire-chat-layout.md` using the surfacing-subagent-learnings skill.

---

## Task 9: Add Playwright tests

**Files:**
- ADD: `frontend/tests/chat-panel.spec.ts`

**Depends on:** Task 8 (everything wired up)

### Steps

- [ ] **Step 1: Identify existing Playwright test patterns**
  ```bash
  ls frontend/tests/ 2>/dev/null || ls frontend/e2e/ 2>/dev/null || echo "no test dir found"
  cat frontend/playwright.config.ts 2>/dev/null || echo "no playwright config"
  ```
  Adapt the test file location and imports to match the existing test setup. If no Playwright tests exist yet, create `frontend/tests/chat-panel.spec.ts` and a basic `frontend/playwright.config.ts`.

- [ ] **Step 2: Create the Playwright test file**

  Create `frontend/tests/chat-panel.spec.ts`:

  ```typescript
  import { test, expect } from "@playwright/test";

  test.describe("ChatPanel", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to the app (assumes login or a test route is accessible)
      // The test setup may need to handle auth — adapt to existing test patterns
      await page.goto("/");
    });

    test("desktop: chat panel is visible with header and mode selector", async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });

      // jan sona header should be visible
      await expect(page.getByText("jan sona")).toBeVisible();
      await expect(page.getByText("ready")).toBeVisible();

      // Mode selector pills
      await expect(page.getByRole("radio", { name: "free chat" })).toBeVisible();
      await expect(page.getByRole("radio", { name: "grammar" })).toBeVisible();
      await expect(page.getByRole("radio", { name: "translate" })).toBeVisible();

      // Empty state message
      await expect(page.getByText("toki! mi jan sona.")).toBeVisible();
    });

    test("desktop: can type and send a message", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });

      const textarea = page.getByPlaceholder("toki...");
      await textarea.fill("toki! mi wile kama sona");

      // Send button should be enabled
      const sendButton = page.getByRole("button", { name: /send/i }).or(
        page.locator("button[type='submit']"),
      );
      await sendButton.click();

      // User message should appear
      await expect(page.getByText("toki! mi wile kama sona")).toBeVisible();

      // Textarea should be cleared
      await expect(textarea).toHaveValue("");
    });

    test("desktop: can switch chat modes", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });

      // Default is free chat
      const freeBtn = page.getByRole("radio", { name: "free chat" });
      await expect(freeBtn).toHaveAttribute("aria-checked", "true");

      // Switch to grammar
      await page.getByRole("radio", { name: "grammar" }).click();
      await expect(
        page.getByRole("radio", { name: "grammar" }),
      ).toHaveAttribute("aria-checked", "true");
      await expect(freeBtn).toHaveAttribute("aria-checked", "false");
    });

    test("desktop: can clear chat history", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });

      // Send a message first
      const textarea = page.getByPlaceholder("toki...");
      await textarea.fill("toki");
      await page.keyboard.press("Enter");

      // Message appears
      await expect(page.getByText("toki")).toBeVisible();

      // Clear button
      await page.getByTitle("Clear chat").click();

      // Empty state should return
      await expect(page.getByText("toki! mi jan sona.")).toBeVisible();
    });

    test("desktop: chat panel can be collapsed and expanded", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });

      // Chat should be open by default
      await expect(page.getByText("jan sona")).toBeVisible();

      // Close the chat
      await page.getByTitle("Close chat").click();

      // Header should be hidden, toggle button visible
      await expect(page.getByText("jan sona")).not.toBeVisible();
      await expect(page.getByLabel("Open chat")).toBeVisible();

      // Re-open
      await page.getByLabel("Open chat").click();
      await expect(page.getByText("jan sona")).toBeVisible();
    });

    test("mobile: chat opens as bottom sheet", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });

      // Floating button should be visible
      await expect(page.getByLabel("Open chat")).toBeVisible();

      // Open sheet
      await page.getByLabel("Open chat").click();

      // Chat content should be visible in sheet
      await expect(page.getByText("jan sona")).toBeVisible();
      await expect(page.getByPlaceholder("toki...")).toBeVisible();
    });

    test("mobile: bottom sheet can be closed", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });

      // Open
      await page.getByLabel("Open chat").click();
      await expect(page.getByText("jan sona")).toBeVisible();

      // Close via the close button
      await page.getByTitle("Close chat").click();

      // Should return to floating button
      await expect(page.getByLabel("Open chat")).toBeVisible();
    });
  });

  test.describe("ProviderSettings", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/settings");
    });

    test("BYOM settings fields are present", async ({ page }) => {
      // Navigate to LLM Provider tab
      await page.getByRole("tab", { name: "LLM Provider" }).click();

      await expect(page.getByLabel("API Base URL")).toBeVisible();
      await expect(page.getByLabel("API Key")).toBeVisible();
      await expect(page.getByLabel("Model Name (optional)")).toBeVisible();
      await expect(page.getByText("Using server default")).toBeVisible();
    });

    test("BYOM settings persist in localStorage", async ({ page }) => {
      await page.getByRole("tab", { name: "LLM Provider" }).click();

      // Fill in config
      await page.getByLabel("API Base URL").fill("https://api.example.com/v1");
      await page.getByLabel("API Key").fill("sk-test-key-12345");
      await page.getByLabel("Model Name (optional)").fill("test-model");

      // Save
      await page.getByRole("button", { name: "Save" }).click();

      // Verify localStorage
      const url = await page.evaluate(() =>
        localStorage.getItem("tp-byom-url"),
      );
      const key = await page.evaluate(() =>
        localStorage.getItem("tp-byom-key"),
      );
      const model = await page.evaluate(() =>
        localStorage.getItem("tp-byom-model"),
      );

      expect(url).toBe("https://api.example.com/v1");
      expect(key).toBe("sk-test-key-12345");
      expect(model).toBe("test-model");
    });

    test("BYOM clear credentials removes localStorage", async ({ page }) => {
      // Pre-set localStorage
      await page.evaluate(() => {
        localStorage.setItem("tp-byom-url", "https://api.example.com/v1");
        localStorage.setItem("tp-byom-key", "sk-test");
        localStorage.setItem("tp-byom-model", "m");
      });

      await page.reload();
      await page.getByRole("tab", { name: "LLM Provider" }).click();

      // Status should show connected
      await expect(page.getByText("Connected to your provider")).toBeVisible();

      // Clear
      await page.getByRole("button", { name: "Clear Credentials" }).click();

      // Status reverts
      await expect(page.getByText("Using server default")).toBeVisible();

      // localStorage cleared
      const url = await page.evaluate(() =>
        localStorage.getItem("tp-byom-url"),
      );
      expect(url).toBeNull();
    });
  });
  ```

- [ ] **Step 3: Verify tests can be discovered**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx playwright test --list tests/chat-panel.spec.ts 2>&1 | head -20
  ```
  If Playwright is not installed, install it:
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npm install -D @playwright/test && npx playwright install chromium
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/tests/chat-panel.spec.ts
  git commit -m "Add Playwright tests for ChatPanel and ProviderSettings"
  ```

- [ ] **Step 5:** Record learnings to `.claude/learnings-chat-playwright-tests.md` using the surfacing-subagent-learnings skill.

---

## Task 10: Manual smoke test and final verification

**Depends on:** All previous tasks

### Steps

- [ ] **Step 1: Full TypeScript compilation check**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx tsc --noEmit 2>&1
  ```
  Fix any compilation errors.

- [ ] **Step 2: Start dev server and verify visually**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npm run dev &
  ```
  Open the app in a browser. Verify:
  - Chat panel visible on right side on desktop
  - "jan sona" header with "ready" status
  - Three mode pills (free chat / grammar / translate)
  - Empty state "toki! mi jan sona." message
  - Can type and press Enter (message appears in chat, even if server returns error)
  - Collapsing/expanding works
  - Settings page has "LLM Provider" tab with BYOM fields
  - Mobile viewport shows floating button and bottom sheet

- [ ] **Step 3: Verify sessionStorage persistence**
  Send a message in the chat, navigate to another page, navigate back. Messages should still be there. Close the tab and reopen — messages should be gone.

- [ ] **Step 4: Verify localStorage persistence for chat open state**
  Close the chat panel. Refresh the page. Chat should remain closed.

- [ ] **Step 5: Run Playwright tests**
  ```bash
  cd /home/claude/workdirs/toki-pona-dojo/frontend
  npx playwright test tests/chat-panel.spec.ts --reporter=list 2>&1
  ```
  All tests should pass. Fix any failures.

- [ ] **Step 6: Final commit (if any fixes needed)**
  ```bash
  git add -A
  git commit -m "Fix issues found during smoke testing of chat panel"
  ```

- [ ] **Step 7:** Record learnings to `.claude/learnings-chat-smoke-test.md` using the surfacing-subagent-learnings skill.

---

## Summary

| Task | Description | Files | Depends on |
|------|-------------|-------|------------|
| 1 | ChatContext for route context + open/close state | `contexts/ChatContext.tsx` | — |
| 2 | llm-client with BYOM, server proxy, SSE parsing, system prompt | `lib/llm-client.ts` | — |
| 3 | useChat hook with dual-path streaming + session persistence | `hooks/useChat.ts` | 1, 2 |
| 4 | ChatModeSelector pill component | `components/ChatModeSelector.tsx` | — |
| 5 | ChatMessage with language-aware font rendering | `components/ChatMessage.tsx` | — |
| 6 | ChatPanel with desktop sidebar + mobile bottom sheet | `components/ChatPanel.tsx` | 1, 3, 4, 5 |
| 7 | ProviderSettings BYOM config UI | `components/ProviderSettings.tsx` | 2 |
| 8 | Wire into layout + settings page | `routes/_layout.tsx`, `routes/_layout/settings.tsx` | 1, 6, 7 |
| 9 | Playwright tests | `tests/chat-panel.spec.ts` | 8 |
| 10 | Smoke test + final verification | — | 9 |

**Parallelizable groups:**
- Tasks 1, 2, 4, 5 can run in parallel (no dependencies on each other)
- Task 3 depends on 1 + 2
- Task 6 depends on 1, 3, 4, 5
- Task 7 depends on 2
- Task 8 depends on 1, 6, 7
- Tasks 9, 10 are sequential after 8
