import { motion, useReducedMotion } from 'motion/react'
import { ChevronRight, PhoneCall, Radio } from 'lucide-react'
import { useMemo } from 'react'
import { Avatar, ReasonIcon, SignalMeter } from '@/components/ui'
import { useMatches, usePerson } from '@/data/hooks'
import { known, t } from '@/lib/i18n'
import { SIGNAL_LEVELS } from '@/lib/matching'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { MatchResult, SignalLevel } from '@/lib/types'
import { ageLabel } from '@/pages/home/greeting'
import { EmptyNote, InviteButton } from '@/pages/home/Soft'
import type { StepProps } from '../model'
import { Confetti } from '../parts/Fx'
import { SignalBars } from '../parts/Signal'
import { StageBox } from '../parts/StageBox'

export function StepDone({ desktop, pulse, onOpenProfile }: Pick<StepProps, 'desktop'> & { pulse: number; onOpenProfile: (userId: string) => void }) {
  const me = useMoshi((s) => s.me)
  const all = useMatches()
  const matches = useMemo(() => all.slice(0, 3), [all])
  const reduce = useReducedMotion()

  return (
    <div className="space-y-6">
      <Confetti />

      {!desktop && (
        <motion.div variants={fadeUp}>
          <StageBox color={me.color} expression="happy" accessory={me.accessory ?? 'none'} name={me.name} pulse={pulse} heightClass="h-56" />
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2">
        <span className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink">
          <motion.span
            className="grid size-6 place-items-center rounded-full bg-mint"
            animate={reduce ? undefined : { scale: [1, 1.18, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            <PhoneCall size={13} />
          </motion.span>
          {t('เชื่อมสายแล้ว โมชิโมชิ~', 'Connected. Moshi moshi~')}
          <SignalBars />
        </span>
        <span className="inline-flex h-10 items-center rounded-full bg-white/70 px-4 text-sm text-ink">
          {t(
            `ชอบ ${me.tags.length} เรื่อง · อยู่ ${me.rooms.length} ห้อง`,
            `${me.tags.length} ${me.tags.length === 1 ? 'interest' : 'interests'} · ${me.rooms.length} ${me.rooms.length === 1 ? 'room' : 'rooms'}`,
          )}
        </span>
      </motion.div>

      <motion.section variants={fadeUp} aria-labelledby="ob-matches">
        <div className="mb-3">
          <h2 id="ob-matches" className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <Radio size={20} aria-hidden />
            {t('เพื่อนที่คลื่นตรงกัน', 'Friends on your wavelength')}
          </h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {t('ดูจาก "สัญญาณถูกคอ" ยิ่งขีดเยอะ ยิ่งชอบอะไรคล้ายกัน', 'Check the "vibe signal": the more bars, the more you have in common')}
          </p>
        </div>

        {matches.length ? (
          <motion.ul variants={stagger(0.12, 0.5)} initial="hidden" animate="show" className="space-y-2.5">
            {matches.map((m) => (
              <MatchRow key={m.userId} match={m} myAge={me.age} onOpen={() => onOpenProfile(m.userId)} />
            ))}
          </motion.ul>
        ) : (
          <EmptyNote
            face="wink"
            title={t('ตอนนี้ยังไม่เจอใครคลื่นตรงกันเลย', 'No one on your wavelength yet')}
            sub={t(
              'เพื่อนๆ เพิ่งเริ่มทยอยมา ชวนเพื่อนมาเล่นด้วยกันสิ แล้วโมชิจะคอยจูนคลื่นให้นะ',
              'People are just starting to arrive. Invite your friends, and Mochi will keep tuning in for you',
            )}
          >
            <InviteButton className="w-full sm:w-auto" />
          </EmptyNote>
        )}

        <ScaleLegend />
      </motion.section>
    </div>
  )
}

function MatchRow({ match, myAge, onOpen }: { match: MatchResult; myAge: number; onOpen: () => void }) {
  const u = usePerson(match.userId)
  if (!u) return null
  const reason = match.reasons[0]
  return (
    <motion.li variants={fadeUp}>
      <motion.button
        type="button"
        onClick={onOpen}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.97 }}
        transition={spring.bouncy}
        className="card flex w-full items-center gap-3 p-3 text-left sm:p-4"
        aria-label={t(
          `${u.name} สัญญาณถูกคอ ${match.label}${reason ? ` ${reason.text}` : ''} แตะเพื่อดูโปรไฟล์`,
          `${u.name}, vibe signal: ${match.label}${reason ? `. ${reason.text}` : ''}. Tap to see their profile`,
        )}
      >
        <Avatar color={u.color} size={54} face="smile" online={u.isOnline} />
        <span className="block min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="truncate font-display text-[17px] font-semibold text-ink">{u.name}</span>
            <span className="text-xs text-ink-soft">
              {ageLabel(myAge, u.age)} · {known(u.province)}
            </span>
          </span>
          <SignalMeter level={match.level} size="sm" className="mt-0.5" />
          {reason && (
            <span className="mt-1 flex items-start gap-1.5 text-sm text-ink-soft">
              <ReasonIcon kind={reason.kind} />
              <span className="line-clamp-2">{reason.text}</span>
            </span>
          )}
        </span>
        <ChevronRight size={20} className="shrink-0 text-ink-soft" aria-hidden />
      </motion.button>
    </motion.li>
  )
}

/** The 5-step scale spelled out, so the bars mean something from day one. */
function ScaleLegend() {
  return (
    <motion.div variants={fadeUp} className="mt-4 rounded-3xl bg-white/60 p-4">
      <p className="mb-2.5 text-xs font-semibold text-ink-soft">{t('สัญญาณถูกคอมี 5 ระดับ', 'The vibe signal has 5 levels')}</p>
      <ol className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {SIGNAL_LEVELS.map((s) => (
          <li key={s.level} className="flex shrink-0 snap-start flex-col items-start gap-1 rounded-2xl bg-white px-3 py-2.5">
            <SignalMeter level={s.level as SignalLevel} size="xs" showLabel={false} />
            <span className="text-xs font-semibold whitespace-nowrap text-ink">{s.label}</span>
          </li>
        ))}
      </ol>
    </motion.div>
  )
}
