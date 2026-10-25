import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { MOCHI } from '@/lib/colors'
import { ease, pageTransition } from '@/lib/motion'
import type { MochiColor } from '@/lib/types'

// where the last tap / keyboard activation happened: the wipe grows from there
const tap = { x: 0, y: 0, t: -Infinity }
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => {
      tap.x = e.clientX
      tap.y = e.clientY
      tap.t = performance.now()
    },
    { capture: true, passive: true },
  )
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      const el = e.target instanceof Element ? e.target.closest('a[href], button, [role="button"], [role="tab"]') : null
      if (!el) return
      const r = el.getBoundingClientRect()
      tap.x = r.left + r.width / 2
      tap.y = r.top + r.height / 2
      tap.t = performance.now()
    },
    { capture: true, passive: true },
  )
}

const TINT: [RegExp, MochiColor][] = [
  [/^\/app\/rooms/, 'mint'],
  [/^\/app\/people/, 'lavender'],
  [/^\/app\/chats/, 'sky'],
  [/^\/app\/me/, 'pink'],
  [/^\/app\/post/, 'peach'],
]

interface Wipe {
  x: number
  y: number
  /** distance from the origin to the farthest viewport corner */
  r: number
  base: string
  light: string
}

function makeWipe(path: string): Wipe {
  const w = window.innerWidth
  const h = window.innerHeight
  const fresh = performance.now() - tap.t < 1500
  // browser back/forward (no tap): open from the upper middle
  const x = fresh ? tap.x : w / 2
  const y = fresh ? tap.y : h * 0.3
  const p = MOCHI[TINT.find(([re]) => re.test(path))?.[1] ?? 'butter']
  return { x, y, r: Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + 8, base: p.base, light: p.light }
}

/**
 * Route change for /app: the new page opens as a circle growing from where
 * you tapped, riding a soft pastel bubble in the section's colour.
 *
 * Enter-only on purpose: the new page renders in the same commit as the
 * location change, so ScrollRestoration measures and restores into the new
 * page. The page is hidden before its first paint (layout effect) and the
 * reveal starts in a passive effect, after ScrollRestoration (a parent layout
 * effect) has moved the scroll, so the circle is centred on the tap.
 * The clip is a native WAAPI animation with fill "backwards": when it ends,
 * nothing is left on the page. Reduced motion: the plain page fade only.
 */
export function RouteTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  // the first page shown (app load, layout switch) just fades in
  const [firstKey] = useState(routeKey)
  const [moved, setMoved] = useState(false)
  if (!moved && routeKey !== firstKey) setMoved(true)
  return (
    <RoutePane key={routeKey} path={routeKey} wipe={moved}>
      {children}
    </RoutePane>
  )
}

function RoutePane({ path, wipe: wanted, children }: { path: string; wipe: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [wipe] = useState(() => (wanted && !reduce ? makeWipe(path) : null))
  const [bubble, setBubble] = useState(true)

  useLayoutEffect(() => {
    const el = ref.current
    if (!wipe || !el) return
    el.style.clipPath = 'circle(0px at 50% 0px)'
    return () => {
      el.style.clipPath = ''
    }
  }, [wipe])

  useEffect(() => {
    const el = ref.current
    if (!wipe || !el) return
    const r = el.getBoundingClientRect()
    const at = `at ${Math.round(wipe.x - r.left)}px ${Math.round(wipe.y - r.top)}px`
    const anim =
      typeof el.animate === 'function'
        ? el.animate([{ clipPath: `circle(0px ${at})` }, { clipPath: `circle(${Math.ceil(wipe.r)}px ${at})` }], {
            duration: 640,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'backwards',
          })
        : null
    el.style.clipPath = ''
    return () => anim?.cancel()
  }, [wipe])

  return (
    <>
      {wipe && bubble && <WipeBubble wipe={wipe} onDone={() => setBubble(false)} />}
      <motion.div ref={ref} variants={pageTransition} initial="initial" animate="enter">
        {children}
      </motion.div>
    </>
  )
}

/** Pastel bubble behind the page content (scale + opacity only). */
function WipeBubble({ wipe, onDone }: { wipe: Wipe; onDone: () => void }) {
  const d = Math.ceil(wipe.r * 2.3)
  return (
    <span aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.span
        className="absolute rounded-full"
        style={{
          left: wipe.x - d / 2,
          top: wipe.y - d / 2,
          width: d,
          height: d,
          background: `radial-gradient(circle closest-side, ${wipe.base} 0%, ${wipe.base} 56%, ${wipe.light} 76%, transparent 100%)`,
        }}
        initial={{ scale: 0.03, opacity: 0 }}
        animate={{ scale: 1, opacity: [0, 0.85, 0.5, 0] }}
        transition={{ scale: { duration: 0.6, ease: ease.out }, opacity: { duration: 1.05, times: [0, 0.1, 0.5, 1], ease: 'easeOut' } }}
        onAnimationComplete={onDone}
      />
    </span>
  )
}
