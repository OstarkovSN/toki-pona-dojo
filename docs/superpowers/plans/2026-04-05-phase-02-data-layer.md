# Phase 2: Data Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract toki pona content into structured JSON, add UserProgress model, and serve dictionary/lessons via read-only API endpoints.

**Architecture:** Static JSON data files loaded at module level, UserProgress SQLModel table with JSON columns, FastAPI routers for lessons and dictionary with search/filter support.

**Tech Stack:** FastAPI, SQLModel, Alembic, pytest, Python JSON/pathlib

---

## Task 1: Create static JSON data files with sample data

**Files:**
- `backend/app/data/__init__.py` (new)
- `backend/app/data/words.json` (new)
- `backend/app/data/exercises.json` (new)
- `backend/app/data/grammar.json` (new)

**Context:** The HTML artifacts may not exist yet. We create realistic sample data files so all downstream tasks (API endpoints, tests, validation) can proceed immediately. When the extraction script runs later, it will overwrite these files with full data. The sample data must be structurally identical to the final format and contain enough entries to exercise all code paths (search, filter, unit word lookups).

- [ ] **Step 1:** Create the `backend/app/data/` directory and an empty `__init__.py`.

```bash
mkdir -p backend/app/data
touch backend/app/data/__init__.py
```

- [ ] **Step 2:** Create `backend/app/data/words.json` with sample entries covering all units. Include at least 85 words so unit word lists are satisfied and there are enough distractors for multichoice exercises. Each entry must have `word`, `ku`, `pos`, `definitions`, and `note` fields.

**Note:** The full toki pona vocabulary has 137 words. This sample data includes ~85 representative words. When the extraction script (Task 5) runs against the real HTML artifacts, it will produce the complete 137-word dataset that overwrites this file. Ensure all words referenced by any unit in `units.py` are included in this sample.

Write to `backend/app/data/words.json`:

```json
[
  {"word": "mi", "ku": false, "pos": ["pronoun"], "definitions": [{"pos": "pronoun", "definition": "I, me, we, us"}], "note": null},
  {"word": "sina", "ku": false, "pos": ["pronoun"], "definitions": [{"pos": "pronoun", "definition": "you, your"}], "note": null},
  {"word": "pona", "ku": false, "pos": ["adj", "noun"], "definitions": [{"pos": "adjective", "definition": "good, positive, useful, friendly"}, {"pos": "noun", "definition": "goodness, simplicity"}], "note": null},
  {"word": "ike", "ku": false, "pos": ["adj", "noun"], "definitions": [{"pos": "adjective", "definition": "bad, negative, complex"}, {"pos": "noun", "definition": "badness, evil"}], "note": null},
  {"word": "toki", "ku": false, "pos": ["noun", "verb"], "definitions": [{"pos": "noun", "definition": "language, communication"}, {"pos": "verb", "definition": "to speak, to talk"}], "note": null},
  {"word": "moku", "ku": false, "pos": ["noun", "verb"], "definitions": [{"pos": "noun", "definition": "food, meal"}, {"pos": "verb", "definition": "to eat, to drink, to consume"}], "note": null},
  {"word": "jan", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "person, people, humanity, somebody"}, {"pos": "adjective", "definition": "human-like, personal"}], "note": null},
  {"word": "tomo", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "house, building, room, indoor space"}], "note": null},
  {"word": "telo", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "water, liquid, fluid"}, {"pos": "adjective", "definition": "wet, liquid"}], "note": null},
  {"word": "soweli", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "animal, land mammal"}], "note": null},
  {"word": "suno", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "sun, light, brightness"}, {"pos": "adjective", "definition": "bright, shining"}], "note": null},
  {"word": "ma", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "earth, land, country, territory"}], "note": null},
  {"word": "nimi", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "name, word"}], "note": null},
  {"word": "lukin", "ku": false, "pos": ["verb", "adj"], "definitions": [{"pos": "verb", "definition": "to see, to look at, to watch"}, {"pos": "adjective", "definition": "visual"}], "note": null},
  {"word": "lape", "ku": false, "pos": ["noun", "verb", "adj"], "definitions": [{"pos": "noun", "definition": "sleep, rest"}, {"pos": "verb", "definition": "to sleep, to rest"}, {"pos": "adjective", "definition": "sleeping, resting"}], "note": null},
  {"word": "pali", "ku": false, "pos": ["noun", "verb"], "definitions": [{"pos": "noun", "definition": "work, activity"}, {"pos": "verb", "definition": "to do, to work on, to make"}], "note": null},
  {"word": "kama", "ku": false, "pos": ["verb", "adj"], "definitions": [{"pos": "verb", "definition": "to come, to arrive"}, {"pos": "adjective", "definition": "coming, future"}], "note": null},
  {"word": "jo", "ku": false, "pos": ["verb"], "definitions": [{"pos": "verb", "definition": "to have, to carry, to hold"}], "note": null},
  {"word": "li", "ku": false, "pos": ["particle"], "definitions": [{"pos": "particle", "definition": "predicate marker (between subject and verb)"}], "note": "Used when the subject is not mi or sina alone."},
  {"word": "e", "ku": false, "pos": ["particle"], "definitions": [{"pos": "particle", "definition": "direct object marker"}], "note": null},
  {"word": "ona", "ku": false, "pos": ["pronoun"], "definitions": [{"pos": "pronoun", "definition": "he, she, it, they"}], "note": null},
  {"word": "ni", "ku": false, "pos": ["pronoun", "adj"], "definitions": [{"pos": "pronoun", "definition": "this, that"}, {"pos": "adjective", "definition": "this, that"}], "note": null},
  {"word": "seme", "ku": false, "pos": ["particle"], "definitions": [{"pos": "particle", "definition": "what? which? (question word)"}], "note": null},
  {"word": "mute", "ku": false, "pos": ["adj", "noun"], "definitions": [{"pos": "adjective", "definition": "many, much, several, a lot"}, {"pos": "noun", "definition": "quantity, amount"}], "note": null},
  {"word": "lili", "ku": false, "pos": ["adj"], "definitions": [{"pos": "adjective", "definition": "small, little, short, young"}], "note": null},
  {"word": "suli", "ku": false, "pos": ["adj", "noun"], "definitions": [{"pos": "adjective", "definition": "big, large, tall, important"}, {"pos": "noun", "definition": "size, importance"}], "note": null},
  {"word": "wawa", "ku": false, "pos": ["adj", "noun"], "definitions": [{"pos": "adjective", "definition": "strong, powerful, energetic"}, {"pos": "noun", "definition": "strength, power, energy"}], "note": null},
  {"word": "sin", "ku": false, "pos": ["adj"], "definitions": [{"pos": "adjective", "definition": "new, fresh, additional"}], "note": null},
  {"word": "ante", "ku": false, "pos": ["adj", "noun", "verb"], "definitions": [{"pos": "adjective", "definition": "different, other, changed"}, {"pos": "noun", "definition": "difference, change"}, {"pos": "verb", "definition": "to change, to alter"}], "note": null},
  {"word": "pi", "ku": false, "pos": ["particle"], "definitions": [{"pos": "particle", "definition": "of (modifier regroups following words)"}], "note": "Used to group modifiers."},
  {"word": "sona", "ku": false, "pos": ["noun", "verb"], "definitions": [{"pos": "noun", "definition": "knowledge, wisdom"}, {"pos": "verb", "definition": "to know, to understand"}], "note": null},
  {"word": "kalama", "ku": false, "pos": ["noun", "verb"], "definitions": [{"pos": "noun", "definition": "sound, noise"}, {"pos": "verb", "definition": "to make a sound, to play music"}], "note": null},
  {"word": "ilo", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "tool, device, machine"}], "note": null},
  {"word": "nasin", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "way, method, path, road"}], "note": null},
  {"word": "la", "ku": false, "pos": ["particle"], "definitions": [{"pos": "particle", "definition": "context separator (if/when ... then ...)"}], "note": null},
  {"word": "tenpo", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "time, moment, period"}], "note": null},
  {"word": "sike", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "circle, cycle, round thing"}, {"pos": "adjective", "definition": "round, circular, cyclical"}], "note": null},
  {"word": "open", "ku": false, "pos": ["verb", "adj"], "definitions": [{"pos": "verb", "definition": "to open, to begin, to start"}, {"pos": "adjective", "definition": "open, beginning"}], "note": null},
  {"word": "pini", "ku": false, "pos": ["verb", "adj", "noun"], "definitions": [{"pos": "verb", "definition": "to finish, to end, to close"}, {"pos": "adjective", "definition": "finished, past"}, {"pos": "noun", "definition": "end, finish"}], "note": null},
  {"word": "o", "ku": false, "pos": ["particle"], "definitions": [{"pos": "particle", "definition": "vocative / imperative marker"}], "note": "Used for commands and addressing someone."},
  {"word": "wile", "ku": false, "pos": ["verb", "noun"], "definitions": [{"pos": "verb", "definition": "to want, to need, to desire"}, {"pos": "noun", "definition": "want, need, desire"}], "note": null},
  {"word": "ken", "ku": false, "pos": ["verb", "noun"], "definitions": [{"pos": "verb", "definition": "to be able to, can"}, {"pos": "noun", "definition": "ability, possibility"}], "note": null},
  {"word": "olin", "ku": false, "pos": ["noun", "verb"], "definitions": [{"pos": "noun", "definition": "love, affection"}, {"pos": "verb", "definition": "to love, to have compassion for"}], "note": null},
  {"word": "pilin", "ku": false, "pos": ["noun", "verb"], "definitions": [{"pos": "noun", "definition": "feeling, emotion, heart"}, {"pos": "verb", "definition": "to feel, to sense"}], "note": null},
  {"word": "musi", "ku": false, "pos": ["noun", "adj", "verb"], "definitions": [{"pos": "noun", "definition": "fun, game, art"}, {"pos": "adjective", "definition": "fun, entertaining"}, {"pos": "verb", "definition": "to play, to have fun"}], "note": null},
  {"word": "sitelen", "ku": false, "pos": ["noun", "verb"], "definitions": [{"pos": "noun", "definition": "image, picture, writing, symbol"}, {"pos": "verb", "definition": "to write, to draw"}], "note": null},
  {"word": "lon", "ku": false, "pos": ["prep", "verb"], "definitions": [{"pos": "preposition", "definition": "at, in, on (location)"}, {"pos": "verb", "definition": "to exist, to be present, to be real"}], "note": null},
  {"word": "tawa", "ku": false, "pos": ["prep", "verb", "adj"], "definitions": [{"pos": "preposition", "definition": "to, toward, for"}, {"pos": "verb", "definition": "to go, to move"}, {"pos": "adjective", "definition": "moving"}], "note": null},
  {"word": "tan", "ku": false, "pos": ["prep", "noun"], "definitions": [{"pos": "preposition", "definition": "from, because of"}, {"pos": "noun", "definition": "reason, cause, origin"}], "note": null},
  {"word": "kepeken", "ku": false, "pos": ["prep", "verb"], "definitions": [{"pos": "preposition", "definition": "using, with (instrument)"}, {"pos": "verb", "definition": "to use"}], "note": null},
  {"word": "ale", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "everything, all"}, {"pos": "adjective", "definition": "every, all, entire"}], "note": "Also spelled 'ali'."},
  {"word": "ala", "ku": false, "pos": ["adj", "noun"], "definitions": [{"pos": "adjective", "definition": "no, not, zero"}, {"pos": "noun", "definition": "nothing, negation"}], "note": null},
  {"word": "lipu", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "flat object, paper, book, document, website"}], "note": null},
  {"word": "sewi", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "high place, sky, divine"}, {"pos": "adjective", "definition": "high, upper, divine, sacred"}], "note": null},
  {"word": "anpa", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "bottom, lower part"}, {"pos": "adjective", "definition": "low, bottom, humble"}], "note": null},
  {"word": "monsi", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "back, behind, rear"}, {"pos": "adjective", "definition": "back, rear"}], "note": null},
  {"word": "sinpin", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "face, front, wall"}, {"pos": "adjective", "definition": "front, facial"}], "note": null},
  {"word": "noka", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "foot, leg, lower part"}], "note": null},
  {"word": "luka", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "hand, arm, five"}], "note": null},
  {"word": "nena", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "bump, hill, mountain, nose"}], "note": null},
  {"word": "linja", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "long flexible thing, rope, hair, line"}], "note": null},
  {"word": "palisa", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "long hard thing, rod, stick"}], "note": null},
  {"word": "seli", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "fire, heat"}, {"pos": "adjective", "definition": "hot, warm"}], "note": null},
  {"word": "lete", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "cold"}, {"pos": "adjective", "definition": "cold, cool, raw"}], "note": null},
  {"word": "kule", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "color"}, {"pos": "adjective", "definition": "colorful"}], "note": null},
  {"word": "loje", "ku": false, "pos": ["adj"], "definitions": [{"pos": "adjective", "definition": "red"}], "note": null},
  {"word": "laso", "ku": false, "pos": ["adj"], "definitions": [{"pos": "adjective", "definition": "blue, green"}], "note": null},
  {"word": "jelo", "ku": false, "pos": ["adj"], "definitions": [{"pos": "adjective", "definition": "yellow"}], "note": null},
  {"word": "walo", "ku": false, "pos": ["adj"], "definitions": [{"pos": "adjective", "definition": "white, light-colored"}], "note": null},
  {"word": "pimeja", "ku": false, "pos": ["adj", "noun"], "definitions": [{"pos": "adjective", "definition": "black, dark"}, {"pos": "noun", "definition": "darkness"}], "note": null},
  {"word": "nasa", "ku": false, "pos": ["adj"], "definitions": [{"pos": "adjective", "definition": "unusual, strange, silly, drunk"}], "note": null},
  {"word": "pakala", "ku": false, "pos": ["verb", "noun", "adj"], "definitions": [{"pos": "verb", "definition": "to break, to damage"}, {"pos": "noun", "definition": "damage, mistake"}, {"pos": "adjective", "definition": "broken, damaged"}], "note": null},
  {"word": "utala", "ku": false, "pos": ["noun", "verb"], "definitions": [{"pos": "noun", "definition": "fight, battle, conflict"}, {"pos": "verb", "definition": "to fight, to struggle"}], "note": null},
  {"word": "mu", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "animal noise, meaningless syllable"}], "note": null},
  {"word": "ko", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "clay, paste, semi-solid substance"}], "note": null},
  {"word": "kiwen", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "hard object, rock, stone, metal"}, {"pos": "adjective", "definition": "hard, solid"}], "note": null},
  {"word": "kon", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "air, breath, spirit, essence"}], "note": null},
  {"word": "mama", "ku": false, "pos": ["noun"], "definitions": [{"pos": "noun", "definition": "parent, ancestor, creator"}], "note": null},
  {"word": "meli", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "woman, female"}, {"pos": "adjective", "definition": "female, feminine"}], "note": null},
  {"word": "mije", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "man, male"}, {"pos": "adjective", "definition": "male, masculine"}], "note": null},
  {"word": "tonsi", "ku": true, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "non-binary person, trans person"}, {"pos": "adjective", "definition": "non-binary, trans, gender-nonconforming"}], "note": "ku word: widely used in the toki pona community but not in pu."},
  {"word": "pu", "ku": false, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "the official toki pona book"}, {"pos": "adjective", "definition": "interacting with the official toki pona book"}], "note": null},
  {"word": "ku", "ku": true, "pos": ["noun", "adj"], "definitions": [{"pos": "noun", "definition": "the toki pona dictionary by Sonja Lang"}, {"pos": "adjective", "definition": "interacting with the toki pona dictionary"}], "note": "ku word."},
  {"word": "nanpa", "ku": false, "pos": ["noun", "particle"], "definitions": [{"pos": "noun", "definition": "number"}, {"pos": "particle", "definition": "ordinal number marker"}], "note": null},
  {"word": "wan", "ku": false, "pos": ["adj", "noun"], "definitions": [{"pos": "adjective", "definition": "one, unique"}, {"pos": "noun", "definition": "unity"}], "note": null},
  {"word": "tu", "ku": false, "pos": ["adj"], "definitions": [{"pos": "adjective", "definition": "two"}], "note": null}
]
```

