import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { MOCHI } from '@/lib/colors'
import { spring } from '@/lib/motion'
import type { MochiColor } from '@/lib/types'
import { keyPop } from './hooks'

interface PillProps {
  children: ReactNode
  onClick: () => void
  /** omit for plain action pills; true/false makes it a toggle (aria-pressed) */
  selected?: boolean
  color?: MochiColor
  icon?: ReactNode
  ariaLabel?: string
  className?: string
}

/** 44px pill used for toggles and helper actions across the onboarding steps. */
export function Pill({ children, onClick, selected, color = 'peach', icon, ariaLabel, className = '' }: PillProps) {
  const p = MOCHI[color]
  const on = !!selected
  return (
    <motion.button
      type="button"
      aria-pressed={selected === undefined ? undefined : on}
      aria-label={ariaLabel}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      animate={{ scale: on ? [1, 1.07, 1] : 1, transition: keyPop }}
      transition={spring.bouncy}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors ${
        on ? '' : 'border-line bg-white/90 text-ink hover:bg-white'
      } ${className}`}
      style={on ? { background: p.base, color: p.ink, borderColor: p.shade, boxShadow: `inset 0 -2px 0 ${p.shade}` } : undefined}
    >
      {icon}
      {children}
    </motion.button>
  )
}
