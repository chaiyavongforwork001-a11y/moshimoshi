import { AnimatePresence, motion } from 'motion/react'
import { ImagePlus, Lock, SendHorizontal } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useState, type RefObject } from 'react'
import { useCoarsePointer } from '@/lib/hooks'
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
  inputRef: RefObject<HTMLTextAreaElement | null>
}

export function Composer({ value, onChange, onSend, name, quickReplies, locked, lockedHint, inputRef }: ComposerProps) {
  const id = useId()
  const coarse = useCoarsePointer()
  const [hint, setHint] = useState(false)

  // grow with the text, up to ~5 lines
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 136)}px`
  }, [value, inputRef])

  useEffect(() => {
    if (!hint) return
    const t = setTimeout(() => setHint(false), 2800)
    return () => clearTimeout(t)
  }, [hint])

  const submit = () => {
    const t = value.trim()
    if (!t) return
    onSend(t)
  }

  return (
    <div className="safe-bottom sticky bottom-0 z-30 border-t border-line/70 bg-cream/85 px-3 pt-1.5 backdrop-blur-xl lg:static lg:rounded-b-[2rem] lg:bg-white/70 lg:px-5 lg:pb-4">
      <div role="group" aria-label="ตอบกลับเร็ว" className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 lg:-mx-5 lg:px-5">
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
              {lockedHint ?? `ส่งรูป ลิงก์ หรือไลน์ได้เมื่อเราและ${name}กดยินยอมในบันไดความไว้ใจแล้วนะ`}
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
            type="button"
            whileTap={{ scale: 0.88 }}
            transition={spring.bouncy}
            onClick={() => locked && setHint(true)}
            aria-label={locked ? 'ส่งรูป (ยังล็อกอยู่ ต้องยินยอมทั้งคู่ก่อน)' : 'ส่งรูป'}
            className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-ink-soft shadow-[var(--shadow-soft)]"
          >
            <ImagePlus size={20} />
            {locked && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-cream-3 ring-2 ring-white" aria-hidden>
                <Lock size={9} strokeWidth={3} />
              </span>
            )}
          </motion.button>
          <label htmlFor={`${id}-msg`} className="sr-only">
            พิมพ์ข้อความถึง{name}
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
            placeholder={`ทัก${name}หน่อย…`}
            className="block max-h-34 min-h-11 flex-1 resize-none rounded-[1.4rem] border border-line bg-white px-4 py-2.5 leading-normal text-ink placeholder:text-ink-faint focus:border-lavender"
          />
          <motion.button
            type="submit"
            disabled={!value.trim()}
            aria-label="ส่งข้อความ"
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
