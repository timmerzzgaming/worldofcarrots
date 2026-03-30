'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/context'
import { useBasePath } from '@/lib/basePath'
import { playClick } from '@/lib/sounds'
import {
  createLobby,
  findLobbyByCode,
  joinLobby,
  listOpenLobbies,
  type Lobby,
} from '@/lib/multiplayer'
import MapBackground from '@/components/home/MapBackground'
import FloatingFlags from '@/components/home/FloatingFlags'

export default function MultiplayerHubPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user, isGuest } = useAuth()
  const { prefixPath } = useBasePath()

  const [lobbies, setLobbies] = useState<(Lobby & { player_count: number })[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchLobbies = useCallback(async () => {
    const data = await listOpenLobbies()
    setLobbies(data)
  }, [])

  // Auto-refresh lobby list
  useEffect(() => {
    fetchLobbies()
    const interval = setInterval(fetchLobbies, 5000)
    return () => clearInterval(interval)
  }, [fetchLobbies])

  async function handleCreateLobby() {
    if (!user || isGuest) return
    playClick()
    setLoading(true)
    setError('')

    const lobby = await createLobby(user.id, user.nickname, user.avatar ?? '🌍')
    setLoading(false)

    if (!lobby) {
      setError('Failed to create lobby')
      return
    }

    router.push(prefixPath(`/game/multiplayer/${lobby.id}`))
  }

  async function handleJoinByCode() {
    if (!user || isGuest || !joinCode.trim()) return
    playClick()
    setLoading(true)
    setError('')

    const lobby = await findLobbyByCode(joinCode.trim())
    if (!lobby) {
      setError('Lobby not found')
      setLoading(false)
      return
    }

    if (lobby.status !== 'waiting') {
      setError('Game already in progress')
      setLoading(false)
      return
    }

    const joined = await joinLobby(lobby.id, user.id, user.nickname, user.avatar ?? '🌍')
    setLoading(false)

    if (!joined) {
      setError('Failed to join lobby')
      return
    }

    router.push(prefixPath(`/game/multiplayer/${lobby.id}`))
  }

  async function handleJoinLobby(lobbyId: string, asSpectator = false) {
    if (!user || isGuest) return
    playClick()
    setLoading(true)
    setError('')

    const joined = await joinLobby(lobbyId, user.id, user.nickname, user.avatar ?? '🌍', asSpectator)
    setLoading(false)

    if (!joined) {
      setError('Failed to join lobby')
      return
    }

    router.push(prefixPath(`/game/multiplayer/${lobbyId}`))
  }

  function handleBack() {
    playClick()
    router.push(prefixPath('/'))
  }

  // Guest gate
  if (isGuest || !user) {
    return (
      <>
        <MapBackground />
        <FloatingFlags />
        <main className="relative min-h-screen flex flex-col items-center justify-center px-4">
          <div className="glass-panel p-8 text-center max-w-md">
            <div className="text-6xl mb-4">🎮</div>
            <h1 className="text-2xl font-headline font-extrabold text-geo-on-surface uppercase mb-3">
              {t('mp.multiplayer')}
            </h1>
            <p className="text-geo-on-surface-dim mb-6">{t('mp.loginRequired')}</p>
            <button onClick={handleBack} className="btn-ghost px-6 py-2">
              {t('back')}
            </button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <MapBackground />
      <FloatingFlags />
      <main className="relative min-h-screen flex flex-col items-center px-3 sm:px-4 pt-8 sm:pt-10 pb-12">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="fixed top-10 left-2 sm:top-4 sm:left-4 z-[60]"
        >
          <button
            onClick={handleBack}
            className="btn-ghost px-4 py-3 sm:px-5 sm:py-2.5 text-sm flex items-center gap-2"
            aria-label={t('back')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            {t('back')}
          </button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <h1 className="text-3xl sm:text-5xl font-headline font-extrabold text-geo-on-surface uppercase tracking-tight mb-2">
            🎮 {t('mp.multiplayer')}
          </h1>
          <p className="text-geo-on-surface-dim text-sm sm:text-base">{t('mp.multiMix')}</p>
        </motion.div>

        <div className="w-full max-w-3xl space-y-6">
          {/* Create + Join row */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {/* Create Lobby */}
            <button
              onClick={handleCreateLobby}
              disabled={loading}
              className="btn-primary px-6 py-4 text-lg flex items-center justify-center gap-3"
            >
              <span className="text-2xl">+</span>
              {t('mp.createLobby')}
            </button>

            {/* Join by Code */}
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                placeholder={t('mp.joinCode')}
                maxLength={6}
                className="flex-1 px-4 py-3 bg-geo-surface border-2 border-geo-outline rounded-xl text-geo-on-surface font-headline font-bold text-center text-lg tracking-widest uppercase placeholder:text-geo-on-surface-dim/50 placeholder:tracking-normal placeholder:text-sm placeholder:font-normal focus:border-geo-primary focus:outline-none"
                aria-label={t('mp.joinCode')}
              />
              <button
                onClick={handleJoinByCode}
                disabled={loading || joinCode.length < 4}
                className="btn-secondary px-5 py-3 shrink-0"
              >
                {t('mp.joinByCode')}
              </button>
            </div>
          </motion.div>

          {error && (
            <p className="text-geo-error text-center font-headline font-bold text-sm" role="alert">
              {error}
            </p>
          )}

          {/* Open Lobbies */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg sm:text-xl font-headline font-extrabold text-geo-on-surface uppercase mb-3">
              {t('mp.openLobbies')}
            </h2>

            {lobbies.length === 0 ? (
              <div className="glass-panel p-8 text-center">
                <p className="text-geo-on-surface-dim text-sm">{t('mp.noLobbies')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lobbies.map((lobby) => (
                  <div
                    key={lobby.id}
                    className="glass-panel p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">🎮</span>
                      <div className="min-w-0">
                        <p className="font-headline font-bold text-geo-on-surface truncate">
                          {lobby.code}
                        </p>
                        <p className="text-xs text-geo-on-surface-dim">
                          {lobby.player_count}/{lobby.max_players} {t('mp.players')} · {lobby.duration_minutes} {t('mp.minutes')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleJoinLobby(lobby.id)}
                        disabled={loading || lobby.player_count >= lobby.max_players}
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        {t('mp.joinByCode')}
                      </button>
                      <button
                        onClick={() => handleJoinLobby(lobby.id, true)}
                        disabled={loading}
                        className="btn-ghost px-3 py-2 text-sm"
                      >
                        {t('mp.spectate')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </>
  )
}
