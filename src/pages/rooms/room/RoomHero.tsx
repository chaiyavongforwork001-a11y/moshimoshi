import { motion, useReducedMotion } from 'motion/react'
import { Clock3, Users } from 'lucide-react'
import { forwardRef } from 'react'
import { KineticText } from '@/components/motion'
import { RoomIcon } from '@/components/ui'
import { MochiStage, View3D } from '@/components/three'
import { usePeople } from '@/data/hooks'
import { MOCHI } from '@/lib/colors'
import { dateLocale, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { Room } from '@/lib/types'
import { AvatarStack, JoinButton, PresenceLine } from '../bits'

// The painted card has a round "porthole" cut out with a CSS mask; the room's
// 3D mochi lives in that hole (the WebGL canvas sits behind the DOM).
const PORTHOLE = 'radial-gradient(circle var(--r) at calc(100% - var(--c)) var(--c), transparent calc(var(--r) - 1px), #000 var(--r))'

export const RoomHero = forwardRef<HTMLElement, { room: Room; joined: boolean; onToggleJoin: () => void }>(function RoomHero(
  { room, joined, onToggleJoin },
  ref,
) {
  const reduce = useReducedMotion()
  const p = MOCHI[room.color]
  const people = usePeople()
  const hosts = room.hostIds.map((id) => people.find((u) => u.id === id)).filter((u) => !!u)
  return (
    <section
      ref={ref}
      aria-labelledby="room-title"
      className="relative isolate overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)] [--c:72px] [--r:57px] sm:[--c:94px] sm:[--r:74px]"
    >
      <div
        aria-hidden
        className="grain absolute inset-0 -z-10"
        style={{ background: `linear-gradient(150deg, ${p.light} 0%, ${p.base} 58%, ${p.shade} 125%)`, maskImage: PORTHOLE, WebkitMaskImage: PORTHOLE }}
      >
        {/* radio waves rippling out from the room icon */}
        <svg className="absolute -top-24 -left-24 size-[26rem] text-white" viewBox="0 0 200 200" fill="none">
          {[30, 52, 74, 96].map((r, i) => (
            <motion.circle
              key={r}
              cx="70"
              cy="70"
              r={r}
              stroke="currentColor"
              strokeWidth="1.6"
              initial={{ opacity: 0.35 - i * 0.07 }}
              animate={reduce ? undefined : { opacity: [0.1, 0.4 - i * 0.07, 0.1] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.45, ease: 'easeInOut' }}
            />
          ))}
        </svg>
      </div>

      {/* porthole with the room's mochi */}
      <div className="absolute top-[calc(var(--c)_-_var(--r))] right-[calc(var(--c)_-_var(--r))] size-[calc(var(--r)*2)]">
        <View3D className="size-full rounded-full" label={t(`น้องโมชิประจำห้อง${room.name}โบกมือทักทาย`, `${room.name}'s little Mochi waving hello`)}>
          <MochiStage color={room.color} expression="happy" zoom={1.2} />
        </View3D>
        <span aria-hidden className="pointer-events-none absolute -inset-1 rounded-full border-[3px] border-dashed border-white/90 shadow-[inset_0_6px_14px_rgb(59_38_34/0.12)]" />
        <motion.span
          aria-hidden
          initial={{ opacity: 0, scale: 0.6, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ ...spring.bouncy, delay: 0.6 }}
          className="absolute -bottom-2 -left-10 rounded-2xl rounded-br-md bg-white px-3 py-1 font-display text-sm font-semibold whitespace-nowrap text-ink shadow-[var(--shadow-soft)] sm:-left-12"
        >
          {t('โมชิโมชิ~', 'Moshi moshi~')}
        </motion.span>
      </div>

      <div className="relative p-5 sm:p-7">
        <div className="pr-[calc(var(--r)*2_+_1.25rem)]">
          <motion.span
            className="inline-flex"
            animate={reduce ? undefined : { y: [0, -5, 0], rotate: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <RoomIcon room={room} size={72} />
          </motion.span>
          <h1 id="room-title" className="mt-3 font-display text-[1.75rem] leading-tight font-bold sm:text-4xl" style={{ color: p.ink }}>
            <KineticText text={room.name} delay={0.2} />
          </h1>
          <p className="mt-1 font-semibold" style={{ color: p.ink }}>
            {room.tagline}
          </p>
        </div>
        <p className="mt-3 max-w-xl text-[15px]" style={{ color: p.ink }}>
          {room.vibe}
        </p>

        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          <li className="inline-flex h-9 items-center rounded-full bg-white/70 px-3">
            <PresenceLine room={room} />
          </li>
          <li className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/70 px-3 font-semibold text-ink">
            <Users size={15} strokeWidth={2.4} aria-hidden />
            {t(
              `สมาชิก ${(room.memberCount + (joined ? 1 : 0)).toLocaleString('th-TH')} คน`,
              `${(room.memberCount + (joined ? 1 : 0)).toLocaleString(dateLocale())} ${room.memberCount + (joined ? 1 : 0) === 1 ? 'member' : 'members'}`,
            )}
          </li>
          <li className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/70 px-3 font-semibold text-ink">
            <Clock3 size={15} strokeWidth={2.4} aria-hidden />
            {t(`คึกคักช่วง ${room.primeTime}`, `Busiest ${room.primeTime}`)}
          </li>
        </ul>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          {hosts.length > 0 ? (
            <div className="flex items-center gap-3">
              <AvatarStack people={hosts.map((h) => ({ id: h.id, color: h.color, face: 'happy' as const }))} size={44} ring label={t(`พี่โมชิ ${hosts.map((h) => h.name).join(' และ ')}`, `${hosts.length === 1 ? 'Mochi host' : 'Mochi hosts'} ${hosts.map((h) => h.name).join(' and ')}`)}
              />
              <div className="leading-snug" style={{ color: p.ink }}>
                <p className="font-display font-semibold">
                  {t('พี่โมชิ', hosts.length === 1 ? 'Mochi host' : 'Mochi hosts')} {hosts.map((h) => h.name).join(' · ')}
                </p>
                <p className="text-sm">{t('คอยดูแลให้ห้องนี้อบอุ่นเสมอ', 'Keeping this room warm and cozy')}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold" style={{ color: p.ink }}>
              {t('ห้องนี้อบอุ่นได้เพราะทุกคนช่วยกันดูแลนะ', 'This room stays warm because everyone looks out for each other')}
            </p>
          )}
          <JoinButton room={room} joined={joined} onToggle={onToggleJoin} size="lg" />
        </div>
      </div>
    </section>
  )
})
