import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar, LangToggle, type MochiFace } from '@/components/ui'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { MochiColor } from '@/lib/types'

interface AuthShellProps {
  face: MochiFace
  color?: MochiColor
  /** a little speech bubble above the card */
  bubble?: string
  children: ReactNode
}

/** Shared frame for the auth pages: logo, a mochi peeking over a glass card. */
export function AuthShell({ face, color = 'peach', bubble, children }: AuthShellProps) {
  const reduce = useReducedMotion()
  return (
    <div className="relative z-10 flex min-h-dvh flex-col overflow-x-clip">
      <header className="safe-top flex items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="mt-1 inline-flex items-center gap-2 rounded-full pr-2 font-display text-xl font-semibold text-ink" aria-label={t('moshimoshi หน้าแรก', 'moshimoshi home')}>
          <Avatar color="cream" size={36} face="happy" />
          moshimoshi
        </Link>
        <LangToggle size="sm" className="mt-1" />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pt-6 pb-12 sm:px-6">
        <div className="relative w-full max-w-md">
          <span aria-hidden className="pointer-events-none absolute -top-10 -left-16 size-56 rounded-full bg-butter/40 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -right-14 bottom-0 size-56 rounded-full bg-pink/40 blur-3xl" />

          <div className="relative flex flex-col items-center">
            {bubble && (
              <motion.p
                key={bubble}
                initial={reduce ? false : { opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={spring.bouncy}
                className="relative mb-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-ink shadow-[var(--shadow-soft)]"
                aria-hidden
              >
                {bubble}
                <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-white" />
              </motion.p>
            )}
            <motion.div
              initial={reduce ? false : { y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={spring.bouncy}
              className={`relative z-10 -mb-9 ${reduce ? '' : 'animate-float'}`}
            >
              <Avatar color={color} size={104} face={face} />
            </motion.div>
          </div>

          <motion.section
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring.soft}
            className="glass relative rounded-[2.25rem] px-5 pt-12 pb-6 sm:px-8 sm:pb-8"
          >
            {children}
          </motion.section>
        </div>
      </main>
    </div>
  )
}

/** The small grey divider with a word in the middle ("หรือ"). */
export function Divider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-sm text-ink-soft" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

/** Inline error line under a field (announced as an alert). */
export function ErrorNote({ id, text }: { id: string; text: string | null }) {
  return (
    <p id={id} role="alert" className={`min-h-6 text-sm font-semibold text-danger ${text ? '' : 'invisible'}`}>
      {text ?? ' '}
    </p>
  )
}
