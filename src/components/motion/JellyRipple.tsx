import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

interface Drop {
  id: number
  x: number
  y: number
  d: number
}

let seq = 0
const WOBBLE: Transition = { type: 'spring', stiffness: 260, damping: 11, mass: 0.8 }

/**
 * Jelly ripple: drop it inside any rounded, `relative` surface and every
 * press sends a wobbly soft drop out from the touch point. It listens to its
 * parent element, clips to the parent's corners and never takes pointer events.
 * Reduced motion: nothing.
 */
export function JellyRipple({ color = 'rgb(255 255 255 / 0.6)' }: { color?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const [drops, setDrops] = useState<Drop[]>([])

  useEffect(() => {
    const host = ref.current?.parentElement
    if (!host || reduce) return
    const onDown = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      const d = Math.hypot(r.width, r.height) * 1.6
      const drop = { id: ++seq, x: e.clientX - r.left, y: e.clientY - r.top, d }
      setDrops((list) => [...list.slice(-2), drop])
    }
    host.addEventListener('pointerdown', onDown)
    return () => host.removeEventListener('pointerdown', onDown)
  }, [reduce])

  return (
    <span ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <AnimatePresence>
        {drops.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.x - p.d / 2,
              top: p.y - p.d / 2,
              width: p.d,
              height: p.d,
              background: `radial-gradient(circle closest-side, ${color} 0%, ${color} 45%, transparent 100%)`,
            }}
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ scale: WOBBLE, opacity: { duration: 0.65, ease: 'easeOut' } }}
            onAnimationComplete={() => setDrops((list) => list.filter((x) => x.id !== p.id))}
          />
        ))}
      </AnimatePresence>
    </span>
  )
}

/** Squishy jelly press for any tappable motion element: `<motion.button {...jellyPress}>`. */
export const jellyPress = {
  whileTap: { scaleX: 1.08, scaleY: 0.88 },
  transition: { type: 'spring', stiffness: 520, damping: 11, mass: 0.6 } satisfies Transition,
}
