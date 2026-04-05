# toki pona dojo — implementation spec

> This document is the single source of truth for building toki pona dojo.
> It is written for Claude Code to execute against a freshly cloned
> `fastapi/full-stack-fastapi-template` repo.

---

## 0. Context & constraints

| Key | Value |
|-----|-------|
| Base template | `fastapi/full-stack-fastapi-template` (latest release) |
| LLM access | OpenAI-compatible endpoint via `OPENAI_BASE_URL` + `OPENAI_API_TOKEN` + `MODEL` from `.env` |
| LLM budget | Use **only** the model specified in `MODEL` env var — no other models, no fallback |
| Auth | The template ships JWT auth — keep it, make it optional (anonymous users can use the app with limited LLM access) |
| Frontend | React + Vite + TypeScript + Tailwind + shadcn/ui (already in template) |
| Backend | FastAPI + SQLModel + PostgreSQL + Alembic (already in template) |
| DDoS guard | CrowdSec + Traefik bouncer (added to Docker Compose) |
| Aesthetic | Calm, minimal, zen — matches toki pona philosophy. Earth tones, generous whitespace, serif for English, monospace for toki pona words |
| Reference artifacts | Three HTML files are attached to this project: `toki_pona_dojo.html`, `toki_pona_modifiers.html`, `toki_pona_dictionary.html`. Extract all content data (word lists, exercises, grammar rules, stories) from these files. |

---

## 1. .env additions

Add these to the existing `.env` file. Do not remove any existing template variables.

```env
# ── LLM provider (OpenAI-compatible) ──
OPENAI_BASE_URL=changethis
OPENAI_API_TOKEN=changethis
MODEL=changethis

# ── LLM rate limiting (anonymous users) ──
CHAT_FREE_DAILY_LIMIT=20
CHAT_FREE_MAX_TOKENS=500

# ── CrowdSec ──
CROWDSEC_BOUNCER_KEY=changethis

# ── Telegram bot (optional, for streak reminders) ──
TG_BOT_TOKEN=changethis
```

---

## 2. Project structure (what to add / modify)

The template has this structure. Lines marked `[KEEP]` stay as-is, `[MODIFY]` get edited, `[ADD]` are new, `[REMOVE]` get deleted.

```
.
├── .env                              [MODIFY] add new vars from §1
├── compose.yml                       [MODIFY] add crowdsec services
├── compose.override.yml              [MODIFY] add crowdsec dev config
├── compose.traefik.yml               [MODIFY] add bouncer middleware
│
├── crowdsec/                         [ADD] CrowdSec config
│   └── acquis.yaml                   [ADD] log acquisition config
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py             [MODIFY] add LLM + CrowdSec settings
│   │   │   └── security.py           [KEEP]
│   │   │
│   │   ├── models/                   [MODIFY]
│   │   │   ├── item.py               [REMOVE] template demo model
│   │   │   ├── user.py               [KEEP]
│   │   │   ├── progress.py           [ADD] user learning progress
│   │   │   └── chat.py               [ADD] chat message schemas
│   │   │
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── items.py          [REMOVE] template demo routes
│   │   │   │   ├── users.py          [KEEP]
│   │   │   │   ├── login.py          [KEEP]
│   │   │   │   ├── chat.py           [ADD] LLM chat endpoint
│   │   │   │   ├── lessons.py        [ADD] lesson content API
│   │   │   │   ├── progress.py       [ADD] progress CRUD
│   │   │   │   └── dictionary.py     [ADD] dictionary + grammar API
│   │   │   └── main.py              [MODIFY] register new routers
│   │   │
│   │   ├── services/
│   │   │   ├── llm.py                [ADD] OpenAI-compat client wrapper
│   │   │   └── srs.py                [ADD] SM-2 spaced repetition logic
│   │   │
│   │   └── data/                     [ADD] static content (extracted from HTML artifacts)
│   │       ├── words.json            [ADD] all 137 toki pona words
│   │       ├── exercises.json        [ADD] exercise bank
│   │       ├── stories.json          [ADD] reading comprehension stories
│   │       ├── grammar.json          [ADD] grammar rules + examples
│   │       └── sitelen_pona.json     [ADD] glyph data
│   │
│   └── alembic/versions/            [ADD] new migration for progress table
│
├── frontend/
│   ├── src/
│   │   ├── client/                   [MODIFY] regenerate API client after backend changes
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                   [KEEP] shadcn components
│   │   │   ├── Layout.tsx            [MODIFY] two-panel layout with chat sidebar
│   │   │   ├── ChatPanel.tsx         [ADD] always-on chat sidebar
│   │   │   ├── ChatMessage.tsx       [ADD] message bubble component
│   │   │   ├── ChatModeSelector.tsx  [ADD] mode pill selector
│   │   │   ├── LessonCard.tsx        [ADD] exercise renderer
│   │   │   ├── SkillTree.tsx         [ADD] unit progression path
│   │   │   ├── UnitNode.tsx          [ADD] single node in skill tree
│   │   │   ├── ExerciseMatch.tsx     [ADD] match pairs exercise
│   │   │   ├── ExerciseMultiChoice.tsx [ADD] multiple choice
│   │   │   ├── ExerciseWordBank.tsx  [ADD] word bank / unscramble
│   │   │   ├── ExerciseFillParticle.tsx [ADD] fill-the-blank for particles
│   │   │   ├── ExerciseFreeCompose.tsx [ADD] free text (LLM-graded)
│   │   │   ├── ExerciseConceptBuild.tsx [ADD] concept building (LLM-graded)
│   │   │   ├── ExerciseStory.tsx     [ADD] story comprehension
│   │   │   ├── ProgressBar.tsx       [ADD] thin lesson progress bar
│   │   │   ├── FeedbackToast.tsx     [ADD] correct/incorrect feedback
│   │   │   ├── WordCard.tsx          [ADD] dictionary word entry
│   │   │   ├── GrammarChain.tsx      [ADD] modifier chain visualizer
│   │   │   └── ProviderSettings.tsx  [ADD] BYOM key/URL config
│   │   │
│   │   ├── hooks/
│   │   │   ├── useChat.ts           [ADD] streaming chat hook
│   │   │   ├── useProgress.ts       [ADD] progress state management
│   │   │   ├── useLessons.ts        [ADD] lesson data + navigation
│   │   │   └── useSRS.ts            [ADD] client-side SRS scheduling
│   │   │
│   │   ├── routes/
│   │   │   ├── _layout.tsx          [MODIFY] add chat panel to layout
│   │   │   ├── index.tsx            [MODIFY] skill tree home
│   │   │   ├── learn/
│   │   │   │   └── $unit.$lesson.tsx [ADD] lesson view
│   │   │   ├── dictionary/
│   │   │   │   ├── index.tsx        [ADD] searchable dictionary
│   │   │   │   └── $word.tsx        [ADD] word detail page
│   │   │   ├── grammar/
│   │   │   │   ├── index.tsx        [ADD] grammar guide index
│   │   │   │   ├── modifiers.tsx    [ADD] modifier rules (from artifact)
│   │   │   │   └── particles.tsx    [ADD] particle guide
│   │   │   └── settings.tsx         [ADD] profile + BYOM config
│   │   │
│   │   ├── lib/
│   │   │   ├── llm-client.ts        [ADD] direct browser-to-provider fetch
│   │   │   ├── srs.ts               [ADD] SM-2 algorithm (client-side)
│   │   │   └── progress-store.ts    [ADD] localStorage wrapper for progress
│   │   │
│   │   └── styles/
│   │       └── globals.css          [MODIFY] zen theme colors + typography
│   │
│   └── index.html                   [MODIFY] update title + meta
│
└── README.md                        [MODIFY] project-specific docs
```

