'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface SettingRow {
  key: string
  value: unknown
  updated_at: string
}

type Tab = 'coins' | 'xp' | 'stars' | 'daily'

const MODES = ['classic', 'timed', 'marathon', 'survival', 'practice', 'borderless', 'flag', 'distance', 'us-states']
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']

export default function EconomySettings() {
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('coins')
  const [expanded, setExpanded] = useState(true)

  const fetchSettings = useCallback(async () => {
    if (!supabase) return
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) return

    const res = await fetch('/api/admin/economy-settings', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const json = await res.json()
      const map: Record<string, unknown> = {}
      for (const row of json.data as SettingRow[]) {
        map[row.key] = row.value
      }
      setSettings(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  async function saveSetting(key: string, value: unknown) {
    if (!supabase) return
    setSaving(key)
    setSaved(null)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setSaving(null); return }

    const res = await fetch('/api/admin/economy-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, value }),
    })

    setSaving(null)
    if (res.ok) {
      setSaved(key)
      setSettings((prev) => ({ ...prev, [key]: value }))
      setTimeout(() => setSaved(null), 2000)
    }
  }

  function getVal<T>(key: string, fallback: T): T {
    return (settings[key] as T) ?? fallback
  }

  function updateNested(settingKey: string, path: string[], value: number) {
    const current = JSON.parse(JSON.stringify(settings[settingKey] ?? {}))
    let obj = current
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]]
    }
    obj[path[path.length - 1]] = value
    saveSetting(settingKey, current)
  }

  if (!expanded) {
    return (
      <section className="glass-panel p-4 mb-6">
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-lg font-headline font-bold text-geo-on-surface">
            Economy Settings
          </h2>
          <span className="text-geo-on-surface-dim text-sm">▶</span>
        </button>
      </section>
    )
  }

  return (
    <section className="glass-panel p-5 mb-6" aria-labelledby="economy-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="economy-heading" className="text-lg font-headline font-bold text-geo-on-surface">
          Economy Settings
        </h2>
        <button onClick={() => setExpanded(false)} className="text-geo-on-surface-dim text-sm hover:text-geo-on-surface">
          ▼ Collapse
        </button>
      </div>

      {loading ? (
        <p className="text-geo-on-surface-dim text-sm">Loading settings...</p>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-geo-outline-dim/20 pb-2" role="tablist">
            {([['coins', '💰 Coins'], ['xp', '⚡ XP'], ['stars', '⭐ Stars'], ['daily', '📅 Daily Login']] as [Tab, string][]).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-headline font-bold transition-colors ${
                  tab === id ? 'bg-geo-primary/20 text-geo-primary' : 'text-geo-on-surface-dim hover:text-geo-on-surface'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Coins Tab */}
          {tab === 'coins' && (
            <div className="space-y-4">
              {/* Game completion rewards grid */}
              <div>
                <h3 className="text-xs font-headline font-bold text-geo-on-surface-dim uppercase tracking-widest mb-2">
                  Game Completion Rewards
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-body">
                    <thead>
                      <tr className="text-geo-on-surface-dim">
                        <th className="text-left pb-1 pr-2">Mode</th>
                        {DIFFICULTIES.map((d) => <th key={d} className="pb-1 px-1 text-center capitalize">{d}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {MODES.map((mode) => (
                        <tr key={mode} className="border-t border-geo-outline-dim/10">
                          <td className="py-1 pr-2 text-geo-on-surface font-bold capitalize">{mode}</td>
                          {DIFFICULTIES.map((diff) => {
                            const rewards = getVal<Record<string, Record<string, number>>>('game_complete_rewards', {})
                            const val = rewards[mode]?.[diff] ?? 0
                            return (
                              <td key={diff} className="py-1 px-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={999}
                                  value={val}
                                  onChange={(e) => updateNested('game_complete_rewards', [mode, diff], parseInt(e.target.value) || 0)}
                                  className="w-14 px-1.5 py-0.5 rounded text-center bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface text-xs"
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Per-correct multipliers */}
              <SettingGrid
                label="Per-Correct Bonus (coins per correct answer)"
                settingKey="per_correct_multipliers"
                fields={DIFFICULTIES}
                settings={settings}
                onSave={saveSetting}
                saving={saving}
                saved={saved}
              />

              {/* Simple number settings */}
              <div className="grid grid-cols-2 gap-3">
                <NumberSetting label="Star Bonus per Star" settingKey="star_bonus_per_star" settings={settings} onSave={saveSetting} saving={saving} saved={saved} />
                <NumberSetting label="Perfect Score Multiplier" settingKey="perfect_score_multiplier" settings={settings} onSave={saveSetting} saving={saving} saved={saved} step={0.1} />
                <NumberSetting label="No-Hints Bonus" settingKey="no_hints_bonus" settings={settings} onSave={saveSetting} saving={saving} saved={saved} />
                <NumberSetting label="Hint Cost" settingKey="hint_cost" settings={settings} onSave={saveSetting} saving={saving} saved={saved} />
              </div>

              {/* Speed bonus */}
              <div>
                <h3 className="text-xs font-headline font-bold text-geo-on-surface-dim uppercase tracking-widest mb-2">Speed Bonus (Timed Mode)</h3>
                <div className="flex gap-3">
                  <div>
                    <label className="text-[10px] text-geo-on-surface-dim">Min Correct</label>
                    <input
                      type="number"
                      value={(getVal<{ threshold: number; bonus: number }>('speed_bonus', { threshold: 20, bonus: 15 })).threshold}
                      onChange={(e) => {
                        const current = getVal<{ threshold: number; bonus: number }>('speed_bonus', { threshold: 20, bonus: 15 })
                        saveSetting('speed_bonus', { ...current, threshold: parseInt(e.target.value) || 0 })
                      }}
                      className="w-16 px-1.5 py-1 rounded text-xs bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-geo-on-surface-dim">Bonus Coins</label>
                    <input
                      type="number"
                      value={(getVal<{ threshold: number; bonus: number }>('speed_bonus', { threshold: 20, bonus: 15 })).bonus}
                      onChange={(e) => {
                        const current = getVal<{ threshold: number; bonus: number }>('speed_bonus', { threshold: 20, bonus: 15 })
                        saveSetting('speed_bonus', { ...current, bonus: parseInt(e.target.value) || 0 })
                      }}
                      className="w-16 px-1.5 py-1 rounded text-xs bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* XP Tab */}
          {tab === 'xp' && (
            <div className="space-y-4">
              <SettingGrid
                label="Base XP per Mode"
                settingKey="xp_base_per_mode"
                fields={MODES}
                settings={settings}
                onSave={saveSetting}
                saving={saving}
                saved={saved}
              />
              <SettingGrid
                label="XP Difficulty Multipliers"
                settingKey="xp_difficulty_multipliers"
                fields={DIFFICULTIES}
                settings={settings}
                onSave={saveSetting}
                saving={saving}
                saved={saved}
                step={0.1}
              />
              <div>
                <h3 className="text-xs font-headline font-bold text-geo-on-surface-dim uppercase tracking-widest mb-2">XP Star Bonus (by star count: 0, 1, 2, 3)</h3>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((i) => {
                    const arr = getVal<number[]>('xp_star_bonus', [0, 10, 20, 40])
                    return (
                      <div key={i} className="text-center">
                        <label className="text-[10px] text-geo-on-surface-dim">{i}★</label>
                        <input
                          type="number"
                          min={0}
                          value={arr[i] ?? 0}
                          onChange={(e) => {
                            const newArr = [...arr]
                            newArr[i] = parseInt(e.target.value) || 0
                            saveSetting('xp_star_bonus', newArr)
                          }}
                          className="w-14 px-1.5 py-1 rounded text-center text-xs bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberSetting label="Daily Login XP" settingKey="daily_login_xp" settings={settings} onSave={saveSetting} saving={saving} saved={saved} />
                <NumberSetting label="7-Day Streak XP Bonus" settingKey="daily_login_streak_xp_bonus_7" settings={settings} onSave={saveSetting} saving={saving} saved={saved} />
              </div>
            </div>
          )}

          {/* Stars Tab */}
          {tab === 'stars' && (
            <div>
              <p className="text-geo-on-surface-dim text-xs font-body mb-3">
                Star thresholds are defined in code (<code>src/lib/stars.ts</code>). Admin-configurable star thresholds will be available in a future update.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-body">
                  <thead>
                    <tr className="text-geo-on-surface-dim">
                      <th className="text-left pb-1">Mode</th>
                      <th className="pb-1 text-center">0★</th>
                      <th className="pb-1 text-center">1★</th>
                      <th className="pb-1 text-center">2★</th>
                      <th className="pb-1 text-center">3★</th>
                    </tr>
                  </thead>
                  <tbody className="text-geo-on-surface">
                    {[
                      ['Classic', '0-3', '4-6', '7-8', '9-10'],
                      ['Timed', '0-4', '5-9', '10-14', '15+'],
                      ['Marathon', '<50%', '50-74%', '75-94%', '95%+'],
                      ['Survival', '0-9', '10-24', '25-49', '50+'],
                      ['Practice', '—', '—', '—', '—'],
                      ['Borderless', '0-4', '5-14', '15-29', '30+'],
                      ['Flag', '0-4', '5-14', '15-29', '30+ (no hints)'],
                      ['Distance', '<30', '30-54', '55-79', '80+'],
                      ['US States', '<50%', '50-74%', '75-89%', '90%+'],
                    ].map(([mode, ...stars]) => (
                      <tr key={mode} className="border-t border-geo-outline-dim/10">
                        <td className="py-1 font-bold">{mode}</td>
                        {stars.map((s, i) => (
                          <td key={i} className="py-1 text-center text-geo-on-surface-dim">{s}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily Login Tab */}
          {tab === 'daily' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-headline font-bold text-geo-on-surface-dim uppercase tracking-widest mb-2">
                  7-Day Reward Cycle (coins per day)
                </h3>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                    const arr = getVal<number[]>('daily_login_rewards', [5, 5, 10, 10, 15, 15, 25])
                    return (
                      <div key={i} className="text-center">
                        <label className="text-[10px] text-geo-on-surface-dim">Day {i + 1}</label>
                        <input
                          type="number"
                          min={0}
                          value={arr[i] ?? 0}
                          onChange={(e) => {
                            const newArr = [...arr]
                            newArr[i] = parseInt(e.target.value) || 0
                            saveSetting('daily_login_rewards', newArr)
                          }}
                          className="w-14 px-1.5 py-1 rounded text-center text-xs bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-headline font-bold text-geo-on-surface-dim uppercase tracking-widest mb-2">
                  Streak Milestone Bonuses (coins)
                </h3>
                <div className="flex gap-3">
                  {[['7', '7 Days'], ['14', '14 Days'], ['30', '30 Days']].map(([key, label]) => {
                    const bonuses = getVal<Record<string, number>>('daily_login_streak_bonuses', { '7': 20, '14': 50, '30': 100 })
                    return (
                      <div key={key}>
                        <label className="text-[10px] text-geo-on-surface-dim">{label}</label>
                        <input
                          type="number"
                          min={0}
                          value={bonuses[key] ?? 0}
                          onChange={(e) => {
                            saveSetting('daily_login_streak_bonuses', { ...bonuses, [key]: parseInt(e.target.value) || 0 })
                          }}
                          className="w-16 px-1.5 py-1 rounded text-xs bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberSetting label="Daily Login XP" settingKey="daily_login_xp" settings={settings} onSave={saveSetting} saving={saving} saved={saved} />
                <NumberSetting label="7-Day Streak XP Bonus" settingKey="daily_login_streak_xp_bonus_7" settings={settings} onSave={saveSetting} saving={saving} saved={saved} />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function NumberSetting({ label, settingKey, settings, onSave, saving, saved, step }: {
  label: string
  settingKey: string
  settings: Record<string, unknown>
  onSave: (key: string, value: unknown) => void
  saving: string | null
  saved: string | null
  step?: number
}) {
  const val = (settings[settingKey] as number) ?? 0
  return (
    <div>
      <label className="text-[10px] text-geo-on-surface-dim font-headline uppercase tracking-widest">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          step={step ?? 1}
          value={val}
          onChange={(e) => onSave(settingKey, parseFloat(e.target.value) || 0)}
          className="w-20 px-1.5 py-1 rounded text-xs bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
        />
        {saving === settingKey && <span className="text-[10px] text-geo-on-surface-dim">Saving...</span>}
        {saved === settingKey && <span className="text-[10px] text-green-400">Saved</span>}
      </div>
    </div>
  )
}

function SettingGrid({ label, settingKey, fields, settings, onSave, saving, saved, step }: {
  label: string
  settingKey: string
  fields: string[]
  settings: Record<string, unknown>
  onSave: (key: string, value: unknown) => void
  saving: string | null
  saved: string | null
  step?: number
}) {
  const obj = (settings[settingKey] as Record<string, number>) ?? {}
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-headline font-bold text-geo-on-surface-dim uppercase tracking-widest">{label}</h3>
        {saving === settingKey && <span className="text-[10px] text-geo-on-surface-dim">Saving...</span>}
        {saved === settingKey && <span className="text-[10px] text-green-400">Saved</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {fields.map((field) => (
          <div key={field} className="text-center">
            <label className="text-[10px] text-geo-on-surface-dim capitalize">{field}</label>
            <input
              type="number"
              min={0}
              step={step ?? 1}
              value={obj[field] ?? 0}
              onChange={(e) => {
                const updated = { ...obj, [field]: parseFloat(e.target.value) || 0 }
                onSave(settingKey, updated)
              }}
              className="w-14 px-1.5 py-1 rounded text-center text-xs bg-geo-surface border border-geo-outline-dim/30 text-geo-on-surface"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
