import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'motion/react'
import { ArrowRight, ChevronDown, Hand, MousePointer2, PhoneCall, Play } from 'lucide-react'
import { useRef } from 'react'
import { HeroScene, View3D } from '@/components/three'
import { ButtonLink } from '@/components/ui'
import { ROOMS } from '@/data/mock'
import { useCoarsePointer, useIsDesktop } from '@/lib/hooks'
import { ease, spring, stagger } from '@/lib/motion'
import { Magnetic } from './fx'
import { useIntroReady } from './intro'
import { Graphemes } from './kinetic'
import { Twinkle, useTryCta } from './shared'
import { scrollToSection } from './smoothScroll'

const ONLINE_NOW = ROOMS.reduce((n, r) => n + r.onlineCount, 0)
const HEADLINE = 'หาเพื่อนจากเรื่องที่ชอบ คุยกันแบบอุ่นใจ'

type Word = { text: string; mark?: 'underline' | 'highlight' }
const LINES: Word[][] = [
  [{ text: 'หา' }, { text: 'เพื่อน' }, { text: 'จาก' }],
  [{ text: 'เรื่องที่ชอบ', mark: 'underline' }],
  [{ text: 'คุยกัน' }, { text: 'แบบ' }, { text: 'อุ่นใจ', mark: 'highlight' }],
]

function Underline({ show, still }: { show: boolean; still: boolean }) {
  return (
    <svg viewBox="0 0 200 22" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-[0.12em] left-[-3%] h-[0.3em] w-[106%] overflow-visible" aria-hidden>
      <motion.path
        d="M4 14C40 5 74 4 106 9S168 16 196 6"
        fill="none"
        stroke="var(--color-coral)"
        strokeWidth={7}
        strokeLinecap="round"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={{ pathLength: show ? 1 : 0 }}
        transition={{ duration: 0.75, delay: 0.95, ease: ease.out }}
      />
      <motion.path
        d="M30 20C70 14 120 14 170 16"
        fill="none"
        stroke="var(--color-peach)"
        strokeWidth={4.5}
        strokeLinecap="round"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={{ pathLength: show ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 1.4, ease: ease.out }}
      />
    </svg>
  )
}

function HeadlineWord({ word, show, still }: { word: Word; show: boolean; still: boolean }) {
  if (word.mark === 'underline') {
    return (
      <span className="relative inline-block whitespace-nowrap">
        <Graphemes text={word.text} />
        <Underline show={show} still={still} />
      </span>
    )
  }
  if (word.mark === 'highlight') {
    return (
      <span className="relative isolate inline-block whitespace-nowrap">
        <motion.span
          aria-hidden
          className="absolute inset-x-[-0.12em] bottom-[0.12em] -z-10 h-[0.5em] origin-left rounded-[0.35em_0.6em_0.45em_0.3em] bg-butter"
          style={{ rotate: -1.6 }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: show ? 1 : 0 }}
          transition={{ delay: 1.2, duration: 0.55, ease: ease.out }}
        />
        <Graphemes text={word.text} />
        <motion.span
          className="absolute -top-[0.22em] -right-[0.48em] inline-block size-[0.4em]"
          initial={{ scale: 0, rotate: -90 }}
          animate={show ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -90 }}
          transition={{ ...spring.bouncy, delay: 1.65 }}
        >
          <Twinkle className="size-full animate-float" color="var(--color-coral)" />
        </motion.span>
      </span>
    )
  }
  return (
    <span className="inline-block whitespace-nowrap">
      <Graphemes text={word.text} />
    </span>
  )
}

/** Small glass chip inviting a drag (mouse) or a tap (touch) on the 3D mochi. */
function PlayHint({ show, coarse, reduce }: { show: boolean; coarse: boolean; reduce: boolean }) {
  const Icon = coarse ? Hand : MousePointer2
  return (
    <motion.p
      initial={{ opacity: 0, scale: 0.7, y: 10 }}
      animate={show ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.7, y: 10 }}
      transition={{ ...spring.bouncy, delay: reduce ? 0 : 1.9 }}
      className="glass inline-flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-[13px] font-semibold whitespace-nowrap"
    >
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-butter/80" aria-hidden>
        <Icon size={15} className={reduce ? '' : 'animate-wiggle'} />
      </span>
      {coarse ? 'แตะโมจิดูสิ' : 'ลากโมจิเล่นได้นะ'}
    </motion.p>
  )
}

const riseV: Variants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: spring.soft },
}

/**
 * Full-bleed hero: the 3D world fills the first screen, giant chunky type
 * sits over its empty side (left on desktop, lower half on phones).
 */
