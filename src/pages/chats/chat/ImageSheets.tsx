import { motion, useIsPresent } from 'motion/react'
import { Check, Flag, ImageOff, Send, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button, Sheet } from '@/components/ui'
import { useChatImage } from '@/data/chatImages'
import { known, t } from '@/lib/i18n'
import type { PreparedImage } from '@/lib/image'
import { spring } from '@/lib/motion'
import type { ChatImage, ChatMessage } from '@/lib/types'

/** A photo inside a chat bubble: keeps its shape while loading, says so if it's gone. */
export function ChatPhoto({ image, mine, name, onOpen }: { image: ChatImage; mine: boolean; name: string; onOpen: () => void }) {
  const { src, failed, local, retry } = useChatImage(image)
  const [broken, setBroken] = useState<string | null>(null)
  // a fresh <img> on every try, so the same link really loads again
  const [tries, setTries] = useState(0)
  const gone = failed || (!!src && broken === src)
  // a copy kept on this device can't be fetched again, and after two tries that fail a tap opens
  // the viewer instead, which can still delete or report it (so a dead photo is never stuck)
  const canRetry = gone && !local && tries < 2
  const again = () => {
    setBroken(null)
    setTries((n) => n + 1)
    retry()
  }
  // what it says is also what it's called, and "sending" is part of the name while it lasts
  const label = gone
    ? canRetry
      ? t('เปิดรูปนี้ไม่ได้ แตะเพื่อลองใหม่', "This photo won't open. Tap to try again")
      : mine
        ? t('เปิดรูปนี้ไม่ได้แล้ว แตะเพื่อลบ', "This photo can't be opened. Tap to delete it")
        : t('เปิดรูปนี้ไม่ได้แล้ว แตะเพื่อดูตัวเลือก', "This photo can't be opened. Tap for options")
    : image.sending
      ? t('รูปที่เรากำลังส่ง แตะเพื่อดู', 'Your photo, still sending. Tap to view')
      : mine
        ? t('รูปที่เราส่ง แตะเพื่อดู', 'Your photo. Tap to view')
        : t(`รูปจาก${name} แตะเพื่อดู`, `Photo from ${name}. Tap to view`)
  // fits 240 × 300; very tall or very wide photos are cropped to 1:2 / 2:1 here (the viewer shows all of it)
  const ratio = Math.min(2, Math.max(0.5, image.width / image.height))
  const width = Math.round(Math.min(240, 300 * ratio))
  return (
    <button
      type="button"
      onClick={canRetry ? again : onOpen}
      aria-label={label}
      // a dark ring: the lavender one disappears on a lavender bubble
      className="relative block max-w-full overflow-hidden rounded-[1.1rem] bg-cream-2 focus-visible:outline-ink focus-visible:outline-offset-2"
      style={{ width, aspectRatio: ratio }}
    >
      {src && !gone && (
        <img key={tries} src={src} alt="" draggable={false} onError={() => setBroken(src)} className="absolute inset-0 size-full object-cover" />
      )}
      {!src && !gone && <span aria-hidden className="absolute inset-0 animate-pulse bg-cream-3/70" />}
      {gone && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-center text-xs text-ink-soft">
          <ImageOff size={20} aria-hidden />
          {label}
        </span>
      )}
      {image.sending && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-ink/25">
          <motion.span
            className="size-7 rounded-full border-[3px] border-white/40 border-t-white"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        </span>
      )}
    </button>
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

// The buttons stay pinned to the bottom of the sheet, and on short phones the photo leaves them room:
// sheet 88dvh − header 72px − buttons ~64px − gaps. The floor keeps a photo in landscape.
const FOOTER = 'sticky bottom-0 -mx-5 bg-cream/90 px-5 pt-3 pb-1 backdrop-blur'
const SEND_PHOTO = 'max-h-[max(8rem,min(52dvh,calc(88dvh_-_20rem)))]'
const VIEW_PHOTO = 'max-h-[max(8rem,min(60dvh,calc(88dvh_-_11.5rem)))]'
/** while deleting or reporting: the questions need the room */
const VIEW_PHOTO_SMALL = 'max-h-[24dvh]'

