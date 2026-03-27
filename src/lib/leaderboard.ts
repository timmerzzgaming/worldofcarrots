/**
 * Weekly leaderboard system.
 * Players accumulate coins/XP/stars per mode each week (Mon-Sun).
 */

import { supabase } from '@/lib/supabase'

export interface LeaderboardEntry {
  id: string
  user_id: string
  week_start: string
  mode: string
  total_coins_earned: number
  total_stars_earned: number
  total_xp_earned: number
  games_played: number
  best_score: number
  // Joined from profiles
  nickname?: string
  avatar?: string
  level?: number
}

/** Get the Monday of the current week (ISO week). */
export function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 1
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

/** Update leaderboard after a game completion. */
export async function updateLeaderboard(opts: {
  userId: string
  mode: string
  coinsEarned: number
  starsEarned: number
  xpEarned: number
  score: number
}): Promise<void> {
  if (!supabase) return

  const weekStart = getCurrentWeekStart()
  const { userId, mode, coinsEarned, starsEarned, xpEarned, score } = opts

  // Try to fetch existing entry
  const { data: existing } = await supabase
    .from('leaderboard_entries')
    .select('id, total_coins_earned, total_stars_earned, total_xp_earned, games_played, best_score')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('mode', mode)
    .single()

  if (existing) {
    // Update existing entry
    await supabase
      .from('leaderboard_entries')
      .update({
        total_coins_earned: existing.total_coins_earned + coinsEarned,
        total_stars_earned: existing.total_stars_earned + starsEarned,
        total_xp_earned: existing.total_xp_earned + xpEarned,
        games_played: existing.games_played + 1,
        best_score: Math.max(existing.best_score, score),
      })
      .eq('id', existing.id)
  } else {
    // Insert new entry
    await supabase
      .from('leaderboard_entries')
      .insert({
        user_id: userId,
        week_start: weekStart,
        mode,
        total_coins_earned: coinsEarned,
        total_stars_earned: starsEarned,
        total_xp_earned: xpEarned,
        games_played: 1,
        best_score: score,
      })
  }

  // Also update the "global" mode entry
  if (mode !== 'global') {
    const { data: globalEntry } = await supabase
      .from('leaderboard_entries')
      .select('id, total_coins_earned, total_stars_earned, total_xp_earned, games_played, best_score')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .eq('mode', 'global')
      .single()

    if (globalEntry) {
      await supabase
        .from('leaderboard_entries')
        .update({
          total_coins_earned: globalEntry.total_coins_earned + coinsEarned,
          total_stars_earned: globalEntry.total_stars_earned + starsEarned,
          total_xp_earned: globalEntry.total_xp_earned + xpEarned,
          games_played: globalEntry.games_played + 1,
          best_score: Math.max(globalEntry.best_score, score),
        })
        .eq('id', globalEntry.id)
    } else {
      await supabase
        .from('leaderboard_entries')
        .insert({
          user_id: userId,
          week_start: weekStart,
          mode: 'global',
          total_coins_earned: coinsEarned,
          total_stars_earned: starsEarned,
          total_xp_earned: xpEarned,
          games_played: 1,
          best_score: score,
        })
    }
  }
}

/** Fetch the weekly leaderboard for a mode. */
export async function getWeeklyLeaderboard(
  mode: string,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  if (!supabase) return []

  const weekStart = getCurrentWeekStart()

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*, profiles(nickname, avatar, level)')
    .eq('week_start', weekStart)
    .eq('mode', mode)
    .order('total_xp_earned', { ascending: false })
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
  }) as LeaderboardEntry[]
}

/** Get current user's rank for a mode this week. */
export async function getUserWeeklyRank(
  userId: string,
  mode: string,
): Promise<{ rank: number; entry: LeaderboardEntry | null }> {
  if (!supabase) return { rank: 0, entry: null }

  const weekStart = getCurrentWeekStart()

  // Get all entries for ranking
  const { data } = await supabase
    .from('leaderboard_entries')
    .select('user_id, total_xp_earned')
    .eq('week_start', weekStart)
    .eq('mode', mode)
    .order('total_xp_earned', { ascending: false })

  if (!data) return { rank: 0, entry: null }

  const rank = data.findIndex((e) => e.user_id === userId) + 1

  // Get user's full entry
  const { data: entry } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('mode', mode)
    .single()

  return { rank, entry: entry as LeaderboardEntry | null }
}
