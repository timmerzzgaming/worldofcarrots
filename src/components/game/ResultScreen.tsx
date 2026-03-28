'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { AnswerResult, GameMode } from '@/types/game'
import type { Difficulty } from '@/lib/countryDifficulty'
import { calculateResults } from '@/lib/gameEngine'
import {
  type HighScoreEntry,
  getHighScores,
  addHighScore,
  isHighScore,
  getLastPlayerName,
  savePlayerName,
  syncHighScoreToDb,
} from '@/lib/highScores'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/lib/i18n'
import { playHighScore } from '@/lib/sounds'
import type { GameRewards } from '@/hooks/useGameRewards'
import StarRating from '@/components/credits/StarRating'
import CreditBreakdown from '@/components/credits/CreditBreakdown'
import XpProgressBar from '@/components/xp/XpProgressBar'
import { useAuth } from '@/lib/auth/context'
import RetentionBanner from '@/components/credits/RetentionBanner'

interface ResultScreenProps {
  mode: GameMode
  difficulty: Difficulty
  variant?: string
  answers: AnswerResult[]
  elapsed: number
  onPlayAgain: () => void
  onHome: () => void
  rewards?: GameRewards | null
}

export default function ResultScreen({ mode, difficulty, variant, answers, elapsed, onPlayAgain, onHome, rewards }: ResultScreenProps) {
  const { t, tc } = useTranslation()
  const { user } = useAuth()
  const { totalScore, correctCount, totalQuestions, accuracy } = calculateResults(answers)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const [scores, setScores] = useState<HighScoreEntry[]>([])
  const [newEntryIndex, setNewEntryIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const qualifies = isHighScore(mode, difficulty, totalScore, correctCount, variant)

  useEffect(() => {
    setScores(getHighScores(mode, difficulty, variant))
    // Auto-save for logged-in users
    if (user && qualifies) {
      const playerName = user.nickname
      setName(playerName)
      savePlayerName(playerName)
      const entry: HighScoreEntry = {
        name: playerName,
        score: totalScore,
        correctCount,
        totalQuestions,
        accuracy,
        elapsed,
        date: new Date().toISOString(),
      }
      const updated = addHighScore(mode, difficulty, entry, variant)
      setScores(updated)
      const idx = updated.findIndex(
        (e) => e.score === entry.score && e.name === entry.name && e.date === entry.date
      )
      setNewEntryIndex(idx)
      setSaved(true)
      playHighScore()
      // Sync to Supabase DB
      syncHighScoreToDb(user.id, mode, difficulty, entry, variant)
    } else {
      setName(getLastPlayerName())
      if (qualifies) {
        playHighScore()
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
  }, [mode, difficulty, variant, qualifies]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    if (!name.trim()) return
    savePlayerName(name.trim())
    const entry: HighScoreEntry = {
      name: name.trim(),
      score: totalScore,
      correctCount,
      totalQuestions,
      accuracy,
      elapsed,
      date: new Date().toISOString(),
    }
    const updated = addHighScore(mode, difficulty, entry, variant)
    setScores(updated)
    const idx = updated.findIndex(
      (e) => e.score === entry.score && e.name === entry.name && e.date === entry.date
    )
    setNewEntryIndex(idx)
    setSaved(true)
    // Sync to Supabase DB if logged in
    if (user) syncHighScoreToDb(user.id, mode, difficulty, entry, variant)
  }

  const title =
    mode === 'marathon' && accuracy === 1
      ? t('perfect')
      : mode === 'survival' && correctCount === totalQuestions
        ? t('youSurvived')
        : mode === 'flag' && correctCount === totalQuestions
          ? t('flagMaster')
          : t('gameOver')

  const statColors = ['text-geo-primary text-glow-primary', 'text-geo-secondary text-glow-secondary', 'text-geo-tertiary text-glow-tertiary', 'text-geo-error text-glow-error']

  function getStats() {
    if (mode === 'timed') return [
      { label: t('stat.found'), value: `${correctCount}` },
      { label: t('stat.accuracy'), value: `${Math.round(accuracy * 100)}%` },
      { label: t('stat.score'), value: totalScore.toLocaleString() },
      { label: t('stat.attempted'), value: `${totalQuestions}` },
    ]
    if (mode === 'marathon') return [
      { label: t('stat.completed'), value: `${correctCount}/${totalQuestions}` },
      { label: t('stat.accuracy'), value: `${Math.round(accuracy * 100)}%` },
      { label: t('stat.time'), value: formatTime(elapsed) },
      { label: t('stat.score'), value: totalScore.toLocaleString() },
    ]
    if (mode === 'survival') return [
      { label: t('stat.survived'), value: `${correctCount}` },
      { label: t('stat.accuracy'), value: `${Math.round(accuracy * 100)}%` },
      { label: t('stat.score'), value: totalScore.toLocaleString() },
      { label: t('stat.time'), value: formatTime(elapsed) },
    ]
    if (mode === 'flag') return [
      { label: t('stat.identified'), value: `${correctCount}` },
      { label: t('stat.accuracy'), value: `${Math.round(accuracy * 100)}%` },
      { label: t('stat.score'), value: totalScore.toLocaleString() },
      { label: t('stat.time'), value: formatTime(elapsed) },
    ]
    return [
      { label: t('stat.score'), value: totalScore.toLocaleString() },
      { label: t('stat.accuracy'), value: `${Math.round(accuracy * 100)}%` },
      { label: t('stat.correct'), value: `${correctCount}/${totalQuestions}` },
      { label: t('stat.time'), value: formatTime(elapsed) },
    ]
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-geo-bg/80 backdrop-blur-sm p-4"
    >
      <div className="glass-panel p-4 sm:p-6 lg:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Stars (only for challenge modes) */}
        {rewards && rewards.stars > 0 && <div className="mb-4"><StarRating stars={rewards.stars} /></div>}

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-extrabold text-geo-on-surface italic uppercase tracking-tighter drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] text-center mb-4 sm:mb-6">
          {title}
        </h2>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-5">
          {getStats().map((stat, i) => (
            <div key={stat.label} className="bg-geo-surface-high/50 rounded-xl sm:rounded-2xl p-2 sm:p-3 text-center border border-geo-outline-dim/20">
              <p className="text-geo-on-surface-dim text-[9px] sm:text-[10px] lg:text-xs font-headline font-bold uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className={`text-xl sm:text-2xl font-headline font-extrabold ${statColors[i]} drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)]`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* XP Progress */}
        {rewards && rewards.xp.total > 0 && user && (
          <div className="mb-4">
            <XpProgressBar
              totalXp={user.xp}
              level={user.level}
              xpEarned={rewards.xp.total}
              leveledUp={rewards.leveledUp}
              newLevel={rewards.newLevel}
            />
          </div>
        )}

        {/* Credits Earned */}
        {rewards && rewards.breakdown.total > 0 && (
          <div className="mb-5">
            <CreditBreakdown breakdown={rewards.breakdown} />
          </div>
        )}

        {/* Bonus rewards (chest + carrots) */}
        {rewards && (rewards.chestEarned || rewards.carrotsEarned > 0 || rewards.newAchievements.length > 0) && (
          <div className="mb-5 flex flex-wrap gap-2 justify-center">
            {rewards.chestEarned && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-geo-tertiary/10 border border-geo-tertiary/30 text-sm font-headline font-bold text-geo-tertiary-bright">
                {rewards.chestEarned === 'gold' ? '🥇' : rewards.chestEarned === 'silver' ? '🥈' : '🥉'}
                Chest Earned!
              </span>
            )}
            {rewards.carrotsEarned > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-400/10 border border-orange-400/30 text-sm font-headline font-bold text-orange-400">
                🥕 +{rewards.carrotsEarned}
              </span>
            )}
            {rewards.newAchievements.map((ach) => (
              <span key={ach.key} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-geo-primary/10 border border-geo-primary/30 text-sm font-headline font-bold text-geo-primary">
                {ach.icon} +{ach.carrotReward}🥕
              </span>
            ))}
          </div>
        )}

        {/* Name entry */}
        {qualifies && !saved && (
          <div className="mb-5 p-4 rounded-2xl bg-geo-tertiary-bright/10 border-2 border-geo-tertiary/40">
            <p className="text-geo-tertiary-bright text-sm font-headline font-extrabold uppercase tracking-wide mb-2">{t('newHighScore')}</p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder={t('enterName')}
                maxLength={20}
                className="flex-1 px-4 py-2 rounded-full bg-geo-bg border-2 border-geo-outline-dim text-geo-on-surface text-sm font-body placeholder-geo-outline focus:outline-none focus:border-geo-primary focus:ring-4 focus:ring-geo-primary/20"
              />
              <button
                onClick={handleSave}
                className="btn-primary px-5 py-2 text-sm"
              >
                {t('save')}
              </button>
            </div>
          </div>
        )}

        {/* High scores */}
        {scores.length > 0 && (
          <div className="mb-5">
            <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest mb-2">{t('highScores')}</p>
            <div className="space-y-1.5">
              {scores.map((entry, i) => (
                <div
                  key={`${entry.date}-${i}`}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
                    i === newEntryIndex
                      ? 'bg-geo-primary/10 border border-geo-primary/30'
                      : 'bg-geo-surface-high/30'
                  )}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-headline font-extrabold ${
                    i === 0 ? 'bg-geo-tertiary-bright/20 text-geo-tertiary-bright border border-geo-tertiary-bright/40' : 'bg-geo-surface-highest text-geo-on-surface-dim border border-geo-outline-dim/30'
                  }`}>{i + 1}</span>
                  <span className="flex-1 truncate text-geo-on-surface font-body font-medium">{entry.name}</span>
                  <span className={`font-headline font-extrabold text-xs ${i === 0 ? 'text-geo-primary' : 'text-geo-on-surface-dim'}`}>
                    {mode === 'timed' ? `${entry.correctCount} ${t('found.suffix')}` : entry.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answer breakdown */}
        {answers.length > 0 && (
          <details className="mb-5" open={scores.length === 0}>
            <summary className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest cursor-pointer hover:text-geo-on-surface mb-2">
              {t('answerDetails')}
            </summary>
            <div className="max-h-40 sm:max-h-48 overflow-y-auto space-y-1">
              {answers.map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between px-3 py-1.5 rounded-xl text-sm',
                    a.correct ? 'bg-geo-primary/10 text-geo-primary-dim' : 'bg-geo-error/10 text-geo-error'
                  )}
                >
                  <span className="font-body">{tc(a.question.country.name)}</span>
                  <span className="font-headline font-bold">{a.correct ? `+${a.score}` : '0'}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 sm:gap-3">
          <button onClick={onHome} className="btn-ghost flex-1 py-2.5 sm:py-3 text-xs sm:text-sm">
            {t('backToMenu')}
          </button>
          <button onClick={onPlayAgain} className="btn-primary flex-1 py-2.5 sm:py-3 text-xs sm:text-sm">
            {t('playAgain')}
          </button>
        </div>

        {/* Retention hook */}
        <RetentionBanner />
      </div>
    </motion.div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}
