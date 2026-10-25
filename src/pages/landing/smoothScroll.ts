import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { cancelFrame, frame } from 'motion/react'
import { useEffect } from 'react'

/*
 * Lenis smooth scroll, for the landing page on mouse / trackpad only (touch
 * scrolls natively: no non-passive touch listeners on phones). It drives the real window
 * scroll, so motion's useScroll, sticky sections and the drei Views keep
 * working unchanged. Lenis is ticked from motion's frame loop, so scroll
 * reads and scroll-linked styles land in the same frame.
 */
let lenis: Lenis | null = null

export const getLenis = () => lenis

export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const l = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 0.95,
      stopInertiaOnNavigate: true,
      // dialogs (InstallSheet) and the mobile menu scroll natively, even while the page is locked
      prevent: (node) => node.getAttribute('role') === 'dialog' || node.id === 'landing-menu',
    })
    lenis = l
    const tick = ({ timestamp }: { timestamp: number }) => l.raf(timestamp)
    frame.update(tick, true)
    return () => {
      cancelFrame(tick)
      l.destroy()
      if (lenis === l) lenis = null
    }
  }, [enabled])
}

/** Pause page scrolling (preloader, sheets). Works with or without Lenis. */
export function lockScroll(locked: boolean) {
  if (locked) lenis?.stop()
  else lenis?.start()
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}

/** Scroll to an element (or a y position) without touching the router's history. */
export function scrollToTarget(target: HTMLElement | number, reduce: boolean | null, offset = 0) {
  if (lenis && !reduce) {
    lenis.scrollTo(target, { offset, duration: 1.4 })
    return
  }
  const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY + offset
  window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' })
}

/** Smooth-scroll to a section by id and move focus there for keyboard / screen reader users. */
export function scrollToSection(id: string, reduce: boolean | null) {
  const el = document.getElementById(id)
  if (!el) return
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  scrollToTarget(el, reduce, -margin)
  el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}
