import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useIsDesktop } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** desktop modal width */
  width?: number
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Bottom sheet on phones (drag down to close), centred modal on desktop.
 * Esc closes; focus moves into the panel on open, Tab stays inside it, and
 * focus goes back to the opener on close.
 */
export function Sheet({ open, onClose, title, children, width = 520 }: SheetProps) {
  const desktop = useIsDesktop()
  const panel = useRef<HTMLDivElement>(null)
  const drag = useDragControls()
  // callers often pass an inline onClose; keep the open effect from re-running on every render
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const t = setTimeout(() => panel.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current()
        return
      }
      // focus trap: cycle Tab / Shift+Tab inside the panel
      const el = panel.current
      if (e.key !== 'Tab' || !el) return
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement)
      if (!items.length) {
        e.preventDefault()
        el.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === el || !el.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !el.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // the page behind the backdrop is out of reach (focus, clicks, screen readers)
    const root = document.getElementById('root')
    const wasInert = root?.inert ?? false
    if (root) root.inert = true
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (root) root.inert = wasInert
      prev?.focus?.()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center">
          <motion.div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeRef.current()}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-[2rem] bg-cream pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-lift)] outline-none lg:rounded-[2rem] lg:pb-6"
            style={desktop ? { width } : undefined}
            initial={desktop ? { opacity: 0, scale: 0.92, y: 20 } : { y: '100%' }}
            animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.95, y: 10 } : { y: '100%' }}
            transition={spring.soft}
            drag={desktop ? false : 'y'}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) closeRef.current()
            }}
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-cream/90 px-5 pt-3 pb-2 backdrop-blur"
              onPointerDown={(e) => !desktop && drag.start(e)}
              style={{ touchAction: desktop ? undefined : 'none' }}
            >
              {!desktop && <span className="absolute top-2 left-1/2 h-1.5 w-11 -translate-x-1/2 rounded-full bg-ink/15" />}
              <h2 className="pt-3 font-display text-lg font-semibold">{title}</h2>
              <button
                type="button"
                onClick={() => closeRef.current()}
                aria-label={t('ปิด', 'Close')}
                className="mt-2 inline-flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-[var(--shadow-soft)]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pt-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
