'use client'

import { motion } from 'framer-motion'
import type { StarCount } from '@/lib/stars'

interface StarRatingProps {
  stars: StarCount
  size?: 'sm' | 'lg'
}

function Star({ filled, index }: { filled: boolean; index: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0, rotate: -30 }}
      animate={filled ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0.3, scale: 1, rotate: 0 }}
      transition={{
        delay: filled ? 0.4 + index * 0.25 : 0.2,
        duration: 0.4,
        type: 'spring',
        stiffness: 300,
        damping: 15,
      }}
      className="inline-block"
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.5}
        className={filled ? 'text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]' : 'text-gray-600'}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </motion.span>
  )
}

export default function StarRating({ stars, size = 'lg' }: StarRatingProps) {
  const sizeClass = size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'

  return (
    <div className="flex items-center justify-center gap-1" role="img" aria-label={`${stars} out of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={sizeClass}>
          <Star filled={i < stars} index={i} />
        </span>
      ))}
    </div>
  )
}
