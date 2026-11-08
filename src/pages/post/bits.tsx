import { motion, useAnimate, useReducedMotion } from 'motion/react'
import { CircleAlert } from 'lucide-react'
import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { MOCHI } from '@/lib/colors'
import { fadeUp, spring } from '@/lib/motion'
import type { MochiColor } from '@/lib/types'

/** each step is a zone of its own colour, so it's clear which step you're on */
const STEP_TONES: MochiColor[] = ['butter', 'mint', 'lavender', 'pink', 'sky', 'peach']

/** Numbered composer step. Shakes gently when a failed submit points at it. */
export function StepCard({
  id,
  n,
  title,
  hint,
  error,
  shakeKey = 0,
  children,
}: {
  id: string
  n: number
  title: string
  hint?: string
  /** message shown when this step blocks posting */
  error?: string
  shakeKey?: number
  children: ReactNode
}) {
  const [scope, animate] = useAnimate<HTMLElement>()
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!error || !shakeKey || reduce || !scope.current) return
    animate(scope.current, { x: [0, -9, 9, -6, 6, -2, 0] }, { duration: 0.5 })
  }, [shakeKey]) // only on a new submit attempt

  const p = MOCHI[STEP_TONES[(n - 1) % STEP_TONES.length]]
  const tone = { '--zone': error ? 'var(--color-coral)' : p.base, '--zone-light': p.light } as CSSProperties
  return (
    <motion.section ref={scope} id={id} aria-labelledby={`${id}-t`} variants={fadeUp} className="zone scroll-mt-28" style={tone}>
      <header className="zone-head justify-start">
        <span className="zone-icon font-display text-base font-bold" aria-hidden>
          {n}
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-t`} className="font-display text-lg leading-snug font-semibold">
            {title}
          </h2>
          {hint && <p className="text-sm text-ink-soft">{hint}</p>}
        </div>
      </header>
      <div className="zone-body">
        {children}
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-danger"
          >
            <CircleAlert size={16} aria-hidden />
            {error}
          </motion.p>
        )}
      </div>
    </motion.section>
  )
}

/** Large (44px) toggle chip used across the composer. */
export function PickChip({
  selected,
  onClick,
  color = 'butter',
  icon,
  children,
  label,
  className = '',
}: {
  selected: boolean
  onClick: () => void
  color?: MochiColor
  icon?: ReactNode
  children: ReactNode
  /** accessible name when the visible text isn't enough */
  label?: string
  className?: string
}) {
  const p = MOCHI[color]
  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      whileHover={{ y: -1.5 }}
      whileTap={{ scale: 0.92 }}
      animate={{ scale: selected ? [1, 1.08, 1] : 1 }}
      transition={{ ...spring.bouncy, scale: { duration: 0.32 } }}
      className={`inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border px-4 font-display text-[15px] font-semibold text-ink transition-colors ${
        selected ? '' : 'border-line bg-white hover:bg-cream'
      } ${className}`}
      style={selected ? { background: p.base, borderColor: p.shade, boxShadow: `inset 0 -3px 0 ${p.shade}` } : undefined}
    >
      {icon}
      {children}
    </motion.button>
  )
}

/** Shared input look: cream well that turns white on focus. */
export const fieldClass =
  'w-full rounded-2xl border border-line bg-cream px-4 py-3 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-lavender focus:bg-white focus:ring-3 focus:ring-lavender/40'
