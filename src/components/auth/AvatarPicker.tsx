'use client'

import { AVATARS } from '@/lib/auth/types'

interface AvatarPickerProps {
  selected: string
  onSelect: (avatar: string) => void
}

export default function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {AVATARS.map((avatar) => (
        <button
          key={avatar}
          type="button"
          onClick={() => onSelect(avatar)}
          className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all border-2 ${
            selected === avatar
              ? 'bg-geo-primary/20 border-geo-primary scale-110'
              : 'bg-geo-surface/60 border-geo-outline-dim/20 hover:border-geo-primary/40 hover:scale-105'
          }`}
        >
          {avatar}
        </button>
      ))}
    </div>
  )
}
