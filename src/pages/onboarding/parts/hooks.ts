import { useCallback, useEffect, useRef, useState } from 'react'

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null

/** Split into user-perceived characters so Thai vowels / tone marks never dangle mid-typing. */
export function graphemes(text: string): string[] {
  if (!segmenter) return Array.from(text)
  return Array.from(segmenter.segment(text), (s) => s.segment)
}

/** Value that only updates after it stops changing for `ms`. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return settled
}

/** A value that shows for a moment then clears itself (e.g. a quick mochi reaction). */
export function useFlash<T>() {
  const [value, setValue] = useState<T | null>(null)
  const timer = useRef(0)
  const flash = useCallback((v: T, ms: number) => {
    setValue(v)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setValue(null), ms)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return [value, flash] as const
}

/** Tiny deterministic PRNG so decorative bursts look random but render the same every time. */
export function seeded(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Tween for multi-keyframe "pop" animations. Springs only accept two
 * keyframes in motion (dev throws), so pops like [1, 1.1, 1] use this
 * inside `animate` while taps keep their springs.
 */
export const keyPop = { duration: 0.38, ease: 'easeOut' } as const
export const keyWiggle = { duration: 0.5, ease: 'easeInOut' } as const
