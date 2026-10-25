import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion'
import { spring } from '@/lib/motion'

/** Home section: title row + content, softly revealed when it scrolls into view. */
export function Block({
  id,
  title,
  icon,
  action,
  children,
  className = '',
}: {
  id: string
  title: ReactNode
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Reveal as="section" aria-labelledby={id} margin="0px 0px -60px 0px" className={className}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id={id} className="flex min-w-0 items-center gap-2.5 font-display text-xl font-semibold">
          {icon && (
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white text-ink shadow-[var(--shadow-soft)]" aria-hidden>
              {icon}
            </span>
          )}
          <span className="min-w-0">{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </Reveal>
  )
}

/** Number that rolls up/down when it changes (counts, RSVPs). */
export function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`relative inline-flex overflow-hidden tabular-nums ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '-70%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '70%', opacity: 0 }}
          transition={spring.bouncy}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** Small "see all" link style used in section headers. */
export const seeAllClass =
  'inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-white/70 hover:text-ink'
