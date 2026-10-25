import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { TiltCard } from '@/components/motion'
import { MochiStage, View3D } from '@/components/three'
import { Avatar, RoomIcon } from '@/components/ui'
import { useRooms, useRoomStats } from '@/data/hooks'
import { MOCHI } from '@/lib/colors'
import { spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Mood, Room } from '@/lib/types'
import { MOOD_BY_KEY, MOOD_ROOMS, MOODS } from './moods'

type Phase = 'idle' | 'typing' | 'replied'

/**
 * "วันนี้เป็นไงบ้าง?" — the mascot asks, you answer with a mood, it listens
 * (typing…) and answers kindly with rooms that fit the feeling.
 * The 3D box is kept free of opaque DOM so the canvas behind shows through.
 */
export function MoodHero() {
  const mood = useMoshi((s) => s.mood)
  const setMood = useMoshi((s) => s.setMood)
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>(mood ? 'replied' : 'idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const choose = (m: Mood) => {
    window.clearTimeout(timer.current)
    setMood(m)
    if (reduce) return setPhase('replied')
    setPhase('typing')
    timer.current = window.setTimeout(() => setPhase('replied'), 1100)
  }

  const def = mood ? MOOD_BY_KEY[mood] : undefined
  const replied = phase === 'replied' && !!def
  const allRooms = useRooms()
  const rooms = useMemo(() => roomsForMood(allRooms, def?.key), [allRooms, def?.key])

  return (
    <section aria-labelledby="mood-title" className="relative grid gap-2 md:grid-cols-[15rem_minmax(0,1fr)] md:items-center md:gap-5 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <h2 id="mood-title" className="sr-only">
        วันนี้เป็นไงบ้าง
      </h2>

      {/* mascot (+ first bubble beside it on phones) */}
      <div className="flex items-center gap-1">
        <View3D className="h-44 w-[44%] shrink-0 sm:h-52 md:h-72 md:w-full lg:h-80" label="น้องโมชิ มาสคอตของ moshimoshi กำลังทักทาย">
          <MochiStage color="peach" expression={replied ? def.expression : 'talk'} accessory={replied ? def.accessory : 'none'} zoom={0.92} />
        </View3D>
        <AskBubble className="md:hidden" />
      </div>

      <TiltCard max={3} lift={1.004} radius="2rem">
        <div className="glass relative rounded-[2rem] p-4 sm:p-5">
          <AskBubble className="mb-4 hidden md:flex" />

          <div role="group" aria-label="ความรู้สึกวันนี้" className="flex flex-wrap gap-2">
            {MOODS.map((m) => {
              const on = mood === m.key
              const p = MOCHI[m.color]
              return (
                <motion.button
                  key={m.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose(m.key)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.92 }}
                  animate={{ scale: on ? [1, 1.1, 1] : 1 }}
                  transition={{ ...spring.bouncy, scale: { duration: 0.35 } }}
                  className="inline-flex h-11 items-center gap-1.5 rounded-full border px-4 font-display text-[15px] font-semibold text-ink transition-colors"
                  style={
                    on
                      ? { background: p.base, borderColor: p.shade, boxShadow: `inset 0 -3px 0 ${p.shade}` }
                      : { background: p.light, borderColor: 'transparent' }
                  }
                >
                  <m.Icon size={18} strokeWidth={2.4} aria-hidden />
                  {m.label}
                </motion.button>
              )
            })}
          </div>

          <div aria-live="polite" className="mt-1">
            <AnimatePresence mode="popLayout" initial={false}>
              {def && (
                <motion.p
                  key={`say-${def.key}`}
                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={spring.bouncy}
                  className="mt-4 ml-auto flex w-fit max-w-[85%] items-center gap-2 rounded-3xl rounded-br-md px-4 py-2.5 font-semibold text-ink"
                  style={{ background: MOCHI[def.color].base, transformOrigin: 'right bottom' }}
                >
                  <def.Icon size={18} aria-hidden />
                  <span className="sr-only">เรา: </span>
                  {def.say}
                </motion.p>
              )}

              {phase === 'typing' && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={spring.soft}
                  className="mt-3 flex items-end gap-2"
                >
                  <Avatar color="peach" size={34} face="talk" />
                  <TypingDots />
                </motion.div>
              )}

              {replied && (
                <motion.div key={`reply-${def.key}`} initial="hidden" animate="show" exit={{ opacity: 0 }} variants={stagger(0.12)} className="mt-3">
                  <motion.div variants={bubbleIn} className="flex items-end gap-2" style={{ transformOrigin: 'left bottom' }}>
                    <Avatar color="peach" size={34} face={def.expression} />
                    <div className="max-w-[88%] rounded-3xl rounded-bl-md bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
                      <p className="font-display text-[17px] leading-normal font-semibold text-ink">
                        <span className="sr-only">น้องโมชิ: </span>
                        {def.reply}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">{def.follow}</p>
                    </div>
                  </motion.div>

                  <motion.ul variants={stagger(0.08, 0.1)} className="mt-3 grid gap-2 sm:grid-cols-2 sm:pl-11">
                    {rooms.map((r) => (
                      <motion.li key={r.id} variants={bubbleIn}>
                        <MoodRoomLink room={r} />
                      </motion.li>
                    ))}
                  </motion.ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </TiltCard>
    </section>
  )
}

