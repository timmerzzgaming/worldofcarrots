'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { useTranslation, LOCALE_LABELS, LOCALE_FLAGS } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import {
  isSoundEnabled, setSoundEnabled, syncMusic,
  getMusicVolume, setMusicVolume,
  getSfxVolume, setSfxVolume,
  playClick,
} from '@/lib/sounds'

const LOCALES: Locale[] = ['en', 'fr', 'de', 'nl', 'es', 'zh']

export default function SettingsPanel() {
  const { locale, setLocale } = useTranslation()
  const [open, setOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [musicVol, setMusicVol] = useState(0.5)
  const [sfxVol, setSfxVol] = useState(0.5)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSoundOn(isSoundEnabled())
    setMusicVol(getMusicVolume())
    setSfxVol(getSfxVolume())
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleSoundToggle() {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    syncMusic()
  }

  function handleMusicChange(val: number) {
    setMusicVol(val)
    setMusicVolume(val)
  }

  function handleSfxChange(val: number) {
    setSfxVol(val)
    setSfxVolume(val)
  }

  function handleLocale(loc: Locale) {
    setLocale(loc)
    playClick()
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => { setOpen(!open); playClick() }}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-[3px] border-geo-on-surface shadow-comic-sm flex items-center justify-center text-geo-on-surface-dim hover:text-geo-on-surface transition-colors"
        aria-label="Settings"
        aria-expanded={open}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
          <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-14 right-0 z-50 bg-white border-[3px] border-geo-on-surface rounded-xl shadow-comic p-4 w-[240px] sm:w-[280px] space-y-4"
          >
            {/* Sound master toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-headline font-bold text-geo-on-surface uppercase tracking-wider">Sound</span>
              <button
                onClick={handleSoundToggle}
                className={`relative w-11 h-6 rounded-full border-2 border-geo-on-surface transition-colors ${
                  soundOn ? 'bg-geo-primary' : 'bg-geo-surface-high'
                }`}
                role="switch"
                aria-checked={soundOn}
                aria-label="Toggle sound"
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white border-2 border-geo-on-surface transition-transform ${
                    soundOn ? 'translate-x-[20px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Music volume */}
            <div className={soundOn ? '' : 'opacity-40 pointer-events-none'}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-headline font-bold text-geo-on-surface-dim uppercase tracking-wider flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path d="M15.75 3A2.25 2.25 0 0018 5.25v9.5A2.25 2.25 0 0015.75 17H4.25A2.25 2.25 0 002 14.75v-9.5A2.25 2.25 0 004.25 3h11.5zM7 6.25a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0v-7.5zm3.75 1a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0v-5.5zm3 1.5a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
                  </svg>
                  Music
                </span>
                <span className="text-[10px] font-headline font-bold text-geo-on-surface-dim tabular-nums">{Math.round(musicVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVol}
                onChange={(e) => handleMusicChange(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-geo-surface-high accent-geo-primary cursor-pointer"
                aria-label="Music volume"
              />
            </div>

            {/* SFX volume */}
            <div className={soundOn ? '' : 'opacity-40 pointer-events-none'}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-headline font-bold text-geo-on-surface-dim uppercase tracking-wider flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path d="M10 3.75a.75.75 0 00-1.264-.546L4.703 7H3.167a.75.75 0 00-.7.48A6.985 6.985 0 002 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0010 16.25V3.75zM15.95 5.05a.75.75 0 00-1.06 1.061 5.5 5.5 0 010 7.778.75.75 0 001.06 1.06 7 7 0 000-9.899z" />
                    <path d="M13.829 7.172a.75.75 0 00-1.061 1.06 2.5 2.5 0 010 3.536.75.75 0 001.06 1.06 4 4 0 000-5.656z" />
                  </svg>
                  Effects
                </span>
                <span className="text-[10px] font-headline font-bold text-geo-on-surface-dim tabular-nums">{Math.round(sfxVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVol}
                onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-geo-surface-high accent-geo-primary cursor-pointer"
                aria-label="Effects volume"
              />
            </div>

            {/* Divider */}
            <div className="border-t-2 border-geo-on-surface/10" />

            {/* Language */}
            <div>
              <span className="text-xs font-headline font-bold text-geo-on-surface uppercase tracking-wider block mb-2">Language</span>
              <div className="grid grid-cols-3 gap-1.5">
                {LOCALES.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => handleLocale(loc)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-body transition-colors ${
                      loc === locale
                        ? 'bg-geo-primary/15 text-geo-on-surface font-bold border-2 border-geo-primary/40'
                        : 'text-geo-on-surface-dim hover:bg-geo-surface-high/50 border-2 border-transparent'
                    }`}
                    aria-label={LOCALE_LABELS[loc]}
                  >
                    <Image
                      src={`/flags/4x3/${LOCALE_FLAGS[loc]}.svg`}
                      alt=""
                      width={16}
                      height={12}
                      className="rounded-sm shrink-0"
                    />
                    <span className="truncate">{LOCALE_LABELS[loc].slice(0, 3)}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
