import { animate, motion, useMotionTemplate, useMotionValue, useTransform } from 'motion/react'
import { PhoneCall } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui'
import { useStage } from '@/components/three/stage'
import { ease, spring } from '@/lib/motion'
import { graphemes } from './kinetic'

const TYPED = graphemes('โมชิโมชิ…')
const MIN_SHOW = 1500
const MAX_WAIT = 3200

/** Resolves once fonts are in and the WebGL canvas is up (or 3D is off), capped so a slow device never waits long. */
function whenReady(alive: () => boolean) {
  let poll = 0
  let settled = false
  const canvas = new Promise<void>((resolve) => {
    const check = () => {
      if (settled || !alive()) return
      if (document.querySelector('canvas') || useStage.getState().failed) resolve()
      else poll = window.setTimeout(check, 120)
    }
    check()
  })
  const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve()
  const cap = new Promise<void>((resolve) => window.setTimeout(resolve, MAX_WAIT))
  return Promise.race([Promise.all([canvas, fonts]).then(() => undefined), cap]).finally(() => {
    settled = true
    window.clearTimeout(poll)
  })
}

/**
 * First-visit intro: a bouncing mochi "dials" while a progress pill fills,
 * then a soft circular hole opens from the mochi and reveals the hero.
 * onReveal fires as the hole starts to open; onDone once it is gone.
 */
export function Preloader({ onReveal, onDone }: { onReveal: () => void; onDone: () => void }) {
  const [phase, setPhase] = useState<'dial' | 'connected' | 'reveal'>('dial')
  const progress = useMotionValue(0)
  const fill = useTransform(progress, (v) => `${Math.round(v * 100)}%`)
  const hole = useMotionValue(0)
  const edge = useTransform(hole, (r) => r * 1.06 + 1.5)
  const mask = useMotionTemplate`radial-gradient(circle at 50% 44%, transparent ${hole}px, #000 ${edge}px)`
  const started = useRef(false)
  const skipRef = useRef<() => void>(() => {})
  const cbs = useRef({ onReveal, onDone })
  cbs.current = { onReveal, onDone }

  useEffect(() => {
    let alive = true
    const t0 = performance.now()
    const crawl = animate(progress, 0.82, { duration: 1.4, ease: ease.out })
    const finish = async () => {
      if (!alive || started.current) return
      started.current = true
      crawl.stop()
      await animate(progress, 1, { duration: 0.35, ease: ease.out })
      if (!alive) return
      setPhase('connected')
      await new Promise((r) => window.setTimeout(r, 380))
      if (!alive) return
      setPhase('reveal')
      cbs.current.onReveal()
      const far = Math.hypot(window.innerWidth, window.innerHeight)
      // jelly pop around the mochi, then the hole sweeps out to the corners
      await animate(hole, 84, { type: 'spring', stiffness: 380, damping: 12, mass: 0.6 })
      if (!alive) return
      await animate(hole, far, { duration: 0.85, ease: [0.65, 0, 0.25, 1] })
      if (alive) cbs.current.onDone()
    }
    whenReady(() => alive && !started.current).then(() => {
      if (!alive) return
      const wait = Math.max(0, MIN_SHOW - (performance.now() - t0))
      window.setTimeout(finish, wait)
    })
    // a tap or a key press skips ahead
    const skip = () => void finish()
    skipRef.current = skip
    window.addEventListener('keydown', skip)
    return () => {
      alive = false
      crawl.stop()
      window.removeEventListener('keydown', skip)
    }
  }, [progress, hole])

  const revealing = phase === 'reveal'
  return (
    <motion.div
      role="status"
      aria-live="polite"
      onClick={() => skipRef.current()}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-cream"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <span className="sr-only">{phase === 'dial' ? 'กำลังโหลด moshimoshi' : 'พร้อมแล้ว'}</span>
      <span aria-hidden className="absolute -top-32 -left-24 size-[26rem] rounded-full bg-peach/40 blur-3xl" />
      <span aria-hidden className="absolute -right-24 -bottom-36 size-[24rem] rounded-full bg-lavender/30 blur-3xl" />

      {/* the mochi sits where the reveal hole opens (50% / 44%) */}
      <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-[62%]" aria-hidden>
        <motion.div
          animate={
            revealing
              ? { scale: [1, 1.25, 0], y: [0, -18, 0], transition: { duration: 0.42, times: [0, 0.45, 1], ease: 'easeInOut' } }
              : { y: [0, -46, 0, 0], scaleX: [1, 0.92, 1.18, 1], scaleY: [1, 1.1, 0.82, 1] }
          }
          transition={{ duration: 0.9, repeat: Infinity, times: [0, 0.42, 0.82, 1], ease: 'easeInOut' }}
          className="flex origin-bottom"
        >
          <Avatar color="peach" size={112} face={phase === 'dial' ? 'smile' : 'sparkle'} />
        </motion.div>
        <motion.span
          // the body ends ~12% above the box bottom: the shadow sits ~6 px under it
          className="mx-auto -mt-3.5 block h-3 w-20 rounded-full bg-ink/10"
          animate={revealing ? { opacity: 0 } : { scaleX: [1, 0.6, 1.1, 1], opacity: [0.9, 0.5, 1, 0.9] }}
          transition={{ duration: 0.9, repeat: revealing ? 0 : Infinity, times: [0, 0.42, 0.82, 1] }}
        />
      </div>

      <motion.div
        className="absolute top-[56%] flex flex-col items-center gap-5"
        animate={revealing ? { opacity: 0, y: 14, scale: 0.96 } : { opacity: 1, y: 0, scale: 1 }}
        transition={spring.soft}
      >
        <p className="font-display text-3xl font-semibold text-ink" aria-hidden>
          {TYPED.map((g, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 10, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...spring.bouncy, delay: 0.25 + i * 0.11 }}
            >
              {g}
            </motion.span>
          ))}
          <motion.span
            className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.12em] rounded-full bg-coral"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </p>

        <div className="relative h-10 w-56 overflow-hidden rounded-full bg-white shadow-[var(--shadow-soft)]" aria-hidden>
          <motion.span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-peach to-coral" style={{ width: fill }} />
          <span className="relative flex h-full items-center justify-center gap-2 font-display text-sm font-semibold text-ink">
            <PhoneCall size={15} strokeWidth={2.6} className={phase === 'dial' ? 'animate-wiggle' : ''} />
            {phase === 'dial' ? 'กำลังต่อสายหาเพื่อน…' : 'ต่อติดแล้ว~'}
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