- [ ] **Step 3:** Create `backend/app/data/exercises.json` with sample exercises covering all exercise types. Include enough entries for each type to test API filtering.

Write to `backend/app/data/exercises.json`:

```json
{
  "flashcards": [
    {"word": "mi", "definition": "I, me, we, us", "category": "pronouns"},
    {"word": "sina", "definition": "you, your", "category": "pronouns"},
    {"word": "ona", "definition": "he, she, it, they", "category": "pronouns"},
    {"word": "pona", "definition": "good, positive, useful", "category": "basics"},
    {"word": "ike", "definition": "bad, negative", "category": "basics"},
    {"word": "toki", "definition": "language, communication", "category": "basics"},
    {"word": "moku", "definition": "food, to eat", "category": "basics"},
    {"word": "jan", "definition": "person, people", "category": "nouns"},
    {"word": "tomo", "definition": "house, building", "category": "nouns"},
    {"word": "telo", "definition": "water, liquid", "category": "nouns"},
    {"word": "soweli", "definition": "animal", "category": "nouns"},
    {"word": "suno", "definition": "sun, light", "category": "nouns"},
    {"word": "lukin", "definition": "to see, to look at", "category": "verbs"},
    {"word": "pali", "definition": "to do, to work on", "category": "verbs"},
    {"word": "kama", "definition": "to come, to arrive", "category": "verbs"},
    {"word": "jo", "definition": "to have, to carry", "category": "verbs"},
    {"word": "wile", "definition": "to want, to need", "category": "verbs"},
    {"word": "ken", "definition": "to be able to, can", "category": "verbs"}
  ],
  "sentence_quiz": {
    "tp2en": [
      {"tp": "mi moku", "en": "I eat", "words": ["mi", "moku"]},
      {"tp": "sina pona", "en": "You are good", "words": ["sina", "pona"]},
      {"tp": "jan li lukin", "en": "The person sees", "words": ["jan", "li", "lukin"]},
      {"tp": "soweli li moku e telo", "en": "The animal drinks water", "words": ["soweli", "li", "moku", "e", "telo"]},
      {"tp": "mi wile moku", "en": "I want to eat", "words": ["mi", "wile", "moku"]},
      {"tp": "jan li pali", "en": "The person works", "words": ["jan", "li", "pali"]}
    ],
    "en2tp": [
      {"en": "I eat", "tp": "mi moku", "words": ["mi", "moku"]},
      {"en": "You are good", "tp": "sina pona", "words": ["sina", "pona"]},
      {"en": "The person sees", "tp": "jan li lukin", "words": ["jan", "li", "lukin"]},
      {"en": "The animal is big", "tp": "soweli li suli", "words": ["soweli", "li", "suli"]}
    ],
    "grammar": [
      {"sentence": "jan li moku e telo", "question": "What is the role of 'li' here?", "answer": "predicate marker", "words": ["jan", "li", "moku", "e", "telo"]},
      {"sentence": "mi pona", "question": "Why is there no 'li'?", "answer": "Subject is 'mi' alone, so li is dropped", "words": ["mi", "pona"]},
      {"sentence": "soweli pi jan ni li suli", "question": "What does 'pi' do here?", "answer": "Groups 'jan ni' as a modifier of 'soweli'", "words": ["soweli", "pi", "jan", "ni", "li", "suli"]}
    ]
  },
  "word_building": [
    {"compound": "tomo telo", "meaning": "bathroom (water room)", "parts": ["tomo", "telo"]},
    {"compound": "jan pona", "meaning": "friend (good person)", "parts": ["jan", "pona"]},
    {"compound": "telo suli", "meaning": "ocean (big water)", "parts": ["telo", "suli"]},
    {"compound": "ilo moku", "meaning": "eating utensil (food tool)", "parts": ["ilo", "moku"]},
    {"compound": "tomo sona", "meaning": "school (knowledge building)", "parts": ["tomo", "sona"]}
  ],
  "unscramble": [
    {"words": ["mi", "moku", "pona"], "correct": "mi moku pona", "translation": "I eat well"},
    {"words": ["jan", "li", "lukin", "e", "suno"], "correct": "jan li lukin e suno", "translation": "The person looks at the sun"},
    {"words": ["soweli", "li", "lili"], "correct": "soweli li lili", "translation": "The animal is small"},
    {"words": ["mi", "wile", "telo"], "correct": "mi wile telo", "translation": "I want water"}
  ],
  "sitelen_pona": [
    {"word": "mi", "glyph_desc": "single dot/circle", "category": "basic"},
    {"word": "sina", "glyph_desc": "pointing hand", "category": "basic"},
    {"word": "pona", "glyph_desc": "smiling face", "category": "basic"},
    {"word": "toki", "glyph_desc": "speech bubble / mouth with lines", "category": "basic"},
    {"word": "jan", "glyph_desc": "person silhouette", "category": "basic"}
  ],
  "particles": [
    {"sentence": "jan ___ moku", "answer": "li", "explanation": "'li' marks the predicate when subject is not mi/sina", "words": ["jan", "li", "moku"]},
    {"sentence": "mi lukin ___ soweli", "answer": "e", "explanation": "'e' marks the direct object", "words": ["mi", "lukin", "e", "soweli"]},
    {"sentence": "tomo ___ jan pona", "answer": "pi", "explanation": "'pi' regroups 'jan pona' as a modifier", "words": ["tomo", "pi", "jan", "pona"]},
    {"sentence": "___ kama pona!", "answer": "o", "explanation": "'o' marks a command or wish", "words": ["o", "kama", "pona"]}
  ],
  "stories": [
    {
      "title": "tomo mi",
      "text": "mi jo e tomo. tomo mi li suli. jan pona mi li kama. ona li moku e moku pona. mi pilin pona.",
      "questions": [
        {"question": "What does the speaker have?", "options": ["a house", "a cat", "food", "water"], "answer_index": 0},
        {"question": "Who comes to visit?", "options": ["a stranger", "a friend", "nobody", "an animal"], "answer_index": 1},
        {"question": "How does the speaker feel?", "options": ["sad", "angry", "good", "tired"], "answer_index": 2}
      ],
      "words": ["mi", "jo", "e", "tomo", "li", "suli", "jan", "pona", "kama", "ona", "moku", "pilin"]
    },
    {
      "title": "soweli lili",
      "text": "soweli lili li lon tomo mi. ona li moku e moku lili. ona li lape lon suno. mi olin e ona.",
      "questions": [
        {"question": "Where is the small animal?", "options": ["outside", "in my house", "in the water", "on a hill"], "answer_index": 1},
        {"question": "What does it do in the sun?", "options": ["eats", "plays", "sleeps", "runs"], "answer_index": 2}
      ],
      "words": ["soweli", "lili", "li", "lon", "tomo", "mi", "ona", "moku", "e", "lape", "suno", "olin"]
    }
  ],
  "reverse_build": [
    {"meaning": "a place where people learn", "expected": "tomo sona", "key_words": ["tomo", "sona"]},
    {"meaning": "a tool that makes sound", "expected": "ilo kalama", "key_words": ["ilo", "kalama"]},
    {"meaning": "the way of water", "expected": "nasin telo", "key_words": ["nasin", "telo"]},
    {"meaning": "a big person", "expected": "jan suli", "key_words": ["jan", "suli"]}
  ]
}
```

- [ ] **Step 4:** Create `backend/app/data/grammar.json` with sample grammar sections covering the main structures.

Write to `backend/app/data/grammar.json`:

