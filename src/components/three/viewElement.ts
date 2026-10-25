import { useThree, type Size } from '@react-three/fiber'
import { useEffect, useState } from 'react'

/*
 * drei's <View> renders every view into the one canvas and points all
 * portals' `events.connected` at the most recently mounted view, so <Html>
 * would land in the wrong box when two views share a page. View3D marks its
 * tracking <div> with data-view3d; this picks the one whose box matches the
 * portal's size and position, once per view, and caches it.
 */
const cache = new WeakMap<object, HTMLElement>()

function score(el: HTMLElement, size: Size) {
  const r = el.getBoundingClientRect()
  const dw = Math.abs(r.width - size.width) / size.width
  const dh = Math.abs(r.height - size.height) / size.height
  if (dw > 0.15 || dh > 0.15) return Infinity
  return dw + dh + (Math.abs(r.top - size.top) + Math.abs(r.left - size.left)) / 4000
}

function findViewElement(size: Size): HTMLElement | null {
  if (!size.width || !size.height) return null
  let best: HTMLElement | null = null
  let bestScore = Infinity
  for (const el of document.querySelectorAll<HTMLElement>('[data-view3d]')) {
    const s = score(el, size)
    if (s < bestScore) {
      bestScore = s
      best = el
    }
  }
  return best
}

/** The DOM box of the View this component renders in (null until found). */
export function useViewElement(): HTMLElement | null {
  const get = useThree((s) => s.get)
  const [el, setEl] = useState<HTMLElement | null>(() => {
    const hit = cache.get(get)
    return hit?.isConnected ? hit : null
  })

  useEffect(() => {
    const hit = cache.get(get)
    if (hit?.isConnected) {
      setEl(hit)
      return
    }
    let raf = 0
    let tries = 0
    const find = () => {
      const state = get()
      const found = findViewElement(state.size)
      if (found) {
        cache.set(get, found)
        setEl(found)
      } else if (++tries < 45) {
        raf = requestAnimationFrame(find)
      } else {
        const fallback = (state.events.connected as HTMLElement | undefined) ?? state.gl.domElement.parentElement
        if (fallback) setEl(fallback)
      }
    }
    find()
    return () => cancelAnimationFrame(raf)
  }, [get])

  return el
}
