import { motion, useReducedMotion } from 'motion/react'
import { SIGNAL_GRADIENT } from '@/lib/colors'
import { BREAKDOWN_LABEL, signalMeta } from '@/lib/matching'
import { spring } from '@/lib/motion'
import type { MatchBreakdown, MatchResult, SignalLevel } from '@/lib/types'
import { ReasonIcon } from './ReasonIcon'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { bar: number; gap: number; h: number; text: string }> = {
  xs: { bar: 3, gap: 2, h: 12, text: 'text-[11px]' },
  sm: { bar: 4, gap: 2, h: 16, text: 'text-xs' },
  md: { bar: 6, gap: 3, h: 22, text: 'text-sm' },
  lg: { bar: 10, gap: 5, h: 40, text: 'text-base' },
}

interface SignalMeterProps {
  level: SignalLevel
  size?: Size
  /** show "คอเดียวกัน" next to the bars */
  showLabel?: boolean
  /** use the compact label */
  short?: boolean
  className?: string
}

/**
 * "สัญญาณถูกคอ" — phone-signal bars that rise from 1 to 5.
 * It is a graded scale, never a percentage. Bars warm up in colour as the
 * level rises (lavender → coral), so the scale also reads at a glance.
 */
export function SignalMeter({ level, size = 'md', showLabel = true, short, className = '' }: SignalMeterProps) {
  const reduce = useReducedMotion()
  const s = SIZES[size]
  const meta = signalMeta(level)
  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      role="img"
      // the label alone carries the graded scale: never announce a number
      aria-label={`สัญญาณถูกคอ: ${meta.label}`}
    >
      <span className="inline-flex items-end" style={{ gap: s.gap, height: s.h }} aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => {
          const on = i <= level
          return (
            <motion.span
              key={i}
              className="block rounded-full"
              style={{
                width: s.bar,
                height: `${28 + i * 14.4}%`,
                background: on ? SIGNAL_GRADIENT[Math.min(level, 5) - 1] : 'rgb(59 38 34 / 0.12)',
                transformOrigin: 'bottom',
                boxShadow: on && level >= 4 ? `0 0 ${s.bar * 1.5}px ${SIGNAL_GRADIENT[level - 1]}88` : undefined,
              }}
              initial={reduce ? false : { scaleY: 0.2, opacity: 0.4 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ ...spring.bouncy, delay: reduce ? 0 : i * 0.06 }}
            />
          )
        })}
      </span>
      {showLabel && (
        <span className={`font-display font-semibold whitespace-nowrap text-ink ${s.text}`}>{short ? meta.short : meta.label}</span>
      )}
    </span>
  )
}

/** Five-dot mini scale for a single dimension (no numbers). */
function Dots({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value * 5)))
  return (
    <span className="inline-flex gap-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="size-2 rounded-full"
          style={{ background: i < filled ? SIGNAL_GRADIENT[Math.min(4, filled - 1)] : 'rgb(59 38 34 / 0.12)' }}
        />
      ))}
    </span>
  )
}

const DOT_WORD = ['ยังไม่ตรง', 'นิดหน่อย', 'พอใช้', 'ตรงกัน', 'ตรงมาก', 'ตรงเป๊ะ']

/**
 * Full explanation card: big meter + hint + per-dimension dots + concrete reasons.
 */
export function SignalDetail({ match, className = '' }: { match: MatchResult; className?: string }) {
  const meta = signalMeta(match.level)
  const keys = Object.keys(match.breakdown) as (keyof MatchBreakdown)[]
  return (
    <div className={`rounded-3xl bg-white/80 p-5 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-soft">สัญญาณถูกคอ</p>
          <p className="font-display text-2xl font-semibold text-ink">{meta.label}</p>
          <p className="text-sm text-ink-soft">{meta.hint}</p>
        </div>
        <SignalMeter level={match.level} size="lg" showLabel={false} />
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {keys.map((k) => {
          const v = match.breakdown[k]
          return (
            <div key={k} className="flex items-center justify-between rounded-2xl bg-cream px-3 py-2">
              <dt className="text-sm text-ink-soft">{BREAKDOWN_LABEL[k]}</dt>
              <dd className="flex items-center gap-2">
                <Dots value={v} />
                <span className="sr-only">{DOT_WORD[Math.round(v * 5)]}</span>
              </dd>
            </div>
          )
        })}
      </dl>
      {match.reasons.length > 0 && (
        <ul className="mt-4 space-y-2">
          {match.reasons.slice(0, 4).map((r) => (
            <li key={r.text} className="flex items-start gap-2.5 text-sm text-ink">
              <ReasonIcon kind={r.kind} />
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
