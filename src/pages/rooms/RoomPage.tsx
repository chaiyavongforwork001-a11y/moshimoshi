import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, DoorClosed, MessageCircleQuestion, MessagesSquare, Search, Users } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Avatar, ButtonLink, IconButton, RoomIcon, tabId, tabPanelId, Tabs, Zone, type TabItem } from '@/components/ui'
import { useDataReady, useIntents, useRoom, useRoomHistoryReady } from '@/data/hooks'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Room, User } from '@/lib/types'
import { PageSkeleton } from '@/pages/people/Skeleton'
import { ChatTab } from './room/ChatTab'
import type { Draft } from './room/Composer'
import { useRoomToggle } from './LeaveRoom'
import { IntentsTab } from './room/IntentsTab'
import { MembersTab } from './room/MembersTab'
import { QuestionTab } from './room/QuestionTab'
import { RoomHero } from './room/RoomHero'
import { SessionCard } from './room/SessionCard'
import { useRoomChat } from './room/useRoomChat'

type RoomTab = 'chat' | 'question' | 'looking' | 'people'
const TAB_KEYS: RoomTab[] = ['chat', 'question', 'looking', 'people']

export default function RoomPage() {
  const { roomId = '' } = useParams()
  const ready = useDataReady()
  const room = useRoom(roomId)
  if (!room && !ready) return <PageSkeleton label={t('กำลังเปิดห้อง…', 'Opening the room…')} />
  if (!room) return <RoomNotFound />
  return <RoomView key={room.id} room={room} />
}