/** Look at a picked photo before it goes: compressed, location data gone, one tap to send. */
export function SendImageSheet({
  image,
  name,
  onSend,
  onClose,
}: {
  image: PreparedImage | null
  name: string
  onSend: () => void
  onClose: () => void
}) {
  return (
    <Sheet open={!!image} onClose={onClose} title={t(`ส่งรูปให้${name}`, `Send a photo to ${name}`)} width={480}>
      {image && (
        <WhileOpen className="space-y-4">
          <div className="flex justify-center overflow-hidden rounded-3xl border border-line bg-cream-2">
            <img src={image.url} alt={t('รูปที่จะส่ง', 'The photo to send')} className={`w-auto max-w-full object-contain ${SEND_PHOTO}`} />
          </div>
          <p className="flex items-start gap-2.5 rounded-2xl bg-mint/30 p-3 text-sm text-ink">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden />
            {t(
              `บีบอัดและลบข้อมูลตำแหน่ง (GPS) ออกจากรูปแล้ว เห็นได้แค่เรากับ${name} ทีมงานจะเห็นก็ต่อเมื่อมีคนรายงานรูปนี้`,
              `Compressed, with location (GPS) data removed. Only you and ${name} can see it; the team sees it only if someone reports it`,
            )}
          </p>
          <div className={FOOTER}>
            <div className="flex flex-row-reverse gap-2">
              <Button className="flex-1" icon={<Send size={18} aria-hidden />} onClick={onSend}>
                {t('ส่งรูปนี้', 'Send this photo')}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                {t('ยกเลิก', 'Cancel')}
              </Button>
            </div>
          </div>
        </WhileOpen>
      )}
    </Sheet>
  )
}

const REASONS = [
  { th: 'รูปไม่เหมาะสม หรือล่อแหลม', en: 'Inappropriate or sexual' },
  { th: 'ส่งมาโดยที่เราไม่ได้อยากได้', en: "Sent when I didn't want it" },
  { th: 'สแปม หรือหลอกลวง', en: 'Spam or a scam' },
  { th: 'อื่นๆ', en: 'Something else' },
]
/** "อื่นๆ": the last reason, which needs a few words of its own */
const OTHER = REASONS.length - 1
const DETAILS_MAX = 300

/** Which photo the viewer has open. `key` is the message's localId ?? id, so it survives the temporary → server id swap. */
export interface PhotoView {
  key: string
  mine: boolean
}

/** A photo, big. Mine: take it back. Theirs: report it. If it leaves the chat while open, the viewer says so. */
export function ImageViewer({
  view,
  message,
  name,
  onClose,
  onDelete,
  onReport,
}: {
  /** null: closed */
  view: PhotoView | null
  /** that photo as it is in the chat right now: undefined once it's gone, a 'system' line once the team removed it */
  message: ChatMessage | undefined
  name: string
  onClose: () => void
  onDelete: (m: ChatMessage) => void
  /** reason is stored in Thai (like the profile report reasons); details are the reporter's own words */
  onReport: (m: ChatMessage, reason: string, details?: string) => void
}) {
  const mine = view?.mine ?? false
  return (
    <Sheet open={!!view} onClose={onClose} title={mine ? t('รูปที่เราส่ง', 'Your photo') : t(`รูปจาก${name}`, `Photo from ${name}`)} width={560}>
      {view && <ViewerBody key={view.key} message={message} mine={mine} onClose={onClose} onDelete={onDelete} onReport={onReport} />}
    </Sheet>
  )
}

type Stage = 'view' | 'delete' | 'report' | 'gone'

