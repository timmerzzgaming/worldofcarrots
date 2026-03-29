'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!supabase) return
    // Supabase will auto-detect the recovery token from the URL hash
    // and establish a session. We just need to wait for it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Also check current session in case event already fired
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset() {
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!supabase) {
      setError('Service not available')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/'), 3000)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-geo-bg p-4">
        <div className="glass-panel p-6 sm:p-8 max-w-md w-full text-center">
          <p className="text-4xl mb-3">&#10003;</p>
          <h1 className="text-geo-on-surface font-headline font-extrabold text-xl uppercase mb-2">
            Password Updated
          </h1>
          <p className="text-geo-on-surface-dim text-sm font-body">
            Your password has been reset. Redirecting to home...
          </p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-geo-bg p-4">
        <div className="glass-panel p-6 sm:p-8 max-w-md w-full text-center">
          <p className="text-geo-on-surface-dim text-sm font-body">
            Verifying reset link...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-geo-bg p-4">
      <div className="glass-panel p-6 sm:p-8 max-w-md w-full">
        <h1 className="text-geo-on-surface font-headline font-extrabold text-xl uppercase mb-6 text-center">
          Set New Password
        </h1>

        <label className="block text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-1.5">
          New Password
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
          onKeyDown={(e) => e.key === 'Enter' && handleReset()}
          placeholder="Repeat password"
          className="w-full px-4 py-2.5 rounded-xl bg-geo-surface border-2 border-geo-outline-dim/30 text-geo-on-surface font-body text-sm focus:border-geo-primary focus:outline-none mb-5"
        />

        {error && <p className="text-geo-error text-xs font-body mb-4">{error}</p>}

        <button
          onClick={handleReset}
          disabled={loading}
          className="btn-primary w-full py-3 disabled:opacity-50"
        >
          {loading ? '...' : 'Reset Password'}
        </button>
      </div>
    </div>
  )
}
