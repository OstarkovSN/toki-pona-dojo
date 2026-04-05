"""Tests for unit structure definition."""


def test_units_count():
    """There are exactly 10 units."""
    from app.data.units import UNITS

    assert len(UNITS) == 10


def test_units_have_required_fields():
    """Each unit has all required fields."""
    from app.data.units import UNITS

    required = {"id", "name", "topic", "words", "exercise_types", "requires"}
    for unit in UNITS:
        missing = required - set(unit.keys())
        assert not missing, f"Unit {unit.get('id', '?')}: missing {missing}"


def test_unit_ids_are_sequential():
    """Unit IDs are 1 through 10."""
    from app.data.units import UNITS

    ids = [u["id"] for u in UNITS]
    assert ids == list(range(1, 11))


def test_get_unit_by_id_found():
    """get_unit_by_id returns the correct unit."""
    from app.data.units import get_unit_by_id

    unit = get_unit_by_id(1)
    assert unit is not None
    assert unit["name"] == "toki!"


def test_get_unit_by_id_not_found():
    """get_unit_by_id returns None for unknown ID."""
    from app.data.units import get_unit_by_id

    assert get_unit_by_id(99) is None


def test_get_words_up_to_unit_1():
    """Words for unit 1 are just unit 1's words."""
    from app.data.units import get_unit_by_id, get_words_up_to_unit

    words = get_words_up_to_unit(1)
    unit1 = get_unit_by_id(1)
    assert words == set(unit1["words"])


def test_get_words_up_to_unit_4_includes_prerequisites():
    """Words up to unit 4 include units 1, 2, 3, and 4."""
    from app.data.units import get_words_up_to_unit

    words = get_words_up_to_unit(4)
    # Unit 4 requires 2 and 3, both require 1
    assert "mi" in words  # unit 1
    assert "jan" in words  # unit 2
    assert "lukin" in words  # unit 3
    assert "li" in words  # unit 4
    assert "pi" not in words  # unit 6, should NOT be included


def test_parallel_units_have_correct_prereqs():
    """Units 2 & 3 are parallel (both require 1); units 6 & 7 are parallel (both require 5)."""
    from app.data.units import get_unit_by_id

    assert get_unit_by_id(2)["requires"] == [1]
    assert get_unit_by_id(3)["requires"] == [1]
    assert get_unit_by_id(6)["requires"] == [5]
    assert get_unit_by_id(7)["requires"] == [5]


def test_get_words_up_to_unit_unknown_id():
    """Words up to a non-existent unit returns empty set."""
    from app.data.units import get_words_up_to_unit

    assert get_words_up_to_unit(99) == set()


def test_no_duplicate_words_across_units():
    """Each word appears in at most one unit."""
    from app.data.units import UNITS

    all_words = [w for unit in UNITS for w in unit["words"]]
    assert len(all_words) == len(set(all_words)), "Duplicate words found across units"
