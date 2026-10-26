import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Link } from 'react-router'
import { TiltCard, TiltGlare } from '@/components/motion'
import { Avatar, ButtonLink, IconButton, RoomIcon } from '@/components/ui'
import { useDataReady, usePerson, useRoom, useSessions } from '@/data/hooks'
import { MOCHI } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Session } from '@/lib/types'
import { AnimatedNumber, Block } from './Block'
import { dayLabel, roomLabel } from './greeting'
import { EmptyNote } from './Soft'

/** "รอบคุยคืนนี้" — snap carousel: tonight first, then upcoming. */
export function SessionsCarousel() {
  const sessions = useSessions()
  const ready = useDataReady()
  const sorted = useMemo(() => [...sessions].sort((a, b) => a.dayOffset - b.dayOffset || a.time.localeCompare(b.time)), [sessions])
  const track = useRef<HTMLUListElement>(null)
  const scroll = (dir: 1 | -1) => {
    const el = track.current
    if (!el) return
    const card = el.querySelector('li')
    el.scrollBy({ left: dir * ((card?.clientWidth ?? 280) + 12), behavior: 'smooth' })
  }
  return (
    <Block
      id="home-sessions"
      title={t('รอบคุยคืนนี้', "Tonight's sessions")}
      icon={<CalendarClock size={18} strokeWidth={2.4} />}
      action={
        sorted.length > 1 && (
          <div className="hidden gap-2 md:flex">
            <IconButton label={t('เลื่อนไปทางซ้าย', 'Scroll left')} onClick={() => scroll(-1)}>
              <ChevronLeft size={20} />
            </IconButton>
            <IconButton label={t('เลื่อนไปทางขวา', 'Scroll right')} onClick={() => scroll(1)}>
              <ChevronRight size={20} />
            </IconButton>
          </div>
        )
      }
    >
      {!ready ? (
        <SessionsSkeleton />
      ) : !sorted.length ? (
        <EmptyNote
          face="sleepy"
          color="lavender"
          title={t('คืนนี้ยังไม่มีรอบคุยเลย', 'No sessions tonight yet')}
          sub={t(
            'แวะไปนั่งเล่นในห้องก่อนได้นะ หรือโพสต์กำลังหาชวนเพื่อนมาคุยกันเองก็ได้',
            "Hang out in a room for now, or post what you're looking for and start a chat yourself",
          )}
        >
          <ButtonLink to="/app/rooms" variant="secondary" className="w-full sm:w-auto">
            {t('ไปดูห้องต่างๆ', 'Browse rooms')}
          </ButtonLink>
          <ButtonLink to="/app/post" icon={<Plus size={18} strokeWidth={2.8} />} className="w-full sm:w-auto">
            {t('โพสต์กำลังหา', 'New post')}
          </ButtonLink>
        </EmptyNote>
      ) : (
        <ul
          ref={track}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-5 lg:mx-0 lg:scroll-px-0 lg:px-0"
        >
          {sorted.map((s, i) => (
            <SessionCard key={s.id} session={s} index={i} />
          ))}
        </ul>
      )}
    </Block>
  )
}

