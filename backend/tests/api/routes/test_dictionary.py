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
    """GET /dictionary/words?set=ku returns only ku words."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"set": "ku"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    for word in data:
        assert word["ku"] is True


def test_get_words_pu_filter(client: TestClient) -> None:
    """GET /dictionary/words?set=pu returns only pu (non-ku) words."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/words", params={"set": "pu"})
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
    """GET /dictionary/grammar/{section_id} returns that section."""
    # Get the list first to find a valid section id
    r = client.get(f"{settings.API_V1_STR}/dictionary/grammar")
    sections = r.json()["sections"]
    assert len(sections) > 0
    first_id = sections[0]["id"]

    r = client.get(f"{settings.API_V1_STR}/dictionary/grammar/{first_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == first_id
    assert "title" in data
    assert "content" in data


def test_get_grammar_section_not_found(client: TestClient) -> None:
    """GET /dictionary/grammar/nonexistent returns 404."""
    r = client.get(f"{settings.API_V1_STR}/dictionary/grammar/nonexistent")
    assert r.status_code == 404