export function Hero() {
  const tryCta = useTryCta()
  const desktop = useIsDesktop()
  const coarse = useCoarsePointer()
  const reduce = !!useReducedMotion()
  const ready = useIntroReady()
  const show = ready || reduce
  const ref = useRef<HTMLElement>(null)

  // copy lifts away a little faster than the page while the hero scrolls off
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -160])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.6], [1, reduce ? 1 : 0])
  const chromeOpacity = useTransform(scrollYProgress, [0, 0.25], [1, reduce ? 1 : 0])
  const state = show ? 'show' : 'hidden'

  return (
    <section id="top" ref={ref} aria-labelledby="hero-title" className="relative h-[100svh] min-h-[560px] w-full outline-none">
      <div className="absolute inset-0">
        <View3D className="size-full" label="โลกพาสเทลของน้องโมชิ มีโทรศัพท์สีพาสเทลกำลังดังกริ๊ง และเพื่อนโมชิล้อมวงคุยกัน">
          <HeroScene compact={!desktop} />
        </View3D>
      </div>

      {/* soft cream scrims under the copy only, never over the characters: along the bottom on phones, a left glow on desktop */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-cream via-cream/80 to-cream/0 lg:hidden" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-[56%] bg-[radial-gradient(ellipse_at_0%_72%,rgb(255_247_238/0.88)_0%,rgb(255_247_238/0.5)_40%,rgb(255_247_238/0)_72%)] lg:block"
      />

      <motion.div style={{ y: copyY, opacity: copyOpacity }} className="pointer-events-none absolute inset-0 flex items-end">
        <div className="mx-auto w-full max-w-7xl px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-12 lg:pb-[clamp(2.5rem,9vh,6rem)]">
          <motion.div variants={stagger(0.08, 0.05)} initial="hidden" animate={state} className="pointer-events-auto relative max-w-[46rem]">
            {/* play hint (phones: in the gap above the headline; tablets: on the badge row; short screens have no room) */}
            <div className="pointer-events-none absolute right-0 bottom-full mb-3 sm:top-0 sm:bottom-auto sm:mb-0 lg:hidden [@media(max-height:760px)]:hidden">
              <PlayHint show={show} coarse={coarse} reduce={reduce} />
            </div>
            <motion.p
              variants={riseV}
              className="glass hidden max-w-full items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-[13px] font-semibold sm:inline-flex sm:text-sm sm:[@media(max-height:500px)]:hidden"
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-mint/70" aria-hidden>
                <PhoneCall size={15} className="animate-wiggle" />
              </span>
              <span>โมชิโมชิ~ ตอนนี้มีเพื่อนคุยกันอยู่ {ONLINE_NOW} คน</span>
              <span className="relative flex size-2.5 shrink-0" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-50" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
            </motion.p>

            <h1
              id="hero-title"
              style={{ textWrap: 'wrap' }}
              className="font-display text-[min(2.7rem,5.6svh)] leading-[1.24] font-bold tracking-tight min-[400px]:text-[min(3rem,6svh)] sm:mt-4 sm:text-[min(4.5rem,9.5svh)] lg:mt-5 lg:text-[clamp(3.25rem,5.2vw,5.6rem)] lg:leading-[1.16]"
            >
              <span className="sr-only">{HEADLINE}</span>
              <motion.span aria-hidden className="block" variants={stagger(0.03, 0.15)}>
                {LINES.map((line, li) => (
                  <span key={li} className="block">
                    {line.map((w) => (
                      <HeadlineWord key={w.text} word={w} show={show} still={reduce} />
                    ))}
                  </span>
                ))}
              </motion.span>
            </h1>

            <motion.p variants={riseV} className="mt-4 max-w-md text-[15px] leading-relaxed text-pretty text-ink-soft sm:text-lg lg:mt-6 lg:max-w-md xl:max-w-lg">
              เข้าห้องตามเรื่องที่ชอบ เจอคนคลื่นตรงกัน แล้วค่อยๆ สนิทกันในวงเล็กๆ ไม่ต้องรีบ<span className="max-sm:hidden"> แค่เป็นตัวเองก็พอ</span>
            </motion.p>
            <motion.div variants={riseV} className="mt-5 flex flex-wrap items-center gap-3 lg:mt-8">
              <Magnetic>
                <ButtonLink to="/onboarding" size="lg" iconRight={<ArrowRight size={20} strokeWidth={2.6} />}>
                  เริ่มเลย
                </ButtonLink>
              </Magnetic>
              <Magnetic>
                <ButtonLink to={tryCta.to} size="lg" variant="secondary" icon={<Play size={18} strokeWidth={2.6} />} className="bg-white/70! backdrop-blur-md pointer-coarse:bg-white/90! pointer-coarse:backdrop-blur-none">
                  {tryCta.label}
                </ButtonLink>
              </Magnetic>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* play hint (desktop): bottom-right, under the characters */}
      <motion.div style={{ opacity: chromeOpacity }} className="pointer-events-none absolute right-12 bottom-[clamp(2.5rem,9vh,6rem)] hidden lg:block">
        <PlayHint show={show} coarse={coarse} reduce={reduce} />
      </motion.div>

      {/* scroll cue (desktop) */}
      <motion.div style={{ opacity: chromeOpacity }} className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 lg:block">
        <motion.button
          type="button"
          onClick={() => scrollToSection('manifesto', reduce)}
          initial={{ opacity: 0, y: -8 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
          transition={{ ...spring.soft, delay: reduce ? 0 : 2.2 }}
          className="flex min-h-11 flex-col items-center gap-1 rounded-full px-4 py-1 text-xs font-semibold text-ink-soft hover:text-ink"
        >
          <span className="flex h-9 w-6 justify-center rounded-full border-2 border-ink/25 pt-1.5" aria-hidden>
            <motion.span
              className="block size-1.5 rounded-full bg-coral"
              animate={reduce ? undefined : { y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
          <span className="flex items-center gap-1">
            เลื่อนลงมาเที่ยวกัน
            <ChevronDown size={14} aria-hidden />
          </span>
        </motion.button>
      </motion.div>
    </section>
  )
}
