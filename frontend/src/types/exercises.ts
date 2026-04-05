// --- API response types ---

/** Exercise types returned by the backend */
export type ExerciseType =
  | "match"
  | "multi_choice"
  | "word_bank"
  | "fill_particle"
  | "free_compose"
  | "concept_build"
  | "story"

/** A single pair for match exercises */
export interface MatchPair {
  tokiPona: string
  english: string
}

/** A single comprehension question for story exercises */
export interface StoryQuestion {
  question: string
  options: string[]
  correctIndex: number
}

/** Exercise data from GET /api/v1/lessons/units/{unit_id}/lessons/{lesson_id} */
export interface Exercise {
  id: string
  type: ExerciseType
  /** The prompt or question text shown to the user */
  prompt: string
  /** For multi_choice and fill_particle: array of option strings */
  options?: string[]
  /** Index of correct option (multi_choice, fill_particle) */
  correctIndex?: number
  /** For word_bank: words available to arrange */
  wordBank?: string[]
  /** For word_bank: list of valid answer strings */
  validAnswers?: string[]
  /** For match: pairs to match */
  pairs?: MatchPair[]
  /** For story: the toki pona paragraph */
  storyText?: string
  /** For story: English translation (hidden until revealed) */
  translation?: string
  /** For story: comprehension questions */
  questions?: StoryQuestion[]
  /** For concept_build: hint text */
  hint?: string
  /** For concept_build: suggested approach (revealed on request) */
  suggestedAnswer?: string
  /** For fill_particle: sentence with ___ placeholder */
  sentence?: string
  /** For fill_particle: English translation hint */
  translationHint?: string
  /** Feedback text for correct answer */
  correctFeedback?: string
  /** The correct answer text (for display after wrong answer) */
  correctAnswer?: string
  /** Words involved in this exercise (for SRS tracking) */
  words: string[]
}

/** Lesson data from API */
export interface Lesson {
  id: string
  unitId: number
  lessonIndex: number
  title: string
  exercises: Exercise[]
}

/** Unit data from API */
export interface Unit {
  id: number
  title: string
  description: string
  lessonCount: number
}

// --- Component interfaces ---

/** Result produced by each exercise component when the user answers */
export interface ExerciseResult {
  correct: boolean
  /** 0.0 to 1.0 */
  score: number
  /** Optional feedback text (from LLM or from exercise data) */
  feedback?: string
  /** Words involved in this exercise (for SRS tracking at lesson end) */
  words: string[]
}

/** Props passed to every exercise component */
export interface ExerciseProps {
  exercise: Exercise
  onComplete: (result: ExerciseResult) => void
}

// --- LLM grading types ---

/** Request body for POST /api/v1/chat/grade */
export interface GradeRequest {
  exerciseId: string
  exerciseType: ExerciseType
  prompt: string
  userAnswer: string
  /** Additional context (e.g., hint for concept_build) */
  context?: string
}

/** Response from POST /api/v1/chat/grade */
export interface GradeResponse {
  correct: boolean
  score: number
  feedback: string
  suggestedAnswer?: string
}
