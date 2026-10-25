import { PerformanceMonitor, View } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import * as THREE from 'three'
import { resetSharedEnv } from './Lights'
import { useStage } from './stage'

/**
 * The ONE WebGL canvas for the whole app (mobile browsers cap GPU contexts).
 * It is fixed behind the page content; every 3D spot on a page is a
 * <View3D> that tracks a DOM box and renders into this canvas.
 * Pointer events are taken from #root so 3D objects stay interactive
 * even though the canvas itself has pointer-events: none.
 * Loaded lazily by Stage3DRoot, so three/R3F never block the first paint.
 */
export default function StageCanvas() {
  // start at the device's own density (capped): never supersample 1x screens
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio || 1))
  // only animate while some View3D is on (or near) the screen
  const running = useStage((s) => s.visible > 0)
  return (
    <Canvas
      eventSource={document.getElementById('root')!}
      eventPrefix="client"
      dpr={dpr}
      frameloop={running ? 'always' : 'never'}
      // no tone mapping: pastel albedos come out as designed (lights are budgeted in Lights.tsx)
      flat
      gl={{ antialias: true, alpha: true, powerPreference: 'default', toneMapping: THREE.NoToneMapping }}
      camera={{ position: [0, 0, 6], fov: 35 }}
      onCreated={({ gl }) => {
        // Android drops the context when the tab is backgrounded: rebuild the shared environment after
        gl.domElement.addEventListener('webglcontextrestored', () => {
          resetSharedEnv(gl)
          useStage.getState().bumpEnv()
        })
      }}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      aria-hidden
    >
      <PerformanceMonitor
        flipflops={3}
        onIncline={() => setDpr(Math.min(2, window.devicePixelRatio || 1))}
        onDecline={() => setDpr(1)}
        onFallback={() => setDpr(1)}
      />
      <View.Port />
    </Canvas>
  )
}
