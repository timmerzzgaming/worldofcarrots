'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { calculateCredits, type CreditBreakdown, type EconomyOverrides } from '@/lib/credits'
import { calculateStars, type StarCount } from '@/lib/stars'
import { calculateXp, earnXp, type XpBreakdown, type XpOverrides } from '@/lib/xp'
import { getAllEconomySettings } from '@/lib/economy-settings'
import { earnCredits } from '@/lib/credits-transaction'
import { grantAchievementCarrots, incrementGamesCompleted } from '@/lib/carrots'
import { shouldGrantChest, grantChest, type ChestTier } from '@/lib/chests'
import { updateLeaderboard } from '@/lib/leaderboard'
import { checkGameAchievements, ACHIEVEMENTS, type AchievementDef } from '@/lib/achievements'
import { playLevelUp } from '@/lib/sounds'

export interface GameRewards {
  breakdown: CreditBreakdown
  stars: StarCount
  xp: XpBreakdown
  leveledUp: boolean
  newLevel: number
  chestEarned: ChestTier | null
  carrotsEarned: number
  newAchievements: AchievementDef[]
}

interface UseGameRewardsOpts {
  phase: string
  mode: string
  difficulty: string
  correctCount: number
  totalQuestions: number
  accuracy: number
  maxStreak?: number
  usedHints?: boolean
  timedCorrectCount?: number
  avgDistanceScore?: number
  /** Only challenge modes (daily, etc.) earn stars. Regular games do not. */
  isChallenge?: boolean
}

/**
 * Calculates and awards coins, stars, XP, chests, and carrots when game ends.
 * Awards are persisted to Supabase for logged-in users (guarded to prevent double-award).
 */
export function useGameRewards(opts: UseGameRewardsOpts): GameRewards | null {
  const { user, isGuest, updateCredits, updateXp, updateCarrots, updateGamesCompleted } = useAuth()
  const awarded = useRef(false)
  const [rewards, setRewards] = useState<GameRewards | null>(null)

  const { phase, mode, difficulty, correctCount, totalQuestions, accuracy, maxStreak, usedHints, timedCorrectCount, avgDistanceScore, isChallenge } = opts

  useEffect(() => {
    if (phase !== 'results' || awarded.current) return
    awarded.current = true

    // Fetch live settings then calculate rewards
    async function calculate() {
    const settings = await getAllEconomySettings()
    const creditOverrides: EconomyOverrides = {
      game_complete_rewards: settings.game_complete_rewards as Record<string, Record<string, number>> | undefined,
      per_correct_multipliers: settings.per_correct_multipliers as Record<string, number> | undefined,
      star_bonus_per_star: settings.star_bonus_per_star as number | undefined,
      perfect_score_multiplier: settings.perfect_score_multiplier as number | undefined,
      no_hints_bonus: settings.no_hints_bonus as number | undefined,
      speed_bonus: settings.speed_bonus as { threshold: number; bonus: number } | undefined,
    }
    const xpOverrides: XpOverrides = {
      xp_base_per_mode: settings.xp_base_per_mode as Record<string, number> | undefined,
      xp_difficulty_multipliers: settings.xp_difficulty_multipliers as Record<string, number> | undefined,
      xp_star_bonus: settings.xp_star_bonus as number[] | undefined,
    }

    // Stars only for challenge modes (daily, etc.) — regular games earn coins/XP only
    const stars = isChallenge ? calculateStars({
      mode,
      correctCount,
      totalQuestions,
      accuracy,
      avgDistanceScore,
      usedHints,
    }) : 0 as StarCount

    // Calculate credits (with live admin settings)
    const breakdown = calculateCredits({
      mode,
      difficulty,
      correctCount,
      totalQuestions,
      stars,
      maxStreak,
      usedHints,
      timedCorrectCount,
      overrides: creditOverrides,
    })

    // Calculate XP (with live admin settings)
    const xp = calculateXp({
      mode,
      difficulty,
      stars,
      accuracy,
      overrides: xpOverrides,
    })

    const result: GameRewards = {
      breakdown,
      stars,
      xp,
      leveledUp: false,
      newLevel: user?.level ?? 1,
      chestEarned: null,
      carrotsEarned: 0,
      newAchievements: [],
    }

    // Persist to DB for logged-in users
    if (!isGuest && user) {
      // Award credits
      if (breakdown.total > 0) {
        earnCredits(user.id, breakdown.total, mode, difficulty, {
          correctCount,
          totalQuestions,
          accuracy,
          stars,
          xpEarned: xp.total,
        })
        updateCredits(breakdown.total)
      }

      // Award XP
      if (xp.total > 0) {
        earnXp(user.id, xp.total, user.xp).then((xpResult) => {
          if (xpResult) {
            result.leveledUp = xpResult.leveledUp
            result.newLevel = xpResult.newLevel
            updateXp(xp.total, xpResult.newLevel)
            if (xpResult.leveledUp) {
              playLevelUp()
            }
            setRewards({ ...result })
          }
        })
      }

      // Increment games completed + check chest eligibility
      incrementGamesCompleted(user.id).then((newCount) => {
        updateGamesCompleted()
        const chestTier = shouldGrantChest(newCount)
        if (chestTier) {
          grantChest(user.id, chestTier).then((chest) => {
            if (chest) {
              result.chestEarned = chestTier
              setRewards({ ...result })
            }
          })
        }
      })

      // Update weekly leaderboard
      updateLeaderboard({
        userId: user.id,
        mode,
        coinsEarned: breakdown.total,
        starsEarned: stars,
        xpEarned: xp.total,
        score: breakdown.total, // Use coin total as score proxy
      })

      // First 3-star on expert → award carrots
      if (stars === 3 && difficulty === 'expert') {
        const achievementKey = `first_3star:${mode}:${difficulty}`
        grantAchievementCarrots(user.id, achievementKey, 3).then((granted) => {
          if (granted) {
            result.carrotsEarned += 3
            updateCarrots(3)
            setRewards({ ...result })
          }
        })
      }

      // Check gameplay achievements
      checkGameAchievements({
        userId: user.id,
        mode,
        difficulty,
        correctCount,
        totalQuestions,
        accuracy,
        stars,
        gamesCompleted: user.games_completed + 1,
        level: user.level,
        avgDistanceScore,
        timedCorrectCount,
      }).then((earnedKeys) => {
        if (earnedKeys.length > 0) {
          const defs = earnedKeys.map((k) => ACHIEVEMENTS.find((a) => a.key === k)!).filter(Boolean)
          const totalCarrots = defs.reduce((s, d) => s + d.carrotReward, 0)
          result.newAchievements = defs
          result.carrotsEarned += totalCarrots
          if (totalCarrots > 0) updateCarrots(totalCarrots)
          setRewards({ ...result })
        }
      })
    }

    setRewards(result)
    } // end calculate()

    calculate()
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when leaving results phase
  useEffect(() => {
    if (phase !== 'results') {
      awarded.current = false
      setRewards(null)
    }
  }, [phase])

  return rewards
}
