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

type Mode = 'choice' | 'signup' | 'signin' | 'admin-dev'

export default function AuthModal({ onClose }: AuthModalProps) {
  const { t } = useTranslation()
  const { signUp, signIn, signInWithPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('choice')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('🌍')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    setError(null)
    if (nickname.length < 3 || nickname.length > 20) {
      setError(t('auth.nicknameLength' as keyof Translations)); return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
      setError(t('auth.nicknameChars' as keyof Translations)); return
    }
    if (!email.includes('@')) {
      setError(t('auth.invalidEmail' as keyof Translations)); return
    }
    setLoading(true)
    const result = await signUp(email, nickname, avatar)
    setLoading(false)
    if (result.error) setError(result.error)
    else setSuccess(true)
  }

  async function handleSignIn() {
    setError(null)
    if (!email.includes('@')) {
      setError(t('auth.invalidEmail' as keyof Translations)); return
    }
    setLoading(true)
    const result = await signIn(email)
    setLoading(false)
    if (result.error) setError(result.error)
    else setSuccess(true)
  }

  async function handleAdminLogin() {
    setError(null)
    if (!nickname || !password) {
      setError('Username and password required'); return
    }
    setLoading(true)
    try {
      // Map username to the fake email used by test/admin accounts
      const fakeEmail = `${nickname.toLowerCase().trim()}@test.woc.local`
      const result = await signInWithPassword(fakeEmail, password)
      if (result.error) setError(result.error)
      else onClose()
    } finally {
      setLoading(false)
    }
  }

  // Magic link sent confirmation
  if (success) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-8 bg-geo-bg/60 backdrop-blur-sm" onClick={onClose}>
        <div className="glass-panel p-8 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
          <p className="text-4xl mb-4">📧</p>
          <p className="text-geo-on-surface font-headline font-extrabold text-lg uppercase mb-2">
            {t('auth.checkEmail' as keyof Translations)}
          </p>
          <p className="text-geo-on-surface-dim text-sm font-body mb-6">
            {t('auth.magicLinkSent' as keyof Translations)}
          </p>
          <button onClick={onClose} className="btn-primary px-8 py-2.5">OK</button>
        </div>
      </div>
    )
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
            <div className="mt-6 pt-4 border-t border-geo-outline-dim/20 flex items-center justify-between">
              <button
                onClick={() => { playClick(); onClose() }}
                className="text-geo-on-surface-dim text-sm font-headline hover:text-geo-primary transition-colors"
              >
                {t('auth.continueAsGuest' as keyof Translations)}
              </button>
              <button
                onClick={() => { playClick(); setMode('admin-dev') }}
                className="text-geo-outline text-[10px] font-headline hover:text-geo-on-surface-dim transition-colors"
              >
                DEV LOGIN
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
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-5"
            />

            <label className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              {t('auth.email' as keyof Translations)}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-5"
            />

            {error && <p className="text-geo-error text-xs font-body mb-4">{error}</p>}

            <button
              onClick={handleSignUp}
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? '...' : t('auth.sendMagicLink' as keyof Translations)}
            </button>

            <button
              onClick={() => { playClick(); setMode('choice'); setError(null) }}
              className="w-full text-center text-geo-on-surface-dim text-sm font-headline mt-4 hover:text-geo-primary transition-colors"
            >
              ← {t('back')}
            </button>
          </div>
        )}

        {/* ---- Sign In (magic link) ---- */}
        {mode === 'signin' && (
          <div>
            <p className="text-geo-on-surface font-headline font-extrabold text-xl uppercase mb-6 text-center">
              {t('auth.signIn' as keyof Translations)}
            </p>

            <label className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              {t('auth.email' as keyof Translations)}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-5"
            />

            {error && <p className="text-geo-error text-xs font-body mb-4">{error}</p>}

            <button
              onClick={handleSignIn}
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? '...' : t('auth.sendMagicLink' as keyof Translations)}
            </button>

            <button
              onClick={() => { playClick(); setMode('choice'); setError(null) }}
              className="w-full text-center text-geo-on-surface-dim text-sm font-headline mt-4 hover:text-geo-primary transition-colors"
            >
              ← {t('back')}
            </button>
          </div>
        )}

        {/* ---- Dev / Test Login (username + password) ---- */}
        {mode === 'admin-dev' && (
          <div>
            <p className="text-geo-on-surface font-headline font-extrabold text-xl uppercase mb-2 text-center">
              Dev Login
            </p>
            <p className="text-geo-on-surface-dim text-xs font-body mb-6 text-center">
              Login with username &amp; password for admin or test accounts.
            </p>

            <label htmlFor="dev-username" className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              Username
            </label>
            <input
              id="dev-username"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="admin"
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-4"
            />

            <label htmlFor="dev-password" className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              id="dev-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-5"
            />

            {error && <p role="alert" className="text-geo-error text-xs font-body mb-4">{error}</p>}

            <button
              onClick={handleAdminLogin}
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? '...' : 'Log In'}
            </button>

            <button
              onClick={() => { playClick(); setMode('choice'); setError(null); setNickname('') }}
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
