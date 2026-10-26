import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Radio } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { Avatar, SignalMeter } from '@/components/ui'
import { useDataReady, usePeople } from '@/data/hooks'
import { t } from '@/lib/i18n'
import { signalMeta } from '@/lib/matching'
import { spring } from '@/lib/motion'
import type { Intent, MatchResult, User } from '@/lib/types'
import { AnimatedNumber } from '@/pages/home/Block'
import { useMatchesFor } from '@/pages/home/matches'
import { SoftSkeleton } from '@/pages/home/Soft'

/** Live "คนที่น่าจะตรง": re-tunes as the draft changes. Shows a people count, never a compatibility number. */
export function LikelyMatches({ intent, ready }: { intent: Intent; ready: boolean }) {
  const reduce = useReducedMotion()
  const dataReady = useDataReady()
  const mine = useMemo(() => [intent], [intent])
  const results = useMatchesFor(mine)
  const people = usePeople()
  const strong = results.filter((r) => r.level >= 3)
  const top = results
    .slice(0, 3)
    .map((m) => ({ m, u: people.find((p) => p.id === m.userId) }))
    .filter((x): x is { m: MatchResult; u: User } => !!x.u)
  const pingKey = `${strong.length}-${top.map((x) => x.m.userId).join()}`

  return (
    <section aria-labelledby="likely-title" className="card relative overflow-hidden p-4">
      <header className="flex items-center gap-3">
        <span className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-mint/60 text-ink" aria-hidden>
          {!reduce && ready && (
            <motion.span
              key={pingKey}
              className="absolute inset-0 rounded-2xl border-2 border-mint"
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 1.7, opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          )}
          <Radio size={20} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <h2 id="likely-title" className="font-display text-lg leading-snug font-semibold">
            {t('คนที่น่าจะตรง', 'Likely matches')}
          </h2>
          <p className="text-xs text-ink-soft">{t('จูนคลื่นใหม่ทุกครั้งที่เราแก้โพสต์', 'Re-tunes every time you edit your post')}</p>
        </div>
      </header>

      {!ready ? (
        <p className="mt-3 rounded-2xl bg-cream p-3 text-sm text-ink-soft">
          {t('เลือกกิจกรรมหลักก่อน แล้วโมชิจะช่วยหาคนที่คลื่นตรงกันให้', 'Pick a main activity and Mochi will find people on your wavelength')}
        </p>
      ) : !dataReady ? (
        <SoftSkeleton rows={2} className="mt-3" />
      ) : !top.length ? (
        <p className="mt-3 rounded-2xl bg-cream p-3 text-sm text-ink-soft">
          {t(
            'ตอนนี้ยังไม่มีใครให้จูนคลื่นด้วยเลย โพสต์ไว้ก่อนได้นะ ใครมาแล้วจะเห็นโพสต์นี้ทันที',
            'No one to tune in with just yet. Post anyway. Anyone who drops by will see it right away',
          )}
        </p>
      ) : (
        <>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2" aria-live="polite">
            <AnimatedNumber value={strong.length} className="font-display text-4xl leading-tight font-bold" />
            <span className="text-sm text-ink-soft">
              {t(`คนที่สัญญาณ "${signalMeta(3).label}" ขึ้นไป`, `${strong.length === 1 ? 'person' : 'people'} at "${signalMeta(3).label}" or higher`)}
            </span>
          </p>
          <ul className="mt-2 space-y-1">
            <AnimatePresence mode="popLayout" initial={false}>
              {top.map(({ m, u }) => {
                const reason = m.reasons.find((r) => r.kind === 'intent' || r.kind === 'swap') ?? m.reasons[0]
                return (
                  <motion.li
                    key={m.userId}
                    layout
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={spring.soft}
                  >
                    <Link to={`/app/people/${u.id}`} className="flex min-h-14 items-center gap-3 rounded-2xl p-1.5 transition-colors hover:bg-cream">
                      <Avatar color={u.color} size={38} online={u.isOnline} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-sm font-semibold">{u.name}</span>
                        {reason && <span className="block truncate text-xs text-ink-soft">{reason.text}</span>}
                      </span>
                      <SignalMeter level={m.level} size="xs" showLabel={false} />
                    </Link>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        </>
      )}
    </section>
  )
}

