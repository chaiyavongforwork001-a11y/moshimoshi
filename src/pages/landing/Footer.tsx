import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowRight, PhoneCall } from 'lucide-react'
import { useRef, type MouseEvent } from 'react'
import { Link } from 'react-router'
import { MochiCrowd, View3D } from '@/components/three'
import { useStage } from '@/components/three/stage'
import { Avatar, ButtonLink, type MochiFace } from '@/components/ui'
import { useIsDesktop } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { isLive } from '@/lib/supabase'
import type { MochiColor } from '@/lib/types'
import { LegalLinks } from '@/pages/legal/LegalLinks'
import { Magnetic } from './fx'
import { KineticTitle } from './kinetic'
import { SECTIONS } from './LandingNav'
import { useTryCta } from './shared'
import { scrollToSection } from './smoothScroll'

const PEEKERS: { color: MochiColor; face: MochiFace; x: string; size: number }[] = [
  { color: 'pink', face: 'happy', x: '8%', size: 64 },
  { color: 'mint', face: 'smile', x: '24%', size: 52 },
  { color: 'butter', face: 'wink', x: '62%', size: 58 },
  { color: 'lavender', face: 'happy', x: '78%', size: 70 },
  { color: 'sky', face: 'smile', x: '90%', size: 48 },
]
const CROWD_WIDE: MochiColor[] = ['pink', 'mint', 'peach', 'lavender', 'butter']
const CROWD_PHONE: MochiColor[] = ['pink', 'peach', 'lavender']
const WORDMARK = 'moshimoshi'.split('')

/** Mochi peeking over the top edge of the footer card: 3D when we can, 2D stickers otherwise. */
function Peekers() {
  const reduce = useReducedMotion()
  const desktop = useIsDesktop()
  const failed = useStage((s) => s.failed)
  const ref = useRef<HTMLDivElement>(null)
  const near = useInView(ref, { margin: '60% 0px 60% 0px', once: true })
  if (failed) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0" aria-hidden>
        {PEEKERS.map((p, i) => (
          <motion.span
            key={p.color}
            className="absolute bottom-0 -translate-x-1/2"
            style={{ left: p.x }}
            initial={reduce ? false : { y: p.size * 0.9 }}
            whileInView={{ y: p.size * 0.38 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ ...spring.bouncy, delay: 0.1 + i * 0.09 }}
          >
            <Avatar color={p.color} size={p.size} face={p.face} />
          </motion.span>
        ))}
      </div>
    )
  }
  // the opaque card covers the lower part of this box, so the mochi seem to peek over its edge
  return (
    <div ref={ref} className="absolute inset-x-[6%] -top-36 h-44 sm:-top-44 sm:h-52 lg:inset-x-[14%]">
      {near && (
        <View3D className="size-full" label={t('เพื่อนโมชิโผล่หน้ามาทักทาย', 'Mochi friends peeking over to say hi')}>
          <MochiCrowd colors={desktop ? CROWD_WIDE : CROWD_PHONE} />
        </View3D>
      )}
    </div>
  )
}

/** Giant wordmark: letters rise in on view and jiggle like jelly under the pointer. */
function Wordmark() {
  const reduce = useReducedMotion()
  return (
    <p aria-hidden className="pointer-events-auto mt-10 flex justify-center font-display text-[19vw] leading-[0.9] font-bold tracking-tighter text-cream/12 select-none lg:text-[11.5rem]">
      {WORDMARK.map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block origin-bottom"
          initial={reduce ? false : { y: '60%', opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ ...spring.bouncy, delay: i * 0.04 }}
          whileHover={reduce ? undefined : { scaleY: 1.18, scaleX: 0.9, y: -10, color: 'var(--color-peach)' }}
        >
          {ch}
        </motion.span>
      ))}
    </p>
  )
}

