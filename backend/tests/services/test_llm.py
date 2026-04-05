

from app.services.llm import (
    SYSTEM_PROMPT_CHAT,
    SYSTEM_PROMPT_GRADE,
    build_chat_system_prompt,
    build_grade_system_prompt,
    get_llm_client,
)


def test_build_chat_system_prompt_includes_known_words() -> None:
    result = build_chat_system_prompt(
        mode="free_chat",
        known_words=["mi", "sina", "toki"],
        current_unit=2,
        recent_errors=[],
    )
    assert "mi, sina, toki" in result
    assert "free_chat" in result
    assert "2" in result


def test_build_chat_system_prompt_includes_recent_errors() -> None:
    errors = [
        {"word": "pona", "context": "confused with ike"},
        {"word": "telo", "context": "wrong particle"},
    ]
    result = build_chat_system_prompt(
        mode="grammar",
        known_words=["mi", "pona"],
        current_unit=3,
        recent_errors=errors,
    )
    assert "pona: confused with ike" in result
    assert "telo: wrong particle" in result


def test_build_chat_system_prompt_defaults_for_empty_words() -> None:
    result = build_chat_system_prompt(
        mode="free_chat",
        known_words=[],
        current_unit=1,
        recent_errors=[],
    )
    assert "mi, sina, pona, ike, toki" in result


def test_build_chat_system_prompt_defaults_for_empty_errors() -> None:
    result = build_chat_system_prompt(
        mode="free_chat",
        known_words=["mi"],
        current_unit=1,
        recent_errors=[],
    )
    assert "none" in result.lower()


def test_build_chat_system_prompt_truncates_errors_to_five() -> None:
    errors = [{"word": f"w{i}", "context": f"ctx{i}"} for i in range(10)]
    result = build_chat_system_prompt(
        mode="free_chat",
        known_words=["mi"],
        current_unit=1,
        recent_errors=errors,
    )
    # Only last 5 errors should appear
    assert "w5" in result
    assert "w9" in result
    assert "w0" not in result


def test_build_grade_system_prompt_includes_words() -> None:
    result = build_grade_system_prompt(known_words=["mi", "sina", "pona"])
    assert "mi, sina, pona" in result
    assert "JSON" in result


def test_build_grade_system_prompt_defaults_for_empty_words() -> None:
    result = build_grade_system_prompt(known_words=[])
    assert "all basic words" in result


def test_system_prompt_chat_has_jan_sona_persona() -> None:
    assert "jan sona" in SYSTEM_PROMPT_CHAT
    assert "toki pona dojo" in SYSTEM_PROMPT_CHAT


def test_system_prompt_grade_has_json_format() -> None:
    assert "correct" in SYSTEM_PROMPT_GRADE
    assert "score" in SYSTEM_PROMPT_GRADE
    assert "feedback" in SYSTEM_PROMPT_GRADE


def test_get_llm_client_returns_openai_instance() -> None:
    client = get_llm_client()
    from openai import OpenAI

    assert isinstance(client, OpenAI)