function SessionCard({ session: s, index }: { session: Session; index: number }) {
  const going = useMoshi((st) => st.going.includes(s.id))
  const toggleGoing = useMoshi((st) => st.toggleGoing)
  const room = useRoom(s.roomId)
  const me = useMoshi((st) => st.me)
  const person = usePerson(s.hostId)
  const host = s.hostId === me.id ? me : person
  const p = MOCHI[room?.color ?? 'cream']
  const count = s.going + (going ? 1 : 0)

  return (
    <motion.li
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ ...spring.soft, delay: Math.min(index, 4) * 0.05 }}
      className="w-[78%] max-w-[18rem] shrink-0 snap-start sm:w-72"
    >
      <TiltCard className="h-full" max={5} glare={false}>
        <article className="card relative flex h-full flex-col overflow-hidden p-4">
          <TiltGlare />
          {/* soft room-coloured glow in the corner */}
          <span aria-hidden className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full opacity-70 blur-2xl" style={{ background: p.base }} />

          <div className="relative flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-ink-soft">{dayLabel(s.dayOffset)}</p>
              <p className="font-display text-3xl leading-none font-bold tracking-tight">{s.time}</p>
            </div>
            {s.live ? <LiveBadge /> : room && <RoomIcon room={room} size={42} />}
          </div>

          <h3 className="relative mt-3 line-clamp-2 font-display text-[17px] leading-normal font-semibold">
            <Link to={`/app/rooms/${s.roomId}`} className="rounded-md hover:underline hover:decoration-2 hover:underline-offset-4">
              {s.title}
            </Link>
          </h3>
          {room && (
            <p className="relative mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
              {s.live && <RoomIcon room={room} size={20} />}
              <span className="truncate">
                {roomLabel(room.name)} · {t(`${s.durationMin} นาที`, `${s.durationMin} min`)}
              </span>
            </p>
          )}

          <div className="relative mt-auto flex items-center justify-between gap-2 pt-4">
            <div className="flex min-w-0 items-center gap-2">
              {host && <Avatar color={host.color} size={34} ring />}
              <div className="min-w-0 text-xs leading-normal">
                <p className="truncate text-ink-soft">
                  {host
                    ? t(`ชวนคุยโดย ${host.name}`, `Hosted by ${host.name}`)
                    : s.hostName
                      ? t(`ชวนคุยโดย ${s.hostName}`, `Hosted by ${s.hostName}`)
                      : t('มาคุยด้วยกันนะ', 'Come chat with us')}
                </p>
                <p className="font-semibold text-ink">
                  <AnimatedNumber value={count} /> {t('คนจะไป', 'going')}
                </p>
              </div>
            </div>
            <RsvpButton going={going} onToggle={() => toggleGoing(s.id)} title={s.title} />
          </div>
        </article>
      </TiltCard>
    </motion.li>
  )
}

function RsvpButton({ going, onToggle, title }: { going: boolean; onToggle: () => void; title: string }) {
  return (
    <motion.button
      type="button"
      aria-pressed={going}
      aria-label={going ? t(`ยกเลิกไปรอบ ${title}`, `Cancel RSVP for ${title}`) : t(`ไปรอบ ${title} ด้วย`, `I'm going to ${title}`)}
      onClick={onToggle}
      whileTap={{ scale: 0.9 }}
      transition={spring.bouncy}
      className={`relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 font-display text-sm font-semibold text-ink transition-colors ${
        going ? 'bg-mint shadow-[inset_0_-3px_0_rgb(59_38_34/0.12)]' : 'border border-line bg-white shadow-[var(--shadow-soft)] hover:bg-cream'
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={going ? 'on' : 'off'}
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0 }}
          transition={spring.bouncy}
          className="inline-flex"
        >
          {going ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
        </motion.span>
      </AnimatePresence>
      {going ? t('ไปแน่!', "I'm in!") : t('ไปด้วย', "I'm going")}
      {/* +1 that floats up when you RSVP */}
      <AnimatePresence>
        {going && (
          <motion.span
            key="plus"
            aria-hidden
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -26 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="pointer-events-none absolute -top-1 right-2 font-display text-sm font-bold text-ink"
          >
            +1
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

/** Two soft card outlines while sessions load. */
function SessionsSkeleton() {
  return (
    <div role="status" aria-label={t('กำลังโหลด', 'Loading')} className="flex gap-3 overflow-hidden pt-1 pb-5">
      {[0, 1].map((i) => (
        <div key={i} aria-hidden className="card h-52 w-[78%] max-w-[18rem] shrink-0 p-4 sm:w-72">
          <span className="block h-3 w-16 rounded-full bg-cream-3 motion-safe:animate-pulse" />
          <span className="mt-2 block h-7 w-24 rounded-full bg-cream-3 motion-safe:animate-pulse" />
          <span className="mt-4 block h-4 w-3/4 rounded-full bg-cream-3/70 motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function LiveBadge() {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-coral px-2.5 font-display text-xs font-bold tracking-wide text-ink shadow-[var(--shadow-puffy)]">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-90" />
        <span className="relative inline-flex size-2 rounded-full bg-white" />
      </span>
      LIVE
      <span className="sr-only">{t('กำลังคุยอยู่ตอนนี้', 'Chatting right now')}</span>
    </span>
  )
}
