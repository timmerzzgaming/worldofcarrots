'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useTranslation, LOCALE_LABELS, LOCALE_FLAGS } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

const LOCALES: Locale[] = ['en', 'fr', 'de', 'nl', 'es', 'zh']

export default function LanguageSelector() {
  const { locale, setLocale } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-full bg-white border-[3px] border-geo-on-surface shadow-comic-sm text-xs sm:text-sm font-headline font-bold uppercase tracking-wider text-geo-on-surface-dim hover:text-geo-on-surface transition-colors"
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Image
          src={`/flags/4x3/${LOCALE_FLAGS[locale]}.svg`}
          alt=""
          width={28}
          height={21}
          className="rounded-sm"
        />
        <span>{LOCALE_LABELS[locale]}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Languages"
          className="absolute right-0 bottom-full mb-1 py-1 rounded-xl bg-white border-[3px] border-geo-on-surface shadow-comic z-50 min-w-[140px]"
        >
          {LOCALES.map((loc) => (
            <li key={loc} role="option" aria-selected={loc === locale}>
              <button
                onClick={() => { setLocale(loc); setOpen(false) }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm font-body transition-colors ${
                  loc === locale
                    ? 'text-geo-primary bg-geo-primary/10'
                    : 'text-geo-on-surface-dim hover:text-geo-on-surface hover:bg-geo-surface-high/50'
                }`}
              >
                <Image
                  src={`/flags/4x3/${LOCALE_FLAGS[loc]}.svg`}
                  alt=""
                  width={20}
                  height={15}
                  className="rounded-sm"
                />
                {LOCALE_LABELS[loc]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
