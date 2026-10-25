import { motion, useReducedMotion } from 'motion/react'
import { Sparkle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { MOCHI } from '@/lib/colors'
import { ease } from '@/lib/motion'
import type { MochiColor } from '@/lib/types'
import { seeded } from './hooks'

const SPARKS = (() => {
  const r = seeded(11)
  return Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + r() * 0.4
    const d = 95 + r() * 60
    return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, rot: (r() - 0.5) * 180, size: 12 + r() * 10 }
  })
})()

/**
 * A quick ripple + sparkle pop around the 3D mochi whenever its look
 * changes. Replays by remounting on every `pulse`.
 */
export function StageFx({ pulse, color }: { pulse: number; color: MochiColor }) {
  const reduce = useReducedMotion()
  if (!pulse || reduce) return null
  const p = MOCHI[color]
  return (
    <div key={pulse} aria-hidden className="pointer-events-none absolute inset-0">
      <motion.span
        className="absolute top-1/2 left-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]"
        style={{ borderColor: p.shade }}
        initial={{ scale: 0.45, opacity: 0.9 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.85, ease: ease.out }}
      />
      {SPARKS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2"
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{ x: s.x, y: s.y, scale: [0, 1.15, 0.5], opacity: [1, 1, 0], rotate: s.rot }}
          transition={{ duration: 0.9, ease: ease.out, delay: i * 0.012 }}
        >
          <Sparkle size={s.size} strokeWidth={0} fill={i % 2 ? p.shade : MOCHI.butter.shade} />
        </motion.span>
      ))}
    </div>
  )
}

const CONFETTI_COLORS = [MOCHI.peach.shade, MOCHI.butter.shade, MOCHI.mint.shade, MOCHI.lavender.shade, MOCHI.sky.shade, MOCHI.pink.shade]

const PIECES = (() => {
  const r = seeded(7)
  return Array.from({ length: 46 }, (_, i) => {
    const a = r() * Math.PI * 2
    const d = 150 + r() * 330
    return {
      x: Math.cos(a) * d,
      y: Math.sin(a) * d * 0.65 - 90,
      rot: (r() - 0.5) * 760,
      size: 7 + r() * 8,
      shape: i % 4,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: r() * 0.15,
      duration: 1.5 + r() * 0.9,
    }
  })
})()

/** Celebration burst from the middle of the screen (portal, so transforms on the step don't trap it). */
export function Confetti() {
  const reduce = useReducedMotion()
  if (reduce) return null
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      <div className="absolute top-[36%] left-1/2">
        <motion.span
          className="absolute size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-butter"
          initial={{ scale: 0.2, opacity: 1 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.9, ease: ease.out }}
        />
        {PIECES.map((c, i) => (
          <motion.span
            key={i}
            className="absolute block"
            style={
              c.shape === 3
                ? undefined
                : {
                    width: c.size,
                    height: c.shape === 1 ? c.size * 0.45 : c.size,
                    background: c.color,
                    borderRadius: c.shape === 0 ? 999 : 3,
                  }
            }
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.3, rotate: 0 }}
            animate={{ x: [0, c.x * 0.85, c.x], y: [0, c.y, c.y + 300], opacity: [0, 1, 1, 0], scale: [0.3, 1, 1, 0.7], rotate: c.rot }}
            transition={{ duration: c.duration, delay: c.delay, ease: [0.18, 0.7, 0.4, 1] }}
          >
            {c.shape === 3 && <Sparkle size={c.size + 8} strokeWidth={0} fill={c.color} />}
          </motion.span>
        ))}
      </div>
    </div>,
    document.body,
  )
}
