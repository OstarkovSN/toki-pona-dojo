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
    """GET /dictionary/words?word_set=ku returns only ku words."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"word_set": "ku"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    for word in data:
        assert word["ku"] is True


def test_get_words_pu_filter(client: TestClient) -> None:
    """GET /dictionary/words?word_set=pu returns only pu (non-ku) words."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"word_set": "pu"})
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
    """GET /dictionary/grammar/basic-sentences returns that section."""
    section_id = "basic-sentences"
    r = client.get(f"{settings.API_V1_STR}/dictionary/grammar/{section_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == section_id
    assert "title" in data
    assert "content" in data


def test_get_grammar_section_not_found(client: TestClient) -> None:
    """GET /dictionary/grammar/nonexistent returns 404 with detail message."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/grammar/nonexistent")
    assert r.status_code == 404
    assert "nonexistent" in r.json()["detail"]


def test_list_words_empty_q_returns_all(client: TestClient) -> None:
    """gap-22: q='' is treated the same as no filter -- returns all words."""
    r_all = client.get(f"{settings.API_V1_STR}/dictionary/words")
    r_empty_q = client.get(f"{settings.API_V1_STR}/dictionary/words?q=")

    assert r_all.status_code == 200
    assert r_empty_q.status_code == 200
    assert len(r_empty_q.json()) == len(r_all.json())


def test_get_words_count_matches_json(client: TestClient) -> None:
    """GET /dictionary/words returns all words — count matches words.json."""
    import json
    from pathlib import Path

    words_json = json.loads(
        (Path(__file__).parents[3] / "app/data/words.json").read_text()
    )
    r = client.get(f"{settings.API_V1_STR}/dictionary/words")
    assert r.status_code == 200
    assert len(r.json()) == len(words_json)


def test_get_words_combined_q_and_pos_filter(client: TestClient) -> None:
    """Combined q + pos filter returns narrower results than either alone."""
    r_q = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"q": "a"})
    r_pos = client.get(
        f"{settings.API_V1_STR}/dictionary/words", params={"pos": "particle"}
    )
    r_both = client.get(
        f"{settings.API_V1_STR}/dictionary/words",
        params={"q": "a", "pos": "particle"},
    )
    assert r_both.status_code == 200
    both_count = len(r_both.json())
    assert both_count <= len(r_q.json())
    assert both_count <= len(r_pos.json())
    assert both_count > 0  # sanity: should still match something


def test_get_words_search_case_insensitive(client: TestClient) -> None:
    """Search is case-insensitive — 'TELO' matches the word 'telo'."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"q": "TELO"})
    assert r.status_code == 200
    words = [str(w["word"]) for w in r.json()]
    assert "telo" in words


def test_get_word_detail_optional_fields_present(client: TestClient) -> None:
    """Word detail for 'alasa' includes all required field keys."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words/alasa")
    assert r.status_code == 200
    data = r.json()
    required_keys = {"word", "ku", "pos", "definitions", "note"}
    for key in required_keys:
        assert key in data, f"Missing required key: {key}"


def test_get_word_detail_404_message_contains_word(client: TestClient) -> None:
    """GET /dictionary/words/nonexistent 404 detail message mentions the word."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words/nonexistent")
    assert r.status_code == 404
    assert "nonexistent" in r.json()["detail"]


def test_no_words_with_pos_equal_to_word(client: TestClient) -> None:
    """No word entry has pos == ['word'] — a sentinel/fallback that must not appear."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words")
    assert r.status_code == 200
    for entry in r.json():
        assert entry["pos"] != ["word"], (
            f"Word '{entry['word']}' has pos=['word'] which is forbidden"
        )


def test_get_words_search_by_definition_text(client: TestClient) -> None:
    """Searching by English definition text returns the matching word."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"q": "water"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    words = [str(w["word"]) for w in data]
    assert "telo" in words
