import { motion } from 'motion/react'
import { spring } from '@/lib/motion'

/**
 * Squishy segmented progress: finished segments fill with a warm gradient,
 * the current one swells longer and plumper like a mochi being pressed.
 */
export function StepProgress({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label="ความคืบหน้า"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step + 1}
      aria-valuetext={`ขั้นที่ ${step + 1} จาก ${total}: ${label}`}
      className="flex h-4 items-center gap-1.5"
    >
      {Array.from({ length: total }, (_, i) => {
        const current = i === step
        return (
          <motion.span
            key={i}
            className="relative block overflow-hidden rounded-full bg-ink/10"
            style={{ flexBasis: 0 }}
            initial={false}
            animate={{ flexGrow: current ? 2.6 : 1, height: current ? 14 : 9 }}
            transition={spring.bouncy}
          >
            <motion.span
              className="absolute inset-0 origin-left rounded-full bg-linear-to-r from-peach to-coral"
              initial={false}
              animate={{ scaleX: i <= step ? 1 : 0 }}
              transition={{ ...spring.bouncy, delay: current ? 0.08 : 0 }}
            />
            {current && <span className="absolute inset-x-2 top-[3px] h-[3px] rounded-full bg-white/60" />}
          </motion.span>
        )
      })}
    </div>
  )
}