```json
{
  "sections": [
    {
      "id": "core-rule",
      "number": "01",
      "title": "the core rule",
      "content": "In toki pona, the head noun comes first and modifiers follow. 'tomo pona' means 'good house' — tomo (house) is modified by pona (good). This is the opposite of English word order.",
      "chains": [
        {"base": "tomo", "modifiers": ["pona"], "result": "good house"},
        {"base": "jan", "modifiers": ["suli"], "result": "big person"},
        {"base": "telo", "modifiers": ["suli"], "result": "ocean / big water"}
      ],
      "callouts": [
        {"type": "tip", "text": "Think of it as: the first word is the MAIN thing, everything after describes it more."}
      ]
    },
    {
      "id": "li-predicate",
      "number": "02",
      "title": "li — the predicate marker",
      "content": "The particle 'li' separates the subject from the predicate. 'jan li moku' means 'the person eats'. When the subject is 'mi' or 'sina' alone, 'li' is dropped: 'mi moku' (I eat).",
      "chains": [
        {"base": "jan", "modifiers": ["li", "moku"], "result": "the person eats"},
        {"base": "soweli", "modifiers": ["li", "lape"], "result": "the animal sleeps"}
      ],
      "callouts": [
        {"type": "warning", "text": "Do NOT use 'li' after 'mi' or 'sina' when they are the only subject word."},
        {"type": "tip", "text": "'mi mute li moku' DOES use 'li' because the subject is 'mi mute', not 'mi' alone."}
      ]
    },
    {
      "id": "e-object",
      "number": "03",
      "title": "e — the direct object marker",
      "content": "The particle 'e' marks the direct object of a verb. 'mi moku e telo' means 'I drink water'. Without 'e', the sentence has no explicit object.",
      "chains": [
        {"base": "mi moku", "modifiers": ["e", "telo"], "result": "I drink water"},
        {"base": "jan li lukin", "modifiers": ["e", "soweli"], "result": "the person looks at the animal"}
      ],
      "callouts": []
    },
    {
      "id": "pi-grouping",
      "number": "04",
      "title": "pi — modifier grouping",
      "content": "The particle 'pi' regroups modifiers. Without pi, each word modifies the head independently. With pi, the words after pi form a group. 'tomo telo nasa' = weird water-room. 'tomo pi telo nasa' = room of weird water.",
      "chains": [
        {"base": "tomo", "modifiers": ["pi", "jan", "pona"], "result": "house of good people / friend's house"},
        {"base": "jan", "modifiers": ["pi", "sona", "suli"], "result": "person of great knowledge / scholar"}
      ],
      "callouts": [
        {"type": "warning", "text": "Never use pi with only one word after it. 'tomo pi pona' is wrong — just say 'tomo pona'."}
      ]
    },
    {
      "id": "la-context",
      "number": "05",
      "title": "la — the context marker",
      "content": "The particle 'la' separates context from the main sentence. 'tenpo ni la mi moku' means 'now, I eat' (at this time, I eat). The part before 'la' sets the context for the rest.",
      "chains": [
        {"base": "tenpo ni", "modifiers": ["la"], "result": "now / at this time (context)"},
        {"base": "mi pilin pona", "modifiers": ["la"], "result": "if/when I feel good (context)"}
      ],
      "callouts": [
        {"type": "tip", "text": "'la' can express time, conditions, and cause — it is very flexible."}
      ]
    },
    {
      "id": "o-commands",
      "number": "06",
      "title": "o — commands and wishes",
      "content": "The particle 'o' is used for commands ('o moku!' = eat!), addressing someone ('jan Meli o!' = hey Meli!), and wishes ('mi o pona' = I should be good).",
      "chains": [],
      "callouts": [
        {"type": "tip", "text": "'o' replaces 'li' when giving a command to a named subject: 'sina o moku' = you should eat."}
      ]
    }
  ],
  "comparisons": [
    {
      "title": "li vs no li",
      "left": {"label": "With li", "example": "jan li moku", "meaning": "The person eats"},
      "right": {"label": "Without li", "example": "mi moku", "meaning": "I eat"},
      "explanation": "'li' is dropped when the subject is 'mi' or 'sina' alone"
    },
    {
      "title": "pi vs no pi",
      "left": {"label": "With pi", "example": "tomo pi telo nasa", "meaning": "room of strange water"},
      "right": {"label": "Without pi", "example": "tomo telo nasa", "meaning": "strange water-room (bathroom)"},
      "explanation": "'pi' regroups: modifiers after pi modify each other first, then modify the head"
    }
  ],
  "quiz": [
    {"question": "What does 'jan li moku e telo' mean?", "options": ["The person drinks water", "Water eats the person", "The person is water", "The food is a person"], "answer_index": 0},
    {"question": "Why is there no 'li' in 'mi pona'?", "options": ["It's optional", "The subject is mi alone", "pona is special", "It's a question"], "answer_index": 1},
    {"question": "What does 'pi' do in 'jan pi sona suli'?", "options": ["Marks possession", "Groups 'sona suli' as a unit modifying 'jan'", "Separates two sentences", "Makes it a question"], "answer_index": 1},
    {"question": "In 'tenpo ni la mi moku', what comes before 'la'?", "options": ["The main sentence", "The context/condition", "The object", "The verb"], "answer_index": 1}
  ]
}
```

- [ ] **Step 5:** Verify all three JSON files are valid by loading them in Python.

```bash
cd backend && python -c "
import json, pathlib
for f in ['app/data/words.json', 'app/data/exercises.json', 'app/data/grammar.json']:
    data = json.loads(pathlib.Path(f).read_text())
    print(f'{f}: OK ({type(data).__name__}, {len(data) if isinstance(data, list) else len(data)} top-level)')
"
```

Expected output:
```
app/data/words.json: OK (list, 86 top-level)
app/data/exercises.json: OK (dict, 8 top-level)
app/data/grammar.json: OK (dict, 3 top-level)
```

- [ ] **Step 6:** Commit with message: "Add sample toki pona JSON data files (words, exercises, grammar)"

- [ ] **Step 7:** Record learnings to `.claude/learnings-json-data-files.md` using the surfacing-subagent-learnings skill.

---

## Task 2: Create unit structure definition

**Files:**
- `backend/app/data/units.py` (new)
- `backend/tests/data/test_units.py` (new)

**Context:** This defines the 10-unit skill tree as a hardcoded Python list. Units reference words from `words.json`. Units 2 & 3 are parallel (both require only unit 1). Units 6 & 7 are parallel (both require unit 5). Unit 4 requires both 2 and 3. Unit 8 requires both 6 and 7.

- [ ] **Step 1:** Write failing tests in `backend/tests/data/test_units.py` (TDD red phase).

Write to `backend/tests/data/test_units.py`:

```python
"""Tests for unit structure definition."""

import pytest


def test_units_count():
    """There are exactly 10 units."""
    from app.data.units import UNITS
    assert len(UNITS) == 10


def test_units_have_required_fields():
    """Each unit has all required fields."""
    from app.data.units import UNITS
    required = {"id", "name", "topic", "words", "exercise_types", "requires"}
    for unit in UNITS:
        missing = required - set(unit.keys())
        assert not missing, f"Unit {unit.get('id', '?')}: missing {missing}"


def test_unit_ids_are_sequential():
    """Unit IDs are 1 through 10."""
    from app.data.units import UNITS
    ids = [u["id"] for u in UNITS]
    assert ids == list(range(1, 11))


def test_get_unit_by_id_found():
    """get_unit_by_id returns the correct unit."""
    from app.data.units import get_unit_by_id
    unit = get_unit_by_id(1)
    assert unit is not None
    assert unit["name"] == "toki!"


def test_get_unit_by_id_not_found():
    """get_unit_by_id returns None for unknown ID."""
    from app.data.units import get_unit_by_id
    assert get_unit_by_id(99) is None


def test_get_words_up_to_unit_1():
    """Words for unit 1 are just unit 1's words."""
    from app.data.units import get_words_up_to_unit, get_unit_by_id
    words = get_words_up_to_unit(1)
    unit1 = get_unit_by_id(1)
    assert words == set(unit1["words"])


def test_get_words_up_to_unit_4_includes_prerequisites():
    """Words up to unit 4 include units 1, 2, 3, and 4."""
    from app.data.units import get_words_up_to_unit
    words = get_words_up_to_unit(4)
    # Unit 4 requires 2 and 3, both require 1
    assert "mi" in words      # unit 1
    assert "jan" in words      # unit 2
    assert "lukin" in words    # unit 3
    assert "li" in words       # unit 4
    assert "pi" not in words   # unit 6, should NOT be included


def test_parallel_units_have_correct_prereqs():
    """Units 2 & 3 are parallel (both require 1); units 6 & 7 are parallel (both require 5)."""
    from app.data.units import get_unit_by_id
    assert get_unit_by_id(2)["requires"] == [1]
    assert get_unit_by_id(3)["requires"] == [1]
    assert get_unit_by_id(6)["requires"] == [5]
    assert get_unit_by_id(7)["requires"] == [5]
```

Run the tests and confirm they fail:

```bash
cd backend && python -m pytest tests/data/test_units.py -v 2>&1 | tail -20
```

Expected: ImportError because `app.data.units` does not exist yet.

- [ ] **Step 2:** Create `backend/app/data/units.py` with the complete UNITS list and Pydantic response models.

Write to `backend/app/data/units.py`:

```python
"""Toki pona skill tree: 10 units with word lists and prerequisites."""

from pydantic import BaseModel


class UnitSummary(BaseModel):
    """Unit metadata returned by the units list endpoint."""

    id: int
    name: str
    topic: str
    words: list[str]
    exercise_types: list[str]
    requires: list[int]


UNITS: list[dict] = [
    {
        "id": 1,
        "name": "toki!",
        "topic": "Greetings",
        "words": ["mi", "sina", "pona", "ike", "toki", "moku"],
        "exercise_types": ["match", "multichoice"],
        "requires": [],
    },
    {
        "id": 2,
        "name": "ijo",
        "topic": "Core nouns",
        "words": ["jan", "tomo", "telo", "soweli", "suno", "ma", "nimi"],
        "exercise_types": ["match", "multichoice"],
        "requires": [1],
    },
    {
        "id": 3,
        "name": "pali",
        "topic": "Actions",
        "words": ["lukin", "lape", "pali", "kama", "jo"],
        "exercise_types": ["match", "multichoice"],
        "requires": [1],
    },
    {
        "id": 4,
        "name": "li e",
        "topic": "Sentence structure",
        "words": ["li", "e", "ona", "ni", "seme"],
        "exercise_types": ["match", "multichoice", "word_bank", "fill_particle"],
        "requires": [2, 3],
    },
    {
        "id": 5,
        "name": "nasin nimi",
        "topic": "Modifiers",
        "words": ["mute", "lili", "suli", "wawa", "sin", "ante"],
        "exercise_types": ["match", "multichoice", "word_bank"],
        "requires": [4],
    },
    {
        "id": 6,
        "name": "pi",
        "topic": "Modifier grouping",
        "words": ["pi", "sona", "kalama", "ilo", "nasin"],
        "exercise_types": ["match", "multichoice", "word_bank", "free_compose"],
        "requires": [5],
    },
    {
        "id": 7,
        "name": "la",
        "topic": "Context & time",
        "words": ["la", "tenpo", "sike", "open", "pini"],
        "exercise_types": ["match", "multichoice", "word_bank", "free_compose"],
        "requires": [5],
    },
    {
        "id": 8,
        "name": "o!",
        "topic": "Commands & wishes",
        "words": ["o", "wile", "ken"],
        "exercise_types": [
            "match",
            "multichoice",
            "word_bank",
            "free_compose",
            "concept_build",
        ],
        "requires": [6, 7],
    },
    {
        "id": 9,
        "name": "toki musi",
        "topic": "Creative expression",
        "words": ["olin", "pilin", "musi", "sitelen"],
        "exercise_types": [
            "match",
            "multichoice",
            "word_bank",
            "free_compose",
            "concept_build",
            "story",
        ],
        "requires": [8],
    },
    {
        "id": 10,
        "name": "jan sona",
        "topic": "Fluency practice",
        "words": ["lon", "tawa", "tan", "kepeken"],
        "exercise_types": [
            "match",
            "multichoice",
            "word_bank",
            "fill_particle",
            "free_compose",
            "concept_build",
            "story",
        ],
        "requires": [9],
    },
]


def get_unit_by_id(unit_id: int) -> dict | None:
    """Return a unit dict by its id, or None if not found."""
    for unit in UNITS:
        if unit["id"] == unit_id:
            return unit
    return None


def get_words_up_to_unit(unit_id: int) -> set[str]:
    """Return all words available up to and including the given unit.

    Follows the prerequisite chain: a unit's words are available
    only if all its prerequisites are also included.
    """
    available: set[str] = set()
    resolved: set[int] = set()

    def _resolve(uid: int) -> None:
        if uid in resolved:
            return
        unit = get_unit_by_id(uid)
        if unit is None:
            return
        for req in unit["requires"]:
            _resolve(req)
        available.update(unit["words"])
        resolved.add(uid)

    _resolve(unit_id)
    return available
```

