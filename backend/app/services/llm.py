import logging
from typing import Any

from openai import OpenAI

from app.core.config import settings
from app.services.tracing import _configure_langfuse_env

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_CHAT = """You are jan sona, a toki pona tutor on the site "toki pona dojo."

LEARNER CONTEXT:
- Current unit: {unit}
- Known words: {words}
- Recent errors: {errors}
- Chat mode: {mode}

RULES:
- Use ONLY words from the known list in your toki pona. Gloss unknown words in parentheses: "kasi (plant)"
- In free chat mode: respond in toki pona first, then provide an English translation below, separated by a blank line
- For grammar questions: explain in clear English with toki pona examples
- For translation requests: show multiple valid toki pona approaches with explanations
- Keep responses concise (2-4 sentences in each language)
- Gently correct mistakes inline — show the correction, explain briefly why
- Be warm, patient, encouraging
- Never break character as jan sona
- If the user writes in English, respond in English but include toki pona examples
- If the user writes in toki pona, respond primarily in toki pona"""

SYSTEM_PROMPT_GRADE = """You are a toki pona grading assistant. Grade the user's toki pona answer.

Respond in this exact JSON format:
{{"correct": true/false, "score": 0.0-1.0, "feedback": "...", "suggested_answer": "..." or null}}

Be generous — toki pona has multiple valid translations. A response is correct if it communicates the intended meaning using valid toki pona grammar, even if the phrasing differs from the expected answer.

Known words the learner has studied: {words}"""


def get_llm_client() -> OpenAI:
    """Return an OpenAI client, optionally wrapped with LangFuse tracing.

    When LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY are set, uses the
    langfuse.openai drop-in replacement which automatically traces all
    chat.completions.create() calls. Otherwise returns a plain OpenAI client.
    """
    if _configure_langfuse_env():
        try:
            from langfuse.openai import (  # type: ignore[attr-defined]
                OpenAI as LangfuseOpenAI,
            )

            logger.debug("Using LangFuse-instrumented OpenAI client")
            return LangfuseOpenAI(
                base_url=settings.OPENAI_BASE_URL,
                api_key=settings.OPENAI_API_KEY,
            )
        except Exception:
            logger.exception(
                "Failed to create LangFuse OpenAI client, falling back to plain client"
            )

    return OpenAI(
        base_url=settings.OPENAI_BASE_URL,
        api_key=settings.OPENAI_API_KEY,
    )


def build_chat_system_prompt(
    mode: str,
    known_words: list[str],
    current_unit: int,
    recent_errors: list[dict[str, Any]],
) -> str:
    """Build the chat system prompt with learner context injected."""
    errors_str = (
        "; ".join(
            [
                f"{e.get('word', '?')}: {e.get('context', '?')}"
                for e in recent_errors[-5:]
            ]
        )
        or "none"
    )
    return SYSTEM_PROMPT_CHAT.format(
        unit=current_unit,
        words=", ".join(known_words) if known_words else "mi, sina, pona, ike, toki",
        errors=errors_str,
        mode=mode,
    )


def build_grade_system_prompt(known_words: list[str]) -> str:
    """Build the grading system prompt with known words."""
    return SYSTEM_PROMPT_GRADE.format(
        words=", ".join(known_words) if known_words else "all basic words",
    )
