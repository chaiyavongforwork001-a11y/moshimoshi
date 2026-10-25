import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { useId } from 'react'
import { MOCHI, MOCHI_COLORS } from '@/lib/colors'
import { spring } from '@/lib/motion'
import type { MochiColor } from '@/lib/types'
import { COLOR_NAME } from '@/pages/people/lib'

/** Mochi colour picker: real radio inputs, puffy swatches, 44px+ targets. */
export function ColorSwatches({
  value,
  onChange,
  legend,
  size = 40,
  className = '',
}: {
  value: MochiColor
  onChange: (c: MochiColor) => void
  legend: string
  size?: number
  className?: string
}) {
  const name = useId()
  return (
    <fieldset className={className}>
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-wrap items-center gap-1">
        {MOCHI_COLORS.map((c) => {
          const p = MOCHI[c]
          const on = value === c
          return (
            <label key={c} className="relative inline-flex size-11 cursor-pointer items-center justify-center" style={{ width: Math.max(44, size + 4), height: Math.max(44, size + 4) }}>
              <input type="radio" name={name} value={c} checked={on} onChange={() => onChange(c)} className="peer sr-only" />
              <motion.span
                aria-hidden
                whileTap={{ scale: 0.85 }}
                animate={{ scale: on ? 1.08 : 1 }}
                transition={spring.bouncy}
                className="flex items-center justify-center rounded-full ring-offset-2 ring-offset-cream peer-focus-visible:outline-3 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-lavender"
                style={{
                  width: size,
                  height: size,
                  background: `radial-gradient(circle at 35% 30%, white 0%, ${p.light} 30%, ${p.base} 70%, ${p.shade} 100%)`,
                  boxShadow: on ? `0 0 0 3px ${p.shade}, inset 0 -3px 0 ${p.shade}` : `inset 0 -3px 0 ${p.shade}`,
                }}
              >
                {on && <Check size={size * 0.42} strokeWidth={3} color={p.ink} />}
              </motion.span>
              <span className="sr-only">สี{COLOR_NAME[c]}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
