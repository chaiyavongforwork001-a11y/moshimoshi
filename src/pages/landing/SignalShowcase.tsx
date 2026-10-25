import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { BadgeCheck, MessageCircleMore, Signal, SignalHigh, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Avatar, Chip, ReasonIcon, SignalMeter, WaveMatch, type MochiFace } from '@/components/ui'
import { MOCHI, SIGNAL_GRADIENT } from '@/lib/colors'
import { signalMeta } from '@/lib/matching'
import { spring } from '@/lib/motion'
import type { MatchReasonKind, MochiColor, SignalLevel } from '@/lib/types'
import { Drifter } from './fx'
import { SectionIntro, Squiggle, Twinkle } from './shared'

// Example reasons unlock one by one as the signal gets stronger.
const REASONS: { kind: MatchReasonKind; text: string; from: SignalLevel }[] = [
  { kind: 'room', text: 'อยู่ห้องนั่งเล่นเหมือนกัน', from: 1 },
  { kind: 'tag', text: 'ชอบคาเฟ่เงียบๆ เหมือนกัน', from: 2 },
  { kind: 'time', text: 'ออนไลน์ช่วงดึกเหมือนกัน', from: 3 },
  { kind: 'intent', text: 'กำลังหาเพื่อนเล่นเกมชิลๆ คืนนี้เหมือนกัน', from: 4 },
  { kind: 'rareTag', text: 'ชอบ Hollow Knight เหมือนกัน ซึ่งหาคนชอบยากมาก', from: 5 },
]

const FACES: Record<SignalLevel, [MochiFace, MochiFace]> = {
  1: ['smile', 'smile'],
  2: ['smile', 'talk'],
  3: ['happy', 'smile'],
  4: ['happy', 'happy'],
  5: ['wink', 'happy'],
}

// panel tint warms up from lavender to peach as the level rises
const TINT: Record<SignalLevel, MochiColor> = { 1: 'lavender', 2: 'lavender', 3: 'pink', 4: 'peach', 5: 'peach' }

const clampLevel = (n: number) => Math.min(5, Math.max(1, n)) as SignalLevel

