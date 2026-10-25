import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity, type Variants } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MOCHI } from '@/lib/colors'
import { spring } from '@/lib/motion'
import { useFinePointer } from './pointer'

type Mode = { kind: 'idle' | 'hover' | 'text' | 'hidden' } | { kind: 'label'; label: string }

const IDLE: Mode = { kind: 'idle' }
const HOVER: Mode = { kind: 'hover' }
const TEXT: Mode = { kind: 'text' }
const HIDDEN: Mode = { kind: 'hidden' }

const TEXT_INPUT =
  'textarea, [contenteditable=""], [contenteditable="true"], input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="image"])'
const INTERACTIVE =
  'a[href], button:not(:disabled), select, label, summary, [role="button"], [role="tab"], [role="switch"], [role="option"], [role="menuitem"], [data-cursor-hover]'

/**
 * What the pointer is over. `data-cursor="ดูโปรไฟล์"` shows a label pill,
 * `data-cursor=""` just grows the blob, `data-cursor="none"` hides it.
 * A button nested inside a labelled card wins over the card's label.
 */
function modeFor(target: EventTarget | null): Mode {
  if (!(target instanceof Element)) return IDLE
  if (target.closest(TEXT_INPUT)) return TEXT
  const labelled = target.closest<HTMLElement>('[data-cursor]')
  const inter = target.closest(INTERACTIVE)
  if (labelled && !(inter && inter !== labelled && labelled.contains(inter))) {
    const label = labelled.dataset.cursor?.trim() ?? ''
    if (label === 'none') return HIDDEN
    return label ? { kind: 'label', label } : HOVER
  }
  return inter ? HOVER : IDLE
}

const same = (a: Mode, b: Mode) => a.kind === b.kind && (a.kind !== 'label' || (b.kind === 'label' && a.label === b.label))

// where the blob sits relative to the arrow tip: a little friend trailing at the lower right
const BLOB: Variants = {
  idle: { x: 18, y: 20, scale: 1, opacity: 1 },
  hover: { x: 0, y: 0, scale: 2.2, opacity: 0.32 },
  label: { x: 18, y: 20, scale: 0, opacity: 0 },
  text: { x: 14, y: 18, scale: 0.28, opacity: 0.75 },
  hidden: { x: 18, y: 20, scale: 0, opacity: 0 },
}

const LAG = { stiffness: 420, damping: 32, mass: 0.55 }
const P = MOCHI.peach

/**
 * Desktop-only cursor companion: a tiny mochi that follows the pointer with
 * spring lag, squashes and stretches with speed, squishes on press, grows
 * over buttons and links, turns into a label pill over [data-cursor] and
 * shrinks to a dot over text fields. The native cursor always stays visible.
 * Mounted once; renders nothing on touch screens or with reduced motion.
 */
export function MochiCursor() {
  const fine = useFinePointer()
  const reduce = useReducedMotion()
  return fine && !reduce ? <Cursor /> : null
}

function Cursor() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, LAG)
  const sy = useSpring(y, LAG)
  const vx = useVelocity(sx)
  const vy = useVelocity(sy)
  const stretchOn = useMotionValue(1)
  const [mode, setMode] = useState<Mode>(HIDDEN)
  const [pressed, setPressed] = useState(false)

  // squash & stretch along the direction of travel (rotate, scale, rotate back)
  const stretch = useTransform(() => {
    const ax = vx.get()
    const ay = vy.get()
    const s = Math.min(Math.hypot(ax, ay) / 2800, 0.36) * stretchOn.get()
    if (s < 0.01) return 'none'
    const a = (Math.atan2(ay, ax) * 180) / Math.PI
    return `rotate(${a}deg) scale(${1 + s}, ${1 - s * 0.5}) rotate(${-a}deg)`
  })

  useEffect(() => {
    let current: Mode = HIDDEN
    let shown = false
    const apply = (m: Mode) => {
      if (same(m, current)) return
      current = m
      stretchOn.set(m.kind === 'idle' || m.kind === 'hover' ? 1 : 0)
      setMode(m)
    }
    const hide = () => {
      shown = false
      setPressed(false)
      apply(HIDDEN)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return hide()
      if (!shown) {
        // appear right at the pointer instead of flying in from the last spot
        shown = true
        x.jump(e.clientX)
        y.jump(e.clientY)
        sx.jump(e.clientX)
        sy.jump(e.clientY)
        apply(modeFor(e.target))
        return
      }
      x.set(e.clientX)
      y.set(e.clientY)
    }
    const onOver = (e: PointerEvent) => {
      if (shown && e.pointerType === 'mouse') apply(modeFor(e.target))
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setPressed(true)
    }
    const onUp = () => setPressed(false)
    const root = document.documentElement

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })
    window.addEventListener('blur', hide)
    root.addEventListener('pointerleave', hide)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', hide)
      root.removeEventListener('pointerleave', hide)
    }
  }, [x, y, sx, sy, stretchOn])

  const idle = mode.kind === 'idle'

  return (
    <motion.div aria-hidden className="pointer-events-none fixed top-0 left-0 z-[200]" style={{ x: sx, y: sy }}>
      <motion.div className="absolute top-0 left-0" variants={BLOB} initial="hidden" animate={mode.kind} transition={spring.soft}>
        <motion.div className="absolute -top-3 -left-3 size-6" style={{ transform: stretch }}>
          <motion.div
            className="relative size-full rounded-full"
            animate={pressed ? { scaleX: 1.3, scaleY: 0.72 } : { scaleX: 1, scaleY: 1 }}
            transition={spring.bouncy}
            style={{
              background: `radial-gradient(circle at 34% 28%, ${P.light} 0%, ${P.base} 48%, ${P.shade} 100%)`,
              boxShadow: 'inset -2px -3px 0 rgb(201 92 64 / 0.16), 0 5px 12px -4px rgb(201 92 64 / 0.5)',
            }}
          >
            <motion.span className="absolute inset-0" animate={{ opacity: idle ? 1 : 0 }} transition={{ duration: 0.15 }}>
              <span className="absolute top-[9px] left-[7px] h-[4px] w-[3px] origin-center rounded-full bg-ink [animation:mochi-blink_4.2s_infinite]" />
              <span className="absolute top-[9px] right-[7px] h-[4px] w-[3px] origin-center rounded-full bg-ink [animation:mochi-blink_4.2s_infinite]" />
              <span className="absolute top-[14px] left-[3px] h-[3px] w-[5px] rounded-full bg-coral/45" />
              <span className="absolute top-[14px] right-[3px] h-[3px] w-[5px] rounded-full bg-coral/45" />
            </motion.span>
          </motion.div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {mode.kind === 'label' && (
          <motion.div
            key="label"
            className="absolute top-5 left-[18px] origin-top-left"
            initial={{ opacity: 0, scale: 0.4, rotate: -6 }}
            animate={{ opacity: 1, scale: pressed ? 0.92 : 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.14 } }}
            transition={spring.bouncy}
          >
            <span className="inline-flex h-9 items-center gap-1 rounded-full bg-ink/90 pr-2.5 pl-3.5 font-display text-sm font-semibold whitespace-nowrap text-cream shadow-[0_10px_24px_-10px_rgb(59_38_34/0.6)]">
              {mode.label}
              <ArrowUpRight size={15} strokeWidth={2.6} />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
