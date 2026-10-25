import { useRef } from 'react'
import * as THREE from 'three'
import { FloatingDeco } from '../FloatingDeco'
import { MOCHI_FOOT, MOCHI_TOP } from '../mochiGeometry'
import { CUSHION_TOP, getFlatPlane, noRaycast, PuffyCushion } from '../props'
import { SpeechBubble } from '../SpeechBubble'
import { at, bake, getCandy } from './bake'
import { FriendMochi, Platform } from './cast'
import { ChapterGroup } from './Jelly'
import { CENTER, CIRCLE, CIRCLE_FRIENDS, CIRCLE_SEATS } from './layout'
import { getGlow, getPoolMaterial } from './shapes'
import { syncClock, useStoryCtx } from './timeline'
import { useViewFrame } from '../viewActive'

/** lantern hover point (relative to the circle centre) — StoryLights puts the warm light here */
export const LANTERN_AT: [number, number, number] = [0, 1.75, 0]
const CUSH = 0.55
const MOCHI_S = 0.42
const CUSHION_COLORS = ['lavender', 'butter', 'sky', 'pink'] as const

let lanternFrame: THREE.BufferGeometry | null = null
function getLanternFrame() {
  if (!lanternFrame) {
    const rib = (y: number, r: number) => new THREE.TorusGeometry(r, 0.012, 6, 32).rotateX(Math.PI / 2).translate(0, y, 0)
    lanternFrame = bake([
      [rib(0.17, 0.25), '#F3B56E'],
      [rib(0, 0.3), '#F3B56E'],
      [rib(-0.17, 0.25), '#F3B56E'],
      [new THREE.CylinderGeometry(0.13, 0.15, 0.07, 24), '#E8836A', at(0, 0.33, 0)],
      [new THREE.CylinderGeometry(0.15, 0.12, 0.06, 24), '#E8836A', at(0, -0.33, 0)],
      [new THREE.TorusGeometry(0.07, 0.014, 6, 16), '#E8836A', at(0, 0.41, 0)],
      [new THREE.SphereGeometry(0.035, 10, 8), '#FFC54D', at(0, -0.4, 0)],
    ])
  }
  return lanternFrame
}
let paperGeo: THREE.SphereGeometry | null = null
let paperMat: THREE.MeshStandardMaterial | null = null
const getPaper = () => (paperGeo ??= new THREE.SphereGeometry(0.31, 32, 20).scale(1, 1.08, 1))
const getPaperMat = () =>
  (paperMat ??= new THREE.MeshStandardMaterial({ color: '#FFEFD2', emissive: new THREE.Color('#FFC27A'), emissiveIntensity: 0.75, roughness: 0.9 }))

function Lantern() {
  const { clock } = useStoryCtx()
  const ref = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Sprite>(null)
  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const g = ref.current
    if (!g) return
    const t = clock.reduced ? 0 : clock.t
    g.position.y = LANTERN_AT[1] + Math.sin(t * 0.9) * 0.06
    g.rotation.set(Math.sin(t * 0.7) * 0.05, t * 0.15, Math.sin(t * 0.8 + 1) * 0.05)
    const s = glow.current
    if (s) s.scale.setScalar(1.6 * (1 + Math.sin(t * 2.3) * 0.04 + Math.sin(t * 6.1) * 0.02))
  })
  return (
    <group ref={ref} position={LANTERN_AT}>
      <mesh geometry={getPaper()} material={getPaperMat()} raycast={noRaycast} />
      <mesh geometry={getLanternFrame()} material={getCandy()} raycast={noRaycast} />
      <sprite ref={glow} material={getGlow('#FFB861', 0.5)} raycast={noRaycast} />
    </group>
  )
}

/**
 * "วงเล็กๆ ที่อุ่นใจ": friends on cushions in a small circle around a
 * floating paper lantern, swaying gently; one of them is typing "…".
 * The guide takes the open seat on its own cloud (see Guide.tsx).
 */
export function CircleChapter() {
  const { compact, cues } = useStoryCtx()
  const lay = compact ? CIRCLE.compact : CIRCLE.wide
  const talk = cues((s) => s.talk)
  const seats = CIRCLE_SEATS.slice(1).map((deg) => {
    const a = THREE.MathUtils.degToRad(deg)
    const x = Math.cos(a) * lay.radius
    const z = -Math.sin(a) * lay.radius
    // face the lantern, turned a little toward the viewer
    const yaw = Math.atan2(-x, -z) * 0.72
    return { x, z, yaw }
  })
  const back = seats[1]
  const head = CUSHION_TOP * CUSH + (MOCHI_TOP - MOCHI_FOOT) * MOCHI_S

  return (
    <ChapterGroup index={3} position={CENTER.circle}>
      <Platform size={lay.floor} depth={0.82} />
      <mesh geometry={getFlatPlane()} material={getPoolMaterial()} position={[0, 0.01, 0]} scale={[2.6, 1, 2.2]} renderOrder={-1} raycast={noRaycast} />
      <Lantern />
      {seats.map((s, i) => (
        <group key={i}>
          <PuffyCushion position={[s.x, 0, s.z]} scale={CUSH} color={CUSHION_COLORS[i]} />
          <FriendMochi
            friend={CIRCLE_FRIENDS[i]}
            scale={MOCHI_S}
            seed={60 + i}
            chapter={3}
            from={[s.x, CUSHION_TOP * CUSH, s.z]}
            yaw={s.yaw}
            sway={0.07}
            expression={i === 1 ? 'talk' : CIRCLE_FRIENDS[i].expression === 'happy' ? 'happy' : 'smile'}
          />
        </group>
      ))}
      {talk === 3 && (
        <SpeechBubble
          position={[back.x + 0.18, head + 0.1, back.z + 0.2]}
          text="..."
          lines={['...']}
          side="left"
          color={CIRCLE_FRIENDS[1].color}
          delay={0.8}
          interval={2600}
          rest={2600}
          size={0.95}
        />
      )}
      <FloatingDeco
        count={compact ? 10 : 14}
        area={[lay.floor * 2, 2.6, 2.4]}
        center={[0, 1.2, -0.6]}
        avoid={[0.8, 0.8]}
        kinds={['sparkle', 'bubble']}
        colors={['butter', 'peach', 'pink']}
        size={0.7}
        speed={0.6}
        seed={33}
      />
    </ChapterGroup>
  )
}
