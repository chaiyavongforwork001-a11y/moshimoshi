import { AnimatePresence, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Avatar, ButtonLink, PageHeader } from '@/components/ui'
import { useChat, useDataMode, useDataReady, useMatch, usePerson } from '@/data/hooks'
import { useIsDesktop } from '@/lib/hooks'
import { getLang, L, t, tx } from '@/lib/i18n'
import { ImageError, prepareImage, type PreparedImage } from '@/lib/image'
import { useMoshi } from '@/lib/store'
import type { MatchResult, User } from '@/lib/types'
import { toOpener, useIsMine } from '@/pages/people/lib'
import { PageSkeleton } from '@/pages/people/Skeleton'
import { ChatHeader, EndedNote, HelloSentBanner, IcebreakerCard, IncomingActions, IncomingBanner, TrustLadder, WaitingNote, type Topic } from './chat/ChatPanels'
import { Composer } from './chat/Composer'
import { ImageViewer, SendImageSheet, type PhotoView } from './chat/ImageSheets'
import { MessageList, TypingBubble } from './chat/MessageList'
import { mentionsShared, pickReply, pickupLine } from './chat/replies'
import { chatPhase } from './lib'

export default function ChatPage() {
  const { chatId = '' } = useParams()
  const ready = useDataReady()
  const chat = useChat(chatId)
  const them = usePerson(chat?.withUserId)
  const match = useMatch(chat?.withUserId)
  if (!chat || !them || !match) return ready ? <ChatNotFound /> : <PageSkeleton label={t('กำลังเปิดแชท…', 'Opening chat…')} />
  return <ChatRoom key={chatId} chatId={chatId} them={them} match={match} />
}