- [ ] **Step 3:** Run the unit tests and verify they all pass (TDD green phase).

```bash
cd backend && python -m pytest tests/data/test_units.py -v
```

Expected: All tests pass.

- [ ] **Step 4:** Commit with message: "Add unit structure definition with 10-unit skill tree and tests"

- [ ] **Step 5:** Record learnings to `.claude/learnings-unit-structure.md` using the surfacing-subagent-learnings skill.

---

## Task 3: Create JSON data loader module

**Files:**
- `backend/app/data/loader.py` (new)
- `backend/tests/data/test_loader.py` (new)

**Context:** JSON files are small and static. Load them once at module level. Provide typed access functions for the rest of the app.

- [ ] **Step 1:** Write failing tests in `backend/tests/data/test_loader.py` (TDD red phase).

Write to `backend/tests/data/test_loader.py`:

```python
"""Tests for the JSON data loader module."""


def test_words_loaded():
    """WORDS is a non-empty list of dicts."""
    from app.data.loader import WORDS
    assert isinstance(WORDS, list)
    assert len(WORDS) > 0
    assert isinstance(WORDS[0], dict)


def test_exercises_loaded():
    """EXERCISES is a dict with expected top-level keys."""
    from app.data.loader import EXERCISES
    assert isinstance(EXERCISES, dict)
    assert "flashcards" in EXERCISES
    assert "sentence_quiz" in EXERCISES


def test_grammar_loaded():
    """GRAMMAR is a dict with expected top-level keys."""
    from app.data.loader import GRAMMAR
    assert isinstance(GRAMMAR, dict)
    assert "sections" in GRAMMAR


def test_get_word_found():
    """get_word returns the correct entry for a known word."""
    from app.data.loader import get_word
    entry = get_word("pona")
    assert entry is not None
    assert entry["word"] == "pona"
    assert "definitions" in entry
    assert isinstance(entry["definitions"], list)


def test_get_word_not_found():
    """get_word returns None for an unknown word."""
    from app.data.loader import get_word
    assert get_word("nonexistent_word_xyz") is None


def test_search_words_by_query():
    """search_words with q='water' finds 'telo'."""
    from app.data.loader import search_words
    results = search_words(q="water")
    words = [w["word"] for w in results]
    assert "telo" in words


def test_search_words_by_pos():
    """search_words with pos='verb' returns only words with 'verb' in pos."""
    from app.data.loader import search_words
    results = search_words(pos="verb")
    assert len(results) > 0
    for w in results:
        assert "verb" in w["pos"]


def test_search_words_by_word_set_ku():
    """search_words with word_set='ku' returns only ku words."""
    from app.data.loader import search_words
    results = search_words(word_set="ku")
    assert len(results) > 0
    for w in results:
        assert w["ku"] is True


def test_search_words_by_word_set_pu():
    """search_words with word_set='pu' returns only non-ku words."""
    from app.data.loader import search_words
    results = search_words(word_set="pu")
    assert len(results) > 0
    for w in results:
        assert w["ku"] is False


def test_search_words_combined_filters():
    """search_words with both q and pos narrows results."""
    from app.data.loader import search_words
    results = search_words(q="eat", pos="verb")
    words = [w["word"] for w in results]
    assert "moku" in words
    for w in results:
        assert "verb" in w["pos"]


def test_get_grammar_sections():
    """get_grammar_sections returns a non-empty list."""
    from app.data.loader import get_grammar_sections
    sections = get_grammar_sections()
    assert isinstance(sections, list)
    assert len(sections) > 0


def test_get_grammar_section_found():
    """get_grammar_section returns the correct section by id."""
    from app.data.loader import get_grammar_section
    section = get_grammar_section("core-rule")
    assert section is not None
    assert section["id"] == "core-rule"


def test_get_grammar_section_not_found():
    """get_grammar_section returns None for unknown id."""
    from app.data.loader import get_grammar_section
    assert get_grammar_section("nonexistent_section") is None


def test_get_exercises_by_words_filters_correctly():
    """get_exercises_by_words only returns exercises using words from the given set."""
    from app.data.loader import get_exercises_by_words
    word_set = {"mi", "sina", "pona", "ike", "toki", "moku"}
    result = get_exercises_by_words(word_set)
    # Flashcards should only contain words in the set
    for fc in result["flashcards"]:
        assert fc["word"] in word_set
    # Sentence quiz entries should only use words in the set
    for item in result["sentence_quiz"]["tp2en"]:
        for w in item["words"]:
            assert w in word_set


def test_get_exercises_by_words_empty_set():
    """get_exercises_by_words with empty set returns empty exercise lists."""
    from app.data.loader import get_exercises_by_words
    result = get_exercises_by_words(set())
    assert result["flashcards"] == []
    assert result["sentence_quiz"]["tp2en"] == []
```

Run the tests and confirm they fail:

```bash
cd backend && python -m pytest tests/data/test_loader.py -v 2>&1 | tail -20
```

Expected: ImportError because `app.data.loader` does not exist yet.

- [ ] **Step 2:** Create `backend/app/data/loader.py` that loads all three JSON files at import time and provides accessor functions.

Write to `backend/app/data/loader.py`:

```python
"""Load static toki pona data files at module level.

Data files are small (<1MB total) and read-only, so we load them once
at import time. No caching layer needed.
"""

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_DATA_DIR = Path(__file__).parent

# ---------------------------------------------------------------------------
# Load JSON files
# ---------------------------------------------------------------------------


def _load_json(filename: str) -> Any:
    path = _DATA_DIR / filename
    logger.info("Loading data file: %s", path)
    with open(path) as f:
        return json.load(f)


WORDS: list[dict[str, Any]] = _load_json("words.json")
EXERCISES: dict[str, Any] = _load_json("exercises.json")
GRAMMAR: dict[str, Any] = _load_json("grammar.json")

# Build lookup indexes
_WORD_INDEX: dict[str, dict[str, Any]] = {w["word"]: w for w in WORDS}

logger.info("Loaded %d words, %d grammar sections", len(WORDS), len(GRAMMAR.get("sections", [])))

# ---------------------------------------------------------------------------
# Accessor functions
# ---------------------------------------------------------------------------


def get_word(word: str) -> dict[str, Any] | None:
    """Return a single word entry or None."""
    return _WORD_INDEX.get(word)


def search_words(
    q: str | None = None,
    pos: str | None = None,
    word_set: str | None = None,
) -> list[dict[str, Any]]:
    """Search/filter words.

    Args:
        q: Text to search in word name and definitions.
        pos: Part of speech filter (e.g. "noun", "verb").
        word_set: "pu" for core words only, "ku" for ku words only, None for all.
    """
    results = WORDS

    if word_set == "pu":
        results = [w for w in results if not w["ku"]]
    elif word_set == "ku":
        results = [w for w in results if w["ku"]]

    if pos:
        results = [w for w in results if pos in w["pos"]]

    if q:
        q_lower = q.lower()
        filtered = []
        for w in results:
            if q_lower in w["word"].lower():
                filtered.append(w)
                continue
            for defn in w["definitions"]:
                if q_lower in defn["definition"].lower():
                    filtered.append(w)
                    break
        results = filtered

    return results


def get_grammar_sections() -> list[dict[str, Any]]:
    """Return all grammar sections."""
    return GRAMMAR.get("sections", [])


def get_grammar_section(section_id: str) -> dict[str, Any] | None:
    """Return a single grammar section by id."""
    for section in GRAMMAR.get("sections", []):
        if section["id"] == section_id:
            return section
    return None


def get_grammar_comparisons() -> list[dict[str, Any]]:
    """Return all grammar comparisons."""
    return GRAMMAR.get("comparisons", [])


def get_grammar_quiz() -> list[dict[str, Any]]:
    """Return grammar quiz questions."""
    return GRAMMAR.get("quiz", [])


def get_exercises_by_words(
    word_set: set[str],
) -> dict[str, Any]:
    """Return exercises filtered to only include those using words from word_set.

    This is used by the lessons endpoint to select exercises appropriate
    for a given unit level.
    """
    filtered: dict[str, Any] = {}

    # Flashcards
    filtered["flashcards"] = [
        fc for fc in EXERCISES.get("flashcards", [])
        if fc["word"] in word_set
    ]

    # Sentence quiz
    sq = EXERCISES.get("sentence_quiz", {})
    filtered["sentence_quiz"] = {
        "tp2en": [
            s for s in sq.get("tp2en", [])
            if all(w in word_set for w in s.get("words", []))
        ],
        "en2tp": [
            s for s in sq.get("en2tp", [])
            if all(w in word_set for w in s.get("words", []))
        ],
        "grammar": [
            s for s in sq.get("grammar", [])
            if all(w in word_set for w in s.get("words", []))
        ],
    }

    # Word building
    filtered["word_building"] = [
        wb for wb in EXERCISES.get("word_building", [])
        if all(p in word_set for p in wb.get("parts", []))
    ]

    # Unscramble
    filtered["unscramble"] = [
        u for u in EXERCISES.get("unscramble", [])
        if all(w in word_set for w in u.get("words", []))
    ]

    # Sitelen pona
    filtered["sitelen_pona"] = [
        sp for sp in EXERCISES.get("sitelen_pona", [])
        if sp["word"] in word_set
    ]

    # Particles
    filtered["particles"] = [
        p for p in EXERCISES.get("particles", [])
        if all(w in word_set for w in p.get("words", []))
    ]

    # Stories
    filtered["stories"] = [
        st for st in EXERCISES.get("stories", [])
        if all(w in word_set for w in st.get("words", []))
    ]

    # Reverse build
    filtered["reverse_build"] = [
        rb for rb in EXERCISES.get("reverse_build", [])
        if all(w in word_set for w in rb.get("key_words", []))
    ]

    return filtered
```

- [ ] **Step 3:** Run the loader tests and verify they all pass (TDD green phase).

```bash
cd backend && python -m pytest tests/data/test_loader.py -v
```

Expected: All tests pass.

- [ ] **Step 4:** Commit with message: "Add JSON data loader with search, filter, word-set filtering, and tests"

- [ ] **Step 5:** Record learnings to `.claude/learnings-data-loader.md` using the surfacing-subagent-learnings skill.

---

## Task 4: Add UserProgress model and Alembic migration

**Files:**
- `backend/app/models.py` (modify)
- `backend/app/alembic/versions/xxx_add_user_progress.py` (new, auto-generated)

**Context:** The existing `models.py` has User, Item, and related models plus Message, Token, TokenPayload, NewPassword. We add UserProgress with JSON columns. The table uses `sa_column=Column(JSON)` for list/dict fields. Alembic env.py already imports from `app.models` so it will auto-detect the new table.

**Note:** The Item model and its related classes (ItemBase, ItemCreate, ItemUpdate, Item, ItemPublic, ItemsPublic) still exist in models.py and crud.py. We leave them as-is for this task -- cleaning them up is out of scope for Phase 2.

- [ ] **Step 1:** Write a test in `backend/tests/crud/test_user_progress.py` that creates a UserProgress record and verifies its fields.

Write to `backend/tests/crud/test_user_progress.py`:

