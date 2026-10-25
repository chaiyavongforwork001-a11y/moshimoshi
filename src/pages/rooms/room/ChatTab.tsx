import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Hand, MessageCircleQuestion, PartyPopper } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router'
import { Avatar, Button } from '@/components/ui'
import { useDailyQuestion, usePeople } from '@/data/hooks'
import { MOCHI } from '@/lib/colors'
import { useIsDesktop } from '@/lib/hooks'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { ChatMessage, Room, User } from '@/lib/types'
import { useIsMine } from '@/pages/people/lib'
import { Bone } from '@/pages/people/Skeleton'
import { SameToggle, type StackPerson } from '../bits'
import { welcomedName } from '../roomData'
import { Composer } from './Composer'

const CONFETTI = (['butter', 'mint', 'lavender', 'pink', 'sky'] as const).map((c) => MOCHI[c].shade)
const SUGGESTIONS = ['สวัสดีทุกคน!', 'เพิ่งเข้ามาใหม่ ฝากตัวด้วยนะ', 'วันนี้เป็นยังไงกันบ้าง']

/** Splits "@name" mentions out so they can be highlighted. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(@\S+)/).map((part, i) =>
        part.startsWith('@') ? (
          <b key={i} className="rounded-md bg-butter/60 px-1 font-semibold">
            {part}
          </b>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

export function ChatTab({
  room,
  messages,
  mine,
  typing,
  seeded,
  onSend,
  onOpenQuestion,
  jump,
  loading = false,
}: {
  room: Room
  messages: ChatMessage[]
  mine: ChatMessage[]
  typing: string | null
  seeded: boolean
  onSend: (text: string, replyFrom?: string, isThanks?: boolean) => void
  onOpenQuestion: () => void
  /** scroll to the newest message right after opening (e.g. greeted from the people tab) */
  jump: boolean
  /** live: the room's history hasn't arrived yet */
  loading?: boolean
}) {
  const desktop = useIsDesktop()
  const reduce = useReducedMotion()
  const me = useMoshi((s) => s.me)
  const sames = useMoshi((s) => s.sames)
  const toggleSame = useMoshi((s) => s.toggleSame)
  const isMine = useIsMine()
  const people = usePeople()
  const byId = useMemo(() => new Map(people.map((u) => [u.id, u])), [people])
  const question = useDailyQuestion(room.id)
  const endRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(messages.length)
  const prevTyping = useRef(typing)
  const settled = useRef(!loading)

  // follow the conversation when something new arrives (not on first paint or when the
  // history lands, so the hero stays in view)
  useEffect(() => {
    if (!settled.current) {
      settled.current = !loading
      prevCount.current = messages.length
      prevTyping.current = typing
      return
    }
    const grew = messages.length > prevCount.current || (!!typing && typing !== prevTyping.current)
    prevCount.current = messages.length
    prevTyping.current = typing
    if (grew) endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' })
  }, [messages.length, typing, reduce, loading])

  useEffect(() => {
    if (!jump) return
    const t = window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' }), 320)
    return () => clearTimeout(t)
  }, [jump, reduce])

  const typer = typing ? byId.get(typing) : undefined

  return (
    <section aria-label={`แชทห้อง${room.name}`}>
      <div role="log" aria-label="ข้อความในห้อง">
        <motion.ol variants={stagger(0.05)} initial="hidden" animate="show" className="flex flex-col">
          {loading && (
            <li role="status" className="flex flex-col gap-4">
              <span className="sr-only">กำลังโหลดข้อความในห้อง…</span>
              {['w-3/5', 'w-2/5', 'w-1/2'].map((w) => (
                <span key={w} aria-hidden className="flex items-start gap-2.5">
                  <Bone className="size-9 shrink-0" />
                  <span className={`flex flex-col gap-2 ${w}`}>
                    <Bone className="h-3 w-1/3" />
                    <Bone className="h-10 w-full" />
                  </span>
                </span>
              ))}
            </li>
          )}
          {!seeded && !loading && question && (
            <motion.li variants={fadeUp} className="mb-4">
              <QuestionStarter text={question.text} onOpen={onOpenQuestion} />
            </motion.li>
          )}
          {messages.map((m, i) => {
            if (m.kind === 'welcome') {
              return (
                <motion.li key={m.id} variants={fadeUp} className="my-4">
                  <WelcomeCard message={m} mine={mine} people={people} me={me} isMine={isMine} onGreet={onSend} />
                </motion.li>
              )
            }
            if (m.kind === 'system') {
              return (
                <motion.li key={m.id} variants={fadeUp} className="my-3 text-center">
                  <span className="inline-block rounded-full bg-white/70 px-3 py-1 text-xs text-ink-soft">{m.text}</span>
                </motion.li>
              )
            }
            const prev = messages[i - 1]
            const head = !prev || prev.userId !== m.userId || prev.kind === 'welcome' || prev.kind === 'system'
            return (
              <motion.li key={m.id} variants={fadeUp} className={head ? 'mt-4 first:mt-0' : 'mt-1.5'}>
                {isMine(m.userId) ? (
                  <MyBubble message={m} me={me} />
                ) : (
                  <TheirBubble
                    message={m}
                    author={byId.get(m.userId)}
                    byId={byId}
                    room={room}
                    head={head}
                    me={me}
                    same={sames.includes(m.id)}
                    onSame={() => toggleSame(m.id)}
                  />
                )}
              </motion.li>
            )
          })}
          <AnimatePresence>
            {typer && (
              <motion.li
                key="typing"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                transition={spring.bouncy}
                className="mt-4 flex items-end gap-2.5"
              >
                <Avatar color={typer.color} size={36} face="talk" />
                <span className="inline-flex items-center gap-1 rounded-3xl rounded-bl-lg border border-line bg-white px-4 py-3.5 shadow-[var(--shadow-soft)]">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="size-2 rounded-full bg-ink-soft/60"
                      animate={reduce ? undefined : { y: [0, -4, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }}
                    />
                  ))}
                </span>
                <span className="pb-1 text-xs text-ink-soft">{typer.name} กำลังพิมพ์…</span>
              </motion.li>
            )}
          </AnimatePresence>
        </motion.ol>
      </div>
      <div ref={endRef} className="h-px scroll-mb-[calc(14rem+env(safe-area-inset-bottom))] lg:scroll-mb-32" />

      <Composer roomName={room.name} onSend={(t) => onSend(t)} suggestions={mine.length ? [] : SUGGESTIONS} desktop={desktop} />
    </section>
  )
}

