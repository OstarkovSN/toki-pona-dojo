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
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        logger.exception("Failed to load required data file: %s", path)
        raise


WORDS: list[dict[str, Any]] = _load_json("words.json")
EXERCISES: dict[str, Any] = _load_json("exercises.json")
GRAMMAR: dict[str, Any] = _load_json("grammar.json")

# Build lookup indexes
_WORD_INDEX: dict[str, dict[str, Any]] = {}
for _w in WORDS:
    if "word" not in _w:
        logger.warning("Word entry missing 'word' key, skipping: %s", _w)
        continue
    _WORD_INDEX[_w["word"]] = _w

logger.info(
    "Loaded %d words, %d grammar sections",
    len(WORDS),
    len(GRAMMAR.get("sections", [])),
)

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
        word_set: "pu" for core words only, "ku" for ku words only, None (or any other value) for all.
    """
    results: list[dict[str, Any]] = list(WORDS)

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
    sections: list[dict[str, Any]] = GRAMMAR.get("sections", [])
    return sections


def get_grammar_section(section_id: str) -> dict[str, Any] | None:
    """Return a single grammar section by id."""
    sections: list[dict[str, Any]] = GRAMMAR.get("sections", [])
    for section in sections:
        if section["id"] == section_id:
            return section
    return None


def get_grammar_comparisons() -> list[dict[str, Any]]:
    """Return all grammar comparisons."""
    comparisons: list[dict[str, Any]] = GRAMMAR.get("comparisons", [])
    return comparisons


def get_grammar_quiz() -> list[dict[str, Any]]:
    """Return grammar quiz questions."""
    quiz: list[dict[str, Any]] = GRAMMAR.get("quiz", [])
    return quiz


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
        fc for fc in EXERCISES.get("flashcards", []) if fc["word"] in word_set
    ]

    # Sentence quiz
    sq = EXERCISES.get("sentence_quiz", {})
    filtered["sentence_quiz"] = {
        "tp2en": [
            s
            for s in sq.get("tp2en", [])
            if all(w in word_set for w in s.get("words", []))
        ],
        "en2tp": [
            s
            for s in sq.get("en2tp", [])
            if all(w in word_set for w in s.get("words", []))
        ],
        "grammar": [
            s
            for s in sq.get("grammar", [])
            if all(w in word_set for w in s.get("words", []))
        ],
    }

    # Word building
    filtered["word_building"] = [
        wb
        for wb in EXERCISES.get("word_building", [])
        if all(p in word_set for p in wb.get("parts", []))
    ]

    # Unscramble
    filtered["unscramble"] = [
        u
        for u in EXERCISES.get("unscramble", [])
        if all(w in word_set for w in u.get("words", []))
    ]

    # Sitelen pona
    filtered["sitelen_pona"] = [
        sp for sp in EXERCISES.get("sitelen_pona", []) if sp["word"] in word_set
    ]

    # Particles
    filtered["particles"] = [
        p
        for p in EXERCISES.get("particles", [])
        if all(w in word_set for w in p.get("words", []))
    ]

    # Stories
    filtered["stories"] = [
        st
        for st in EXERCISES.get("stories", [])
        if all(w in word_set for w in st.get("words", []))
    ]

    # Reverse build
    filtered["reverse_build"] = [
        rb
        for rb in EXERCISES.get("reverse_build", [])
        if all(w in word_set for w in rb.get("key_words", []))
    ]

    return filtered
