import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  useVelocity,
  type Variants,
} from 'motion/react'
import { useEffect, useRef } from 'react'
import { StoryScene, View3D } from '@/components/three'
import { useIsDesktop } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { fadeUp, spring } from '@/lib/motion'
import { STORY_CHAPTERS, useStory } from '@/lib/scrollStory'
import { KineticTitle } from '../kinetic'
import { scrollToTarget } from '../smoothScroll'
import { ChapterCard, CHAPTERS, type Chapter } from './chapters'
import { StoryStatic } from './StoryStatic'
import { CordProgress, SignalBars } from './StoryProgress'

const N = STORY_CHAPTERS.length
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v))

/**
 * Copy opacity across the camera flights: full during each chapter's still
 * shot, dimmed near the boundaries where big sets pass behind the headline
 * (mirrors the scene's hold / travel timing in story/timeline.ts).
 */
function copyOpacity(p: number) {
  const x = Math.min(N, Math.max(0, p * N))
  const i = Math.min(N - 1, Math.floor(x))
  const c = x - i
  // nothing flies in before the first chapter or out after the last
  const d = Math.min(i > 0 ? c : Infinity, i < N - 1 ? 1 - c : Infinity)
  const t = Math.min(1, Math.max(0, (d - 0.05) / 0.13))
  return 0.35 + 0.65 * t * t * (3 - 2 * t)
}

const blockV: Variants = {
  hidden: (dir: number) => ({ opacity: 0, y: dir * 36 }),
  show: { opacity: 1, y: 0, transition: { ...spring.soft, staggerChildren: 0.05 } },
  exit: (dir: number) => ({ opacity: 0, y: dir * -36, filter: 'blur(6px)', transition: { duration: 0.2 } }),
}

function ChapterBlock({ chapter, index, dir }: { chapter: Chapter; index: number; dir: number }) {
  const cta = chapter.key === 'call'
  return (
    <motion.div
      custom={dir}
      variants={blockV}
      initial="hidden"
      animate="show"
      exit="exit"
      // the sr-only list above carries the text; only the final CTA stays reachable here
      aria-hidden={cta ? undefined : true}
      className="w-full"
    >
      <motion.p variants={fadeUp} className="flex items-center gap-2.5 font-display text-sm font-semibold text-ink">
        <span className="glass inline-flex items-center gap-2 rounded-full py-1 pr-3.5 pl-1">
          <span className="inline-flex size-7 items-center justify-center rounded-full" style={{ background: `var(--color-${chapter.color})` }}>
            <chapter.Icon size={15} strokeWidth={2.5} />
          </span>
          {chapter.eyebrow}
        </span>
        <span className="text-xs tracking-widest text-ink-soft tabular-nums">
          {String(index + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
        </span>
      </motion.p>
      <KineticTitle
        inherit
        as="h3"
        text={chapter.title}
        gap={0.024}
        // the finale's camera brings the guide close, so its title wraps onto two lines on desktop
        className={`${cta ? 'lg:max-w-[24rem] ' : ''}mt-3 font-display text-[2.35rem] leading-[1.24] font-bold tracking-tight sm:text-6xl lg:mt-4 lg:text-[clamp(2.9rem,4.4vw,4.6rem)] lg:leading-[1.16]`}
      />
      <motion.p variants={fadeUp} className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft sm:text-lg lg:mt-4">
        {chapter.line}
      </motion.p>
      <motion.div variants={fadeUp} className={`mt-4 max-w-sm lg:mt-6 ${cta ? 'max-w-none' : 'max-lg:[@media(max-height:740px)]:hidden'}`}>
        <ChapterCard chapter={chapter.key} />
      </motion.div>
    </motion.div>
  )
}

/** The scroll journey: a sticky full-screen 3D stage with chapter overlays. */
function StoryJourney() {
  const desktop = useIsDesktop()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const velocity = useVelocity(scrollYProgress)
  const flightOpacity = useTransform(scrollYProgress, copyOpacity)
  const chapter = useStory((s) => s.chapter)
  const prev = useRef(chapter)
  const dir = chapter >= prev.current ? 1 : -1
  useEffect(() => {
    prev.current = chapter
  }, [chapter])

  // DOM writes, the 3D scene reads (useStory.getState() inside useFrame)
  const push = () => useStory.getState().setScroll(scrollYProgress.get(), clamp1(velocity.get() / 0.45))
  useMotionValueEvent(scrollYProgress, 'change', push)
  useMotionValueEvent(velocity, 'change', push)
  useEffect(() => {
    push()
    return () => useStory.getState().setScroll(0, 0)
  }, [])

  // load the story scene only once the visitor heads this way (keeps the hero light)
  const near = useInView(ref, { margin: '150% 0px 150% 0px', once: true })

  const jump = (i: number) => {
    const el = ref.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const travel = el.offsetHeight - window.innerHeight
    scrollToTarget(top + ((i + 0.45) / N) * travel, false)
  }

  return (
    <section id="story" ref={ref} aria-labelledby="story-title" className="relative h-[540vh] outline-none lg:h-[600vh]">
      <div className="sr-only">
        <h2 id="story-title">{t('ทำงานยังไง: เรื่องของโมชิ', "How it works: Mochi's story")}</h2>
        <ol>
          {CHAPTERS.map((c) => (
            <li key={c.key}>
              {c.title}: {c.line}
            </li>
          ))}
        </ol>
      </div>

      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-0">
          {near && (
            <View3D
              className="size-full"
              label={t(
                'น้องโมชิพาเที่ยวโลกพาสเทล ผ่านห้องคุย สัญญาณถูกคอ วงเพื่อน และมุมรับฟัง',
                'Little Mochi takes you through a pastel world: rooms, the vibe signal, friend circles and the listening corner',
              )}
            >
              <StoryScene compact={!desktop} />
            </View3D>
          )}
        </div>

        {/* soft scrims behind the copy only */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-cream via-cream/80 to-cream/0 lg:hidden" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-[52%] bg-[radial-gradient(ellipse_at_0%_50%,rgb(255_247_238/0.92)_0%,rgb(255_247_238/0.6)_40%,rgb(255_247_238/0)_75%)] lg:block"
        />

        <div className="pointer-events-none absolute inset-0">
          <div className="mx-auto flex h-full max-w-7xl items-end px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-8 lg:items-center lg:px-12 lg:pb-0 lg:pl-[max(3rem,calc(5rem-max(0px,(100vw-80rem)/2)))]">
            <motion.div style={desktop ? { opacity: flightOpacity } : undefined} className="pointer-events-auto relative w-full max-w-[36rem] lg:max-w-[38rem]">
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <ChapterBlock key={chapter} chapter={CHAPTERS[chapter]} index={chapter} dir={dir} />
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {desktop ? (
          <CordProgress progress={scrollYProgress} chapter={chapter} onJump={jump} />
        ) : (
          <div className="absolute top-[calc(env(safe-area-inset-top)+4.6rem)] left-4">
            <SignalBars chapter={chapter} />
          </div>
        )}
      </div>
    </section>
  )
}

export function StorySection() {
  const reduce = useReducedMotion()
  return reduce ? <StoryStatic /> : <StoryJourney />
}
