import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { noRaycast } from '../props'
import type { V3 } from './layout'
import { syncClock, useStoryCtx } from './timeline'
import { useViewFrame } from '../viewActive'

export interface Floater {
  p: V3
  s: number
  c: string
  /** bob = hover + rock + spin; rise = drift upward and fade (notes, steam, motes) */
  mode: 'bob' | 'rise'
  ph?: number
  /** rise: height travelled; bob: hover amplitude */
  amp?: number
  speed?: number
  /** base rotation */
  rot?: V3
  spin?: number
}

const _o = new THREE.Object3D()
const _c = new THREE.Color()

/** A handful of small animated pieces sharing one geometry + material (one draw call). Pass a stable `items` array. */
export function Floaters({ geometry, material, items }: { geometry: THREE.BufferGeometry; material: THREE.Material; items: Floater[] }) {
  const { clock } = useStoryCtx()
  const ref = useRef<THREE.InstancedMesh>(null)
  const list = items
  const st = useMemo(() => ({ still: false }), [])

  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    list.forEach((it, i) => m.setColorAt(i, _c.set(it.c)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    st.still = false
  }, [list, st])

  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const m = ref.current
    if (!m) return
    const r = clock.reduced
    if (r && st.still) return
    const t = r ? 0 : clock.t
    for (let i = 0; i < list.length; i++) {
      const it = list[i]
      const ph = it.ph ?? i * 1.7
      const rot = it.rot
      if (it.mode === 'bob') {
        const amp = it.amp ?? 0.05
        _o.position.set(it.p[0], it.p[1] + Math.sin(t * 1.3 + ph) * amp, it.p[2])
        _o.rotation.set((rot?.[0] ?? 0) + Math.sin(t * 0.7 + ph) * 0.15, (rot?.[1] ?? 0) + t * (it.spin ?? 0.6), (rot?.[2] ?? 0) + Math.sin(t * 0.9 + ph) * 0.2)
        _o.scale.setScalar(it.s * (0.92 + 0.08 * Math.sin(t * 2.4 + ph * 2)))
      } else {
        const u = r ? 0.5 : (((t * (it.speed ?? 0.35) + ph * 0.37) % 1) + 1) % 1
        const amp = it.amp ?? 0.6
        _o.position.set(it.p[0] + Math.sin(u * 6 + ph) * 0.05 * amp, it.p[1] + u * amp, it.p[2])
        _o.rotation.set(rot?.[0] ?? 0, rot?.[1] ?? 0, (rot?.[2] ?? 0) + Math.sin(u * 5 + ph) * 0.3)
        _o.scale.setScalar(Math.max(1e-4, it.s * Math.pow(Math.sin(Math.PI * u), 0.7)))
      }
      _o.updateMatrix()
      m.setMatrixAt(i, _o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    st.still = true
  })

  return <instancedMesh ref={ref} args={[geometry, material, list.length]} frustumCulled={false} raycast={noRaycast} />
}
