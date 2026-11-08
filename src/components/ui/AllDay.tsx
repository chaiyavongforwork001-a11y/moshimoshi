import { Sparkles } from 'lucide-react'
import { t } from '@/lib/i18n'

const SIZING = {
  xs: 'h-7 gap-1 px-2.5 text-xs',
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-9 gap-1.5 px-3.5 text-sm',
}

/** "24 ชั่วโมง" in a soft pastel rainbow that drifts and shines (still for reduced motion). */
export function AllDayChip({ size = 'sm', className = '' }: { size?: keyof typeof SIZING; className?: string }) {
  return (
    <span className={`rainbow-chip relative inline-flex max-w-full shrink-0 items-center rounded-full font-display font-semibold whitespace-nowrap text-ink ${SIZING[size]} ${className}`}>
      <Sparkles size={size === 'md' ? 15 : 13} strokeWidth={2.4} aria-hidden className="relative shrink-0" />
      <span className="relative">{t('24 ชั่วโมง', '24/7')}</span>
    </span>
  )
}