export function Footer({ onInstall }: { onInstall: () => void }) {
  const reduce = useReducedMotion()
  const tryCta = useTryCta()
  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    scrollToSection(id, reduce)
  }
  return (
    <footer className="relative px-4 pt-32 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-40">
      <div className="relative mx-auto max-w-6xl">
        <Peekers />

        <div className="relative overflow-hidden rounded-[2.5rem] bg-ink px-6 pt-12 pb-6 text-cream sm:px-10 lg:px-14 lg:pt-16">
          <span aria-hidden className="absolute -top-32 -right-24 size-96 rounded-full bg-coral/20 blur-3xl" />
          <span aria-hidden className="absolute -bottom-40 -left-20 size-96 rounded-full bg-lavender/15 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-cream/10 px-3.5 py-1.5 text-sm font-semibold text-cream">
                <PhoneCall size={15} className="animate-wiggle" aria-hidden />
                {t('โมชิโมชิ~ ได้ยินไหม?', 'Moshi moshi~ can you hear me?')}
              </p>
              <KineticTitle
                text={t('มีเพื่อนรอคุยอยู่นะ', 'Friends are waiting to\u00A0chat')}
                className="mt-4 text-[2.25rem] leading-[1.35] font-bold tracking-tight text-cream sm:text-5xl lg:text-6xl lg:leading-[1.25]"
              />
              <p className="mt-3 max-w-md text-cream/80">
                {t('เริ่มจากเรื่องที่ชอบสักเรื่อง ที่เหลือค่อยๆ เป็นไปเอง ไม่ต้องรีบเลย', 'Start with one thing you love. The rest happens on its own, no rush at all.')}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Magnetic>
                  <ButtonLink to="/onboarding" size="lg" iconRight={<ArrowRight size={20} strokeWidth={2.6} />}>
                    {t('เริ่มเลย', 'Jump in')}
                  </ButtonLink>
                </Magnetic>
                <Magnetic>
                  <ButtonLink to={tryCta.to} size="lg" variant="secondary">
                    {tryCta.label}
                  </ButtonLink>
                </Magnetic>
              </div>
            </div>

            <nav aria-label={t('ลิงก์ท้ายหน้า', 'Footer links')} className="grid grid-cols-2 gap-6 text-[15px]">
              <div>
                <h3 className="font-display text-sm font-semibold tracking-wide text-cream/70">{t('รู้จักโมชิ', 'Get to know us')}</h3>
                <ul className="mt-3 space-y-1">
                  {SECTIONS.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} onClick={go(s.id)} className="inline-flex min-h-11 items-center text-cream/90 hover:text-cream hover:underline">
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold tracking-wide text-cream/70">{t('เริ่มต้น', 'Get started')}</h3>
                <ul className="mt-3 space-y-1">
                  <li>
                    <Link to="/onboarding" className="inline-flex min-h-11 items-center text-cream/90 hover:text-cream hover:underline">
                      {t('สร้างโปรไฟล์', 'Create a profile')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/app" className="inline-flex min-h-11 items-center text-cream/90 hover:text-cream hover:underline">
                      {t('เข้าแอป', 'Open app')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/app/rooms" className="inline-flex min-h-11 items-center text-cream/90 hover:text-cream hover:underline">
                      {t('ดูห้องทั้งหมด', 'Browse all rooms')}
                    </Link>
                  </li>
                  <li>
                    <button type="button" onClick={onInstall} className="inline-flex min-h-11 items-center text-left text-cream/90 hover:text-cream hover:underline">
                      {t('ติดตั้งแอป', 'Install app')}
                    </button>
                  </li>
                </ul>
              </div>
            </nav>
          </div>

          <Wordmark />

          <div className="relative mt-4 flex flex-col gap-3 border-t border-cream/15 pt-6 text-sm text-cream/75 lg:flex-row lg:items-center lg:justify-between">
            <span className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="" width={32} height={32} className="size-8 rounded-[0.7rem]" />
              <span className="font-display text-lg font-bold text-cream">moshimoshi</span>
            </span>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
              <LegalLinks tone="dark" />
              <span>{isLive ? '© 2026 moshimoshi' : t('ต้นแบบเพื่อการสาธิต ข้อมูลในแอปเป็นตัวอย่างทั้งหมด · © 2026', 'A demo prototype: everything in the app is sample data · © 2026')}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
