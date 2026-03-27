/**
 * Daily challenge system.
 * Every day, all players get the same questions seeded by the date.
 */

import { supabase } from '@/lib/supabase'
import { logCreditTransaction } from './credits-transaction'
import { earnCarrots } from './carrots'
import { earnXp, levelFromXp } from './xp'

// Rotating mode schedule: Mon=0 through Sun=6
const MODE_ROTATION = ['classic', 'flag', 'distance', 'survival', 'classic', 'flag', 'marathon'] as const
const DIFFICULTY_ROTATION = ['medium', 'hard', 'medium', 'hard', 'hard', 'medium', 'expert'] as const

export interface DailyChallenge {
  date: string
  mode: string
  difficulty: string
  seed: string
  question_data: unknown
  coin_reward: number
  diamond_reward: number
}

export interface DailyChallengeResult {
  id: string
  user_id: string
  challenge_date: string
  score: number
  correct_count: number
  total_questions: number
  stars: number
  elapsed: number
  completed_at: string
  // Joined
  nickname?: string
  avatar?: string
  level?: number
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0]
}

/** Seeded pseudo-random number generator. */
function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    return h / 0x7fffffff
  }
}

/** Deterministic shuffle using a seed. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const rng = seededRandom(seed)
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Get today's challenge. Creates it if it doesn't exist yet. */
export async function getTodaysChallenge(): Promise<DailyChallenge | null> {
  if (!supabase) return null

  const today = todayDate()

  // Try to fetch existing
  const { data: existing } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('date', today)
    .single()

  if (existing) return existing as DailyChallenge

  // Generate today's challenge
  const dayOfWeek = new Date().getDay()
  const rotationIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday=0
  const mode = MODE_ROTATION[rotationIndex]
  const difficulty = DIFFICULTY_ROTATION[rotationIndex]
  const seed = `woc-${today}`

  const { data: created, error } = await supabase
    .from('daily_challenges')
    .insert({
      date: today,
      mode,
      difficulty,
      seed,
      coin_reward: 30,
      diamond_reward: 1,
    })
    .select()
    .single()

  if (error) {
    // Another request might have created it — try fetching again
    const { data: retry } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('date', today)
      .single()
    return retry as DailyChallenge | null
  }

  return created as DailyChallenge
}

/** Check if the user has already completed today's challenge. */
export async function hasCompletedToday(userId: string): Promise<boolean> {
  if (!supabase) return false

  const today = todayDate()
  const { data } = await supabase
    .from('daily_challenge_results')
    .select('id')
    .eq('user_id', userId)
    .eq('challenge_date', today)
    .single()

  return !!data
}

/** Submit daily challenge result. Awards coins + diamonds + XP. */
export async function submitDailyChallengeResult(opts: {
  userId: string
  score: number
  correctCount: number
  totalQuestions: number
  stars: number
  elapsed: number
  currentXp: number
}): Promise<{ totalCoins: number; carrots: number; xpEarned: number; newLevel: number; leveledUp: boolean } | null> {
  if (!supabase) return null

  const today = todayDate()
  const challenge = await getTodaysChallenge()
  if (!challenge) return null

  // Check not already submitted
  if (await hasCompletedToday(opts.userId)) return null

  // Insert result
  const { error } = await supabase
    .from('daily_challenge_results')
    .insert({
      user_id: opts.userId,
      challenge_date: today,
      score: opts.score,
      correct_count: opts.correctCount,
      total_questions: opts.totalQuestions,
      stars: opts.stars,
      elapsed: opts.elapsed,
    })

  if (error) return null

  // Award coins
  const totalCoins = challenge.coin_reward
  if (totalCoins > 0) {
    await logCreditTransaction(opts.userId, totalCoins, 'daily_challenge', { date: today })
  }

  // Award carrots (DB field is still diamond_reward — aliased as carrots)
  const carrots = challenge.diamond_reward
  if (carrots > 0) {
    await earnCarrots(opts.userId, carrots, 'daily_challenge', { date: today })
  }

  // Award XP
  const xpEarned = 30
  let newLevel = levelFromXp(opts.currentXp)
  let leveledUp = false

  const xpResult = await earnXp(opts.userId, xpEarned, opts.currentXp)
  if (xpResult) {
    newLevel = xpResult.newLevel
    leveledUp = xpResult.leveledUp
  }

  return { totalCoins, carrots, xpEarned, newLevel, leveledUp }
}

/** Get daily challenge leaderboard for today. */
export async function getDailyChallengeLeaderboard(limit = 20): Promise<DailyChallengeResult[]> {
  if (!supabase) return []

  const today = todayDate()

  const { data, error } = await supabase
    .from('daily_challenge_results')
    .select('*, profiles(nickname, avatar, level)')
    .eq('challenge_date', today)
    .order('score', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((entry) => {
    const profile = entry.profiles as { nickname: string; avatar: string; level: number } | null
    return {
      ...entry,
      nickname: profile?.nickname,
      avatar: profile?.avatar,
      level: profile?.level,
      profiles: undefined,
    }
  }) as DailyChallengeResult[]
}
