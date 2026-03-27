/**
 * Credit rewards configuration and calculation for World Of Carrots.
 * Registered users earn credits by completing games.
 */

import type { StarCount } from './stars'

export const CREDIT_REWARDS = {
  // Base rewards per game completion (must finish, not quit)
  game_complete: {
    classic:    { easy: 10, medium: 20, hard: 35, expert: 50 },
    timed:      { easy: 8,  medium: 15, hard: 25, expert: 40 },
    marathon:   { easy: 30, medium: 50, hard: 80, expert: 120 },
    survival:   { easy: 15, medium: 25, hard: 40, expert: 60 },
    practice:   { easy: 0,  medium: 0,  hard: 0,  expert: 0 },
    borderless: { easy: 20, medium: 35, hard: 50, expert: 75 },
    flag:       { easy: 12, medium: 22, hard: 38, expert: 55 },
    distance:   { easy: 15, medium: 25, hard: 40, expert: 60 },
    'us-states': { easy: 10, medium: 20, hard: 35, expert: 50 },
  } as Record<string, Record<string, number>>,

  // Per-correct-answer bonus by difficulty
  per_correct: { easy: 1, medium: 2, hard: 3, expert: 4 } as Record<string, number>,

  // Star bonus: coins per star earned
  star_bonus_per_star: 5,

  perfect_score_multiplier: 2.0,
  no_hints_bonus: 5,
  speed_bonus: {
    threshold: 20,  // minimum correct answers in timed mode
    bonus: 15,
  },
  daily_streak: {
    3: 10,
    7: 30,
    30: 100,
  } as Record<number, number>,

  // Hint purchase cost
  hint_cost: 10,
} as const

export interface CreditBreakdown {
  base: number
  perCorrectBonus: number
  starBonus: number
  streakBonus: number
  perfectBonus: number
  noHintsBonus: number
  speedBonus: number
  total: number
  stars: StarCount
}

/** Optional live settings from economy_settings DB table. Falls back to CREDIT_REWARDS. */
export interface EconomyOverrides {
  game_complete_rewards?: Record<string, Record<string, number>>
  per_correct_multipliers?: Record<string, number>
  star_bonus_per_star?: number
  perfect_score_multiplier?: number
  no_hints_bonus?: number
  speed_bonus?: { threshold: number; bonus: number }
}

export function calculateCredits(opts: {
  mode: string
  difficulty: string
  correctCount: number
  totalQuestions: number
  stars: StarCount
  maxStreak?: number
  usedHints?: boolean
  timedCorrectCount?: number
  overrides?: EconomyOverrides
}): CreditBreakdown {
  const { mode, difficulty, correctCount, totalQuestions, stars, maxStreak, usedHints, timedCorrectCount, overrides } = opts

  // Base reward (live settings override hardcoded)
  const gameRewards = overrides?.game_complete_rewards ?? CREDIT_REWARDS.game_complete
  const modeRewards = gameRewards[mode]
  const base = modeRewards?.[difficulty] ?? 0

  // Per-correct bonus
  const perCorrectMap = overrides?.per_correct_multipliers ?? CREDIT_REWARDS.per_correct
  const perCorrectRate = perCorrectMap[difficulty] ?? 1
  const perCorrectBonus = correctCount * perCorrectRate

  // Star bonus
  const starBonusPerStar = overrides?.star_bonus_per_star ?? CREDIT_REWARDS.star_bonus_per_star
  const starBonus = stars * starBonusPerStar

  // Streak bonus (survival/borderless modes)
  const streakBonus = (mode === 'survival' || mode === 'borderless') && maxStreak
    ? Math.floor(maxStreak / 10) * 3
    : 0

  // Perfect score bonus
  const isPerfect = correctCount === totalQuestions && totalQuestions > 0
  const perfectMultiplier = overrides?.perfect_score_multiplier ?? CREDIT_REWARDS.perfect_score_multiplier
  const perfectBonus = isPerfect ? Math.round(base * (perfectMultiplier - 1)) : 0

  // No hints bonus (only for flag mode)
  const noHintsBonusVal = overrides?.no_hints_bonus ?? CREDIT_REWARDS.no_hints_bonus
  const noHintsBonus = mode === 'flag' && !usedHints ? noHintsBonusVal : 0

  // Speed bonus (timed mode only)
  const speedConfig = overrides?.speed_bonus ?? CREDIT_REWARDS.speed_bonus
  const speedBonus =
    mode === 'timed' && (timedCorrectCount ?? correctCount) >= speedConfig.threshold
      ? speedConfig.bonus
      : 0

  const total = base + perCorrectBonus + starBonus + streakBonus + perfectBonus + noHintsBonus + speedBonus

  return { base, perCorrectBonus, starBonus, streakBonus, perfectBonus, noHintsBonus, speedBonus, total, stars }
}
