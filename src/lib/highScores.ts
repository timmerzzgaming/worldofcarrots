import type { GameMode } from '@/types/game'
import type { Difficulty } from '@/lib/countryDifficulty'
import { supabase } from '@/lib/supabase'

export interface HighScoreEntry {
  name: string
  score: number
  correctCount: number
  totalQuestions: number
  accuracy: number
  elapsed: number
  date: string
}

const STORAGE_KEY = 'woc-highscores'
const MAX_ENTRIES = 10

function getKey(mode: GameMode, difficulty: Difficulty, variant?: string): string {
  return variant ? `${mode}:${difficulty}:${variant}` : `${mode}:${difficulty}`
}

function loadAll(): Record<string, HighScoreEntry[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveAll(data: Record<string, HighScoreEntry[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getHighScores(mode: GameMode, difficulty: Difficulty, variant?: string): HighScoreEntry[] {
  const all = loadAll()
  return all[getKey(mode, difficulty, variant)] ?? []
}

export function addHighScore(
  mode: GameMode,
  difficulty: Difficulty,
  entry: HighScoreEntry,
  variant?: string,
): HighScoreEntry[] {
  const all = loadAll()
  const key = getKey(mode, difficulty, variant)
  const list = all[key] ?? []

  list.push(entry)

  if (mode === 'timed') {
    list.sort((a, b) => b.correctCount - a.correctCount || b.score - a.score)
  } else {
    list.sort((a, b) => b.score - a.score)
  }

  all[key] = list.slice(0, MAX_ENTRIES)
  saveAll(all)
  return all[key]
}

export function isHighScore(mode: GameMode, difficulty: Difficulty, score: number, correctCount: number, variant?: string): boolean {
  const list = getHighScores(mode, difficulty, variant)
  if (list.length < MAX_ENTRIES) return true
  if (mode === 'timed') {
    const worst = list[list.length - 1]
    return correctCount > worst.correctCount || (correctCount === worst.correctCount && score > worst.score)
  }
  return score > list[list.length - 1].score
}

export function clearHighScores() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getLastPlayerName(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('woc-player-name') ?? ''
}

export function savePlayerName(name: string) {
  localStorage.setItem('woc-player-name', name)
}

/** Persist a high score to Supabase for logged-in users. Fire-and-forget. */
export async function syncHighScoreToDb(
  userId: string,
  mode: string,
  difficulty: string,
  entry: HighScoreEntry,
  variant?: string,
): Promise<void> {
  if (!supabase) return

  await supabase.from('high_scores').insert({
    user_id: userId,
    mode,
    difficulty,
    variant: variant ?? null,
    score: entry.score,
    details: {
      correctCount: entry.correctCount,
      totalQuestions: entry.totalQuestions,
      accuracy: entry.accuracy,
      elapsed: entry.elapsed,
    },
  })
}
