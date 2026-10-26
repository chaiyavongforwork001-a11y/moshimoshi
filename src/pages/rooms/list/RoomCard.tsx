import { motion } from 'motion/react'
import { ArrowRight, CalendarClock, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { TiltCard, TiltGlare } from '@/components/motion'
import { RoomIcon, TagChip } from '@/components/ui'
import { MochiCrowd, View3D } from '@/components/three'
import { usePeople, useSessions } from '@/data/hooks'
import { TAG_BY_ID } from '@/data/tags'
import { MOCHI } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { MochiColor, Room, User } from '@/lib/types'
import { AvatarStack, HostBadge, JoinButton, PresenceLine } from '../bits'
import { kindredMembers, nextSession, roomMembers, sessionWhen, sharedRoomTags } from '../roomData'

interface CardProps {
  room: Room
  me: User
  joined: boolean
  onToggle: () => void
  /** "เร็วๆ นี้" tab: surface the next session */
  showSession?: boolean
}

// Whole card is clickable through the stretched title link; buttons sit above it (z-10).
const stretched =
  "outline-none after:absolute after:inset-0 after:z-[5] after:rounded-[inherit] after:content-['']"

function KindredLine({ room, me }: { room: Room; me: User }) {
  const kindred = kindredMembers(room.id, me, usePeople())
  const shared = sharedRoomTags(room, me)
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-ink">
      <Sparkles size={15} strokeWidth={2.4} className="shrink-0" aria-hidden />
      <span className="truncate">
        {kindred.length > 0 ? (
          <>
            {t('มี ', '')}
            <b className="font-display">{kindred.length}</b>
            {t(' คนที่ชอบเรื่องเดียวกับเรา', kindred.length === 1 ? ' person loves what you love' : ' people love what you love')}
          </>
        ) : shared.length > 0 ? (
          t(`มี ${TAG_BY_ID[shared[0]]?.label} ที่เราชอบด้วย`, `Also on your profile: ${TAG_BY_ID[shared[0]]?.label}`)
        ) : (
          t('ห้องใหม่ เพื่อนใหม่ ลองแวะไปทักดูนะ', 'New room, new friends. Pop in and say hi')
        )}
      </span>
    </span>
  )
}

