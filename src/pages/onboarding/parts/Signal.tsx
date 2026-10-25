import { motion, useReducedMotion } from 'motion/react'

/**
 * Tiny phone-signal bars — the brand's "on a call" cue.
 * `ringing` makes them pulse in sequence like a call connecting.
 */
export function SignalBars({ ringing = false, className = '' }: { ringing?: boolean; className?: string }) {
  const reduce = useReducedMotion()
  const loop = ringing && !reduce
  return (
    <span className={`inline-flex h-3 items-end gap-[2px] ${className}`} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="block w-[3px] origin-bottom rounded-full bg-coral"
          style={{ height: `${35 + i * 21}%` }}
          animate={loop ? { scaleY: [0.35, 1, 0.35], opacity: [0.5, 1, 0.5] } : { scaleY: 1, opacity: 1 }}
          transition={loop ? { duration: 1.1, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' } : { duration: 0.2 }}
        />
      ))}
    </span>
  )
}

/** Three bouncing dots, shown while น้องโมชิ is "typing". */
export function TypingDots() {
  const reduce = useReducedMotion()
  return (
    <span className="inline-flex h-[1.5em] items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-1.5 rounded-full bg-ink-soft"
          animate={reduce ? undefined : { y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.13, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}
