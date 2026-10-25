import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, type MotionValue } from 'motion/react'
import { createContext, useContext, useMemo, useRef, type PointerEvent, type ReactNode } from 'react'
import { scrollStamp, useFinePointer } from './pointer'

const TILT = { stiffness: 260, damping: 22, mass: 0.6 }
const PERSPECTIVE = 900
// white core, warm rim: shows on colour, barely tints white (text under it stays ≥4.5:1)
const GLARE = 'radial-gradient(circle closest-side, rgb(255 255 255 / 0.3) 0%, rgb(255 236 214 / 0.18) 40%, rgb(255 236 214 / 0) 100%)'

interface Glare {
  x: MotionValue<number>
  y: MotionValue<number>
  glow: MotionValue<number>
}
const GlareContext = createContext<Glare | null>(null)

/**
 * Tilts toward the mouse in 3D with a soft highlight that follows it.
 * Mouse only: touch and reduced motion get a plain, static card.
 * The outer box (className: layout, e.g. "h-full" or margins) takes the
 * pointer; the inner layer tilts, so edges never flicker in and out of hover.
 * No transform is left on the card at rest (no stray stacking contexts).
 *
 * Glare: drawn over the whole box (`radius` should match the card's corners),
 * or pass glare={false} and put <TiltGlare /> inside the card itself (clips to
 * the card's own rounded overflow; use it when the card also lifts on hover).
 * Never wrap a <View3D>: its 3D can't tilt with the DOM.
 */
export function TiltCard({
  children,
  className = '',
  max = 6,
  lift = 1.012,
  glare = true,
  radius = 'var(--radius-2xl)',
}: {
  children: ReactNode
  className?: string
  /** largest tilt in degrees */
  max?: number
  /** hover scale */
  lift?: number
  glare?: boolean
  radius?: string
}) {
  const fine = useFinePointer()
  const reduce = useReducedMotion()
  const on = fine && !reduce
  const rx = useSpring(0, TILT)
  const ry = useSpring(0, TILT)
  const scale = useSpring(1, TILT)
  const perspective = useMotionValue(0)
  const gx = useMotionValue(0)
  const gy = useMotionValue(0)
  const glow = useSpring(0, { stiffness: 180, damping: 26 })
  const ctx = useMemo<Glare>(() => ({ x: gx, y: gy, glow }), [gx, gy, glow])
  const hovering = useRef(false)
  const box = useRef<{ r: DOMRect; stamp: number } | null>(null)

  // once fully settled after leaving, drop the perspective so the transform resolves to none
  const settle = () => {
    if (!hovering.current && rx.get() === 0 && ry.get() === 0 && scale.get() === 1) perspective.set(0)
  }
  useMotionValueEvent(rx, 'change', settle)
  useMotionValueEvent(ry, 'change', settle)
  useMotionValueEvent(scale, 'change', settle)

  const measure = (el: HTMLElement) => {
    box.current = { r: el.getBoundingClientRect(), stamp: scrollStamp() }
    return box.current.r
  }

  const onEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (!on || e.pointerType !== 'mouse') return
    hovering.current = true
    measure(e.currentTarget)
    perspective.set(PERSPECTIVE)
    scale.set(lift)
    glow.set(1)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!hovering.current) return
    const cached = box.current
    const r = cached && cached.stamp === scrollStamp() ? cached.r : measure(e.currentTarget)
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    ry.set((px - 0.5) * 2 * max)
    rx.set((0.5 - py) * 2 * max)
    gx.set(px * r.width)
    gy.set(py * r.height)
  }
  const onLeave = () => {
    if (!hovering.current) return
    hovering.current = false
    rx.set(0)
    ry.set(0)
    scale.set(1)
    glow.set(0)
  }

  return (
    <GlareContext.Provider value={ctx}>
      <div className={className} onPointerEnter={onEnter} onPointerMove={onMove} onPointerLeave={onLeave}>
        <motion.div className="relative h-full" style={{ rotateX: rx, rotateY: ry, scale, transformPerspective: perspective }}>
          {children}
          {glare && <GlareLayer radius={radius} />}
        </motion.div>
      </div>
    </GlareContext.Provider>
  )
}

/** The tilt highlight, placed inside the card so it clips to the card's own corners. */
export function TiltGlare() {
  return <GlareLayer radius="inherit" />
}

function GlareLayer({ radius }: { radius: string }) {
  const g = useContext(GlareContext)
  if (!g) return null
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden" style={{ borderRadius: radius }}>
      <motion.span
        className="absolute top-0 left-0 -mt-40 -ml-40 size-80 rounded-full"
        style={{ x: g.x, y: g.y, opacity: g.glow, background: GLARE }}
      />
    </span>
  )
}