/** The mood's rooms that exist; if none do (a fresh server), the first non-lobby rooms. */
function roomsForMood(all: Room[], mood: Mood | undefined): Room[] {
  if (!mood) return []
  const picked = MOOD_ROOMS[mood].map((id) => all.find((r) => r.id === id)).filter((r): r is Room => !!r)
  if (picked.length) return picked
  return all.filter((r) => !r.isLobby).slice(0, 2)
}

function MoodRoomLink({ room: r }: { room: Room }) {
  const online = useRoomStats(r.id)?.online ?? r.onlineCount
  return (
    <Link
      to={`/app/rooms/${r.id}`}
      className="group flex min-h-16 items-center gap-3 rounded-2xl bg-white/90 p-3 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
    >
      <RoomIcon room={r} size={44} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display font-semibold">{r.name}</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span className={`size-2 rounded-full ${online > 0 ? 'bg-success' : 'bg-ink-faint'}`} aria-hidden />
          {online > 0 ? `${online} คนอยู่ในห้องตอนนี้` : 'แวะไปเปิดไฟรอเพื่อนๆ ได้นะ'}
        </span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}

const bubbleIn = {
  hidden: { opacity: 0, scale: 0.85, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: spring.bouncy },
}

/** Mascot's opening line, styled as an incoming chat bubble with a tail. */
function AskBubble({ className = '' }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ ...spring.bouncy, delay: 0.35 }}
      style={{ transformOrigin: 'left center' }}
      className={`relative flex-col ${className}`}
    >
      <p className="mb-1 ml-1 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
        <span className="size-2 rounded-full bg-success" aria-hidden />
        น้องโมชิ
      </p>
      <div className="relative rounded-3xl rounded-bl-md bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
        <span aria-hidden className="absolute bottom-3 -left-2 size-4 rotate-45 rounded-[4px] bg-white" />
        <p className="relative font-display text-xl leading-normal font-semibold text-ink sm:text-2xl">วันนี้เป็นไงบ้าง?</p>
        <p className="relative text-sm text-ink-soft">เล่าให้โมชิฟังหน่อย แตะเลือกได้เลย</p>
      </div>
    </motion.div>
  )
}

function TypingDots() {
  const reduce = useReducedMotion()
  return (
    <span className="inline-flex items-center gap-1 rounded-3xl rounded-bl-md bg-white px-4 py-3.5 shadow-[var(--shadow-soft)]" role="status">
      <span className="sr-only">น้องโมชิกำลังพิมพ์</span>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="size-2 rounded-full bg-ink-faint"
          animate={reduce ? undefined : { y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}
