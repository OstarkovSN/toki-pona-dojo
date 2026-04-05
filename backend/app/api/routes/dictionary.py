"""Dictionary API endpoints — words and grammar reference."""

from typing import Any

from fastapi import APIRouter, HTTPException

from app.data.loader import (
    get_grammar_comparisons,
    get_grammar_quiz,
    get_grammar_section,
    get_grammar_sections,
    get_word,
    search_words,
)

router = APIRouter(prefix="/dictionary", tags=["dictionary"])


@router.get("/words")
def list_words(
    q: str | None = None,
    pos: str | None = None,
    word_set: str | None = None,
) -> list[dict[str, Any]]:
    """Search and filter dictionary words.

    Query params:
        q: Search text (matches word name and definitions).
        pos: Part of speech filter (e.g. "noun", "verb", "particle").
        word_set: Word set filter — "pu" for core words, "ku" for ku words.
    """
    return search_words(q=q, pos=pos, word_set=word_set)


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
