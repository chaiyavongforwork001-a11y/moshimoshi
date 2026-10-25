import { AnimatePresence, motion } from 'motion/react'
import { spring } from '@/lib/motion'
import { NAME_MAX } from '../model'

/** Little frosted name badge that sits under the 3D mochi and updates as you type. */
export function NameTag({ name }: { name: string }) {
  const n = name.trim().slice(0, NAME_MAX)
  return (
    <span
      className="glass relative inline-flex h-10 max-w-[85%] items-center gap-2 rounded-full px-4 font-display text-[15px] font-semibold text-ink"
    >
      <span className="size-2.5 shrink-0 rounded-full bg-success shadow-[0_0_0_3px_rgb(255_255_255/0.9)]" aria-hidden />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={n ? 'name' : 'empty'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={spring.soft}
          className={`truncate ${n ? '' : 'text-ink-soft'}`}
        >
          {n || 'ชื่อเล่น'}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