function RoomView({ room }: { room: Room }) {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab') as RoomTab | null
  const tab: RoomTab = raw && TAB_KEYS.includes(raw) ? raw : 'chat'
  const joined = useMoshi((s) => s.me.rooms.includes(room.id))
  const { toggle, sheet } = useRoomToggle()
  const lookingCount = useIntents({ roomId: room.id }).length
  const chat = useRoomChat(room)
  const historyReady = useRoomHistoryReady(room.id)
  const [jump, setJump] = useState(false)
  // a hello tapped before joining (the server only takes room messages from members): it waits on
  // the chat's join panel, then in the composer
  const [draft, setDraft] = useState<Draft | null>(null)
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  // after the composer that replaced the join panel has picked it up
  useEffect(() => {
    if (joined) setDraft(null)
  }, [joined])

  const tabs: TabItem<RoomTab>[] = [
    { key: 'chat', label: t('คุยกัน', 'Chat'), icon: <MessagesSquare size={16} strokeWidth={2.4} /> },
    { key: 'question', label: t('คำถามวันนี้', 'Question'), icon: <MessageCircleQuestion size={16} strokeWidth={2.4} /> },
    { key: 'looking', label: t('หาเพื่อน', 'Find friends'), icon: <Search size={16} strokeWidth={2.4} />, badge: lookingCount },
    { key: 'people', label: t('คน', 'People'), icon: <Users size={16} strokeWidth={2.4} /> },
  ]

  const goTab = (k: RoomTab, opts: { jumpToEnd?: boolean } = {}) => {
    setJump(!!opts.jumpToEnd)
    // a waiting hello belongs to this visit to the chat only
    setDraft(null)
    setParams(k === 'chat' ? {} : { tab: k }, { replace: true, preventScrollReset: true })
  }

  /** From a tab further down: bring the tab bar back into view so the switch is visible. */
  const goTabAndShow = (k: RoomTab) => {
    goTab(k)
    tabsRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const greetMember = (u: User) => {
    const text = t(`@${u.name} สวัสดี!`, `@${u.name} hi!`)
    if (joined) chat.send(text, u.id)
    goTab('chat', { jumpToEnd: true })
    // not in the room yet: the chat's join panel holds it (set after goTab, which clears it)
    if (!joined) setDraft({ text, to: u.name })
  }

  return (
    <div className="pb-4">
      <RoomTopBar room={room} heroRef={heroRef} />
      <RoomHero ref={heroRef} room={room} joined={joined} onToggleJoin={() => toggle(room)} />
      {sheet}
      <SessionCard room={room} />

      <Zone
        tone={room.color}
        className="mt-6"
        head={
          <div ref={tabsRef} className="min-w-0 flex-1 scroll-mt-24 lg:scroll-mt-8">
            <Tabs items={tabs} value={tab} onChange={(k) => goTab(k)} idBase="room" className="w-fit max-w-full" />
          </div>
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            role="tabpanel"
            id={tabPanelId('room', tab)}
            aria-labelledby={tabId('room', tab)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}
            transition={spring.soft}
          >
            {tab === 'chat' && (
              <ChatTab
                room={room}
                messages={chat.messages}
                mine={chat.mine}
                typing={chat.typing}
                seeded={chat.seeded}
                onSend={chat.send}
                onOpenQuestion={() => goTabAndShow('question')}
                onJoin={() => toggle(room)}
                draft={draft}
                onDraft={setDraft}
                jump={jump}
                loading={!historyReady}
              />
            )}
            {tab === 'question' && <QuestionTab room={room} />}
            {tab === 'looking' && <IntentsTab room={room} />}
            {tab === 'people' && <MembersTab room={room} onGreet={greetMember} />}
          </motion.div>
        </AnimatePresence>
      </Zone>
    </div>
  )
}

/** Back button; the room name slides in once the hero scrolls away. */
function RoomTopBar({ room, heroRef }: { room: Room; heroRef: RefObject<HTMLElement | null> }) {
  const navigate = useNavigate()
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { rootMargin: '-96px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [heroRef])

  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/app/rooms')
  }

  return (
    <div
      className={`safe-top sticky top-0 z-30 -mx-4 mb-3 flex items-center gap-3 px-4 pb-2 transition-[background-color,backdrop-filter] duration-300 lg:mx-0 lg:rounded-b-3xl lg:px-2 lg:pt-6 ${
        stuck ? 'bg-cream/80 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <IconButton label={t('ย้อนกลับ', 'Back')} onClick={back}>
        <ChevronLeft size={22} />
      </IconButton>
      <AnimatePresence>
        {stuck && (
          <motion.div
            className="flex min-w-0 items-center gap-2.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={spring.soft}
          >
            <RoomIcon room={room} size={34} />
            <span className="truncate font-display text-lg font-semibold">{room.name}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RoomNotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="relative">
        <motion.span
          className="inline-flex"
          initial={{ rotate: -8, y: 10, opacity: 0 }}
          animate={{ rotate: 0, y: 0, opacity: 1 }}
          transition={spring.bouncy}
        >
          <Avatar color="lavender" size={120} face="sleepy" />
        </motion.span>
        <motion.span
          className="absolute -top-2 -right-6 flex size-12 items-center justify-center rounded-full bg-white shadow-[var(--shadow-soft)]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring.bouncy, delay: 0.25 }}
          aria-hidden
        >
          <DoorClosed size={22} strokeWidth={2.4} />
        </motion.span>
      </div>
      <h1 className="mt-5 font-display text-2xl font-semibold">{t('ก๊อกๆ? …ไม่เจอห้องนี้เลย', "Knock knock? …this room isn't here")}</h1>
      <p className="mt-2 max-w-sm text-ink-soft">
        {t(
          'ห้องนี้อาจย้ายไปแล้ว หรือลิงก์พิมพ์ผิดไปนิดนึง ไม่เป็นไรนะ ยังมีห้องอื่นรอเราอยู่',
          'This room may have moved, or the link has a tiny typo. No worries, other rooms are waiting for you',
        )}
      </p>
      <ButtonLink to="/app/rooms" className="mt-6" icon={<ChevronLeft size={18} strokeWidth={2.6} />}>
        {t('กลับไปดูห้องทั้งหมด', 'Back to all rooms')}
      </ButtonLink>
    </div>
  )
}
