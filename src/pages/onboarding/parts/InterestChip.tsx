import { AnimatePresence, motion } from 'motion/react'
import { Check, Star } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { CATEGORY_COLOR, MOCHI } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { Tag } from '@/lib/types'
import { keyPop } from './hooks'

const HOLD_MS = 460

interface InterestChipProps {
  tag: Tag
  selected: boolean
  loved: boolean
  onToggle: () => void
  /** press-and-hold: select + star as "รักมาก" */
  onHold: () => void
}

/** Interest toggle. Tap to pick, press and hold to star it as "รักมาก" (a gentle buzz on phones). */
export function InterestChip({ tag, selected, loved, onToggle, onHold }: InterestChipProps) {
  const timer = useRef(0)
  const held = useRef(false)
  const p = MOCHI[CATEGORY_COLOR[tag.category]]

  const cancel = () => window.clearTimeout(timer.current)
  useEffect(() => cancel, [])

  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      aria-label={loved ? t(`${tag.label} (รักมาก)`, `${tag.label} (Love it)`) : tag.label}
      onPointerDown={() => {
        held.current = false
        cancel()
        timer.current = window.setTimeout(() => {
          held.current = true
          navigator.vibrate?.(14)
          onHold()
        }, HOLD_MS)
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (held.current) {
          held.current = false
          return
        }
        onToggle()
      }}
      whileTap={{ scale: 0.9 }}
      animate={{ scale: selected ? [1, 1.1, 1] : 1, transition: keyPop }}
      transition={spring.bouncy}
      className={`relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap select-none [-webkit-touch-callout:none] ${
        selected ? '' : 'border-line bg-white/90 text-ink hover:bg-white'
      }`}
      style={selected ? { background: p.base, color: p.ink, borderColor: p.shade, boxShadow: `inset 0 -2px 0 ${p.shade}` } : undefined}
    >
      {selected && <Check size={14} strokeWidth={3} aria-hidden />}
      {tag.label}
      <AnimatePresence>
        {loved && (
          <motion.span
            key="star"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            transition={spring.bouncy}
            className="absolute -top-2 -right-1.5 grid size-6 place-items-center rounded-full border-2 border-white bg-butter text-ink shadow-[var(--shadow-soft)]"
            aria-hidden
          >
            <Star size={12} fill="currentColor" strokeWidth={0} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