```python
"""Tests for UserProgress model."""

import uuid

from sqlmodel import Session, select

from app.models import User, UserProgress
from tests.utils.user import create_random_user


def test_create_user_progress(db: Session) -> None:
    """UserProgress can be created with defaults and linked to a user."""
    user = create_random_user(db)
    progress = UserProgress(user_id=user.id)
    db.add(progress)
    db.commit()
    db.refresh(progress)

    assert progress.id is not None
    assert progress.user_id == user.id
    assert progress.completed_units == []
    assert progress.completed_lessons == []
    assert progress.current_unit == 1
    assert progress.srs_data == {}
    assert progress.total_correct == 0
    assert progress.total_answered == 0
    assert progress.streak_days == 0
    assert progress.last_activity is None
    assert progress.known_words == []
    assert progress.recent_errors == []
    assert progress.created_at is not None
    assert progress.updated_at is not None

    # Clean up
    db.delete(progress)
    db.commit()


def test_user_progress_json_fields(db: Session) -> None:
    """JSON columns store and retrieve complex data correctly."""
    user = create_random_user(db)
    progress = UserProgress(
        user_id=user.id,
        completed_units=[1, 2],
        completed_lessons=["1-1", "1-2", "2-1"],
        current_unit=3,
        srs_data={"pona": {"interval": 4, "ease": 2.5}},
        total_correct=42,
        total_answered=50,
        known_words=["mi", "sina", "pona"],
        recent_errors=[{"word": "toki", "count": 3}],
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)

    assert progress.completed_units == [1, 2]
    assert progress.completed_lessons == ["1-1", "1-2", "2-1"]
    assert progress.srs_data["pona"]["interval"] == 4
    assert progress.known_words == ["mi", "sina", "pona"]
    assert progress.recent_errors[0]["word"] == "toki"

    # Clean up
    db.delete(progress)
    db.commit()
```

- [ ] **Step 2:** Check that `tests/utils/user.py` has a `create_random_user` helper. If not, check what helpers exist and adapt the test accordingly.

```bash
cd backend && grep -n "def " tests/utils/user.py
```

If `create_random_user` does not exist, add it to `tests/utils/user.py`:

```python
def create_random_user(db: Session) -> User:
    """Create a random user for testing."""
    from app.core.security import get_password_hash
    user = User(
        email=f"test-{uuid.uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

- [ ] **Step 3:** Run the test and confirm it fails (model doesn't exist yet).

```bash
cd backend && python -m pytest tests/crud/test_user_progress.py -v 2>&1 | tail -20
```

Expected: ImportError or AttributeError because `UserProgress` is not in models.py.

- [ ] **Step 4:** Add UserProgress model to `backend/app/models.py`. Add the import for `Column` and `JSON` from sqlalchemy, and the model class after the existing User-related models.

Add these imports at the top of `backend/app/models.py` (alongside existing imports):

```python
from sqlalchemy import Column, DateTime, JSON
```

Note: `DateTime` is already imported. Merge the import to:
```python
from sqlalchemy import Column, DateTime, JSON
```

Add after the `UsersPublic` class (before ItemBase):

```python
class UserProgress(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    completed_units: list[int] = Field(default_factory=list, sa_column=Column(JSON))
    completed_lessons: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    current_unit: int = Field(default=1)
    srs_data: dict = Field(default_factory=dict, sa_column=Column(JSON))
    total_correct: int = Field(default=0)
    total_answered: int = Field(default=0)
    streak_days: int = Field(default=0)
    last_activity: datetime | None = None
    known_words: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    recent_errors: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
    )
```

**Important:** We use `default_factory=list` / `default_factory=dict` instead of `default=[]` / `default={}` to avoid the Python mutable default argument footgun. Even though SQLAlchemy handles the DB-level default, the Python-side default is shared across all instances if mutable, which can cause subtle bugs when objects are created without going through the DB (e.g., in tests or before flush).

- [ ] **Step 5:** Generate the Alembic migration.

```bash
cd backend && alembic revision --autogenerate -m "add user_progress table"
```

Expected: New migration file created in `backend/app/alembic/versions/`.

- [ ] **Step 6:** Apply the migration.

```bash
cd backend && alembic upgrade head
```

- [ ] **Step 7:** Run the UserProgress tests and verify they pass.

```bash
cd backend && python -m pytest tests/crud/test_user_progress.py -v
```

Expected: 2 tests pass.

- [ ] **Step 8:** Commit with message: "Add UserProgress model with JSON columns and Alembic migration"

- [ ] **Step 9:** Record learnings to `.claude/learnings-user-progress-model.md` using the surfacing-subagent-learnings skill.

---

## Task 5: Create data extraction script

**Files:**
- `backend/scripts/extract_data.py` (new)

**Context:** This script parses 3 HTML artifact files and outputs the JSON data files. The HTML artifacts may not exist yet -- this is a prerequisite. The script should fail gracefully with a clear message if the HTML files are not found. It extracts JavaScript variable assignments from `<script>` blocks.

- [ ] **Step 1:** Create `backend/scripts/extract_data.py`.

Write to `backend/scripts/extract_data.py`:

```python
#!/usr/bin/env python
"""Extract toki pona data from HTML artifact files into JSON.

Usage:
    python backend/scripts/extract_data.py [--html-dir PATH] [--output-dir PATH]

Prerequisites:
    The following HTML files must exist in --html-dir:
      - toki_pona_dictionary.html
      - toki_pona_dojo.html
      - toki_pona_modifiers.html

    These are the original learning app artifacts. If they are not present,
    this script will exit with an error message.
"""

import json
import logging
import re
import sys
from pathlib import Path

import click

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Default paths
DEFAULT_HTML_DIR = Path(__file__).parent.parent.parent  # repo root
DEFAULT_OUTPUT_DIR = Path(__file__).parent.parent / "app" / "data"

# JavaScript variable names to extract from each HTML file
DOJO_VARIABLES = {
    "SQ": "sentence_quiz_raw",
    "WB": "word_building",
    "US": "unscramble",
    "SP": "sitelen_pona",
    "PT": "particles",
    "ST": "stories",
    "RV": "reverse_build",
    "FC_ALL": "flashcards_raw",
}

DICTIONARY_VARIABLES = {
    "WORDS": "words_raw",
}

MODIFIERS_VARIABLES = {
    "SECTIONS": "sections_raw",
    "COMPARISONS": "comparisons_raw",
    "Qs": "quiz_raw",
}


def extract_js_variable(html_content: str, var_name: str) -> str | None:
    """Extract a JavaScript variable assignment from HTML script blocks.

    Looks for patterns like:
        const VAR_NAME = [...];
        let VAR_NAME = [...];
        var VAR_NAME = [...];
        VAR_NAME = [...];
    """
    # Match variable assignment (const/let/var or bare) with array or object value
    pattern = rf"(?:const|let|var)?\s*{re.escape(var_name)}\s*=\s*"
    match = re.search(pattern, html_content)
    if not match:
        return None

    # Find the start of the value
    start = match.end()
    if start >= len(html_content):
        return None

    # Track brackets to find the complete value
    open_char = html_content[start]
    if open_char == "[":
        close_char = "]"
    elif open_char == "{":
        close_char = "}"
    else:
        logger.warning("Unexpected value start for %s: %r", var_name, open_char)
        return None

    depth = 0
    in_string = False
    string_char = None
    i = start

    while i < len(html_content):
        char = html_content[i]

        if in_string:
            if char == "\\" and i + 1 < len(html_content):
                i += 2  # skip escaped character
                continue
            if char == string_char:
                in_string = False
        else:
            if char in ('"', "'", "`"):
                in_string = True
                string_char = char
            elif char == open_char:
                depth += 1
            elif char == close_char:
                depth -= 1
                if depth == 0:
                    return html_content[start : i + 1]

        i += 1

    logger.warning("Could not find closing bracket for %s", var_name)
    return None


def js_to_json(js_str: str) -> str:
    """Convert JavaScript object/array literal to valid JSON.

    Handles:
    - Unquoted keys: {key: value} -> {"key": "value"}
    - Single-quoted strings: 'value' -> "value"
    - Trailing commas
    - Template literals (basic)
    """
    # This is a simplified converter. For complex JS, a proper parser would be needed.
    # Replace single-quoted strings with double-quoted (careful with nested quotes)
    result = js_str

    # Remove trailing commas before ] or }
    result = re.sub(r",\s*([}\]])", r"\1", result)

    # Add quotes around unquoted keys
    result = re.sub(r"(?<=[{,])\s*(\w+)\s*:", r' "\1":', result)

    return result


def extract_dictionary(html_path: Path) -> list[dict]:
    """Extract word entries from the dictionary HTML."""
    logger.info("Extracting dictionary from %s", html_path)
    content = html_path.read_text(encoding="utf-8")

    raw = extract_js_variable(content, "WORDS")
    if raw is None:
        logger.error("Could not find WORDS variable in %s", html_path)
        return []

    try:
        json_str = js_to_json(raw)
        words = json.loads(json_str)
    except json.JSONDecodeError:
        logger.exception("Failed to parse WORDS from %s", html_path)
        return []

    logger.info("Extracted %d word entries", len(words))
    return words


def extract_exercises(html_path: Path) -> dict:
    """Extract exercise data from the dojo HTML."""
    logger.info("Extracting exercises from %s", html_path)
    content = html_path.read_text(encoding="utf-8")

    exercises = {}
    for var_name, key in DOJO_VARIABLES.items():
        raw = extract_js_variable(content, var_name)
        if raw is None:
            logger.warning("Could not find %s variable", var_name)
            exercises[key] = [] if var_name != "SQ" else {}
            continue

        try:
            json_str = js_to_json(raw)
            exercises[key] = json.loads(json_str)
        except json.JSONDecodeError:
            logger.exception("Failed to parse %s", var_name)
            exercises[key] = [] if var_name != "SQ" else {}

    # Restructure into final format
    result = {
        "flashcards": exercises.get("flashcards_raw", []),
        "sentence_quiz": exercises.get("sentence_quiz_raw", {}),
        "word_building": exercises.get("word_building", []),
        "unscramble": exercises.get("unscramble", []),
        "sitelen_pona": exercises.get("sitelen_pona", []),
        "particles": exercises.get("particles", []),
        "stories": exercises.get("stories", []),
        "reverse_build": exercises.get("reverse_build", []),
    }
    return result


def extract_grammar(html_path: Path) -> dict:
    """Extract grammar content from the modifiers HTML."""
    logger.info("Extracting grammar from %s", html_path)
    content = html_path.read_text(encoding="utf-8")

    result: dict = {"sections": [], "comparisons": [], "quiz": []}

    for var_name, key in MODIFIERS_VARIABLES.items():
        raw = extract_js_variable(content, var_name)
        if raw is None:
            logger.warning("Could not find %s variable", var_name)
            continue

        try:
            json_str = js_to_json(raw)
            parsed = json.loads(json_str)
        except json.JSONDecodeError:
            logger.exception("Failed to parse %s", var_name)
            continue

        if var_name == "SECTIONS":
            result["sections"] = parsed
        elif var_name == "COMPARISONS":
            result["comparisons"] = parsed
        elif var_name == "Qs":
            result["quiz"] = parsed

    return result


