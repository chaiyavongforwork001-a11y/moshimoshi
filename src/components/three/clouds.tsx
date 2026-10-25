import { type ThreeElements } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MOCHI } from '@/lib/colors'
import type { MochiColor } from '@/lib/types'
import { mulberry32 } from './mochiGeometry'
import { BlobShadow, noRaycast, smoothSeams } from './props'
import { useViewFrame } from './viewActive'

/*
 * Moshi Sky clouds: puffs merged into one geometry each, shaded by baked
 * vertex colours (white crown → pastel belly), so a whole cloud is one draw.
 */
type Puff = [x: number, y: number, z: number, sx: number, sy: number, sz: number]

function cloudGeometry(puffs: Puff[], tint: string, seg = 28) {
  const parts = puffs.map(([x, y, z, sx, sy, sz]) => {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.65))
    g.scale(sx, sy, sz).translate(x, y, z)
    return g
  })
  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  const g = smoothSeams(merged)
  g.computeBoundingBox()
  const box = g.boundingBox!
  const pos = g.attributes.position
  const nrm = g.attributes.normal
  const colors = new Float32Array(pos.count * 3)
  const top = new THREE.Color('#FFFFFF')
  const belly = new THREE.Color(tint)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    // white where a puff faces the sky, pastel underneath each puff and toward the base
    const k = (pos.getY(i) - box.min.y) / Math.max(1e-6, box.max.y - box.min.y)
    const up = nrm.getY(i) * 0.5 + 0.5
    const lit = THREE.MathUtils.smoothstep(k, 0.05, 0.9) * 0.45 + THREE.MathUtils.smoothstep(up, 0.3, 0.85) * 0.55
    c.copy(belly).lerp(top, lit)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g
}

let cloudMat: THREE.MeshPhysicalMaterial | null = null
/** soft matte cloud: sheen for the fuzzy rim, no gloss */
export function getCloudMaterial() {
  return (cloudMat ??= new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.75,
    sheen: 1,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#FFFFFF'),
  }))
}

const tintOf = (c: MochiColor) => new THREE.Color(MOCHI[c].light).lerp(new THREE.Color(MOCHI[c].base), 0.62).getStyle()

// ------------------------------------------------------------------ cushion
const CUSHION_PUFFS: Puff[] = [
  [0, 0, 0, 1, 0.34, 0.86],
  [0.78, -0.05, 0.28, 0.42, 0.3, 0.4],
  [-0.8, -0.04, 0.22, 0.44, 0.31, 0.42],
  [0.3, -0.07, 0.68, 0.46, 0.29, 0.36],
  [-0.38, -0.06, 0.66, 0.44, 0.28, 0.36],
  [0.62, -0.03, -0.5, 0.46, 0.3, 0.42],
  [-0.6, -0.03, -0.52, 0.48, 0.31, 0.42],
  [0, -0.16, 0, 0.8, 0.26, 0.7],
]
/** y of the cushion's (soft) seat at scale 1 — a mochi standing here sinks in a little */
export const CLOUD_SEAT = 0.27
const cushionGeo = new Map<MochiColor, THREE.BufferGeometry>()

/** A puffy cloud cushion; its seat is at y = CLOUD_SEAT (× scale). Floats gently when `float`. */
export function CloudCushion({
  color = 'lavender',
  float = false,
  seed = 0,
  shadow = false,
  children,
  ...group
}: ThreeElements['group'] & { color?: MochiColor; float?: boolean; seed?: number; shadow?: boolean }) {
  let g = cushionGeo.get(color)
  if (!g) cushionGeo.set(color, (g = cloudGeometry(CUSHION_PUFFS, tintOf(color))))
  const ref = useRef<THREE.Group>(null)
  const reduced = useReducedMotion() ?? false
  useViewFrame((state) => {
    if (!float || reduced || !ref.current) return
    const t = state.clock.elapsedTime + seed * 1.7
    ref.current.position.y = Math.sin(t * 0.9) * 0.05
    ref.current.rotation.z = Math.sin(t * 0.6) * 0.02
  })
  return (
    <group {...group}>
      {shadow && <BlobShadow position={[0, -0.3, 0]} size={[2.6, 2]} opacity={0.22} />}
      <group ref={ref}>
        <mesh geometry={g} material={getCloudMaterial()} raycast={noRaycast} />
        {/* whatever sits on the cushion rides along */}
        <group position={[0, CLOUD_SEAT, 0]}>{children}</group>
      </group>
    </group>
  )
}

