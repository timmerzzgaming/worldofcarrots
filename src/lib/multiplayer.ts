/**
 * Multiplayer system using Supabase Realtime channels.
 *
 * Architecture:
 * - Each lobby has a Realtime channel `lobby:{lobbyId}`
 * - Presence tracks who's online in the lobby
 * - Broadcast handles: game state sync, chat, ping, answers
 * - DB persists: lobby config, scores, chat history, answers
 */

import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── Types ───────────────────────────────────────────────────

export interface Lobby {
  id: string
  code: string
  host_id: string
  status: 'waiting' | 'playing' | 'finished'
  game_mode: string
  duration_minutes: number
  max_players: number
  is_public: boolean
  current_round: number
  total_rounds: number
  question_seed: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export interface LobbyPlayer {
  id: string
  lobby_id: string
  user_id: string
  nickname: string
  avatar: string
  is_host: boolean
  is_ready: boolean
  is_spectator: boolean
  score: number
  ping_ms: number
  joined_at: string
  left_at: string | null
}

export interface ChatMessage {
  id: string
  lobby_id: string
  user_id: string
  nickname: string
  avatar: string
  message: string
  created_at: string
}

export interface GameAnswer {
  lobby_id: string
  user_id: string
  round_number: number
  answer: string
  is_correct: boolean
  time_ms: number
  points_earned: number
}

export type MultiQuestionType = 'flag' | 'country' | 'distance'

export interface MultiQuestion {
  type: MultiQuestionType
  /** Country name (for country/flag) or capital city (for distance) */
  prompt: string
  /** Correct answer — country name */
  correctAnswer: string
  /** ISO A3 code (for flag image lookup) */
  isoA3?: string
  /** Capital lat/lng for distance questions */
  capitalLat?: number
  capitalLng?: number
  /** Time limit in seconds for this question */
  timeLimit: number
}

// Broadcast event types
export type BroadcastEvent =
  | { type: 'game_start'; questions: MultiQuestion[]; totalRounds: number; seed: string }
  | { type: 'round_start'; round: number; question: MultiQuestion; startTime: number }
  | { type: 'round_end'; round: number; answers: RoundResult[] }
  | { type: 'game_end'; finalScores: FinalScore[] }
  | { type: 'player_answer'; userId: string; round: number; timeMs: number }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'ping'; senderId: string; timestamp: number }
  | { type: 'pong'; senderId: string; originalTimestamp: number }
  | { type: 'kick'; userId: string }
  | { type: 'settings_change'; duration_minutes: number }
  | { type: 'ready_change'; userId: string; ready: boolean }
  | { type: 'lobby_cancelled' }

export interface RoundResult {
  userId: string
  nickname: string
  answer: string
  isCorrect: boolean
  timeMs: number
  pointsEarned: number
}

export interface FinalScore {
  userId: string
  nickname: string
  avatar: string
  score: number
  correctCount: number
}

// ─── Lobby CRUD ──────────────────────────────────────────────

/** Create a new lobby. Returns the lobby object. */
export async function createLobby(
  userId: string,
  nickname: string,
  avatar: string,
): Promise<Lobby | null> {
  if (!supabase) return null

  // Generate code via DB function
  const { data: code, error: codeErr } = await supabase.rpc('generate_lobby_code')
  if (codeErr || !code) {
    console.error('Failed to generate lobby code:', codeErr)
    return null
  }

  // Create lobby
  const { data: lobby, error } = await supabase
    .from('mp_lobbies')
    .insert({
      code,
      host_id: userId,
      status: 'waiting',
      game_mode: 'multi_mix',
      duration_minutes: 5,
    })
    .select()
    .single()

  if (error || !lobby) {
    console.error('Failed to create lobby:', error)
    return null
  }

  // Join as host
  await supabase.from('mp_lobby_players').insert({
    lobby_id: lobby.id,
    user_id: userId,
    nickname,
    avatar,
    is_host: true,
    is_ready: true,
  })

  return lobby as Lobby
}

