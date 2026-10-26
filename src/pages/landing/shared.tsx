import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { MOCHI } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { fadeUp, stagger } from '@/lib/motion'
import type { MochiColor } from '@/lib/types'
import { KineticTitle } from './kinetic'

export { graphemes } from './kinetic'
export { TiltCard, useTilt } from './fx'
export { scrollToSection } from './smoothScroll'

/**
 * The second CTA next to "เริ่มเลย". Demo: try the app as is. Live: the app needs an
 * account, so it says what actually happens (sign in, or straight in when signed in).
 */
export function useTryCta(): { to: string; label: string } {
  const { status } = useAuth()
  if (status === 'demo') return { to: '/app', label: t('ลองเล่นก่อน', 'Try it first') }
  if (status === 'signedIn') return { to: '/app', label: t('ไปที่แอป', 'Go to the app') }
  return { to: '/login?next=%2Fapp', label: t('มีบัญชีแล้ว? เข้าเลย', 'Have an account? Sign in') }
}

/** Small pill label above section titles. */
export function Eyebrow({ icon, children, tone = 'bg-butter/70' }: { icon?: ReactNode; children: ReactNode; tone?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/85 py-1.5 pr-4 pl-1.5 font-display text-sm font-semibold text-ink shadow-[var(--shadow-soft)]">
      <span className={`inline-flex size-7 items-center justify-center rounded-full ${tone}`} aria-hidden>
        {icon}
      </span>
      {children}
    </span>
  )
}

/** Eyebrow + big kinetic title + intro copy, revealed with a soft stagger when scrolled into view. */
export function SectionIntro({
  eyebrow,
  icon,
  tone,
  title,
  children,
  center,
  id,
  className = '',
}: {
  id?: string
  eyebrow: string
  icon?: ReactNode
  tone?: string
  title: string
  children?: ReactNode
  center?: boolean
  className?: string
}) {
  return (
    <motion.div
      variants={stagger(0.08)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      className={`${center ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'} ${className}`}
    >
      <motion.div variants={fadeUp}>
        <Eyebrow icon={icon} tone={tone}>
          {eyebrow}
        </Eyebrow>
      </motion.div>
      <KineticTitle
        inherit
        id={id}
        text={title}
        className="mt-4 font-display text-[2.15rem] leading-[1.35] font-bold tracking-tight sm:text-5xl lg:text-[3.6rem] lg:leading-[1.25]"
      />
      {children && (
        <motion.p variants={fadeUp} className="mt-3 text-base text-ink-soft sm:text-lg">
          {children}
        </motion.p>
      )}
    </motion.div>
  )
}

/** Washi-tape strip for the stationery look. */
export function Tape({ color = 'butter', className = '' }: { color?: MochiColor; className?: string }) {
  const p = MOCHI[color]
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-20 h-6 w-20 rounded-[3px] opacity-90 shadow-[0_2px_4px_rgb(59_38_34/0.08)] ${className}`}
      style={{ background: `repeating-linear-gradient(-45deg, ${p.light} 0 7px, ${p.base} 7px 14px)` }}
    />
  )
}

/** Four-point twinkle star doodle. */
export function Twinkle({ className = '', color = 'var(--color-butter)' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 0C13 7 17 11 24 12 17 13 13 17 12 24 11 17 7 13 0 12 7 11 11 7 12 0Z" fill={color} />
    </svg>
  )
}

/** Hand-drawn squiggle used as a decorative divider. */
export function Squiggle({ className = '', color = 'var(--color-coral)' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 120 16" fill="none" className={className} aria-hidden>
      <path d="M2 9c10-8 18 8 28 0s18 8 28 0 18 8 28 0 18 8 28 0" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

/** Pastel gradient made from a mochi palette (keeps raw hex out of components). */
export const softGradient = (c: MochiColor, angle = 160) => `linear-gradient(${angle}deg, ${MOCHI[c].light} 0%, white 70%)`
