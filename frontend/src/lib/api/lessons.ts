import { OpenAPI } from "@/client/core/OpenAPI"
import type { GradeRequest, GradeResponse, Lesson } from "@/types/exercises"

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
  return res.json() as Promise<Lesson>
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
