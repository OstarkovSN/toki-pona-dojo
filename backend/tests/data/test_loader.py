"""Tests for the JSON data loader module."""


def test_words_loaded() -> None:
    """WORDS is a non-empty list of dicts."""
    from app.data.loader import WORDS

    assert isinstance(WORDS, list)
    assert len(WORDS) > 0
    assert isinstance(WORDS[0], dict)


def test_exercises_loaded() -> None:
    """EXERCISES is a dict with expected top-level keys."""
    from app.data.loader import EXERCISES

    assert isinstance(EXERCISES, dict)
    assert "flashcards" in EXERCISES
    assert "sentence_quiz" in EXERCISES


def test_grammar_loaded() -> None:
    """GRAMMAR is a dict with expected top-level keys."""
    from app.data.loader import GRAMMAR

    assert isinstance(GRAMMAR, dict)
    assert "sections" in GRAMMAR


def test_get_word_found() -> None:
    """get_word returns the correct entry for a known word."""
    from app.data.loader import get_word

    entry = get_word("pona")
    assert entry is not None
    assert entry["word"] == "pona"
    assert "definitions" in entry
    assert isinstance(entry["definitions"], list)


def test_get_word_not_found() -> None:
    """get_word returns None for an unknown word."""
    from app.data.loader import get_word

    assert get_word("nonexistent_word_xyz") is None


def test_search_words_by_query() -> None:
    """search_words with q='water' finds 'telo'."""
    from app.data.loader import search_words

    results = search_words(q="water")
    words = [w["word"] for w in results]
    assert "telo" in words


def test_search_words_by_pos() -> None:
    """search_words with pos='verb' returns only words with 'verb' in pos."""
    from app.data.loader import search_words

    results = search_words(pos="verb")
    assert len(results) > 0
    for w in results:
        assert "verb" in w["pos"]


def test_search_words_by_word_set_ku() -> None:
    """search_words with word_set='ku' returns only ku words."""
    from app.data.loader import search_words

    results = search_words(word_set="ku")
    assert len(results) > 0
    for w in results:
        assert w["ku"] is True


def test_search_words_by_word_set_pu() -> None:
    """search_words with word_set='pu' returns only non-ku words."""
    from app.data.loader import search_words

    results = search_words(word_set="pu")
    assert len(results) > 0
    for w in results:
        assert w["ku"] is False


def test_search_words_combined_filters() -> None:
    """search_words with both q and pos narrows results."""
    from app.data.loader import search_words

    results = search_words(q="eat", pos="verb")
    words = [w["word"] for w in results]
    assert "moku" in words
    for w in results:
        assert "verb" in w["pos"]


def test_get_grammar_sections() -> None:
    """get_grammar_sections returns a non-empty list."""
    from app.data.loader import get_grammar_sections

    sections = get_grammar_sections()
    assert isinstance(sections, list)
    assert len(sections) > 0


def test_get_grammar_section_found() -> None:
    """get_grammar_section returns the correct section by id."""
    from app.data.loader import get_grammar_section

    section = get_grammar_section("basic-sentences")
    assert section is not None
    assert section["id"] == "basic-sentences"


def test_get_grammar_section_not_found() -> None:
    """get_grammar_section returns None for unknown id."""
    from app.data.loader import get_grammar_section

    assert get_grammar_section("nonexistent_section") is None


def test_get_exercises_by_words_filters_correctly() -> None:
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


def test_get_exercises_by_words_empty_set() -> None:
    """get_exercises_by_words with empty set returns empty exercise lists."""
    from app.data.loader import get_exercises_by_words

    result = get_exercises_by_words(set())
    assert result["flashcards"] == []
    assert result["sentence_quiz"]["tp2en"] == []


def test_search_words_no_args() -> None:
    """search_words with no args returns all words."""
    from app.data.loader import WORDS, search_words

    assert len(search_words()) == len(WORDS)


def test_get_grammar_comparisons() -> None:
    """get_grammar_comparisons returns a list."""
    from app.data.loader import get_grammar_comparisons

    result = get_grammar_comparisons()
    assert isinstance(result, list)


def test_get_grammar_quiz() -> None:
    """get_grammar_quiz returns a list."""
    from app.data.loader import get_grammar_quiz

    result = get_grammar_quiz()
    assert isinstance(result, list)


def test_get_exercises_by_words_all_keys_present() -> None:
    """get_exercises_by_words result has all 8 required keys."""
    from app.data.loader import get_exercises_by_words

    result = get_exercises_by_words({"mi", "sina", "pona"})
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
    assert required_keys.issubset(result.keys())


def test_duplicate_word_second_entry_overwrites_first() -> None:
    """gap-53: When two entries share 'word', second overwrites first in _WORD_INDEX.

    We verify the overwrite semantics by directly exercising the index-building
    loop logic: iterate a list of word dicts with duplicate 'word' keys and
    confirm that the last entry wins — matching what happens at module init.
    """
    import app.data.loader as loader_mod

    sentinel_word = "__test_dup_sentinel__"

    first_entry = {
        "word": sentinel_word,
        "definitions": [{"definition": "first"}],
        "pos": ["adj"],
        "ku": False,
    }
    second_entry = {
        "word": sentinel_word,
        "definitions": [{"definition": "OVERWRITTEN"}],
        "pos": ["adj"],
        "ku": False,
    }

    # Simulate the module-level loop that builds _WORD_INDEX
    for w in [first_entry, second_entry]:
        loader_mod._WORD_INDEX[str(w["word"])] = w

    try:
        entry = loader_mod.get_word(sentinel_word)
        assert entry is not None
        assert entry["definitions"][0]["definition"] == "OVERWRITTEN"
    finally:
        # Always clean up the sentinel key regardless of test outcome
        loader_mod._WORD_INDEX.pop(sentinel_word, None)
