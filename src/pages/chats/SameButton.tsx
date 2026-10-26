import { motion, useReducedMotion } from 'motion/react'
import { Hand } from 'lucide-react'
import { useState } from 'react'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'

const BURST = ['var(--color-coral)', 'var(--color-butter)', 'var(--color-mint)', 'var(--color-lavender)', 'var(--color-pink)']

/**
 * "เหมือนกัน!" — a little high-five. The hit area is 44px tall even though
 * the pill looks small; a burst of confetti dots pops out when it turns on.
 */
export function SameButton({
  active,
  onToggle,
  label = t('เหมือนกัน!', 'Same!'),
  activeLabel = t('เหมือนกันเลย', 'Same here!'),
  describedBy,
  className = '',
}: {
  active: boolean
  onToggle: () => void
  label?: string
  activeLabel?: string
  /** id of what this reacts to, for screen readers */
  describedBy?: string
  className?: string
}) {
  const reduce = useReducedMotion()
  const [burst, setBurst] = useState(0)
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-describedby={describedBy}
      onClick={() => {
        if (!active) {
          setBurst((b) => b + 1)
          navigator.vibrate?.(12)
        }
        onToggle()
      }}
      className={`group relative inline-flex h-11 items-center ${className}`}
    >
      <motion.span
        key={burst}
        whileTap={{ scale: 0.88 }}
        initial={burst && !reduce ? { scale: 0.8 } : false}
        animate={{ scale: 1 }}
        transition={spring.bouncy}
        className={`relative inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-display text-xs font-semibold transition-colors ${
          active ? 'border-butter bg-butter text-ink shadow-[inset_0_-2px_0_rgb(59_38_34/0.12)]' : 'border-line bg-white/90 text-ink-soft group-hover:text-ink'
        }`}
      >
        <motion.span
          initial={burst && !reduce ? { rotate: -28 } : false}
          animate={{ rotate: 0 }}
          transition={spring.bouncy}
          className="inline-flex"
        >
          <Hand size={14} strokeWidth={2.6} aria-hidden />
        </motion.span>
        {active ? activeLabel : label}
        {burst > 0 && active && !reduce && (
          <span aria-hidden className="pointer-events-none absolute inset-0">
            {BURST.map((bg, i) => {
              const a = (i / BURST.length) * Math.PI * 2 - Math.PI / 2
              return (
                <motion.span
                  key={i}
                  className="absolute top-1/2 left-1/2 size-1.5 rounded-full"
                  style={{ background: bg }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(a) * 32, y: Math.sin(a) * 22, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              )
            })}
          </span>
        )}
      </motion.span>
    </button>
  )
}
