'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import { playClick, playHover } from '@/lib/sounds'

type USGameMode = 'classic' | 'timed' | 'marathon' | 'survival' | 'practice'
type USStateDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

const MODE_KEYS: USGameMode[] = ['classic', 'timed', 'marathon', 'survival', 'practice']
const MODE_ICONS: Record<string, string> = { classic: '🎯', timed: '⏱️', marathon: '🏃', survival: '❤️', practice: '📝' }
const DIFFICULTIES: { value: USStateDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
]
const DIFFICULTY_ICONS: Record<string, string> = { easy: '🟢', medium: '🟡', hard: '🟠', expert: '🔴' }

interface USStatesMenuProps {
  onStartGame: (mode: USGameMode, difficulty: USStateDifficulty) => void
}

export default function USStatesMenu({ onStartGame }: USStatesMenuProps) {
  const { t } = useTranslation()
  const [selectedMode, setSelectedMode] = useState<USGameMode>('classic')
  const [selectedDifficulty, setSelectedDifficulty] = useState<USStateDifficulty>('easy')

  return (
    <>
      {/* Game modes */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {MODE_KEYS.map((m) => (
            <button
              key={m}
              onMouseEnter={() => playHover()}
              onClick={() => { playClick(); setSelectedMode(m) }}
              className={`group glass-panel p-4 flex flex-col items-center text-center transition-all cursor-pointer ${
                selectedMode === m
                  ? 'border-geo-primary/50 bg-geo-primary/10 shadow-[0_0_20px_-5px_rgba(107,255,193,0.2)]'
                  : 'hover:border-geo-primary/40 hover:shadow-[0_0_30px_-10px_rgba(107,255,193,0.2)]'
              }`}
            >
              <div className="text-2xl mb-2">{MODE_ICONS[m]}</div>
              <p className={`text-sm font-headline font-extrabold uppercase tracking-wide ${
                selectedMode === m ? 'text-geo-primary' : 'text-geo-on-surface group-hover:text-geo-primary transition-colors'
              }`}>{t(`mode.${m}` as keyof Translations)}</p>
              <p className="text-xs mt-1 text-geo-on-surface-dim leading-relaxed">{t(`mode.${m}.desc` as keyof Translations)}</p>
            </button>
        ))}
        {/* Jigsaw -- coming soon placeholder */}
        <div className="glass-panel p-4 flex flex-col items-center text-center opacity-40 cursor-not-allowed">
          <div className="text-2xl mb-2">🧩</div>
          <p className="text-sm font-headline font-extrabold uppercase tracking-wide text-geo-on-surface-dim">{t('mode.jigsaw' as keyof Translations) || 'Jigsaw'}</p>
          <p className="text-xs mt-1 text-geo-outline leading-relaxed">{t('comingSoon')}</p>
        </div>
      </div>

      {/* Difficulty */}
      <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2 text-center">{t('selectDifficulty')}</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {DIFFICULTIES.map((d) => {
          const isMarathon = selectedMode === 'marathon'
          return (
            <button
              key={d.value}
              onMouseEnter={() => playHover()}
              onClick={() => { if (!isMarathon) { playClick(); setSelectedDifficulty(d.value) } }}
              disabled={isMarathon}
              className={`glass-panel p-3 flex flex-col items-center text-center transition-all ${
                isMarathon
                  ? 'opacity-30 cursor-not-allowed'
                  : selectedDifficulty === d.value
                    ? 'border-geo-primary/50 bg-geo-primary/10 shadow-[0_0_15px_-5px_rgba(107,255,193,0.2)] cursor-pointer'
                    : 'hover:border-geo-primary/40 hover:shadow-[0_0_20px_-5px_rgba(107,255,193,0.15)] cursor-pointer'
              }`}
            >
              <div className="text-xl mb-1">{DIFFICULTY_ICONS[d.value]}</div>
              <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                isMarathon ? 'text-geo-on-surface-dim' : selectedDifficulty === d.value ? 'text-geo-primary' : 'text-geo-on-surface-dim'
              }`}>{t(`diff.${d.value}` as keyof Translations)}</p>
            </button>
          )
        })}
      </div>

      {/* Speech bubble / description */}
      <p className="text-geo-on-surface-dim text-xs text-center mb-5 font-body italic">
        {t(`us.diff.${selectedDifficulty}.desc` as keyof Translations)}
      </p>

      <div className="sticky bottom-0 pt-4 pb-1 bg-gradient-to-t from-geo-surface via-geo-surface/95 to-transparent -mx-1 px-1">
        <button
          onClick={() => onStartGame(selectedMode, selectedDifficulty)}
          className="btn-primary w-full py-4 text-lg"
        >
          {t('startGame')}
        </button>
      </div>
    </>
  )
}
