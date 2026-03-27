/**
 * Credit transaction helpers — logs to Supabase and updates balance atomically.
 */

import { supabase } from '@/lib/supabase'

export async function logCreditTransaction(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  if (!supabase) return false

  // Insert transaction record
  const { error: txError } = await supabase
    .from('credit_transactions')
    .insert({ user_id: userId, amount, reason, metadata: metadata ?? null })

  if (txError) {
    console.error('Credit transaction failed:', txError)
    return false
  }

  // Atomic balance update via RPC
  const { error: rpcError } = await supabase.rpc('increment_credits', {
    p_user_id: userId,
    p_amount: amount,
  })

  if (rpcError) {
    console.error('Credit balance update failed:', rpcError)
    return false
  }

  return true
}

export async function earnCredits(
  userId: string,
  amount: number,
  mode: string,
  difficulty: string,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  if (amount <= 0) return true
  return logCreditTransaction(userId, amount, `game_complete:${mode}:${difficulty}`, metadata)
}

export async function spendCredits(
  userId: string,
  amount: number,
  reason: string,
): Promise<boolean> {
  if (!supabase) return false

  // Check balance first
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (!profile || profile.credits < amount) return false

  return logCreditTransaction(userId, -amount, reason)
}
