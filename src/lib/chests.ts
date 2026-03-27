/**
 * Treasure chest system.
 * Chests are earned through gameplay and contain random coins + optional carrots.
 */

import { supabase } from '@/lib/supabase'
import { logCreditTransaction } from './credits-transaction'
import { earnCarrots } from './carrots'

export type ChestTier = 'bronze' | 'silver' | 'gold'

export interface Chest {
  id: string
  user_id: string
  tier: ChestTier
  earned_at: string
  unlock_at: string
  opened_at: string | null
  contents: ChestContents | null
}

export interface ChestContents {
  coins: number
  carrots: number
}

const MAX_CHEST_SLOTS = 4

const CHEST_CONFIG: Record<ChestTier, {
  unlockSeconds: number
  coinRange: [number, number]
  carrotChance: number
  carrotRange: [number, number]
}> = {
  bronze: { unlockSeconds: 3600, coinRange: [15, 40], carrotChance: 0.1, carrotRange: [1, 1] },
  silver: { unlockSeconds: 14400, coinRange: [40, 100], carrotChance: 0.3, carrotRange: [1, 3] },
  gold:   { unlockSeconds: 28800, coinRange: [100, 250], carrotChance: 0.6, carrotRange: [2, 5] },
}

// Earn triggers
const BRONZE_EVERY_N_GAMES = 5
const SILVER_EVERY_N_GAMES = 20

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Roll random contents for a chest tier. */
export function rollContents(tier: ChestTier): ChestContents {
  const config = CHEST_CONFIG[tier]
  const coins = randomInt(config.coinRange[0], config.coinRange[1])
  const hasCarrots = Math.random() < config.carrotChance
  const carrots = hasCarrots ? randomInt(config.carrotRange[0], config.carrotRange[1]) : 0
  return { coins, carrots }
}

/** Get all chests for a user (max 4). */
export async function getPlayerChests(userId: string): Promise<Chest[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('chests')
    .select('*')
    .eq('user_id', userId)
    .is('opened_at', null)
    .order('earned_at', { ascending: true })
    .limit(MAX_CHEST_SLOTS)

  if (error || !data) return []
  return data as Chest[]
}

/** Grant a chest to a user. Returns null if slots are full. */
export async function grantChest(userId: string, tier: ChestTier): Promise<Chest | null> {
  if (!supabase) return null

  // Check slot availability
  const existing = await getPlayerChests(userId)
  if (existing.length >= MAX_CHEST_SLOTS) return null

  const now = new Date()
  const unlockAt = new Date(now.getTime() + CHEST_CONFIG[tier].unlockSeconds * 1000)

  const { data, error } = await supabase
    .from('chests')
    .insert({
      user_id: userId,
      tier,
      unlock_at: unlockAt.toISOString(),
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Failed to grant chest:', error)
    return null
  }

  return data as Chest
}

/** Open a chest — rolls contents, awards rewards, marks as opened. */
export async function openChest(
  userId: string,
  chestId: string,
): Promise<ChestContents | null> {
  if (!supabase) return null

  // Fetch the chest
  const { data: chest } = await supabase
    .from('chests')
    .select('*')
    .eq('id', chestId)
    .eq('user_id', userId)
    .is('opened_at', null)
    .single()

  if (!chest) return null

  // Check if unlocked
  const now = new Date()
  if (now < new Date(chest.unlock_at)) return null

  // Roll contents
  const contents = rollContents(chest.tier as ChestTier)

  // Mark as opened
  await supabase
    .from('chests')
    .update({ opened_at: now.toISOString(), contents })
    .eq('id', chestId)

  // Award coins
  if (contents.coins > 0) {
    await logCreditTransaction(userId, contents.coins, `chest_open:${chest.tier}`, { chestId })
  }

  // Award carrots
  if (contents.carrots > 0) {
    await earnCarrots(userId, contents.carrots, `chest_open:${chest.tier}`, { chestId })
  }

  return contents
}

/**
 * Check if a game completion should grant a chest.
 * Called after each game with the new games_completed count.
 */
export function shouldGrantChest(gamesCompleted: number): ChestTier | null {
  if (gamesCompleted > 0 && gamesCompleted % SILVER_EVERY_N_GAMES === 0) return 'silver'
  if (gamesCompleted > 0 && gamesCompleted % BRONZE_EVERY_N_GAMES === 0) return 'bronze'
  return null
}

/** Time remaining until a chest unlocks, in seconds. Returns 0 if ready. */
export function chestTimeRemaining(chest: Chest): number {
  const now = Date.now()
  const unlock = new Date(chest.unlock_at).getTime()
  return Math.max(0, Math.ceil((unlock - now) / 1000))
}

/** Format seconds as "Xh Ym" or "Xm Ys". */
export function formatChestTimer(seconds: number): string {
  if (seconds <= 0) return 'Ready!'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
