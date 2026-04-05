# Phase 2: Data Layer

> Extract content from HTML artifacts into JSON, build the Progress model, serve dictionary/lessons via API.

---

## Goal

All toki pona content is in structured JSON files. The Progress model exists in the database. Read-only API endpoints serve dictionary words, grammar content, and lesson/unit structure.

## Prerequisites

- Phase 1 complete (clean slate)
- The three HTML artifacts must be available: `toki_pona_dojo.html`, `toki_pona_modifiers.html`, `toki_pona_dictionary.html`. If they are not in the repo, they need to be provided before this phase can start.

## Steps

### 2.1 Data extraction — `backend/app/data/`

Extract structured data from each HTML artifact's `<script>` block. Write a one-time extraction script (`backend/scripts/extract_data.py`) that parses the HTML and outputs JSON.

**`words.json`** — from `toki_pona_dictionary.html`:
```json
[
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
]
```
Expected: ~137 entries. Preserve `ku` flag and `note` fields.

**`exercises.json`** — from `toki_pona_dojo.html`:
```json
{
  "flashcards": [],
  "sentence_quiz": { "tp2en": [], "en2tp": [], "grammar": [] },
  "word_building": [],
  "unscramble": [],
  "sitelen_pona": [],
  "particles": [],
  "stories": [],
  "reverse_build": []
}
```
Extract: `SQ`, `WB`, `US`, `SP`, `PT`, `ST`, `RV`, `FC_ALL` from the script block.

**`grammar.json`** — from `toki_pona_modifiers.html`:
```json
{
  "sections": [
    {
      "id": "core-rule",
      "number": "01",
      "title": "the core rule",
      "content": "...",
      "chains": [],
      "callouts": []
    }
  ],
  "comparisons": [],
  "quiz": []
}
```
Extract section structure, chain examples, comparison tables, callout boxes, quiz questions (`Qs` array).

### 2.2 Data validation script — `backend/scripts/validate_data.py`

Checks after extraction:
- `words.json` has >= 130 entries
- No duplicate words
- All required fields present in every entry
- All exercise answers reference valid toki pona words from `words.json`
- All flashcard categories have >= 3 entries
- Story questions reference valid answer indices
- Grammar chains use valid word categories

Run as: `python backend/scripts/validate_data.py` — exits 0 on success, 1 with details on failure.

### 2.3 Progress model — `backend/app/models.py`

Add `UserProgress` table to the existing models file:

