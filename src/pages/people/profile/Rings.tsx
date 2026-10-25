import { motion, useReducedMotion } from 'motion/react'

/**
 * Phone "ring waves" pulsing out from the centre of a 3D stage.
 * Border-only so the WebGL canvas behind stays visible.
 */
export function Rings({ color, count = 3, size = 220, speed = 2.6, className = '' }: { color: string; count?: number; size?: number; speed?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <span aria-hidden className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border-2"
          style={{ width: size, height: size, borderColor: color }}
          initial={reduce ? { scale: 0.75 + i * 0.18, opacity: 0.35 } : { scale: 0.55, opacity: 0 }}
          animate={reduce ? undefined : { scale: [0.55, 1.35], opacity: [0, 0.55, 0] }}
          transition={reduce ? undefined : { duration: speed, ease: 'easeOut', repeat: Infinity, delay: (i * speed) / count }}
        />
      ))}
    </span>
  )
}