---

## 3. Data extraction from HTML artifacts

Extract the following data from the three attached HTML files and save as JSON in `backend/app/data/`.

### 3.1 words.json — from `toki_pona_dictionary.html`

Extract the `WORDS` array from the `<script>` block. Each entry has:

```json
{
  "word": "jan",
  "ku": false,
  "pos": ["noun", "adj"],
  "definitions": [
    { "pos": "noun", "definition": "person, people, humanity, somebody" },
    { "pos": "adjective", "definition": "human-like, personal" }
  ],
  "note": null
}
```

There are approximately 137 words. Keep all fields including `ku` flag and `note`.

### 3.2 exercises.json — from `toki_pona_dojo.html`

Extract all exercise data from the script block:

- `SQ` object → sentence quiz data (tp2en, en2tp, grammar modes)
- `WB` array → word building challenges
- `US` array → unscramble exercises
- `SP` array → sitelen pona data
- `PT` array → particle fill-in exercises
- `ST` array → story time data with questions
- `RV` array → reverse build scenes
- `FC_ALL` array → flashcard data with categories

Structure as:

```json
{
  "flashcards": [ ... ],
  "sentence_quiz": { "tp2en": [...], "en2tp": [...], "grammar": [...] },
  "word_building": [ ... ],
  "unscramble": [ ... ],
  "sitelen_pona": [ ... ],
  "particles": [ ... ],
  "stories": [ ... ],
  "reverse_build": [ ... ]
}
```

### 3.3 grammar.json — from `toki_pona_modifiers.html`

Extract the structured grammar content:

- Section titles and prose explanations
- Chain examples (head word, modifiers, particles, pi-groups, predicates) with meanings
- Comparison tables (mute vs suli, quick reference)
- Callout boxes (rules, warnings)
- Quiz questions from the `Qs` array

Structure as:

```json
{
  "sections": [
    {
      "id": "core-rule",
      "number": "01",
      "title": "the core rule",
      "content": "...",
      "chains": [ ... ],
      "callouts": [ ... ]
    }
  ],
  "comparisons": [ ... ],
  "quiz": [ ... ]
}
```

---

## 4. Backend implementation

### 4.1 Config additions — `backend/app/core/config.py`

Add to the existing `Settings` class:

