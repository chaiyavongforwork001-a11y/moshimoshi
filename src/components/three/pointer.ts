import type { Size } from '@react-three/fiber'

/**
 * One passive window listener for the whole app. Every View reads the
 * pointer relative to its own DOM box (portal size + scroll correction),
 * so mochi keep looking at the cursor even when it is outside their view.
 */
const pointer = { x: 0, y: 0, t: -1, inside: false, touch: false, scrollY: 0, target: null as EventTarget | null }
let installed = false

function install() {
  if (installed || typeof window === 'undefined') return
  installed = true
  pointer.scrollY = window.scrollY
  const onMove = (e: PointerEvent) => {
    pointer.x = e.clientX
    pointer.y = e.clientY
    pointer.t = performance.now()
    pointer.inside = true
    pointer.touch = e.pointerType !== 'mouse'
    pointer.target = e.target
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onMove, { passive: true })
  window.addEventListener('scroll', () => (pointer.scrollY = window.scrollY), { passive: true })
  // touches "leave" on every lift; they relax via the idle timer instead
  document.documentElement.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') pointer.inside = false
  })
  window.addEventListener('blur', () => (pointer.inside = false))
}

export interface ViewPointerMemo {
  top: number
  left: number
  w: number
  h: number
  scroll: number
  init: boolean
}

export const viewMemo = (): ViewPointerMemo => ({ top: 0, left: 0, w: 1, h: 1, scroll: 0, init: false })

// live box of each view element, measured at most once per frame (~8ms bucket)
const rects = new WeakMap<HTMLElement, { stamp: number; r: DOMRect }>()
function liveRect(el: HTMLElement): DOMRect {
  const stamp = Math.floor(performance.now() / 8)
  const hit = rects.get(el)
  if (hit && hit.stamp === stamp) return hit.r
  const r = el.getBoundingClientRect()
  // reuse the cache entry: allocate only on the first measure of an element
  if (hit) {
    hit.stamp = stamp
    hit.r = r
  } else rects.set(el, { stamp, r })
  return r
}

/**
 * Writes the pointer in the view's NDC space (-1..1 inside the box, beyond
 * outside it) into `out` and returns how much attention to pay (0..1):
 * full while the pointer is moving, relaxing after a while (or right away
 * after a touch ends).
 * Pass the view's DOM element when known: its live rect is used, so views
 * that mounted mid-animation (page/step slide-ins) still aim right. Without
 * it, the portal size measured at mount + scroll correction is used.
 */
export function readViewPointer(size: Size, mem: ViewPointerMemo, out: { x: number; y: number }, el?: HTMLElement | null): number {
  install()
  let top: number
  let left: number
  let w: number
  let h: number
  if (el?.isConnected) {
    const r = liveRect(el)
    top = r.top
    left = r.left
    w = Math.max(1, r.width)
    h = Math.max(1, r.height)
  } else {
    if (!mem.init || size.top !== mem.top || size.left !== mem.left || size.width !== mem.w || size.height !== mem.h) {
      mem.init = true
      mem.top = size.top
      mem.left = size.left
      mem.w = Math.max(1, size.width)
      mem.h = Math.max(1, size.height)
      mem.scroll = pointer.scrollY
    }
    top = mem.top - (pointer.scrollY - mem.scroll)
    left = mem.left
    w = mem.w
    h = mem.h
  }
  if (pointer.t < 0) {
    out.x = 0
    out.y = 0
    return 0
  }
  out.x = ((pointer.x - left) / w) * 2 - 1
  out.y = -(((pointer.y - top) / h) * 2 - 1)
  if (!pointer.inside) return 0
  const idle = performance.now() - pointer.t
  if (pointer.touch) return idle < 1800 ? 1 : 0
  return idle < 4000 ? 1 : 0.45
}

/** element under the pointer at the last move (hover checks) */
export function pointerTarget() {
  install()
  return pointer.inside ? pointer.target : null
}

/** soft clamp: linear near 0, saturating at ±limit */
export const soft = (v: number, limit: number) => limit * Math.tanh(v / limit)
