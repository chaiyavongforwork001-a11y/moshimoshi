import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { getFlatPlane, makeShadowMaterial, noRaycast } from '../props'
import type { V3 } from './layout'
import { easeInOut, jellyStep, local, presence, stepTo, syncClock, useStoryCtx, type Jelly } from './timeline'
import { createActiveFlag, useViewActive, useViewFrame, ViewActive } from '../viewActive'

/**
 * A chapter's whole set. It pops in with a jelly overshoot shortly before
 * the camera heads there and is hidden (no draw calls) when far away; its
 * parts skip their per-frame work while it is hidden (nested active flag).
 */
export function ChapterGroup({ index, position, children }: { index: number; position: V3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const { clock } = useStoryCtx()
  const j = useMemo<Jelly>(() => ({ s: 0, v: 0 }), [])
  const parent = useViewActive()
  const active = useMemo(() => createActiveFlag(false, parent), [parent])
  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const g = ref.current
    if (!g) return
    const p = presence(clock, index)
    if (clock.reduced) {
      j.s = p
      j.v = 0
    } else jellyStep(j, p, clock.dt, 120, 12)
    const s = Math.max(1e-4, j.s)
    g.visible = p > 0 || j.s > 0.004
    g.scale.setScalar(s)
    active.set(g.visible)
  })
  return (
    <group ref={ref} position={position} scale={1e-4} visible={false}>
      <ViewActive.Provider value={active}>{children}</ViewActive.Provider>
    </group>
  )
}

export interface HopperProps {
  /** feet position (local to the parent) */
  from: V3
  /** hop target; the hop plays once the chapter's local progress passes `at` */
  to?: V3
  chapter: number
  at?: number
  height?: number
  duration?: number
  yaw?: number
  /** yaw after the hop */
  toYaw?: number
  /** idle side-to-side rocking (radians) */
  sway?: number
  /** listening nods (radians) */
  nod?: number
  seed?: number
  /** blob shadow [w, d] that stays on the ground while airborne */
  shadow?: [number, number]
  children: ReactNode
}

const BOUNCE_K = 4

/**
 * Wraps a character at its feet: scroll-triggered hops (time-based, so a
 * hop always finishes and rewinds when scrolling back), jelly squash on
 * take-off / landing, gentle idle sway and a lean from scroll velocity.
 */
export function Hopper({
  from,
  to,
  chapter,
  at = 0.5,
  height = 1,
  duration = 0.62,
  yaw = 0,
  toYaw,
  sway = 0,
  nod = 0,
  seed = 0,
  shadow,
  children,
}: HopperProps) {
  const { clock } = useStoryCtx()
  const ref = useRef<THREE.Group>(null)
  const squash = useRef<THREE.Group>(null)
  const shadowRef = useRef<THREE.Mesh>(null)
  // keyed on presence only: callers pass a fresh [w, d] array every render
  const hasShadow = !!shadow
  const shadowMat = useMemo(() => (hasShadow ? makeShadowMaterial(0.3) : null), [hasShadow])
  useEffect(() => () => shadowMat?.dispose(), [shadowMat])
  const st = useMemo(() => ({ e: 0, j: { s: 0, v: 0 } as Jelly, ph: seed * 1.73 + 0.4 }), [seed])
  const live = useRef({ from, to, at, height, duration, yaw, toYaw, sway, nod, shadow })
  useEffect(() => {
    live.current = { from, to, at, height, duration, yaw, toYaw, sway, nod, shadow }
  })

  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const g = ref.current
    const sq = squash.current
    if (!g || !sq) return
    const L = live.current
    const dt = clock.dt
    const r = clock.reduced
    const f = L.from
    const tgt = L.to ?? f
    const prev = st.e
    const e = L.to ? stepTo(prev, local(clock, chapter) >= L.at ? 1 : 0, dt / L.duration, r) : 0
    if (!r) {
      if ((prev === 0 && e > 0) || (prev === 1 && e < 1)) st.j.v += 2.4
      if ((prev < 1 && e === 1) || (prev > 0 && e === 0)) st.j.v -= 3.6
    }
    st.e = e
    const k = easeInOut(e)
    const arc = r ? 0 : L.height * BOUNCE_K * e * (1 - e)
    const x = f[0] + (tgt[0] - f[0]) * k
    const z = f[2] + (tgt[2] - f[2]) * k
    const ground = f[1] + (tgt[1] - f[1]) * k
    const moving = e > 0 && e < 1
    if (r) {
      st.j.s = 0
      st.j.v = 0
    } else jellyStep(st.j, (moving ? 0.07 : 0) + Math.min(0.06, Math.abs(clock.vel) * 0.05), dt)
    const s = THREE.MathUtils.clamp(st.j.s, -0.3, 0.3)
    g.position.set(x, ground + arc, z)
    const t = clock.t
    const rock = r ? 0 : L.sway * Math.sin(t * 1.25 + st.ph) - THREE.MathUtils.clamp(clock.vel * 0.14, -0.12, 0.12)
    const nodding = r || !L.nod ? 0 : Math.pow(Math.max(0, Math.sin(t * 1.6 + st.ph)), 4) * L.nod
    const y0 = L.yaw
    const y1 = L.toYaw ?? y0
    g.rotation.set(nodding, y0 + (y1 - y0) * k, rock)
    sq.scale.set(1 - s * 0.5, 1 + s, 1 - s * 0.5)

    const sh = shadowRef.current
    const size = L.shadow
    if (sh && shadowMat && size) {
      const lift = Math.min(1, arc / 0.6)
      sh.position.set(x, ground + 0.006, z)
      sh.scale.set(size[0] * (1 - lift * 0.4), 1, size[1] * (1 - lift * 0.4))
      shadowMat.opacity = 0.3 * (1 - lift * 0.85)
    }
  })

  return (
    <>
      {shadow && shadowMat && (
        <mesh ref={shadowRef} geometry={getFlatPlane()} material={shadowMat} renderOrder={-1} raycast={noRaycast} position={from} />
      )}
      <group ref={ref} position={from} rotation={[0, yaw, 0]}>
        <group ref={squash}>{children}</group>
      </group>
    </>
  )
}