export function SignalShowcase() {
  const reduce = !!useReducedMotion()
  const [level, setLevel] = useState<SignalLevel>(reduce ? 4 : 1)
  const touched = useRef(false)
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.45 })
  // the card tips up from the table as it scrolls in
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.3'] })
  const rotateX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [22, 0])
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.86, 1])
  const cardY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [80, 0])

  // first time the card is on screen, it tunes itself 1 → 4 as a little demo
  useEffect(() => {
    if (!seen || reduce) return
    const timers = ([2, 3, 4] as SignalLevel[]).map((l, i) =>
      setTimeout(() => {
        if (!touched.current) setLevel(l)
      }, 600 + i * 700),
    )
    return () => timers.forEach(clearTimeout)
  }, [seen, reduce])

  const choose = (l: SignalLevel) => {
    touched.current = true
    setLevel(l)
  }

  return (
    <section id="signal" aria-labelledby="signal-title" className="relative scroll-mt-24 px-4 py-20 outline-none sm:px-6 lg:py-32">
      <div className="relative mx-auto max-w-6xl">
        <Drifter distance={70} rotate={20} className="absolute top-4 left-[6%] hidden md:block">
          <Twinkle className="size-10" color="var(--color-lavender)" />
        </Drifter>
        <Drifter distance={110} rotate={-12} className="absolute top-24 right-[8%] hidden md:block">
          <Squiggle className="w-24" color="var(--color-peach)" />
        </Drifter>
        <Drifter distance={50} className="absolute top-40 left-[14%] hidden md:block">
          <Twinkle className="size-5" />
        </Drifter>
        <SectionIntro center id="signal-title" eyebrow="สัญญาณถูกคอ" icon={<Signal size={15} />} tone="bg-lavender/50" title="ไม่ใช่คะแนน แต่เป็นขีดสัญญาณ">
          เหมือนขีดสัญญาณโทรศัพท์ ยิ่งขีดเยอะ ยิ่งน่าจะคุยกันถูกคอ ไม่มีเปอร์เซ็นต์ ไม่มีใครถูกตัดสินว่าน้อยกว่าใคร ลองเลื่อนจูนดูได้เลย
        </SectionIntro>

        <motion.div
          ref={ref}
          style={{ rotateX, scale, y: cardY, transformPerspective: 1200, transformOrigin: '50% 100%' }}
          className="relative mx-auto mt-12 grid max-w-5xl overflow-hidden rounded-[2.25rem] border border-white bg-white/85 shadow-[var(--shadow-lift)] backdrop-blur lg:grid-cols-[1.05fr_1fr]"
        >
          <Tuner level={level} onChange={choose} reduce={reduce} />
          <Explain level={level} />
        </motion.div>

        <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2" aria-label="สัญญาของสัญญาณถูกคอ">
          <li>
            <Chip color="lavender" icon={<SignalHigh size={15} />}>
              เป็นสเกล ไม่ใช่คะแนน
            </Chip>
          </li>
          <li>
            <Chip color="butter" icon={<MessageCircleMore size={15} />}>
              บอกเหตุผลทุกครั้ง
            </Chip>
          </li>
          <li>
            <Chip color="mint" icon={<BadgeCheck size={15} />}>
              ระดับไหนก็เริ่มคุยได้
            </Chip>
          </li>
        </ul>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- left: the tuner
function Tuner({ level, onChange, reduce }: { level: SignalLevel; onChange: (l: SignalLevel) => void; reduce: boolean }) {
  const meta = signalMeta(level)
  const faces = FACES[level]
  const shift = (level - 1) * 9
  const tint = MOCHI[TINT[level]]
  return (
    <motion.div
      className="relative p-6 sm:p-8"
      animate={{ backgroundImage: `linear-gradient(160deg, ${tint.light} 0%, rgba(255,255,255,0) 75%)` }}
      transition={{ duration: 0.5 }}
    >
      <p className="font-display text-sm font-semibold text-ink-soft">ลองจูนดู</p>

      <div className="relative mt-5 flex items-center gap-1">
        <motion.span animate={{ x: shift }} transition={spring.bouncy} className="relative z-10">
          <Avatar color="peach" size={64} face={faces[0]} label="เรา" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <WaveMatch level={level} height={60} />
        </div>
        <motion.span animate={{ x: -shift }} transition={spring.bouncy} className="relative z-10">
          <Avatar color="lavender" size={64} face={faces[1]} label="เพื่อนใหม่" />
        </motion.span>
        <AnimatePresence>
          {level === 5 &&
            [
              { x: '38%', y: -18, s: 18, d: 0 },
              { x: '52%', y: -30, s: 24, d: 0.08 },
              { x: '62%', y: -12, s: 14, d: 0.16 },
            ].map((t, i) => (
              <motion.span
                key={i}
                className="pointer-events-none absolute top-0"
                style={{ left: t.x, width: t.s, height: t.s }}
                initial={{ scale: 0, rotate: -90, y: 0 }}
                animate={{ scale: 1, rotate: 0, y: t.y }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ ...spring.bouncy, delay: reduce ? 0 : t.d }}
                aria-hidden
              >
                <Twinkle className="size-full" color={i === 1 ? 'var(--color-coral)' : 'var(--color-butter)'} />
              </motion.span>
            ))}
        </AnimatePresence>
      </div>
      <div className="mt-1 flex justify-between px-3 text-xs font-semibold text-ink-soft" aria-hidden>
        <span>เรา</span>
        <span>เพื่อนใหม่</span>
      </div>

      <div className="mt-6 flex justify-center">
        <SignalMeter key={level} level={level} size="lg" showLabel={false} />
      </div>
      <div className="relative mt-2 h-12" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={level}
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={spring.bouncy}
            className="text-center font-display text-[1.75rem] leading-[1.6] font-semibold sm:text-3xl"
          >
            {meta.label}
          </motion.p>
        </AnimatePresence>
      </div>

      <SignalSlider level={level} onChange={onChange} />
    </motion.div>
  )
}

