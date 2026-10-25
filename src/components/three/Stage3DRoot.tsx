import { lazy, Suspense, useEffect, useState } from 'react'
import { hasWebGL2, StageBoundary, useStage } from './stage'

const StageCanvas = lazy(() => import('./Stage3D'))

/** Mount once at the app root. three/R3F load after the 2D UI has rendered. */
export function Stage3D() {
  const [ok] = useState(hasWebGL2)
  useEffect(() => {
    if (!ok) useStage.getState().fail()
  }, [ok])
  if (!ok) return null
  return (
    <StageBoundary global>
      <Suspense fallback={null}>
        <StageCanvas />
      </Suspense>
    </StageBoundary>
  )
}
