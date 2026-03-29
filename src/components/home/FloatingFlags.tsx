'use client'

import { motion } from 'framer-motion'
import { useMemo, useState, useEffect } from 'react'
import Image from 'next/image'

// Floating carrots and small rabbits scattered around the viewport
const ITEMS = [
  { type: 'carrot', x: 8, y: 12, rotate: -20 },
  { type: 'carrot', x: 85, y: 70, rotate: 15 },
  { type: 'rabbit', x: 18, y: 78, rotate: 0 },
  { type: 'carrot', x: 78, y: 18, rotate: -35 },
  { type: 'carrot', x: 42, y: 85, rotate: 25 },
  { type: 'rabbit', x: 90, y: 45, rotate: 0 },
  { type: 'carrot', x: 6, y: 45, rotate: -10 },
  { type: 'carrot', x: 55, y: 10, rotate: 30 },
  { type: 'carrot', x: 70, y: 80, rotate: -25 },
  { type: 'rabbit', x: 30, y: 15, rotate: 0 },
  { type: 'carrot', x: 92, y: 88, rotate: 40 },
  { type: 'carrot', x: 15, y: 35, rotate: -15 },
]

export default function FloatingFlags() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 640)
  }, [])

  const itemData = useMemo(
    () =>
      ITEMS.map((item, i) => ({
        ...item,
        delay: i * 0.7,
        duration: 4 + (i % 3) * 1.5,
        yDrift: 8 + (i % 4) * 4,
        size: isMobile ? (item.type === 'rabbit' ? 48 : 32) : (item.type === 'rabbit' ? 72 : 48),
      })),
    [isMobile]
  )

  return (
    <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
      {itemData.map((item, i) => (
        <motion.div
          key={i}
          className="absolute opacity-0"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            rotate: item.rotate,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: [0, 0.6, 0.6, 0],
            y: [item.yDrift, -item.yDrift, item.yDrift],
          }}
          transition={{
            opacity: { duration: item.duration * 2, repeat: Infinity, delay: item.delay },
            y: { duration: item.duration, repeat: Infinity, ease: 'easeInOut', delay: item.delay },
          }}
        >
          <Image
            src={item.type === 'carrot' ? '/images/carrot.svg' : '/images/rabbit-small.svg'}
            alt=""
            width={item.size}
            height={item.size}
            className="drop-shadow-md"
          />
        </motion.div>
      ))}
    </div>
  )
}
