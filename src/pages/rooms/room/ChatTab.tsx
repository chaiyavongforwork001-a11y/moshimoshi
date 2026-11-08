import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, ChevronUp, Hand, MessageCircleQuestion, PartyPopper } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Avatar, Button } from '@/components/ui'
import { useDailyQuestion, usePeople } from '@/data/hooks'
import { MOCHI } from '@/lib/colors'
import { useIsDesktop } from '@/lib/hooks'
import { displayName, getLang, known, t } from '@/lib/i18n'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { ChatMessage, Room, User } from '@/lib/types'
import { useIsMine } from '@/pages/people/lib'
import { Bone } from '@/pages/people/Skeleton'
import { ReactedBadge, SameToggle, type StackPerson } from '../bits'
import { parseWelcome, welcomeText } from '../roomData'
import { Composer, JoinToChat, type Draft } from './Composer'
import { MessageSheet, MoreButton, type MessageTarget } from './MessageActions'

const CONFETTI = (['butter', 'mint', 'lavender', 'pink', 'sky'] as const).map((c) => MOCHI[c].shade)
// quick lines I send as myself, so they're in my language
const SUGGESTIONS = {
  th: ['สวัสดีทุกคน!', 'เพิ่งเข้ามาใหม่ ฝากตัวด้วยนะ', 'วันนี้เป็นยังไงกันบ้าง'],
  en: ['Hi everyone!', "Hi, I'm new here! Nice to meet you", "How's everyone's day going?"],
}

/** Newest arrivals shown in one welcome card before "ดูอีก N คน". */
const WELCOMES_SHOWN = 3

type ChatItem = { welcomes: ChatMessage[] } | { message: ChatMessage; prev?: ChatMessage }

