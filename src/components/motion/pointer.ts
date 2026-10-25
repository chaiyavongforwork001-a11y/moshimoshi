import { frame } from 'motion/react'
import { useMediaQuery } from '@/lib/hooks'

/** Mouse / trackpad only: every cursor-driven effect stays off on touch screens. */
export const FINE_POINTER = '(hover: hover) and (pointer: fine)'
export const useFinePointer = () => useMediaQuery(FINE_POINTER)

type PointerListener = (x: number, y: number, active: boolean) => void

/*
 * One passive window listener for all magnets. Moves are coalesced into a
 * single frame.read per frame, so subscribers can measure boxes (reads)
 * before motion writes styles in the same frame: no layout thrash.
 */
const live = { x: 0, y: 0, active: false, queued: false, scroll: 0 }
const listeners = new Set<PointerListener>()
let installed = false

const flush = () => {
  live.queued = false
  listeners.forEach((l) => l(live.x, live.y, live.active))
}

const queue = () => {
  if (live.queued || !listeners.size) return
  live.queued = true
  frame.read(flush)
}

function install() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return
      live.x = e.clientX
      live.y = e.clientY
      live.active = true
      queue()
    },
    { passive: true },
  )
  const leave = () => {
    live.active = false
    queue()
  }
  document.documentElement.addEventListener('pointerleave', leave)
  window.addEventListener('blur', leave)
  // any scroll (the page or a carousel) moves boxes under a still pointer
  document.addEventListener(
    'scroll',
    () => {
      live.scroll++
      if (live.active) queue()
    },
    { capture: true, passive: true },
  )
}

/** Called at most once per frame with the latest mouse position. */
export function subscribePointer(fn: PointerListener) {
  install()
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Bumps on every scroll anywhere: a box measured before a different stamp is stale. */
export function scrollStamp() {
  install()
  return live.scroll
}

/** soft clamp: linear near 0, saturating at ±limit */
export const softClamp = (v: number, limit: number) => limit * Math.tanh(v / limit)
