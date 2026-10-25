import { AnimatePresence, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Avatar, ButtonLink, PageHeader } from '@/components/ui'
import { useChat, useDataMode, useDataReady, useMatch, usePerson } from '@/data/hooks'
import { useIsDesktop } from '@/lib/hooks'
import { useMoshi } from '@/lib/store'
import type { MatchResult, User } from '@/lib/types'
import { toOpener, useIsMine } from '@/pages/people/lib'
import { PageSkeleton } from '@/pages/people/Skeleton'
import { ChatHeader, EndedNote, IcebreakerCard, IncomingActions, IncomingBanner, RingingBanner, TrustLadder, WaitingNote, type Topic } from './chat/ChatPanels'
import { Composer } from './chat/Composer'
import { MessageList, TypingBubble } from './chat/MessageList'
import { mentionsShared, pickReply, pickupLine } from './chat/replies'
import { chatPhase } from './lib'

export default function ChatPage() {
  const { chatId = '' } = useParams()
  const ready = useDataReady()
  const chat = useChat(chatId)
  const them = usePerson(chat?.withUserId)
  const match = useMatch(chat?.withUserId)
  if (!chat || !them || !match) return ready ? <ChatNotFound /> : <PageSkeleton label="กำลังเปิดแชท…" />
  return <ChatRoom key={chatId} chatId={chatId} them={them} match={match} />
}

const BASE_QUICK = ['เหมือนกันเลย!', '555 จริง', 'เล่าต่อสิ อยากฟัง', 'วันนี้เป็นไงบ้าง', 'ไว้คุยกันใหม่นะ']