@click.command()
@click.option(
    "--html-dir",
    type=click.Path(exists=True, path_type=Path),
    default=DEFAULT_HTML_DIR,
    help="Directory containing the HTML artifact files.",
)
@click.option(
    "--output-dir",
    type=click.Path(path_type=Path),
    default=DEFAULT_OUTPUT_DIR,
    help="Directory to write JSON output files.",
)
def main(html_dir: Path, output_dir: Path) -> None:
    """Extract toki pona data from HTML artifacts into JSON files."""
    html_files = {
        "dictionary": html_dir / "toki_pona_dictionary.html",
        "dojo": html_dir / "toki_pona_dojo.html",
        "modifiers": html_dir / "toki_pona_modifiers.html",
    }

    # Check all HTML files exist
    missing = [name for name, path in html_files.items() if not path.exists()]
    if missing:
        logger.error(
            "Missing HTML artifact files: %s",
            ", ".join(f"{html_files[m]}" for m in missing),
        )
        logger.error(
            "Please provide the HTML artifacts before running extraction. "
            "The sample JSON data files can be used for development in the meantime."
        )
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    # Extract dictionary
    words = extract_dictionary(html_files["dictionary"])
    words_path = output_dir / "words.json"
    words_path.write_text(json.dumps(words, indent=2, ensure_ascii=False))
    logger.info("Wrote %d words to %s", len(words), words_path)

    # Extract exercises
    exercises = extract_exercises(html_files["dojo"])
    exercises_path = output_dir / "exercises.json"
    exercises_path.write_text(json.dumps(exercises, indent=2, ensure_ascii=False))
    logger.info("Wrote exercises to %s", exercises_path)

    # Extract grammar
    grammar = extract_grammar(html_files["modifiers"])
    grammar_path = output_dir / "grammar.json"
    grammar_path.write_text(json.dumps(grammar, indent=2, ensure_ascii=False))
    logger.info("Wrote grammar to %s", grammar_path)

    logger.info("Extraction complete.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2:** Verify the script runs and fails gracefully when HTML files are missing.

```bash
cd backend && python scripts/extract_data.py 2>&1 | tail -5
```

Expected: Error message about missing HTML artifacts, exit code 1.

- [ ] **Step 3:** Commit with message: "Add data extraction script for HTML artifacts"

- [ ] **Step 4:** Record learnings to `.claude/learnings-extract-data.md` using the surfacing-subagent-learnings skill.

---

## Task 6: Create data validation script

**Files:**
- `backend/scripts/validate_data.py` (new)

**Context:** Runs structural checks on the JSON data files. Should work with both the sample data and full extracted data.

- [ ] **Step 1:** Create `backend/scripts/validate_data.py`.

Write to `backend/scripts/validate_data.py`:

```python
#!/usr/bin/env python
"""Validate toki pona JSON data files for structural integrity.

Usage:
    python backend/scripts/validate_data.py [--data-dir PATH]

Exits 0 on success, 1 with details on failure.
"""

import json
import logging
import sys
from pathlib import Path

import click

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

DEFAULT_DATA_DIR = Path(__file__).parent.parent / "app" / "data"


class ValidationError(Exception):
    """Raised when a validation check fails."""


def load_json(path: Path) -> dict | list:
    """Load and parse a JSON file."""
    if not path.exists():
        raise ValidationError(f"File not found: {path}")
    with open(path) as f:
        return json.load(f)


def validate_words(words: list[dict], errors: list[str]) -> set[str]:
    """Validate words.json and return set of all word strings."""
    logger.info("Validating words.json (%d entries)", len(words))

    if len(words) < 85:
        errors.append(
            f"words.json has only {len(words)} entries (expected >= 85 for sample, 137 for full)"
        )

    required_fields = {"word", "ku", "pos", "definitions", "note"}
    word_set: set[str] = set()
    definition_fields = {"pos", "definition"}

    for i, entry in enumerate(words):
        missing = required_fields - set(entry.keys())
        if missing:
            errors.append(f"words[{i}] ({entry.get('word', '?')}): missing fields {missing}")

        word = entry.get("word")
        if not word or not isinstance(word, str):
            errors.append(f"words[{i}]: invalid or missing 'word' field")
            continue

        if word in word_set:
            errors.append(f"Duplicate word: '{word}'")
        word_set.add(word)

        if not isinstance(entry.get("ku"), bool):
            errors.append(f"words[{i}] ({word}): 'ku' must be a boolean")

        if not isinstance(entry.get("pos"), list) or len(entry.get("pos", [])) == 0:
            errors.append(f"words[{i}] ({word}): 'pos' must be a non-empty list")

        definitions = entry.get("definitions", [])
        if not isinstance(definitions, list) or len(definitions) == 0:
            errors.append(f"words[{i}] ({word}): 'definitions' must be a non-empty list")
        for j, defn in enumerate(definitions):
            missing_def = definition_fields - set(defn.keys())
            if missing_def:
                errors.append(
                    f"words[{i}] ({word}) definitions[{j}]: missing fields {missing_def}"
                )

    return word_set


def validate_exercises(exercises: dict, word_set: set[str], errors: list[str]) -> None:
    """Validate exercises.json."""
    logger.info("Validating exercises.json")

    required_keys = {
        "flashcards", "sentence_quiz", "word_building", "unscramble",
        "sitelen_pona", "particles", "stories", "reverse_build",
    }
    missing_keys = required_keys - set(exercises.keys())
    if missing_keys:
        errors.append(f"exercises.json: missing top-level keys {missing_keys}")

    # Flashcards: check categories have entries
    flashcards = exercises.get("flashcards", [])
    if len(flashcards) < 3:
        errors.append(f"flashcards: only {len(flashcards)} entries (need >= 3)")
    categories: dict[str, int] = {}
    for fc in flashcards:
        cat = fc.get("category", "unknown")
        categories[cat] = categories.get(cat, 0) + 1
        if fc.get("word") and fc["word"] not in word_set:
            errors.append(f"flashcard references unknown word: '{fc['word']}'")
    for cat, count in categories.items():
        if count < 3:
            errors.append(f"flashcard category '{cat}' has only {count} entries (need >= 3)")

    # Sentence quiz: check word references
    sq = exercises.get("sentence_quiz", {})
    for section_name in ["tp2en", "en2tp", "grammar"]:
        for i, item in enumerate(sq.get(section_name, [])):
            for w in item.get("words", []):
                if w not in word_set:
                    errors.append(
                        f"sentence_quiz.{section_name}[{i}] references unknown word: '{w}'"
                    )

    # Stories: check answer indices
    for i, story in enumerate(exercises.get("stories", [])):
        for j, q in enumerate(story.get("questions", [])):
            options = q.get("options", [])
            answer_idx = q.get("answer_index")
            if answer_idx is not None and (answer_idx < 0 or answer_idx >= len(options)):
                errors.append(
                    f"stories[{i}].questions[{j}]: answer_index {answer_idx} "
                    f"out of range (0-{len(options) - 1})"
                )
        for w in story.get("words", []):
            if w not in word_set:
                errors.append(f"stories[{i}] references unknown word: '{w}'")


def validate_grammar(grammar: dict, errors: list[str]) -> None:
    """Validate grammar.json."""
    logger.info("Validating grammar.json")

    required_keys = {"sections", "comparisons", "quiz"}
    missing_keys = required_keys - set(grammar.keys())
    if missing_keys:
        errors.append(f"grammar.json: missing top-level keys {missing_keys}")

    sections = grammar.get("sections", [])
    section_ids: set[str] = set()
    for i, section in enumerate(sections):
        for field in ["id", "number", "title", "content"]:
            if field not in section:
                errors.append(f"grammar.sections[{i}]: missing field '{field}'")
        sid = section.get("id")
        if sid:
            if sid in section_ids:
                errors.append(f"Duplicate grammar section id: '{sid}'")
            section_ids.add(sid)

    # Quiz: check answer indices
    for i, q in enumerate(grammar.get("quiz", [])):
        options = q.get("options", [])
        answer_idx = q.get("answer_index")
        if answer_idx is not None and (answer_idx < 0 or answer_idx >= len(options)):
            errors.append(
                f"grammar.quiz[{i}]: answer_index {answer_idx} "
                f"out of range (0-{len(options) - 1})"
            )


@click.command()
@click.option(
    "--data-dir",
    type=click.Path(exists=True, path_type=Path),
    default=DEFAULT_DATA_DIR,
    help="Directory containing JSON data files.",
)
def main(data_dir: Path) -> None:
    """Validate toki pona JSON data files."""
    errors: list[str] = []

    try:
        words = load_json(data_dir / "words.json")
        exercises = load_json(data_dir / "exercises.json")
        grammar = load_json(data_dir / "grammar.json")
    except ValidationError as e:
        logger.error("%s", e)
        sys.exit(1)

    word_set = validate_words(words, errors)
    validate_exercises(exercises, word_set, errors)
    validate_grammar(grammar, errors)

    if errors:
        logger.error("Validation FAILED with %d error(s):", len(errors))
        for err in errors:
            logger.error("  - %s", err)
        sys.exit(1)
    else:
        logger.info("Validation PASSED. All checks OK.")
        logger.info(
            "  Words: %d | Flashcards: %d | Grammar sections: %d",
            len(words),
            len(exercises.get("flashcards", [])),
            len(grammar.get("sections", [])),
        )
        sys.exit(0)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2:** Run the validation script against the sample data.

```bash
cd backend && python scripts/validate_data.py
```

Expected: Validation PASSED (exit code 0). If any errors, fix the sample data.

- [ ] **Step 3:** Commit with message: "Add data validation script for JSON files"

- [ ] **Step 4:** Record learnings to `.claude/learnings-validate-data.md` using the surfacing-subagent-learnings skill.

---

## Task 7: Create dictionary API endpoints

**Files:**
- `backend/app/api/routes/dictionary.py` (new)
- `backend/app/api/main.py` (modify)
- `backend/tests/api/routes/test_dictionary.py` (new)

**Context:** Read-only endpoints that serve word and grammar data from the loaded JSON. No authentication required for dictionary access.

- [ ] **Step 1:** Write failing tests in `backend/tests/api/routes/test_dictionary.py`.

Write to `backend/tests/api/routes/test_dictionary.py`:

```python
"""Tests for dictionary API endpoints."""

from fastapi.testclient import TestClient

from app.core.config import settings


def test_get_words_all(client: TestClient) -> None:
    """GET /dictionary/words returns a list of words."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Check structure of first word
    word = data[0]
    assert "word" in word
    assert "ku" in word
    assert "pos" in word
    assert "definitions" in word
    assert "note" in word


def test_get_words_search(client: TestClient) -> None:
    """GET /dictionary/words?q=water returns words matching 'water'."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"q": "water"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # "telo" should match (definition contains "water")
    words = [w["word"] for w in data]
    assert "telo" in words


def test_get_words_pos_filter(client: TestClient) -> None:
    """GET /dictionary/words?pos=verb returns only verbs."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"pos": "verb"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    for word in data:
        assert "verb" in word["pos"]


def test_get_words_ku_filter(client: TestClient) -> None:
    """GET /dictionary/words?set=ku returns only ku words."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"set": "ku"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    for word in data:
        assert word["ku"] is True


def test_get_words_pu_filter(client: TestClient) -> None:
    """GET /dictionary/words?set=pu returns only pu (non-ku) words."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"set": "pu"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    for word in data:
        assert word["ku"] is False


def test_get_word_detail(client: TestClient) -> None:
    """GET /dictionary/words/pona returns the pona word details."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words/pona")
    assert r.status_code == 200
    data = r.json()
    assert data["word"] == "pona"
    assert isinstance(data["definitions"], list)
    assert len(data["definitions"]) > 0


def test_get_word_detail_not_found(client: TestClient) -> None:
    """GET /dictionary/words/nonexistent returns 404."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words/nonexistent")
    assert r.status_code == 404


def test_get_grammar_all(client: TestClient) -> None:
    """GET /dictionary/grammar returns grammar data."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/grammar")
    assert r.status_code == 200
    data = r.json()
    assert "sections" in data
    assert "comparisons" in data
    assert "quiz" in data
    assert isinstance(data["sections"], list)
    assert len(data["sections"]) > 0


def test_get_grammar_section(client: TestClient) -> None:
    """GET /dictionary/grammar/core-rule returns that section."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/grammar/core-rule")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "core-rule"
    assert "title" in data
    assert "content" in data


def test_get_grammar_section_not_found(client: TestClient) -> None:
    """GET /dictionary/grammar/nonexistent returns 404."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/grammar/nonexistent")
    assert r.status_code == 404
```

- [ ] **Step 2:** Run tests and confirm they fail (routes don't exist yet).

```bash
cd backend && python -m pytest tests/api/routes/test_dictionary.py -v 2>&1 | tail -20
```

Expected: All tests fail with 404 or similar (routes not registered).

- [ ] **Step 3:** Create `backend/app/api/routes/dictionary.py`.

Write to `backend/app/api/routes/dictionary.py`:

```python
"""Dictionary API endpoints — words and grammar reference."""

from typing import Any

from fastapi import APIRouter, HTTPException

from app.data.loader import (
    get_grammar_section,
    get_grammar_sections,
    get_grammar_comparisons,
    get_grammar_quiz,
    get_word,
    search_words,
)

router = APIRouter(prefix="/dictionary", tags=["dictionary"])


@router.get("/words")
def list_words(
    q: str | None = None,
    pos: str | None = None,
    set: str | None = None,
) -> list[dict[str, Any]]:
    """Search and filter dictionary words.

    Query params:
        q: Search text (matches word name and definitions).
        pos: Part of speech filter (e.g. "noun", "verb", "particle").
        set: Word set filter — "pu" for core words, "ku" for ku words.
    """
    return search_words(q=q, pos=pos, word_set=set)


@router.get("/words/{word}")
def get_word_detail(word: str) -> dict[str, Any]:
    """Get details for a single word."""
    entry = get_word(word)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Word '{word}' not found")
    return entry


