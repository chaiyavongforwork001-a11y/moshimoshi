import type { RootState } from '@react-three/fiber'
import { easing } from 'maath'
import { createContext, useContext } from 'react'
import { STORY_CHAPTERS, useStory } from '@/lib/scrollStory'
import type { CuesStore } from './cues'

/*
 * The story clock: one damped reading of the landing's scroll progress per
 * frame, shared by every part of the scene through context. Progress is kept
 * in "chapter units" (0..CHAPTERS). Each chapter holds the camera from
 * HOLD_IN to HOLD_OUT of its range and travels to the next one across the
 * boundary, so text cards (centred on each chapter) always meet a still shot.
 */
export const CHAPTERS = STORY_CHAPTERS.length
export const HOLD_IN = 0.2
export const HOLD_OUT = 0.8
const TRAVEL = 1 - HOLD_OUT + HOLD_IN

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** one-shot moments: [chapter, local progress that fires it, seconds it plays] */
export const BEATS = {
  bump: [2, 0.72, 0.85],
  phone: [5, 0.4, 0.7],
} as const satisfies Record<string, readonly [number, number, number]>
export type BeatName = keyof typeof BEATS
const BEAT_NAMES = Object.keys(BEATS) as BeatName[]

export interface StoryClock {
  /** damped progress in chapter units */
  x: number
  /** raw progress in chapter units */
  target: number
  /** smoothed scroll velocity (-1..1) */
  vel: number
  /** chapter the camera is at (raw chapter when reduced) */
  chapter: number
  /** scene time (s) and last frame delta */
  t: number
  dt: number
  reduced: boolean
  /** each beat's play head 0..1 (plays forward past its trigger, rewinds before it) */
  beat: Record<BeatName, number>
  stamp: number
  ready: boolean
}

export function makeClock(reduced: boolean): StoryClock {
  return {
    x: 0,
    target: 0,
    vel: 0,
    chapter: 0,
    t: 0,
    dt: 1 / 60,
    reduced,
    beat: { bump: 0, phone: 0 },
    stamp: -1,
    ready: false,
  }
}

/** linear approach to `target` at `rate` per call (snaps when `snap`) */
export function stepTo(v: number, target: number, rate: number, snap: boolean) {
  if (snap) return target
  return v < target ? Math.min(target, v + rate) : Math.max(target, v - rate)
}

/** Advance the clock once per frame (every consumer calls this; repeats are no-ops). */
export function syncClock(c: StoryClock, state: RootState, delta: number) {
  const stamp = state.clock.elapsedTime
  if (c.ready && stamp === c.stamp) return
  c.stamp = stamp
  const dt = Math.min(Math.max(delta, 0), 1 / 20)
  const s = useStory.getState()
  c.target = s.progress * CHAPTERS
  if (!c.ready || c.reduced) {
    c.x = c.target
    c.vel = 0
    c.ready = true
  } else {
    easing.damp(c, 'x', c.target, 0.34, dt)
    easing.damp(c, 'vel', s.velocity, 0.25, dt)
  }
  c.chapter = Math.min(CHAPTERS - 1, Math.floor(c.x))
  c.t += dt
  c.dt = dt
  for (const k of BEAT_NAMES) {
    const [ch, at, dur] = BEATS[k]
    c.beat[k] = stepTo(c.beat[k], c.x - ch >= at ? 1 : 0, dt / dur, c.reduced)
  }
}

/** progress inside chapter `i` (may be < 0 or > 1) */
export const local = (c: StoryClock, i: number) => c.x - i

/** 0..1: how present chapter `i` should be (it pops in shortly before the camera heads there) */
export function presence(c: StoryClock, i: number) {
  if (c.reduced) return i === c.chapter ? 1 : 0
  const d = Math.max(i - c.x, c.x - (i + 1), 0)
  return 1 - smooth(0.2, 0.42, d)
}

export interface Phase {
  from: number
  to: number
  /** hold fraction (from === to) or raw travel fraction 0..1 */
  u: number
  travel: boolean
}

export function phaseAt(x: number, out: Phase): Phase {
  const xc = Math.min(CHAPTERS, Math.max(0, x))
  const i = Math.min(CHAPTERS - 1, Math.floor(xc))
  const c = xc - i
  if (c < HOLD_IN && i > 0) {
    out.from = i - 1
    out.to = i
    out.u = (c + 1 - HOLD_OUT) / TRAVEL
    out.travel = true
  } else if (c > HOLD_OUT && i < CHAPTERS - 1) {
    out.from = i
    out.to = i + 1
    out.u = (c - HOLD_OUT) / TRAVEL
    out.travel = true
  } else {
    out.from = out.to = i
    const a = i === 0 ? 0 : HOLD_IN
    const b = i === CHAPTERS - 1 ? 1 : HOLD_OUT
    out.u = clamp01((c - a) / (b - a))
    out.travel = false
  }
  return out
}

/** Underdamped spring (jelly), sub-stepped for stability. */
export interface Jelly {
  s: number
  v: number
}
export function jellyStep(j: Jelly, target: number, dt: number, k = 230, d = 11) {
  let rem = dt
  while (rem > 1e-6) {
    const h = Math.min(rem, 1 / 120)
    j.v += (k * (target - j.s) - d * j.v) * h
    j.s += j.v * h
    rem -= h
  }
}

export interface StoryCtx {
  clock: StoryClock
  compact: boolean
  /** discrete cues derived from the damped clock (see cues.ts) */
  cues: CuesStore
}
export const StoryContext = createContext<StoryCtx | null>(null)
export function useStoryCtx(): StoryCtx {
  const v = useContext(StoryContext)
  if (!v) throw new Error('story parts must render inside <StoryScene>')
  return v
}
