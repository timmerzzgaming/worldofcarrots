'use client'

import { cn } from '@/lib/cn'

interface CarrotMascotProps {
  size?: number
  className?: string
  expression?: 'happy' | 'excited' | 'thinking' | 'sad'
}

/**
 * Carrot mascot in a simple comic style (Worms-inspired).
 * Orange carrot body with green leafy top, big eyes, smile, small arms and feet.
 */
export default function CarrotMascot({ size = 120, className, expression = 'happy' }: CarrotMascotProps) {
  const eyeOffsetY = expression === 'sad' ? 2 : 0
  const mouthPath = expression === 'sad'
    ? 'M 44,78 Q 50,74 56,78'      // frown
    : expression === 'excited'
      ? 'M 42,75 Q 50,84 58,75 Z'  // open smile
      : expression === 'thinking'
        ? 'M 45,78 L 55,78'         // flat line
        : 'M 43,76 Q 50,82 57,76'   // gentle smile

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block', className)}
      aria-label="Carrot mascot"
      role="img"
    >
      {/* Shadow */}
      <ellipse cx="50" cy="96" rx="18" ry="4" fill="#000" opacity="0.15" />

      {/* Left leg */}
      <ellipse cx="43" cy="92" rx="5" ry="3.5" fill="#e8760a" stroke="#c45e00" strokeWidth="0.8" />
      {/* Right leg */}
      <ellipse cx="57" cy="92" rx="5" ry="3.5" fill="#e8760a" stroke="#c45e00" strokeWidth="0.8" />

      {/* Carrot body — tapered oval */}
      <path
        d="M 50,22 C 65,22 72,40 72,58 C 72,76 64,92 50,92 C 36,92 28,76 28,58 C 28,40 35,22 50,22 Z"
        fill="url(#carrotGradient)"
        stroke="#c45e00"
        strokeWidth="1.5"
      />

      {/* Body highlight (shiny left side) */}
      <path
        d="M 42,30 C 36,40 34,55 36,70 C 34,55 35,38 42,30 Z"
        fill="#ffb347"
        opacity="0.5"
      />

      {/* Horizontal texture lines */}
      <path d="M 36,45 Q 50,43 64,45" stroke="#d4710a" strokeWidth="0.7" opacity="0.4" fill="none" />
      <path d="M 33,55 Q 50,53 67,55" stroke="#d4710a" strokeWidth="0.7" opacity="0.4" fill="none" />
      <path d="M 34,65 Q 50,63 66,65" stroke="#d4710a" strokeWidth="0.7" opacity="0.35" fill="none" />
      <path d="M 37,75 Q 50,73 63,75" stroke="#d4710a" strokeWidth="0.6" opacity="0.3" fill="none" />

      {/* Left arm */}
      <g transform="translate(28, 52) rotate(-15)">
        <path d="M 0,0 C -8,4 -12,0 -10,-3" stroke="#e8760a" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Hand (small circle) */}
        <circle cx="-10" cy="-3" r="2.5" fill="#ffb347" stroke="#c45e00" strokeWidth="0.7" />
      </g>

      {/* Right arm */}
      <g transform="translate(72, 52) rotate(15)">
        <path d="M 0,0 C 8,4 12,0 10,-3" stroke="#e8760a" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="10" cy="-3" r="2.5" fill="#ffb347" stroke="#c45e00" strokeWidth="0.7" />
        {expression === 'excited' && (
          <>
            {/* Waving sparkles */}
            <circle cx="14" cy="-7" r="1" fill="#fed01b" />
            <circle cx="16" cy="-3" r="0.7" fill="#fed01b" />
          </>
        )}
      </g>

      {/* Green leafy top */}
      <g transform="translate(50, 22)">
        {/* Center leaf */}
        <path d="M 0,0 C -2,-14 2,-18 0,-22 C 2,-18 6,-14 0,0 Z" fill="#4ade80" stroke="#22c55e" strokeWidth="0.8" />
        {/* Left leaf */}
        <path d="M -2,-1 C -12,-12 -8,-18 -6,-20 C -6,-16 -8,-10 -2,-1 Z" fill="#4ade80" stroke="#22c55e" strokeWidth="0.8" />
        {/* Right leaf */}
        <path d="M 2,-1 C 12,-12 8,-18 6,-20 C 6,-16 8,-10 2,-1 Z" fill="#4ade80" stroke="#22c55e" strokeWidth="0.8" />
        {/* Tiny inner leaves */}
        <path d="M -1,0 C -6,-8 -3,-12 -2,-14 C -2,-11 -4,-7 -1,0 Z" fill="#86efac" opacity="0.6" />
        <path d="M 1,0 C 6,-8 3,-12 2,-14 C 2,-11 4,-7 1,0 Z" fill="#86efac" opacity="0.6" />
      </g>

      {/* Eyes */}
      {/* Left eye white */}
      <ellipse cx="42" cy={62 + eyeOffsetY} rx="6" ry="6.5" fill="white" stroke="#333" strokeWidth="1" />
      {/* Left pupil */}
      <circle cx="43" cy={63 + eyeOffsetY} r="3" fill="#333" />
      {/* Left eye shine */}
      <circle cx="44.5" cy={61 + eyeOffsetY} r="1.2" fill="white" />

      {/* Right eye white */}
      <ellipse cx="58" cy={62 + eyeOffsetY} rx="6" ry="6.5" fill="white" stroke="#333" strokeWidth="1" />
      {/* Right pupil */}
      <circle cx="59" cy={63 + eyeOffsetY} r="3" fill="#333" />
      {/* Right eye shine */}
      <circle cx="60.5" cy={61 + eyeOffsetY} r="1.2" fill="white" />

      {expression === 'excited' && (
        <>
          {/* Eyebrows raised */}
          <path d="M 37,55 Q 42,52 47,55" stroke="#333" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M 53,55 Q 58,52 63,55" stroke="#333" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Mouth */}
      <path
        d={mouthPath}
        stroke="#333"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill={expression === 'excited' ? '#ff6b6b' : 'none'}
      />

      {/* Rosy cheeks */}
      <circle cx="35" cy="72" r="4" fill="#ff9999" opacity="0.3" />
      <circle cx="65" cy="72" r="4" fill="#ff9999" opacity="0.3" />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="carrotGradient" x1="50" y1="20" x2="50" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffb347" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#e8760a" />
        </linearGradient>
      </defs>
    </svg>
  )
}
