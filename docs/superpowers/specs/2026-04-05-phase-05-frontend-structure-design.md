# Phase 5: Frontend — Structure

> Set up the zen theme, replace the sidebar layout with a two-panel layout, build the skill tree home page, dictionary page, and grammar pages.

---

## Goal

The app looks and feels like toki pona dojo — calm, minimal, zen. Navigation works between learn/dictionary/grammar/settings. Content pages render data from the Phase 2 API endpoints.

## Prerequisites

- Phase 2 complete (dictionary and lessons API endpoints serving data)
- Phase 4 complete (full backend stack running)

## Existing Frontend Stack

The template uses: React + TypeScript + Vite + Tailwind CSS + shadcn/ui + TanStack Router + TanStack Query. The existing layout is a sidebar-based admin dashboard (`components/Sidebar/`). We're replacing the layout paradigm but keeping the auth pages (login, signup, recover/reset password) and shadcn/ui components.

## Steps

### 5.1 Zen theme — `frontend/src/index.css`

Replace the template's default Tailwind theme with toki pona dojo's earth-tone palette. Add CSS custom properties under `:root` and `@media (prefers-color-scheme: dark)`:

**Light mode colors:**
- `--bg: #F7F4EE`, `--bg2: #EDEAE2`, `--bg3: #E2DFDA`
- `--text: #1C1A16`, `--text2: #5C5A54`, `--text3: #9A9890`
- Semantic: teal (`#1D9E75`), coral (`#D85A30`), amber (`#B87020`) with bg/dark variants
- Borders: `rgba(28,26,22,0.10)` and `rgba(28,26,22,0.18)`

**Dark mode:** Inverted palette per global_plan.md section 5.1.

**Typography:**
- Import Lora (serif) and DM Mono (monospace) from Google Fonts
- English text: Lora, 16px, line-height 1.7
- toki pona words: DM Mono, weight 500
- Labels/nav: DM Mono, 11px, uppercase, letter-spacing 0.08em

**Tailwind integration:** Define custom colors in `tailwind.config.ts` referencing the CSS variables, so Tailwind classes like `bg-bg`, `text-teal`, `border-border` work.

### 5.2 Layout replacement

**Remove:** The sidebar-based layout (`components/Sidebar/`). Keep the sidebar component files in case they're useful for admin, but the primary layout changes.

**New layout** in `frontend/src/routes/_layout.tsx`:

```
┌─────────────────────────────────────────────────┐
│  learn   dictionary   grammar          settings │  ← top nav bar
├────────────────────────────┬────────────────────┤
│                            │                    │
│      Content panel         │    Chat panel      │
│      (Outlet)              │    (Phase 7)       │
│                            │                    │
│                            │                    │
├────────────────────────────┴────────────────────┘
```

- **Top nav:** horizontal bar with `learn` | `dictionary` | `grammar` links (left), `settings` link (right). DM Mono, 11px uppercase. Active link gets teal underline.
- **Content panel:** ~60% width on desktop, full width on mobile. Renders the route's `<Outlet />`.
- **Chat panel:** ~40% width on desktop, collapsible. Placeholder div in this phase — actual chat built in Phase 7. Toggle button to show/hide.
- **Mobile (<768px):** Chat becomes a bottom tab/sheet. Content takes full width.

The layout should be **public-first** — no auth required to view content. Auth state is checked for features that need it (progress sync, unlimited LLM).

### 5.3 Route structure

Replace existing `_layout/` routes:

```
routes/
├── __root.tsx           [KEEP]
├── _layout.tsx          [MODIFY] new two-panel layout
├── _layout/
│   ├── index.tsx        [MODIFY] skill tree home
│   ├── items.tsx        [DELETE] (Phase 1)
│   ├── admin.tsx        [KEEP] admin page
│   ├── settings.tsx     [MODIFY] add BYOM config (Phase 7)
│   ├── learn/
│   │   └── $unit.$lesson.tsx  [ADD] lesson view (Phase 6)
│   ├── dictionary/
│   │   ├── index.tsx    [ADD] searchable dictionary
│   │   └── $word.tsx    [ADD] word detail page
│   └── grammar/
│       ├── index.tsx    [ADD] grammar guide index
│       ├── modifiers.tsx [ADD] modifier rules
│       └── particles.tsx [ADD] particle guide
├── login.tsx            [KEEP]
├── signup.tsx           [KEEP]
├── recover-password.tsx [KEEP]
└── reset-password.tsx   [KEEP]
```

### 5.4 Skill tree home — `_layout/index.tsx`

The home page shows:

1. **Greeting:** "o kama sona" (large, DM Mono) with subtitle "learn toki pona" (Lora, muted)
2. **Stats row** (if progress exists): words known | lessons done | day streak — three small cards
3. **Skill tree:** Vertical path of unit nodes connected by lines

