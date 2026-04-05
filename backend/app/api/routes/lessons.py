"""Lessons API endpoints — unit tree and lesson exercises."""

import logging
import random
from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, HTTPException

from app.data.loader import get_exercises_by_words, get_word
from app.data.units import UNITS, UnitSummary, get_unit_by_id, get_words_up_to_unit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lessons", tags=["lessons"])

MAX_EXERCISES = 7

_ExBuilder = Callable[[list[str], set[str], dict[str, Any]], list[dict[str, Any]]]


def _build_match_exercises(
    words: list[str],
    max_count: int = 3,
) -> list[dict[str, Any]]:
    """Build match-type exercises from available words."""
    exercises = []
    available = [w for w in words if get_word(w) is not None]
    selected = (
        available[:max_count]
        if len(available) <= max_count
        else random.sample(available, max_count)
    )

    for word_str in selected:
        entry = get_word(word_str)
        if entry and entry["definitions"]:
            exercises.append(
                {
                    "type": "match",
                    "word": word_str,
                    "definition": entry["definitions"][0]["definition"],
                }
            )
    return exercises


def _build_multichoice_exercises(
    words: list[str],
    all_words: set[str],
    max_count: int = 3,
) -> list[dict[str, Any]]:
    """Build multiple-choice exercises from available words."""
    exercises = []
    available = [w for w in words if get_word(w) is not None]
    distractor_pool = [w for w in all_words if get_word(w) is not None]
    selected = (
        available[:max_count]
        if len(available) <= max_count
        else random.sample(available, max_count)
    )

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

        exercises.append(
            {
                "type": "multichoice",
                "word": word_str,
                "options": options,
                "correct_index": options.index(correct_def),
            }
        )
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
        exercises.append(
            {
                "type": "word_bank",
                "words": item["words"],
                "correct": item["correct"],
                "translation": item.get("translation", ""),
            }
        )
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
        exercises.append(
            {
                "type": "fill_particle",
                "sentence": item["sentence"],
                "answer": item["answer"],
                "explanation": item.get("explanation", ""),
            }
        )
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
        exercises.append(
            {
                "type": "free_compose",
                "meaning": item["meaning"],
                "expected": item["expected"],
            }
        )
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
        exercises.append(
            {
                "type": "concept_build",
                "compound": item["compound"],
                "meaning": item["meaning"],
                "parts": item["parts"],
            }
        )
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
        exercises.append(
            {
                "type": "story",
                "title": item["title"],
                "text": item["text"],
                "questions": item["questions"],
            }
        )
    return exercises


_EXERCISE_BUILDERS: dict[str, _ExBuilder] = {
    "match": lambda words, all_words, filtered: _build_match_exercises(words),
    "multichoice": lambda words, all_words, filtered: _build_multichoice_exercises(
        words, all_words
    ),
    "word_bank": lambda words, all_words, filtered: _build_word_bank_exercises(
        filtered
    ),
    "fill_particle": lambda words, all_words, filtered: _build_fill_particle_exercises(
        filtered
    ),
    "free_compose": lambda words, all_words, filtered: _build_free_compose_exercises(
        filtered
    ),
    "concept_build": lambda words, all_words, filtered: _build_concept_build_exercises(
        filtered
    ),
    "story": lambda words, all_words, filtered: _build_story_exercises(filtered),
}


@router.get("/units", response_model=list[UnitSummary])
def list_units() -> list[dict[str, Any]]:
    """Return the full skill tree — all 10 units with metadata."""
    return UNITS


@router.get("/units/{unit_id}/lessons/{lesson_id}")
def get_lesson_exercises(unit_id: int, lesson_id: int) -> dict[str, Any]:
    """Return exercises for a specific lesson within a unit."""
    unit = get_unit_by_id(unit_id)
    if unit is None:
        raise HTTPException(status_code=404, detail=f"Unit {unit_id} not found")

    available_words = get_words_up_to_unit(unit_id)
    filtered = get_exercises_by_words(available_words)

    all_exercises: list[dict[str, Any]] = []
    unit_words = list(unit["words"])
    allowed_types = unit["exercise_types"]

    for ex_type in allowed_types:
        builder = _EXERCISE_BUILDERS.get(ex_type)
        if builder:
            built = builder(unit_words, available_words, filtered)
            all_exercises.extend(built)

    if len(all_exercises) > MAX_EXERCISES:
        all_exercises = random.sample(all_exercises, MAX_EXERCISES)

    return {
        "unit_id": unit_id,
        "lesson_id": lesson_id,
        "unit_name": unit["name"],
        "exercises": all_exercises,
    }
