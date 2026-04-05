"""Toki pona skill tree: 10 units with word lists and prerequisites."""

from typing import Any

from pydantic import BaseModel


class UnitSummary(BaseModel):
    """Unit metadata returned by the units list endpoint."""

    id: int
    name: str
    topic: str
    words: list[str]
    exercise_types: list[str]
    requires: list[int]


UNITS: list[dict[str, Any]] = [
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


def get_unit_by_id(unit_id: int) -> dict[str, Any] | None:
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