function ChatRoom({ chatId, them, match }: { chatId: string; them: User; match: MatchResult }) {
  const desktop = useIsDesktop()
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const chat = useChat(chatId)
  const demoMode = useDataMode() === 'demo'
  const isMine = useIsMine()
  const meColor = useMoshi((s) => s.me.color)
  const sames = useMoshi((s) => s.sames)
  const toggleSame = useMoshi((s) => s.toggleSame)
  const sendChatMessage = useMoshi((s) => s.sendChatMessage)
  const receiveMessage = useMoshi((s) => s.receiveChatMessage)
  const markRead = useMoshi((s) => s.markChatRead)
  const theyReact = useMoshi((s) => s.reactToChatMessage)
  const respond = useMoshi((s) => s.respondMoshi)

  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [consent, setConsent] = useState(false)
  const [initialIds] = useState(() => new Set(chat?.messages.map((m) => m.id) ?? []))
  const timers = useRef<number[]>([])
  const turn = useRef(0)
  const input = useRef<HTMLTextAreaElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const firstScroll = useRef(true)

  const messages = chat?.messages ?? []
  const phase = chat ? chatPhase(chat) : 'open'
  const waiting = phase === 'ringing'
  // demo chats (and live chats with sample people, which never reach the server) answer by themselves
  const simulated = demoMode || !chat?.status
  const lastTheirs = [...messages].reverse().find((m) => !isMine(m.userId))?.id

  const topics = useMemo<Topic[]>(() => {
    const tips = [chat?.icebreaker, ...match.icebreakers].filter((t): t is string => !!t)
    return [...new Set(tips)].map((tip) => ({ tip, text: toOpener(tip, them.name).text }))
  }, [chat?.icebreaker, match.icebreakers, them.name])

  const quick = useMemo(() => {
    const tag = match.sharedTags[0]?.tag
    return tag ? [BASE_QUICK[0], `ชอบ ${tag.label} ตรงไหนที่สุด?`, ...BASE_QUICK.slice(1)] : BASE_QUICK
  }, [match.sharedTags])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  useEffect(() => clearTimers, [])

  // a moshi opened under its temporary id: swap in the real one so reload / bookmarks keep working
  const realId = chat?.id
  useEffect(() => {
    if (realId && realId !== chatId && !realId.startsWith('tmp-')) navigate(`/app/chats/${realId}`, { replace: true })
  }, [realId, chatId, navigate])

  // read up to their latest message (on open, and whenever they write while we're here)
  useEffect(() => {
    markRead(chatId)
  }, [chatId, lastTheirs, markRead])

  // a moshi still ringing → they pick up after a moment (simulated chats only)
  useEffect(() => {
    if (!waiting || !simulated) return
    const ids = [
      window.setTimeout(() => receiveMessage(chatId, 'system', `${them.name}รับสายแล้ว! คุยกันได้เลย`, 'system'), 3600),
      window.setTimeout(() => setTyping(true), 4300),
      window.setTimeout(() => {
        setTyping(false)
        receiveMessage(chatId, them.id, pickupLine(them, match.sharedTags))
      }, 6200),
    ]
    return () => ids.forEach((t) => window.clearTimeout(t))
    // runs once per open; `waiting` flips to false as soon as they pick up
  }, [chatId])

  // keep the newest message in view
  useEffect(() => {
    const behavior: ScrollBehavior = firstScroll.current || reduce ? 'auto' : 'smooth'
    firstScroll.current = false
    const go = () => {
      if (desktop && scroller.current) scroller.current.scrollTo({ top: scroller.current.scrollHeight, behavior })
      else window.scrollTo({ top: document.documentElement.scrollHeight, behavior })
    }
    const raf = requestAnimationFrame(go)
    return () => cancelAnimationFrame(raf)
  }, [messages.length, typing, desktop, reduce])

  if (!chat) return null

  const send = (text: string) => {
    // consent first: until they pick up, the opener is the only message we send
    if (phase !== 'open') return
    sendChatMessage(chatId, text)
    setDraft('')
    if (!simulated) return
    // the last message we sent (just appended by the store)
    const mine = useMoshi.getState().chats.find((c) => c.id === chatId)?.messages.at(-1)
    clearTimers()
    setTyping(false)
    const reply = pickReply(text, them, match.sharedTags, turn.current++)
    if (mine && mentionsShared(text, match.sharedTags)) later(() => theyReact(chatId, mine.id, them.id), 900)
    later(() => setTyping(true), 700)
    later(
      () => {
        setTyping(false)
        receiveMessage(chatId, them.id, reply)
      },
      700 + Math.min(2600, 1200 + reply.length * 22),
    )
  }

  // the store flips the status right away (and rolls back with a toast if the server says no)
  const answer = (accept: boolean) => {
    respond(chatId, accept)
    if (!accept) navigate('/app/chats', { replace: true })
  }

  const applyTopic = (text: string) => {
    setDraft(text)
    requestAnimationFrame(() => {
      const el = input.current
      if (!el) return
      el.focus({ preventScroll: true })
      el.setSelectionRange(el.value.length, el.value.length)
    })
  }

  return (
    <div className="-mx-4 flex min-h-dvh flex-col lg:mx-0 lg:mt-8 lg:-mb-8 lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:overflow-hidden lg:rounded-[2rem] lg:border lg:border-line lg:bg-white/55 lg:shadow-[var(--shadow-soft)] lg:backdrop-blur-xl">
      <h1 className="sr-only">แชทกับ{them.name}</h1>
      <ChatHeader them={them} level={match.level} typing={typing} waiting={waiting} incoming={phase === 'incoming'} />

      <div ref={scroller} className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-5 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:px-6">
        {/* topics + trust ladder only make sense once they've picked up */}
        {phase === 'open' && <IcebreakerCard topics={topics} onUse={applyTopic} />}
        {/* live: nothing locks links or LINE ids, so no switch that pretends to */}
        {phase === 'open' &&
          (simulated ? <TrustLadder name={them.name} consent={consent} onToggle={() => setConsent((c) => !c)} /> : <TrustLadder name={them.name} />)}
        <AnimatePresence>
          {waiting && <RingingBanner key="ringing" them={them} />}
          {phase === 'incoming' && <IncomingBanner key="incoming" them={them} />}
        </AnimatePresence>
        <div className="mt-2 flex-1">
          <MessageList messages={messages} them={them} meColor={meColor} sames={sames} onSame={toggleSame} initialIds={initialIds} isMine={isMine} />
          <AnimatePresence>{typing && <TypingBubble key="typing" them={them} />}</AnimatePresence>
        </div>
      </div>

      {phase === 'ringing' ? (
        <WaitingNote name={them.name} />
      ) : phase === 'incoming' ? (
        <IncomingActions name={them.name} onAccept={() => answer(true)} onDecline={() => answer(false)} />
      ) : phase === 'ended' ? (
        <EndedNote name={them.name} />
      ) : (
        <Composer
          value={draft}
          onChange={setDraft}
          onSend={send}
          name={them.name}
          quickReplies={quick}
          locked
          lockedHint={simulated ? undefined : `ยังส่งรูปในแชทไม่ได้นะ ถ้าจะแลกลิงก์หรือไลน์กับ${them.name} ตกลงกันก่อนค่อยส่งนะ`}
          inputRef={input}
        />
      )}
    </div>
  )
}

function ChatNotFound() {
  return (
    <div>
      <PageHeader back="/app/chats" title="ไม่เจอแชทนี้" />
      <div className="card mt-4 flex flex-col items-center gap-3 rounded-3xl px-6 py-12 text-center">
        <Avatar color="peach" size={96} face="sleepy" />
        <h2 className="font-display text-xl font-semibold">สายนี้เงียบไปแล้ว</h2>
        <p className="max-w-sm text-ink-soft">แชทนี้อาจไม่มีแล้ว หรือลิงก์ไม่ถูกต้อง กลับไปดูแชททั้งหมด หรือหาคนคลื่นเดียวกันคุยต่อก็ได้นะ</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <ButtonLink to="/app/chats">กลับไปหน้าแชท</ButtonLink>
          <ButtonLink to="/app/people" variant="soft">
            หาคนคลื่นเดียวกัน
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