**SkillTree component:**
- Renders units as nodes on a vertical path
- Parallel units (2&3, 6&7) branch left and right, then merge
- Each node shows: unit number, name (DM Mono), topic (Lora, muted), completion state

**UnitNode component:**
- States: `locked` (gray, no click), `available` (teal outline, clickable), `current` (teal fill, pulsing dot), `completed` (teal fill, checkmark)
- Click on available/current → navigates to first lesson of that unit
- Locked units show which prerequisites are needed on hover/tap

**Progress data:** Read from localStorage (anonymous) or API (authenticated). Phase 8 wires this up fully. For now, use hardcoded mock progress or empty state.

### 5.5 Dictionary page — `_layout/dictionary/index.tsx`

- **Search bar:** text input, searches word + definitions
- **Filter pills:** all | noun | verb | adj | particle | number | pre-verb | preposition (toggleable)
- **Set filter:** all | pu only | + ku suli
- **Letter jump bar:** A-Z horizontal, scrolls/jumps to section
- **Word cards (WordCard component):** word (DM Mono, bold), POS tags (colored badge pills using shadcn Badge), definitions (Lora), notes (if present)
- **Result count:** "47 of 137 words" (muted text)

Data fetched from `GET /api/v1/dictionary/words` with query params.

### 5.6 Word detail — `_layout/dictionary/$word.tsx`

- Large word heading (DM Mono)
- POS tags
- All definitions grouped by POS
- Notes
- "Used in units: 1, 4, 7" (which units introduce this word)
- Back link to dictionary

### 5.7 Grammar index — `_layout/grammar/index.tsx`

- Section list with number, title, and brief description
- Links to `/grammar/modifiers` and `/grammar/particles`
- Clean, minimal layout

### 5.8 Grammar modifiers — `_layout/grammar/modifiers.tsx`

Renders content from `grammar.json` sections:

- **GrammarChain component:** Visualizes modifier chains as colored word pills. Head word = teal, modifiers = amber, particles = coral, pi-groups = blue. Shows the toki pona chain with English meaning below.
- **Comparison tables:** Side-by-side tables (using shadcn Table)
- **Callout boxes:** Styled cards with left border accent (rules = teal, warnings = coral)
- **Interactive quiz:** Multiple choice questions from the `quiz` array. Same UI pattern as ExerciseMultiChoice (Phase 6), but simplified — just shows correct/wrong inline.

### 5.9 Grammar particles — `_layout/grammar/particles.tsx`

Guide to li, e, la, pi, o with:
- Rule explanation (Lora prose)
- Example sentences (DM Mono) with glosses
- Common mistakes callout boxes

This content may need to be authored if not fully present in the HTML artifacts. Check during data extraction.

## Component inventory (new)

| Component | Location | Purpose |
|-----------|----------|---------|
| `SkillTree` | `components/SkillTree.tsx` | Vertical path with branching nodes |
| `UnitNode` | `components/UnitNode.tsx` | Single node in skill tree |
| `WordCard` | `components/WordCard.tsx` | Dictionary word entry card |
| `GrammarChain` | `components/GrammarChain.tsx` | Modifier chain visualizer |

## Reused shadcn/ui components

Badge, Card, Input, Table, Button, Tabs, Separator, Skeleton (loading states)

## Files touched

| Action | Path |
|--------|------|
| MODIFY | `frontend/src/index.css` |
| MODIFY | `frontend/tailwind.config.ts` |
| MODIFY | `frontend/src/routes/_layout.tsx` |
| MODIFY | `frontend/src/routes/_layout/index.tsx` |
| MODIFY | `frontend/index.html` |
| ADD | `frontend/src/routes/_layout/dictionary/index.tsx` |
| ADD | `frontend/src/routes/_layout/dictionary/$word.tsx` |
| ADD | `frontend/src/routes/_layout/grammar/index.tsx` |
| ADD | `frontend/src/routes/_layout/grammar/modifiers.tsx` |
| ADD | `frontend/src/routes/_layout/grammar/particles.tsx` |
| ADD | `frontend/src/components/SkillTree.tsx` |
| ADD | `frontend/src/components/UnitNode.tsx` |
| ADD | `frontend/src/components/WordCard.tsx` |
| ADD | `frontend/src/components/GrammarChain.tsx` |

## Risks

- The template uses TanStack Router with file-based routing. Adding nested route directories (`dictionary/`, `grammar/`, `learn/`) requires running the route generation command to update `routeTree.gen.ts`.
- The template's existing sidebar component may be used by the admin page. Don't delete sidebar components — just stop using them in the main layout. Admin can keep its own layout.
- Google Fonts import adds a network dependency. Consider self-hosting fonts for offline/slow network resilience.

## Exit criteria

- App loads with zen earth-tone theme
- Top nav links work (learn/dictionary/grammar/settings)
- Skill tree renders 10 units with correct dependency graph
- Dictionary search and filter work
- Grammar pages render chains, tables, and callout boxes
- Layout is responsive (stacks on mobile)
- Dark mode toggle works
