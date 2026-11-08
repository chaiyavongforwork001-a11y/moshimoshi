import { motion, useIsPresent, useReducedMotion } from 'motion/react'
import { Ban, Check, ChevronRight, Flag, MoreHorizontal } from 'lucide-react'
import { Fragment, useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { Avatar, Button, Sheet } from '@/components/ui'
import { known, L, loc, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { ChatMessage, MochiColor } from '@/lib/types'

/** Someone else's room message, as it was when its ⋯ was pressed. */
export interface MessageTarget {
  message: ChatMessage
  /** undefined: someone we can't see any more */
  name?: string
  color: MochiColor
}

/**
 * ⋯ under someone else's message: report it, or block them. Phones always show it (there's
 * no hover there); with a mouse it shows while the message is hovered or has focus inside,
 * and it's always in the Tab order. Goes inside a `group/msg`.
 */
export function MoreButton({ name, onOpen }: { name?: string; onOpen: (el: HTMLButtonElement) => void }) {
  const label = name ? t(`ตัวเลือกเพิ่มเติม ข้อความจาก${name}`, `More options for ${name}'s message`) : t('ตัวเลือกเพิ่มเติมของข้อความนี้', 'More options for this message')
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      aria-haspopup="dialog"
      onClick={(e) => onOpen(e.currentTarget)}
      whileTap={{ scale: 0.88 }}
      transition={spring.bouncy}
      // 32px to look at, 44px to hit: the ::after reaches 6px past each edge
      className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-ink-soft ring-1 ring-line transition-[opacity,color,background-color] after:absolute after:-inset-1.5 hover:bg-white hover:text-ink focus-visible:opacity-100 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 [@media(hover:hover)]:opacity-0"
    >
      <MoreHorizontal size={17} strokeWidth={2.6} aria-hidden />
    </motion.button>
  )
}

interface Reason {
  /** what the report stores: stays Thai (known.ts reads it in English) */
  value: string
  label: string
}

const REASONS: Reason[] = [
  loc<Reason>({ value: 'คุกคาม หรือพูดไม่สุภาพ', label: L('คุกคาม หรือพูดไม่สุภาพ', 'Harassment or rude talk') }),
  loc<Reason>({ value: 'สแปม หรือโฆษณา', label: L('สแปม หรือโฆษณา', 'Spam or ads') }),
  loc<Reason>({ value: 'หลอกลวง หรือชวนลงทุน', label: L('หลอกลวง หรือชวนลงทุน', 'Scam or investment pitch') }),
  loc<Reason>({ value: 'เนื้อหาไม่เหมาะสม หรือล่อแหลม', label: L('เนื้อหาไม่เหมาะสม หรือล่อแหลม', 'Inappropriate or sexual content') }),
  loc<Reason>({ value: 'อื่นๆ', label: L('อื่นๆ', 'Something else') }),
]
/** "อื่นๆ": the last reason, which needs a few words of its own */
const OTHER = REASONS.length - 1
const DETAILS_MIN = 2
const DETAILS_MAX = 300

type Step = 'menu' | 'report' | 'block' | 'blocked'

// the step's buttons stay pinned to the bottom of the sheet, so a short phone never hides them
const FOOTER = 'sticky bottom-0 -mx-5 bg-cream/90 px-5 pt-3 pb-1 backdrop-blur'

const blockLabel = (name?: string) => (name ? t(`บล็อก${name}`, `Block ${name}`) : t('บล็อกคนนี้', 'Block this person'))

/** One sheet for the whole room chat: what to do about someone else's message. */
export function MessageSheet({ roomId, target, onClose }: { roomId: string; target: MessageTarget | null; onClose: () => void }) {
  // the last message stays on screen while the sheet slides away; each opening starts on the menu
  const [last, setLast] = useState(target)
  const [step, setStep] = useState<Step>('menu')
  const [round, setRound] = useState(0)
  if (target && target !== last) {
    setLast(target)
    setStep('menu')
    setRound((n) => n + 1)
  }
  const shown = target ?? last
  const name = shown?.name
  const title =
    step === 'report'
      ? t('รายงานข้อความนี้', 'Report this message')
      : step === 'menu'
        ? name
          ? t(`ข้อความจาก${name}`, `Message from ${name}`)
          : t('ข้อความจากเพื่อนในห้อง', 'Message from a room member')
        : blockLabel(name)
  return (
    <Sheet open={!!target} onClose={onClose} title={title} width={480}>
      {shown && <Body key={round} roomId={roomId} target={shown} step={step} onStep={setStep} onClose={onClose} />}
    </Sheet>
  )
}

/** A closing sheet keeps showing its last content for a moment: that copy takes no more taps. */
function WhileOpen({ className, children }: { className?: string; children: ReactNode }) {
  const present = useIsPresent()
  return (
    <div inert={!present} className={className}>
      {children}
    </div>
  )
}

function Body({
  roomId,
  target,
  step,
  onStep,
  onClose,
}: {
  roomId: string
  target: MessageTarget
  step: Step
  onStep: (step: Step) => void
  onClose: () => void
}) {
  const { message, name, color } = target
  const reportRoomMessage = useMoshi((s) => s.reportRoomMessage)
  const blockUser = useMoshi((s) => s.blockUser)
  const blocked = useMoshi((s) => s.blocked.includes(message.userId))
  const reduce = useReducedMotion()
  const id = useId()
  const [reason, setReason] = useState<number | null>(null)
  const [details, setDetails] = useState('')
  const other = reason === OTHER
  // "อื่นๆ" needs a reason in their own words; for the others a note is optional
  const short = other && details.trim().length < DETAILS_MIN
  const canSend = reason !== null && !short

  // one tap, one report: the closing sheet still takes taps for a moment
  const reported = useRef(false)
  // a step's buttons open near where the last step's were, so the rest of a double tap could land
  // on them: those only count after a short pause with no taps
  const lastTap = useRef(0)
  const go = (next: Step) => {
    lastTap.current = performance.now()
    onStep(next)
  }
  const tooSoon = () => {
    const now = performance.now()
    const soon = now - lastTap.current < 500
    lastTap.current = now
    return soon
  }
  const send = () => {
    if (reported.current || reason === null || !canSend || tooSoon()) return
    reported.current = true
    // the store shows how it went (a toast), so the sheet can go
    reportRoomMessage(roomId, message.id, REASONS[reason].value, details.trim() || undefined)
    onClose()
  }
  const block = () => {
    if (tooSoon()) return
    if (!blocked) blockUser(message.userId)
    go('blocked')
  }
  // once blocked, the menu would offer it again: "back" from a report returns to the done screen
  const back = () => go(blocked ? 'blocked' : 'menu')

  // each step takes the focus into itself (the button that opened it is gone), so it's also read out
  const reportRow = useRef<HTMLButtonElement>(null)
  const blockRow = useRef<HTMLButtonElement>(null)
  const firstReason = useRef<HTMLInputElement>(null)
  const keep = useRef<HTMLButtonElement>(null)
  const ok = useRef<HTMLButtonElement>(null)
  const shownStep = useRef(step)
  useEffect(() => {
    // not on mount: the sheet focuses itself when it opens
    const from = shownStep.current
    if (from === step) return
    shownStep.current = step
    const next = step === 'report' ? firstReason : step === 'block' ? keep : step === 'blocked' ? ok : from === 'block' ? blockRow : reportRow
    next.current?.focus()
  }, [step])

  // "อื่นๆ" opens its box under the reasons, maybe below the fold on a short phone
  const box = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (other) box.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [other, reduce])

  return (
    <WhileOpen className="space-y-4">
      {step !== 'blocked' && <Quote message={message} name={name} color={color} clamp={step === 'menu' ? 'line-clamp-5' : 'line-clamp-3'} />}

      {step === 'menu' && (
        <div className="space-y-2.5">
          <ActionRow
            buttonRef={reportRow}
            icon={<Flag size={19} strokeWidth={2.4} />}
            tint="bg-coral/25"
            title={t('รายงานข้อความนี้', 'Report this message')}
            note={t('ส่งให้ทีมงานดู เขาจะไม่รู้ว่าใครรายงาน', "The team takes a look. They won't know it was you")}
            onClick={() => go('report')}
          />
          <ActionRow
            buttonRef={blockRow}
            icon={<Ban size={19} strokeWidth={2.4} />}
            tint="bg-lavender/35"
            title={blockLabel(name)}
            note={t('ไม่ต้องเห็นข้อความของเขาอีก ทั้งในห้องและในแชท', 'Stop seeing their messages, in rooms and in chats')}
            onClick={() => go('block')}
          />
        </div>
      )}

      {step === 'report' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="space-y-3 rounded-3xl bg-white p-4">
          <fieldset>
            <legend className="font-display font-semibold text-ink">{t('ข้อความนี้มีอะไรไม่โอเค?', "What's wrong with this message?")}</legend>
            <div className="mt-3 grid gap-2">
              {REASONS.map((r, i) => {
                const on = reason === i
                return (
                  // chosen: the radio's dot and a deep coral edge, so it doesn't rest on colour alone
                  <label
                    key={r.value}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 px-3.5 py-2 transition-colors ${
                      on ? 'border-coral-deep bg-coral/15' : 'border-transparent bg-cream hover:bg-cream-2'
                    }`}
                  >
                    <input
                      ref={i === (reason ?? 0) ? firstReason : undefined}
                      type="radio"
                      name={`${id}-reason`}
                      value={r.value}
                      checked={on}
                      onChange={() => setReason(i)}
                      // focus scrolls it clear of the pinned title and buttons
                      className="size-[18px] shrink-0 scroll-my-24 accent-coral-deep"
                    />
                    <span className="min-w-0 text-[15px] leading-snug text-ink">{r.label}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          {reason !== null && (
            <div>
              <label htmlFor={`${id}-details`} className="text-sm font-semibold text-ink">
                {other ? t('เล่าเหตุผลให้ทีมงานฟังหน่อย', 'Tell the team what happened') : t('เล่าเพิ่มได้ (ไม่บังคับ)', 'Anything to add? (optional)')}
              </label>
              <textarea
                ref={box}
                id={`${id}-details`}
                value={details}
                maxLength={DETAILS_MAX}
                rows={3}
                required={other}
                aria-invalid={short && details.length > 0 ? true : undefined}
                aria-describedby={`${id}-count`}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={
                  other ? t('เช่น เอาข้อมูลส่วนตัวของคนอื่นมาโพสต์', "e.g. it shares someone else's personal details") : t('รายละเอียดที่ช่วยให้ทีมงานเข้าใจ', 'Details that help the team understand')
                }
                className="mt-1.5 block w-full scroll-my-24 resize-none rounded-2xl border border-line bg-cream px-3.5 py-2.5 text-base leading-relaxed text-ink placeholder:text-ink-faint focus:border-lavender focus:bg-white"
              />
              <p id={`${id}-count`} className="mt-1 flex justify-between gap-3 text-xs text-ink-soft">
                <span>{other ? t(`อย่างน้อย ${DETAILS_MIN} ตัวอักษร`, `At least ${DETAILS_MIN} characters`) : ''}</span>
                <span className="shrink-0 tabular-nums">
                  {details.length}/{DETAILS_MAX}
                </span>
              </p>
            </div>
          )}
          <p className="text-xs text-ink-soft">
            {t('ทีมงานจะเห็นข้อความนี้เพื่อตรวจสอบ และเขาจะไม่รู้ว่าใครเป็นคนรายงาน', "The team will see this message to check it, and they won't know who reported it")}
          </p>
        </motion.div>
      )}

      {step === 'block' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="space-y-3 rounded-3xl bg-white p-4">
          <p id={`${id}-ask`} className="font-display font-semibold [overflow-wrap:anywhere] text-ink">
            {name ? t(`บล็อก${name}ไหม?`, `Block ${name}?`) : t('บล็อกคนนี้ไหม?', 'Block this person?')}
          </p>
          <ul className="space-y-1.5 text-sm text-ink-soft">
            <li>· {t('ข้อความของเขาจะหายไปจากห้องและแชทของเรา', 'Their messages disappear from your rooms and chats')}</li>
            <li>· {t('เขาจะไม่เห็นโปรไฟล์ของเรา และทักแชทหาเราไม่ได้', "They won't see your profile, and they can't message you")}</li>
            <li>· {t('เขาจะไม่ได้รับแจ้งว่าถูกบล็อก', "They won't be told about it")}</li>
            <li>
              · {t('ปลดบล็อกได้ทุกเมื่อที่ ', 'You can unblock anytime in ')}
              <UnblockPath />
            </li>
          </ul>
        </motion.div>
      )}

      {step === 'blocked' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft} className="flex flex-col items-center gap-2 pt-1 text-center">
          <span className="relative">
            <Avatar color="mint" size={76} face="happy" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...spring.bouncy, delay: 0.15 }}
              className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-success text-white ring-4 ring-cream"
            >
              <Check size={16} strokeWidth={3} aria-hidden />
            </motion.span>
          </span>
          <h3 id={`${id}-done-title`} className="mt-1 font-display text-xl font-semibold">
            {t('บล็อกแล้วนะ', 'Blocked')}
          </h3>
          <p id={`${id}-done`} className="max-w-sm [overflow-wrap:anywhere] text-ink-soft">
            {name
              ? t(
                  `จากนี้จะไม่เห็นข้อความของ${name}อีก พักใจได้เลย ถ้าเปลี่ยนใจ ปลดบล็อกได้ทุกเมื่อที่ `,
                  `You won't see ${name}'s messages any more. Take a breather. Changed your mind? You can unblock anytime in `,
                )
              : t(
                  'จากนี้จะไม่เห็นข้อความของเขาอีก พักใจได้เลย ถ้าเปลี่ยนใจ ปลดบล็อกได้ทุกเมื่อที่ ',
                  "You won't see their messages any more. Take a breather. Changed your mind? You can unblock anytime in ",
                )}
            <UnblockPath />
            {t('', '.')}
          </p>
        </motion.div>
      )}

      <div className={FOOTER}>
        {step === 'menu' && (
          <Button variant="ghost" block onClick={onClose}>
            {t('ปิด', 'Close')}
          </Button>
        )}

        {step === 'report' && (
          <>
            {!canSend && (
              <p id={`${id}-why`} className="mb-2 text-center text-xs text-ink-soft">
                {reason === null ? t('เลือกเหตุผลก่อนนะ', 'Pick a reason first') : t('พิมพ์เหตุผลอีกนิดนะ', 'Add a few words first')}
              </p>
            )}
            <div className="flex flex-row-reverse gap-2">
              <Button
                variant="dark"
                className="flex-1"
                icon={<Flag size={18} aria-hidden />}
                disabled={!canSend}
                aria-describedby={canSend ? undefined : `${id}-why`}
                onClick={send}
              >
                {t('ส่งรายงาน', 'Send report')}
              </Button>
              <Button variant="ghost" onClick={back}>
                {t('ย้อนกลับ', 'Back')}
              </Button>
            </div>
          </>
        )}

        {step === 'block' && (
          <div className="flex flex-row-reverse gap-2">
            <Button variant="dark" className="flex-1" icon={<Ban size={18} aria-hidden />} onClick={block}>
              {t('บล็อก', 'Block')}
            </Button>
            {/* the safe answer gets the focus; iOS VoiceOver skips group names, so it carries the question too */}
            <Button ref={keep} variant="ghost" aria-describedby={`${id}-ask`} onClick={back}>
              {t('ยกเลิก', 'Cancel')}
            </Button>
          </div>
        )}

        {step === 'blocked' && (
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button ref={ok} block aria-describedby={`${id}-done-title ${id}-done`} onClick={() => !tooSoon() && onClose()}>
              {t('โอเค', 'OK')}
            </Button>
            <Button variant="ghost" block icon={<Flag size={18} aria-hidden />} onClick={() => !tooSoon() && go('report')}>
              {t('รายงานข้อความนี้ด้วย', 'Report this message too')}
            </Button>
          </div>
        )}
      </div>
    </WhileOpen>
  )
}

/** Where unblocking lives: โปรไฟล์ของเรา › ตั้งค่า › คนที่บล็อกไว้ (written the same way as on a profile's block sheet) */
function UnblockPath() {
  const steps = [t('โปรไฟล์ของเรา', 'My profile'), t('ตั้งค่า', 'Settings'), t('คนที่บล็อกไว้', 'Blocked people')]
  return (
    <span className="font-semibold text-ink">
      {steps.map((s, i) => (
        <Fragment key={s}>
          {i > 0 && (
            <>
              <span aria-hidden> › </span>
              <span className="sr-only">, </span>
            </>
          )}
          <span className="whitespace-nowrap">{s}</span>
        </Fragment>
      ))}
    </span>
  )
}

/** The message itself at the top of every step, so it's clear what this is about. */
function Quote({ message, name, color, clamp }: { message: ChatMessage; name?: string; color: MochiColor; clamp: string }) {
  return (
    <figure className="rounded-3xl rounded-tl-lg border border-line bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
      <figcaption className="flex min-w-0 items-center gap-2 text-xs text-ink-soft">
        <Avatar color={color} size={28} />
        <span className="min-w-0 truncate font-display text-sm font-semibold text-ink">{name ?? t('เพื่อนในห้อง', 'Room member')}</span>
        <span className="shrink-0">· {known(message.at)}</span>
      </figcaption>
      <blockquote className={`mt-1.5 text-[15px] leading-relaxed [overflow-wrap:anywhere] text-ink ${clamp}`}>{message.text}</blockquote>
    </figure>
  )
}

function ActionRow({
  buttonRef,
  icon,
  tint,
  title,
  note,
  onClick,
}: {
  buttonRef: Ref<HTMLButtonElement>
  icon: ReactNode
  /** the icon bubble's colour */
  tint: string
  title: string
  note: string
  onClick: () => void
}) {
  return (
    <motion.button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={spring.bouncy}
      className="flex min-h-16 w-full items-center gap-3 rounded-3xl border border-line bg-white py-3 pr-3.5 pl-3 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-cream-2/60"
    >
      <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-2xl text-ink ${tint}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display leading-snug font-semibold [overflow-wrap:anywhere] text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{note}</span>
      </span>
      <ChevronRight size={18} aria-hidden className="shrink-0 text-ink-soft" />
    </motion.button>
  )
}
