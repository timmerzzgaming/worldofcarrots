'use client'

import { useState } from 'react'
import { DIFFICULTIES, type Difficulty } from '@/lib/countryDifficulty'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import { playClick, playHover } from '@/lib/sounds'

const DIFFICULTY_ICONS: Record<string, string> = { easy: '\uD83D\uDFE2', medium: '\uD83D\uDFE1', hard: '\uD83D\uDFE0', expert: '\uD83D\uDD34' }

interface FlagMenuProps {
  onStartGame: (difficulty: Difficulty, region: string) => void
}

export default function FlagMenu({ onStartGame }: FlagMenuProps) {
  const { t } = useTranslation()
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy')
  const [selectedRegion, setSelectedRegion] = useState('World')

  return (
    <>
      {/* How it works */}
      <div className="glass-panel p-5 mb-5">
        <p className="text-geo-on-surface-dim text-[10px] font-headline font-bold uppercase tracking-widest mb-3">{t('howItWorks')}</p>
        <div className="space-y-2 text-sm font-body text-geo-on-surface-dim">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-geo-tertiary/20 text-geo-tertiary text-[10px] font-headline font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <span>{t('flag.hintsExplain')}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-geo-error/20 text-geo-error text-[10px] font-headline font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <span>{t('flag.livesExplain')}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-geo-secondary/20 text-geo-secondary text-[10px] font-headline font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">?</span>
            <span>{t('flag.hintOrder')}</span>
          </div>
        </div>
      </div>

      {/* Region */}
      <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2 text-center">{t('selectRegion')}</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {['World', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].map((r) => (
          <button
            key={r}
            onMouseEnter={() => playHover()}
            onClick={() => { playClick(); setSelectedRegion(r) }}
            className={`glass-panel p-3 flex items-center justify-center text-center transition-all cursor-pointer ${
              selectedRegion === r
                ? 'border-geo-secondary/50 bg-geo-secondary/10 shadow-[0_0_15px_-5px_rgba(100,168,254,0.2)]'
                : 'hover:border-geo-secondary/40 hover:shadow-[0_0_20px_-5px_rgba(100,168,254,0.15)]'
            }`}
          >
            <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
              selectedRegion === r ? 'text-geo-secondary' : 'text-geo-on-surface-dim'
            }`}>{t(`region.${r}` as keyof Translations)}</p>
          </button>
        ))}
      </div>

      {/* Difficulty */}
      <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2 text-center">{t('selectDifficulty')}</p>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onMouseEnter={() => playHover()}
              onClick={() => { playClick(); setSelectedDifficulty(d.value) }}
              className={`glass-panel p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
                selectedDifficulty === d.value
                  ? 'border-geo-primary/50 bg-geo-primary/10 shadow-[0_0_15px_-5px_rgba(107,255,193,0.2)]'
                  : 'hover:border-geo-primary/40 hover:shadow-[0_0_20px_-5px_rgba(107,255,193,0.15)]'
              }`}
            >
              <div className="text-xl mb-1">{DIFFICULTY_ICONS[d.value]}</div>
              <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                selectedDifficulty === d.value ? 'text-geo-primary' : 'text-geo-on-surface-dim'
              }`}>{t(`diff.${d.value}` as keyof Translations)}</p>
            </button>
        ))}
      </div>

      <div className="sticky bottom-0 pt-4 pb-1 bg-gradient-to-t from-geo-surface via-geo-surface/95 to-transparent -mx-1 px-1">
        <button
          onClick={() => onStartGame(selectedDifficulty, selectedRegion)}
          className="btn-primary w-full py-4 text-lg"
        >
          {t('startGame')}
        </button>
      </div>
    </>
  )
}
