import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

// Common toki pona words used for heuristic language detection
const TP_MARKERS = new Set([
  "mi",
  "sina",
  "ona",
  "li",
  "e",
  "la",
  "pi",
  "o",
  "pona",
  "ike",
  "toki",
  "jan",
  "ni",
  "ala",
  "ale",
  "moku",
  "telo",
  "suli",
  "lili",
  "wile",
  "ken",
  "kama",
  "pali",
  "sona",
  "lukin",
  "kepeken",
  "lon",
  "tawa",
  "tan",
  "sama",
  "mute",
  "wan",
  "tu",
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
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
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
