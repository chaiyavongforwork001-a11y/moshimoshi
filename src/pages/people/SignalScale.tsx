import { motion } from 'motion/react'
import { Sheet, SignalMeter } from '@/components/ui'
import { SIGNAL_GRADIENT } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { BREAKDOWN_LABEL, SIGNAL_LEVELS } from '@/lib/matching'
import { fadeUp, stagger } from '@/lib/motion'
import type { MatchBreakdown, SignalLevel } from '@/lib/types'

const TRACK = `linear-gradient(90deg, ${SIGNAL_GRADIENT.join(', ')})`

/** Compact legend: the five signal levels as a warm-up scale, with how many people sit on each. */
export function SignalLegend({ counts }: { counts: Record<SignalLevel, number> }) {
  return (
    <div className="glass rounded-3xl px-3 pt-3 pb-2.5 sm:px-4">
      <div className="flex items-center justify-between gap-3 px-1 text-xs">
        <span className="font-display font-semibold text-ink">{t('สัญญาณถูกคอ', 'Vibe signal')}</span>
        <span className="text-ink-soft">{t('ยิ่งขีดเยอะ ยิ่งชอบอะไรคล้ายเรา', 'More bars, more in common')}</span>
      </div>
      <motion.ol variants={stagger(0.05, 0.1)} initial="hidden" animate="show" className="relative mt-2.5 grid grid-cols-5 gap-1">
        {/* the scale itself: cool → warm */}
        <span aria-hidden className="absolute inset-x-[10%] top-[17px] h-1 rounded-full opacity-50" style={{ background: TRACK }} />
        {SIGNAL_LEVELS.map((s) => (
          <motion.li key={s.level} variants={fadeUp} className="relative flex flex-col items-center gap-1 text-center">
            <span className="flex h-9 w-11 items-center justify-center rounded-2xl bg-white shadow-[var(--shadow-soft)]">
              <SignalMeter level={s.level} size="xs" showLabel={false} />
            </span>
            <span className="font-display text-[11px] leading-tight font-semibold text-ink">{s.short}</span>
            <span className="text-[11px] leading-none text-ink-soft">{counts[s.level] ? t(`${counts[s.level]} คน`, `${counts[s.level]} ${counts[s.level] === 1 ? 'person' : 'people'}`) : '–'}</span>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  )
}

/** "สัญญาณถูกคอคืออะไร" explainer. */
export function SignalInfoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const parts = Object.keys(BREAKDOWN_LABEL) as (keyof MatchBreakdown)[]
  return (
    <Sheet open={open} onClose={onClose} title={t('สัญญาณถูกคอคืออะไร', "What's a vibe signal?")}>
      <div className="space-y-5 pb-3">
        <p className="text-ink-soft">
          {t(
            'เหมือนขีดสัญญาณโทรศัพท์ ยิ่งขีดเยอะ คลื่นของเรากับเขายิ่งตรงกัน เราตั้งใจไม่ใช้ตัวเลขหรือเปอร์เซ็นต์ เพราะความถูกคอไม่ใช่คะแนนสอบ',
            "Like the bars on your phone: the more bars, the closer your wavelengths. We skip numbers and percentages on purpose, because clicking with someone isn't an exam score.",
          )}
        </p>
        <ol className="space-y-2">
          {SIGNAL_LEVELS.map((s) => (
            <li key={s.level} className="flex items-center gap-4 rounded-2xl bg-white p-3">
              <span className="flex w-14 shrink-0 justify-center">
                <SignalMeter level={s.level} size="md" showLabel={false} />
              </span>
              <span className="min-w-0">
                <span className="block font-display font-semibold">{s.label}</span>
                <span className="block text-sm text-ink-soft">{s.hint}</span>
              </span>
            </li>
          ))}
        </ol>
        <div>
          <h3 className="font-display font-semibold">{t('ดูจากอะไรบ้าง', 'What we look at')}</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {parts.map((k) => (
              <li key={k} className="rounded-full bg-cream-3/70 px-3 py-1 text-sm">
                {BREAKDOWN_LABEL[k]}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-soft">
            {t(
              'เรื่องที่หายากและตรงกันจะนับหนักกว่าเรื่องที่ใครๆ ก็ชอบ คนที่ยังไม่ได้โพสต์กำลังหาก็ไม่เสียเปรียบนะ',
              "Rare things you share count for more than things everyone likes. Haven't posted what you're looking for yet? That won't count against you.",
            )}
          </p>
        </div>
      </div>
    </Sheet>
  )
}