function TheirBubble({
  message: m,
  author,
  byId,
  room,
  head,
  me,
  same,
  onSame,
}: {
  message: ChatMessage
  /** undefined: someone we can't see any more (left, or blocked) */
  author: User | undefined
  byId: Map<string, User>
  room: Room
  head: boolean
  me: User
  same: boolean
  onSame: () => void
}) {
  const u = author ?? { id: m.userId, name: 'เพื่อนในห้อง', color: 'cream' as const, isOnline: false }
  const host = room.hostIds.includes(u.id)
  const people: StackPerson[] = [
    ...(same ? [{ id: 'me', color: me.color, face: 'happy' as const }] : []),
    ...(m.sameBy ?? []).map((id) => byId.get(id)).filter((p): p is User => !!p),
  ]
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-9 shrink-0">
        {head &&
          (author ? (
            <Link to={`/app/people/${u.id}`} aria-label={`ดูโปรไฟล์ ${u.name}`} className="block rounded-full">
              <Avatar color={u.color} size={36} online={u.isOnline} ring={host} />
            </Link>
          ) : (
            <Avatar color={u.color} size={36} />
          ))}
      </div>
      <div className="flex max-w-[82%] min-w-0 flex-col items-start sm:max-w-[75%]">
        {head && (
          <p className="mb-1 flex flex-wrap items-center gap-x-1.5 text-xs leading-normal">
            <span className="font-display text-sm font-semibold text-ink">{u.name}</span>
            {host && <span className="rounded-full bg-butter/70 px-2 py-px font-semibold text-ink">พี่โมชิ</span>}
            <span className="text-ink-soft">{m.at}</span>
          </p>
        )}
        <p className="rounded-3xl rounded-tl-lg border border-line bg-white px-4 py-2.5 text-[15px] leading-relaxed text-ink shadow-[var(--shadow-soft)]">
          <RichText text={m.text} />
        </p>
        <SameToggle on={same} onToggle={onSame} people={people} className="mt-1.5" />
      </div>
    </div>
  )
}

