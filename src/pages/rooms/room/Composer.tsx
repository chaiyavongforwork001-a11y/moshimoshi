import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { SendHorizontal } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type Ref } from 'react'
import { Avatar, IconButton } from '@/components/ui'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { Room } from '@/lib/types'
import { JoinButton } from '../bits'

/** A hello tapped before joining: it waits in the composer until I'm in the room (the server only takes members' messages). */
export interface Draft {
  text: string
  /** who it's for, said on the join panel */
  to?: string
}

/**
 * The room chat's dock, sticky at the bottom of the chat section: on phones it
 * rides just above the floating bottom nav, on desktop at the bottom of the
 * column. Being sticky (not fixed) it only shows while the chat is on screen,
 * so it never covers the room header or the tabs. It holds the composer, or
 * the join panel for someone who hasn't joined the room yet.
 */
function Dock({ desktop, card, className = '', children }: { desktop: boolean; card?: Ref<HTMLDivElement>; className?: string; children: ReactNode }) {
  const dock = useRef<HTMLDivElement>(null)
  // phones: while the chat is still below the fold the dock can't reach its spot and would sit under
  // the bottom nav, so it fades in once the chat has scrolled up far enough
  const [clear, setClear] = useState(desktop)
  useEffect(() => {
    const section = dock.current?.parentElement
    if (desktop || !section) {
      setClear(true)
      return
    }
    const io = new IntersectionObserver(([e]) => setClear(!!e?.isIntersecting), { rootMargin: '0px 0px -240px 0px' })
    io.observe(section)
    return () => io.disconnect()
  }, [desktop])

  return (
    <motion.div
      ref={dock}
      initial={{ opacity: 0, y: 24 }}
      animate={clear ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={spring.soft}
      className={`${desktop ? 'sticky bottom-5 z-20 mt-5' : 'sticky bottom-[calc(6.75rem+env(safe-area-inset-bottom))] z-30 mt-4'} ${clear ? '' : 'pointer-events-none'}`}
    >
      {/* phones: messages fade out behind the dock (and in the gap above the bottom nav) instead of running into it */}
      {!desktop && <div aria-hidden className="pointer-events-none absolute -inset-x-4 -top-6 -bottom-[calc(7rem+env(safe-area-inset-bottom))] bg-linear-to-t from-cream from-75% via-cream/75 to-transparent" />}
      <div ref={card} className={`glass relative mx-auto max-w-md overflow-hidden rounded-[1.9rem] bg-white/92 shadow-[var(--shadow-lift)] md:max-w-2xl ${className}`}>
        {children}
      </div>
    </motion.div>
  )
}

/** Room chat composer. The quick greetings sit in the same dock as the input, so nothing floats loose over the messages. */
export function Composer({
  roomName,
  onSend,
  suggestions = [],
  desktop,
  initialText = '',
  autoFocus = false,
}: {
  roomName: string
  onSend: (text: string) => void
  suggestions?: string[]
  desktop: boolean
  /** a hello that was waiting for me to join */
  initialText?: string
  /** just joined from the join panel: straight into typing */
  autoFocus?: boolean
}) {
  const id = useId()
  const [text, setText] = useState(initialText)
  const input = useRef<HTMLInputElement>(null)
  // only when it first shows up: the dock is already where the join panel was, so nothing needs to scroll
  const focusOnMount = useRef(autoFocus)
  useEffect(() => {
    const el = input.current
    if (!focusOnMount.current || !el) return
    el.focus({ preventScroll: true })
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const msg = text.trim()
    if (!msg) return
    onSend(msg)
    setText('')
  }

  return (
    <Dock desktop={desktop} className="focus-within:ring-3 focus-within:ring-lavender">
      <AnimatePresence initial={false}>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
            transition={spring.soft}
            className="no-scrollbar flex gap-1.5 overflow-x-auto px-2 pt-2 [mask-image:linear-gradient(to_right,#000_calc(100%-1.25rem),transparent)]"
            aria-label={t('ข้อความทักทายแนะนำ', 'Suggested greetings')}
            role="group"
          >
            {suggestions.map((s) => (
              <motion.button
                key={s}
                type="button"
                onClick={() => onSend(s)}
                whileTap={{ scale: 0.92 }}
                transition={spring.bouncy}
                className="inline-flex h-10 shrink-0 items-center rounded-full bg-cream-2 px-3.5 text-sm font-semibold whitespace-nowrap text-ink transition-colors last:mr-5 hover:bg-cream-3"
              >
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <form onSubmit={submit} className="flex items-center gap-2 p-1.5 pl-5">
        <label htmlFor={id} className="sr-only">
          {t(`พิมพ์ข้อความถึงห้อง${roomName}`, `Message ${roomName}`)}
        </label>
        <input
          ref={input}
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder={t('พิมพ์ทักทายเพื่อนๆ ในห้อง…', 'Say hi to the room…')}
          autoComplete="off"
          enterKeyHint="send"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base leading-[1.8] text-ink outline-none placeholder:text-ink-faint"
        />
        <IconButton label={t('ส่งข้อความ', 'Send message')} type="submit" variant="primary" disabled={!text.trim()} className="disabled:opacity-50">
          <SendHorizontal size={20} strokeWidth={2.4} />
        </IconButton>
      </form>
    </Dock>
  )
}

/**
 * In place of the composer for someone who hasn't joined: anyone can read along, writing
 * starts with a join (the server refuses room messages from non-members). Joining swaps
 * the composer in right here.
 */
export function JoinToChat({
  room,
  desktop,
  draft,
  onJoin,
  joinRef,
}: {
  room: Room
  desktop: boolean
  /** a hello tapped before joining */
  draft: Draft | null
  onJoin: () => void
  /** wraps the join button, so the chat can move focus to it */
  joinRef?: Ref<HTMLDivElement>
}) {
  const id = useId()
  const reduce = useReducedMotion()
  const card = useRef<HTMLDivElement>(null)
  // a hello tapped before joining: a little squish says where to go next
  useEffect(() => {
    if (!draft || reduce || !card.current) return
    const run = animate(card.current, { scale: [1, 1.04, 0.99, 1] }, { duration: 0.5, ease: 'easeOut' })
    return () => run.stop()
  }, [draft, reduce])

  return (
    <Dock desktop={desktop} card={card}>
      {/* narrow phones: the words on top, the button on its own full-width line below */}
      <div role="group" aria-labelledby={`${id}-title`} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-2 pl-4">
        {/* wrapped: the avatar's own inline-flex would fight a hidden on it */}
        <span aria-hidden className="hidden shrink-0 sm:inline-flex">
          <Avatar color={room.color} size={40} face="wink" />
        </span>
        <div className="min-w-0 flex-[999_1_9rem] py-1">
          <p id={`${id}-title`} className="font-display text-[15px] leading-snug font-semibold text-ink">
            {t('อยากคุยด้วยกันไหม?', 'Want to join in?')}
          </p>
          {/* polite: when a hello starts waiting here, it's read out */}
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft" aria-live="polite">
            {draft?.to
              ? t(`เข้าห้องก่อนนะ แล้วข้อความทัก${draft.to}จะรออยู่ในช่องพิมพ์`, `Join first, and your hi to ${draft.to} will be ready to send`)
              : draft
                ? t('เข้าห้องก่อนนะ แล้วข้อความทักทายจะรออยู่ในช่องพิมพ์', 'Join first, and your hi will be ready to send')
                : t('ใครก็อ่านแชทได้ แต่ต้องเข้าห้องก่อนถึงจะคุยในห้องได้นะ', 'Anyone can read along. Join the room to chat here')}
          </p>
        </div>
        <div ref={joinRef} className="flex flex-[1_0_auto]">
          <JoinButton room={room} joined={false} onToggle={onJoin} className="w-full" />
        </div>
      </div>
    </Dock>
  )
}
