import { useIsPresent, useReducedMotion } from 'motion/react'
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { createActiveFlag } from './activeFlag'
import { StageBoundary, useStage } from './stage'

const ViewSlot = lazy(() => import('./ViewSlot'))

/**
 * A DOM box that shows 3D content. Give it a real size via className
 * (e.g. "h-80 w-full"). Children are R3F elements (they render in the canvas).
 *
 * The canvas sits behind the DOM, so DOM fades can't reach the 3D. To keep
 * them in step, the scene mounts once the page's enter fade is mostly done
 * and leaves as soon as an AnimatePresence exit starts.
 */
export function View3D({
  className = '',
  children,
  label,
  cursor,
}: {
  className?: string
  children: ReactNode
  label?: string
  /** label for the mochi cursor while hovering this view (e.g. "ลากเล่นได้"); see MochiCursor */
  cursor?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const present = useIsPresent()
  const failed = useStage((s) => s.failed)
  const [ready, setReady] = useState(false)
  // on / near the screen: the scene's per-frame work only runs while this is true (see viewActive.ts)
  const [active] = useState(() => createActiveFlag(false))
  const show = ready && present && !failed

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), reduce ? 0 : 180)
    return () => window.clearTimeout(t)
  }, [reduce])

  // tell the canvas whether this view is on (or near) the screen
  useEffect(() => {
    const el = box.current
    if (!el || !show) return
    const { show: on, hide: off } = useStage.getState()
    let counted = false
    const set = (v: boolean) => {
      active.set(v)
      if (v === counted) return
      counted = v
      if (v) on()
      else off()
    }
    // decide right away (the IO's first report lands a frame later), so the first frames already run
    const r = el.getBoundingClientRect()
    set(r.bottom > -200 && r.top < window.innerHeight + 200 && r.right > -200 && r.left < window.innerWidth + 200)
    const io = new IntersectionObserver(([e]) => set(!!e?.isIntersecting), { rootMargin: '200px' })
    io.observe(el)
    return () => {
      io.disconnect()
      set(false)
    }
  }, [show, active])

  return (
    <div ref={box} className={`relative ${className}`} role={label ? 'img' : undefined} aria-label={label} data-cursor={cursor}>
      {show && (
        <StageBoundary>
          <Suspense fallback={null}>
            <ViewSlot active={active}>{children}</ViewSlot>
          </Suspense>
        </StageBoundary>
      )}
    </div>
  )
}
