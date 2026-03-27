/**
 * Achievements/badges system.
 * Players earn badges for milestones — shown in profile and result screen.
 */

import { supabase } from '@/lib/supabase'
import { earnCarrots } from './carrots'

export interface AchievementDef {
  key: string
  icon: string
  titleKey: string  // i18n key
  descKey: string   // i18n key
  carrotReward: number
  hidden?: boolean  // Don't show until earned
}

/**
 * Achievement definitions.
 * Keys are stored in player_achievements table.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // Game completion milestones
  { key: 'games_10', icon: '🎮', titleKey: 'ach.games10', descKey: 'ach.games10.desc', carrotReward: 1 },
  { key: 'games_50', icon: '🕹️', titleKey: 'ach.games50', descKey: 'ach.games50.desc', carrotReward: 3 },
  { key: 'games_100', icon: '🏅', titleKey: 'ach.games100', descKey: 'ach.games100.desc', carrotReward: 5 },
  { key: 'games_500', icon: '👑', titleKey: 'ach.games500', descKey: 'ach.games500.desc', carrotReward: 10 },

  // Perfect scores
  { key: 'perfect_classic', icon: '💯', titleKey: 'ach.perfectClassic', descKey: 'ach.perfectClassic.desc', carrotReward: 2 },
  { key: 'perfect_marathon', icon: '🏆', titleKey: 'ach.perfectMarathon', descKey: 'ach.perfectMarathon.desc', carrotReward: 5 },

  // Star milestones
  { key: 'stars_total_10', icon: '⭐', titleKey: 'ach.stars10', descKey: 'ach.stars10.desc', carrotReward: 1 },
  { key: 'stars_total_50', icon: '🌟', titleKey: 'ach.stars50', descKey: 'ach.stars50.desc', carrotReward: 3 },
  { key: 'stars_total_100', icon: '✨', titleKey: 'ach.stars100', descKey: 'ach.stars100.desc', carrotReward: 5 },

  // Region mastery (3-star on expert for all modes in that region concept)
  { key: 'master_africa', icon: '🌍', titleKey: 'ach.masterAfrica', descKey: 'ach.masterAfrica.desc', carrotReward: 3 },
  { key: 'master_europe', icon: '🏰', titleKey: 'ach.masterEurope', descKey: 'ach.masterEurope.desc', carrotReward: 3 },
  { key: 'master_asia', icon: '🏯', titleKey: 'ach.masterAsia', descKey: 'ach.masterAsia.desc', carrotReward: 3 },
  { key: 'master_americas', icon: '🗽', titleKey: 'ach.masterAmericas', descKey: 'ach.masterAmericas.desc', carrotReward: 3 },
  { key: 'master_oceania', icon: '🏝️', titleKey: 'ach.masterOceania', descKey: 'ach.masterOceania.desc', carrotReward: 3 },

  // Streak achievements
  { key: 'streak_7', icon: '🔥', titleKey: 'ach.streak7', descKey: 'ach.streak7.desc', carrotReward: 2 },
  { key: 'streak_30', icon: '🔥', titleKey: 'ach.streak30', descKey: 'ach.streak30.desc', carrotReward: 10 },

  // Level milestones
  { key: 'level_10', icon: '📈', titleKey: 'ach.level10', descKey: 'ach.level10.desc', carrotReward: 2 },
  { key: 'level_25', icon: '📈', titleKey: 'ach.level25', descKey: 'ach.level25.desc', carrotReward: 5 },
  { key: 'level_50', icon: '🎓', titleKey: 'ach.level50', descKey: 'ach.level50.desc', carrotReward: 15 },

  // Special
  { key: 'daily_first', icon: '📅', titleKey: 'ach.dailyFirst', descKey: 'ach.dailyFirst.desc', carrotReward: 1 },
  { key: 'all_modes_played', icon: '🗺️', titleKey: 'ach.allModes', descKey: 'ach.allModes.desc', carrotReward: 3 },
  { key: 'distance_perfect_100', icon: '🎯', titleKey: 'ach.distancePerfect', descKey: 'ach.distancePerfect.desc', carrotReward: 5, hidden: true },
  { key: 'speed_demon', icon: '⚡', titleKey: 'ach.speedDemon', descKey: 'ach.speedDemon.desc', carrotReward: 3, hidden: true },
]

/** Get all earned achievement keys for a user. */
export async function getEarnedAchievements(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set()

  const { data } = await supabase
    .from('player_achievements')
    .select('achievement_key')
    .eq('user_id', userId)

  if (!data) return new Set()
  return new Set(data.map((r) => r.achievement_key))
}

/** Try to grant an achievement. Returns true if newly earned (not already owned). */
export async function grantAchievement(
  userId: string,
  achievementKey: string,
): Promise<boolean> {
  if (!supabase) return false

  const def = ACHIEVEMENTS.find((a) => a.key === achievementKey)
  if (!def) return false

  // Try insert — fails silently if already earned
  const { error } = await supabase
    .from('player_achievements')
    .insert({ user_id: userId, achievement_key: achievementKey })

  if (error) return false // Already earned

  // Award carrots
  if (def.carrotReward > 0) {
    await earnCarrots(userId, def.carrotReward, `achievement:${achievementKey}`)
  }

  return true
}

/**
 * Check and grant achievements based on game results.
 * Call after each game completion. Returns newly earned achievement keys.
 */
export async function checkGameAchievements(opts: {
  userId: string
  mode: string
  difficulty: string
  correctCount: number
  totalQuestions: number
  accuracy: number
  stars: number
  gamesCompleted: number
  level: number
  avgDistanceScore?: number
  timedCorrectCount?: number
}): Promise<string[]> {
  const earned: string[] = []

  // Game count milestones
  if (opts.gamesCompleted >= 10) {
    if (await grantAchievement(opts.userId, 'games_10')) earned.push('games_10')
  }
  if (opts.gamesCompleted >= 50) {
    if (await grantAchievement(opts.userId, 'games_50')) earned.push('games_50')
  }
  if (opts.gamesCompleted >= 100) {
    if (await grantAchievement(opts.userId, 'games_100')) earned.push('games_100')
  }
  if (opts.gamesCompleted >= 500) {
    if (await grantAchievement(opts.userId, 'games_500')) earned.push('games_500')
  }

  // Perfect scores
  if (opts.accuracy === 1 && opts.totalQuestions > 0) {
    if (opts.mode === 'classic') {
      if (await grantAchievement(opts.userId, 'perfect_classic')) earned.push('perfect_classic')
    }
    if (opts.mode === 'marathon') {
      if (await grantAchievement(opts.userId, 'perfect_marathon')) earned.push('perfect_marathon')
    }
  }

  // Distance perfect (100 avg score)
  if (opts.mode === 'distance' && opts.avgDistanceScore && opts.avgDistanceScore >= 95) {
    if (await grantAchievement(opts.userId, 'distance_perfect_100')) earned.push('distance_perfect_100')
  }

  // Speed demon (25+ in timed mode)
  if (opts.mode === 'timed' && (opts.timedCorrectCount ?? opts.correctCount) >= 25) {
    if (await grantAchievement(opts.userId, 'speed_demon')) earned.push('speed_demon')
  }

  // Level milestones
  if (opts.level >= 10) {
    if (await grantAchievement(opts.userId, 'level_10')) earned.push('level_10')
  }
  if (opts.level >= 25) {
    if (await grantAchievement(opts.userId, 'level_25')) earned.push('level_25')
  }
  if (opts.level >= 50) {
    if (await grantAchievement(opts.userId, 'level_50')) earned.push('level_50')
  }

  return earned
}
