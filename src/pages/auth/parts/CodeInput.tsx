import { motion, useAnimate, useReducedMotion } from 'motion/react'
import { forwardRef, useEffect, useState, type ClipboardEvent } from 'react'
import { spring } from '@/lib/motion'

export const CODE_LENGTH = 6

interface CodeInputProps {
  value: string
  onChange: (v: string) => void
  /** called once all digits are in (typed, pasted or autofilled) */
  onComplete: (v: string) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  /** bump to shake the boxes (wrong code) */
  shake?: number
}

/**
 * Six friendly boxes over one real input, so SMS/email autofill
 * (`one-time-code`), paste and screen readers all just work.
 */
export const CodeInput = forwardRef<HTMLInputElement, CodeInputProps>(function CodeInput(
  { value, onChange, onComplete, disabled, invalid, describedBy, shake = 0 },
  ref,
) {
  const reduce = useReducedMotion()
  const [focused, setFocused] = useState(false)
  const [scope, animate] = useAnimate<HTMLDivElement>()

  useEffect(() => {
    if (shake && !reduce && scope.current) void animate(scope.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.42 })
  }, [shake, reduce, animate, scope])

  const accept = (raw: string) => {
    const v = raw.replace(/\D/g, '').slice(0, CODE_LENGTH)
    onChange(v)
    if (v.length === CODE_LENGTH && v !== value) onComplete(v)
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    e.preventDefault()
    accept(text)
  }

  const active = focused && !disabled ? Math.min(value.length, CODE_LENGTH - 1) : -1

  return (
    <div ref={scope} className="relative">
      <input
        ref={ref}
        value={value}
        onChange={(e) => accept(e.target.value)}
        onPaste={onPaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={CODE_LENGTH + 4}
        enterKeyHint="done"
        aria-label={`รหัส ${CODE_LENGTH} หลักจากอีเมล`}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        className="absolute inset-0 z-10 h-full w-full cursor-text bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none selection:bg-transparent"
      />
      <div className="pointer-events-none grid grid-cols-6 gap-2 sm:gap-2.5" aria-hidden>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const digit = value[i] ?? ''
          const on = i === active
          return (
            <span
              key={i}
              className={`relative flex h-16 items-center justify-center rounded-2xl border-2 bg-white font-display text-[1.75rem] font-semibold text-ink transition-colors ${
                invalid ? 'border-danger/60' : on ? 'border-coral shadow-[0_0_0_4px_rgb(255_122_107/0.18)]' : digit ? 'border-peach' : 'border-line'
              } ${disabled ? 'opacity-60' : ''}`}
            >
              {digit && (
                <motion.span initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy}>
                  {digit}
                </motion.span>
              )}
              {on && !digit && <span className="h-7 w-0.5 animate-pulse rounded-full bg-coral" />}
            </span>
          )
        })}
      </div>
    </div>
  )
})
