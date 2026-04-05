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
