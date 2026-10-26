import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { ArrowRight, Download, Menu, X } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { Button, ButtonLink, IconButton, LangToggle } from '@/components/ui'
import { getLang, L, loc, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useIntroReady } from './intro'
import { scrollToSection } from './smoothScroll'

interface NavSection {
  id: string
  label: string
}

export const SECTIONS: NavSection[] = [
  loc<NavSection>({ id: 'story', label: L('ทำงานยังไง', 'How it works') }),
  loc<NavSection>({ id: 'signal', label: L('สัญญาณถูกคอ', 'Vibe signal') }),
  loc<NavSection>({ id: 'rooms', label: L('ห้องคุย', 'Rooms') }),
  loc<NavSection>({ id: 'safe', label: L('อุ่นใจ', 'Safety') }),
]
const SECTION_IDS = SECTIONS.map((s) => s.id)

/** Which section is under the middle of the viewport. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.id
          if (e.isIntersecting) setActive(id)
          else setActive((a) => (a === id ? null : a))
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids])
  return active
}

/** The phone menu's open state, kept across the remount a language switch causes (the toggle lives in it). */
let menuOpen = false

/** Floating glass pill nav. Phones get a compact bar plus a drop-down sheet of links. */
export function LandingNav({ onInstall }: { onInstall: () => void }) {
  const reduce = useReducedMotion()
  const ready = useIntroReady()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(() => menuOpen)
  const active = useActiveSection(SECTION_IDS)

  useEffect(() => {
    menuOpen = open
  }, [open])
  useEffect(() => {
    const lang = getLang()
    return () => {
      // leaving the page closes it; a language switch (remount) keeps it
      if (getLang() === lang) menuOpen = false
    }
  }, [])

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    scrollToSection(id, reduce)
  }

  return (
    <motion.header
      initial={reduce ? false : { y: -90, opacity: 0 }}
      animate={ready ? { y: 0, opacity: 1 } : { y: -90, opacity: 0 }}
      transition={{ ...spring.soft, delay: 0.35 }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6"
    >
      <nav
        aria-label={t('เมนูหน้าแรก', 'Home page menu')}
        className={`mx-auto flex max-w-6xl items-center gap-2 rounded-full p-1.5 transition-[background-color,box-shadow,border-color] duration-500 sm:p-2 ${
          // touch devices skip the live blur over the WebGL canvas (a frame-time sink on mid-range GPUs)
          scrolled ? 'glass' : 'border border-white/70 bg-white/45 backdrop-blur-md pointer-coarse:bg-white/80 pointer-coarse:backdrop-blur-none'
        }`}
      >
        <a href="#top" onClick={go('top')} className="group flex min-h-11 items-center gap-2 rounded-full pr-2" aria-label={t('moshimoshi กลับขึ้นบนสุด', 'moshimoshi, back to top')}>
          <motion.img
            src="/logo.svg"
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-[0.9rem] shadow-[var(--shadow-soft)]"
            whileHover={{ rotate: -10, scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            transition={spring.bouncy}
          />
          <span className="font-display text-xl font-bold tracking-tight">moshimoshi</span>
        </a>

        <ul className="mx-auto hidden items-center gap-1 lg:flex">
          {SECTIONS.map((s) => {
            const on = active === s.id
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={go(s.id)}
                  aria-current={on ? 'true' : undefined}
                  // px-3 until xl leaves room for the language toggle at 1024px (English labels run longer)
                  className={`relative inline-flex h-11 items-center rounded-full px-3 font-display text-[15px] font-semibold transition-colors xl:px-4 ${on ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
                >
                  {on && <motion.span layoutId="landing-nav-pill" className="absolute inset-0 rounded-full bg-butter/70" transition={spring.bouncy} />}
                  <span className="relative">{s.label}</span>
                </a>
              </li>
            )
          })}
        </ul>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 lg:ml-0">
          {/* phones: the bar is full, so the toggle lives in the drop-down menu instead */}
          <LangToggle className="max-sm:hidden" />
          <Button variant="soft" size="md" icon={<Download size={18} />} onClick={onInstall} className="hidden md:inline-flex">
            {t('ติดตั้งแอป', 'Install app')}
          </Button>
          <ButtonLink to="/app" variant="dark" size="md" iconRight={<ArrowRight size={18} className="hidden sm:block" />}>
            {t('เข้าแอป', 'Open app')}
          </ButtonLink>
          <IconButton
            label={open ? t('ปิดเมนู', 'Close menu') : t('เปิดเมนู', 'Open menu')}
            variant="ghost"
            aria-expanded={open}
            aria-controls="landing-menu"
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? 'x' : 'menu'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="inline-flex"
              >
                {open ? <X size={22} /> : <Menu size={22} />}
              </motion.span>
            </AnimatePresence>
          </IconButton>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="landing-menu"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={spring.soft}
            className="glass mx-auto mt-2 max-w-6xl origin-top rounded-[1.75rem] p-2 lg:hidden"
          >
            <ul className="grid gap-1 sm:grid-cols-2">
              {SECTIONS.map((s, i) => (
                <motion.li key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.soft, delay: 0.04 * i }}>
                  <a
                    href={`#${s.id}`}
                    onClick={go(s.id)}
                    className={`flex h-12 items-center rounded-2xl px-4 font-display font-semibold ${active === s.id ? 'bg-butter/60' : 'hover:bg-white/80'}`}
                  >
                    {s.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="mt-1 flex h-12 items-center justify-between gap-3 rounded-2xl pr-1.5 pl-4 sm:hidden">
              <span className="font-display font-semibold">{t('ภาษา', 'Language')}</span>
              <LangToggle size="sm" />
            </div>
            <Button
              variant="primary"
              block
              icon={<Download size={18} />}
              className="mt-2 md:hidden"
              onClick={() => {
                setOpen(false)
                onInstall()
              }}
            >
              {t('ติดตั้งแอปบนมือถือ', 'Install on your phone')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
