/**
 * XP ranking system — earn XP by playing, level up through ranks.
 * XP is non-spendable, only accumulates.
 */

import { supabase } from '@/lib/supabase'
import type { StarCount } from './stars'

// ---------------------------------------------------------------------------
// XP Calculation
// ---------------------------------------------------------------------------

const XP_BASE_PER_MODE: Record<string, number> = {
  classic: 20,
  timed: 15,
  marathon: 50,
  survival: 25,
  practice: 5,
  borderless: 30,
  flag: 20,
  distance: 25,
  'us-states': 20,
}

const XP_DIFFICULTY_MULTIPLIER: Record<string, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
  expert: 3.0,
}

const XP_STAR_BONUS = [0, 10, 20, 40] as const // indexed by star count

export interface XpBreakdown {
  base: number
  difficultyMultiplied: number
  starBonus: number
  performanceBonus: number
  total: number
}

/** Optional live XP settings from economy_settings DB table. */
export interface XpOverrides {
  xp_base_per_mode?: Record<string, number>
  xp_difficulty_multipliers?: Record<string, number>
  xp_star_bonus?: number[]
}

export function calculateXp(opts: {
  mode: string
  difficulty: string
  stars: StarCount
  accuracy: number
  overrides?: XpOverrides
}): XpBreakdown {
  const { mode, difficulty, stars, accuracy, overrides } = opts

  const baseMap = overrides?.xp_base_per_mode ?? XP_BASE_PER_MODE
  const base = baseMap[mode] ?? 15
  const multMap = overrides?.xp_difficulty_multipliers ?? XP_DIFFICULTY_MULTIPLIER
  const multiplier = multMap[difficulty] ?? 1.0
  const difficultyMultiplied = Math.round(base * multiplier)
  const starBonusArr = overrides?.xp_star_bonus ?? XP_STAR_BONUS
  const starBonus = starBonusArr[stars] ?? 0
  const performanceBonus = Math.round(accuracy * 20)
  const total = difficultyMultiplied + starBonus + performanceBonus

  return { base, difficultyMultiplied, starBonus, performanceBonus, total }
}

// ---------------------------------------------------------------------------
// Level System
// ---------------------------------------------------------------------------

const LEVEL_CURVE_BASE = 100
const LEVEL_CURVE_EXPONENT = 1.15
const MAX_LEVEL = 50

/** Total XP required to reach a given level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  let total = 0
  for (let i = 2; i <= level; i++) {
    total += Math.round(LEVEL_CURVE_BASE * Math.pow(LEVEL_CURVE_EXPONENT, i - 2))
  }
  return total
}

/** XP required to go from current level to the next. */
export function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0
  return xpForLevel(level + 1) - xpForLevel(level)
}

/** Determine level from total XP. */
export function levelFromXp(totalXp: number): number {
  let level = 1
  while (level < MAX_LEVEL && totalXp >= xpForLevel(level + 1)) {
    level++
  }
  return level
}

/** XP progress within current level as 0-1 fraction. */
export function levelProgress(totalXp: number, level: number): number {
  if (level >= MAX_LEVEL) return 1
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  const range = nextLevelXp - currentLevelXp
  if (range <= 0) return 1
  return (totalXp - currentLevelXp) / range
}

// ---------------------------------------------------------------------------
// Rank Titles
// ---------------------------------------------------------------------------

export interface RankInfo {
  title: string
  titleKey: string // i18n key
  color: string    // Tailwind color class
}

const RANKS: { minLevel: number; title: string; titleKey: string; color: string }[] = [
  { minLevel: 50, title: 'World Of Carrots',     titleKey: 'rank.geoMaster',     color: 'text-transparent bg-clip-text bg-gradient-to-r from-geo-primary via-geo-secondary to-geo-tertiary-bright' },
  { minLevel: 40, title: 'World Scholar',  titleKey: 'rank.worldScholar',  color: 'text-cyan-400' },
  { minLevel: 30, title: 'Globe Master',   titleKey: 'rank.globeMaster',   color: 'text-red-400' },
  { minLevel: 25, title: 'Atlas',          titleKey: 'rank.atlas',         color: 'text-orange-400' },
  { minLevel: 20, title: 'Geographer',     titleKey: 'rank.geographer',    color: 'text-yellow-400' },
  { minLevel: 15, title: 'Cartographer',   titleKey: 'rank.cartographer',  color: 'text-purple-400' },
  { minLevel: 10, title: 'Navigator',      titleKey: 'rank.navigator',     color: 'text-blue-400' },
  { minLevel: 5,  title: 'Explorer',       titleKey: 'rank.explorer',      color: 'text-green-400' },
  { minLevel: 1,  title: 'Novice',         titleKey: 'rank.novice',        color: 'text-gray-400' },
]

export function getRank(level: number): RankInfo {
  for (const rank of RANKS) {
    if (level >= rank.minLevel) {
      return { title: rank.title, titleKey: rank.titleKey, color: rank.color }
    }
  }
  return RANKS[RANKS.length - 1]
}

// ---------------------------------------------------------------------------
// DB Persistence
// ---------------------------------------------------------------------------

export async function earnXp(
  userId: string,
  amount: number,
  currentXp: number,
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean } | null> {
  if (!supabase || amount <= 0) return null

  const oldLevel = levelFromXp(currentXp)
  const newXp = currentXp + amount
  const newLevel = levelFromXp(newXp)

  const { error } = await supabase.rpc('increment_xp', {
    p_user_id: userId,
    p_amount: amount,
    p_new_level: newLevel,
  })

  if (error) {
    console.error('XP update failed:', error)
    return null
  }

  return { newXp, newLevel, leveledUp: newLevel > oldLevel }
}
