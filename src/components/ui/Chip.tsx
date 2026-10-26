import { motion } from 'motion/react'
import { Check, Gem } from 'lucide-react'
import type { ReactNode } from 'react'
import { CATEGORY_COLOR, MOCHI } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { MochiColor, Tag } from '@/lib/types'

interface ChipProps {
  children: ReactNode
  color?: MochiColor
  selected?: boolean
  onClick?: () => void
  icon?: ReactNode
  /** lg = 44px tall, for chips that are the main tap target (mood pickers etc.) */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZING = {
  sm: 'h-7 px-2.5 text-xs gap-1',
  md: 'h-9 px-3.5 text-sm gap-1.5',
  lg: 'h-11 px-4 text-[15px] gap-1.5',
}
// invisible hit area so smaller toggle chips still get a 44px touch target
const HIT = {
  sm: 'after:absolute after:inset-x-0 after:-inset-y-2',
  md: 'after:absolute after:inset-x-0 after:-inset-y-1',
  lg: '',
}

/** Pill chip. Static when no onClick; a toggle button (aria-pressed) when it has one. */
export function Chip({ children, color = 'cream', selected, onClick, icon, size = 'md', className = '' }: ChipProps) {
  const p = MOCHI[color]
  const sizing = SIZING[size]
  const style = selected
    ? { background: p.base, color: p.ink, borderColor: p.shade, boxShadow: `inset 0 -2px 0 ${p.shade}` }
    : { background: onClick ? '#fff' : p.light, color: '#3B2622', borderColor: onClick ? '#F1DDD0' : 'transparent' }
  const cls = `inline-flex shrink-0 items-center whitespace-nowrap rounded-full border font-medium ${sizing} ${className}`
  if (!onClick) {
    return (
      <span className={cls} style={style}>
        {icon}
        {children}
      </span>
    )
  }
  return (
    <motion.button
      type="button"
      aria-pressed={!!selected}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      // springs only take two keyframes, so the select pop is a short tween
      animate={{ scale: selected ? [1, 1.08, 1] : 1, transition: { duration: 0.38, ease: 'easeOut' } }}
      transition={spring.bouncy}
      className={`${cls} relative transition-colors ${HIT[size]}`}
      style={style}
    >
      {selected ? <Check size={14} strokeWidth={3} /> : icon}
      {children}
    </motion.button>
  )
}

/** Interest tag chip coloured by category; `rare` adds a little gem. */
export function TagChip({
  tag,
  selected,
  onClick,
  rare,
  size = 'md',
}: {
  tag: Tag
  selected?: boolean
  onClick?: () => void
  rare?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <Chip
      color={CATEGORY_COLOR[tag.category]}
      selected={selected}
      onClick={onClick}
      size={size}
      icon={rare ? <Gem size={12} strokeWidth={2.6} aria-label={t('หายาก', 'Rare')} /> : undefined}
    >
      {tag.label}
    </Chip>
  )
}
