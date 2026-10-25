import { motion, useReducedMotion } from 'motion/react'
import type { SignalLevel } from '@/lib/types'

/**
 * Two sound waves — yours and theirs — that line up as the signal level rises.
 * Level 5 = the waves overlap almost perfectly ("คลื่นเดียวกัน").
 */
export function WaveMatch({ level, className = '', height = 64 }: { level: SignalLevel; className?: string; height?: number }) {
  const reduce = useReducedMotion()
  const offset = (5 - level) * 9 // phase gap in px, shrinks as level rises
  const amp = 14
  const path = (phase: number) => {
    let d = `M 0 ${32 + Math.sin(phase) * amp}`
    for (let x = 4; x <= 400; x += 4) d += ` L ${x} ${32 + Math.sin(x / 32 + phase) * amp}`
    return d
  }
  return (
    <svg viewBox="0 0 200 64" preserveAspectRatio="none" className={`w-full overflow-hidden ${className}`} style={{ height }} aria-hidden>
      <defs>
        <linearGradient id="wave-a" x1="0" x2="1">
          <stop offset="0" stopColor="#B8A8FF" />
          <stop offset="1" stopColor="#9FD3FF" />
        </linearGradient>
        <linearGradient id="wave-b" x1="0" x2="1">
          <stop offset="0" stopColor="#FF9FBA" />
          <stop offset="1" stopColor="#FF7A6B" />
        </linearGradient>
      </defs>
      {[{ id: 'a', phase: 0, dx: 0 }, { id: 'b', phase: offset / 12, dx: offset }].map((w) => (
        <motion.path
          key={w.id}
          d={path(w.phase)}
          fill="none"
          stroke={`url(#wave-${w.id})`}
          strokeWidth={3.5}
          strokeLinecap="round"
          opacity={0.9}
          initial={{ x: 0 }}
          animate={reduce ? { x: 0 } : { x: [-w.dx, -200 - w.dx] }}
          transition={reduce ? undefined : { duration: 6, ease: 'linear', repeat: Infinity }}
        />
      ))}
    </svg>
  )
}
