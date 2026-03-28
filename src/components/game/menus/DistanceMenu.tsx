'use client'

import { useEffect, useState } from 'react'
import type { DistanceDifficulty } from '@/lib/distanceScoring'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import { playClick, playHover } from '@/lib/sounds'

const UNIT_STORAGE_KEY = 'woc-distance-unit'

type DistanceUnit = 'km' | 'mi'

const DIFFICULTY_ICONS: Record<string, string> = { easy: '🟢', medium: '🟡', hard: '🟠', expert: '🔴' }

interface DistanceMenuProps {
  onStartGame: (difficulty: DistanceDifficulty, region: string, unit: DistanceUnit) => void
}

function getStoredUnit(): DistanceUnit {
  if (typeof window === 'undefined') return 'km'
  return (localStorage.getItem(UNIT_STORAGE_KEY) as DistanceUnit) ?? 'km'
}

function saveUnit(unit: DistanceUnit) {
  localStorage.setItem(UNIT_STORAGE_KEY, unit)
}

export default function DistanceMenu({ onStartGame }: DistanceMenuProps) {
  const { t } = useTranslation()
  const [difficulty, setDifficulty] = useState<DistanceDifficulty>('easy')
  const [selectedRegion, setSelectedRegion] = useState('World')
  const [unit, setUnit] = useState<DistanceUnit>('km')

  useEffect(() => {
    setUnit(getStoredUnit())
  }, [])

  function handleUnitToggle() {
    const next = unit === 'km' ? 'mi' : 'km'
    setUnit(next)
    saveUnit(next)
    playClick()
  }

  return (
    <>
      {/* Region */}
      <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2 text-center">{t('selectRegion')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 sm:mb-4">
        {['World', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].map((r) => (
          <button
            key={r}
            onMouseEnter={() => playHover()}
            onClick={() => { playClick(); setSelectedRegion(r) }}
            className={`glass-panel p-2 sm:p-3 flex items-center justify-center text-center transition-all cursor-pointer ${
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 sm:mb-4">
        {(['easy', 'medium', 'hard', 'expert'] as DistanceDifficulty[]).map((d) => (
            <button
              key={d}
              onMouseEnter={() => playHover()}
              onClick={() => { playClick(); setDifficulty(d) }}
              className={`glass-panel p-2 sm:p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
                difficulty === d
                  ? 'border-geo-primary/50 bg-geo-primary/10 shadow-[0_0_15px_-5px_rgba(107,255,193,0.2)]'
                  : 'hover:border-geo-primary/40 hover:shadow-[0_0_20px_-5px_rgba(107,255,193,0.15)]'
              }`}
            >
              <div className="text-xl mb-1">{DIFFICULTY_ICONS[d]}</div>
              <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
                difficulty === d ? 'text-geo-primary' : 'text-geo-on-surface-dim'
              }`}>{t(`diff.${d}` as keyof Translations)}</p>
            </button>
        ))}
      </div>

      {/* Unit */}
      <p className="text-geo-on-surface-dim text-xs font-headline font-bold uppercase tracking-widest mb-2 text-center">{t('selectUnit' as keyof Translations) || 'Unit'}</p>
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={handleUnitToggle}
          className={`glass-panel p-2 sm:p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
            unit === 'km'
              ? 'border-geo-secondary/50 bg-geo-secondary/10 shadow-[0_0_15px_-5px_rgba(100,168,254,0.2)]'
              : 'hover:border-geo-secondary/40 hover:shadow-[0_0_20px_-5px_rgba(100,168,254,0.15)]'
          }`}
        >
          <div className="text-xl mb-1">🌐</div>
          <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
            unit === 'km' ? 'text-geo-secondary' : 'text-geo-on-surface-dim'
          }`}>{t('km')}</p>
        </button>
        <button
          onClick={handleUnitToggle}
          className={`glass-panel p-2 sm:p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
            unit === 'mi'
              ? 'border-geo-secondary/50 bg-geo-secondary/10 shadow-[0_0_15px_-5px_rgba(100,168,254,0.2)]'
              : 'hover:border-geo-secondary/40 hover:shadow-[0_0_20px_-5px_rgba(100,168,254,0.15)]'
          }`}
        >
          <div className="text-xl mb-1">🇺🇸</div>
          <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
            unit === 'mi' ? 'text-geo-secondary' : 'text-geo-on-surface-dim'
          }`}>{t('mi')}</p>
        </button>
      </div>

      <div className="sticky bottom-0 pt-4 pb-1 bg-gradient-to-t from-geo-surface via-geo-surface/95 to-transparent -mx-1 px-1">
        <button
          onClick={() => onStartGame(difficulty, selectedRegion, unit)}
          className="btn-primary w-full py-3 sm:py-4 text-base sm:text-lg"
        >
          {t('startGame')}
        </button>
      </div>
    </>
  )
}