/** Five-notch slider: drag, tap a notch, or use arrow keys. Snaps to whole levels only. */
function SignalSlider({ level, onChange }: { level: SignalLevel; onChange: (l: SignalLevel) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const pct = ((level - 1) / 4) * 100

  const fromPointer = (clientX: number) => {
    const r = track.current?.getBoundingClientRect()
    if (!r) return level
    return clampLevel(Math.round(((clientX - r.left) / r.width) * 4) + 1)
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    onChange(fromPointer(e.clientX))
  }
  const stop = () => {
    dragging.current = false
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    // the button was released somewhere we never heard about (alt-tab, lost capture)
    if (e.pointerType === 'mouse' && e.buttons === 0) return stop()
    const l = fromPointer(e.clientX)
    if (l !== level) onChange(l)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? level + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? level - 1
          : e.key === 'Home'
            ? 1
            : e.key === 'End'
              ? 5
              : null
    if (next === null) return
    e.preventDefault()
    onChange(clampLevel(next))
  }

  return (
    <div className="mt-4">
      <div
        role="slider"
        tabIndex={0}
        aria-label="จูนระดับสัญญาณถูกคอ"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={level}
        aria-valuetext={signalMeta(level).label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={onKeyDown}
        className="relative h-14 cursor-grab touch-pan-y rounded-full select-none active:cursor-grabbing"
      >
        <div ref={track} className="absolute inset-x-5 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-ink/10">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: `linear-gradient(90deg, ${SIGNAL_GRADIENT.join(', ')})` }}
            animate={{ width: `${pct}%` }}
            transition={spring.soft}
          />
          {[1, 2, 3, 4, 5].map((l) => (
            <span
              key={l}
              aria-hidden
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{ left: `${((l - 1) / 4) * 100}%`, background: l <= level ? SIGNAL_GRADIENT[l - 1] : 'rgb(59 38 34 / 0.15)' }}
            />
          ))}
          <motion.span
            aria-hidden
            className="absolute top-1/2 flex size-10 items-center justify-center rounded-full bg-white shadow-[var(--shadow-puffy)]"
            style={{ x: '-50%', y: '-50%' }}
            animate={{ left: `${pct}%` }}
            whileTap={{ scale: 0.9 }}
            transition={spring.bouncy}
          >
            <SignalHigh size={18} strokeWidth={2.6} className="text-ink" />
          </motion.span>
        </div>
      </div>
      <div className="flex justify-between px-1 text-xs font-semibold text-ink-soft" aria-hidden>
        <span>เพิ่งจูนคลื่น</span>
        <span>คลื่นเดียวกันเป๊ะ</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- right: what it means
function Explain({ level }: { level: SignalLevel }) {
  const meta = signalMeta(level)
  return (
    <div className="relative border-t border-line p-6 sm:p-8 lg:border-t-0 lg:border-l">
      <p className="text-xs font-semibold tracking-wide text-ink-soft">ระดับนี้แปลว่า</p>
      <div className="min-h-[3.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={level}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-1 text-lg text-ink"
          >
            {meta.hint}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="mt-5 text-xs font-semibold tracking-wide text-ink-soft">เหตุผลที่เราจะบอกให้รู้เสมอ</p>
      <ul className="mt-2 space-y-2">
        {REASONS.map((r, i) => {
          const on = r.from <= level
          return (
            <li key={r.text} className="relative min-h-11" aria-hidden={!on}>
              <AnimatePresence initial={false} mode="popLayout">
                {on ? (
                  <motion.div
                    key="on"
                    initial={{ opacity: 0, x: -18, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 18, scale: 0.97 }}
                    transition={spring.bouncy}
                    className="flex items-start gap-2.5 rounded-2xl bg-cream px-3 py-2.5 text-sm text-ink"
                  >
                    <ReasonIcon kind={r.kind} />
                    <span>{r.text}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="off"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-11 items-center gap-2.5 rounded-2xl border-2 border-dashed border-line px-3"
                  >
                    <span className="size-5 rounded-full bg-ink/8" />
                    <span className="h-2.5 rounded-full bg-ink/8" style={{ width: `${42 + ((i * 17) % 38)}%` }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>

      <p className="mt-5 flex items-start gap-2.5 rounded-2xl bg-butter/45 p-3.5 text-sm text-ink">
        <Sparkles size={18} className="mt-0.5 shrink-0" aria-hidden />
        <span>ระดับไหนก็เริ่มคุยได้นะ เพื่อนสนิทหลายคนก็เริ่มจาก “เพิ่งจูนคลื่น” นี่แหละ</span>
      </p>
    </div>
  )
}
