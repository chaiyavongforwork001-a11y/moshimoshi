import { Html } from '@react-three/drei'
import { useThree, type ThreeElements } from '@react-three/fiber'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { MOCHI } from '@/lib/colors'
import { ease, spring } from '@/lib/motion'
import type { MochiColor } from '@/lib/types'
import { useIsViewActive } from './viewActive'
import { useViewElement } from './viewElement'

export type SpeechBubbleProps = ThreeElements['group'] & {
  text: string
  color?: MochiColor
  /** seconds before it pops in */
  delay?: number
  /** which side the tail points to (the bubble grows the other way) */
  side?: 'left' | 'right'
  /** cycle through these lines; each one is "typed" in with … first */
  lines?: string[]
  /** ms each line stays up (default 4200) */
  interval?: number
  /** ms the bubble hides between lines; 0 keeps it open (default 0) */
  rest?: number
  /** text size multiplier (e.g. 0.9 for friends further back) */
  size?: number
  /** opt into drei's distance scaling; by default the text size follows the view height */
  distanceFactor?: number
}

const TYPING_MS = 950
const TAIL_X = 22 // px from the bubble edge to the tail tip (= the 3D anchor)
const isDots = (s: string) => /^\s*(\.{3}|…)\s*$/.test(s)

type Phase = { i: number; mode: 'hidden' | 'typing' | 'line' }

function TypingDots() {
  const reduce = useReducedMotion()
  return (
    <span className="inline-flex h-[1.5em] items-center gap-[0.28em] px-[0.2em]" aria-label="กำลังพิมพ์">
      {[0, 1, 2].map((i) =>
        reduce ? (
          <span key={i} className="block size-[0.42em] rounded-full bg-ink-soft opacity-70" />
        ) : (
          <motion.span
            key={i}
            className="block size-[0.42em] rounded-full bg-ink-soft"
            animate={{ y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
          />
        ),
      )}
    </span>
  )
}

/** static stand-in with the typing dots' footprint (for measuring) */
function DotsSizer() {
  return (
    <span className="inline-flex h-[1.5em] items-center gap-[0.28em] px-[0.2em]">
      <span className="block size-[0.42em]" />
      <span className="block size-[0.42em]" />
      <span className="block size-[0.42em]" />
    </span>
  )
}

/** DOM side of the bubble (rendered by drei <Html> in its own React root). */
function BubbleBody({
  all,
  color,
  delay,
  side,
  interval,
  rest,
  fontSize,
  floatSeed,
}: {
  all: string[]
  color: MochiColor
  delay: number
  side: 'left' | 'right'
  interval: number
  rest: number
  fontSize: number
  floatSeed: number
}) {
  // reduced motion: the first line, shown still (the calm final state)
  const reduce = !!useReducedMotion()
  const [phase, setPhase] = useState<Phase>(() => (reduce ? { i: 0, mode: 'line' } : { i: 0, mode: 'hidden' }))
  const cycling = all.length > 1 || rest > 0
  const linesKey = all.join('\u0001')

  useEffect(() => {
    if (reduce) {
      setPhase({ i: 0, mode: 'line' })
      return
    }
    let alive = true
    let timer = 0
    const first: Phase['mode'] = cycling && !isDots(all[0]) ? 'typing' : 'line'
    const go = (mode: Phase['mode'], i: number, ms: number) => {
      timer = window.setTimeout(() => alive && step(mode, i), ms)
    }
    const step = (mode: Phase['mode'], i: number) => {
      setPhase({ mode, i })
      if (mode === 'typing') go('line', i, TYPING_MS)
      else if (mode === 'line' && cycling) {
        const next = (i + 1) % all.length
        // keep the current line while the bubble fades out; advance after the rest
        if (rest > 0) go('hidden', i, interval)
        else go(isDots(all[next]) ? 'line' : 'typing', next, interval)
      } else if (mode === 'hidden') {
        const next = (i + 1) % all.length
        go(isDots(all[next]) ? 'line' : 'typing', next, rest)
      }
    }
    go(first, 0, delay * 1000)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
    // linesKey stands in for `all`
  }, [linesKey, cycling, delay, interval, rest, reduce])

  const p = MOCHI[color]
  const shown = phase.mode !== 'hidden'
  const left = side === 'left'
  const current = all[phase.i] ?? ''
  const dots = phase.mode === 'typing' || isDots(current)

  // track the measurer (also catches the Thai web font arriving late)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const read = () => setWidth(Math.ceil(el.getBoundingClientRect().width))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-hidden
        className="pointer-events-none select-none"
        style={{
          fontSize,
          transform: left ? `translate(-${TAIL_X}px, -100%)` : `translate(calc(-100% + ${TAIL_X}px), -100%)`,
        }}
      >
        <motion.div
          initial={false}
          animate={shown ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.35, opacity: 0, y: 8 }}
          transition={shown ? spring.bouncy : { duration: 0.22, ease: ease.out }}
          style={{
            transformOrigin: left ? `${TAIL_X}px 100%` : `calc(100% - ${TAIL_X}px) 100%`,
            filter: 'drop-shadow(0 8px 14px rgb(201 92 64 / 0.2)) drop-shadow(0 1px 2px rgb(59 38 34 / 0.08))',
          }}
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -4, 0] }}
            transition={{ duration: 3.2 + (floatSeed % 7) * 0.25, repeat: Infinity, ease: 'easeInOut', delay: (floatSeed % 5) * 0.3 }}
            className="relative pb-[10px]"
          >
            {/* invisible measurer: the bubble eases between the typing pill and each line's own width */}
            <span
              ref={measureRef}
              aria-hidden
              className="invisible absolute top-0 left-0 px-[0.95em] font-display leading-[1.5] font-medium whitespace-nowrap"
            >
              {dots ? <DotsSizer /> : current}
            </span>
            <motion.div
              initial={false}
              animate={width ? { width } : undefined}
              transition={spring.soft}
              className="relative grid grid-cols-[minmax(0,1fr)] justify-items-center overflow-hidden rounded-[1.15em] py-[0.42em] text-center font-display leading-[1.5] font-medium whitespace-nowrap text-ink"
              style={{ background: p.light, boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.85), inset 0 -2px 0 rgb(59 38 34 / 0.05)' }}
            >
              <AnimatePresence initial={false}>
                <motion.span
                  key={dots ? `dots-${phase.i}` : `line-${phase.i}`}
                  className="col-start-1 row-start-1 self-center"
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
                  transition={spring.soft}
                >
                  {dots ? <TypingDots /> : current}
                </motion.span>
              </AnimatePresence>
            </motion.div>
            {/* tail */}
            <svg
              width="20"
              height="12"
              viewBox="0 0 20 12"
              className="absolute bottom-[-1px]"
              style={left ? { left: TAIL_X - 3 } : { right: TAIL_X - 3, transform: 'scaleX(-1)' }}
              aria-hidden
            >
              <path d="M5 0H19C15 3 9.5 8.5 3 12C5.2 8 6 4 5 0Z" fill={p.light} />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </MotionConfig>
  )
}