function MyBubble({ message: m, me }: { message: ChatMessage; me: User }) {
  const p = MOCHI[me.color]
  return (
    <div className="flex flex-col items-end">
      <p
        className="max-w-[82%] rounded-3xl rounded-br-lg px-4 py-2.5 text-[15px] leading-relaxed shadow-[var(--shadow-soft)] sm:max-w-[75%]"
        style={{ background: `linear-gradient(160deg, ${p.light}, ${p.base})`, color: p.ink }}
      >
        <RichText text={m.text} />
      </p>
      <span className="mt-1 mr-1 text-[11px] text-ink-soft">{m.at}</span>
    </div>
  )
}

/** A newcomer just arrived: a little party card with a one-tap greeting. */
function WelcomeCard({
  message,
  mine,
  people,
  me,
  isMine,
  onGreet,
}: {
  message: ChatMessage
  mine: ChatMessage[]
  people: User[]
  me: User
  isMine: (id: string) => boolean
  onGreet: (text: string, replyFrom?: string, isThanks?: boolean) => void
}) {
  // live cards carry the newcomer's id; demo cards only have the name in the text
  const self = isMine(message.userId)
  const parsed = welcomedName(message.text)
  const newcomer = self ? me : (people.find((u) => u.id === message.userId) ?? (parsed ? people.find((u) => u.name === parsed) : undefined))
  const name = newcomer?.name ?? parsed
  const greeting = `ยินดีต้อนรับนะ ${name ?? 'เพื่อนใหม่'}! ดีใจที่ได้เจอ`
  const greeted = mine.some((m) => m.text === greeting)
  return (
    <div
      className="relative mx-auto max-w-md overflow-hidden rounded-3xl border border-white px-5 pt-5 pb-4 text-center shadow-[var(--shadow-soft)]"
      style={{ background: `linear-gradient(140deg, ${MOCHI.butter.light}, ${MOCHI.peach.light} 60%, ${MOCHI.pink.light})` }}
    >
      {/* confetti specks */}
      {CONFETTI.map((c, i) => (
        <span
          key={c}
          aria-hidden
          className="absolute size-2 rounded-full"
          style={{ background: c, top: `${12 + ((i * 37) % 60)}%`, left: i % 2 ? `${6 + i * 3}%` : `${82 + i * 2}%`, rotate: `${i * 30}deg` }}
        />
      ))}
      <span className="relative inline-flex">
        <Avatar color={newcomer?.color ?? 'sky'} size={56} face="wow" />
        <PartyPopper size={20} strokeWidth={2.4} className="absolute -top-1 -right-4 text-ink" aria-hidden />
      </span>
      <p className="mt-1 text-xs font-semibold tracking-wide text-ink-soft">มีเพื่อนใหม่มาแล้ว!</p>
      <p className="mt-1 text-[15px] text-ink">{message.text}</p>
      {!self && (
        <div className="mt-3 flex justify-center">
          <Button
            variant={greeted ? 'secondary' : 'primary'}
            disabled={greeted}
            icon={<Hand size={16} strokeWidth={2.4} />}
            onClick={() => onGreet(greeting, newcomer?.id, true)}
          >
            {greeted ? 'ทักแล้ว' : 'ทักทาย'}
          </Button>
        </div>
      )}
    </div>
  )
}

/** Quiet room: open with today's question instead of an empty chat. */
function QuestionStarter({ text, onOpen }: { text: string; onOpen: () => void }) {
  return (
    <div className="card relative overflow-hidden p-5">
      <span aria-hidden className="absolute -top-10 -right-8 size-32 rounded-full bg-lavender/30 blur-2xl" />
      <p className="relative inline-flex items-center gap-1.5 rounded-full bg-lavender/30 px-3 py-1 text-xs font-semibold text-ink">
        <MessageCircleQuestion size={14} strokeWidth={2.4} aria-hidden />
        คำถามวันนี้
      </p>
      <p className="relative mt-3 font-display text-xl leading-snug font-semibold text-ink">{text}</p>
      <p className="relative mt-1 text-sm text-ink-soft">ห้องยังเงียบๆ อยู่เลย เริ่มจากตอบคำถามนี้ หรือทักทายเพื่อนๆ ก่อนก็ได้นะ</p>
      <Button variant="soft" className="relative mt-4" onClick={onOpen}>
        ไปตอบคำถามกัน
      </Button>
    </div>
  )
}
