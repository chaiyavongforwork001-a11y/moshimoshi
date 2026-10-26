import { AnimatePresence, motion, useSpring, type MotionValue } from 'motion/react'
import { MOCHI, SIGNAL_GRADIENT } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { CHAPTERS } from './chapters'

// A curly phone cord drawn as a looping (prolate) cycloid running top → bottom.
const H = 520
const W = 44
const LOOPS = 15
function cordPath() {
  const r = H / (2 * Math.PI * LOOPS)
  const d = r * 1.75
  const steps = LOOPS * 28
  let p = ''
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * LOOPS
    const y = 4 + ((r * t - d * Math.sin(t) + d) / (H + 2 * d)) * (H - 8)
    const x = W / 2 + 11 * Math.cos(t)
    p += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return p
}
const CORD = cordPath()

/** Desktop: the curly cord hangs down the left margin (away from the 3D subjects) and fills as you travel; each chapter is a knot you can jump to. */
export function CordProgress({
  progress,
  chapter,
  onJump,
}: {
  progress: MotionValue<number>
  chapter: number
  onJump: (i: number) => void
}) {
  const drawn = useSpring(progress, { stiffness: 120, damping: 24 })
  return (
    <nav aria-label={t('บทของเรื่อง', 'Story chapters')} className="absolute top-1/2 left-4 h-[min(60vh,520px)] w-11 -translate-y-1/2 xl:left-6">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="cord-grad" x1="0" y1="0" x2="0" y2="1">
            {SIGNAL_GRADIENT.map((c, i) => (
              <stop key={c} offset={i / (SIGNAL_GRADIENT.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
        <path d={CORD} fill="none" stroke="rgb(59 38 34 / 0.12)" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <motion.path
          d={CORD}
          fill="none"
          stroke="url(#cord-grad)"
          strokeWidth={3.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ pathLength: drawn }}
        />
      </svg>
      <ol className="absolute inset-0">
        {CHAPTERS.map((c, i) => {
          const on = i === chapter
          const passed = i <= chapter
          return (
            <li key={c.key} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: `${(i / (CHAPTERS.length - 1)) * 100}%` }}>
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-label={t(`ไปที่บท ${c.title}`, `Go to chapter: ${c.title}`)}
                aria-current={on ? 'step' : undefined}
                className="group relative flex size-11 items-center justify-center rounded-full"
              >
                <motion.span
                  className="flex items-center justify-center rounded-full border-2 border-white shadow-[var(--shadow-soft)] ring-1 ring-ink/15"
                  animate={{ width: on ? 34 : 16, height: on ? 34 : 16, backgroundColor: passed ? MOCHI[c.color].base : '#FFFFFF' }}
                  transition={spring.bouncy}
                >
                  <AnimatePresence>
                    {on && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring.bouncy} className="flex">
                        <c.Icon size={16} strokeWidth={2.5} className="text-ink" aria-hidden />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
                {/* the chapter text already names the current step, so labels only show on hover / focus */}
                <span
                  className="glass pointer-events-none absolute left-full z-10 ml-1 -translate-x-2 rounded-full px-3 py-1 font-display text-xs font-semibold whitespace-nowrap opacity-0 transition-[opacity,translate] duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                  aria-hidden
                >
                  {c.label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Phones: six signal bars that fill chapter by chapter, plus the chapter name. */
export function SignalBars({ chapter }: { chapter: number }) {
  const c = CHAPTERS[chapter]
  return (
    <div className="glass inline-flex h-9 items-center gap-2.5 rounded-full pr-3.5 pl-3" aria-hidden>
      <span className="flex h-5 items-end gap-[3px]">
        {CHAPTERS.map((ch, i) => (
          <motion.span
            key={ch.key}
            className="block w-[4px] rounded-full"
            style={{ height: 6 + i * 2.8 }}
            animate={{ backgroundColor: i <= chapter ? SIGNAL_GRADIENT[Math.min(4, Math.round((i / 5) * 4))] : 'rgba(59,38,34,0.15)' }}
            transition={{ duration: 0.25 }}
          />
        ))}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={c.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="font-display text-xs font-semibold"
        >
          {c.label}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
