/**
 * Carrot (premium currency) system.
 * Orange carrots are rare, earned through achievements and milestones.
 * Golden carrots are a higher-tier premium currency (future use).
 */

import { supabase } from '@/lib/supabase'

/** Log an orange carrot transaction and update balance atomically. */
export async function earnCarrots(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  if (!supabase || amount <= 0) return false

  // Log transaction
  const { error: txError } = await supabase
    .from('credit_transactions')
    .insert({ user_id: userId, amount, reason, currency: 'carrots', metadata: metadata ?? null })

  if (txError) {
    console.error('Carrot transaction failed:', txError)
    return false
  }

  // Atomic balance update (DB column is still `diamonds` — aliased as carrots)
  const { error: rpcError } = await supabase.rpc('increment_diamonds', {
    p_user_id: userId,
    p_amount: amount,
  })

  if (rpcError) {
    console.error('Carrot balance update failed:', rpcError)
    return false
  }

  return true
}

/** Spend carrots. Checks balance before deducting. */
export async function spendCarrots(
  userId: string,
  amount: number,
  reason: string,
): Promise<boolean> {
  if (!supabase || amount <= 0) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('diamonds')
    .eq('id', userId)
    .single()

  if (!profile || profile.diamonds < amount) return false

  const { error: txError } = await supabase
    .from('credit_transactions')
    .insert({ user_id: userId, amount: -amount, reason, currency: 'carrots' })

  if (txError) return false

  const { error: rpcError } = await supabase.rpc('increment_diamonds', {
    p_user_id: userId,
    p_amount: -amount,
  })

  return !rpcError
}

/** Check and grant a one-time achievement that awards orange carrots. */
export async function grantAchievementCarrots(
  userId: string,
  achievementKey: string,
  carrotReward: number,
): Promise<boolean> {
  if (!supabase) return false

  // Try to insert — will fail if already earned (PK constraint)
  const { error } = await supabase
    .from('player_achievements')
    .insert({ user_id: userId, achievement_key: achievementKey })

  if (error) {
    // Already earned this achievement
    return false
  }

  // Award carrots
  return earnCarrots(userId, carrotReward, `achievement:${achievementKey}`)
}

/** Increment games_completed counter and return new count. */
export async function incrementGamesCompleted(userId: string): Promise<number> {
  if (!supabase) return 0

  const { data, error } = await supabase.rpc('increment_games_completed', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Games completed increment failed:', error)
    return 0
  }

  return data as number
}
