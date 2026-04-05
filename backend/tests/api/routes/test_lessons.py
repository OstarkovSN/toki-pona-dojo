"""Tests for lessons API endpoints."""

from fastapi.testclient import TestClient

from app.core.config import settings


def test_get_units(client: TestClient) -> None:
    """GET /lessons/units returns all 10 units."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 10

    unit1 = data[0]
    assert unit1["id"] == 1
    assert unit1["name"] == "toki!"
    assert unit1["topic"] == "Greetings"
    assert isinstance(unit1["words"], list)
    assert isinstance(unit1["exercise_types"], list)
    assert isinstance(unit1["requires"], list)
    assert unit1["requires"] == []

    ids = [u["id"] for u in data]
    assert ids == list(range(1, 11))


def test_get_units_prerequisites(client: TestClient) -> None:
    """Units have correct prerequisite structure."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units")
    data = r.json()

    unit4 = next(u for u in data if u["id"] == 4)
    assert sorted(unit4["requires"]) == [2, 3]

    unit8 = next(u for u in data if u["id"] == 8)
    assert sorted(unit8["requires"]) == [6, 7]

    unit2 = next(u for u in data if u["id"] == 2)
    unit3 = next(u for u in data if u["id"] == 3)
    assert unit2["requires"] == [1]
    assert unit3["requires"] == [1]


def test_get_unit_lesson_exercises(client: TestClient) -> None:
    """GET /lessons/units/1/lessons/1 returns exercises for unit 1."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units/1/lessons/1")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "exercises" in data
    assert "unit_id" in data
    assert "lesson_id" in data
    assert data["unit_id"] == 1
    assert data["lesson_id"] == 1
    exercises = data["exercises"]
    assert isinstance(exercises, list)
    assert 1 <= len(exercises) <= 10


def test_get_unit_lesson_exercises_unit_not_found(client: TestClient) -> None:
    """GET /lessons/units/99/lessons/1 returns 404."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units/99/lessons/1")
    assert r.status_code == 404


def test_get_unit_lesson_exercise_types(client: TestClient) -> None:
    """Exercises for unit 1 only include types allowed for that unit."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units/1/lessons/1")
    data = r.json()
    exercises = data["exercises"]
    allowed_types = {"match", "multichoice"}
    for ex in exercises:
        assert ex.get("type") in allowed_types, (
            f"Exercise type '{ex.get('type')}' not allowed for unit 1"
        )


def test_get_unit_4_has_more_types(client: TestClient) -> None:
    """Unit 4 should include word_bank and fill_particle types."""
    r = client.get(f"{settings.API_V1_STR}/lessons/units/4/lessons/1")
    assert r.status_code == 200
    data = r.json()
    exercises = data["exercises"]
    assert isinstance(exercises, list)


def test_lesson_exercises_capped_at_max(client: TestClient) -> None:
    """gap-20: When >7 exercises are built, random.sample caps output at MAX_EXERCISES=7."""
    import random as random_mod
    from unittest.mock import patch

    original_sample = random_mod.sample
    sample_calls: list[tuple[object, int]] = []

    def recording_sample(population: object, k: int) -> list[object]:
        sample_calls.append((population, k))
        return original_sample(population, k)  # type: ignore[arg-type]

    with patch("app.api.routes.lessons.random.sample", side_effect=recording_sample):
        r = client.get(f"{settings.API_V1_STR}/lessons/units/10/lessons/1")

    assert r.status_code == 200
    exercises = r.json()["exercises"]
    assert len(exercises) <= 7

    capping_calls = [c for c in sample_calls if c[1] == 7]
    if capping_calls:
        assert capping_calls[0][1] == 7


def test_lesson_word_bank_skips_malformed_entries(client: TestClient) -> None:
    """gap-19: Malformed unscramble entries are skipped; good entries still returned."""
    from unittest.mock import patch as mock_patch

    malformed_filtered = {
        "unscramble": [
            {"words": ["mi", "pona"], "correct": "mi pona", "translation": "I am good"},
            {"words": ["sina"]},  # missing 'correct'
            None,  # not a dict
        ],
        "particles": [],
        "reverse_build": [],
        "word_building": [],
        "stories": [],
    }

    with mock_patch(
        "app.api.routes.lessons.get_exercises_by_words",
        return_value=malformed_filtered,
    ):
        r = client.get(f"{settings.API_V1_STR}/lessons/units/4/lessons/1")

    assert r.status_code == 200
    exercises = r.json()["exercises"]
    # No 500 error -- builder continued past bad entries
    word_bank = [e for e in exercises if e["type"] == "word_bank"]
    assert len(word_bank) >= 1
    assert word_bank[0]["correct"] == "mi pona"