/**
 * A speech bubble anchored in 3D. Rendered as DOM via drei <Html> so Thai
 * web fonts apply. The tail tip sits exactly on the group's position.
 */
export function SpeechBubble({
  text,
  color = 'cream',
  delay = 0,
  side = 'left',
  lines,
  interval = 4200,
  rest = 0,
  size = 1,
  distanceFactor,
  ...group
}: SpeechBubbleProps) {
  const el = useViewElement()
  // offscreen views drop their bubbles: no per-frame projection, no timers, no motion loops
  const active = useIsViewActive()
  const viewH = useThree((s) => s.size.height)
  const viewW = useThree((s) => s.size.width)
  const portal = useMemo(() => ({ current: el }) as RefObject<HTMLElement>, [el])
  const all = useMemo(() => (lines && lines.length ? lines : [text]), [lines, text])
  // follows the view (narrow phones get a slightly smaller bubble), 12.5–16.5px
  const fontSize = Math.round(Math.min(16.5, Math.max(12.5, Math.min(viewH * 0.034, viewW * 0.038))) * size * 10) / 10
  const floatSeed = useMemo(() => [...all.join('')].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 997, 7), [all])

  return (
    <group {...group}>
      {el && active && (
        <Html
          portal={portal}
          distanceFactor={distanceFactor}
          zIndexRange={[9, 0]}
          pointerEvents="none"
          wrapperClass="pointer-events-none"
        >
          <BubbleBody
            all={all}
            color={color}
            delay={delay}
            side={side}
            interval={interval}
            rest={rest}
            fontSize={fontSize}
            floatSeed={floatSeed}
          />
        </Html>
      )}
    </group>
  )
}
