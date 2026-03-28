'use client'

import { useState } from 'react'
import { GAME_MODES } from '@/lib/gameEngine'
import { DIFFICULTIES, COUNTRY_COUNTS, type Difficulty } from '@/lib/countryDifficulty'
import type { GameMode, GameModeConfig } from '@/types/game'
import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n'
import { playClick, playHover } from '@/lib/sounds'

const MODE_ICONS: Record<string, string> = { classic: '\uD83C\uDFAF', timed: '\u23F1\uFE0F', marathon: '\uD83C\uDFC3', survival: '\u2764\uFE0F', practice: '\uD83D\uDCDD', borderless: '\uD83C\uDF10' }
const DIFFICULTY_ICONS: Record<string, string> = { easy: '\uD83D\uDFE2', medium: '\uD83D\uDFE1', hard: '\uD83D\uDFE0', expert: '\uD83D\uDD34' }

interface ClickCountryMenuProps {
  onStartGame: (mode: GameMode, difficulty: Difficulty, region: string, variant?: string) => void
}

export default function ClickCountryMenu({ onStartGame }: ClickCountryMenuProps) {
  const { t } = useTranslation()
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic')
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy')
  const [selectedRegion, setSelectedRegion] = useState('World')
  const [borderlessTimed, setBorderlessTimed] = useState(true)

  return (
    <>
      {/* Game modes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
        {(Object.values(GAME_MODES) as GameModeConfig[]).filter((m) => m.mode !== 'flag' && m.mode !== 'distance').map((m) => (
            <button
              key={m.mode}
              onMouseEnter={() => playHover()}
              onClick={() => { playClick(); setSelectedMode(m.mode) }}
              className={`group glass-panel p-2 sm:p-4 flex flex-col items-center text-center transition-all cursor-pointer ${
                selectedMode === m.mode
                  ? 'border-geo-primary/50 bg-geo-primary/10 shadow-[0_0_20px_-5px_rgba(107,255,193,0.2)]'
                  : 'hover:border-geo-primary/40 hover:shadow-[0_0_30px_-10px_rgba(107,255,193,0.2)]'
              }`}
            >
              <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{MODE_ICONS[m.mode]}</div>
              <p className={`text-xs sm:text-sm font-headline font-extrabold uppercase tracking-wide ${
                selectedMode === m.mode ? 'text-geo-primary' : 'text-geo-on-surface group-hover:text-geo-primary transition-colors'
              }`}>{t(`mode.${m.mode}` as keyof Translations)}</p>
              <p className="text-xs mt-1 text-geo-on-surface-dim leading-relaxed">{t(`mode.${m.mode}.desc` as keyof Translations)}</p>
            </button>
        ))}
      </div>

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
        {DIFFICULTIES.map((d) => {
          const isMarathon = selectedMode === 'marathon'
          return (
            <button
              key={d.value}
              onMouseEnter={() => playHover()}
              onClick={() => { if (!isMarathon) { playClick(); setSelectedDifficulty(d.value) } }}
              disabled={isMarathon}
              className={`glass-panel p-2 sm:p-3 flex flex-col items-center text-center transition-all ${
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
              }`}>{d.label}</p>
            </button>
          )
        })}
      </div>

      {/* Country count for selected region + difficulty */}
      {(() => {
        const counts = COUNTRY_COUNTS[selectedRegion] ?? COUNTRY_COUNTS.World
        const poolSize = selectedMode === 'marathon' ? counts.expert : counts[selectedDifficulty]
        const modeConfig = GAME_MODES[selectedMode]
        const questionCount = modeConfig.totalQuestions ? Math.min(modeConfig.totalQuestions, poolSize) : poolSize
        return (
          <p className="text-geo-on-surface-dim text-xs text-center mb-5 font-body">
            <span className="text-geo-secondary font-headline font-bold">{questionCount}</span>
            <span className="italic">{' '}{t(`region.${selectedRegion}` as keyof Translations).toLowerCase()} {selectedMode === 'marathon' ? '' : `(${t(`diff.${selectedDifficulty}` as keyof Translations).toLowerCase()})`}</span>
          </p>
        )
      })()}

      {/* Borderless timer option */}
      {selectedMode === 'borderless' && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => { playClick(); setBorderlessTimed(true) }}
            className={`glass-panel p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
              borderlessTimed
                ? 'border-geo-secondary/50 bg-geo-secondary/10'
                : 'hover:border-geo-secondary/40'
            }`}
          >
            <div className="text-xl mb-1">{'\u23F1\uFE0F'}</div>
            <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
              borderlessTimed ? 'text-geo-secondary' : 'text-geo-on-surface-dim'
            }`}>{t('timer20s')}</p>
          </button>
          <button
            onClick={() => { playClick(); setBorderlessTimed(false) }}
            className={`glass-panel p-3 flex flex-col items-center text-center transition-all cursor-pointer ${
              !borderlessTimed
                ? 'border-geo-secondary/50 bg-geo-secondary/10'
                : 'hover:border-geo-secondary/40'
            }`}
          >
            <div className="text-xl mb-1">{'\u267E\uFE0F'}</div>
            <p className={`text-xs font-headline font-bold uppercase tracking-wide ${
              !borderlessTimed ? 'text-geo-secondary' : 'text-geo-on-surface-dim'
            }`}>{t('noTimer')}</p>
          </button>
        </div>
      )}

      <div className="sticky bottom-0 pt-4 pb-1 bg-gradient-to-t from-geo-surface via-geo-surface/95 to-transparent -mx-1 px-1">
        <button
          onClick={() => {
            onStartGame(
              selectedMode,
              selectedDifficulty,
              selectedRegion,
              selectedMode === 'borderless' && !borderlessTimed ? 'untimed' : undefined,
            )
          }}
          className="btn-primary w-full py-3 sm:py-4 text-base sm:text-lg"
        >
          {t('startGame')}
        </button>
      </div>
    </>
  )
}
