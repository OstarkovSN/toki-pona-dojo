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
  let prompt = SYSTEM_PROMPT_CHAT.replace("{unit}", String(ctx.currentUnit))
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

  let response: Response;
  try {
    response = await fetch(url, {
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
  } catch (err) {
    // A CORS failure manifests as a TypeError with no response body.
    if (err instanceof TypeError) {
      throw new Error(
        "Request blocked — your provider may not allow browser requests (CORS). " +
          "Try a provider that supports CORS or use the server proxy.",
      );
    }
    throw err;
  }

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
      throw new Error(
        "Rate limit reached. Try again later or add your own API key in Settings.",
      );
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