const BASE_QUICK = [
  L('เหมือนกันเลย!', 'Same here!'),
  L('555 จริง', 'Haha so true'),
  L('เล่าต่อสิ อยากฟัง', 'Tell me more!'),
  L('วันนี้เป็นไงบ้าง', "How's your day"),
  L('ไว้คุยกันใหม่นะ', 'Talk again soon!'),
]

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
  const setMediaConsent = useMoshi((s) => s.setMediaConsent)
  const receiveMediaConsent = useMoshi((s) => s.receiveMediaConsent)
  const sendChatImage = useMoshi((s) => s.sendChatImage)
  const deleteChatMessage = useMoshi((s) => s.deleteChatMessage)
  const reportChatMessage = useMoshi((s) => s.reportChatMessage)
  const notify = useMoshi((s) => s.notify)

  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  // a photo picked and prepared, waiting for "ส่งรูปนี้"
  const [picked, setPicked] = useState<PreparedImage | null>(null)
  const [preparing, setPreparing] = useState(false)
  // the photo open in the viewer (the message itself is looked up below, so it stays current)
  const [view, setView] = useState<(PhotoView & { path?: string }) | null>(null)
  // a picked photo goes out once, even if the closing sheet takes a second tap
  const sent = useRef<PreparedImage | null>(null)
  const photoButton = useRef<HTMLButtonElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const ladder = useRef<HTMLDivElement>(null)
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
  const consent = chat?.consent ?? { me: false, them: false }
  // บันไดความไว้ใจ ขั้น 2: photos while both say yes
  const unlocked = consent.me && consent.them
  // the viewed photo as it is now: it follows the temporary → server id swap and sending → sent,
  // and is undefined once it's gone (the path is a fallback should a rebuilt message lose its localId)
  const viewed = view
    ? (messages.find((m) => (m.localId ?? m.id) === view.key) ?? (view.path ? messages.find((m) => m.image?.path === view.path) : undefined))
    : undefined

  const topics = useMemo<Topic[]>(() => {
    // a pinned tip written in Thai (demo chats) would be the only Thai card in English mode
    const pinned = chat?.icebreaker && (getLang() === 'th' || !/[\u0E00-\u0E7F]/.test(chat.icebreaker)) ? chat.icebreaker : undefined
    const tips = [pinned, ...match.icebreakers].filter((tip): tip is string => !!tip)
    return [...new Set(tips)].map((tip) => ({ tip, text: toOpener(tip, them.name).text }))
  }, [chat?.icebreaker, match.icebreakers, them.name])

  const quick = useMemo(() => {
    const tag = match.sharedTags[0]?.tag
    const base = BASE_QUICK.map(tx)
    return tag ? [base[0], t(`ชอบ ${tag.label} ตรงไหนที่สุด?`, `${tag.label}: what do you love most about it?`), ...base.slice(1)] : base
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

  // a hello still waiting → they accept after a moment (simulated chats only)
  useEffect(() => {
    if (!waiting || !simulated) return
    const ids = [
      // stored in Thai like every system line; shown through systemText()
      window.setTimeout(() => receiveMessage(chatId, 'system', `${them.name}ตอบรับแล้ว! คุยกันได้เลย`, 'system'), 3600),
      window.setTimeout(() => setTyping(true), 4300),
      window.setTimeout(() => {
        setTyping(false)
        receiveMessage(chatId, them.id, pickupLine(them, match.sharedTags))
      }, 6200),
    ]
    return () => ids.forEach((t) => window.clearTimeout(t))
    // runs once per open; `waiting` flips to false as soon as they pick up
  }, [chatId])

  // simulated chats: they say yes a moment after we do
  useEffect(() => {
    if (!simulated || !consent.me || consent.them) return
    const timer = window.setTimeout(() => {
      receiveMediaConsent(chatId, true)
      receiveMessage(chatId, them.id, t('โอเคเลย ส่งรูปหากันได้แล้ว 😊', 'Sure! We can send each other photos now 😊'))
    }, 1600)
    return () => window.clearTimeout(timer)
  }, [simulated, consent.me, consent.them, chatId, them.id, receiveMediaConsent, receiveMessage])

  // a picked photo that never went out: let its preview go (a sent one lives on as the local copy)
  const handedOver = useRef<string | null>(null)
  useEffect(
    () => () => {
      if (picked && handedOver.current !== picked.url) URL.revokeObjectURL(picked.url)
    },
    [picked],
  )
  const setPickedQuietly = (next: PreparedImage | null) => {
    if (picked) handedOver.current = picked.url
    setPicked(next)
  }

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

  const pickImage = (file: File) => {
    if (!unlocked || preparing) return
    setPreparing(true)
    prepareImage(file)
      .then(setPicked)
      .catch((err) => notify(photoProblem(err)))
      .finally(() => setPreparing(false))
  }

  const sendPicked = () => {
    const image = picked
    if (!image || sent.current === image) return
    sent.current = image
    if (!unlocked) {
      notify(t('ตอนนี้ส่งรูปไม่ได้แล้ว ต้องกดยินยอมทั้งคู่ก่อนนะ', 'Photos are locked now: you both need to agree first'))
      setPicked(null)
      return
    }
    // the store keeps the preview URL as the photo's local copy, so it isn't revoked here
    sendChatImage(chatId, image)
    setPickedQuietly(null)
    if (!simulated) return
    later(() => setTyping(true), 900)
    later(() => {
      setTyping(false)
      receiveMessage(chatId, them.id, t('น่ารักมากเลย!', 'Aww, love it!'))
    }, 2600)
  }

  // the store flips the status right away (and rolls back with a toast if the server says no)
  const answer = (accept: boolean) => {
    respond(chatId, accept)
    if (!accept) navigate('/app/chats', { replace: true })
  }

  // the bubble that opened the viewer is gone (deleted, unsent, removed by the team), so focus would
  // fall to the page: the composer's photo button takes it once the sheet has let go of the page,
  // or the message list when there's no composer (a closed chat)
  const refocus = (after?: () => void) =>
    requestAnimationFrame(() => {
      const target = photoButton.current ?? log.current
      target?.focus({ preventScroll: true })
      after?.()
    })

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
      <h1 className="sr-only">{t(`แชทกับ${them.name}`, `Chat with ${them.name}`)}</h1>
      <ChatHeader them={them} level={match.level} typing={typing} waiting={waiting} incoming={phase === 'incoming'} />

      {/* lg:relative: the card's backdrop blur would otherwise hold the list's sr-only labels, which then
          spill out below this scroller and let the card itself scroll (header gone, a gap under the composer) */}
      <div ref={scroller} className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-5 *:shrink-0 lg:relative lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:px-6">
        {/* topics + trust ladder only make sense once they've picked up */}
        {phase === 'open' && <IcebreakerCard topics={topics} onUse={applyTopic} />}
        {phase === 'open' && (
          <div ref={ladder} className="scroll-mt-24">
            <TrustLadder name={them.name} consent={consent} onToggle={(on) => setMediaConsent(chatId, on)} />
          </div>
        )}
        <AnimatePresence>
          {waiting && <HelloSentBanner key="waiting" them={them} />}
          {phase === 'incoming' && <IncomingBanner key="incoming" them={them} />}
        </AnimatePresence>
        <div className="mt-2 flex-1">
          <MessageList
            messages={messages}
            them={them}
            meColor={meColor}
            sames={sames}
            onSame={toggleSame}
            initialIds={initialIds}
            isMine={isMine}
            logRef={log}
            onOpenImage={(m) => setView({ key: m.localId ?? m.id, mine: isMine(m.userId), path: m.image?.path })}
          />
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
          locked={!unlocked}
          onLocked={() => ladder.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })}
          onPickImage={pickImage}
          busy={preparing}
          inputRef={input}
          photoRef={photoButton}
        />
      )}

      <SendImageSheet image={picked} name={them.name} onSend={sendPicked} onClose={() => setPicked(null)} />
      <ImageViewer
        view={view}
        message={viewed}
        name={them.name}
        onClose={() => {
          // a second tap on the fading backdrop must not move focus again
          if (!view) return
          setView(null)
          if (!viewed?.image) refocus()
        }}
        onDelete={(m) => {
          deleteChatMessage(chatId, m.id)
          setView(null)
          // said once the page is back (the toast lives behind the sheet)
          refocus(() => notify(t('ลบรูปแล้ว', 'Photo deleted')))
        }}
        onReport={(m, reason, details) => {
          reportChatMessage(chatId, m.id, reason, details)
          setView(null)
        }}
      />
    </div>
  )
}

