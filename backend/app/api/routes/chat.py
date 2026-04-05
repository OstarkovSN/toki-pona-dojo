import asyncio
import json
import logging
from collections.abc import AsyncGenerator, Iterator
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from app.api.deps import get_optional_current_user
from app.core.config import settings
from app.core.rate_limit import limiter
from app.models import User
from app.schemas.chat import (
    ChatRequest,
    ExerciseGradeRequest,
    ExerciseGradeResponse,
)
from app.services.llm import (
    build_chat_system_prompt,
    build_grade_system_prompt,
    get_llm_client,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

# Maps asyncio Task id → whether the request is authenticated.
# Written by _set_auth_state (async dep, runs in the event loop).
# Read by _is_authenticated() (zero-arg, called by slowapi in the same task).
_task_is_authed: dict[int, bool] = {}


async def _set_auth_state(
    request: Request,
    user: Annotated[User | None, Depends(get_optional_current_user)],
) -> AsyncGenerator[User | None, None]:
    """Async dependency: resolve user and record auth status by task id.

    Because this is async, it runs directly in the event loop (not a
    threadpool), so asyncio.current_task() returns the same Task that
    slowapi's exempt_when() will later be called from.

    Uses yield so cleanup is guaranteed even if the endpoint raises.
    """
    task = asyncio.current_task()
    task_id = id(task) if task else None
    if task_id is not None:
        _task_is_authed[task_id] = user is not None
    request.state.user = user
    try:
        yield user
    finally:
        if task_id is not None:
            _task_is_authed.pop(task_id, None)


# Convenience alias for endpoint signatures
RequestUser = Annotated[User | None, Depends(_set_auth_state)]


def _is_authenticated() -> bool:
    """Zero-arg callable for slowapi's exempt_when.

    Called synchronously inside slowapi's async_wrapper (same asyncio Task as
    the endpoint), so asyncio.current_task() identifies the right entry in
    _task_is_authed, which was set by _set_auth_state before this runs.
    """
    try:
        task = asyncio.current_task()
        if task is not None:
            return _task_is_authed.get(id(task), False)
    except RuntimeError:
        pass
    return False


@router.post("/stream")
@limiter.limit(
    lambda: f"{settings.CHAT_FREE_DAILY_LIMIT}/day",
    exempt_when=_is_authenticated,
)
async def chat_stream(
    request: Request,  # noqa: ARG001  # required by slowapi for rate-limiting
    body: ChatRequest,
    user: RequestUser,
) -> StreamingResponse:
    """Stream a chat response from the LLM.

    Anonymous users: rate-limited to CHAT_FREE_DAILY_LIMIT/day, max_tokens capped.
    Authenticated users: exempt from rate limit, higher max_tokens.
    """
    client = get_llm_client()
    system = build_chat_system_prompt(
        mode=body.mode,
        known_words=body.known_words,
        current_unit=body.current_unit,
        recent_errors=body.recent_errors,
    )

    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    messages += [{"role": m.role, "content": m.content} for m in body.messages]

    max_tokens = settings.CHAT_FREE_MAX_TOKENS if user is None else 1500

    try:
        stream = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,  # type: ignore[arg-type]
            max_tokens=max_tokens,
            stream=True,
        )
    except Exception:
        logger.exception("LLM API call failed")

        async def _error_stream() -> AsyncGenerator[str, None]:
            yield 'data: {"error": "LLM service unavailable"}\n\n'
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            _error_stream(), media_type="text/event-stream", status_code=503
        )

    def generate() -> Iterator[str]:
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:  # type: ignore[union-attr]
                data = json.dumps({"content": chunk.choices[0].delta.content})  # type: ignore[union-attr]
                yield f"data: {data}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/grade", response_model=ExerciseGradeResponse)
@limiter.limit(
    lambda: f"{settings.CHAT_FREE_DAILY_LIMIT}/day",
    exempt_when=_is_authenticated,
)
async def grade_exercise(
    request: Request,  # noqa: ARG001  # required by slowapi for rate-limiting
    body: ExerciseGradeRequest,
    user: RequestUser,  # noqa: ARG001  # triggers _set_auth_state dep
) -> ExerciseGradeResponse:
    """Grade a free-form toki pona exercise using the LLM."""
    client = get_llm_client()
    system = build_grade_system_prompt(body.known_words)

    user_msg = (
        f"Exercise type: {body.exercise_type}\n"
        f"Prompt: {body.prompt}\n"
        f"User's answer: {body.user_answer}"
    )

    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,  # type: ignore[arg-type]
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=300,
        )
        content = response.choices[0].message.content or ""
        result = json.loads(content)
        return ExerciseGradeResponse(**result)
    except (json.JSONDecodeError, KeyError, ValidationError):
        logger.exception("Failed to parse LLM grading response")
        return ExerciseGradeResponse(
            correct=False,
            score=0.0,
            feedback="I couldn't grade this — please try rephrasing your answer.",
            suggested_answer=None,
        )
    except Exception:
        logger.exception("LLM API call failed for /chat/grade")
        return ExerciseGradeResponse(
            correct=False,
            score=0.0,
            feedback="The grading service is temporarily unavailable.",
            suggested_answer=None,
        )
