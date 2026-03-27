'use client'

import { useState, useEffect } from 'react'
import { isSoundEnabled, setSoundEnabled, syncMusic } from '@/lib/sounds'

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setEnabled(isSoundEnabled())
  }, [])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    setSoundEnabled(next)
    syncMusic()
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-14 h-14 rounded-full glass-panel text-geo-on-surface-dim hover:text-geo-on-surface transition-colors"
      aria-label={enabled ? 'Mute sound' : 'Unmute sound'}
    >
      {enabled ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </button>
  )
}
