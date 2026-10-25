import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { MochiExpression } from '../Mochi'
import { CHAPTERS, HOLD_IN, HOLD_OUT, type StoryClock } from './timeline'

/*
 * Discrete story cues (which chapter's bubbles show, the guide's face…)
 * derived from the DAMPED story clock inside the scene, with hysteresis, so
 * bubbles never mount mid-flight or flicker at a chapter boundary. Written
 * only when a value changes (a few times per chapter, never per frame);
 * React parts select from it instead of the raw scroll store.
 */
export interface StoryCues {
  /** chapter the scene is at (switches 0.06 past a boundary) */
  chapter: number
  /** chapter whose bubbles may show (-1 while the camera travels) */
  talk: number
  guideFace: MochiExpression
  signalHappy: boolean
  callHello: boolean
}
export type CuesStore = UseBoundStore<StoreApi<StoryCues>>

export const createCues = (): CuesStore =>
  create<StoryCues>()(() => ({ chapter: 0, talk: -1, guideFace: 'happy', signalHappy: false, callHello: false }))

function guideFace(chapter: number, cp: number): MochiExpression {
  if (chapter === 0) return 'happy'
  if (chapter === 1) return cp > 0.3 ? 'wow' : 'smile'
  if (chapter === 2) return cp > 0.74 ? 'happy' : 'smile'
  if (chapter === 4) return 'talk'
  // the finale: it picks up the handset and talks
  if (chapter === 5) return cp > 0.5 ? 'talk' : 'happy'
  return 'smile'
}

const SWITCH = 0.06
const TALK_IN = 0.04
const TALK_OUT = 0.12

/** call once per frame after syncClock */
export function stepCues(store: CuesStore, clock: StoryClock) {
  const prev = store.getState()
  const x = clock.x
  let chapter = prev.chapter
  if (clock.reduced) chapter = clock.chapter
  else if (x > chapter + 1 + SWITCH || x < chapter - SWITCH) chapter = Math.min(CHAPTERS - 1, Math.max(0, Math.floor(x)))
  const c = x - chapter
  // bubbles only during the chapter's still shot (the first / last chapter hold to their ends)
  const lo = chapter === 0 ? -Infinity : HOLD_IN
  const hi = chapter === CHAPTERS - 1 ? Infinity : HOLD_OUT
  const margin = prev.talk === chapter ? TALK_OUT : -TALK_IN
  const talk = clock.reduced || (c >= lo - margin && c <= hi + margin) ? chapter : -1
  const next: StoryCues = {
    chapter,
    talk,
    guideFace: guideFace(chapter, c),
    signalHappy: chapter === 2 && c > 0.74,
    callHello: chapter === 5 && c > 0.45,
  }
  if (
    next.chapter !== prev.chapter ||
    next.talk !== prev.talk ||
    next.guideFace !== prev.guideFace ||
    next.signalHappy !== prev.signalHappy ||
    next.callHello !== prev.callHello
  )
    store.setState(next)
}
