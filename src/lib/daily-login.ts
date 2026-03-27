/**
 * Daily login bonus system.
 * Awards coins + XP on first visit each day, with streak tracking.
 */

import { supabase } from '@/lib/supabase'
import { logCreditTransaction } from './credits-transaction'
import { earnXp, levelFromXp } from './xp'

interface DailyLoginResult {
  isNewDay: boolean
  reward: number
  xpReward: number
  streakDay: number
  streakBonus: number
  streakXpBonus: number
}

// Default values (used if economy_settings not loaded yet)
const DEFAULT_REWARDS = [5, 5, 10, 10, 15, 15, 25]
const DEFAULT_STREAK_BONUSES: Record<number, number> = { 7: 20, 14: 50, 30: 100 }
const DEFAULT_DAILY_XP = 10
const DEFAULT_STREAK_XP_BONUS_7 = 25

function todayDate(): string {
  return new Date().toISOString().split('T')[0]
}

function yesterdayDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

/**
 * Check if the user is eligible for a daily login bonus.
 * Does NOT claim it — call claimDailyLogin for that.
 */
export async function checkDailyLogin(userId: string): Promise<DailyLoginResult | null> {
  if (!supabase) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_login_streak, last_login_date')
    .eq('id', userId)
    .single()

  if (!profile) return null

  const today = todayDate()
  const lastLogin = profile.last_login_date

  // Already claimed today
  if (lastLogin === today) return null

  // Calculate streak
  let streakDay: number
  if (lastLogin === yesterdayDate()) {
    // Streak continues
    streakDay = (profile.daily_login_streak ?? 0) + 1
  } else {
    // Streak resets
    streakDay = 1
  }

  // Calculate reward (cycle through 7 days)
  const dayIndex = (streakDay - 1) % DEFAULT_REWARDS.length
  const reward = DEFAULT_REWARDS[dayIndex]
  const xpReward = DEFAULT_DAILY_XP

  // Check streak milestones
  let streakBonus = 0
  let streakXpBonus = 0
  for (const [milestone, bonus] of Object.entries(DEFAULT_STREAK_BONUSES)) {
    if (streakDay === parseInt(milestone)) {
      streakBonus = bonus
    }
  }
  if (streakDay === 7) {
    streakXpBonus = DEFAULT_STREAK_XP_BONUS_7
  }

  return {
    isNewDay: true,
    reward,
    xpReward,
    streakDay,
    streakBonus,
    streakXpBonus,
  }
}

/**
 * Claim the daily login bonus. Updates streak, awards coins + XP.
 */
export async function claimDailyLogin(
  userId: string,
  currentXp: number,
): Promise<{ totalCoins: number; totalXp: number; newLevel: number; leveledUp: boolean } | null> {
  const result = await checkDailyLogin(userId)
  if (!result || !supabase) return null

  const today = todayDate()

  // Update profile: streak + last_login_date
  await supabase
    .from('profiles')
    .update({
      daily_login_streak: result.streakDay,
      last_login_date: today,
    })
    .eq('id', userId)

  // Award coins
  const totalCoins = result.reward + result.streakBonus
  if (totalCoins > 0) {
    await logCreditTransaction(userId, totalCoins, 'daily_login', {
      streakDay: result.streakDay,
      baseReward: result.reward,
      streakBonus: result.streakBonus,
    })
  }

  // Award XP
  const totalXp = result.xpReward + result.streakXpBonus
  let newLevel = levelFromXp(currentXp)
  let leveledUp = false

  if (totalXp > 0) {
    const xpResult = await earnXp(userId, totalXp, currentXp)
    if (xpResult) {
      newLevel = xpResult.newLevel
      leveledUp = xpResult.leveledUp
    }
  }

  return { totalCoins, totalXp, newLevel, leveledUp }
}