function ViewerBody({
  message,
  mine,
  onClose,
  onDelete,
  onReport,
}: {
  message: ChatMessage | undefined
  mine: boolean
  onClose: () => void
  onDelete: (m: ChatMessage) => void
  onReport: (m: ChatMessage, reason: string, details?: string) => void
}) {
  // no photo left: unsent, never made it, or the team turned it into their notice
  const image = message?.kind === 'image' ? message.image : undefined
  const { src, failed } = useChatImage(image)
  const [broken, setBroken] = useState<string | null>(null)
  const [step, setStep] = useState<'view' | 'delete' | 'report'>('view')
  const [reason, setReason] = useState<number | null>(null)
  const [details, setDetails] = useState('')
  const id = useId()
  const stage: Stage = image ? step : 'gone'
  const dead = failed || (!!src && broken === src)
  const small = stage === 'delete' || stage === 'report'
  const other = reason === OTHER
  // "อื่นๆ" needs a reason in their own words; for the others it's optional
  const canSend = reason !== null && (!other || details.trim().length >= 2)
  const when = message ? known(message.at) : ''

  // the closing sheet still takes taps for a moment: one tap, one delete or one report
  const acted = useRef(false)
  // "ลบเลย" and "ส่งรายงาน" open right where "ลบรูปนี้" and "รายงานรูปนี้" were, so the rest of a
  // double-click or a quick second tap would land on them: they only count after a short pause with no taps
  const lastTap = useRef(0)
  const ask = (next: 'delete' | 'report') => {
    lastTap.current = performance.now()
    setStep(next)
  }
  const tooSoon = () => {
    const now = performance.now()
    const soon = now - lastTap.current < 500
    lastTap.current = now
    return soon
  }
  const remove = () => {
    if (acted.current || !message || tooSoon()) return
    acted.current = true
    onDelete(message)
  }
  const send = () => {
    if (acted.current || !message || reason === null || !canSend || tooSoon()) return
    acted.current = true
    onReport(message, REASONS[reason].th, details.trim() || undefined)
  }

  // each step takes focus into itself (the button that opened it is gone), so it's also read out
  const trigger = useRef<HTMLButtonElement>(null)
  const keep = useRef<HTMLButtonElement>(null)
  const firstReason = useRef<HTMLInputElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const shown = useRef(stage)
  useEffect(() => {
    // not on mount: the sheet focuses itself when it opens
    if (shown.current === stage) return
    shown.current = stage
    const next = stage === 'view' ? trigger : stage === 'delete' ? keep : stage === 'report' ? firstReason : closeButton
    next.current?.focus()
  }, [stage])

  return (
    <WhileOpen className="space-y-4">
      <div className={`flex items-center justify-center overflow-hidden rounded-3xl border border-line bg-cream-2 ${small ? 'min-h-24' : 'min-h-40'}`}>
        {stage === 'gone' ? (
          <div id={`${id}-gone`} className="flex flex-col items-center gap-1.5 p-6 text-center text-sm text-ink-soft">
            <ImageOff size={22} aria-hidden />
            <p>
              {message?.kind === 'system'
                ? t('ทีมงานลบรูปนี้ออกจากแชทแล้ว', 'The team removed this photo from the chat')
                : t('รูปนี้ไม่อยู่ในแชทแล้ว', 'This photo is no longer in the chat')}
            </p>
            {/* unsent mid-report: the person can still be reported */}
            {!mine && (
              <p className="text-xs">{t('ถ้ารูปนั้นไม่โอเค ยังรายงานหรือบล็อกเขาได้จากโปรไฟล์ของเขานะ', "If it wasn't okay, you can still report or block them from their profile")}</p>
            )}
          </div>
        ) : src && !dead ? (
          <img
            src={src}
            alt={t(`รูป · ${when}`, `Photo · ${when}`)}
            onError={() => setBroken(src)}
            className={`w-auto max-w-full object-contain ${small ? VIEW_PHOTO_SMALL : VIEW_PHOTO}`}
          />
        ) : dead ? (
          <span className="flex flex-col items-center gap-1.5 p-6 text-sm text-ink-soft">
            <ImageOff size={22} aria-hidden />
            {t('เปิดรูปนี้ไม่ได้แล้ว', "This photo can't be opened")}
          </span>
        ) : (
          <span aria-hidden className={`w-full animate-pulse bg-cream-3/70 ${small ? 'h-24' : 'h-56'}`} />
        )}
      </div>

      {stage === 'report' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="space-y-3 rounded-3xl bg-white p-4">
          <fieldset>
            <legend className="font-display font-semibold text-ink">{t('รูปนี้มีอะไรไม่โอเค?', "What's wrong with this photo?")}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {REASONS.map((r, i) => {
                const on = reason === i
                return (
                  <label key={r.th} className="relative cursor-pointer">
                    <input
                      ref={i === (reason ?? 0) ? firstReason : undefined}
                      type="radio"
                      name={`${id}-reason`}
                      value={r.th}
                      checked={on}
                      onChange={() => setReason(i)}
                      // focus scrolls it clear of the pinned header and buttons
                      className="peer sr-only scroll-my-24"
                    />
                    {/* chosen: a tick and a deep coral edge, so it doesn't rest on colour alone */}
                    <span
                      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold text-ink transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lavender ${
                        on ? 'border-coral-deep bg-coral/25' : 'border-line bg-cream hover:bg-cream-2'
                      }`}
                    >
                      {on && <Check size={15} strokeWidth={3} aria-hidden className="shrink-0" />}
                      {t(r.th, r.en)}
                    </span>
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
                id={`${id}-details`}
                value={details}
                maxLength={DETAILS_MAX}
                rows={3}
                required={other}
                aria-invalid={other && details.trim().length < 2 ? true : undefined}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={other ? t('เช่น รูปนี้เป็นรูปของคนอื่นที่เอามาใช้โดยไม่ได้รับอนุญาต', "e.g. it's someone else's photo, used without asking") : t('รายละเอียดที่ช่วยให้ทีมงานเข้าใจ', 'Details that help the team understand')}
                className="mt-1.5 block w-full scroll-my-24 resize-none rounded-2xl border border-line bg-cream px-3.5 py-2.5 text-base leading-relaxed text-ink placeholder:text-ink-faint focus:border-lavender focus:bg-white"
              />
              <p className="mt-1 text-right text-xs text-ink-soft" aria-live="polite">
                {details.length}/{DETAILS_MAX}
              </p>
            </div>
          )}
          <p className="text-xs text-ink-soft">
            {t(
              'ทีมงานจะเห็นรูปนี้เพื่อตรวจสอบ ถ้าไม่อยากได้รูปอีก ปิดสวิตช์ในบันไดความไว้ใจได้ทันที หรือบล็อกได้จากโปรไฟล์ของเขา',
              "The team will see this photo to check it. To stop getting photos, switch off the trust ladder, or block them from their profile",
            )}
          </p>
        </motion.div>
      )}

      {/* the step's buttons, pinned to the bottom of the sheet so a short phone never hides them */}
      <div className={FOOTER}>
        {stage === 'view' && (
          <>
            {mine && image?.sending && (
              <p id={`${id}-sending`} className="mb-2 text-center text-xs text-ink-soft">
                {t('กำลังส่งรูป… ลบได้เมื่อส่งเสร็จ', "Still sending… You can delete it once it's sent")}
              </p>
            )}
            <div className="flex flex-row-reverse gap-2">
              {mine ? (
                <Button
                  ref={trigger}
                  variant="secondary"
                  className="flex-1"
                  icon={<Trash2 size={18} aria-hidden />}
                  onClick={() => ask('delete')}
                  disabled={image?.sending}
                  aria-describedby={image?.sending ? `${id}-sending` : undefined}
                >
                  {t('ลบรูปนี้', 'Delete this photo')}
                </Button>
              ) : (
                <Button ref={trigger} variant="secondary" className="flex-1" icon={<Flag size={18} aria-hidden />} onClick={() => ask('report')}>
                  {t('รายงานรูปนี้', 'Report this photo')}
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>
                {t('ปิด', 'Close')}
              </Button>
            </div>
          </>
        )}

        {stage === 'delete' && (
          <motion.div
            role="group"
            aria-labelledby={`${id}-ask`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.soft}
            className="space-y-3 rounded-3xl bg-white p-4"
          >
            <p id={`${id}-ask`} className="text-ink">
              {t('ลบรูปนี้ออกจากแชท ทั้งฝั่งเราและอีกฝั่งไหม?', 'Delete this photo from the chat, for both of you?')}
            </p>
            <div className="flex flex-row-reverse gap-2">
              <Button variant="dark" className="flex-1" icon={<Trash2 size={18} aria-hidden />} onClick={remove}>
                {t('ลบเลย', 'Delete it')}
              </Button>
              {/* the safe answer gets the focus; iOS VoiceOver skips group names, so it carries the question too */}
              <Button ref={keep} variant="ghost" aria-describedby={`${id}-ask`} onClick={() => setStep('view')}>
                {t('ไม่ลบ', 'Keep it')}
              </Button>
            </div>
          </motion.div>
        )}

        {stage === 'report' && (
          <div className="flex flex-row-reverse gap-2">
            <Button variant="dark" className="flex-1" icon={<Flag size={18} aria-hidden />} disabled={!canSend} onClick={send}>
              {t('ส่งรายงาน', 'Send report')}
            </Button>
            <Button variant="ghost" onClick={() => setStep('view')}>
              {t('ยกเลิก', 'Cancel')}
            </Button>
          </div>
        )}

        {stage === 'gone' && (
          <Button ref={closeButton} variant="secondary" block aria-describedby={`${id}-gone`} onClick={onClose}>
            {t('ปิด', 'Close')}
          </Button>
        )}
      </div>
    </WhileOpen>
  )
}
