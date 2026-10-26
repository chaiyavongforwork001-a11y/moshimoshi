import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { InstallSheet } from '@/app/InstallSheet'
import { useFinePointer } from '@/components/motion'
import { t } from '@/lib/i18n'
import { Footer } from './Footer'
import { Hero } from './Hero'
import { InstallBand } from './InstallBand'
import { IntroContext, markIntroSeen, shouldPlayIntro } from './intro'
import { LandingNav } from './LandingNav'
import { ListenSection } from './ListenSection'
import { Manifesto } from './Manifesto'
import { Preloader } from './Preloader'
import { RoomsMarquee } from './RoomsMarquee'
import { SignalShowcase } from './SignalShowcase'
import { lockScroll, useSmoothScroll } from './smoothScroll'
import { Stories } from './Stories'
import { StorySection } from './story/StorySection'

// Pastel blobs drifting at different speeds behind the 2D sections (depth).
// They live below the story, so they never wash over a 3D view.
const BLOBS = [
  { top: '2%', side: 'left-[-12rem]', size: 'size-[28rem]', tone: 'bg-lavender/30', speed: -0.12 },
  { top: '18%', side: 'right-[-10rem]', size: 'size-[24rem]', tone: 'bg-mint/30', speed: -0.07 },
  { top: '38%', side: 'left-[20%]', size: 'size-[22rem]', tone: 'bg-butter/35', speed: -0.15 },
  { top: '58%', side: 'right-[-8rem]', size: 'size-[26rem]', tone: 'bg-pink/30', speed: -0.1 },
  { top: '78%', side: 'left-[-10rem]', size: 'size-[24rem]', tone: 'bg-peach/30', speed: -0.08 },
]

function Blob({ blob, scrollY }: { blob: (typeof BLOBS)[number]; scrollY: MotionValue<number> }) {
  const y = useTransform(scrollY, (v) => v * blob.speed)
  return <motion.span aria-hidden style={{ y, top: blob.top }} className={`absolute rounded-full blur-3xl will-change-transform ${blob.side} ${blob.size} ${blob.tone}`} />
}

function ParallaxBlobs() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const travel = useTransform(scrollYProgress, (p) => p * 2400)
  if (reduce) return null
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {BLOBS.map((b) => (
        <Blob key={b.top} blob={b} scrollY={travel} />
      ))}
    </div>
  )
}

export default function LandingPage() {
  const reduce = !!useReducedMotion()
  const [playIntro] = useState(shouldPlayIntro)
  const [ready, setReady] = useState(!playIntro)
  const [loading, setLoading] = useState(playIntro)
  const [installOpen, setInstallOpen] = useState(false)
  const openInstall = useCallback(() => setInstallOpen(true), [])
  const closeInstall = useCallback(() => setInstallOpen(false), [])
  const reveal = useCallback(() => setReady(true), [])
  const done = useCallback(() => {
    markIntroSeen()
    setLoading(false)
  }, [])

  const fine = useFinePointer()
  useSmoothScroll(!reduce && fine)

  // no scrolling under the preloader or an open sheet
  const locked = loading || installOpen
  useEffect(() => {
    if (!locked) return
    lockScroll(true)
    return () => lockScroll(false)
  }, [locked])

  useEffect(() => {
    document.title = t('moshimoshi — หาเพื่อนจากเรื่องที่ชอบ คุยกันแบบอุ่นใจ', 'moshimoshi — find friends through what you love, feel at home')
  }, [])

  return (
    <IntroContext.Provider value={ready}>
      {/* z-10 keeps the page above the fixed WebGL canvas; overflow-x-clip (not hidden) so sticky still works */}
      <div className="relative isolate z-10 min-h-dvh overflow-x-clip">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2.5 focus:text-cream"
        >
          {t('ข้ามไปที่เนื้อหา', 'Skip to content')}
        </a>
        {/* the page under the preloader stays out of the tab order until it is revealed */}
        <div inert={loading || undefined}>
          <LandingNav onInstall={openInstall} />
          <main id="main">
            <Hero />
            <Manifesto />
            <StorySection />
            <div className="relative isolate">
              <ParallaxBlobs />
              <SignalShowcase />
              <RoomsMarquee />
              <ListenSection />
              <Stories />
              <InstallBand onInstall={openInstall} />
            </div>
          </main>
          <Footer onInstall={openInstall} />
        </div>
        <InstallSheet open={installOpen} onClose={closeInstall} />
        {loading && <Preloader onReveal={reveal} onDone={done} />}
      </div>
    </IntroContext.Provider>
  )
}
