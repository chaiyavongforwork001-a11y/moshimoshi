import { useRef } from 'react'
import type * as THREE from 'three'
import { MOCHI } from '@/lib/colors'
import { CORAL } from '../palette'
import { noRaycast } from '../props'
import { getCandy, getInstCandy } from './bake'
import { Platform } from './cast'
import { Floaters, type Floater } from './Floaters'
import type { IslandSpot, RoomKind } from './layout'
import { getGlow, getMoon, getNote, getSteamMaterial, getStar, getWisp } from './shapes'
import { syncClock, useStoryCtx } from './timeline'
import { FAR_HAZE, getDiorama, getSpeaker } from './toys'
import { useViewFrame } from '../viewActive'

/*
 * One floating room island: a pastel cloud cushion, its baked diorama
 * (one draw call) and a few living details. Items are in island units
 * (radius 1, floor at y = 0); the island group scales them.
 */
const steam = (x: number, y: number, z: number): Floater[] =>
  [0, 1, 2].map((k) => ({ p: [x + (k - 1) * 0.04, y, z], s: 0.85 - k * 0.12, c: '#FFFFFF', mode: 'rise', ph: k * 1.1, amp: 0.22, speed: 0.45 }))

type Life = { geo: () => THREE.BufferGeometry; steam?: boolean; items: Floater[] }
const LIFE: Record<RoomKind, Life[]> = {
  game: [
    { geo: getMoon, items: [{ p: [-0.05, 1.08, -0.5], s: 0.15, c: MOCHI.butter.shade, mode: 'bob', rot: [0, 0, 0.5], spin: 0, amp: 0.05 }] },
    {
      geo: getStar,
      items: [
        { p: [-0.36, 0.95, -0.55], s: 0.06, c: MOCHI.butter.base, mode: 'bob', ph: 1, spin: 0.9 },
        { p: [0.3, 1.2, -0.45], s: 0.05, c: '#FFFFFF', mode: 'bob', ph: 2.4, spin: -0.8 },
      ],
    },
  ],
  anime: [
    {
      geo: getStar,
      items: [
        { p: [-0.45, 0.82, -0.3], s: 0.09, c: MOCHI.butter.shade, mode: 'bob', ph: 0.2, spin: 0.8 },
        { p: [0.05, 1.05, -0.55], s: 0.07, c: MOCHI.sky.shade, mode: 'bob', ph: 1.9, spin: -0.7 },
        { p: [0.5, 0.72, -0.2], s: 0.06, c: CORAL, mode: 'bob', ph: 3.1, spin: 1 },
      ],
    },
  ],
  work: [{ geo: getWisp, steam: true, items: steam(0.5, 0.22, -0.16) }],
  music: [
    {
      geo: getNote,
      items: [
        { p: [0.32, 0.62, -0.2], s: 0.13, c: MOCHI.lavender.shade, mode: 'rise', ph: 0, amp: 0.55, speed: 0.3 },
        { p: [0.6, 0.66, -0.3], s: 0.11, c: CORAL, mode: 'rise', ph: 1.4, amp: 0.5, speed: 0.33 },
        { p: [0.45, 0.6, -0.1], s: 0.1, c: MOCHI.sky.shade, mode: 'rise', ph: 2.6, amp: 0.6, speed: 0.28 },
      ],
    },
  ],
  corner: [{ geo: getWisp, steam: true, items: steam(0.18, 0.22, 0.12) }],
}

function Speaker() {
  const { clock } = useStoryCtx()
  const ref = useRef<THREE.Mesh>(null)
  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const m = ref.current
    if (!m) return
    const beat = clock.reduced ? 0 : Math.pow(Math.max(0, Math.sin(clock.t * Math.PI * 2.2)), 8)
    m.scale.set(1 + beat * 0.05, 1 - beat * 0.04, 1 + beat * 0.05)
  })
  return <mesh ref={ref} geometry={getSpeaker()} material={getCandy()} position={[0.48, 0, -0.24]} rotation={[0, -0.4, 0]} raycast={noRaycast} />
}

function LampGlow() {
  const { clock } = useStoryCtx()
  const ref = useRef<THREE.Sprite>(null)
  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const s = ref.current
    if (!s) return
    const f = clock.reduced ? 1 : 1 + Math.sin(clock.t * 2.1) * 0.04 + Math.sin(clock.t * 5.3) * 0.02
    s.scale.setScalar(0.95 * f)
  })
  return <sprite ref={ref} material={getGlow('#FFC46B', 0.6)} position={[-0.46, 0.44, -0.2]} raycast={noRaycast} />
}

/** props read at a glance: bigger than island units, nudged back so the front stays free for the friend */
const PROPS = 1.5

export function RoomIsland({ spot }: { spot: IslandSpot }) {
  return (
    <group position={spot.pos}>
      <Platform color={spot.color} size={spot.r} far={spot.far ? FAR_HAZE : 0} />
      <group scale={spot.r * PROPS} position={[0, 0, -0.1 * spot.r]}>
        <mesh geometry={getDiorama(spot.kind, spot.far)} material={getCandy()} raycast={noRaycast} />
        {LIFE[spot.kind].map((l, i) => (
          <Floaters key={i} geometry={l.geo()} material={l.steam ? getSteamMaterial() : getInstCandy()} items={l.items} />
        ))}
        {spot.kind === 'music' && <Speaker />}
        {spot.kind === 'corner' && <LampGlow />}
      </group>
    </group>
  )
}
