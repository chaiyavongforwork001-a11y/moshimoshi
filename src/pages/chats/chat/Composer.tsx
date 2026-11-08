import { AnimatePresence, motion } from 'motion/react'
import { ImagePlus, Lock, SendHorizontal } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type Ref, type RefObject } from 'react'
import { useCoarsePointer } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'

interface ComposerProps {
  value: string
  onChange: (v: string) => void
  onSend: (text: string) => void
  name: string
  quickReplies: string[]
  /** step 2 of the trust ladder isn't unlocked yet */
  locked: boolean
  /** what the locked photo button says (defaults to the trust-ladder line) */
  lockedHint?: string
  /** a photo was picked (only while unlocked) */
  onPickImage?: (file: File) => void
  /** the locked photo button was tapped (e.g. show the trust ladder) */
  onLocked?: () => void
  /** a photo is being prepared: the button waits */
  busy?: boolean
  inputRef: RefObject<HTMLTextAreaElement | null>
  /** the photo button: takes the focus back when a photo that had it is gone */
  photoRef?: Ref<HTMLButtonElement>
}

export function Composer({ value, onChange, onSend, name, quickReplies, locked, lockedHint, onPickImage, onLocked, busy = false, inputRef, photoRef }: ComposerProps) {
  const id = useId()
  const coarse = useCoarsePointer()
  const [hint, setHint] = useState(false)
  const picker = useRef<HTMLInputElement>(null)

  // grow with the text, up to ~5 lines
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 136)}px`
  }, [value, inputRef])

  useEffect(() => {
    if (!hint) return
    const timer = setTimeout(() => setHint(false), 2800)
    return () => clearTimeout(timer)
  }, [hint])

  const submit = () => {
    const msg = value.trim()
    if (!msg) return
    onSend(msg)
  }

  return (
    <div className="safe-bottom sticky bottom-0 z-30 border-t border-line/70 bg-cream/85 px-3 pt-1.5 backdrop-blur-xl lg:static lg:rounded-b-[2rem] lg:bg-white/70 lg:px-5 lg:pb-4">
      <div role="group" aria-label={t('ตอบกลับเร็ว', 'Quick replies')} className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 lg:-mx-5 lg:px-5">
        {quickReplies.map((q) => (
          <button key={q} type="button" onClick={() => onSend(q)} className="group inline-flex h-11 shrink-0 items-center">
            <motion.span
              whileTap={{ scale: 0.9 }}
              transition={spring.bouncy}
              className="inline-flex h-8 items-center rounded-full border border-line bg-white px-3.5 text-sm whitespace-nowrap text-ink shadow-[var(--shadow-soft)] group-hover:bg-cream-2"
            >
              {q}
            </motion.span>
          </button>
        ))}
      </div>

      <div className="relative">
        <AnimatePresence>
          {hint && (
            <motion.p
              role="status"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4 }}
              transition={spring.bouncy}
              className="absolute bottom-full left-0 mb-2 flex max-w-xs items-start gap-2 rounded-2xl bg-ink px-3.5 py-2.5 text-sm text-cream shadow-[var(--shadow-lift)]"
            >
              <Lock size={15} className="mt-0.5 shrink-0" aria-hidden />
              {lockedHint ??
                t(
                  `ส่งรูปได้เมื่อเราและ${name}เปิดสวิตช์ยินยอมในบันไดความไว้ใจทั้งคู่นะ`,
                  `Photos unlock once you and ${name} both switch on the trust ladder`,
                )}
            </motion.p>
          )}
        </AnimatePresence>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <motion.button
            ref={photoRef}
            type="button"
            whileTap={{ scale: 0.88 }}
            transition={spring.bouncy}
            onClick={() => {
              if (!locked) return void (!busy && picker.current?.click())
              setHint(true)
              onLocked?.()
            }}
            aria-label={locked ? t('ส่งรูป (ยังล็อกอยู่ ต้องยินยอมทั้งคู่ก่อน)', 'Send a photo (locked until you both agree)') : t('ส่งรูป', 'Send a photo')}
            aria-busy={busy || undefined}
            className={`relative inline-flex size-11 shrink-0 items-center justify-center rounded-full shadow-[var(--shadow-soft)] transition-colors ${
              locked ? 'bg-white text-ink-soft' : 'bg-mint text-ink'
            }`}
          >
            {busy ? (
              <motion.span
                aria-hidden
                className="size-5 rounded-full border-2 border-ink/25 border-t-ink"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <ImagePlus size={20} />
            )}
            {locked && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-cream-3 ring-2 ring-white" aria-hidden>
                <Lock size={9} strokeWidth={3} />
              </span>
            )}
          </motion.button>
          {!locked && (
            <input
              ref={picker}
              type="file"
              accept="image/*"
              tabIndex={-1}
              aria-hidden
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                // the same photo can be picked again later
                e.target.value = ''
                if (file) onPickImage?.(file)
              }}
            />
          )}
          <label htmlFor={`${id}-msg`} className="sr-only">
            {t(`พิมพ์ข้อความถึง${name}`, `Write a message to ${name}`)}
          </label>
          <textarea
            ref={inputRef}
            id={`${id}-msg`}
            rows={1}
            value={value}
            maxLength={1000}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={t(`ทัก${name}หน่อย…`, `Say hi to ${name}…`)}
            className="block max-h-34 min-h-11 flex-1 resize-none rounded-[1.4rem] border border-line bg-white px-4 py-2.5 leading-normal text-ink placeholder:text-ink-faint focus:border-lavender"
          />
          <motion.button
            type="submit"
            disabled={!value.trim()}
            aria-label={t('ส่งข้อความ', 'Send message')}
            whileTap={{ scale: 0.85, rotate: -12 }}
            animate={{ scale: value.trim() ? 1 : 0.92 }}
            transition={spring.bouncy}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-coral text-ink shadow-[var(--shadow-puffy)] disabled:opacity-45"
          >
            <SendHorizontal size={20} strokeWidth={2.4} />
          </motion.button>
        </form>
      </div>
    </div>
  )
}
