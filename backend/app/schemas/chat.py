from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=5000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=50)
    mode: str = Field(
        default="free_chat",
        pattern="^(free_chat|grammar|translation)$",
    )
    known_words: list[str] = Field(default_factory=list)
    current_unit: int = Field(default=1, ge=1, le=10)
    recent_errors: list[dict[str, object]] = Field(default_factory=list)


# NOTE: ChatResponse is not used by any endpoint currently (streaming uses
# raw SSE). Kept as a reserved schema for a future non-streaming chat endpoint.
class ChatResponse(BaseModel):
    content: str


class ExerciseGradeRequest(BaseModel):
    exercise_type: str = Field(..., min_length=1, max_length=100)
    prompt: str = Field(..., min_length=1, max_length=2000)
    user_answer: str = Field(..., min_length=1, max_length=2000)
    known_words: list[str] = Field(default_factory=list)


class ExerciseGradeResponse(BaseModel):
    correct: bool
    score: float = Field(..., ge=0.0, le=1.0)
    feedback: str
    suggested_answer: str | None = None