/** Find a lobby by join code */
export async function findLobbyByCode(code: string): Promise<Lobby | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('mp_lobbies')
    .select('*')
    .eq('code', code.toUpperCase())
    .neq('status', 'finished')
    .single()

  if (error || !data) return null
  return data as Lobby
}

/** List public lobbies that are waiting for players */
export async function listOpenLobbies(): Promise<(Lobby & { player_count: number })[]> {
  if (!supabase) return []

  const { data: lobbies, error } = await supabase
    .from('mp_lobbies')
    .select('*')
    .eq('status', 'waiting')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !lobbies) return []

  // Get player counts
  const results = await Promise.all(
    (lobbies as Lobby[]).map(async (lobby) => {
      const { count } = await supabase!
        .from('mp_lobby_players')
        .select('*', { count: 'exact', head: true })
        .eq('lobby_id', lobby.id)
        .is('left_at', null)

      return { ...lobby, player_count: count ?? 0 }
    }),
  )

  return results
}

/** Get lobby by ID */
export async function getLobby(lobbyId: string): Promise<Lobby | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('mp_lobbies')
    .select('*')
    .eq('id', lobbyId)
    .single()

  if (error || !data) return null
  return data as Lobby
}

/** Join a lobby */
export async function joinLobby(
  lobbyId: string,
  userId: string,
  nickname: string,
  avatar: string,
  asSpectator = false,
): Promise<boolean> {
  if (!supabase) return false

  // Check if already in lobby
  const { data: existing } = await supabase
    .from('mp_lobby_players')
    .select('id, left_at')
    .eq('lobby_id', lobbyId)
    .eq('user_id', userId)
    .single()

  if (existing && !existing.left_at) return true // Already in

  if (existing && existing.left_at) {
    // Rejoin
    const { error } = await supabase
      .from('mp_lobby_players')
      .update({ left_at: null, is_spectator: asSpectator, is_ready: false })
      .eq('id', existing.id)
    return !error
  }

  const { error } = await supabase
    .from('mp_lobby_players')
    .insert({
      lobby_id: lobbyId,
      user_id: userId,
      nickname,
      avatar,
      is_spectator: asSpectator,
    })

  return !error
}

/** Leave a lobby (soft delete) */
export async function leaveLobby(lobbyId: string, userId: string): Promise<void> {
  if (!supabase) return
  await supabase
    .from('mp_lobby_players')
    .update({ left_at: new Date().toISOString() })
    .eq('lobby_id', lobbyId)
    .eq('user_id', userId)
}

/** Kick a player (host only — sets left_at) */
export async function kickPlayer(lobbyId: string, targetUserId: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('mp_lobby_players')
    .update({ left_at: new Date().toISOString() })
    .eq('lobby_id', lobbyId)
    .eq('user_id', targetUserId)

  return !error
}

/** Set player ready status */
export async function setReady(lobbyId: string, userId: string, ready: boolean): Promise<void> {
  if (!supabase) return
  await supabase
    .from('mp_lobby_players')
    .update({ is_ready: ready })
    .eq('lobby_id', lobbyId)
    .eq('user_id', userId)
}

/** Update lobby settings (host only) */
export async function updateLobbySettings(
  lobbyId: string,
  settings: { duration_minutes?: number; is_public?: boolean; max_players?: number },
): Promise<void> {
  if (!supabase) return
  await supabase.from('mp_lobbies').update(settings).eq('id', lobbyId)
}

/** Get players in a lobby (active only) */
export async function getLobbyPlayers(lobbyId: string): Promise<LobbyPlayer[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('mp_lobby_players')
    .select('*')
    .eq('lobby_id', lobbyId)
    .is('left_at', null)
    .order('joined_at', { ascending: true })

  if (error || !data) return []
  return data as LobbyPlayer[]
}

/** Update lobby status */
export async function updateLobbyStatus(
  lobbyId: string,
  status: Lobby['status'],
  extra?: Record<string, unknown>,
): Promise<void> {
  if (!supabase) return
  await supabase
    .from('mp_lobbies')
    .update({ status, ...extra })
    .eq('id', lobbyId)
}