```python
OPENAI_BASE_URL: str = "https://api.openai.com/v1"
OPENAI_API_TOKEN: str = "changethis"
MODEL: str = "gpt-4o-mini"

CHAT_FREE_DAILY_LIMIT: int = 20
CHAT_FREE_MAX_TOKENS: int = 500

TG_BOT_TOKEN: str | None = None
```

### 4.2 Database models — `backend/app/models/progress.py`

```python
class UserProgress(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    
    # Unit/lesson completion
    completed_units: list[int] = Field(default=[], sa_column=Column(JSON))
    completed_lessons: list[str] = Field(default=[], sa_column=Column(JSON))  # "unit:lesson" format
    current_unit: int = Field(default=1)
    
    # SRS data — per-word review state
    srs_data: dict = Field(default={}, sa_column=Column(JSON))
    # Format: { "jan": { "interval": 1, "ease": 2.5, "due": "2025-01-01", "reps": 3 }, ... }
    
    # Stats
    total_correct: int = Field(default=0)
    total_answered: int = Field(default=0)
    streak_days: int = Field(default=0)
    last_activity: datetime | None = None
    
    # Words the user has been exposed to
    known_words: list[str] = Field(default=[], sa_column=Column(JSON))
    
    # Recent errors for LLM context
    recent_errors: list[dict] = Field(default=[], sa_column=Column(JSON))
    # Format: [{ "word": "li", "type": "particle", "context": "mi li moku", "timestamp": "..." }]

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### 4.3 Chat schemas — `backend/app/models/chat.py`

```python
from pydantic import BaseModel

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    mode: str = "free"  # "free" | "grammar" | "translate"
    # Client sends learner context for system prompt construction
    known_words: list[str] = []
    current_unit: int = 1
    recent_errors: list[dict] = []

class ChatResponse(BaseModel):
    content: str
    
class ExerciseGradeRequest(BaseModel):
    exercise_type: str  # "free_compose" | "concept_build"
    prompt: str
    user_answer: str
    known_words: list[str] = []

class ExerciseGradeResponse(BaseModel):
    correct: bool
    score: float  # 0.0 - 1.0
    feedback: str
    suggested_answer: str | None = None
```

### 4.4 LLM service — `backend/app/services/llm.py`

```python
from openai import OpenAI
from app.core.config import settings

def get_llm_client() -> OpenAI:
    """Create OpenAI-compatible client from .env config."""
    return OpenAI(
        base_url=settings.OPENAI_BASE_URL,
        api_key=settings.OPENAI_API_TOKEN,
    )

SYSTEM_PROMPT_CHAT = """You are jan sona, a toki pona tutor on the site "toki pona dojo."

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
- If the user writes in toki pona, respond primarily in toki pona"""

SYSTEM_PROMPT_GRADE = """You are a toki pona grading assistant. Grade the user's toki pona answer.

Respond in this exact JSON format:
{{"correct": true/false, "score": 0.0-1.0, "feedback": "...", "suggested_answer": "..." or null}}

Be generous — toki pona has multiple valid translations. A response is correct if it communicates the intended meaning using valid toki pona grammar, even if the phrasing differs from the expected answer.

Known words the learner has studied: {words}"""

def build_chat_system_prompt(mode: str, known_words: list[str], current_unit: int, recent_errors: list[dict]) -> str:
    errors_str = "; ".join([f"{e.get('word', '?')}: {e.get('context', '?')}" for e in recent_errors[-5:]]) or "none"
    return SYSTEM_PROMPT_CHAT.format(
        unit=current_unit,
        words=", ".join(known_words) if known_words else "mi, sina, pona, ike, toki",
        errors=errors_str,
        mode=mode,
    )

def build_grade_system_prompt(known_words: list[str]) -> str:
    return SYSTEM_PROMPT_GRADE.format(
        words=", ".join(known_words) if known_words else "all basic words",
    )
```

### 4.5 Chat endpoint — `backend/app/api/routes/chat.py`

```python
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
import json

from app.models.chat import ChatRequest, ExerciseGradeRequest, ExerciseGradeResponse
from app.services.llm import get_llm_client, build_chat_system_prompt, build_grade_system_prompt
from app.core.config import settings
from app.api.deps import CurrentUser, OptionalUser

