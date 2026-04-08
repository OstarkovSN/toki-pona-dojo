import { OpenAPI } from "@/client/core/OpenAPI"
import type {
  Exercise,
  GradeRequest,
  GradeResponse,
  Lesson,
} from "@/types/exercises"

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" }
  const token = OpenAPI.TOKEN
  if (typeof token === "string" && token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function getBaseUrl(): string {
  return OpenAPI.BASE || ""
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformExercises(raw: any[]): Exercise[] {
  const result: Exercise[] = []

  // Group all match items into one exercise with multiple pairs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchItems = raw.filter((e: any) => e.type === "match")
  if (matchItems.length > 0) {
    result.push({
      id: "match-0",
      type: "match",
      prompt: "Match each word with its meaning",
      pairs: matchItems.map((e: { word: string; definition: string }) => ({
        tokiPona: e.word,
        english: e.definition,
      })),
      words: matchItems.map((e: { word: string }) => e.word),
    })
  }

  let idx = 0
  for (const e of raw) {
    switch (e.type) {
      case "multichoice":
        result.push({
          id: `multi_choice-${idx++}`,
          type: "multi_choice",
          prompt: `What does "${e.word}" mean?`,
          options: e.options ?? [],
          correctIndex: e.correct_index ?? 0,
          words: [e.word],
        })
        break

      case "word_bank":
        result.push({
          id: `word_bank-${idx++}`,
          type: "word_bank",
          prompt: e.translation || "Arrange these words into a sentence",
          wordBank: e.words ?? [],
          validAnswers: e.correct ? [e.correct] : [],
          words: e.words ?? [],
        })
        break

      case "fill_particle":
        result.push({
          id: `fill_particle-${idx++}`,
          type: "fill_particle",
          prompt: e.explanation || "Fill in the missing particle",
          sentence: e.sentence ?? "",
          options: e.options ?? [e.answer].filter(Boolean),
          correctIndex: e.correct_index ?? 0,
          translationHint: e.translation_hint,
          words: [],
        })
        break

      case "free_compose":
        result.push({
          id: `free_compose-${idx++}`,
          type: "free_compose",
          prompt: e.meaning ?? "",
          words: [],
        })
        break

      case "concept_build":
        result.push({
          id: `concept_build-${idx++}`,
          type: "concept_build",
          prompt: `What does "${e.compound}" mean?`,
          hint: Array.isArray(e.parts) ? e.parts.join(" + ") : undefined,
          suggestedAnswer: e.meaning,
          words: e.compound ? [e.compound] : [],
        })
        break

      case "story":
        result.push({
          id: `story-${idx++}`,
          type: "story",
          prompt: e.title ?? "Read and answer",
          storyText: e.text ?? "",
          translation: e.translation,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          questions: (e.questions ?? []).map((q: any) => ({
            question: q.question,
            options: q.options ?? [],
            correctIndex: q.correct_index ?? q.answer_index ?? 0,
          })),
          words: [],
        })
        break

      default:
        break
    }
  }

  return result
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformLesson(raw: any): Lesson {
  return {
    id: `${raw.unit_id}-${raw.lesson_id}`,
    unitId: raw.unit_id,
    lessonIndex: raw.lesson_id,
    title: raw.unit_name ?? "",
    exercises: transformExercises(raw.exercises ?? []),
  }
}

/**
 * Fetch lesson exercises.
 * GET /api/v1/lessons/units/{unitId}/lessons/{lessonId}
 */
export async function fetchLesson(
  unitId: number,
  lessonId: number,
): Promise<Lesson> {
  const res = await fetch(
    `${getBaseUrl()}/api/v1/lessons/units/${unitId}/lessons/${lessonId}`,
    { headers: getHeaders() },
  )
  if (!res.ok) {
    throw new Error(`Failed to fetch lesson: ${res.status} ${res.statusText}`)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await res.json()
  return transformLesson(raw)
}

/**
 * Submit answer for LLM grading.
 * POST /api/v1/chat/grade
 */
export async function gradeExercise(req: GradeRequest): Promise<GradeResponse> {
  const res = await fetch(`${getBaseUrl()}/api/v1/chat/grade`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    throw new Error(`Grading failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<GradeResponse>
}
