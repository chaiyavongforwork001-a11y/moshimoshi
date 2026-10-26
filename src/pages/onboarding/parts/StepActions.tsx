import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { CornerDownLeft } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Button } from '@/components/ui'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'

interface StepActionsProps {
  label: string
  icon?: ReactNode
  ok: boolean
  /** what's still missing, shown instead of the label while blocked */
  need?: string
  /** bumps every time the visitor presses next while blocked → wiggle + announce */
  nudge: number
  onNext: () => void
  variant: 'bar' | 'row'
}

/**
 * Next button. Phones: a frosted bar pinned above the home indicator.
 * Desktop: a sticky row under the form with a keyboard hint.
 * It never goes truly disabled — pressing it explains what's missing.
 */
export function StepActions({ label, icon, ok, need, nudge, onNext, variant }: StepActionsProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>()

  useEffect(() => {
    if (nudge && scope.current) animate(scope.current, { x: [0, -9, 9, -6, 6, 0] }, { duration: 0.42 })
  }, [nudge, animate, scope])

  const button = (
    <div ref={scope} className={variant === 'bar' ? 'w-full' : ''}>
      <Button
        size="lg"
        block={variant === 'bar'}
        onClick={onNext}
        aria-disabled={!ok}
        iconRight={ok ? icon : undefined}
        className={ok ? '' : 'opacity-70 saturate-50'}
      >
        {ok || variant === 'row' ? label : (need ?? label)}
      </Button>
    </div>
  )

  // announced only after a blocked press (keyed so repeats are read again), so typing isn't noisy
  const live = (
    <span className="sr-only" aria-live="polite">
      {nudge > 0 && !ok && <span key={nudge}>{need}</span>}
    </span>
  )

  if (variant === 'bar') {
    return (
      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3">
        <div className="pointer-events-none absolute inset-x-0 -top-8 bottom-0 bg-linear-to-t from-cream via-cream/80 to-transparent" aria-hidden />
        <div className="glass pointer-events-auto relative mx-auto max-w-xl rounded-[1.9rem] p-2.5">
          {button}
          {live}
        </div>
      </div>
    )
  }

  return (
    <div className="glass sticky bottom-5 z-20 mt-8 flex items-center justify-between gap-4 rounded-full p-2 pl-5">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={ok ? 'tip' : 'need'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={spring.soft}
          className="flex min-w-0 items-center gap-2 text-sm text-ink-soft"
        >
          {ok ? (
            <>
              {t('กด', 'Press')}
              <kbd className="inline-flex h-7 items-center gap-1 rounded-lg border border-line bg-white px-2 font-sans text-xs font-semibold text-ink shadow-[inset_0_-2px_0_rgb(59_38_34/0.08)]">
                Enter <CornerDownLeft size={12} aria-hidden />
              </kbd>
              {t('เพื่อไปต่อได้นะ', 'to keep going')}
            </>
          ) : (
            <span className="truncate">{need}</span>
          )}
        </motion.p>
      </AnimatePresence>
      {button}
      {live}
    </div>
  )
}
