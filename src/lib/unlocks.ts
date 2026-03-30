/**
 * Game mode unlock system.
 * Some modes are free, others require a level or coin purchase to unlock.
 * Unlock state is stored in the player_achievements table.
 */

import { supabase } from '@/lib/supabase'
import { logCreditTransaction } from './credits-transaction'

export interface UnlockRequirement {
  type: 'free' | 'level' | 'coins' | 'carrots'
  value: number // level number or cost
}

/**
 * Unlock requirements per game mode href.
 * 'free' = always available. Others require either a level or a purchase.
 * The first game (click-country) is always free to ensure new players can play.
 */
export const GAME_UNLOCK_REQUIREMENTS: Record<string, UnlockRequirement> = {
  '/game/click-country': { type: 'free', value: 0 },
  '/game/flag':          { type: 'free', value: 0 },
  '/game/distance':      { type: 'free', value: 0 },
  '/game/us-states':     { type: 'free', value: 0 },
  '/game/daily':         { type: 'free', value: 0 },
}

/**
 * Check if a game mode is unlocked for the user.
 * Guests can play all modes (no persistence, no rewards gating).
 * Logged-in users must meet the requirement or have purchased the unlock.
 */
export function isGameUnlocked(
  href: string,
  userLevel: number,
  unlockedSet: Set<string>,
): boolean {
  const req = GAME_UNLOCK_REQUIREMENTS[href]
  if (!req || req.type === 'free') return true

  // Already purchased/unlocked
  if (unlockedSet.has(`unlock:${href}`)) return true

  // Level-based unlock
  if (req.type === 'level') return userLevel >= req.value

  return false
}

/** Get all unlock achievement keys for a user. */
export async function getUserUnlocks(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set()

  const { data } = await supabase
    .from('player_achievements')
    .select('achievement_key')
    .eq('user_id', userId)
    .like('achievement_key', 'unlock:%')

  if (!data) return new Set()
  return new Set(data.map((r) => r.achievement_key))
}

/** Purchase an unlock for a game mode using coins. */
export async function purchaseUnlock(
  userId: string,
  href: string,
): Promise<boolean> {
  if (!supabase) return false

  const req = GAME_UNLOCK_REQUIREMENTS[href]
  if (!req || req.type === 'free') return true

  if (req.type !== 'coins') return false

  // Check balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (!profile || profile.credits < req.value) return false

  // Deduct coins
  const success = await logCreditTransaction(userId, -req.value, `unlock:${href}`)
  if (!success) return false

  // Record unlock
  await supabase
    .from('player_achievements')
    .insert({ user_id: userId, achievement_key: `unlock:${href}` })

  return true
}

/** Get the display text for an unlock requirement. */
export function getUnlockLabel(req: UnlockRequirement): string {
  switch (req.type) {
    case 'free': return ''
    case 'level': return `Lv.${req.value}`
    case 'coins': return `💰 ${req.value}`
    case 'carrots': return `🥕 ${req.value}`
  }
}
