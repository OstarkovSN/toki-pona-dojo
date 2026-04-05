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
            errors.append(
                f"words[{i}] ({entry.get('word', '?')}): missing fields {missing}"
            )

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
            errors.append(
                f"words[{i}] ({word}): 'definitions' must be a non-empty list"
            )
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
        "flashcards",
        "sentence_quiz",
        "word_building",
        "unscramble",
        "sitelen_pona",
        "particles",
        "stories",
        "reverse_build",
    }
    missing_keys = required_keys - set(exercises.keys())
    if missing_keys:
        errors.append(f"exercises.json: missing top-level keys {missing_keys}")

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
            errors.append(
                f"flashcard category '{cat}' has only {count} entries (need >= 3)"
            )

    sq = exercises.get("sentence_quiz", {})
    for section_name in ["tp2en", "en2tp", "grammar"]:
        for i, item in enumerate(sq.get(section_name, [])):
            for w in item.get("words", []):
                if w not in word_set:
                    errors.append(
                        f"sentence_quiz.{section_name}[{i}] references unknown word: '{w}'"
                    )

    for i, story in enumerate(exercises.get("stories", [])):
        for j, q in enumerate(story.get("questions", [])):
            options = q.get("options", [])
            answer_idx = q.get("answer_index")
            if answer_idx is not None and (
                answer_idx < 0 or answer_idx >= len(options)
            ):
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
