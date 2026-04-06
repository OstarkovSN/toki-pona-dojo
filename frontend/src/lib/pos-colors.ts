/**
 * POS → Tailwind class mapping. Shared by WordCard and word detail page.
 * Colors use CSS variables from index.css that automatically switch in dark mode.
 */
export const POS_COLORS: Record<string, string> = {
  noun: "bg-zen-teal-bg text-zen-teal-dark",
  verb: "bg-zen-coral-bg text-zen-coral-dark",
  adjective: "bg-zen-amber-bg text-zen-amber-dark",
  "pre-verb": "bg-zen-amber-bg text-zen-amber-dark",
  particle: "bg-zen-blue-bg text-zen-blue-dark",
  number: "bg-zen-bg3 text-zen-text2",
  preposition: "bg-zen-coral-bg text-zen-coral-dark",
}
