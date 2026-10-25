import { View } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, type ReactNode } from 'react'
import * as THREE from 'three'
import { StageBoundary } from './stage'
import { ViewActive, type ActiveFlag } from './viewActive'
import { useViewElement } from './viewElement'

const _target = new THREE.Vector3()

/*
 * drei's View hands its portal the box size only when the root store changes,
 * so after a rotation or a window resize a scene kept framing (and placing its
 * <Html> bubbles) for the old box. Re-inject the real size whenever it drifts:
 * the check is a rect read drei already does each frame; the set only happens
 * on an actual resize.
 */
function SyncViewSize() {
  const el = useViewElement()
  useFrame((state) => {
    if (!el) return
    const r = el.getBoundingClientRect()
    const s = state.size
    if (r.width < 1 || r.height < 1) return
    if (Math.abs(r.width - s.width) < 0.5 && Math.abs(r.height - s.height) < 0.5) return
    const size = { width: r.width, height: r.height, top: r.top, left: r.left }
    state.set({ size, viewport: { ...state.viewport, ...state.viewport.getCurrentViewport(state.camera, _target, size) } })
  })
  return null
}

/** The drei <View> half of View3D (lives in the lazily loaded 3D chunk). */
export default function ViewSlot({ children, active }: { children: ReactNode; active: ActiveFlag }) {
  return (
    // data-view3d lets in-scene <Html> find this exact box (see viewElement.ts)
    <View className="absolute inset-0" data-view3d="">
      {/* the provider must sit inside <View>: only then does it render in the canvas tree */}
      <ViewActive.Provider value={active}>
        <SyncViewSize />
        {/* a scene error (or a lazy scene chunk failing offline) hides only this view */}
        <StageBoundary>
          <Suspense fallback={null}>{children}</Suspense>
        </StageBoundary>
      </ViewActive.Provider>
    </View>
  )
}
