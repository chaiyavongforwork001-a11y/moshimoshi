import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Hand, PhoneIncoming, PhoneOutgoing, Sparkles } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Avatar } from '@/components/ui'
import { MOCHI } from '@/lib/colors'
import { known, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { ChatMessage, MochiColor, User } from '@/lib/types'
import { systemText } from '../lib'
import { SameButton } from '../SameButton'

type Group =
  | { key: string; system: true; msg: ChatMessage }
  | { key: string; system: false; mine: boolean; msgs: ChatMessage[] }

function groupMessages(messages: ChatMessage[], isMine: (id: string) => boolean): Group[] {
  const out: Group[] = []
  for (const m of messages) {
    if (m.kind === 'system' || m.kind === 'welcome' || m.userId === 'system') {
      out.push({ key: m.id, system: true, msg: m })
      continue
    }
    const prev = out[out.length - 1]
    if (prev && !prev.system && prev.msgs[0].userId === m.userId) prev.msgs.push(m)
    else out.push({ key: m.id, system: false, mine: isMine(m.userId), msgs: [m] })
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
}

const demoMine = (id: string) => id === 'me'

export function MessageList({ messages, them, meColor, sames, onSame, initialIds, isMine = demoMine }: ListProps) {
  const groups = useMemo(() => groupMessages(messages, isMine), [messages, isMine])
  let index = 0
  return (
    <div role="log" aria-label={t(`ข้อความกับ${them.name}`, `Messages with ${them.name}`)} className="space-y-4">
      {groups.map((g) => {
        if (g.system) return <SystemLine key={g.key} msg={g.msg} isNew={!initialIds.has(g.msg.id)} />
        const last = g.msgs[g.msgs.length - 1]
        return (
          <div key={g.key} className={`flex items-end gap-2 ${g.mine ? 'justify-end' : ''}`}>
            {!g.mine && <Avatar color={them.color} size={32} className="mb-7" />}
            <div className={`flex max-w-[82%] flex-col gap-1 sm:max-w-[70%] ${g.mine ? 'items-end' : 'items-start'}`}>
              {!g.mine && <span className="sr-only">{them.name}:</span>}
              {g.msgs.map((m, i) => (
                <Bubble
                  key={m.id}
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
  const Icon = msg.kind === 'welcome' ? Sparkles : msg.text.includes('รอ') ? PhoneOutgoing : PhoneIncoming
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
}

function Bubble({ msg, mine, first, last, color, them, isNew, order, same, onSame }: BubbleProps) {
  const reduce = useReducedMotion()
  const timer = useRef<number | undefined>(undefined)
  const p = MOCHI[color]
  const theyReacted = mine && !!msg.sameBy?.includes(them.id)
  const sticker = (!mine && same) || theyReacted

  // grouped corners: the side facing the sender gets tighter between bubbles
  const corners = mine
    ? `${first ? '' : 'rounded-tr-lg'} ${last ? 'rounded-br-md' : 'rounded-br-lg'}`
    : `${first ? '' : 'rounded-tl-lg'} ${last ? 'rounded-bl-md' : 'rounded-bl-lg'}`

  const startPress = () => {
    if (mine) return
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
      onDoubleClick={mine ? undefined : onSame}
      onContextMenu={mine ? undefined : (e) => e.preventDefault()}
      style={{
        transformOrigin: mine ? 'bottom right' : 'bottom left',
        background: mine ? `linear-gradient(140deg, ${p.base}, ${p.shade})` : undefined,
      }}
      className={`relative rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed text-ink ${corners} ${sticker ? 'mb-3' : ''} ${
        mine ? 'shadow-[inset_0_-2px_0_rgb(59_38_34/0.08),var(--shadow-soft)]' : 'border border-line bg-white shadow-[var(--shadow-soft)] select-none [-webkit-touch-callout:none]'
      }`}
    >
      <span className="break-words whitespace-pre-wrap">{msg.text}</span>
      <AnimatePresence>
        {sticker && (
          <motion.span
            initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: mine ? 4 : -4 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={spring.bouncy}
            className={`absolute -bottom-4 inline-flex h-6 items-center gap-1 rounded-full bg-butter px-2 font-display text-[11px] font-semibold whitespace-nowrap text-ink shadow-[var(--shadow-soft)] ring-2 ring-cream ${
              mine ? '-left-2' : '-right-2'
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
