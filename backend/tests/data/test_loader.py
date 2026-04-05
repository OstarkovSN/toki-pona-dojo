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

    section = get_grammar_section("basic-sentences")
    assert section is not None
    assert section["id"] == "basic-sentences"


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
