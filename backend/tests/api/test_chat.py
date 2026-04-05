import json
from typing import Any
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.core.config import settings

# ---------------------------------------------------------------------------
# Helpers: mock OpenAI streaming and non-streaming responses
# ---------------------------------------------------------------------------


def _make_mock_stream_chunk(content: str) -> MagicMock:
    chunk = MagicMock()
    delta = MagicMock()
    delta.content = content
    choice = MagicMock()
    choice.delta = delta
    chunk.choices = [choice]
    return chunk


def _make_mock_stream(texts: list[str]) -> MagicMock:
    chunks = [_make_mock_stream_chunk(t) for t in texts]
    stream = MagicMock()
    stream.__iter__ = MagicMock(return_value=iter(chunks))
    return stream


def _make_mock_completion(content: str) -> MagicMock:
    message = MagicMock()
    message.content = content
    choice = MagicMock()
    choice.message = message
    completion = MagicMock()
    completion.choices = [choice]
    return completion


def _chat_request_body(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "messages": [{"role": "user", "content": "toki! mi wile kama sona"}],
        "mode": "free_chat",
        "known_words": ["mi", "sina", "toki", "pona"],
        "current_unit": 1,
        "recent_errors": [],
    }
    base.update(overrides)
    return base


def _grade_request_body(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "exercise_type": "translate_to_tp",
        "prompt": "Translate: I am good",
        "user_answer": "mi pona",
        "known_words": ["mi", "pona"],
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# /chat/stream tests
# ---------------------------------------------------------------------------


class TestChatStream:
    @patch("app.api.routes.chat.get_llm_client")
    def test_stream_returns_sse_chunks(
        self, mock_get_client: MagicMock, client: TestClient
    ) -> None:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_stream(
            ["toki", " pona", "!"]
        )
        mock_get_client.return_value = mock_client

        response = client.post(
            f"{settings.API_V1_STR}/chat/stream",
            json=_chat_request_body(),
        )

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")

        lines = response.text.strip().split("\n\n")
        data_lines = [line for line in lines if line.startswith("data:")]
        assert len(data_lines) == 4  # 3 content + 1 DONE

        first = json.loads(data_lines[0].removeprefix("data: "))
        assert first["content"] == "toki"
        assert data_lines[-1].strip() == "data: [DONE]"

    @patch("app.api.routes.chat.get_llm_client")
    def test_stream_uses_lower_max_tokens_for_anon(
        self, mock_get_client: MagicMock, client: TestClient
    ) -> None:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_stream(["ok"])
        mock_get_client.return_value = mock_client

        client.post(
            f"{settings.API_V1_STR}/chat/stream",
            json=_chat_request_body(),
        )

        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["max_tokens"] == settings.CHAT_FREE_MAX_TOKENS

    @patch("app.api.routes.chat.get_llm_client")
    def test_stream_uses_higher_max_tokens_for_authenticated(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        normal_user_token_headers: dict[str, str],
    ) -> None:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_stream(["ok"])
        mock_get_client.return_value = mock_client

        client.post(
            f"{settings.API_V1_STR}/chat/stream",
            json=_chat_request_body(),
            headers=normal_user_token_headers,
        )

        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["max_tokens"] == 1500

    def test_stream_rejects_empty_messages(self, client: TestClient) -> None:
        response = client.post(
            f"{settings.API_V1_STR}/chat/stream",
            json=_chat_request_body(messages=[]),
        )
        assert response.status_code == 422

    def test_stream_rejects_invalid_mode(self, client: TestClient) -> None:
        response = client.post(
            f"{settings.API_V1_STR}/chat/stream",
            json=_chat_request_body(mode="invalid_mode"),
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# /chat/grade tests
# ---------------------------------------------------------------------------


class TestChatGrade:
    @patch("app.api.routes.chat.get_llm_client")
    def test_grade_returns_valid_response(
        self, mock_get_client: MagicMock, client: TestClient
    ) -> None:
        grade_json = json.dumps(
            {
                "correct": True,
                "score": 0.9,
                "feedback": "pona! Great job.",
                "suggested_answer": None,
            }
        )
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_completion(
            grade_json
        )
        mock_get_client.return_value = mock_client

        response = client.post(
            f"{settings.API_V1_STR}/chat/grade",
            json=_grade_request_body(),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["correct"] is True
        assert data["score"] == 0.9
        assert "pona" in data["feedback"]

    @patch("app.api.routes.chat.get_llm_client")
    def test_grade_handles_malformed_llm_json(
        self, mock_get_client: MagicMock, client: TestClient
    ) -> None:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_completion(
            "this is not json at all"
        )
        mock_get_client.return_value = mock_client

        response = client.post(
            f"{settings.API_V1_STR}/chat/grade",
            json=_grade_request_body(),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["correct"] is False
        assert data["score"] == 0.0
        assert "couldn't grade" in data["feedback"].lower()

    @patch("app.api.routes.chat.get_llm_client")
    def test_grade_handles_partial_json_from_llm(
        self, mock_get_client: MagicMock, client: TestClient
    ) -> None:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_completion(
            '{"correct": true}'
        )
        mock_get_client.return_value = mock_client

        response = client.post(
            f"{settings.API_V1_STR}/chat/grade",
            json=_grade_request_body(),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["correct"] is False
        assert data["score"] == 0.0

    def test_grade_rejects_empty_answer(self, client: TestClient) -> None:
        response = client.post(
            f"{settings.API_V1_STR}/chat/grade",
            json=_grade_request_body(user_answer=""),
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Rate limiting tests
# ---------------------------------------------------------------------------


class TestRateLimiting:
    @patch("app.api.routes.chat.get_llm_client")
    def test_rate_limit_exceeded_returns_429(
        self,
        mock_get_client: MagicMock,
    ) -> None:
        """Use a fresh TestClient so rate limit state is clean."""
        from app.main import app

        original_limit = settings.CHAT_FREE_DAILY_LIMIT
        settings.CHAT_FREE_DAILY_LIMIT = 2

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_stream(["ok"])
        mock_get_client.return_value = mock_client

        try:
            with TestClient(app) as test_client:
                body = _chat_request_body()
                for _ in range(2):
                    resp = test_client.post(
                        f"{settings.API_V1_STR}/chat/stream", json=body
                    )
                    assert resp.status_code == 200

                resp = test_client.post(f"{settings.API_V1_STR}/chat/stream", json=body)
                assert resp.status_code == 429
        finally:
            settings.CHAT_FREE_DAILY_LIMIT = original_limit

    @patch("app.api.routes.chat.get_llm_client")
    def test_authenticated_user_bypasses_rate_limit(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        normal_user_token_headers: dict[str, str],
    ) -> None:
        """Authenticated users should NOT be rate-limited."""

        original_limit = settings.CHAT_FREE_DAILY_LIMIT
        settings.CHAT_FREE_DAILY_LIMIT = 2
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = _make_mock_stream(["ok"])
        mock_get_client.return_value = mock_client

        try:
            body = _chat_request_body()
            for i in range(5):
                resp = client.post(
                    f"{settings.API_V1_STR}/chat/stream",
                    json=body,
                    headers=normal_user_token_headers,
                )
                assert resp.status_code == 200, (
                    f"Authenticated request {i + 1} failed with {resp.status_code}"
                )
        finally:
            settings.CHAT_FREE_DAILY_LIMIT = original_limit
