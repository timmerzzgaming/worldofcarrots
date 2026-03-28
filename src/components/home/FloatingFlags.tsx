'use client'

import { motion } from 'framer-motion'
import { useMemo, useState, useEffect } from 'react'

// A selection of recognizable flags spread around the viewport
const FLAGS = [
  { code: 'us', x: 8, y: 12 },
  { code: 'br', x: 85, y: 70 },
  { code: 'gb', x: 18, y: 75 },
  { code: 'jp', x: 78, y: 18 },
  { code: 'fr', x: 42, y: 85 },
  { code: 'au', x: 90, y: 45 },
  { code: 'in', x: 6, y: 45 },
  { code: 'de', x: 55, y: 10 },
  { code: 'za', x: 70, y: 80 },
  { code: 'ca', x: 30, y: 15 },
  { code: 'kr', x: 92, y: 88 },
  { code: 'mx', x: 15, y: 35 },
]

export default function FloatingFlags() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 640)
  }, [])

  // Stable random offsets for natural staggering
  const flagData = useMemo(
    () =>
      FLAGS.map((f, i) => ({
        ...f,
        delay: i * 0.7,
        duration: 4 + (i % 3) * 1.5,
        yDrift: 8 + (i % 4) * 4,
        size: isMobile ? 64 : 104,
      })),
    [isMobile]
  )

  return (
    <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
      {flagData.map((flag) => (
        <motion.img
          key={flag.code}
          src={`https://flagcdn.com/w160/${flag.code}.png`}
          alt=""
          width={flag.size}
          height={Math.round(flag.size * 0.67)}
          className="absolute rounded-sm shadow-lg shadow-black/30 opacity-0"
          style={{ left: `${flag.x}%`, top: `${flag.y}%` }}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: [0, 0.95, 0.95, 0],
            y: [flag.yDrift, -flag.yDrift, flag.yDrift],
          }}
          transition={{
            opacity: { duration: flag.duration * 2, repeat: Infinity, delay: flag.delay },
            y: { duration: flag.duration, repeat: Infinity, ease: 'easeInOut', delay: flag.delay },
          }}
        />
      ))}
    </div>
  )
}
