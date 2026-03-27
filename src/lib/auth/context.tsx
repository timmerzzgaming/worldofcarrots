'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { AuthState, Profile } from './types'

const AuthContext = createContext<AuthState>({
  user: null,
  isGuest: true,
  isAdmin: false,
  isLoading: true,
  signUp: async () => ({ error: 'Not initialized' }),
  signIn: async () => ({ error: 'Not initialized' }),
  signInWithPassword: async () => ({ error: 'Not initialized' }),
  signOut: async () => {},
  refreshProfile: async () => {},
  updateCredits: () => {},
  updateXp: () => {},
  updateCarrots: () => {},
  updateGamesCompleted: () => {},
})

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data as Profile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Track the auth user ID separately — profile fetch happens outside onAuthStateChange
  // to avoid Supabase JS v2 deadlock when making DB calls inside the listener.
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const initialDoneRef = useRef(false)

  // Listen to auth state changes — only track the user ID, no DB calls here
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setAuthUserId(session.user.id)
      } else {
        setAuthUserId(null)
        setUser(null)
        if (!initialDoneRef.current) {
          initialDoneRef.current = true
          setIsLoading(false)
        }
      }
    })

    // Safety timeout
    const timeout = setTimeout(() => {
      if (!initialDoneRef.current) {
        initialDoneRef.current = true
        setIsLoading(false)
      }
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  // Fetch profile whenever authUserId changes — runs outside the auth listener
  useEffect(() => {
    if (!supabase || !authUserId) return

    let cancelled = false

    async function loadProfile() {
      // Fetch profile for authenticated user
      let profile = await fetchProfile(authUserId!)

      // Profile doesn't exist yet — create from pending signup data
      if (!profile) {
        const pending = localStorage.getItem('woc-pending-signup')
        if (pending) {
          try {
            const { nickname, avatar } = JSON.parse(pending) as { nickname: string; avatar: string }
            const { error } = await supabase!
              .from('profiles')
              .insert({ id: authUserId!, nickname, avatar })
            if (!error) {
              localStorage.removeItem('woc-pending-signup')
              profile = await fetchProfile(authUserId!)
            } else {
              console.warn('Profile creation failed:', error.message)
            }
          } catch {
            console.warn('Invalid pending signup data')
          }
        }
      }

      if (cancelled) return

      if (profile && !profile.is_banned) {
        setUser(profile)
      } else if (profile?.is_banned) {
        setUser(null)
        await supabase!.auth.signOut()
      }

      if (!initialDoneRef.current) {
        initialDoneRef.current = true
        setIsLoading(false)
      }
    }

    loadProfile()
    return () => { cancelled = true }
  }, [authUserId])

  const signUp = useCallback(async (email: string, nickname: string, avatar: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase not configured' }

    const { data, error: authError } = await supabase.auth.signInWithOtp({ email })
    if (authError) return { error: authError.message }

    localStorage.setItem('woc-pending-signup', JSON.stringify({ nickname, avatar }))
    return { error: null }
  }, [])

  const signIn = useCallback(async (email: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase not configured' }

    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase not configured' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!supabase || !user) return
    const profile = await fetchProfile(user.id)
    if (profile) setUser(profile)
  }, [user])

  const updateCredits = useCallback((delta: number) => {
    setUser((prev) => prev ? { ...prev, credits: prev.credits + delta } : prev)
  }, [])

  const updateXp = useCallback((xpDelta: number, newLevel: number) => {
    setUser((prev) => prev ? { ...prev, xp: prev.xp + xpDelta, level: newLevel } : prev)
  }, [])

  const updateCarrots = useCallback((delta: number) => {
    setUser((prev) => prev ? { ...prev, carrots: prev.carrots + delta } : prev)
  }, [])

  const updateGamesCompleted = useCallback(() => {
    setUser((prev) => prev ? { ...prev, games_completed: prev.games_completed + 1 } : prev)
  }, [])

  const value: AuthState = {
    user,
    isGuest: user === null,
    isAdmin: user?.role === 'admin',
    isLoading,
    signUp,
    signIn,
    signInWithPassword,
    signOut,
    refreshProfile,
    updateCredits,
    updateXp,
    updateCarrots,
    updateGamesCompleted,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
