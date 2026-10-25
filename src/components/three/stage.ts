import { Component, type ReactNode } from 'react'
import { create } from 'zustand'

/**
 * Tiny shared state between the DOM side (View3D boxes) and the one canvas.
 * Kept free of three/R3F imports so pages can read it without loading 3D.
 * - visible: View3D boxes near the viewport; the canvas only runs its frame
 *   loop while this is > 0 (no GPU work on 2D-only screens).
 * - failed: WebGL is unavailable or the 3D layer crashed; views stay empty
 *   and the 2D UI carries on.
 */
interface StageState {
  visible: number
  failed: boolean
  /** bumps when the WebGL context comes back, so shared GPU resources get rebuilt */
  envVersion: number
  show: () => void
  hide: () => void
  fail: () => void
  bumpEnv: () => void
}

export const useStage = create<StageState>()((set) => ({
  visible: 0,
  failed: false,
  envVersion: 0,
  show: () => set((s) => ({ visible: s.visible + 1 })),
  hide: () => set((s) => ({ visible: Math.max(0, s.visible - 1) })),
  fail: () => set({ failed: true, visible: 0 }),
  bumpEnv: () => set((s) => ({ envVersion: s.envVersion + 1 })),
}))

/** R3F 9 / three r186 need WebGL2. The probe context is released right away. */
export function hasWebGL2(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

/**
 * If WebGL can't start (GPU blocklist, WebGL off, too many contexts), a scene
 * throws (R3F re-throws from <Canvas>) or a 3D chunk can't load, catch it here
 * so only the 3D layer goes away, never the page or the whole app.
 * Only the canvas-level boundary (`global`) turns 3D off everywhere; a
 * boundary around one view hides just that view.
 */
export class StageBoundary extends Component<{ children: ReactNode; global?: boolean }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    if (this.props.global) useStage.getState().fail()
    console.warn(this.props.global ? '[moshimoshi] 3D layer turned off:' : '[moshimoshi] a 3D view was hidden:', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
