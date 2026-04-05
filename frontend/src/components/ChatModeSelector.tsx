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
