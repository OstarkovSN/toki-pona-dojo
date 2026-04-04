# Phase 7: Frontend — Chat

> Build the always-on chat sidebar with jan sona, streaming responses, BYOM direct-call path, and context awareness.

---

## Goal

Users can chat with jan sona (the toki pona tutor) in three modes: free chat, grammar help, translation. The chat panel is always accessible. Users with their own API key bypass the server entirely.

## Prerequisites

- Phase 5 complete (layout with chat panel placeholder)
- Phase 3 complete (chat streaming endpoint)

## Architecture — Two Paths

```
Path 1: Server proxy (default)
  Browser → POST /api/v1/chat/stream → FastAPI → LLM provider
  - Used when user has no BYOM key
  - Rate-limited for anonymous users
  
Path 2: BYOM direct call
  Browser → fetch(user's baseUrl/chat/completions) → User's LLM provider
  - Used when user has their own API key in localStorage
  - No server involvement, no rate limits
  - System prompt built client-side
```

## Steps

### 7.1 ChatPanel component

Location: `frontend/src/components/ChatPanel.tsx`

**Desktop:** Fixed right sidebar, ~40% width, within the layout.
**Mobile (<768px):** Bottom sheet or tab, toggleable.

**Structure:**
1. **Header:** "jan sona" (DM Mono, bold) + status indicator ("ready" / "typing...")
2. **Mode selector (ChatModeSelector):** row of pills — `free chat` | `grammar` | `translate`. Active pill = teal bg.
3. **Message list:** scrollable container, auto-scrolls on new message
4. **Input area:** text input + send button (or Enter to send)

**Collapse/expand:** Toggle button in the layout header. State persisted in localStorage.

### 7.2 ChatMessage component

Location: `frontend/src/components/ChatMessage.tsx`

- **User messages:** right-aligned, `--bg3` background, rounded corners
- **AI messages:** left-aligned, white/`--bg` card with thin `--border` border
- **toki pona text** in messages: DM Mono, weight 500
- **English text** in messages: Lora
- Messages may contain both languages separated by a blank line — render each line with appropriate font

### 7.3 ChatModeSelector component

Location: `frontend/src/components/ChatModeSelector.tsx`

Three pill buttons in a row:
- `free chat` — open conversation in toki pona
- `grammar` — ask grammar questions, get English explanations
- `translate` — request translations with explanations

Changing mode does NOT clear the conversation. It changes the system prompt's `{mode}` parameter for the next message.

### 7.4 useChat hook

Location: `frontend/src/hooks/useChat.ts`

```typescript
interface UseChatOptions {
  mode: "free" | "grammar" | "translate";
  knownWords: string[];
  currentUnit: number;
  recentErrors: Array<{ word: string; context: string }>;
}

function useChat(options: UseChatOptions) {
  // State: messages[], isStreaming, error
  // Detects BYOM config in localStorage
  // Path 1 or 2 based on BYOM presence
  // Handles SSE parsing for both paths
  // Returns: { messages, sendMessage, isStreaming, clearHistory, error }
}
```

**SSE parsing** (shared between both paths):
```typescript
// Parse lines from the stream
for (const line of chunk.split("\n")) {
  if (line.startsWith("data: ") && line !== "data: [DONE]") {
    const data = JSON.parse(line.slice(6));
    const content = data.choices?.[0]?.delta?.content;
    if (content) appendToLastMessage(content);
  }
}
```

### 7.5 BYOM client-side call — `frontend/src/lib/llm-client.ts`

```typescript
async function callProviderDirect(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
): Promise<void>
```

- Calls `${baseUrl}/chat/completions` with `stream: true`
- Builds system prompt client-side using the same template as the server
- Parses SSE response stream
- Error handling: if the provider returns non-200, throw with the status/message

The system prompt template must be available client-side. Either:
- Hardcode it in the frontend (simplest, since it's a static string), or
- Fetch it from a backend endpoint (unnecessary complexity)

Go with hardcoded. Keep the prompt text in `llm-client.ts` or a shared constants file.

### 7.6 ProviderSettings component

Location: `frontend/src/components/ProviderSettings.tsx`

Rendered on the settings page (`_layout/settings.tsx`).

Fields:
- **API base URL** — text input, placeholder "https://api.openai.com/v1"
- **API key** — password input, stored in localStorage only (never sent to our server)
- **Model name** — text input, optional override
- **"Test connection"** button — sends a tiny test prompt, shows success/error
- **"Clear credentials"** button — removes from localStorage
- **Status indicator:** "using server default" | "connected to your provider" | "connection error"

localStorage keys: `tp-byom-url`, `tp-byom-key`, `tp-byom-model`

### 7.7 Context awareness

The chat panel receives context about the current route:

- **On lesson page:** knows which unit/exercise the user is on → system prompt includes "The learner is currently on unit X, exercise about Y"
- **On dictionary page:** if viewing a word → system prompt includes "The learner is looking at the word '{word}'"
- **On grammar page:** if viewing modifiers → system prompt includes "The learner is reading about modifier chains"

Implementation: the layout passes route context to ChatPanel via props or React context. The useChat hook includes this in the system prompt.

### 7.8 Message persistence

Chat messages are stored in `sessionStorage` (not localStorage — cleared on tab close). This prevents stale conversations but preserves messages during page navigation within a session.

## Files touched

| Action | Path |
|--------|------|
| ADD | `frontend/src/components/ChatPanel.tsx` |
| ADD | `frontend/src/components/ChatMessage.tsx` |
| ADD | `frontend/src/components/ChatModeSelector.tsx` |
| ADD | `frontend/src/components/ProviderSettings.tsx` |
| ADD | `frontend/src/hooks/useChat.ts` |
| ADD | `frontend/src/lib/llm-client.ts` |
| MODIFY | `frontend/src/routes/_layout.tsx` (wire ChatPanel into layout) |
| MODIFY | `frontend/src/routes/_layout/settings.tsx` (add ProviderSettings) |

## Risks

- BYOM path: CORS. The user's LLM provider must allow requests from the app's origin. Most OpenAI-compatible APIs do, but some self-hosted providers may not. Show a clear error message if CORS blocks the request.
- SSE parsing is fragile if chunks split across lines. Use a proper line buffer that accumulates partial lines.
- System prompt for BYOM must stay in sync with the server's system prompt. If the server prompt changes, the client prompt must be updated too. A shared constant or a fetch endpoint would prevent drift, but for MVP hardcoding is acceptable.

## Exit criteria

- Chat panel opens and closes
- Messages stream in token-by-token
- All three modes work (free/grammar/translate)
- BYOM: entering a valid API key switches to direct calls
- BYOM: "test connection" shows success/error
- Chat context updates when navigating between pages
- Mobile: chat works as bottom sheet