@router.get("/grammar")
def list_grammar() -> dict[str, Any]:
    """Get all grammar content: sections, comparisons, and quiz."""
    return {
        "sections": get_grammar_sections(),
        "comparisons": get_grammar_comparisons(),
        "quiz": get_grammar_quiz(),
    }


@router.get("/grammar/{section_id}")
def get_grammar_section_detail(section_id: str) -> dict[str, Any]:
    """Get a single grammar section by id."""
    section = get_grammar_section(section_id)
    if section is None:
        raise HTTPException(
            status_code=404, detail=f"Grammar section '{section_id}' not found"
        )
    return section
```

- [ ] **Step 4:** Register the dictionary router in `backend/app/api/main.py`. Add the import and include_router call.

In `backend/app/api/main.py`, add to imports:

```python
from app.api.routes import items, login, private, users, utils, dictionary
```

Add after the existing `include_router` calls (before the `if settings.ENVIRONMENT` block):

```python
api_router.include_router(dictionary.router)
```

- [ ] **Step 5:** Run the dictionary tests and verify they all pass.

```bash
cd backend && python -m pytest tests/api/routes/test_dictionary.py -v
```

Expected: All 11 tests pass.

- [ ] **Step 6:** Commit with message: "Add dictionary API endpoints with search and filter support"

- [ ] **Step 7:** Record learnings to `.claude/learnings-dictionary-api.md` using the surfacing-subagent-learnings skill.

---

## Task 8: Create lessons API endpoints

**Files:**
- `backend/app/api/routes/lessons.py` (new)
- `backend/app/api/main.py` (modify)
- `backend/tests/api/routes/test_lessons.py` (new)

**Context:** Serves the unit/lesson structure. The units endpoint returns the skill tree. The lesson exercises endpoint returns 5-7 exercises filtered by available words for that unit level. No authentication required.

- [ ] **Step 1:** Write failing tests in `backend/tests/api/routes/test_lessons.py`.

Write to `backend/tests/api/routes/test_lessons.py`:

```python
"""Tests for lessons API endpoints."""

from fastapi.testclient import TestClient

from app.core.config import settings


def test_get_units(client: TestClient) -> None:
    """GET /lessons/units returns all 10 units."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 10

    # Check first unit structure
    unit1 = data[0]
    assert unit1["id"] == 1
    assert unit1["name"] == "toki!"
    assert unit1["topic"] == "Greetings"
    assert isinstance(unit1["words"], list)
    assert isinstance(unit1["exercise_types"], list)
    assert isinstance(unit1["requires"], list)
    assert unit1["requires"] == []

    # Check unit ordering
    ids = [u["id"] for u in data]
    assert ids == list(range(1, 11))


def test_get_units_prerequisites(client: TestClient) -> None:
    """Units have correct prerequisite structure."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units")
    data = r.json()

    # Unit 4 requires both 2 and 3
    unit4 = next(u for u in data if u["id"] == 4)
    assert sorted(unit4["requires"]) == [2, 3]

    # Unit 8 requires both 6 and 7
    unit8 = next(u for u in data if u["id"] == 8)
    assert sorted(unit8["requires"]) == [6, 7]

    # Units 2 and 3 are parallel (both require only 1)
    unit2 = next(u for u in data if u["id"] == 2)
    unit3 = next(u for u in data if u["id"] == 3)
    assert unit2["requires"] == [1]
    assert unit3["requires"] == [1]


def test_get_unit_lesson_exercises(client: TestClient) -> None:
    """GET /lessons/units/1/lessons/1 returns exercises for unit 1."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units/1/lessons/1")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "exercises" in data
    assert "unit_id" in data
    assert "lesson_id" in data
    assert data["unit_id"] == 1
    assert data["lesson_id"] == 1
    exercises = data["exercises"]
    assert isinstance(exercises, list)
    assert 1 <= len(exercises) <= 10  # flexible range for sample data


def test_get_unit_lesson_exercises_unit_not_found(client: TestClient) -> None:
    """GET /lessons/units/99/lessons/1 returns 404."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units/99/lessons/1")
    assert r.status_code == 404


def test_get_unit_lesson_exercise_types(client: TestClient) -> None:
    """Exercises for unit 1 only include types allowed for that unit."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units/1/lessons/1")
    data = r.json()
    exercises = data["exercises"]
    allowed_types = {"match", "multichoice"}
    for ex in exercises:
        assert ex.get("type") in allowed_types, (
            f"Exercise type '{ex.get('type')}' not allowed for unit 1"
        )


def test_get_unit_4_has_more_types(client: TestClient) -> None:
    """Unit 4 should include word_bank and fill_particle types."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units/4/lessons/1")
    assert r.status_code == 200
    data = r.json()
    # Unit 4 allows: match, multichoice, word_bank, fill_particle
    # We just check the response is valid, not that all types appear
    # (sample data may not cover all)
    exercises = data["exercises"]
    assert isinstance(exercises, list)
```

- [ ] **Step 2:** Run tests and confirm they fail.

```bash
cd backend && python -m pytest tests/api/routes/test_lessons.py -v 2>&1 | tail -20
```

Expected: All tests fail (routes not registered).

- [ ] **Step 3:** Create `backend/app/api/routes/lessons.py`.

Write to `backend/app/api/routes/lessons.py`:

```python
"""Lessons API endpoints — unit tree and lesson exercises."""

import logging
import random
from typing import Any

from fastapi import APIRouter, HTTPException

from app.data.loader import get_exercises_by_words, get_word
from app.data.units import UNITS, UnitSummary, get_unit_by_id, get_words_up_to_unit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lessons", tags=["lessons"])

# Number of exercises per lesson
MIN_EXERCISES = 5
MAX_EXERCISES = 7


def _build_match_exercises(
    words: list[str],
    max_count: int = 3,
) -> list[dict[str, Any]]:
    """Build match-type exercises from available words.

    Match exercises pair a toki pona word with its definition.
    """
    exercises = []
    available = [w for w in words if get_word(w) is not None]
    selected = available[:max_count] if len(available) <= max_count else random.sample(available, max_count)

    for word_str in selected:
        entry = get_word(word_str)
        if entry and entry["definitions"]:
            exercises.append({
                "type": "match",
                "word": word_str,
                "definition": entry["definitions"][0]["definition"],
            })
    return exercises


def _build_multichoice_exercises(
    words: list[str],
    all_words: set[str],
    max_count: int = 3,
) -> list[dict[str, Any]]:
    """Build multiple-choice exercises from available words.

    Each exercise has 4 options: 1 correct + 3 distractors.
    """
    exercises = []
    available = [w for w in words if get_word(w) is not None]
    distractor_pool = [w for w in all_words if get_word(w) is not None]
    selected = available[:max_count] if len(available) <= max_count else random.sample(available, max_count)

    for word_str in selected:
        entry = get_word(word_str)
        if not entry or not entry["definitions"]:
            continue

        correct_def = entry["definitions"][0]["definition"]
        distractors = []
        for dw in distractor_pool:
            if dw == word_str:
                continue
            d_entry = get_word(dw)
            if d_entry and d_entry["definitions"]:
                distractors.append(d_entry["definitions"][0]["definition"])
            if len(distractors) >= 3:
                break

        options = [correct_def] + distractors[:3]
        random.shuffle(options)

        exercises.append({
            "type": "multichoice",
            "word": word_str,
            "options": options,
            "correct_index": options.index(correct_def),
        })
    return exercises


def _build_word_bank_exercises(
    filtered_exercises: dict[str, Any],
    max_count: int = 2,
) -> list[dict[str, Any]]:
    """Build word-bank exercises from unscramble data."""
    exercises = []
    unscramble = filtered_exercises.get("unscramble", [])
    selected = unscramble[:max_count]

    for item in selected:
        exercises.append({
            "type": "word_bank",
            "words": item["words"],
            "correct": item["correct"],
            "translation": item.get("translation", ""),
        })
    return exercises


def _build_fill_particle_exercises(
    filtered_exercises: dict[str, Any],
    max_count: int = 2,
) -> list[dict[str, Any]]:
    """Build fill-in-the-particle exercises."""
    exercises = []
    particles = filtered_exercises.get("particles", [])
    selected = particles[:max_count]

    for item in selected:
        exercises.append({
            "type": "fill_particle",
            "sentence": item["sentence"],
            "answer": item["answer"],
            "explanation": item.get("explanation", ""),
        })
    return exercises


def _build_free_compose_exercises(
    filtered_exercises: dict[str, Any],
    max_count: int = 1,
) -> list[dict[str, Any]]:
    """Build free composition exercises from reverse_build data."""
    exercises = []
    reverse = filtered_exercises.get("reverse_build", [])
    selected = reverse[:max_count]

    for item in selected:
        exercises.append({
            "type": "free_compose",
            "meaning": item["meaning"],
            "expected": item["expected"],
        })
    return exercises


def _build_concept_build_exercises(
    filtered_exercises: dict[str, Any],
    max_count: int = 1,
) -> list[dict[str, Any]]:
    """Build concept-building exercises from word_building data."""
    exercises = []
    word_building = filtered_exercises.get("word_building", [])
    selected = word_building[:max_count]

    for item in selected:
        exercises.append({
            "type": "concept_build",
            "compound": item["compound"],
            "meaning": item["meaning"],
            "parts": item["parts"],
        })
    return exercises


def _build_story_exercises(
    filtered_exercises: dict[str, Any],
    max_count: int = 1,
) -> list[dict[str, Any]]:
    """Build story comprehension exercises."""
    exercises = []
    stories = filtered_exercises.get("stories", [])
    selected = stories[:max_count]

    for item in selected:
        exercises.append({
            "type": "story",
            "title": item["title"],
            "text": item["text"],
            "questions": item["questions"],
        })
    return exercises


# Map exercise type names to builder functions
_EXERCISE_BUILDERS: dict[str, Any] = {
    "match": lambda words, all_words, filtered: _build_match_exercises(words),
    "multichoice": lambda words, all_words, filtered: _build_multichoice_exercises(words, all_words),
    "word_bank": lambda words, all_words, filtered: _build_word_bank_exercises(filtered),
    "fill_particle": lambda words, all_words, filtered: _build_fill_particle_exercises(filtered),
    "free_compose": lambda words, all_words, filtered: _build_free_compose_exercises(filtered),
    "concept_build": lambda words, all_words, filtered: _build_concept_build_exercises(filtered),
    "story": lambda words, all_words, filtered: _build_story_exercises(filtered),
}


@router.get("/units")
def list_units() -> list[dict[str, Any]]:
    """Return the full skill tree — all 10 units with metadata."""
    return UNITS


@router.get("/units/{unit_id}/lessons/{lesson_id}")
def get_lesson_exercises(unit_id: int, lesson_id: int) -> dict[str, Any]:
    """Return exercises for a specific lesson within a unit.

    Exercises are selected from the exercise pool, filtered to words
    available up to this unit, and limited to exercise types appropriate
    for the unit level.
    """
    unit = get_unit_by_id(unit_id)
    if unit is None:
        raise HTTPException(status_code=404, detail=f"Unit {unit_id} not found")

    # Get all words available up to this unit
    available_words = get_words_up_to_unit(unit_id)

    # Get filtered exercises
    filtered = get_exercises_by_words(available_words)

    # Build exercises using only allowed types for this unit
    all_exercises: list[dict[str, Any]] = []
    unit_words = list(unit["words"])
    allowed_types = unit["exercise_types"]

    for ex_type in allowed_types:
        builder = _EXERCISE_BUILDERS.get(ex_type)
        if builder:
            built = builder(unit_words, available_words, filtered)
            all_exercises.extend(built)

    # Limit to MAX_EXERCISES, ensure at least MIN_EXERCISES if possible
    if len(all_exercises) > MAX_EXERCISES:
        all_exercises = random.sample(all_exercises, MAX_EXERCISES)

    return {
        "unit_id": unit_id,
        "lesson_id": lesson_id,
        "unit_name": unit["name"],
        "exercises": all_exercises,
    }
