import type { SRSEntry } from "./srs"
import { defaultSRSEntry, reviewWord as srsReviewWord } from "./srs"

// --- Types ---

export interface ProgressData {
  completedUnits: number[]
  completedLessons: string[] // "unitId:lessonId" format
  currentUnit: number
  totalCorrect: number
  totalAnswered: number
  knownWords: string[]
  recentErrors: ErrorEntry[]
}

export interface ErrorEntry {
  word: string
  type: string
  context: string
  timestamp: string // ISO datetime
}

export interface SRSData {
  [word: string]: SRSEntry
}

export interface StreakData {
  currentStreak: number
  lastActivityDate: string // ISO date YYYY-MM-DD
}

// --- Constants ---

const PROGRESS_KEY = "tp-progress"
const SRS_KEY = "tp-srs"
const STREAK_KEY = "tp-streak"
const MAX_RECENT_ERRORS = 20

// --- Default values ---

function defaultProgress(): ProgressData {
  return {
    completedUnits: [],
    completedLessons: [],
    currentUnit: 1,
    totalCorrect: 0,
    totalAnswered: 0,
    knownWords: [],
    recentErrors: [],
  }
}

function defaultStreak(): StreakData {
  return {
    currentStreak: 0,
    lastActivityDate: "",
  }
}

// --- Helpers ---

function readJSON<T>(key: string, fallback: () => T): T {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback()
  try {
    return JSON.parse(raw) as T
  } catch (err) {
    console.error(`[progress-store] Corrupted data for key "${key}", resetting:`, err)
    return fallback()
  }
}

function writeJSON<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.error(`[progress-store] Failed to write key "${key}":`, err)
  }
}

/** Get today's date as YYYY-MM-DD in the user's local timezone. */
function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Get yesterday's date as YYYY-MM-DD in the user's local timezone. */
function yesterdayLocal(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// --- Public API ---

/** Read current progress from localStorage. */
export function getProgress(): ProgressData {
  return readJSON(PROGRESS_KEY, defaultProgress)
}

/** Merge a partial update into the stored progress. */
export function updateProgress(update: Partial<ProgressData>): ProgressData {
  const current = getProgress()
  const merged = { ...current, ...update }

  // Cap recent errors
  if (merged.recentErrors.length > MAX_RECENT_ERRORS) {
    merged.recentErrors = merged.recentErrors.slice(0, MAX_RECENT_ERRORS)
  }

  writeJSON(PROGRESS_KEY, merged)
  return merged
}

/** Read SRS data from localStorage. */
export function getSRS(): SRSData {
  return readJSON(SRS_KEY, () => ({}) as SRSData)
}

/**
 * Update a single word's SRS entry after a review.
 * @param word - The word reviewed
 * @param quality - SM-2 quality (0-5)
 */
export function updateWordSRS(word: string, quality: number): SRSEntry {
  const srs = getSRS()
  const entry = srs[word] ?? defaultSRSEntry()
  const updated = srsReviewWord(entry, quality)
  srs[word] = updated
  writeJSON(SRS_KEY, srs)
  return updated
}

/**
 * Ensure a word exists in SRS (add default entry if missing).
 * Does NOT overwrite existing entries.
 */
export function ensureWordInSRS(word: string): void {
  const srs = getSRS()
  if (!(word in srs)) {
    srs[word] = defaultSRSEntry()
    writeJSON(SRS_KEY, srs)
  }
}

/** Read streak data from localStorage. */
export function getStreak(): StreakData {
  return readJSON(STREAK_KEY, defaultStreak)
}

/**
 * Record that the user was active now.
 * - If last activity was yesterday: increment streak
 * - If last activity was today: no change
 * - If last activity was >1 day ago (or never): reset streak to 1
 */
export function recordActivity(): StreakData {
  const streak = getStreak()
  const today = todayLocal()
  const yesterday = yesterdayLocal()

  if (streak.lastActivityDate === today) {
    // Already recorded today, no change
    return streak
  }

  let newStreak: number
  if (streak.lastActivityDate === yesterday) {
    // Consecutive day
    newStreak = streak.currentStreak + 1
  } else {
    // Gap or first activity
    newStreak = 1
  }

  const updated: StreakData = {
    currentStreak: newStreak,
    lastActivityDate: today,
  }
  writeJSON(STREAK_KEY, updated)
  return updated
}

/** Clear all progress data (for testing or account reset). */
export function clearAllProgress(): void {
  localStorage.removeItem(PROGRESS_KEY)
  localStorage.removeItem(SRS_KEY)
  localStorage.removeItem(STREAK_KEY)
}
