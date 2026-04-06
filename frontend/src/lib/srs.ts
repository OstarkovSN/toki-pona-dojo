/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Based on the SuperMemo SM-2 algorithm by Piotr Wozniak.
 * Quality scale: 0-5, where:
 *   0 = complete blackout
 *   1 = incorrect but recognized after seeing answer
 *   2 = incorrect but answer felt easy to recall
 *   3 = correct with serious difficulty
 *   4 = correct with some hesitation
 *   5 = perfect response
 */

export interface SRSEntry {
  interval: number;  // days until next review
  ease: number;      // easiness factor (minimum 1.3)
  due: string;       // ISO date string (YYYY-MM-DD)
  reps: number;      // successful repetition count
}

export interface SM2Result {
  reps: number;
  ease: number;
  interval: number;
}

/**
 * Core SM-2 algorithm.
 *
 * @param quality - Response quality (0-5)
 * @param reps - Current successful repetition count
 * @param ease - Current easiness factor (>= 1.3)
 * @param interval - Current interval in days
 * @returns Updated reps, ease, and interval
 */
export function sm2(
  quality: number,
  reps: number,
  ease: number,
  interval: number,
): SM2Result {
  // Clamp quality to 0-5
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  // Update easiness factor unconditionally (standard SM-2 formula)
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEase = Math.max(
    1.3,
    ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  if (q < 3) {
    // Failed: reset repetition count and interval, but keep updated ease
    return {
      reps: 0,
      ease: newEase,
      interval: 1,
    };
  }

  // Successful recall
  let newInterval: number;
  if (reps === 0) {
    newInterval = 1;
  } else if (reps === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * ease);
  }

  return {
    reps: reps + 1,
    ease: newEase,
    interval: newInterval,
  };
}

/**
 * Map an exercise score (0.0-1.0) to SM-2 quality (0-5).
 */
export function scoreToQuality(score: number): number {
  if (score >= 0.9) return 5;
  if (score >= 0.7) return 4;
  if (score >= 0.5) return 3;
  if (score >= 0.3) return 2;
  if (score > 0) return 1;
  return 0;
}

/**
 * Calculate the next review date given an interval in days.
 */
export function nextDueDate(intervalDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + intervalDays);
  return date.toISOString().split("T")[0];  // YYYY-MM-DD
}

/**
 * Default SRS entry for a newly encountered word.
 */
export function defaultSRSEntry(): SRSEntry {
  return {
    interval: 0,
    ease: 2.5,
    due: new Date().toISOString().split("T")[0],
    reps: 0,
  };
}

/**
 * Process a word review: run SM-2 and return updated entry.
 */
export function reviewWord(entry: SRSEntry, quality: number): SRSEntry {
  const result = sm2(quality, entry.reps, entry.ease, entry.interval);
  return {
    interval: result.interval,
    ease: result.ease,
    due: nextDueDate(result.interval),
    reps: result.reps,
  };
}

/**
 * Check if a word is due for review.
 */
export function isDue(entry: SRSEntry): boolean {
  const today = new Date().toISOString().split("T")[0];
  return entry.due <= today;
}

/**
 * Calculate how overdue a word is (in days). Higher = more overdue.
 */
export function overdueDays(entry: SRSEntry): number {
  const today = new Date();
  const due = new Date(entry.due + "T00:00:00");
  const diffMs = today.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}
