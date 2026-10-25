import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionStyle,
} from 'motion/react'
import { useRef, type PointerEvent, type ReactNode } from 'react'
import { useMediaQuery } from '@/lib/hooks'

/** Real mouse / trackpad and no reduced-motion wish: the only case for pointer-follow effects. */
export function useFinePointerFx() {
  const reduce = useReducedMotion()
  const fine = useMediaQuery('(hover: hover) and (pointer: fine)')
  return fine && !reduce
}

/**
 * Pointer-follow 3D tilt plus a glare position (0..100%) for sticker cards.
 * Only on real hover devices and without reduced motion.
 */
export function useTilt(max = 7) {
  const enabled = useFinePointerFx()
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const gx = useMotionValue(50)
  const gy = useMotionValue(30)
  const glare = useMotionValue(0)
  const rotateX = useSpring(rx, { stiffness: 220, damping: 20 })
  const rotateY = useSpring(ry, { stiffness: 220, damping: 20 })
  const glareOpacity = useSpring(glare, { stiffness: 200, damping: 30 })
  return {
    enabled,
    style: { rotateX, rotateY, transformPerspective: 900 } satisfies MotionStyle,
    glare: { gx, gy, opacity: glareOpacity },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      if (!enabled) return
      const r = e.currentTarget.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      ry.set((px - 0.5) * max * 2)
      rx.set(-(py - 0.5) * max * 2)
      gx.set(px * 100)
      gy.set(py * 100)
      glare.set(1)
    },
    onPointerLeave() {
      rx.set(0)
      ry.set(0)
      glare.set(0)
    },
  }
}

/** Soft white sheen that follows the pointer across a tilted card. */
export function Glare({ tilt, radius = 'rounded-[1.75rem]' }: { tilt: ReturnType<typeof useTilt>; radius?: string }) {
  const bg = useMotionTemplate`radial-gradient(circle at ${tilt.glare.gx}% ${tilt.glare.gy}%, rgb(255 255 255 / 0.7), rgb(255 255 255 / 0) 58%)`
  if (!tilt.enabled) return null
  return (
    <motion.span
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-10 mix-blend-soft-light ${radius}`}
      style={{ background: bg, opacity: tilt.glare.opacity }}
    />
  )
}

/** A card that leans toward the pointer with a glare, and straightens up on hover like a sticker being picked up. */
export function TiltCard({
  children,
  rotate = 0,
  className = '',
  radius = 'rounded-[1.75rem]',
}: {
  children: ReactNode
  rotate?: number
  className?: string
  /** corner radius of the card inside, so the glare matches it */
  radius?: string
}) {
  const tilt = useTilt()
  return (
    <motion.div
      style={tilt.style}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      initial={{ rotate }}
      animate={{ rotate }}
      whileHover={{ rotate: 0, y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={`relative ${className}`}
    >
      {children}
      <Glare tilt={tilt} radius={radius} />
    </motion.div>
  )
}

/** Pulls its child toward the pointer (CTA buttons). The padding widens the pull zone. */
export function Magnetic({ children, strength = 0.32, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const enabled = useFinePointerFx()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 240, damping: 14, mass: 0.5 })
  const sy = useSpring(y, { stiffness: 240, damping: 14, mass: 0.5 })
  if (!enabled) return <span className={`inline-flex ${className}`}>{children}</span>
  return (
    <motion.span
      className={`-m-3 inline-flex p-3 ${className}`}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.span>
  )
}

/** Scroll-linked parallax: drifts `distance` px against the scroll while its box crosses the viewport. */
export function Drifter({
  children,
  distance = 80,
  rotate = 0,
  className = '',
}: {
  children: ReactNode
  distance?: number
  rotate?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [distance, -distance])
  const r = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-rotate, rotate])
  return (
    <motion.div ref={ref} aria-hidden style={{ y, rotate: r }} className={`pointer-events-none ${className}`}>
      {children}
    </motion.div>
  )
}
