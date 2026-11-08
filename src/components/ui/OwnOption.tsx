import { AnimatePresence, motion } from 'motion/react'
import { Check, PencilLine, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'

interface OwnOptionProps {
  /** what the closed pill says */
  label?: ReactNode
  /** accessible name and field label */
  name: string
  placeholder: string
  maxLength: number
  /** the typed text; return false to keep the field open with it (no room left, for example) */
  onAdd: (text: string) => boolean | void
  /** keep the field open after adding (lists where people add several) */
  stayOpen?: boolean
  /** the list is full: pressing the pill calls onBlocked instead of opening */
  blocked?: boolean
  onBlocked?: () => void
  className?: string
}

/**
 * Put on Next and Save buttons near an OwnOption. Tapping a button doesn't always
 * blur the field on phones, and leaving the field is what saves the typed words.
 */
export function leaveField() {
  const active = document.activeElement
  if (active instanceof HTMLElement) active.blur()
}

/**
 * "อื่นๆ": the last choice in a list of options. A dashed pill that opens into
 * a small field, so people can say it in their own words when nothing fits.
 * Enter adds it and never moves on to the next step or submits a surrounding form.
 * Leaving the field also adds it: typed words are never lost to a Next or Save
 * pressed right after. Only Cancel and Escape throw them away.
 */
export function OwnOption({ label, name, placeholder, maxLength, onAdd, stayOpen, blocked, onBlocked, className = '' }: OwnOptionProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const pill = useRef<HTMLButtonElement>(null)
  const refocusPill = useRef(false)
  // the field stays mounted while it animates out, so its blur must not add anything any more
  const closing = useRef(false)
  // pressing Cancel or the check button: their click decides, not the blur some browsers send first
  const pressing = useRef(false)
  const id = useId()
  const ready = text.trim().length > 0

  useEffect(() => {
    // no preventScroll here: on phones the browser must bring the field up above the keyboard
    if (open) input.current?.focus()
    else if (refocusPill.current) pill.current?.focus({ preventScroll: true })
    refocusPill.current = false
  }, [open])

  const fold = () => {
    closing.current = true
    setText('')
    setOpen(false)
  }

  const close = () => {
    refocusPill.current = true
    fold()
  }

  const add = () => {
    pressing.current = false
    if (!ready || onAdd(text) === false) return
    if (stayOpen) {
      setText('')
      input.current?.focus({ preventScroll: true })
    } else close()
  }

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (closing.current || pressing.current || e.currentTarget.contains(e.relatedTarget as Node | null)) return
    // only the window lost focus (switching apps): they're coming back to this
    if (document.activeElement === input.current) return
    if (ready && onAdd(text) === false) return
    fold()
  }

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    add()
  }

  const onFieldKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || e.nativeEvent.isComposing) return
    // close only this field, not the sheet around it
    e.preventDefault()
    e.stopPropagation()
    close()
  }

  const holdsFocus = {
    onPointerDown: () => {
      pressing.current = true
    },
    onPointerLeave: () => {
      pressing.current = false
    },
    onMouseDown: (e: MouseEvent) => e.preventDefault(),
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {open ? (
        <motion.div
          key="field"
          layout
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={spring.bouncy}
          onBlur={onBlur}
          onKeyDown={onFieldKeyDown}
          className={`flex min-h-13 w-full max-w-md min-w-0 items-center gap-2 rounded-full border-2 border-peach bg-white py-1 pr-1.5 pl-4 shadow-[var(--shadow-soft)] focus-within:ring-4 focus-within:ring-peach/30 ${className}`}
        >
          <label htmlFor={id} className="sr-only">
            {name}
          </label>
          <input
            ref={input}
            id={id}
            value={text}
            maxLength={maxLength}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={placeholder}
            enterKeyHint="done"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base leading-[1.8] text-ink outline-none placeholder:text-ink-faint"
          />
          {text.length >= maxLength - 6 && (
            <span className="shrink-0 text-[11px] font-semibold text-ink-faint tabular-nums" aria-hidden>
              {text.length}/{maxLength}
            </span>
          )}
          <button
            type="button"
            {...holdsFocus}
            onClick={close}
            aria-label={t('ยกเลิก', 'Cancel')}
            className="grid size-10 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-ink"
          >
            <X size={17} aria-hidden />
          </button>
          <motion.button
            type="button"
            {...holdsFocus}
            onClick={add}
            disabled={!ready}
            whileTap={ready ? { scale: 0.88 } : undefined}
            transition={spring.bouncy}
            aria-label={t(`เพิ่ม ${text.trim()}`, `Add ${text.trim()}`)}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-coral text-ink shadow-[inset_0_-2px_0_rgb(59_38_34/0.14)] transition-opacity disabled:bg-ink/10 disabled:text-ink-faint disabled:shadow-none"
          >
            <Check size={18} strokeWidth={3} aria-hidden />
          </motion.button>
        </motion.div>
      ) : (
        <motion.button
          key="pill"
          ref={pill}
          layout
          type="button"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          whileTap={{ scale: 0.92 }}
          transition={spring.bouncy}
          onClick={() => {
            if (blocked) return onBlocked?.()
            closing.current = false
            pressing.current = false
            setOpen(true)
          }}
          aria-label={name}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-dashed border-ink/25 bg-white/70 px-4 text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:border-peach hover:bg-white ${className}`}
        >
          <PencilLine size={15} aria-hidden />
          {label ?? t('อื่นๆ ระบุเอง', 'Other (type your own)')}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