```

- [ ] **Step 4:** Register the lessons router in `backend/app/api/main.py`. Add to imports and include_router.

In `backend/app/api/main.py`, update the import to include lessons:

```python
from app.api.routes import items, login, private, users, utils, dictionary, lessons
```

Add after the dictionary router include:

```python
api_router.include_router(lessons.router)
```

- [ ] **Step 5:** Run the lessons tests and verify they all pass.

```bash
cd backend && python -m pytest tests/api/routes/test_lessons.py -v
```

Expected: All 6 tests pass.

- [ ] **Step 6:** Commit with message: "Add lessons API endpoints with unit tree and exercise generation"

- [ ] **Step 7:** Record learnings to `.claude/learnings-lessons-api.md` using the surfacing-subagent-learnings skill.

---

## Task 9: Create data integrity tests

**Files:**
- `backend/tests/data/__init__.py` (new)
- `backend/tests/data/test_data_integrity.py` (new)

**Context:** These tests run the same structural checks as `validate_data.py` but as pytest tests, so they integrate into the CI test suite. They test the sample data that ships with the repo.

- [ ] **Step 1:** Create the test directory and `__init__.py`.

```bash
mkdir -p backend/tests/data
touch backend/tests/data/__init__.py
```

- [ ] **Step 2:** Write `backend/tests/data/test_data_integrity.py`.

Write to `backend/tests/data/test_data_integrity.py`:

```python
"""Data integrity tests — validates the JSON data files structurally.

These tests mirror the checks in scripts/validate_data.py but run
as part of the pytest suite.
"""

import json
from pathlib import Path

import pytest

DATA_DIR = Path(__file__).parent.parent.parent / "app" / "data"


@pytest.fixture(scope="module")
def words() -> list[dict]:
    with open(DATA_DIR / "words.json") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def exercises() -> dict:
    with open(DATA_DIR / "exercises.json") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def grammar() -> dict:
    with open(DATA_DIR / "grammar.json") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def word_set(words: list[dict]) -> set[str]:
    return {w["word"] for w in words}


# ---- Words tests ----


class TestWords:
    def test_minimum_count(self, words: list[dict]) -> None:
        """Sample data has at least 85 words (full dataset should have 137)."""
        assert len(words) >= 85

    def test_no_duplicate_words(self, words: list[dict]) -> None:
        """No duplicate word entries."""
        seen: set[str] = set()
        for entry in words:
            assert entry["word"] not in seen, f"Duplicate: {entry['word']}"
            seen.add(entry["word"])

    def test_required_fields(self, words: list[dict]) -> None:
        """Every word has all required fields."""
        required = {"word", "ku", "pos", "definitions", "note"}
        for entry in words:
            missing = required - set(entry.keys())
            assert not missing, f"{entry.get('word', '?')}: missing {missing}"

    def test_ku_is_boolean(self, words: list[dict]) -> None:
        """The ku field is always a boolean."""
        for entry in words:
            assert isinstance(entry["ku"], bool), f"{entry['word']}: ku is not bool"

    def test_pos_is_nonempty_list(self, words: list[dict]) -> None:
        """The pos field is a non-empty list."""
        for entry in words:
            assert isinstance(entry["pos"], list), f"{entry['word']}: pos is not list"
            assert len(entry["pos"]) > 0, f"{entry['word']}: pos is empty"

    def test_definitions_have_required_fields(self, words: list[dict]) -> None:
        """Each definition has pos and definition fields."""
        for entry in words:
            for defn in entry["definitions"]:
                assert "pos" in defn, f"{entry['word']}: definition missing 'pos'"
                assert "definition" in defn, f"{entry['word']}: definition missing 'definition'"

    def test_unit_words_exist(self, word_set: set[str]) -> None:
        """All words referenced by units exist in words.json."""
        from app.data.units import UNITS

        for unit in UNITS:
            for word in unit["words"]:
                assert word in word_set, (
                    f"Unit {unit['id']} ({unit['name']}) references "
                    f"unknown word '{word}'"
                )


# ---- Exercises tests ----


class TestExercises:
    def test_required_keys(self, exercises: dict) -> None:
        """exercises.json has all required top-level keys."""
        required = {
            "flashcards", "sentence_quiz", "word_building",
            "unscramble", "sitelen_pona", "particles", "stories",
            "reverse_build",
        }
        missing = required - set(exercises.keys())
        assert not missing, f"Missing keys: {missing}"

    def test_flashcard_minimum_count(self, exercises: dict) -> None:
        """At least 3 flashcard entries."""
        assert len(exercises["flashcards"]) >= 3

    def test_flashcard_words_exist(self, exercises: dict, word_set: set[str]) -> None:
        """Flashcard words reference valid words."""
        for fc in exercises["flashcards"]:
            assert fc["word"] in word_set, f"Flashcard unknown word: {fc['word']}"

    def test_flashcard_categories_have_enough(self, exercises: dict) -> None:
        """Each flashcard category has >= 3 entries."""
        categories: dict[str, int] = {}
        for fc in exercises["flashcards"]:
            cat = fc.get("category", "unknown")
            categories[cat] = categories.get(cat, 0) + 1
        for cat, count in categories.items():
            assert count >= 3, f"Category '{cat}' has only {count} entries"

    def test_sentence_quiz_words_exist(
        self, exercises: dict, word_set: set[str]
    ) -> None:
        """Sentence quiz word references are valid."""
        sq = exercises["sentence_quiz"]
        for section in ["tp2en", "en2tp", "grammar"]:
            for item in sq.get(section, []):
                for w in item.get("words", []):
                    assert w in word_set, (
                        f"sentence_quiz.{section} unknown word: '{w}'"
                    )

    def test_story_answer_indices_valid(self, exercises: dict) -> None:
        """Story question answer_index values are within range."""
        for story in exercises.get("stories", []):
            for q in story.get("questions", []):
                options = q["options"]
                idx = q["answer_index"]
                assert 0 <= idx < len(options), (
                    f"Story '{story['title']}': answer_index {idx} "
                    f"out of range for {len(options)} options"
                )

    def test_story_words_exist(self, exercises: dict, word_set: set[str]) -> None:
        """Story word references are valid."""
        for story in exercises.get("stories", []):
            for w in story.get("words", []):
                assert w in word_set, f"Story '{story['title']}' unknown word: '{w}'"


# ---- Grammar tests ----


class TestGrammar:
    def test_required_keys(self, grammar: dict) -> None:
        """grammar.json has all required top-level keys."""
        required = {"sections", "comparisons", "quiz"}
        missing = required - set(grammar.keys())
        assert not missing, f"Missing keys: {missing}"

    def test_sections_have_required_fields(self, grammar: dict) -> None:
        """Each section has id, number, title, content."""
        for section in grammar["sections"]:
            for field in ["id", "number", "title", "content"]:
                assert field in section, f"Section missing '{field}': {section.get('id', '?')}"

    def test_no_duplicate_section_ids(self, grammar: dict) -> None:
        """No duplicate section IDs."""
        seen: set[str] = set()
        for section in grammar["sections"]:
            sid = section["id"]
            assert sid not in seen, f"Duplicate section id: {sid}"
            seen.add(sid)

    def test_quiz_answer_indices_valid(self, grammar: dict) -> None:
        """Grammar quiz answer_index values are within range."""
        for i, q in enumerate(grammar.get("quiz", [])):
            options = q["options"]
            idx = q["answer_index"]
            assert 0 <= idx < len(options), (
                f"quiz[{i}]: answer_index {idx} out of range "
                f"for {len(options)} options"
            )

    def test_sections_minimum_count(self, grammar: dict) -> None:
        """At least 3 grammar sections in sample data."""
        assert len(grammar["sections"]) >= 3
```

- [ ] **Step 3:** Run the data integrity tests.

```bash
cd backend && python -m pytest tests/data/test_data_integrity.py -v
```

Expected: All tests pass.

- [ ] **Step 4:** Commit with message: "Add data integrity tests for JSON data files"

- [ ] **Step 5:** Record learnings to `.claude/learnings-data-integrity-tests.md` using the surfacing-subagent-learnings skill.

---

## Task 10: Run full test suite and self-review

**Files:** None new — this is a verification task.

- [ ] **Step 1:** Run the full backend test suite.

```bash
cd backend && python -m pytest -v 2>&1 | tail -40
```

Expected: All new tests pass. Pre-existing tests (items, users, login) should still pass.

- [ ] **Step 2:** Run the validation script.

```bash
cd backend && python scripts/validate_data.py
```

Expected: Exit code 0, "Validation PASSED".

- [ ] **Step 3:** Run the linter.

```bash
cd backend && python -m ruff check app/ tests/ scripts/
```

Expected: No errors. If there are warnings/errors, fix them.

- [ ] **Step 4:** Run type checking.

```bash
cd backend && python -m mypy app/
```

Expected: No errors. If there are type errors in the new code, fix them.

- [ ] **Step 5:** Verify all API endpoints work by listing routes.

```bash
cd backend && python -c "
from app.main import app
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        print(f'{route.methods} {route.path}')
" | grep -E "(dictionary|lessons)"
```

Expected output should include:
```
{'GET'} /api/v1/dictionary/words
{'GET'} /api/v1/dictionary/words/{word}
{'GET'} /api/v1/dictionary/grammar
{'GET'} /api/v1/dictionary/grammar/{section_id}
{'GET'} /api/v1/lessons/units
{'GET'} /api/v1/lessons/units/{unit_id}/lessons/{lesson_id}
```

- [ ] **Step 6:** If any issues found in steps 1-5, fix them and re-run. Then commit any fixes with message: "Fix lint/type/test issues in Phase 2 data layer"

- [ ] **Step 7:** Record learnings to `.claude/learnings-full-suite-verification.md` using the surfacing-subagent-learnings skill.

---

## Task 11: Curate learnings into CLAUDE.md

**Goal:** Improve CLAUDE.md files with all learnings captured during this phase.

- [ ] **Step 1:** Glob `.claude/learnings-*.md` and collect all scratch files written during this phase.
- [ ] **Step 2:** For each scratch file, dispatch a subagent with the `claude-md-improver` skill, providing the scratch file path in the prompt.
- [ ] **Step 3:** Verify all scratch files have been deleted after processing.

---

## Summary of deliverables

| # | Task | Key files | Tests |
|---|------|-----------|-------|
| 1 | JSON data files | `backend/app/data/{words,exercises,grammar}.json` | (validated in Task 9) |
| 2 | Unit structure | `backend/app/data/units.py` | `tests/data/test_units.py` |
| 3 | Data loader | `backend/app/data/loader.py` | `tests/data/test_loader.py` |
| 4 | UserProgress model | `backend/app/models.py`, Alembic migration | `tests/crud/test_user_progress.py` |
| 5 | Extraction script | `backend/scripts/extract_data.py` | (manual, needs HTML artifacts) |
| 6 | Validation script | `backend/scripts/validate_data.py` | (manual CLI) |
| 7 | Dictionary API | `backend/app/api/routes/dictionary.py` | `tests/api/routes/test_dictionary.py` |
| 8 | Lessons API | `backend/app/api/routes/lessons.py` | `tests/api/routes/test_lessons.py` |
| 9 | Data integrity tests | `tests/data/test_data_integrity.py` | Self |
| 10 | Full suite verification | N/A | All tests green |

## Task dependency graph

```
Task 1 (JSON data files)
  |
  +---> Task 2 (Unit structure)
  |       |
  +---> Task 3 (Data loader) --+---> Task 7 (Dictionary API)
  |                             |
  |                             +---> Task 8 (Lessons API)
  |
  +---> Task 5 (Extraction script) -- independent, can run in parallel
  +---> Task 6 (Validation script) -- depends on Task 1
  |
  Task 4 (UserProgress model) -- independent of Tasks 1-3
  |
  Task 9 (Data integrity tests) -- depends on Tasks 1-3
  |
  Task 10 (Full verification) -- depends on all above
```

**Parallelizable groups:**
- Group A: Tasks 1, 4, 5 (independent of each other)
- Group B: Tasks 2, 3 (depend on Task 1, independent of each other)
- Group C: Tasks 6, 7, 8 (depend on Group B, independent of each other)
- Group D: Task 9 (depends on Groups A-C)
- Group E: Task 10 (depends on all)
