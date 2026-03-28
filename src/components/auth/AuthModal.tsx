'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import AvatarPicker from './AvatarPicker'
import { playClick } from '@/lib/sounds'

interface AuthModalProps {
  onClose: () => void
}

type Mode = 'choice' | 'signup' | 'signin'

export default function AuthModal({ onClose }: AuthModalProps) {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const [mode, setMode] = useState<Mode>('choice')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('🌍')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function toEmail(name: string) {
    return `${name.toLowerCase()}@test.woc.local`
  }

  async function handleSignUp() {
    setError(null)
    if (nickname.length < 3 || nickname.length > 20) {
      setError(t('auth.nicknameLength' as keyof Translations)); return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
      setError(t('auth.nicknameChars' as keyof Translations)); return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters'); return
    }
    setLoading(true)
    // Register via server API (auto-confirms, creates profile)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, password, avatar }),
    })
    const json = await res.json()
    if (!res.ok) {
      setLoading(false)
      setError(json.error?.message ?? 'Registration failed')
      return
    }
    // Auto sign-in after registration
    const result = await signIn(toEmail(nickname), password)
    setLoading(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  async function handleSignIn() {
    setError(null)
    if (!nickname.trim()) {
      setError('Nickname is required'); return
    }
    if (!password) {
      setError('Password is required'); return
    }
    setLoading(true)
    const result = await signIn(toEmail(nickname), password)
    setLoading(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-8 bg-geo-bg/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-panel p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>

        {/* ---- Choice screen ---- */}
        {mode === 'choice' && (
          <div className="text-center">
            <p className="text-4xl mb-3">🌍</p>
            <p className="text-geo-on-surface font-headline font-extrabold text-xl uppercase mb-1">
              {t('auth.welcome' as keyof Translations)}
            </p>
            <p className="text-geo-on-surface-dim text-sm font-body mb-8">
              {t('auth.welcomeDesc' as keyof Translations)}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { playClick(); setMode('signup') }}
                className="btn-primary w-full py-3 text-base"
              >
                {t('auth.createAccount' as keyof Translations)}
              </button>
              <button
                onClick={() => { playClick(); setMode('signin') }}
                className="btn-ghost w-full py-3 text-base"
              >
                {t('auth.signIn' as keyof Translations)}
              </button>
            </div>
            <div className="mt-6 pt-4 border-t border-geo-outline-dim/20">
              <button
                onClick={() => { playClick(); onClose() }}
                className="text-geo-on-surface-dim text-sm font-headline hover:text-geo-primary transition-colors"
              >
                {t('auth.continueAsGuest' as keyof Translations)}
              </button>
            </div>
          </div>
        )}

        {/* ---- Sign Up ---- */}
        {mode === 'signup' && (
          <div>
            <p className="text-geo-on-surface font-headline font-extrabold text-xl uppercase mb-6 text-center">
              {t('auth.createAccount' as keyof Translations)}
            </p>

            <label className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              {t('auth.chooseAvatar' as keyof Translations)}
            </label>
            <div className="mb-5">
              <AvatarPicker selected={avatar} onSelect={setAvatar} />
            </div>

            <label className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              {t('auth.nickname' as keyof Translations)}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="GeoExplorer42"
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-4"
            />

            <label className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
              placeholder="Min. 6 characters"
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-5"
            />

            {error && <p className="text-geo-error text-xs font-body mb-4">{error}</p>}

            <button
              onClick={handleSignUp}
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? '...' : t('auth.createAccount' as keyof Translations)}
            </button>

            <button
              onClick={() => { playClick(); setMode('choice'); setError(null) }}
              className="w-full text-center text-geo-on-surface-dim text-sm font-headline mt-4 hover:text-geo-primary transition-colors"
            >
              ← {t('back')}
            </button>
          </div>
        )}

        {/* ---- Sign In ---- */}
        {mode === 'signin' && (
          <div>
            <p className="text-geo-on-surface font-headline font-extrabold text-xl uppercase mb-6 text-center">
              {t('auth.signIn' as keyof Translations)}
            </p>

            <label className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              {t('auth.nickname' as keyof Translations)}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your nickname"
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-4"
            />

            <label className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-5"
            />

            {error && <p className="text-geo-error text-xs font-body mb-4">{error}</p>}

            <button
              onClick={handleSignIn}
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? '...' : t('auth.signIn' as keyof Translations)}
            </button>

            <button
              onClick={() => { playClick(); setMode('choice'); setError(null) }}
              className="w-full text-center text-geo-on-surface-dim text-sm font-headline mt-4 hover:text-geo-primary transition-colors"
            >
              ← {t('back')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