// ------------------------------------------------------------------ bank
const bankGeo = new Map<string, THREE.BufferGeometry>()
function getBank(width: number, tint: MochiColor, seed: number, detail: number) {
  const key = `${width}:${tint}:${seed}:${detail}`
  let g = bankGeo.get(key)
  if (g) return g
  const rnd = mulberry32(seed)
  const puffs: Puff[] = []
  const n = Math.max(6, Math.round(width / 0.9))
  for (let i = 0; i < n; i++) {
    const x = -width / 2 + (width * (i + 0.5)) / n + (rnd() - 0.5) * 0.4
    const s = 0.7 + rnd() * 0.6
    puffs.push([x, (rnd() - 0.6) * 0.2, (rnd() - 0.5) * 0.6, s * 1.05, s * 0.62, s * 0.75])
    if (rnd() < 0.6) puffs.push([x + 0.4, -0.15, 0.45 + rnd() * 0.3, s * 0.7, s * 0.36, s * 0.5])
  }
  g = cloudGeometry(puffs, tintOf(tint), detail)
  bankGeo.set(key, g)
  return g
}

/** a long soft cloud bank: the ground of Moshi Sky (its top is at about y = 0.3 × scale) */
export function CloudBank({
  width = 14,
  color = 'peach',
  seed = 3,
  detail = 22,
  ...group
}: ThreeElements['group'] & {
  width?: number
  color?: MochiColor
  seed?: number
  /** sphere segments per puff (lower for far banks) */
  detail?: number
}) {
  const g = useMemo(() => getBank(width, color, seed, detail), [width, color, seed, detail])
  return (
    <group {...group}>
      <mesh geometry={g} material={getCloudMaterial()} raycast={noRaycast} />
    </group>
  )
}

// ------------------------------------------------------------------ sky clouds
const SKY_PUFFS: Puff[] = [
  [0, 0, 0, 1, 0.55, 0.6],
  [0.85, -0.12, 0.05, 0.7, 0.42, 0.5],
  [-0.9, -0.15, 0, 0.62, 0.38, 0.45],
  [0.35, 0.28, -0.05, 0.6, 0.45, 0.45],
  [-0.4, 0.18, 0.02, 0.55, 0.4, 0.42],
]
let skyGeo: THREE.BufferGeometry | null = null

/** big soft clouds drifting slowly far behind the scene */
export function SkyClouds({
  clouds,
  speed = 0.06,
  span = 18,
}: {
  /** [x, y, z, scale] of each cloud */
  clouds: [number, number, number, number][]
  speed?: number
  /** they wrap around within ±span/2 */
  span?: number
}) {
  skyGeo ??= cloudGeometry(SKY_PUFFS, '#E8DDFF', 22)
  const ref = useRef<THREE.Group>(null)
  const reduced = useReducedMotion() ?? false
  useViewFrame((state) => {
    const root = ref.current
    if (!root || reduced) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < root.children.length; i++) {
      const c = clouds[i]
      const ch = root.children[i]
      if (!c || !ch) continue
      const x = c[0] + t * speed * (0.7 + (i % 3) * 0.2)
      ch.position.x = ((((x + span / 2) % span) + span) % span) - span / 2
      ch.position.y = c[1] + Math.sin(t * 0.3 + i) * 0.06
    }
  })
  return (
    <group ref={ref}>
      {clouds.map(([x, y, z, s], i) => (
        <mesh key={i} geometry={skyGeo!} material={getCloudMaterial()} position={[x, y, z]} scale={s} raycast={noRaycast} />
      ))}
    </group>
  )
}
