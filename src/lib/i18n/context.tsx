'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { Locale, Translations } from './types'
import { en, loadTranslations } from './translations'
import { getCountryName } from './countries'

const STORAGE_KEY = 'woc-locale'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: keyof Translations) => string
  tc: (englishName: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && ['en', 'fr', 'de', 'nl', 'es', 'zh'].includes(stored)) return stored as Locale
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [translations, setTranslations] = useState<Translations>(en)
  const loadingRef = useRef<Locale | null>(null)

  useEffect(() => {
    const initial = getInitialLocale()
    setLocaleState(initial)
    if (initial !== 'en') {
      loadingRef.current = initial
      loadTranslations(initial).then((loaded) => {
        if (loadingRef.current === initial) {
          setTranslations(loaded)
        }
      })
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
    loadingRef.current = newLocale
    if (newLocale === 'en') {
      setTranslations(en)
    } else {
      loadTranslations(newLocale).then((loaded) => {
        if (loadingRef.current === newLocale) {
          setTranslations(loaded)
        }
      })
    }
  }, [])

  const t = useCallback((key: keyof Translations): string => {
    return translations[key] ?? en[key] ?? key
  }, [translations])

  const tc = useCallback((englishName: string): string => {
    if (locale === 'en') return englishName
    return getCountryName(englishName, locale) ?? englishName
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tc }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider')
  return ctx
}