router = APIRouter(prefix="/chat", tags=["chat"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/stream")
@limiter.limit(f"{settings.CHAT_FREE_DAILY_LIMIT}/day")
async def chat_stream(
    request: Request,
    body: ChatRequest,
    user: OptionalUser = None,  # works for both anon and authenticated
):
    """Stream a chat response from the LLM.
    
    Anonymous users: rate-limited to CHAT_FREE_DAILY_LIMIT/day.
    Authenticated users: no rate limit (they use server-side LLM).
    Users with their own API key: call their provider directly from the browser, never hit this endpoint.
    """
    client = get_llm_client()
    system = build_chat_system_prompt(
        mode=body.mode,
        known_words=body.known_words,
        current_unit=body.current_unit,
        recent_errors=body.recent_errors,
    )
    
    messages = [{"role": "system", "content": system}]
    messages += [{"role": m.role, "content": m.content} for m in body.messages]
    
    stream = client.chat.completions.create(
        model=settings.MODEL,
        messages=messages,
        max_tokens=settings.CHAT_FREE_MAX_TOKENS if user is None else 1500,
        stream=True,
    )
    
    def generate():
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/grade", response_model=ExerciseGradeResponse)
@limiter.limit(f"{settings.CHAT_FREE_DAILY_LIMIT}/day")
async def grade_exercise(
    request: Request,
    body: ExerciseGradeRequest,
    user: OptionalUser = None,
):
    """Grade a free-form toki pona exercise using the LLM."""
    client = get_llm_client()
    system = build_grade_system_prompt(body.known_words)
    
    user_msg = f"Exercise type: {body.exercise_type}\nPrompt: {body.prompt}\nUser's answer: {body.user_answer}"
    
    response = client.chat.completions.create(
        model=settings.MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=300,
    )
    
    try:
        result = json.loads(response.choices[0].message.content)
        return ExerciseGradeResponse(**result)
    except (json.JSONDecodeError, KeyError):
        return ExerciseGradeResponse(
            correct=False,
            score=0.0,
            feedback="I couldn't grade this — please try rephrasing your answer.",
            suggested_answer=None,
        )
```

### 4.6 Lessons endpoint — `backend/app/api/routes/lessons.py`

Serve lesson content from the static JSON files. No database needed — content is read-only.

```python
router = APIRouter(prefix="/lessons", tags=["lessons"])

@router.get("/units")
async def get_units():
    """Return the skill tree structure — all units with their lessons and status."""
    # Load from exercises.json + words.json
    # Return unit tree with word lists per unit
    pass

@router.get("/units/{unit_id}/lessons/{lesson_id}")
async def get_lesson(unit_id: int, lesson_id: int):
    """Return exercises for a specific lesson."""
    # Select 5-7 exercises from the exercise bank
    # Mix types based on unit level:
    #   Units 1-3: match pairs, multiple choice only
    #   Units 4-6: add word bank, fill particle
    #   Units 7-10: add free compose, concept build (LLM-graded)
    pass
```

### 4.7 Dictionary endpoint — `backend/app/api/routes/dictionary.py`

```python
router = APIRouter(prefix="/dictionary", tags=["dictionary"])

@router.get("/words")
async def search_words(q: str = "", pos: str = "all", set: str = "all"):
    """Search and filter the dictionary."""
    pass

@router.get("/words/{word}")
async def get_word(word: str):
    """Get full details for a specific word."""
    pass

@router.get("/grammar")
async def get_grammar():
    """Return all grammar guide content."""
    pass

@router.get("/grammar/{section_id}")
async def get_grammar_section(section_id: str):
    """Return a specific grammar section."""
    pass
```

### 4.8 Progress endpoint — `backend/app/api/routes/progress.py`

```python
router = APIRouter(prefix="/progress", tags=["progress"])

@router.get("/me")
async def get_my_progress(user: CurrentUser):
    """Get the authenticated user's progress."""
    pass

@router.put("/me")
async def update_progress(user: CurrentUser, data: ProgressUpdate):
    """Update progress after completing a lesson or exercise."""
    pass

@router.post("/sync")
async def sync_progress(user: CurrentUser, data: ProgressSync):
    """Sync localStorage progress to the server (for users who sign up after playing anonymously)."""
    pass
```

### 4.9 SRS service — `backend/app/services/srs.py`

Implement SM-2 algorithm:

```python
def sm2(quality: int, reps: int, ease: float, interval: int) -> tuple[int, float, int]:
    """
    SM-2 spaced repetition algorithm.
    
    quality: 0-5 (0-1 = wrong, 2 = hard, 3 = ok, 4 = easy, 5 = perfect)
    reps: number of consecutive correct reviews
    ease: easiness factor (>= 1.3)
    interval: days until next review
    
    Returns: (new_reps, new_ease, new_interval)
    """
    if quality < 3:
        return 0, max(1.3, ease - 0.2), 1
    
    if reps == 0:
        new_interval = 1
    elif reps == 1:
        new_interval = 6
    else:
        new_interval = round(interval * ease)
    
    new_ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ease = max(1.3, new_ease)
    
    return reps + 1, new_ease, new_interval
```

### 4.10 Rate limiting setup

Install `slowapi`:

```bash
pip install slowapi
```

Add to `backend/app/main.py`:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

### 4.11 Remove template demo

- Delete `backend/app/models/item.py` and all references
- Delete `backend/app/api/routes/items.py` and remove from router registration
- Remove item-related tests
- Remove frontend item pages/components
- Keep all user/auth/login infrastructure

---

## 5. Frontend implementation

### 5.1 Theme — `frontend/src/styles/globals.css`

Replace the template's default theme with the zen toki pona aesthetic:

```css
:root {
  /* ── Earth tones ── */
  --bg: #F7F4EE;
  --bg2: #EDEAE2;
  --bg3: #E2DFDA;
  --text: #1C1A16;
  --text2: #5C5A54;
  --text3: #9A9890;
  
  /* ── Semantic ── */
  --teal: #1D9E75;
  --teal-bg: #E1F5EE;
  --teal-dark: #085041;
  --coral: #D85A30;
  --coral-bg: #FAECE7;
  --coral-dark: #712B13;
  --amber: #B87020;
  --amber-bg: #FDF0DC;
  --amber-dark: #6B3E08;
  --blue-bg: #E6F1FB;
  --blue-dark: #0C3060;
  
  /* ── Borders ── */
  --border: rgba(28,26,22,0.10);
  --border2: rgba(28,26,22,0.18);
  
  --radius: 6px;
  --radius-lg: 10px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #18170F;
    --bg2: #201F16;
    --bg3: #2A291E;
    --text: #F0EDE6;
    --text2: #A8A59C;
    --text3: #6B6860;
    --border: rgba(240,237,230,0.08);
    --border2: rgba(240,237,230,0.16);
    --teal-bg: #04342C;
    --teal-dark: #9FE1CB;
    --coral-bg: #4A1B0C;
    --coral-dark: #F0997B;
    --amber-bg: #3A2004;
    --amber-dark: #FAC775;
    --blue-bg: #042C53;
    --blue-dark: #B5D4F4;
  }
}
```

**Typography rules:**
- English explanatory text: serif font (Georgia, Lora, or system serif)
- toki pona words/sentences: monospace font (DM Mono or system mono), weight 500
- Labels/navigation: monospace, 11px, uppercase, letter-spacing 0.08em
- Body: serif, 16px, line-height 1.7
- Load fonts: `@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@400;500&display=swap');`

### 5.2 Layout — two-panel with persistent chat

The root layout renders:
1. Top navigation bar: `learn` | `dictionary` | `grammar` | (spacer) | `settings`
2. Main content area (left panel, ~60% width on desktop)
3. Chat panel (right panel, ~40% width on desktop, collapsible)
4. On mobile (<768px): chat becomes a bottom sheet / tab

```
┌─────────────────────────────────────────────────┐
│  learn   dictionary   grammar          settings │  ← top nav
├────────────────────────────┬────────────────────┤
│                            │                    │
│      Content panel         │    jan sona chat   │
│      (exercises,           │    (always here)   │
│       dictionary,          │                    │
│       grammar)             │                    │
│                            │                    │
│                            ├────────────────────┤
│                            │  [type here...]    │
├────────────────────────────┴────────────────────┘
```

### 5.3 Streaming chat hook — `frontend/src/hooks/useChat.ts`

```typescript
interface UseChatOptions {
  mode: "free" | "grammar" | "translate";
  knownWords: string[];
  currentUnit: number;
  recentErrors: Array<{ word: string; context: string }>;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function useChat(options: UseChatOptions) {
  // State: messages[], isStreaming, error
  
  // Two paths:
  // 1. User has own API key in localStorage → call provider directly (browser fetch)
  // 2. No key → call /api/v1/chat/stream (server proxy, rate-limited)
  
  // For path 1: build system prompt client-side, call user's OPENAI_BASE_URL
  // For path 2: send known_words, current_unit, recent_errors in request body
  
  // Handle SSE streaming, append chunks to last message
  // Return: { messages, sendMessage, isStreaming, clearHistory }
}
```

**BYOM client-side call:**

```typescript
// When user has their own key stored in localStorage
async function callProviderDirect(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // Parse SSE lines, extract content deltas
    for (const line of chunk.split("\n")) {
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        const data = JSON.parse(line.slice(6));
        const content = data.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      }
    }
  }
}
```

### 5.4 Skill tree — home page

The home page shows:
1. A greeting: "o kama sona" with subtitle showing progress ("3 of 20 units complete")
2. Three stats in a row: words known, lessons done, day streak
3. A vertical skill tree path with branching nodes

**Unit structure (10 units for MVP):**

| Unit | Name | Topic | Words introduced | Exercise types |
|------|------|-------|-----------------|----------------|
| 1 | toki! | Greetings | mi, sina, pona, ike, toki, moku | match, multichoice |
| 2 | ijo | Core nouns | jan, tomo, telo, soweli, suno, ma, nimi | match, multichoice |
| 3 | pali | Actions | moku, lukin, toki, lape, pali, kama, jo | match, multichoice |
| 4 | li · e | Sentence structure | li, e, ona, ni, seme | + word bank, fill particle |
| 5 | nasin nimi | Modifiers | mute, lili, suli, wawa, sin, ante | + word bank |
| 6 | pi | Modifier grouping | pi, sona, kalama, ilo, nasin | + free compose |
| 7 | la | Context & time | la, tenpo, sike, open, pini | + free compose |
| 8 | o! | Commands & wishes | o, wile, ken, lukin (pre-verb) | + concept build |
| 9 | toki musi | Creative expression | olin, pilin, musi, sitelen, kalama | + story |
| 10 | jan sona | Fluency practice | Review all + lon, tawa, tan, kepeken | all types |

Units 2+3 and 6+7 are parallel (user can do either first). Unit 4 requires both 2 and 3. Unit 8 requires both 6 and 7.

### 5.5 Lesson view

Each lesson contains 5-7 exercises. The view shows:

1. Progress bar (thin, top, teal fill, no percentage text)
2. Label: "unit 4 · particles · exercise 3 of 5"
3. Exercise component (varies by type)
4. Feedback toast (slides up from bottom of exercise area)
5. Next button

**Exercise component selection:**

```typescript
function renderExercise(exercise: Exercise) {
  switch (exercise.type) {
    case "match": return <ExerciseMatch {...exercise} />;
    case "multichoice": return <ExerciseMultiChoice {...exercise} />;
    case "word_bank": return <ExerciseWordBank {...exercise} />;
    case "fill_particle": return <ExerciseFillParticle {...exercise} />;
    case "free_compose": return <ExerciseFreeCompose {...exercise} />;
    case "concept_build": return <ExerciseConceptBuild {...exercise} />;
    case "story": return <ExerciseStory {...exercise} />;
  }
}
```

### 5.6 Exercise components — behavior spec

**ExerciseMatch:**
- Two columns of tappable items (toki pona words left, English meanings right)
- Tap one from each side to match
- Correct matches get teal highlight and become disabled
- Wrong matches flash coral briefly
- Complete when all matched

**ExerciseMultiChoice:**
- Prompt: either toki pona sentence or English sentence
- 4 options as full-width buttons
- On tap: correct → teal, wrong → coral + show correct answer
- Below: feedback explanation text

**ExerciseWordBank:**
- English sentence shown as prompt
- Drop zone (dashed border, empty state text)
- Word bank below: tappable pills
- Tap pill → moves to drop zone. Tap placed word → returns to bank.
- "Check" button validates against correct answer
- Multiple correct orderings accepted

**ExerciseFillParticle:**
- Sentence with blank: "jan ___ toki"
- 4 particle options: li, e, la, pi
- English translation hint below
- Same correct/wrong behavior as multichoice

**ExerciseFreeCompose (LLM-graded):**
- Prompt: "Say 'the big house' in toki pona"
- Textarea for free input
- "Check" button → calls `/api/v1/chat/grade`
- Shows LLM feedback with score

**ExerciseConceptBuild (LLM-graded):**
- Prompt: concept in English (e.g., "library")
- Hint text (e.g., "a place for knowledge/books")
- Textarea for free input
- "Check" button → LLM grades
- "Show one approach" button reveals a good answer

**ExerciseStory:**
- toki pona paragraph
- 1-2 multiple choice comprehension questions
- "Reveal translation" button shows English

### 5.7 Chat panel — component spec

**ChatPanel.tsx:**
- Fixed right sidebar (desktop) or bottom sheet (mobile)
- Header: "jan sona" + status indicator (ready / typing...)
- Mode selector: row of pills — `free chat` | `grammar` | `translate`
- Message list: scrollable, auto-scroll on new message
- Input: text field + send button
- Messages stream in token-by-token

**ChatMessage.tsx:**
- User messages: right-aligned, linen/stone background
- AI messages: left-aligned, white card with thin border
- Correction messages: left-aligned with amber left-border accent, italic

**Context awareness:**
The chat panel receives the current route context:
- On lesson page: knows which unit/exercise the user is on
- On dictionary page: can reference the word being viewed
- On grammar page: can explain the section being read

### 5.8 Dictionary page

Reuse data from `toki_pona_dictionary.html`:
- Search bar (searches word + definitions)
- Filter pills: all | noun | verb | adj | particle | number | pre-verb | preposition
- Set filter: all | pu only | + ku suli
- Alphabetical letter jump bar
- Word cards: word (monospace, bold), POS tags (colored pills), definitions, notes
- Result count: "47 of 137 words"

### 5.9 Grammar pages

Reuse content from `toki_pona_modifiers.html`:
- `/grammar` — index with links to sections
- `/grammar/modifiers` — full modifier guide with:
  - Chain visualizations (colored word pills showing head/modifier/particle/pi-group)
  - Comparison tables
  - Callout boxes
  - Interactive quiz at bottom
- `/grammar/particles` — guide to li, e, la, pi, o with examples

### 5.10 Settings page

- Profile stats (if logged in): words known, streak, accuracy
- **LLM provider config (BYOM):**
  - API base URL field (default: empty — uses server)
  - API key field (password type, stored in localStorage only)
  - Model name field (optional override)
  - "Test connection" button → sends a tiny test prompt
  - "Clear credentials" button
  - Status indicator: connected / error / using server default
- Theme toggle (light/dark/system)

### 5.11 Progress storage

**Anonymous users (no account):**
- All progress in localStorage
- Keys: `tp-progress`, `tp-srs`, `tp-streak`, `tp-settings`
- SRS intervals in client-side SM-2

**Authenticated users:**
- Progress synced to Postgres via `/api/v1/progress`
- localStorage is the write-ahead buffer
- On login: merge localStorage progress into server state (take the higher value for each field)

---

## 6. CrowdSec integration

### 6.1 Docker Compose additions — `compose.yml`

Add these services alongside the existing ones:

```yaml
services:
  crowdsec:
    image: crowdsecurity/crowdsec:latest
    container_name: crowdsec
    restart: unless-stopped
    environment:
      COLLECTIONS: "crowdsecurity/traefik crowdsecurity/http-cve crowdsecurity/whitelist-good-actors"
      GID: "1000"
    volumes:
      - crowdsec-config:/etc/crowdsec
      - crowdsec-data:/var/lib/crowdsec/data
      - ./crowdsec/acquis.yaml:/etc/crowdsec/acquis.yaml:ro
      - traefik-logs:/var/log/traefik:ro
    networks:
      - traefik-public
    expose:
      - "8080"

  crowdsec-bouncer:
    image: fbonalair/traefik-crowdsec-bouncer:latest
    container_name: crowdsec-bouncer
    restart: unless-stopped
    environment:
      CROWDSEC_BOUNCER_API_KEY: ${CROWDSEC_BOUNCER_KEY}
      CROWDSEC_AGENT_HOST: crowdsec:8080
    networks:
      - traefik-public
    depends_on:
      - crowdsec

volumes:
  crowdsec-config:
  crowdsec-data:
  traefik-logs:
```

### 6.2 CrowdSec acquisition — `crowdsec/acquis.yaml`

```yaml
filenames:
  - /var/log/traefik/access.log
labels:
  type: traefik
```

### 6.3 Traefik config additions

Add ForwardAuth middleware for the bouncer. In the Traefik dynamic config (or via Docker labels):

```yaml
http:
  middlewares:
    crowdsec:
      forwardAuth:
        address: http://crowdsec-bouncer:8080/api/v1/forwardAuth
        trustForwardHeader: true

    rate-limit:
      rateLimit:
        average: 100
        burst: 50
        period: 1s
```

Apply both middlewares to the app's router in compose labels.

### 6.4 Traefik access logging

Ensure Traefik writes access logs to the shared volume:

```yaml
services:
  traefik:
    # ... existing config ...
    command:
      # ... existing commands ...
      - --accesslog=true
      - --accesslog.filepath=/var/log/traefik/access.log
      - --accesslog.bufferingsize=100
    volumes:
      - traefik-logs:/var/log/traefik
```

### 6.5 Post-deploy setup

After first `docker compose up`:

```bash
# Register the bouncer
docker exec crowdsec cscli bouncers add traefik-bouncer
# Copy the generated key into .env as CROWDSEC_BOUNCER_KEY

# Verify CrowdSec is parsing logs
docker exec crowdsec cscli metrics

# Test blocking
docker exec crowdsec cscli decisions add --ip 192.168.1.100 --reason "test" --duration 1m
# Verify the IP gets 403, then it auto-expires
```

---

## 7. Telegram bot (optional, minimal)

A lightweight bot that sends daily streak reminders. Only implement if `TG_BOT_TOKEN` is set.

### 7.1 Backend — `backend/app/services/telegram.py`

```python
import httpx
from app.core.config import settings

async def send_streak_reminder(chat_id: str, streak: int, words_known: int):
    """Send a daily streak reminder via Telegram."""
    if not settings.TG_BOT_TOKEN:
        return
    
    if streak > 0:
        msg = f"🌱 o kama sona! Your streak is {streak} days. You know {words_known} words. Keep going!"
    else:
        msg = f"🌱 o kama sona! Come back and practice — your streak needs you!"
    
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{settings.TG_BOT_TOKEN}/sendMessage",
            json={"chat_id": chat_id, "text": msg},
        )
```

### 7.2 User model addition

Add optional `telegram_chat_id: str | None = None` to the User model for users who opt in.

### 7.3 Webhook endpoint — `backend/app/api/routes/telegram.py`

```python
@router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    """Handle /start command to register chat_id."""
    data = await request.json()
    # Parse /start command, extract chat_id
    # Link to user account via a one-time code
    pass
```

---

## 8. Testing

### 8.1 Backend tests

Add to `backend/tests/`:

```
tests/
├── api/
│   ├── test_chat.py          # Test chat endpoint, rate limiting, streaming
│   ├── test_lessons.py        # Test lesson content serving
│   ├── test_dictionary.py     # Test search, filtering
│   └── test_progress.py       # Test CRUD, SRS calculations
├── services/
│   ├── test_llm.py            # Test prompt building, mock LLM responses
│   └── test_srs.py            # Test SM-2 algorithm
└── data/
    └── test_data_integrity.py # Validate JSON data files (all words present, no broken references)
```

**Key test cases:**

- Chat endpoint returns 429 after CHAT_FREE_DAILY_LIMIT requests from same IP
- Chat endpoint allows unlimited requests from authenticated users
- LLM client uses MODEL from .env, not hardcoded
- SM-2 algorithm returns correct intervals for quality 0-5
- Dictionary search matches on word and definition text
- Lesson endpoint returns exercises appropriate for unit level
- Exercise types are valid for the unit's progression level
- All 137 words are present in words.json
- All exercise answers reference valid words
- Progress sync merges localStorage data correctly

### 8.2 Frontend tests

Add Playwright E2E tests:

- Skill tree renders with correct unit states (done/current/locked)
- Clicking a lesson node navigates to the lesson view
- Completing all exercises in a lesson shows completion screen
- Dictionary search filters results
- Chat panel opens/closes on mobile
- BYOM settings persist in localStorage
- Exercise feedback appears correctly for right/wrong answers

### 8.3 Data integrity validation script

Create `backend/scripts/validate_data.py`:

```python
"""Validate all JSON data files for completeness and cross-references."""
# Check:
# - words.json has >= 130 entries
# - All exercise answers use valid toki pona words from words.json
# - All flashcard categories have at least 3 entries
# - Story questions reference valid answer indices
# - Grammar chains use valid word categories
# - No duplicate word entries
# - All required fields are present
```

---

## 9. Deployment checklist

Before going live:

1. [ ] Change all `changethis` values in `.env`
2. [ ] Generate secret keys: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
3. [ ] Set `OPENAI_BASE_URL`, `OPENAI_API_TOKEN`, `MODEL` to your provider
4. [ ] Register CrowdSec bouncer: `docker exec crowdsec cscli bouncers add traefik-bouncer`
5. [ ] Copy bouncer key to `.env` as `CROWDSEC_BOUNCER_KEY`
6. [ ] Run data validation: `python backend/scripts/validate_data.py`
7. [ ] Run backend tests: `pytest backend/tests/`
8. [ ] Run frontend tests: `npx playwright test`
9. [ ] Verify rate limiting: test 21 chat requests from same IP
10. [ ] Verify CrowdSec: `docker exec crowdsec cscli metrics`
11. [ ] Set up Traefik HTTPS certificates (see template's `deployment.md`)
12. [ ] Optional: enroll in CrowdSec console at `app.crowdsec.net`
13. [ ] Optional: set `TG_BOT_TOKEN` and register webhook

---

## 10. Implementation order

Execute these phases sequentially. Each phase should result in a working state.

### Phase 1: Clean slate (30 min)
1. Remove Items demo (model, routes, frontend pages, tests)
2. Verify the app still builds and runs with `docker compose up`
3. Update page title and meta to "toki pona dojo"

### Phase 2: Data layer (1 hour)
1. Extract data from the three HTML artifacts into JSON files
2. Run data validation script
3. Add Progress model + migration
4. Add dictionary and lessons API endpoints (read-only, from JSON)
5. Write tests for data endpoints

### Phase 3: LLM integration (1 hour)
1. Add LLM config to settings
2. Implement `llm.py` service with system prompts
3. Add `/chat/stream` and `/chat/grade` endpoints
4. Add `slowapi` rate limiting
5. Write tests (mock the OpenAI client)

### Phase 4: Frontend — structure (2 hours)
1. Set up zen theme (colors, typography, CSS variables)
2. Build two-panel layout with chat sidebar
3. Build skill tree home page
4. Build dictionary page (search, filter, word cards)
5. Build grammar pages (chains, tables, callouts)

### Phase 5: Frontend — exercises (2 hours)
1. Build lesson view with progress bar
2. Implement all 7 exercise components
3. Build feedback toast
4. Wire exercises to backend API
5. Add lesson completion flow

### Phase 6: Frontend — chat (1.5 hours)
1. Build ChatPanel, ChatMessage, ChatModeSelector
2. Implement useChat hook with SSE streaming
3. Add BYOM direct-call path
4. Wire chat context to current route
5. Build ProviderSettings component

### Phase 7: Progress & persistence (1 hour)
1. Implement localStorage progress store
2. Implement SRS algorithm (client-side)
3. Wire progress to exercises (track correct/wrong)
4. Add streak tracking
5. Add progress sync for authenticated users

### Phase 8: Security (30 min)
1. Add CrowdSec + bouncer to Docker Compose
2. Configure Traefik access logging
3. Add ForwardAuth middleware
4. Write acquis.yaml
5. Test the full security stack

### Phase 9: Polish (1 hour)
1. Mobile responsive layout (chat as tab)
2. Dark mode verification
3. Loading states and error handling
4. Telegram bot (if TG_BOT_TOKEN set)
5. Final test pass

---

## 11. What NOT to build (deferred to v2)

These are explicitly out of scope for this implementation:

- User accounts required to play (anonymous access must work)
- League/ranking system
- Friend challenges
- Sitelen pona writing system (glyph recognition)
- Story co-writing mode
- Scenario roleplay mode
- Achievement badges
- Gems/hearts economy
- Push notifications (web)
- Mobile app
- Admin dashboard for content management
- Multi-language UI (English only for now)
- Audio pronunciation
- Community phrasebook
