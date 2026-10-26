import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Ear, Phone } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, type MochiFace } from '@/components/ui'
import { t } from '@/lib/i18n'
import { fadeUp, spring } from '@/lib/motion'
import { graphemes } from './hooks'
import { SignalBars, TypingDots } from './Signal'

interface MascotSaysProps {
  /** the step's question — rendered as the page <h1> */
  line: string
  sub?: string
  face: MochiFace
  /** follow-up bubble reacting to what the visitor just did */
  reaction?: string | null
  /** move focus to the heading (after a step change) so screen readers follow along */
  focusOnMount?: boolean
  /** show the quiet "listening" cue while there's no reply */
  listening?: boolean
}

/**
 * น้องโมชิ talking in a chat thread: the question types itself out
 * (space reserved up front, so nothing jumps), then little reaction
 * bubbles pop in underneath as the visitor fills things in.
 */
export function MascotSays({ line, sub, face, reaction, focusOnMount, listening = true }: MascotSaysProps) {
  const reduce = useReducedMotion()
  const heading = useRef<HTMLHeadingElement>(null)
  const [typing, setTyping] = useState(!reduce)

  useEffect(() => {
    if (focusOnMount) heading.current?.focus({ preventScroll: true })
  }, [focusOnMount])

  return (
    <motion.div variants={fadeUp} className="flex items-start gap-3 sm:gap-4">
      <div className={`relative mt-1 shrink-0 rounded-full bg-white p-1.5 shadow-[var(--shadow-soft)] ${reduce ? '' : 'animate-float'}`}>
        <Avatar color="cream" size={46} face={typing ? 'talk' : face} />
        <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full border-2 border-white bg-mint text-ink" aria-hidden>
          <Phone size={11} strokeWidth={2.8} />
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring.bouncy}
          style={{ originX: 0, originY: 0 }}
          className="relative w-fit max-w-full rounded-[1.6rem] rounded-tl-md bg-white px-4 py-3 shadow-[var(--shadow-soft)] sm:px-5 sm:py-4"
        >
          <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            {t('น้องโมชิ', 'Little Mochi')} <SignalBars ringing={typing} />
          </p>
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-display text-[1.35rem] leading-[1.5] font-semibold text-ink outline-none sm:text-[1.65rem]"
          >
            <span className="sr-only">{line}</span>
            <TypedText key={line} text={line} instant={!!reduce} onDone={() => setTyping(false)} />
          </h1>
          {sub && <p className="mt-1 text-sm text-ink-soft sm:text-[15px]">{sub}</p>}
        </motion.div>

        {/* slot keeps its height so the form below doesn't jump when a reply pops in */}
        <div aria-live="polite" className={listening ? 'flex min-h-11 items-start' : 'flex items-start'}>
          <AnimatePresence mode="wait" initial={false}>
            {reaction ? <ReactionBubble key={reaction} text={reaction} /> : listening && <Listening key="listening" />}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

function TypedText({ text, instant, onDone }: { text: string; instant: boolean; onDone: () => void }) {
  const parts = useMemo(() => graphemes(text), [text])
  const [n, setN] = useState(instant ? parts.length : 0)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })

  useEffect(() => {
    if (instant) {
      done.current()
      return
    }
    let i = 0
    let iv = 0
    const t = window.setTimeout(() => {
      iv = window.setInterval(() => {
        i += 1
        setN(i)
        if (i >= parts.length) {
          window.clearInterval(iv)
          done.current()
        }
      }, 30)
    }, 420)
    return () => {
      window.clearTimeout(t)
      window.clearInterval(iv)
    }
  }, [parts, instant])

  return (
    <span aria-hidden className="relative block">
      <span className="invisible">{text}</span>
      <span className="absolute inset-0">
        {n === 0 && !instant ? (
          <TypingDots />
        ) : (
          <>
            {parts.slice(0, n).join('')}
            {n < parts.length && <span className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] rounded-full bg-coral" />}
          </>
        )}
      </span>
    </span>
  )
}

/** Quiet "I'm here" state between replies. */
function Listening() {
  const reduce = useReducedMotion()
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.3, delay: 0.6 }}
      aria-hidden
      className="inline-flex h-11 items-center gap-1.5 pl-1 text-xs font-semibold text-ink-soft"
    >
      <motion.span
        className="inline-flex"
        animate={reduce ? undefined : { rotate: [0, -12, 0, 12, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      >
        <Ear size={14} />
      </motion.span>
      {t('น้องโมชิฟังอยู่นะ', 'Little Mochi is listening')}
    </motion.p>
  )
}

function ReactionBubble({ text }: { text: string }) {
  const reduce = useReducedMotion()
  const [ready, setReady] = useState(!!reduce)
  useEffect(() => {
    if (reduce) return
    const t = window.setTimeout(() => setReady(true), 520)
    return () => window.clearTimeout(t)
  }, [reduce])

  return (
    <motion.p
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.14 } }}
      transition={spring.bouncy}
      style={{ originX: 0, originY: 0 }}
      className="w-fit max-w-full rounded-[1.4rem] rounded-tl-md bg-butter/60 px-4 py-2.5 text-[15px] text-ink shadow-[var(--shadow-soft)]"
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden>{ready ? text : <TypingDots />}</span>
    </motion.p>
  )
}
