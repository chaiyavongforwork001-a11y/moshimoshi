import { motion } from 'motion/react'
import { ChevronRight, Hand, Radio } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { Avatar, Button, ReasonIcon, SignalMeter, WaveMatch } from '@/components/ui'
import { useMatches, usePeople } from '@/data/hooks'
import { known, t } from '@/lib/i18n'
import { SIGNAL_LEVELS } from '@/lib/matching'
import { fadeUp, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { MatchResult, Room, User } from '@/lib/types'
import { ageLabel } from '@/pages/people/lib'
import { roomMembers } from '../roomData'

export function MembersTab({ room, onGreet }: { room: Room; onGreet: (u: User) => void }) {
  const myAge = useMoshi((s) => s.me.age)
  const people = usePeople()
  const matches = useMatches()
  const ranked = useMemo(() => {
    const byUser = new Map(matches.map((m) => [m.userId, m]))
    return roomMembers(room.id, people)
      .flatMap((u) => {
        const m = byUser.get(u.id)
        return m ? [{ u, m }] : []
      })
      .sort((a, b) => b.m.score - a.m.score)
  }, [room.id, people, matches])

  return (
    <section aria-labelledby="members-title">
      <h2 id="members-title" className="font-display text-xl font-semibold">
        {t('คนในห้องนี้', 'People in this room')}
      </h2>
      <p className="text-sm text-ink-soft">{t('เรียงจากคนที่สัญญาณถูกคอกับเรามากที่สุด', 'Sorted by strongest vibe signal with you')}</p>

      {/* the 5-step scale, so the bars mean something at a glance */}
      <ol aria-label={t('ระดับสัญญาณถูกคอ', 'Vibe signal levels')} className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {SIGNAL_LEVELS.map((s) => (
          <li key={s.level} className="inline-flex h-9 shrink-0 items-center rounded-full bg-white/75 px-3 shadow-[var(--shadow-soft)]">
            <SignalMeter level={s.level} size="xs" short />
          </li>
        ))}
      </ol>

      {ranked.length > 0 ? (
        <motion.ul variants={stagger(0.06, 0.05)} initial="hidden" animate="show" className="mt-4 space-y-3">
          {ranked.map(({ u, m }, i) => (
            <motion.li key={u.id} variants={fadeUp}>
              <MemberRow user={u} match={m} myAge={myAge} host={room.hostIds.includes(u.id)} top={i === 0} onGreet={() => onGreet(u)} />
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <div className="card mt-4 flex flex-col items-center px-6 py-10 text-center">
          <Avatar color={room.color} size={72} face="sleepy" />
          <h3 className="mt-3 font-display text-lg font-semibold">{t('ยังไม่มีใครเข้าห้องนี้เลย', 'No one has joined this room yet')}</h3>
          <p className="mt-1 max-w-xs text-ink-soft">
            {t('เข้าห้องไว้ก่อนก็ได้นะ พอมีเพื่อนแวะมา เราจะได้เป็นคนแรกที่ทักทาย', "Join now, and when someone drops by you'll be the first to say hi")}
          </p>
        </div>
      )}
    </section>
  )
}

function MemberRow({
  user: u,
  match: m,
  myAge,
  host,
  top,
  onGreet,
}: {
  user: User
  match: MatchResult
  myAge: number
  host: boolean
  top: boolean
  onGreet: () => void
}) {
  const reason = m.reasons[0]
  return (
    <div className={`card relative overflow-hidden p-4 ${top ? 'ring-2 ring-butter' : ''}`}>
      {top && (
        <>
          <WaveMatch level={m.level} height={46} className="pointer-events-none absolute inset-x-0 bottom-0 opacity-25" />
          <p className="relative mb-2 inline-flex items-center gap-1.5 rounded-full bg-butter/60 px-3 py-0.5 text-xs font-semibold text-ink">
            <Radio size={13} strokeWidth={2.4} aria-hidden />
            {t('คลื่นตรงกับเราที่สุดในห้องนี้', 'Most on your wavelength here')}
          </p>
        </>
      )}
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link to={`/app/people/${u.id}`} className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl">
          <Avatar color={u.color} size={54} online={u.isOnline} ring={host} face={top ? 'happy' : 'smile'} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2">
              <span className="font-display text-lg font-semibold text-ink group-hover:underline">{u.name}</span>
              <span className="text-sm text-ink-soft">
                {ageLabel(myAge, u.age)} · {known(u.province)}
              </span>
              {host && <span className="rounded-full bg-butter/70 px-2 py-px text-xs font-semibold text-ink">{t('พี่โมชิ', 'Mochi host')}</span>}
            </span>
            <SignalMeter level={m.level} size="sm" className="mt-0.5" />
            {reason && (
              <span className="mt-1 flex items-start gap-1.5 text-sm text-ink-soft">
                <ReasonIcon kind={reason.kind} />
                <span className="line-clamp-2">{reason.text}</span>
              </span>
            )}
          </span>
          <ChevronRight size={20} className="hidden shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden />
        </Link>
        <Button variant={top ? 'primary' : 'soft'} icon={<Hand size={16} strokeWidth={2.4} />} onClick={onGreet} className="self-start sm:self-center">
          {t('ทักทาย', 'Say hi')}
        </Button>
      </div>
    </div>
  )
}
