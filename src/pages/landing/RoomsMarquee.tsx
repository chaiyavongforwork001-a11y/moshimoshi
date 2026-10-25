import {
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react'
import { ArrowRight, Clock3, DoorOpen, Pause, Play, UsersRound } from 'lucide-react'
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar, ButtonLink, IconButton, RoomIcon, TagChip } from '@/components/ui'
import { ROOMS, USER_BY_ID } from '@/data/mock'
import { TAGS } from '@/data/tags'
import { MOCHI } from '@/lib/colors'
import { spring } from '@/lib/motion'
import type { Room } from '@/lib/types'
import { SectionIntro } from './shared'

// a hand-picked spread of tags so the second row feels varied
const TAG_ROW = TAGS.filter((_, i) => i % 2 === 0).slice(0, 26)

/**
 * Infinite horizontal loop driven by a motion value (no CSS keyframes), so
 * it can pause smoothly on hover / focus, stop when scrolled away, and be
 * stopped for good with the pause button. Keyboard focus slides the focused
 * card into the visible band. Page scroll speeds it up, flips its direction
 * and leans the strip a little (scroll velocity → speed + skew).
 */
function Marquee({
  children,
  speed = 36,
  reverse = false,
  label,
  pad = 'py-3',
  stopped = false,
}: {
  children: ReactNode
  speed?: number
  reverse?: boolean
  label: string
  /** vertical room for shadows / hover lift (the edge mask clips at the box) */
  pad?: string
  /** viewer pressed pause */
  stopped?: boolean
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const width = useRef(0)
  const paused = useRef(false)
  const visible = useInView(wrap, { margin: '120px' })
  const stoppedRef = useRef(stopped)
  const { scrollY } = useScroll()
  const scrollVel = useSpring(useVelocity(scrollY), { stiffness: 380, damping: 50 })
  const skewX = useTransform(scrollVel, [-2400, 0, 2400], [7, 0, -7], { clamp: true })
  useEffect(() => {
    stoppedRef.current = stopped
  }, [stopped])

  useEffect(() => {
    const el = first.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      width.current = el.offsetWidth
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useAnimationFrame((_, delta) => {
    const w = width.current
    if (!visible || paused.current || stoppedRef.current || !w) return
    const v = scrollVel.get()
    const boost = 1 + Math.min(5, Math.abs(v) / 450)
    const flip = v < -40 ? -1 : 1
    let next = x.get() + (reverse ? 1 : -1) * flip * speed * boost * (Math.min(delta, 64) / 1000)
    if (next <= -w) next += w
    if (next > 0) next -= w
    x.set(next)
  })

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    paused.current = true
    // bring the focused card into the unmasked band (the strip clips, so the browser can't scroll to it)
    const card = (e.target as HTMLElement).closest<HTMLElement>('a, button')
    const box = wrap.current
    if (!card || !box || !first.current?.contains(card)) return
    const inset = Math.max(24, box.clientWidth * 0.08)
    const target = -(card.offsetLeft - inset)
    const r = card.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    if (r.left >= b.left + inset * 0.75 && r.right <= b.right - inset * 0.75) return
    animate(x, target, spring.soft)
  }

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) paused.current = false
  }

  return (
    <div
      ref={wrap}
      role="region"
      aria-label={label}
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onFocus={onFocus}
      onBlur={onBlur}
      className="relative overflow-x-clip [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
    >
      <motion.div style={{ x, skewX: stopped ? 0 : skewX }} className="flex w-max">
        <div ref={first} className={`flex shrink-0 gap-4 pr-4 ${pad}`}>
          {children}
        </div>
        <div className={`flex shrink-0 gap-4 pr-4 ${pad}`} aria-hidden inert>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

function RoomCard({ room, i, still }: { room: Room; i: number; still?: boolean }) {
  const p = MOCHI[room.color]
  const host = USER_BY_ID[room.hostIds[0]]
  return (
    <Link
      to={`/app/rooms/${room.id}`}
      className={`group relative block shrink-0 rounded-[1.75rem] border border-white bg-white p-4 shadow-[var(--shadow-soft)] transition-[translate,rotate,box-shadow] duration-300 ease-squish hover:-translate-y-1.5 hover:rotate-0 hover:shadow-[var(--shadow-lift)] focus-visible:rotate-0 ${
        still ? 'w-full' : 'w-[17rem] sm:w-[19rem]'
      } ${still ? '' : i % 2 ? 'rotate-[1.4deg]' : '-rotate-[1.2deg]'}`}
      style={{ backgroundImage: `linear-gradient(170deg, ${p.light} 0%, white 55%)` }}
    >
      <span className="flex items-start gap-3">
        <span className="transition-transform duration-300 ease-squish group-hover:-rotate-6 group-hover:scale-110">
          <RoomIcon room={room} size={52} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg font-semibold">{room.name}</span>
          <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-ink">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            {room.onlineCount} คนกำลังคุย
          </span>
        </span>
      </span>
      <span className="mt-3 line-clamp-2 block min-h-[3.1rem] text-sm text-ink-soft">{room.tagline}</span>
      <span className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-line pt-3 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1">
          <Clock3 size={13} aria-hidden />
          คึกสุด {room.primeTime}
        </span>
        {host ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Avatar color={host.color} size={22} ring />
            <span className="truncate">พี่{host.name}ดูแล</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <UsersRound size={13} aria-hidden />
            {room.memberCount.toLocaleString('th-TH')}
          </span>
        )}
      </span>
    </Link>
  )
}

export function RoomsMarquee() {
  const reduce = useReducedMotion()
  const [stopped, setStopped] = useState(false)
  return (
    <section id="rooms" aria-labelledby="rooms-title" className="relative scroll-mt-24 py-20 outline-none lg:py-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
        <SectionIntro id="rooms-title" eyebrow="ห้องคุย" icon={<DoorOpen size={15} />} tone="bg-mint/60" title="มีห้องที่ใช่รออยู่ทุกคืน">
          ทุกห้องมีคนคุยกันอยู่ มีพี่โมชิคอยต้อนรับ ไม่ต้องรู้จักใครก่อนก็นั่งได้เลย
        </SectionIntro>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {!reduce && (
            <IconButton label={stopped ? 'เลื่อนต่อ' : 'หยุดเลื่อน'} aria-pressed={stopped} onClick={() => setStopped((v) => !v)}>
              {stopped ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
            </IconButton>
          )}
          <ButtonLink to="/app/rooms" variant="secondary" iconRight={<ArrowRight size={18} />}>
            ดูห้องทั้งหมด
          </ButtonLink>
        </div>
      </div>

      {reduce ? (
        <ul className="mx-auto mt-10 grid max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {ROOMS.map((r, i) => (
            <li key={r.id}>
              <RoomCard room={r} i={i} still />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <Marquee label="ห้องคุยทั้งหมด เลื่อนอัตโนมัติ หยุดเมื่อชี้หรือโฟกัส" speed={34} pad="pt-5 pb-10" stopped={stopped}>
            {ROOMS.map((r, i) => (
              <RoomCard key={r.id} room={r} i={i} />
            ))}
          </Marquee>
          <Marquee label="ตัวอย่างเรื่องที่ชอบ" speed={26} reverse pad="py-2" stopped={stopped}>
            {TAG_ROW.map((t) => (
              <TagChip key={t.id} tag={t} />
            ))}
          </Marquee>
        </div>
      )}
    </section>
  )
}
