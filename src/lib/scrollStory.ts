import { create } from 'zustand'

/**
 * Bridge between the landing page's DOM scroll and the 3D story scene.
 * The DOM side (landing) writes; the R3F side reads with
 * useStory.getState() inside useFrame (never a reactive selector there).
 * Free of three/R3F imports so pages can use it without loading 3D.
 */
export const STORY_CHAPTERS = ['hero', 'rooms', 'signal', 'circle', 'listen', 'call'] as const
export type StoryChapter = (typeof STORY_CHAPTERS)[number]

interface StoryState {
  /** 0..1 across the whole story section */
  progress: number
  /** smoothed scroll velocity, roughly -1..1 (for squash/stretch, wind…) */
  velocity: number
  /** index into STORY_CHAPTERS of the chapter under the viewport centre */
  chapter: number
  /** 0..1 inside the current chapter */
  chapterProgress: number
  setScroll: (progress: number, velocity: number) => void
}

export const useStory = create<StoryState>()((set) => ({
  progress: 0,
  velocity: 0,
  chapter: 0,
  chapterProgress: 0,
  setScroll: (progress, velocity) => {
    const p = Math.min(1, Math.max(0, progress))
    const scaled = p * STORY_CHAPTERS.length
    const chapter = Math.min(STORY_CHAPTERS.length - 1, Math.floor(scaled))
    set({ progress: p, velocity, chapter, chapterProgress: scaled - chapter })
  },
}))