/** Delete a lobby (host only — marks as finished) */
export async function deleteLobby(lobbyId: string): Promise<void> {
  if (!supabase) return
  await supabase
    .from('mp_lobbies')
    .update({ status: 'finished', finished_at: new Date().toISOString() })
    .eq('id', lobbyId)
}

/** Submit a game answer to DB */
export async function submitAnswer(answer: GameAnswer): Promise<void> {
  if (!supabase) return
  await supabase.from('mp_game_answers').upsert(answer, {
    onConflict: 'lobby_id,user_id,round_number',
  })
}

/** Update player score in DB */
export async function updatePlayerScore(
  lobbyId: string,
  userId: string,
  score: number,
): Promise<void> {
  if (!supabase) return
  await supabase
    .from('mp_lobby_players')
    .update({ score })
    .eq('lobby_id', lobbyId)
    .eq('user_id', userId)
}

// ─── Chat ────────────────────────────────────────────────────

/** Send a chat message (persisted to DB + broadcast) */
export async function sendChatMessage(
  lobbyId: string,
  userId: string,
  nickname: string,
  avatar: string,
  message: string,
): Promise<ChatMessage | null> {
  if (!supabase) return null
  const trimmed = message.trim().slice(0, 200)
  if (!trimmed) return null

  const { data, error } = await supabase
    .from('mp_chat_messages')
    .insert({ lobby_id: lobbyId, user_id: userId, nickname, avatar, message: trimmed })
    .select()
    .single()

  if (error || !data) return null
  return data as ChatMessage
}

/** Load recent chat messages for a lobby */
export async function getChatMessages(lobbyId: string, limit = 50): Promise<ChatMessage[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('mp_chat_messages')
    .select('*')
    .eq('lobby_id', lobbyId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error || !data) return []
  return data as ChatMessage[]
}

// ─── Realtime Channel ────────────────────────────────────────

/** Create and subscribe to a lobby's Realtime channel */
export function subscribeToLobby(
  lobbyId: string,
  userId: string,
  nickname: string,
  callbacks: {
    onPresenceSync?: (players: Record<string, { nickname: string; avatar: string; userId: string }[]>) => void
    onBroadcast?: (event: BroadcastEvent) => void
    onPlayerJoin?: (key: string) => void
    onPlayerLeave?: (key: string) => void
  },
): RealtimeChannel | null {
  if (!supabase) return null

  const channel = supabase.channel(`lobby:${lobbyId}`, {
    config: { presence: { key: userId } },
  })

  // Presence
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    callbacks.onPresenceSync?.(state as unknown as Record<string, { nickname: string; avatar: string; userId: string }[]>)
  })

  channel.on('presence', { event: 'join' }, ({ key }) => {
    callbacks.onPlayerJoin?.(key)
  })

  channel.on('presence', { event: 'leave' }, ({ key }) => {
    callbacks.onPlayerLeave?.(key)
  })

  // Broadcast
  channel.on('broadcast', { event: 'game' }, ({ payload }) => {
    callbacks.onBroadcast?.(payload as BroadcastEvent)
  })

  // Subscribe and track presence
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ nickname, userId })
    }
  })

  return channel
}

/** Broadcast an event to all lobby members */
export function broadcastToLobby(
  channel: RealtimeChannel,
  event: BroadcastEvent,
): void {
  channel.send({
    type: 'broadcast',
    event: 'game',
    payload: event,
  })
}

/** Unsubscribe from a lobby channel */
export function unsubscribeFromLobby(channel: RealtimeChannel): void {
  if (!supabase) return
  supabase.removeChannel(channel)
}

// ─── Ping ────────────────────────────────────────────────────

/** Send a ping to measure latency */
export function sendPing(channel: RealtimeChannel, userId: string): void {
  broadcastToLobby(channel, {
    type: 'ping',
    senderId: userId,
    timestamp: Date.now(),
  })
}

/** Respond to a ping with a pong */
export function sendPong(channel: RealtimeChannel, userId: string, originalTimestamp: number): void {
  broadcastToLobby(channel, {
    type: 'pong',
    senderId: userId,
    originalTimestamp,
  })
}
