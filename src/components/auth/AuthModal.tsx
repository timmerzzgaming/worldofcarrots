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

type Mode = 'choice' | 'signup' | 'signin' | 'check-email' | 'forgot' | 'recovery-sent'

export default function AuthModal({ onClose }: AuthModalProps) {
  const { t } = useTranslation()
  const { signUp, signIn } = useAuth()
  const [mode, setMode] = useState<Mode>('choice')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatar, setAvatar] = useState('🌍')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [recoveryNickname, setRecoveryNickname] = useState<string | null>(null)

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
    if (password.length < 6) {
      setError('Password must be at least 6 characters'); return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match'); return
    }
    setLoading(true)
    // 1. Check nickname availability
    const checkRes = await fetch('/api/auth/check-nickname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    })
    if (!checkRes.ok) {
      const checkJson = await checkRes.json()
      setLoading(false)
      setError(checkJson.error?.message ?? 'Nickname check failed')
      return
    }
    // 2. Client-side signUp — this triggers Supabase confirmation email
    const result = await signUp(email, password, nickname, avatar)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    // Show "check your email" screen
    setMode('check-email')
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
    // Look up email by nickname, then sign in
    const lookupRes = await fetch('/api/auth/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: nickname.trim() }),
    })
    if (!lookupRes.ok) {
      setLoading(false)
      setError('User not found')
      return
    }
    const { data } = await lookupRes.json()
    const result = await signIn(data.email, password)
    setLoading(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  async function handleForgot() {
    setError(null)
    if (!email.trim() || !email.includes('@')) {
      setError(t('auth.invalidEmail' as keyof Translations)); return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Recovery failed')
      } else {
        setRecoveryNickname(json.data?.nickname ?? null)
        setMode('recovery-sent')
      }
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-8 bg-geo-bg/60 backdrop-blur-sm">
      <div className="glass-panel p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-geo-on-surface-dim hover:text-geo-on-surface hover:bg-geo-surface-high/50 transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

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
              {t('auth.email' as keyof Translations)}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-4"
            />

            <label className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-4"
            />

            <label className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
              placeholder="Repeat password"
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

        {/* ---- Check Email ---- */}
        {mode === 'check-email' && (
          <div className="text-center">
            <p className="text-4xl mb-3">📧</p>
            <p className="text-geo-on-surface font-headline font-extrabold text-xl uppercase mb-2">
              Check your email
            </p>
            <p className="text-geo-on-surface-dim text-sm font-body mb-2">
              We sent an activation link to:
            </p>
            <p className="text-geo-primary font-headline font-bold text-sm mb-6">
              {email}
            </p>
            <p className="text-geo-on-surface-dim text-xs font-body mb-6">
              Click the link in the email to activate your account, then come back and sign in.
            </p>
            <button
              onClick={() => { playClick(); setMode('signin'); setError(null); setPassword(''); setConfirmPassword('') }}
              className="btn-primary w-full py-3"
            >
              Go to Sign In
            </button>
            <button
              onClick={() => { playClick(); onClose() }}
              className="w-full text-center text-geo-on-surface-dim text-sm font-headline mt-4 hover:text-geo-primary transition-colors"
            >
              Close
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
              onClick={() => { playClick(); setMode('forgot'); setError(null); setEmail('') }}
              className="w-full text-center text-geo-on-surface-dim text-xs font-headline mt-3 hover:text-geo-primary transition-colors"
            >
              {t('auth.forgotPassword' as keyof Translations)}
            </button>

            <button
              onClick={() => { playClick(); setMode('choice'); setError(null) }}
              className="w-full text-center text-geo-on-surface-dim text-sm font-headline mt-3 hover:text-geo-primary transition-colors"
            >
              ← {t('back')}
            </button>
          </div>
        )}

        {/* ---- Forgot Password ---- */}
        {mode === 'forgot' && (
          <div>
            <p className="text-4xl mb-3 text-center">🔑</p>
            <p className="text-geo-on-surface font-headline font-extrabold text-xl uppercase mb-2 text-center">
              {t('auth.forgotTitle' as keyof Translations)}
            </p>
            <p className="text-geo-on-surface-dim text-sm font-body mb-6 text-center">
              {t('auth.forgotDesc' as keyof Translations)}
            </p>

            <label className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
              {t('auth.email' as keyof Translations)}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleForgot()}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-5"
            />

            {error && <p className="text-geo-error text-xs font-body mb-4">{error}</p>}

            <button
              onClick={handleForgot}
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? '...' : t('auth.sendRecovery' as keyof Translations)}
            </button>

            <button
              onClick={() => { playClick(); setMode('signin'); setError(null) }}
              className="w-full text-center text-geo-on-surface-dim text-sm font-headline mt-4 hover:text-geo-primary transition-colors"
            >
              ← {t('auth.signIn' as keyof Translations)}
            </button>
          </div>
        )}

        {/* ---- Recovery Sent ---- */}
        {mode === 'recovery-sent' && (
          <div className="text-center">
            <p className="text-4xl mb-3">📧</p>
            <p className="text-geo-on-surface font-headline font-extrabold text-xl uppercase mb-2">
              {t('auth.recoverySent' as keyof Translations)}
            </p>

            {recoveryNickname && (
              <div className="mb-4 p-3 rounded-xl bg-geo-surface-high/30 border border-geo-outline-dim/20">
                <p className="text-geo-on-surface-dim text-xs font-headline mb-1">
                  {t('auth.recoveryNickname' as keyof Translations)}
                </p>
                <p className="text-geo-primary font-headline font-bold text-lg">
                  {recoveryNickname}
                </p>
              </div>
            )}

            <p className="text-geo-on-surface-dim text-sm font-body mb-2">
              {t('auth.resetCheckEmail' as keyof Translations)}
            </p>
            <p className="text-geo-primary font-headline font-bold text-sm mb-6">
              {email}
            </p>

            <button
              onClick={() => { playClick(); setMode('signin'); setError(null); setPassword('') }}
              className="btn-primary w-full py-3"
            >
              {t('auth.signIn' as keyof Translations)}
            </button>
            <button
              onClick={() => { playClick(); onClose() }}
              className="w-full text-center text-geo-on-surface-dim text-sm font-headline mt-4 hover:text-geo-primary transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
