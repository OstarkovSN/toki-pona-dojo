"""Data integrity tests — validates the JSON data files structurally.

These tests mirror the checks in scripts/validate_data.py but run
as part of the pytest suite.
"""

import json
from pathlib import Path
from typing import Any

import pytest

DATA_DIR = Path(__file__).parent.parent.parent / "app" / "data"


@pytest.fixture(scope="module")
def words() -> list[dict[str, Any]]:
    with open(DATA_DIR / "words.json") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def exercises() -> dict[str, Any]:
    with open(DATA_DIR / "exercises.json") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def grammar() -> dict[str, Any]:
    with open(DATA_DIR / "grammar.json") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def word_set(words: list[dict[str, Any]]) -> set[str]:
    return {w["word"] for w in words}


# ---- Words tests ----


class TestWords:
    def test_minimum_count(self, words: list[dict[str, Any]]) -> None:
        """Sample data has at least 85 words (full dataset should have 137)."""
        assert len(words) >= 85

    def test_no_duplicate_words(self, words: list[dict[str, Any]]) -> None:
        """No duplicate word entries."""
        seen: set[str] = set()
        for entry in words:
            assert entry["word"] not in seen, f"Duplicate: {entry['word']}"
            seen.add(entry["word"])

    def test_required_fields(self, words: list[dict[str, Any]]) -> None:
        """Every word has all required fields."""
        required = {"word", "ku", "pos", "definitions", "note"}
        for entry in words:
            missing = required - set(entry.keys())
            assert not missing, f"{entry.get('word', '?')}: missing {missing}"

    def test_ku_is_boolean(self, words: list[dict[str, Any]]) -> None:
        """The ku field is always a boolean."""
        for entry in words:
            assert isinstance(entry["ku"], bool), f"{entry['word']}: ku is not bool"

    def test_pos_is_nonempty_list(self, words: list[dict[str, Any]]) -> None:
        """The pos field is a non-empty list."""
        for entry in words:
            assert isinstance(entry["pos"], list), f"{entry['word']}: pos is not list"
            assert len(entry["pos"]) > 0, f"{entry['word']}: pos is empty"

    def test_definitions_have_required_fields(
        self, words: list[dict[str, Any]]
    ) -> None:
        """Each definition has pos and definition fields."""
        for entry in words:
            for defn in entry["definitions"]:
                assert "pos" in defn, f"{entry['word']}: definition missing 'pos'"
                assert "definition" in defn, (
                    f"{entry['word']}: definition missing 'definition'"
                )

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
    def test_required_keys(self, exercises: dict[str, Any]) -> None:
        """exercises.json has all required top-level keys."""
        required = {
            "flashcards",
            "sentence_quiz",
            "word_building",
            "unscramble",
            "sitelen_pona",
            "particles",
            "stories",
            "reverse_build",
        }
        missing = required - set(exercises.keys())
        assert not missing, f"Missing keys: {missing}"

    def test_flashcard_minimum_count(self, exercises: dict[str, Any]) -> None:
        """At least 3 flashcard entries."""
        assert len(exercises["flashcards"]) >= 3

    def test_flashcard_words_exist(
        self, exercises: dict[str, Any], word_set: set[str]
    ) -> None:
        """Flashcard words reference valid words."""
        for fc in exercises["flashcards"]:
            assert fc["word"] in word_set, f"Flashcard unknown word: {fc['word']}"

    def test_flashcard_categories_have_enough(self, exercises: dict[str, Any]) -> None:
        """Each flashcard category has >= 3 entries."""
        categories: dict[str, int] = {}
        for fc in exercises["flashcards"]:
            cat = fc.get("category", "unknown")
            categories[cat] = categories.get(cat, 0) + 1
        for cat, count in categories.items():
            assert count >= 3, f"Category '{cat}' has only {count} entries"

    def test_sentence_quiz_words_exist(
        self, exercises: dict[str, Any], word_set: set[str]
    ) -> None:
        """Sentence quiz word references are valid."""
        sq = exercises["sentence_quiz"]
        for section in ["tp2en", "en2tp", "grammar"]:
            for item in sq.get(section, []):
                for w in item.get("words", []):
                    assert w in word_set, f"sentence_quiz.{section} unknown word: '{w}'"

    def test_story_answer_indices_valid(self, exercises: dict[str, Any]) -> None:
        """Story question answer_index values are within range."""
        for story in exercises.get("stories", []):
            for q in story.get("questions", []):
                options = q["options"]
                idx = q["answer_index"]
                assert 0 <= idx < len(options), (
                    f"Story '{story['title']}': answer_index {idx} "
                    f"out of range for {len(options)} options"
                )

    def test_story_words_exist(
        self, exercises: dict[str, Any], word_set: set[str]
    ) -> None:
        """Story word references are valid."""
        for story in exercises.get("stories", []):
            for w in story.get("words", []):
                assert w in word_set, f"Story '{story['title']}' unknown word: '{w}'"


# ---- Grammar tests ----


class TestGrammar:
    def test_required_keys(self, grammar: dict[str, Any]) -> None:
        """grammar.json has all required top-level keys."""
        required = {"sections", "comparisons", "quiz"}
        missing = required - set(grammar.keys())
        assert not missing, f"Missing keys: {missing}"

    def test_sections_have_required_fields(self, grammar: dict[str, Any]) -> None:
        """Each section has id, number, title, content."""
        for section in grammar["sections"]:
            for field in ["id", "number", "title", "content"]:
                assert field in section, (
                    f"Section missing '{field}': {section.get('id', '?')}"
                )

    def test_no_duplicate_section_ids(self, grammar: dict[str, Any]) -> None:
        """No duplicate section IDs."""
        seen: set[str] = set()
        for section in grammar["sections"]:
            sid = section["id"]
            assert sid not in seen, f"Duplicate section id: {sid}"
            seen.add(sid)

    def test_quiz_answer_indices_valid(self, grammar: dict[str, Any]) -> None:
        """Grammar quiz answer_index values are within range."""
        for i, q in enumerate(grammar.get("quiz", [])):
            options = q["options"]
            idx = q["answer_index"]
            assert 0 <= idx < len(options), (
                f"quiz[{i}]: answer_index {idx} out of range for {len(options)} options"
            )

    def test_sections_minimum_count(self, grammar: dict[str, Any]) -> None:
        """At least 3 grammar sections in sample data."""
        assert len(grammar["sections"]) >= 3
