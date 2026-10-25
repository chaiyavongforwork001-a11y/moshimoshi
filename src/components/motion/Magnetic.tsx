import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { softClamp, subscribePointer, useFinePointer } from './pointer'

const PULL = { stiffness: 220, damping: 16, mass: 0.6 }

/**
 * Pulls its child toward the mouse when it comes within `reach` px of the
 * box edge, then springs back. Fine pointers only; a plain wrapper on touch
 * and with reduced motion. Put layout classes (margins, width) on `className`.
 */
export function Magnetic({
  children,
  className = '',
  strength = 0.35,
  reach = 72,
  max = 12,
}: {
  children: ReactNode
  className?: string
  /** share of the pointer offset the child follows */
  strength?: number
  /** px beyond the box edge where the pull starts */
  reach?: number
  /** largest shift in px */
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const fine = useFinePointer()
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, PULL)
  const sy = useSpring(y, PULL)

  useEffect(() => {
    const el = ref.current
    if (!el || !fine || reduce) return
    const off = subscribePointer((px, py, active) => {
      if (!active) {
        x.set(0)
        y.set(0)
        return
      }
      // runs in frame.read: the box includes our own translate, so take it out
      const r = el.getBoundingClientRect()
      const dx = px - (r.left + r.width / 2 - sx.get())
      const dy = py - (r.top + r.height / 2 - sy.get())
      const out = Math.hypot(Math.max(Math.abs(dx) - r.width / 2, 0), Math.max(Math.abs(dy) - r.height / 2, 0))
      if (out >= reach) {
        x.set(0)
        y.set(0)
        return
      }
      const f = 1 - out / reach
      const pull = strength * f * f * (3 - 2 * f)
      x.set(softClamp(dx * pull, max))
      y.set(softClamp(dy * pull, max))
    })
    return () => {
      off()
      x.set(0)
      y.set(0)
    }
  }, [fine, reduce, strength, reach, max, x, y, sx, sy])

  return (
    <motion.div ref={ref} className={className} style={{ x: sx, y: sy }}>
      {children}
    </motion.div>
  )
}
