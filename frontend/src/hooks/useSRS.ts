import { useMemo, useSyncExternalStore } from "react"

import {
  getSRS,
  type SRSData,
  updateWordSRS as storeUpdateWordSRS,
} from "@/lib/progress-store"
import { isDue, overdueDays, type SRSEntry } from "@/lib/srs"

// --- localStorage subscription for React re-renders ---

let srsVersion = 0
const srsListeners = new Set<() => void>()

function subscribeSRS(callback: () => void): () => void {
  srsListeners.add(callback)
  return () => srsListeners.delete(callback)
}

function getSRSSnapshot(): number {
  return srsVersion
}

function notifySRSChanged(): void {
  srsVersion++
  for (const cb of srsListeners) {
    cb()
  }
}

// --- Types ---

export interface SRSStats {
  totalWords: number
  dueToday: number
  averageEase: number
}

export interface DueWord {
  word: string
  entry: SRSEntry
  overdue: number // days overdue
}

// --- Hook ---

export function useSRS() {
  // Subscribe to localStorage changes for re-renders
  useSyncExternalStore(subscribeSRS, getSRSSnapshot)

  const srsData: SRSData = getSRS()

  /** Words due for review, sorted by most overdue first. */
  const dueWords: DueWord[] = useMemo(() => {
    const due: DueWord[] = []
    for (const [word, entry] of Object.entries(srsData)) {
      if (isDue(entry)) {
        due.push({
          word,
          entry,
          overdue: overdueDays(entry),
        })
      }
    }
    due.sort((a, b) => b.overdue - a.overdue)
    return due
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srsData])

  /** Review a word with a given SM-2 quality (0-5). */
  function reviewWord(word: string, quality: number): void {
    storeUpdateWordSRS(word, quality)
    notifySRSChanged()
  }

  /** Stats about the SRS collection. */
  const stats: SRSStats = useMemo(() => {
    const entries = Object.values(srsData)
    const totalWords = entries.length
    const dueToday = entries.filter(isDue).length
    const averageEase =
      totalWords > 0
        ? entries.reduce((sum, e) => sum + e.ease, 0) / totalWords
        : 2.5

    return {
      totalWords,
      dueToday,
      averageEase: Math.round(averageEase * 100) / 100,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srsData])

  return {
    dueWords,
    reviewWord,
    stats,
  }
}