/** Why a picked photo can't go out. */
function photoProblem(err: unknown): string {
  const problem = err instanceof ImageError ? err.problem : 'decode'
  if (problem === 'type') return t('ไฟล์นี้ไม่ใช่รูปที่ส่งได้ ลองเลือกรูป JPG หรือ PNG นะ', "That file isn't a photo we can send. Try a JPG or PNG")
  if (problem === 'size') return t('รูปนี้ใหญ่เกินไป ลองรูปที่เล็กลงหน่อยนะ', 'That photo is too big. Try a smaller one')
  return t('เปิดรูปนี้ไม่ได้ ลองรูปอื่น หรือบันทึกเป็น JPG ก่อนนะ', "Couldn't open that photo. Try another, or save it as a JPG first")
}

function ChatNotFound() {
  return (
    <div>
      <PageHeader back="/app/chats" title={t('ไม่เจอแชทนี้', "Can't find this chat")} />
      <div className="card mt-4 flex flex-col items-center gap-3 rounded-3xl px-6 py-12 text-center">
        <Avatar color="peach" size={96} face="sleepy" />
        <h2 className="font-display text-xl font-semibold">{t('แชทนี้เงียบไปแล้ว', 'This chat has gone quiet')}</h2>
        <p className="max-w-sm text-ink-soft">
          {t(
            'แชทนี้อาจไม่มีแล้ว หรือลิงก์ไม่ถูกต้อง กลับไปดูแชททั้งหมด หรือหาคนคลื่นเดียวกันคุยต่อก็ได้นะ',
            'This chat may be gone, or the link is off. Head back to your chats, or find someone on your wavelength to talk to.',
          )}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <ButtonLink to="/app/chats">{t('กลับไปหน้าแชท', 'Back to chats')}</ButtonLink>
          <ButtonLink to="/app/people" variant="soft">
            {t('หาคนคลื่นเดียวกัน', 'Find people on your wavelength')}
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