export function RoomCard({ room, me, joined, onToggle, showSession }: CardProps) {
  const p = MOCHI[room.color]
  const members = roomMembers(room.id, usePeople())
  const sessions = useSessions()
  const shared = sharedRoomTags(room, me)
  const tags = [...shared, ...room.tags.filter((t) => !shared.includes(t))].slice(0, 3)
  const session = showSession ? nextSession(room.id, sessions) : undefined
  return (
    <TiltCard className="h-full" glare={false}>
      <motion.article
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.985 }}
        transition={spring.soft}
        className="group relative isolate flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-white p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)] has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-lavender md:p-5"
      >
        <TiltGlare />
        {/* soft colour glow in the corner, grows on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 -z-10 size-48 rounded-full opacity-60 blur-2xl transition-transform duration-500 group-hover:scale-125"
          style={{ background: p.base }}
        />
        <div className="flex items-start gap-3.5">
          <RoomIcon room={room} size={54} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="pt-0.5 font-display text-lg leading-snug font-semibold">
                <Link to={`/app/rooms/${room.id}`} className={stretched} data-cursor={t('แวะดูห้อง', 'Peek in')}>
                  {room.name}
                </Link>
              </h3>
              <span className="md:hidden">
                <JoinButton room={room} joined={joined} onToggle={onToggle} compact />
              </span>
              <span className="hidden md:inline-flex">
                <HostBadge userId={room.hostIds[0]} withName={false} />
              </span>
            </div>
            <p className="line-clamp-2 text-sm text-ink-soft">{room.tagline}</p>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mt-3 hidden flex-wrap gap-1.5 md:flex">
            {tags.map((t) => TAG_BY_ID[t] && <TagChip key={t} tag={TAG_BY_ID[t]} selected={shared.includes(t)} size="sm" />)}
          </div>
        )}

        {session && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-ink" style={{ background: p.light }}>
            <CalendarClock size={16} strokeWidth={2.4} className="shrink-0" aria-hidden />
            <span className="min-w-0 truncate">
              <b className="font-display">{sessionWhen(session)}</b> · {session.title}
            </span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <PresenceLine room={room} />
          <AvatarStack people={members} size={26} max={4} />
        </div>

        <div className="mt-auto pt-3">
          <div className="flex min-h-11 items-center justify-between gap-3 border-t border-dashed border-line pt-3">
            <KindredLine room={room} me={me} />
            <span className="md:hidden">
              <HostBadge userId={room.hostIds[0]} withName={false} />
            </span>
            <span className="hidden md:inline-flex">
              <JoinButton room={room} joined={joined} onToggle={onToggle} />
            </span>
          </div>
        </div>
      </motion.article>
    </TiltCard>
  )
}

/** The top pick: a "window" with the room's members as 3D mochi, plus why it fits. */
export function FeaturedRoomCard({ room, me, joined, onToggle }: CardProps) {
  const p = MOCHI[room.color]
  const members = roomMembers(room.id, usePeople())
  const shared = sharedRoomTags(room, me)
  const fallback: MochiColor[] = ['peach', 'mint', 'lavender', 'butter', 'pink']
  const colors = [...members.map((u) => u.color), ...fallback].slice(0, Math.max(3, Math.min(4, members.length)))
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={spring.soft}
      className="group relative isolate overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)] ring-2 ring-white has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-lavender md:grid md:grid-cols-[1.15fr_1fr]"
    >
      {/* 3D window: deliberately unfilled so the shared canvas shows through. The view is
          inset so its (rectangular) scissor stays inside the rounded corners; the whole card
          is one link, so the crowd is decorative here (no tap/hover) */}
      <div className="relative h-44 md:order-2 md:h-auto md:min-h-[19rem]">
        <View3D className="absolute! inset-x-3 top-3 bottom-0 md:inset-3" label={t(`เพื่อนๆ ในห้อง${room.name}กำลังรออยู่`, `Friends in ${room.name} are waiting`)}>
          <MochiCrowd colors={colors} interactive={false} />
        </View3D>
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink shadow-[var(--shadow-soft)]">
          <PresenceLine room={room} className="text-xs!" />
        </span>
      </div>

      <div className="p-5 md:p-7" style={{ background: `linear-gradient(160deg, #fff 10%, ${p.light} 100%)` }}>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-butter/60 px-3 py-1 text-xs font-semibold text-ink">
          <Sparkles size={14} strokeWidth={2.4} aria-hidden />
          {t('เหมาะกับเราที่สุดตอนนี้', 'Your best fit right now')}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <RoomIcon room={room} size={60} />
          <div className="min-w-0">
            <h2 className="font-display text-2xl leading-tight font-bold">
              <Link to={`/app/rooms/${room.id}`} className={stretched} data-cursor={t('แวะดูห้อง', 'Peek in')}>
                {room.name}
              </Link>
            </h2>
            <HostBadge userId={room.hostIds[0]} className="mt-1" />
          </div>
        </div>
        <p className="mt-3 text-[15px] text-ink-soft">{room.vibe}</p>
        {shared.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shared.map((t) => TAG_BY_ID[t] && <TagChip key={t} tag={TAG_BY_ID[t]} selected size="sm" />)}
          </div>
        )}
        <div className="mt-4 flex items-center gap-2.5">
          <AvatarStack people={members} size={30} max={4} />
          <KindredLine room={room} me={me} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <JoinButton room={room} joined={joined} onToggle={onToggle} />
          <span aria-hidden className="inline-flex items-center gap-1 font-display text-sm font-semibold text-ink">
            {t('แวะไปดูห้อง', 'Take a look')}
            <ArrowRight size={16} strokeWidth={2.6} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </motion.article>
  )
}
