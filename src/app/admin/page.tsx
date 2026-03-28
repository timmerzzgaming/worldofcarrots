'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/auth/types'
import { AVATARS } from '@/lib/auth/types'
import EconomySettings from '@/components/admin/EconomySettings'
import { clearHighScores } from '@/lib/highScores'

interface UserRow extends Profile {
  _adjustAmount?: string
  _adjustReason?: string
}

interface TestAccountForm {
  username: string
  password: string
  avatar: string
  credits: string
}

const DEFAULT_TEST_FORM: TestAccountForm = {
  username: '',
  password: '',
  avatar: '🌍',
  credits: '100',
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isAdmin, isLoading } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [testForm, setTestForm] = useState<TestAccountForm>({ ...DEFAULT_TEST_FORM })
  const [testFormStatus, setTestFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [testFormSubmitting, setTestFormSubmitting] = useState(false)

  const fetchUsers = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setUsers(data.map((u) => ({ ...u, _adjustAmount: '', _adjustReason: '' })))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/')
      return
    }
    if (isAdmin) fetchUsers()
  }, [isAdmin, isLoading, router, fetchUsers])

  async function handleBanToggle(userId: string, currentBanned: boolean) {
    if (!supabase) return
    await supabase.from('profiles').update({ is_banned: !currentBanned }).eq('id', userId)
    fetchUsers()
  }

  async function handleDelete(userId: string, nickname: string) {
    if (!confirm(`Delete user "${nickname}"? This cannot be undone.`)) return
    if (!supabase) return
    await supabase.from('profiles').delete().eq('id', userId)
    fetchUsers()
  }

  async function handleAdjustCredits(u: UserRow) {
    const amount = parseInt(u._adjustAmount ?? '', 10)
    if (isNaN(amount) || amount === 0 || !u._adjustReason?.trim()) return
    if (!supabase) return

    await supabase.from('credit_transactions').insert({
      user_id: u.id,
      amount,
      reason: `admin_adjustment: ${u._adjustReason}`,
    })
    await supabase.from('profiles').update({ credits: u.credits + amount }).eq('id', u.id)
    fetchUsers()
  }

  async function handleCreateTestAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return

    setTestFormSubmitting(true)
    setTestFormStatus(null)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) {
        setTestFormStatus({ type: 'error', message: 'No active session' })
        return
      }

      const res = await fetch('/api/admin/test-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: testForm.username.trim(),
          password: testForm.password,
          avatar: testForm.avatar,
          credits: parseInt(testForm.credits, 10) || 0,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setTestFormStatus({ type: 'error', message: json.error?.message ?? 'Unknown error' })
        return
      }

      setTestFormStatus({
        type: 'success',
        message: `Created "${json.data.username}" — login with ${json.data.email} / (password you set)`,
      })
      setTestForm({ ...DEFAULT_TEST_FORM })
      fetchUsers()
    } catch (err) {
      setTestFormStatus({ type: 'error', message: err instanceof Error ? err.message : 'Request failed' })
    } finally {
      setTestFormSubmitting(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-geo-bg flex items-center justify-center">
        <p className="text-geo-on-surface-dim font-headline">Loading...</p>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-geo-bg p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-headline font-extrabold text-geo-on-surface uppercase">
            Admin Dashboard
          </h1>
          <button
            onClick={() => router.push('/')}
            className="btn-ghost px-4 py-2 text-sm"
          >
            ← Back to Game
          </button>
        </div>

        {/* Test Account Creator */}
        <section className="glass-panel p-5 mb-6" aria-labelledby="test-accounts-heading">
          <h2 id="test-accounts-heading" className="text-lg font-headline font-bold text-geo-on-surface mb-3">
            Create Test Account
          </h2>
          <p className="text-geo-on-surface-dim text-xs font-body mb-4">
            Creates a fake user with username/password login. No email verification required.
          </p>

          <form onSubmit={handleCreateTestAccount} className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label htmlFor="test-username" className="text-xs font-headline text-geo-on-surface-dim">
                Username
              </label>
              <input
                id="test-username"
                type="text"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                placeholder="test_player1"
                value={testForm.username}
                onChange={(e) => setTestForm((f) => ({ ...f, username: e.target.value }))}
                className="w-40 px-2 py-1.5 rounded text-sm bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="test-password" className="text-xs font-headline text-geo-on-surface-dim">
                Password
              </label>
              <input
                id="test-password"
                type="text"
                required
                minLength={6}
                placeholder="test123"
                value={testForm.password}
                onChange={(e) => setTestForm((f) => ({ ...f, password: e.target.value }))}
                className="w-32 px-2 py-1.5 rounded text-sm bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="test-avatar" className="text-xs font-headline text-geo-on-surface-dim">
                Avatar
              </label>
              <select
                id="test-avatar"
                value={testForm.avatar}
                onChange={(e) => setTestForm((f) => ({ ...f, avatar: e.target.value }))}
                className="w-16 px-2 py-1.5 rounded text-sm bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface text-center"
              >
                {AVATARS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="test-credits" className="text-xs font-headline text-geo-on-surface-dim">
                Credits
              </label>
              <input
                id="test-credits"
                type="number"
                min={0}
                max={99999}
                value={testForm.credits}
                onChange={(e) => setTestForm((f) => ({ ...f, credits: e.target.value }))}
                className="w-20 px-2 py-1.5 rounded text-sm bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
              />
            </div>

            <button
              type="submit"
              disabled={testFormSubmitting}
              className="btn-primary px-4 py-1.5 text-sm disabled:opacity-50"
            >
              {testFormSubmitting ? 'Creating...' : 'Create'}
            </button>
          </form>

          {testFormStatus && (
            <p
              role="status"
              className={`mt-3 text-sm font-body ${
                testFormStatus.type === 'success' ? 'text-green-400' : 'text-geo-error'
              }`}
            >
              {testFormStatus.message}
            </p>
          )}
        </section>

        {/* Economy Settings */}
        <EconomySettings />

        {/* Data Management */}
        <section className="glass-panel p-5 mb-6">
          <h2 className="text-lg font-headline font-bold text-geo-on-surface mb-3">Data Management</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (!confirm('Clear all local high scores? This only affects your browser.')) return
                clearHighScores()
                // Also clear distance scores
                const keys = Object.keys(localStorage).filter(k => k.startsWith('woc-distance-scores'))
                keys.forEach(k => localStorage.removeItem(k))
                alert('All local high scores cleared.')
              }}
              className="px-4 py-2 rounded-lg text-sm font-headline font-bold text-geo-error bg-geo-error/10 border border-geo-error/30 hover:bg-geo-error/20 transition-colors"
            >
              Clear Local High Scores
            </button>
            <span className="text-xs text-geo-on-surface-dim font-body">Removes all locally stored high scores from this browser</span>
          </div>
        </section>

        <p className="text-geo-on-surface-dim text-sm font-body mb-4">
          {users.length} registered users
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="text-left text-geo-on-surface-dim text-xs font-headline uppercase tracking-wider border-b border-geo-outline-dim/30">
                <th className="pb-2 pr-4">User</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">Credits</th>
                <th className="pb-2 pr-4">Registered</th>
                <th className="pb-2 pr-4">Last Active</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-geo-outline-dim/10 hover:bg-geo-surface/30">
                  <td className="py-3 pr-4">
                    <span className="text-lg mr-1">{u.avatar}</span>
                    <span className="text-geo-on-surface font-bold">{u.nickname}</span>
                  </td>
                  <td className="py-3 pr-4 text-geo-on-surface-dim">—</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-headline font-bold ${
                      u.role === 'admin' ? 'bg-geo-primary/20 text-geo-primary' : 'bg-geo-surface text-geo-on-surface-dim'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-geo-tertiary-bright font-bold">{u.credits}</td>
                  <td className="py-3 pr-4 text-geo-on-surface-dim text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4 text-geo-on-surface-dim text-xs">
                    {new Date(u.last_active_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-headline font-bold ${
                      u.is_banned ? 'bg-geo-error/20 text-geo-error' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {u.is_banned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleBanToggle(u.id, u.is_banned)}
                          className={`px-2 py-1 rounded text-xs font-headline font-bold ${
                            u.is_banned
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-geo-error/20 text-geo-error hover:bg-geo-error/30'
                          }`}
                        >
                          {u.is_banned ? 'Unban' : 'Ban'}
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDelete(u.id, u.nickname)}
                            className="px-2 py-1 rounded text-xs font-headline font-bold bg-geo-error/10 text-geo-error hover:bg-geo-error/20"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="flex gap-1 items-center">
                        <input
                          type="number"
                          placeholder="±"
                          value={u._adjustAmount ?? ''}
                          onChange={(e) => setUsers((prev) => prev.map((p) => p.id === u.id ? { ...p, _adjustAmount: e.target.value } : p))}
                          className="w-16 px-1.5 py-1 rounded text-xs bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
                        />
                        <input
                          type="text"
                          placeholder="Reason"
                          value={u._adjustReason ?? ''}
                          onChange={(e) => setUsers((prev) => prev.map((p) => p.id === u.id ? { ...p, _adjustReason: e.target.value } : p))}
                          className="w-24 px-1.5 py-1 rounded text-xs bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
                        />
                        <button
                          onClick={() => handleAdjustCredits(u)}
                          className="px-2 py-1 rounded text-xs font-headline font-bold bg-geo-tertiary/20 text-geo-tertiary-bright hover:bg-geo-tertiary/30"
                        >
                          Adjust
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