```python
class UserProgress(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    completed_units: list[int] = Field(default=[], sa_column=Column(JSON))
    completed_lessons: list[str] = Field(default=[], sa_column=Column(JSON))
    current_unit: int = Field(default=1)
    srs_data: dict = Field(default={}, sa_column=Column(JSON))
    total_correct: int = Field(default=0)
    total_answered: int = Field(default=0)
    streak_days: int = Field(default=0)
    last_activity: datetime | None = None
    known_words: list[str] = Field(default=[], sa_column=Column(JSON))
    recent_errors: list[dict] = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

Create Alembic migration: `alembic revision --autogenerate -m "add user_progress table"`

### 2.4 Unit structure definition

Define the 10-unit skill tree structure. This is a hardcoded mapping (not in the database):

```python
# backend/app/data/units.py
UNITS = [
    {"id": 1, "name": "toki!", "topic": "Greetings", "words": ["mi", "sina", "pona", "ike", "toki", "moku"], "exercise_types": ["match", "multichoice"], "requires": []},
    {"id": 2, "name": "ijo", "topic": "Core nouns", "words": ["jan", "tomo", "telo", "soweli", "suno", "ma", "nimi"], "exercise_types": ["match", "multichoice"], "requires": [1]},
    {"id": 3, "name": "pali", "topic": "Actions", "words": ["lukin", "lape", "pali", "kama", "jo"], "exercise_types": ["match", "multichoice"], "requires": [1]},
    {"id": 4, "name": "li e", "topic": "Sentence structure", "words": ["li", "e", "ona", "ni", "seme"], "exercise_types": ["match", "multichoice", "word_bank", "fill_particle"], "requires": [2, 3]},
    {"id": 5, "name": "nasin nimi", "topic": "Modifiers", "words": ["mute", "lili", "suli", "wawa", "sin", "ante"], "exercise_types": ["match", "multichoice", "word_bank"], "requires": [4]},
    {"id": 6, "name": "pi", "topic": "Modifier grouping", "words": ["pi", "sona", "kalama", "ilo", "nasin"], "exercise_types": ["match", "multichoice", "word_bank", "free_compose"], "requires": [5]},
    {"id": 7, "name": "la", "topic": "Context & time", "words": ["la", "tenpo", "sike", "open", "pini"], "exercise_types": ["match", "multichoice", "word_bank", "free_compose"], "requires": [5]},
    {"id": 8, "name": "o!", "topic": "Commands & wishes", "words": ["o", "wile", "ken"], "exercise_types": ["match", "multichoice", "word_bank", "free_compose", "concept_build"], "requires": [6, 7]},
    {"id": 9, "name": "toki musi", "topic": "Creative expression", "words": ["olin", "pilin", "musi", "sitelen"], "exercise_types": ["match", "multichoice", "word_bank", "free_compose", "concept_build", "story"], "requires": [8]},
    {"id": 10, "name": "jan sona", "topic": "Fluency practice", "words": ["lon", "tawa", "tan", "kepeken"], "exercise_types": ["match", "multichoice", "word_bank", "fill_particle", "free_compose", "concept_build", "story"], "requires": [9]},
]
```

Note: Units 2 & 3 are parallel (both require only unit 1). Units 6 & 7 are parallel (both require unit 5). Unit 4 requires both 2 and 3. Unit 8 requires both 6 and 7.

### 2.5 API endpoints

**`backend/app/api/routes/lessons.py`:**
- `GET /api/v1/lessons/units` — returns the full skill tree structure with unit metadata
- `GET /api/v1/lessons/units/{unit_id}/lessons/{lesson_id}` — returns 5-7 exercises for a lesson, mixing types appropriate for the unit level. Exercises are selected from `exercises.json` filtered by words available up to that unit.

**`backend/app/api/routes/dictionary.py`:**
- `GET /api/v1/dictionary/words` — search/filter words. Query params: `q` (search text), `pos` (part of speech filter), `set` (pu/ku filter)
- `GET /api/v1/dictionary/words/{word}` — single word details
- `GET /api/v1/dictionary/grammar` — all grammar sections
- `GET /api/v1/dictionary/grammar/{section_id}` — single grammar section

**JSON loading:** Load JSON files once at module level (they're small, static, read-only). No caching layer needed.

**Register routers** in `backend/app/api/main.py`.

### 2.6 Tests

- `backend/app/tests/api/test_lessons.py` — unit tree returns 10 units, lesson returns exercises with correct types for unit level
- `backend/app/tests/api/test_dictionary.py` — search returns results, POS filter works, word detail returns all fields
- `backend/app/tests/data/test_data_integrity.py` — runs the same checks as `validate_data.py` as pytest tests

## Files touched

| Action | Path |
|--------|------|
| ADD | `backend/app/data/words.json` |
| ADD | `backend/app/data/exercises.json` |
| ADD | `backend/app/data/grammar.json` |
| ADD | `backend/app/data/units.py` |
| ADD | `backend/scripts/extract_data.py` |
| ADD | `backend/scripts/validate_data.py` |
| ADD | `backend/app/api/routes/lessons.py` |
| ADD | `backend/app/api/routes/dictionary.py` |
| ADD | `backend/app/tests/api/test_lessons.py` |
| ADD | `backend/app/tests/api/test_dictionary.py` |
| ADD | `backend/app/tests/data/test_data_integrity.py` |
| ADD | `backend/alembic/versions/xxx_add_user_progress.py` |
| MODIFY | `backend/app/models.py` |
| MODIFY | `backend/app/api/main.py` |

## Risks

- HTML artifacts may not be in the repo yet. The extraction script depends on them.
- Exercise data may reference words inconsistently between the three HTML files. The validation script catches this.
- The `moku` word appears in both Unit 1 (as a greeting/basic) and Unit 3 (as an action). This is intentional — it has multiple POS uses.

## Exit criteria

- `python backend/scripts/validate_data.py` exits 0
- All 4 API endpoints return correct data
- Backend tests pass
- `words.json` has >= 130 entries
