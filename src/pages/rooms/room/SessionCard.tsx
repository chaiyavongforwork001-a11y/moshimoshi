import { AnimatePresence, motion } from 'motion/react'
import { BellRing, CalendarHeart, PhoneCall } from 'lucide-react'
import { TiltCard, TiltGlare } from '@/components/motion'
import { Avatar } from '@/components/ui'
import { usePeople, usePerson, useSessions } from '@/data/hooks'
import { MOCHI } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Room } from '@/lib/types'
import { AvatarStack, LiveDot, PopToggle, type StackPerson } from '../bits'
import { dayLabel, nextSession, roomMembers } from '../roomData'

/** Next "รอบคุย" with a one-tap RSVP. */
export function SessionCard({ room }: { room: Room }) {
  const s = nextSession(room.id, useSessions())
  const people = usePeople()
  const host = usePerson(s?.hostId)
  const me = useMoshi((st) => st.me)
  const going = useMoshi((st) => (s ? st.going.includes(s.id) : false))
  const toggleGoing = useMoshi((st) => st.toggleGoing)
  const p = MOCHI[room.color]

  if (!s) {
    return (
      <div className="card mt-4 flex items-center gap-4 p-4 sm:p-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: p.light }}>
          <CalendarHeart size={26} strokeWidth={2.2} color={p.ink} aria-hidden />
        </span>
        <p className="text-[15px] text-ink">
          {t('ยังไม่มีรอบคุยเร็วๆ นี้ แต่ช่วง ', 'No sessions coming up, but ')}
          <b className="font-display">{room.primeTime}</b>
          {t(' คนแวะมาคุยกันเยอะที่สุดนะ', ' is when the most people drop by')}
        </p>
      </div>
    )
  }

  // live sessions may be hosted by someone outside the app (only a name on the row)
  const hostName = host?.name ?? s.hostName
  const crowd: StackPerson[] = [
    ...(going ? [{ id: 'me', color: me.color, face: 'happy' as const }] : []),
    ...roomMembers(room.id, people).filter((u) => u.id !== s.hostId).slice(0, 3),
  ]
  const count = s.going + (going ? 1 : 0)

  return (
    <TiltCard className="mt-4" max={4} glare={false}>
      <section aria-labelledby="session-title" className="card relative overflow-hidden p-4 sm:p-5">
        <TiltGlare />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full opacity-50 blur-2xl" style={{ background: p.base }} />
        <div className="relative flex gap-4">
          <div
            className="flex w-[4.75rem] shrink-0 flex-col items-center justify-center rounded-2xl py-2 text-center shadow-[inset_0_-3px_0_rgb(59_38_34/0.08)]"
            style={{ background: p.light, color: p.ink }}
          >
            <span className="text-xs font-semibold">{dayLabel(s.dayOffset)}</span>
            <span className="font-display text-xl leading-tight font-bold">{s.time}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
              {s.live ? (
                <>
                  <LiveDot /> {t('กำลังคุยอยู่ตอนนี้', 'Live right now')}
                </>
              ) : (
                <>
                  <PhoneCall size={13} strokeWidth={2.4} aria-hidden /> {t('รอบคุยถัดไป', 'Next session')}
                </>
              )}
            </p>
            <h2 id="session-title" className="font-display text-lg leading-snug font-semibold">
              {s.title}
            </h2>
            {hostName ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-soft">
                <Avatar color={host?.color ?? room.color} size={22} ring face="happy" />
                {t(`พี่โมชิ${hostName} · ${s.durationMin} นาที`, `Mochi host ${hostName} · ${s.durationMin} min`)}
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-ink-soft">{t(`คุยกันสบายๆ ${s.durationMin} นาที`, `A cozy ${s.durationMin}-min chat`)}</p>
            )}
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AvatarStack people={crowd} size={30} max={4} />
            <span className="relative text-sm text-ink-soft">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.b
                  key={count}
                  className="inline-block font-display text-ink"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={spring.bouncy}
                >
                  {count}
                </motion.b>
              </AnimatePresence>{' '}
              {t('คนจะมา', 'going')}
            </span>
          </span>
          <PopToggle
            on={going}
            onToggle={() => toggleGoing(s.id)}
            labelOn={t('ไปแน่นอน!', "I'm in!")}
            labelOff={s.live ? t('เข้าร่วมเลย', 'Join now') : t('ไปด้วย', "I'm going")}
            iconOff={<PhoneCall size={17} strokeWidth={2.4} />}
            ariaLabel={t(`ไปรอบคุย ${s.title}`, `I'm going to ${s.title}`)}
          />
        </div>

        <AnimatePresence initial={false}>
          {going && (
            <motion.p
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={spring.soft}
              className="relative flex items-center gap-2 overflow-hidden rounded-2xl bg-mint/35 px-3 text-sm text-ink"
            >
              <BellRing size={16} strokeWidth={2.4} className="my-2 shrink-0" aria-hidden />
              <span className="py-2">{t('เดี๋ยวน้องโมชิจะกริ๊งเตือนก่อนเริ่ม 10 นาทีนะ', 'Little Mochi will ring you 10 minutes before it starts')}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </section>
    </TiltCard>
  )
}
