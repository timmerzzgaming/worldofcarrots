export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  nickname: string
  avatar: string
  role: UserRole
  is_banned: boolean
  credits: number
  carrots: number
  xp: number
  level: number
  games_completed: number
  created_at: string
  last_active_at: string
}

export interface AuthState {
  user: Profile | null
  isGuest: boolean
  isAdmin: boolean
  isLoading: boolean
  signUp: (email: string, password: string, nickname: string, avatar: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateCredits: (delta: number) => void
  updateXp: (xpDelta: number, newLevel: number) => void
  updateCarrots: (delta: number) => void
  updateGamesCompleted: () => void
}

export const AVATARS = [
  '🥕', '🌍', '🏔️', '🧭', '🗺️', '⛵', '🌋', '🏝️',
  '🎯', '🦅', '🐪', '🐧', '🌊', '🏛️', '🗿', '🌵',
  '🎒', '🧊', '🌸', '🦜', '🐻', '🏕️', '🌄', '⭐',
] as const
