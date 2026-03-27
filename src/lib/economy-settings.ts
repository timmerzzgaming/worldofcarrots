/**
 * Economy settings loader — fetches admin-configurable reward values from Supabase.
 * Falls back to hardcoded defaults if DB unavailable.
 */

import { supabase } from '@/lib/supabase'

// In-memory cache with TTL
let cache: Record<string, unknown> | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Hardcoded defaults (match the seed data in migration 004)
const DEFAULTS: Record<string, unknown> = {
  game_complete_rewards: {
    classic: { easy: 10, medium: 20, hard: 35, expert: 50 },
    timed: { easy: 8, medium: 15, hard: 25, expert: 40 },
    marathon: { easy: 30, medium: 50, hard: 80, expert: 120 },
    survival: { easy: 15, medium: 25, hard: 40, expert: 60 },
    practice: { easy: 0, medium: 0, hard: 0, expert: 0 },
    borderless: { easy: 20, medium: 35, hard: 50, expert: 75 },
    flag: { easy: 12, medium: 22, hard: 38, expert: 55 },
    distance: { easy: 15, medium: 25, hard: 40, expert: 60 },
    'us-states': { easy: 10, medium: 20, hard: 35, expert: 50 },
  },
  per_correct_multipliers: { easy: 1, medium: 2, hard: 3, expert: 4 },
  star_bonus_per_star: 5,
  perfect_score_multiplier: 2.0,
  no_hints_bonus: 5,
  speed_bonus: { threshold: 20, bonus: 15 },
  hint_cost: 10,
  xp_base_per_mode: { classic: 20, timed: 15, marathon: 50, survival: 25, practice: 5, borderless: 30, flag: 20, distance: 25, 'us-states': 20 },
  xp_difficulty_multipliers: { easy: 1.0, medium: 1.5, hard: 2.0, expert: 3.0 },
  xp_star_bonus: [0, 10, 20, 40],
  daily_login_rewards: [5, 5, 10, 10, 15, 15, 25],
  daily_login_streak_bonuses: { 7: 20, 14: 50, 30: 100 },
  daily_login_xp: 10,
  daily_login_streak_xp_bonus_7: 25,
}

/** Fetch all economy settings. Uses in-memory cache with 5-min TTL. */
export async function getAllEconomySettings(): Promise<Record<string, unknown>> {
  const now = Date.now()
  if (cache && now - cacheTimestamp < CACHE_TTL_MS) {
    return cache
  }

  if (!supabase) return { ...DEFAULTS }

  const { data, error } = await supabase
    .from('economy_settings')
    .select('key, value')

  if (error || !data || data.length === 0) {
    return { ...DEFAULTS }
  }

  const settings: Record<string, unknown> = { ...DEFAULTS }
  for (const row of data) {
    settings[row.key] = row.value
  }

  cache = settings
  cacheTimestamp = now
  return settings
}

/** Get a single setting by key. Returns the default if not found. */
export async function getEconomySetting<T>(key: string): Promise<T> {
  const all = await getAllEconomySettings()
  return (all[key] ?? DEFAULTS[key]) as T
}

/** Invalidate the cache (call after admin updates a setting). */
export function invalidateEconomyCache(): void {
  cache = null
  cacheTimestamp = 0
}
