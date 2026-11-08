import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Hand, MessageCircleHeart, Send, Sparkles } from 'lucide-react'
import { useMemo, useRef, type Ref } from 'react'
import { Avatar } from '@/components/ui'
import { MOCHI } from '@/lib/colors'
import { known, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { ChatMessage, MochiColor, User } from '@/lib/types'
import { systemText } from '../lib'
import { SameButton } from '../SameButton'
import { ChatPhoto } from './ImageSheets'

interface Entry {
  msg: ChatMessage
  key: string
}

type Group =
  | { key: string; system: true; msg: ChatMessage }
  | { key: string; system: false; mine: boolean; msgs: Entry[] }

function groupMessages(messages: ChatMessage[], isMine: (id: string) => boolean): Group[] {
  const out: Group[] = []
  // a message I sent keeps its temporary id as localId, so its bubble (and its group) isn't remade,
  // and doesn't bounce in again, when the server id arrives; a key seen twice gets the id added
  const used = new Set<string>()
  const keyOf = (m: ChatMessage) => {
    const base = m.localId ?? m.id
    const key = used.has(base) ? `${base}:${m.id}` : base
    used.add(key)
    return key
  }
  for (const m of messages) {
    const key = keyOf(m)
    if (m.kind === 'system' || m.kind === 'welcome' || m.userId === 'system') {
      out.push({ key, system: true, msg: m })
      continue
    }
    const prev = out[out.length - 1]
    if (prev && !prev.system && prev.msgs[0].msg.userId === m.userId) prev.msgs.push({ msg: m, key })
    else out.push({ key, system: false, mine: isMine(m.userId), msgs: [{ msg: m, key }] })
  }
  return out
}

interface ListProps {
  messages: ChatMessage[]
  them: User
  meColor: MochiColor
  sames: string[]
  onSame: (messageId: string) => void
  /** ids that were already there when the chat opened (no bounce-in for those) */
  initialIds: Set<string>
  /** demo messages say 'me', live rows carry my user id */
  isMine?: (id: string) => boolean
  /** a photo was tapped */
  onOpenImage?: (m: ChatMessage) => void
  /** the list itself: takes the focus when the photo that had it is gone and there's no composer */
  logRef?: Ref<HTMLDivElement>
}

const demoMine = (id: string) => id === 'me'

export function MessageList({ messages, them, meColor, sames, onSame, initialIds, isMine = demoMine, onOpenImage, logRef }: ListProps) {
  const groups = useMemo(() => groupMessages(messages, isMine), [messages, isMine])
  let index = 0
  return (
    <div ref={logRef} role="log" tabIndex={-1} aria-label={t(`ข้อความกับ${them.name}`, `Messages with ${them.name}`)} className="space-y-4 outline-none">
      {groups.map((g) => {
        if (g.system) return <SystemLine key={g.key} msg={g.msg} isNew={!initialIds.has(g.msg.id)} />
        const last = g.msgs[g.msgs.length - 1].msg
        return (
          <div key={g.key} className={`flex items-end gap-2 ${g.mine ? 'justify-end' : ''}`}>
            {!g.mine && <Avatar color={them.color} size={32} className="mb-7" />}
            <div className={`flex max-w-[82%] flex-col gap-1 sm:max-w-[70%] ${g.mine ? 'items-end' : 'items-start'}`}>
              {!g.mine && <span className="sr-only">{them.name}:</span>}
              {g.msgs.map(({ msg: m, key }, i) => (
                <Bubble
                  key={key}
                  msg={m}
                  mine={g.mine}
                  first={i === 0}
                  last={i === g.msgs.length - 1}
                  color={g.mine ? meColor : them.color}
                  them={them}
                  isNew={!initialIds.has(m.id)}
                  order={index++}
                  same={sames.includes(m.id)}
                  onSame={() => onSame(m.id)}
                  onOpenImage={() => onOpenImage?.(m)}
                />
              ))}
              <div className={`flex items-center gap-2 px-1 text-[11px] text-ink-soft ${g.mine ? 'flex-row-reverse' : ''}`}>
                <time>{known(last.at)}</time>
                {!g.mine && (
                  <SameButton active={sames.includes(last.id)} onToggle={() => onSame(last.id)} describedBy={`msg-${last.id}`} className="-my-2" />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SystemLine({ msg, isNew }: { msg: ChatMessage; isNew: boolean }) {
  const Icon = msg.kind === 'welcome' ? Sparkles : msg.text.includes('รอ') ? Send : MessageCircleHeart
  return (
    <motion.div
      initial={isNew ? { opacity: 0, scale: 0.8 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring.bouncy}
      className="flex justify-center"
    >
      <p className="inline-flex max-w-[90%] items-center gap-1.5 rounded-full bg-white/75 px-3.5 py-1.5 text-center text-xs text-ink-soft shadow-[var(--shadow-soft)]">
        <Icon size={13} strokeWidth={2.4} aria-hidden className="shrink-0 text-ink" />
        <span>
          {systemText(msg.text)} <span className="text-ink-soft">· {known(msg.at)}</span>
        </span>
      </p>
    </motion.div>
  )
}

interface BubbleProps {
  msg: ChatMessage
  mine: boolean
  first: boolean
  last: boolean
  color: MochiColor
  them: User
  isNew: boolean
  order: number
  same: boolean
  onSame: () => void
  onOpenImage: () => void
}

function Bubble({ msg, mine, first, last, color, them, isNew, order, same, onSame, onOpenImage }: BubbleProps) {
  const reduce = useReducedMotion()
  const timer = useRef<number | undefined>(undefined)
  const p = MOCHI[color]
  // a photo opens on tap, so no long-press / double-tap reaction on it (the เหมือนกัน! button still works)
  const photo = msg.kind === 'image' ? msg.image : undefined
  const theyReacted = mine && !!msg.sameBy?.includes(them.id)
  const sticker = (!mine && same) || theyReacted

  // grouped corners: the side facing the sender gets tighter between bubbles
  const corners = mine
    ? `${first ? '' : 'rounded-tr-lg'} ${last ? 'rounded-br-md' : 'rounded-br-lg'}`
    : `${first ? '' : 'rounded-tl-lg'} ${last ? 'rounded-bl-md' : 'rounded-bl-lg'}`

  const startPress = () => {
    if (mine || photo) return
    timer.current = window.setTimeout(() => {
      navigator.vibrate?.(14)
      onSame()
    }, 450)
  }
  const cancelPress = () => window.clearTimeout(timer.current)

  return (
    <motion.div
      id={`msg-${msg.id}`}
      initial={reduce ? false : isNew ? { opacity: 0, y: 16, scale: 0.8 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={isNew ? spring.bouncy : { ...spring.soft, delay: Math.min(order, 12) * 0.035 }}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onDoubleClick={mine || photo ? undefined : onSame}
      onContextMenu={mine ? undefined : (e) => e.preventDefault()}
      style={{
        transformOrigin: mine ? 'bottom right' : 'bottom left',
        background: mine ? `linear-gradient(140deg, ${p.base}, ${p.shade})` : undefined,
      }}
      // a photo bubble's radius is the photo's (1.1rem) plus its frame (p-1, and their 1px border), so the
      // photo's corners stay inside it; overflow-hidden would clip the เหมือนกัน! sticker instead
      className={`relative ${photo ? `p-1 ${mine ? 'rounded-[1.35rem]' : 'rounded-[calc(1.35rem_+_1px)]'}` : 'rounded-3xl px-4 py-2.5'} text-[15px] leading-relaxed text-ink ${corners} ${sticker ? 'mb-3' : ''} ${
        mine ? 'shadow-[inset_0_-2px_0_rgb(59_38_34/0.08),var(--shadow-soft)]' : 'border border-line bg-white shadow-[var(--shadow-soft)] select-none [-webkit-touch-callout:none]'
      }`}
    >
      {photo ? (
        <ChatPhoto image={photo} mine={mine} name={them.name} onOpen={onOpenImage} />
      ) : (
        <span className="[overflow-wrap:anywhere] whitespace-pre-wrap">{msg.text}</span>
      )}
      <AnimatePresence>
        {sticker && (
          <motion.span
            initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: mine ? 4 : -4 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={spring.bouncy}
            className={`absolute -bottom-4 inline-flex h-6 items-center gap-1 rounded-full bg-butter px-2 font-display text-[11px] font-semibold whitespace-nowrap text-ink shadow-[var(--shadow-soft)] ring-2 ring-cream ${
              mine ? 'right-1' : '-right-2'
            }`}
          >
            {theyReacted ? <Avatar color={them.color} size={16} face="happy" /> : <Hand size={12} strokeWidth={2.6} aria-hidden />}
            {theyReacted ? t(`${them.name}: เหมือนกัน!`, `${them.name}: Same!`) : t('เหมือนกัน!', 'Same!')}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function TypingBubble({ them }: { them: User }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
      transition={spring.bouncy}
      className="mt-4 flex origin-bottom-left items-end gap-2"
      role="status"
      aria-label={t(`${them.name}กำลังพิมพ์`, `${them.name} is typing`)}
    >
      <Avatar color={them.color} size={32} face="talk" />
      <span className="flex h-11 items-center gap-1.5 rounded-3xl rounded-bl-md border border-line bg-white px-4 shadow-[var(--shadow-soft)]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2 rounded-full bg-ink-soft/60"
            animate={reduce ? undefined : { y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </span>
    </motion.div>
  )
}
