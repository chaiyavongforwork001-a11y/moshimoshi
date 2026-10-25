import { useFrame, type RootState } from '@react-three/fiber'
import { createContext, useContext, useSyncExternalStore } from 'react'
import type { ActiveFlag } from './activeFlag'

export { createActiveFlag, type ActiveFlag, type MutableActiveFlag } from './activeFlag'

/*
 * The canvas runs ONE frame loop for every view, and drei's <View> only skips
 * the draw of an offscreen view: its useFrame callbacks keep running. Each
 * View3D therefore owns an "active" flag (its box is on or near the screen),
 * provided inside the drei <View> so it reaches the canvas tree. Scene parts
 * use useViewFrame instead of useFrame, so offscreen scenes cost nothing.
 * Nested sets (story chapters) derive their own flag from the view's.
 */
const ALWAYS: ActiveFlag = { current: true, subscribe: () => () => {} }

export const ViewActive = createContext<ActiveFlag>(ALWAYS)

/** the active flag of the view (or story chapter) this component renders in */
export const useViewActive = () => useContext(ViewActive)

/** reactive version, for the few parts that mount / unmount DOM (drei <Html>) */
export function useIsViewActive() {
  const flag = useContext(ViewActive)
  return useSyncExternalStore(flag.subscribe, () => flag.current)
}

/** useFrame that only runs while this view is on (or near) the screen */
export function useViewFrame(cb: (state: RootState, delta: number) => void, priority?: number) {
  const flag = useContext(ViewActive)
  useFrame((state, delta) => {
    if (flag.current) cb(state, delta)
  }, priority)
}