/** Welcome cards that come one after another share one card, so a busy day doesn't bury the conversation. */
function chatItems(messages: ChatMessage[]): ChatItem[] {
  const items: ChatItem[] = []
  messages.forEach((message, i) => {
    const last = items[items.length - 1]
    if (message.kind !== 'welcome') items.push({ message, prev: messages[i - 1] })
    else if (last && 'welcomes' in last) last.welcomes.push(message)
    else items.push({ welcomes: [message] })
  })
  return items
}

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
  onJoin,
  draft,
  onDraft,
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
  /** join this room, from the panel that stands in for the composer */
  onJoin: () => void
  /** a hello tapped before joining: it waits for the composer */
  draft: Draft | null
  onDraft: (draft: Draft) => void
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
  // anyone can read the chat; the server only takes messages from members
  const joined = useMoshi((s) => s.me.rooms.includes(room.id))
  const isMine = useIsMine()
  const people = usePeople()
  const byId = useMemo(() => new Map(people.map((u) => [u.id, u])), [people])
  const question = useDailyQuestion(room.id)
  const endRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const joinRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(messages.length)
  const prevTyping = useRef(typing)
  const settled = useRef(!loading)

  // joined from the panel right here: the composer that takes its place gets the focus
  const [typeNext, setTypeNext] = useState(false)
  if (!joined && typeNext) setTypeNext(false)

  // until I join, a hello waits on the join panel (and then in the composer) instead of going out
  const greet = (text: string, replyFrom?: string, isThanks?: boolean, to?: string) => {
    if (joined) onSend(text, replyFrom, isThanks)
    else onDraft({ text, to })
  }
  useEffect(() => {
    if (!draft || joined) return
    // after the jump to the newest message when it came from the people tab
    const timer = window.setTimeout(() => joinRef.current?.querySelector('button')?.focus({ preventScroll: true }), jump ? 360 : 0)
    return () => clearTimeout(timer)
  }, [draft, joined, jump])

  // ⋯ on someone else's message: one sheet for the whole chat
  const [acting, setActing] = useState<MessageTarget | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  // while it's open the chat doesn't scroll on by itself, so the ⋯ is still where it was afterwards
  const sheetOpen = useRef(false)
  const openActions = (target: MessageTarget, el: HTMLElement) => {
    opener.current = el
    sheetOpen.current = true
    setActing(target)
  }
  const closeActions = () => {
    sheetOpen.current = false
    setActing(null)
    // back to the ⋯ that opened it; after a block their messages (and that ⋯) are gone, so the chat itself
    requestAnimationFrame(() => {
      const el = opener.current
      if (el?.isConnected) el.focus()
      else logRef.current?.focus({ preventScroll: true })
    })
  }

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
    if (grew && !sheetOpen.current) endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' })
  }, [messages.length, typing, reduce, loading])

  useEffect(() => {
    if (!jump) return
    const timer = window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' }), 320)
    return () => clearTimeout(timer)
  }, [jump, reduce])

  const typer = typing ? byId.get(typing) : undefined
  const items = useMemo(() => chatItems(messages), [messages])

  return (
    <section aria-label={t(`แชทห้อง${room.name}`, `${room.name} chat`)}>
      {/* focusable from code only: it takes the focus when the ⋯ that had it is gone */}
      <div ref={logRef} role="log" tabIndex={-1} aria-label={t('ข้อความในห้อง', 'Room messages')} className="outline-none">
        <motion.ol variants={stagger(0.05)} initial="hidden" animate="show" className="flex flex-col">
          {loading && (
            <li role="status" className="flex flex-col gap-4">
              <span className="sr-only">{t('กำลังโหลดข้อความในห้อง…', 'Loading room messages…')}</span>
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
          {items.map((item) => {
            if ('welcomes' in item) {
              return (
                <motion.li key={item.welcomes[0].id} variants={fadeUp} className="my-3 first:mt-0">
                  <WelcomeCard messages={item.welcomes} mine={mine} people={people} me={me} isMine={isMine} onGreet={greet} />
                </motion.li>
              )
            }
            const { message: m, prev } = item
            if (m.kind === 'system') {
              return (
                <motion.li key={m.id} variants={fadeUp} className="my-3 text-center">
                  <span className="inline-block rounded-full bg-white/70 px-3 py-1 text-xs text-ink-soft">{known(m.text)}</span>
                </motion.li>
              )
            }
            const head = !prev || prev.userId !== m.userId || prev.kind === 'welcome' || prev.kind === 'system'
            const author = byId.get(m.userId)
            return (
              <motion.li key={m.id} variants={fadeUp} className={head ? 'mt-4 first:mt-0' : 'mt-1.5'}>
                {isMine(m.userId) ? (
                  <MyBubble message={m} me={me} />
                ) : (
                  <TheirBubble
                    message={m}
                    author={author}
                    byId={byId}
                    room={room}
                    head={head}
                    me={me}
                    same={sames.includes(m.id)}
                    onSame={() => toggleSame(m.id)}
                    // a line with no person behind it (the app's own) has nobody to report or block
                    onMore={
                      m.userId && m.userId !== 'system'
                        ? (el) => openActions({ message: m, name: author?.name, color: author?.color ?? 'cream' }, el)
                        : undefined
                    }
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
                <span className="pb-1 text-xs text-ink-soft">{t(`${typer.name} กำลังพิมพ์…`, `${typer.name} is typing…`)}</span>
              </motion.li>
            )}
          </AnimatePresence>
        </motion.ol>
      </div>
      {/* phones: room for the dock and the bottom nav below the newest message (the join panel is a little taller) */}
      <div
        ref={endRef}
        className={`h-px ${joined ? 'scroll-mb-[calc(14rem+env(safe-area-inset-bottom))]' : 'scroll-mb-[calc(16rem+env(safe-area-inset-bottom))]'} lg:scroll-mb-32`}
      />

      {joined ? (
        <Composer
          roomName={room.name}
          onSend={(text) => onSend(text)}
          suggestions={mine.length ? [] : SUGGESTIONS[getLang()]}
          desktop={desktop}
          initialText={draft?.text}
          autoFocus={typeNext}
        />
      ) : (
        <JoinToChat
          room={room}
          desktop={desktop}
          draft={draft}
          joinRef={joinRef}
          onJoin={() => {
            setTypeNext(true)
            onJoin()
          }}
        />
      )}
      <MessageSheet roomId={room.id} target={acting} onClose={closeActions} />
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
  onMore,
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
  /** ⋯ pressed: report the message or block its author */
  onMore?: (el: HTMLButtonElement) => void
}) {
  const u = author ?? { id: m.userId, name: t('เพื่อนในห้อง', 'Room member'), color: 'cream' as const, isOnline: false }
  const host = room.hostIds.includes(u.id)
  const people: StackPerson[] = [
    ...(same ? [{ id: 'me', color: me.color, face: 'happy' as const }] : []),
    ...(m.sameBy ?? []).map((id) => byId.get(id)).filter((p): p is User => !!p),
  ]
  return (
    // group/msg: with a mouse, the ⋯ shows while this message is hovered or has focus inside
    <div className="group/msg flex items-start gap-2.5">
      <div className="w-9 shrink-0">
        {head &&
          (author ? (
            <Link to={`/app/people/${u.id}`} aria-label={t(`ดูโปรไฟล์ ${u.name}`, `See ${u.name}'s profile`)} className="block rounded-full">
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
            {host && <span className="rounded-full bg-butter/70 px-2 py-px font-semibold text-ink">{t('พี่โมชิ', 'Mochi host')}</span>}
            <span className="text-ink-soft">{known(m.at)}</span>
          </p>
        )}
        <p className="max-w-full rounded-3xl rounded-tl-lg border border-line bg-white px-4 py-2.5 text-[15px] leading-relaxed [overflow-wrap:anywhere] text-ink shadow-[var(--shadow-soft)]">
          <RichText text={m.text} />
        </p>
        {/* gap-2: the ⋯'s wider hit area stays clear of "เหมือนกัน!" */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <SameToggle on={same} onToggle={onSame} people={people} />
          {onMore && <MoreButton name={author ? u.name : undefined} onOpen={onMore} />}
        </div>
      </div>
    </div>
  )
}

function MyBubble({ message: m, me }: { message: ChatMessage; me: User }) {
  const p = MOCHI[me.color]
  return (
    <div className="flex flex-col items-end">
      <p
        className="max-w-[82%] rounded-3xl rounded-br-lg px-4 py-2.5 text-[15px] leading-relaxed [overflow-wrap:anywhere] shadow-[var(--shadow-soft)] sm:max-w-[75%]"
        style={{ background: `linear-gradient(160deg, ${p.light}, ${p.base})`, color: p.ink }}
      >
        <RichText text={m.text} />
      </p>
      <div className="mt-1 flex max-w-[82%] flex-wrap items-center justify-end gap-x-2 gap-y-1 sm:max-w-[75%]">
        <ReactedBadge ids={m.sameBy} />
        <span className="mr-1 text-[11px] text-ink-soft">{known(m.at)}</span>
      </div>
    </div>
  )
}

interface WelcomeProps {
  mine: ChatMessage[]
  people: User[]
  me: User
  isMine: (id: string) => boolean
  /** `to`: the newcomer's name, for the join panel while I'm not in the room yet */
  onGreet: (text: string, replyFrom?: string, isThanks?: boolean, to?: string) => void
}

/** Newcomers just arrived: one warm card with a row (and a one-tap greeting) for each of them. */
function WelcomeCard({ messages, ...row }: { messages: ChatMessage[] } & WelcomeProps) {
  const [showAll, setShowAll] = useState(false)
  const hidden = showAll ? 0 : Math.max(0, messages.length - WELCOMES_SHOWN)
  const shown = hidden ? messages.slice(-WELCOMES_SHOWN) : messages
  const n = messages.length
  return (
    <div
      className="relative mx-auto max-w-xl overflow-hidden rounded-3xl border border-white px-4 pt-3 pb-1 shadow-[var(--shadow-soft)]"
      style={{ background: `linear-gradient(140deg, ${MOCHI.butter.light}, ${MOCHI.peach.light} 60%, ${MOCHI.pink.light})` }}
    >
      {/* confetti stays up in the corner, clear of the text */}
      <span aria-hidden className="pointer-events-none absolute top-2 right-3 block h-7 w-20">
        {CONFETTI.map((c, i) => (
          <span key={c} className="absolute size-1.5 rounded-full" style={{ background: c, top: `${[60, 10, 70, 25, 45][i]}%`, left: `${8 + i * 20}%` }} />
        ))}
      </span>
      <p className="flex items-center gap-1.5 pr-20 font-display text-sm font-semibold text-ink">
        <PartyPopper size={16} strokeWidth={2.4} className="shrink-0" aria-hidden />
        {n > 1 ? t(`เพื่อนใหม่มาแล้ว ${n} คน!`, `${n} new friends are here!`) : t('มีเพื่อนใหม่มาแล้ว!', 'A new friend is here!')}
      </p>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1 inline-flex min-h-11 items-center gap-1 rounded-full pr-2 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          <ChevronUp size={14} strokeWidth={2.6} aria-hidden />
          {t(`ดูอีก ${hidden} คน`, `Show ${hidden} more`)}
        </button>
      )}
      <ul className="divide-y divide-ink/5">
        {shown.map((m) => (
          <WelcomeRow key={m.id} message={m} {...row} />
        ))}
      </ul>
    </div>
  )
}

function WelcomeRow({ message, mine, people, me, isMine, onGreet }: { message: ChatMessage } & WelcomeProps) {
  // live cards carry the newcomer's id; demo cards only have the name in the text
  const self = isMine(message.userId)
  const parts = parseWelcome(message.text)
  const person = self ? me : (people.find((u) => u.id === message.userId) ?? (parts ? people.find((u) => u.name === parts.name) : undefined))
  const name = person?.name ?? parts?.name
  // sent as my own message, in my language; either language counts as already greeted
  const greetingTh = `ยินดีต้อนรับนะ ${name ?? 'เพื่อนใหม่'}! ดีใจที่ได้เจอ`
  const greetingEn = `Welcome, ${name ?? 'new friend'}! So glad you're here`
  const greeted = mine.some((m) => m.text === greetingTh || m.text === greetingEn)
  const face = <Avatar color={person?.color ?? 'sky'} size={44} face="wow" />
  const visit = parts?.visit ? t(`มาครั้งที่ ${parts.visit}`, `Visit #${parts.visit}`) : t('มาครั้งแรก', 'First visit')
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5">
      <span className="row-span-2 self-start">
        {person && !self ? (
          <Link to={`/app/people/${person.id}`} aria-label={t(`ดูโปรไฟล์ ${person.name}`, `See ${person.name}'s profile`)} className="block rounded-full">
            {face}
          </Link>
        ) : (
          face
        )}
      </span>
      {parts ? (
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 leading-snug">
          <span className="max-w-full truncate font-display font-semibold text-ink">{name ? displayName(name) : ''}</span>
          <span className="text-xs font-semibold whitespace-nowrap text-ink-soft">{self ? t('เราเอง', "That's you") : visit}</span>
        </p>
      ) : (
        <p className="min-w-0 text-sm [overflow-wrap:anywhere] text-ink">{welcomeText(message.text)}</p>
      )}
      {self ? (
        <span />
      ) : (
        <Button
          size="sm"
          variant="secondary"
          disabled={greeted}
          icon={greeted ? <Check size={15} strokeWidth={2.8} aria-hidden /> : <Hand size={15} strokeWidth={2.4} aria-hidden />}
          onClick={() => onGreet(t(greetingTh, greetingEn), person?.id, true, name ? displayName(name) : undefined)}
          aria-label={greeted ? undefined : t(`ทักทาย ${name ?? 'เพื่อนใหม่'}`, `Say hi to ${name ?? 'the new friend'}`)}
        >
          {greeted ? t('ทักแล้ว', 'Said hi') : t('ทักทาย', 'Say hi')}
        </Button>
      )}
      {parts && (
        <p className="col-span-2 mt-0.5 line-clamp-2 text-sm [overflow-wrap:anywhere] text-ink-soft" title={parts.hook}>
          {parts.hook ? `“${parts.hook}”` : t('มาทักทายกันหน่อยนะ', 'Come say hi!')}
        </p>
      )}
    </li>
  )
}

/** Quiet room: open with today's question instead of an empty chat. */
function QuestionStarter({ text, onOpen }: { text: string; onOpen: () => void }) {
  return (
    <div className="card relative overflow-hidden p-5">
      <span aria-hidden className="absolute -top-10 -right-8 size-32 rounded-full bg-lavender/30 blur-2xl" />
      <p className="relative inline-flex items-center gap-1.5 rounded-full bg-lavender/30 px-3 py-1 text-xs font-semibold text-ink">
        <MessageCircleQuestion size={14} strokeWidth={2.4} aria-hidden />
        {t('คำถามวันนี้', "Today's question")}
      </p>
      <p className="relative mt-3 font-display text-xl leading-snug font-semibold text-ink">{text}</p>
      <p className="relative mt-1 text-sm text-ink-soft">
        {t('ห้องยังเงียบๆ อยู่เลย เริ่มจากตอบคำถามนี้ หรือทักทายเพื่อนๆ ก่อนก็ได้นะ', "It's quiet in here. Start with this question, or just say hi to everyone")}
      </p>
      <Button variant="soft" className="relative mt-4" onClick={onOpen}>
        {t('ไปตอบคำถามกัน', "Let's answer it")}
      </Button>
    </div>
  )
}
