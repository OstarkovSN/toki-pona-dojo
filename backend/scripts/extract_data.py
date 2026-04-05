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

MODIFIERS_VARIABLES = {
    "SECTIONS": "sections_raw",
    "COMPARISONS": "comparisons_raw",
    "Qs": "quiz_raw",
}


def extract_js_variable(html_content: str, var_name: str) -> str | None:
    """Extract a JavaScript variable assignment from HTML script blocks."""
    pattern = rf"(?:const|let|var)?\s*{re.escape(var_name)}\s*=\s*"
    match = re.search(pattern, html_content)
    if not match:
        return None

    start = match.end()
    if start >= len(html_content):
        return None

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
                i += 2
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
    """Convert JavaScript object/array literal to valid JSON."""
    result = js_str
    result = re.sub(r",\s*([}\]])", r"\1", result)
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

    for var_name, _key in MODIFIERS_VARIABLES.items():
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

    words = extract_dictionary(html_files["dictionary"])
    words_path = output_dir / "words.json"
    words_path.write_text(json.dumps(words, indent=2, ensure_ascii=False))
    logger.info("Wrote %d words to %s", len(words), words_path)

    exercises = extract_exercises(html_files["dojo"])
    exercises_path = output_dir / "exercises.json"
    exercises_path.write_text(json.dumps(exercises, indent=2, ensure_ascii=False))
    logger.info("Wrote exercises to %s", exercises_path)

    grammar = extract_grammar(html_files["modifiers"])
    grammar_path = output_dir / "grammar.json"
    grammar_path.write_text(json.dumps(grammar, indent=2, ensure_ascii=False))
    logger.info("Wrote grammar to %s", grammar_path)

    logger.info("Extraction complete.")


if __name__ == "__main__":
    main()
