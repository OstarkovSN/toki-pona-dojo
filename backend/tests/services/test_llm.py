from unittest.mock import MagicMock, patch

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


class TestGetLlmClientLangfuse:
    """get_llm_client() returns LangFuse client when configured."""

    def test_returns_plain_openai_when_not_configured(self) -> None:
        from openai import OpenAI

        with patch("app.services.llm._configure_langfuse_env", return_value=False):
            client = get_llm_client()
            assert isinstance(client, OpenAI)

    def test_returns_langfuse_client_when_configured(self) -> None:
        mock_langfuse_openai_cls = MagicMock()
        mock_langfuse_openai_instance = MagicMock()
        mock_langfuse_openai_cls.return_value = mock_langfuse_openai_instance

        with (
            patch("app.services.llm._configure_langfuse_env", return_value=True),
            patch.dict(
                "sys.modules",
                {"langfuse.openai": MagicMock(OpenAI=mock_langfuse_openai_cls)},
            ),
        ):
            client = get_llm_client()
            assert client is mock_langfuse_openai_instance


def test_build_chat_system_prompt_missing_word_key_falls_back() -> None:
    """gap-46: Error dict missing 'word' or 'context' key falls back to '?' without raising."""
    errors = [
        {"context": "some context"},  # missing 'word'
        {"word": "pona"},  # missing 'context'
        {},  # both missing
    ]
    result = build_chat_system_prompt(
        mode="free_chat",
        known_words=["mi"],
        current_unit=1,
        recent_errors=errors,
    )
    assert "?: some context" in result
    assert "pona: ?" in result
    assert "?: ?" in result


def test_build_chat_system_prompt_invalid_mode_still_renders() -> None:
    """gap-47: An unrecognized mode string is included in the prompt without raising."""
    result = build_chat_system_prompt(
        mode="invalid_mode_xyz",
        known_words=["mi", "sina"],
        current_unit=1,
        recent_errors=[],
    )
    assert isinstance(result, str)
    assert len(result) > 0


def test_build_chat_system_prompt_empty_known_words_does_not_crash() -> None:
    """gap-48: Empty known_words list does not raise AttributeError."""
    result = build_chat_system_prompt(
        mode="free_chat",
        known_words=[],
        current_unit=1,
        recent_errors=[],
    )
    assert isinstance(result, str)
    assert len(result) > 0


def test_build_grade_system_prompt_empty_known_words_returns_prompt() -> None:
    """gap-50: build_grade_system_prompt with empty list returns valid prompt string."""
    result = build_grade_system_prompt(known_words=[])
    assert isinstance(result, str)
    assert len(result) > 0
    assert "JSON" in result
