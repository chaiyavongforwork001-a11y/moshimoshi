import type { RefObject } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { MochiColor } from '@/lib/types'
import { MOCHI_TOP, profileAt, profileAtY } from './mochiGeometry'
import { accentFor, col, CORAL, CREAM } from './palette'
import { getClay, noRaycast, smoothSeams } from './props'

export type MochiAccessory = 'none' | 'headset' | 'leaf' | 'bow' | 'cap'

/*
 * Accessories live in body space (see mochiGeometry.ts) and are fitted to
 * the v2 profile: the headset band and the cap are built from the profile
 * itself, so they hug the head exactly.
 */
type Geo = Record<string, THREE.BufferGeometry>
let geo: Geo | null = null

/** points along the profile at azimuth ±90° from height y0 over the crown, pushed out by `off` */
function overTheTop(y0: number, off: number, n = 28) {
  const total = profileAt(1).s
  const start = profileAtY(y0).s / total
  // right side, bottom → crown
  const right: THREE.Vector3[] = []
  for (let i = 0; i <= n; i++) {
    const p = profileAt(start + ((1 - start) * i) / n)
    right.push(new THREE.Vector3(p.r + p.nr * off, p.y + p.ny * off, 0))
  }
  const left = right.slice(0, -1).map((v) => new THREE.Vector3(-v.x, v.y, 0))
  // left bottom → crown → right bottom
  return [...left, ...right.reverse()]
}

/** a soft leaf (base at the origin, pointing +x, face up): fuller near the stem, pointed tip, edges lifted */
function leafGeometry(len: number, wid: number, thick: number) {
  const g = new THREE.SphereGeometry(1, 28, 16)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const t = (p.getX(i) + 1) / 2
    const z = p.getZ(i) * wid * (1.12 - 0.72 * t)
    const y = p.getY(i) * thick + (Math.abs(z) / wid) * 0.05 + t * t * len * 0.16
    p.setXYZ(i, t * len, y, z)
  }
  return smoothSeams(g)
}

/** a bow: two puffy lobes, a knot and two tails (origin at the knot) */
export function bowGeometry() {
  const lobeL = new THREE.SphereGeometry(1, 20, 14).scale(0.17, 0.12, 0.08).rotateZ(0.32).translate(-0.15, 0.01, 0)
  const lobeR = new THREE.SphereGeometry(1, 20, 14).scale(0.17, 0.12, 0.08).rotateZ(-0.32).translate(0.15, 0.01, 0)
  const knot = new THREE.SphereGeometry(0.065, 16, 12).scale(1, 1, 0.85).translate(0, 0, 0.03)
  const parts = [lobeL, lobeR, knot]
  const g = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  return g
}
function bowTails() {
  const a = new THREE.SphereGeometry(1, 12, 8).scale(0.045, 0.11, 0.03).rotateZ(-0.45).translate(-0.05, -0.12, 0.01)
  const b = new THREE.SphereGeometry(1, 12, 8).scale(0.045, 0.11, 0.03).rotateZ(0.45).translate(0.05, -0.12, 0.01)
  const g = mergeGeometries([a, b])
  a.dispose()
  b.dispose()
  return g
}

function getGeo(): Geo {
  if (geo) return geo
  const band = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(overTheTop(-0.02, 0.07)), 80, 0.06, 12)
  const cup = new THREE.SphereGeometry(1, 24, 16).scale(0.13, 0.24, 0.23)
  const cupCap = new THREE.SphereGeometry(1, 20, 14).scale(0.065, 0.16, 0.15)
  const mic = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.97, -0.05, 0.1),
      new THREE.Vector3(0.96, -0.1, 0.42),
      new THREE.Vector3(0.8, -0.25, 0.69),
      new THREE.Vector3(0.53, -0.37, 0.88),
      new THREE.Vector3(0.34, -0.41, 0.94),
    ]),
    40,
    0.026,
    8,
  )
  const micTip = new THREE.SphereGeometry(0.068, 16, 12)

  // leaf hat: a big soft leaf lying on the crown + a tiny stem
  const stem = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([new THREE.Vector3(0, MOCHI_TOP - 0.04, 0), new THREE.Vector3(0.01, MOCHI_TOP + 0.08, 0), new THREE.Vector3(0.05, MOCHI_TOP + 0.15, 0.01)]),
    12,
    0.024,
    8,
  )
  const leaf = leafGeometry(0.62, 0.25, 0.05)
  const vein = new THREE.CylinderGeometry(0.009, 0.014, 0.5, 6).rotateZ(Math.PI / 2).translate(0.27, 0.04, 0)

  // cap: a dome made from the head profile itself, a brim and a button
  const pts: THREE.Vector2[] = []
  const s0 = profileAtY(0.3).s / profileAt(1).s
  for (let i = 0; i <= 24; i++) {
    const p = profileAt(s0 + ((1 - s0) * i) / 24)
    pts.push(new THREE.Vector2(p.r + p.nr * 0.035, p.y + p.ny * 0.035))
  }
  const dome = new THREE.LatheGeometry(pts, 48)
  const brim = new THREE.CylinderGeometry(0.62, 0.62, 0.045, 40, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 0.9)
  const button = new THREE.SphereGeometry(0.06, 12, 8)

  geo = { band, cup, cupCap, mic, micTip, stem, leaf, vein, dome, brim, button, bow: bowGeometry(), tails: bowTails() }
  return geo
}

const HEADSET_BAND = '#FFB4A2'

const plastic = new Map<string, THREE.MeshPhysicalMaterial>()
/** small glossy plastic parts */
export function getPlastic(hex: string) {
  let m = plastic.get(hex)
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({ color: col(hex), roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.12 })
    plastic.set(hex, m)
  }
  return m
}

export function MochiAccessoryParts({
  kind,
  body,
  color,
  swayRef,
}: {
  kind: MochiAccessory
  body: MochiColor
  color?: string
  /** group the mochi wiggles for secondary motion */
  swayRef?: RefObject<THREE.Group | null>
}) {
  if (kind === 'none') return null
  const g = getGeo()

  if (kind === 'headset') {
    // light candy band + chunky cups: soft and friendly, never the darkest thing in the pastel world
    const band = getPlastic(HEADSET_BAND)
    const cups = getPlastic(color ?? CORAL)
    const pad = getClay(CREAM)
    const side = profileAtY(-0.04)
    return (
      <group>
        <mesh geometry={g.band} material={band} raycast={noRaycast} />
        {[-1, 1].map((s) => (
          <group key={s} position={[s * (side.r + 0.07), -0.04, 0.02]}>
            <mesh geometry={g.cup} material={pad} raycast={noRaycast} />
            <mesh geometry={g.cupCap} material={cups} position={[s * 0.1, 0, 0]} raycast={noRaycast} />
          </group>
        ))}
        <mesh geometry={g.mic} material={band} raycast={noRaycast} />
        <mesh geometry={g.micTip} material={getPlastic(CORAL)} position={[0.33, -0.41, 0.95]} raycast={noRaycast} />
      </group>
    )
  }

  if (kind === 'leaf') {
    const green = getClay(color ?? accentFor(body, 'leaf'), '#E9FFF5')
    const vein = getClay('#3FAF84')
    return (
      <group>
        <mesh geometry={g.stem} material={green} raycast={noRaycast} />
        <group position={[0, MOCHI_TOP + 0.1, 0]}>
          <group ref={swayRef}>
            <group rotation={[0.95, 0, 0.42]} position={[0.02, 0.02, 0]}>
              <mesh geometry={g.leaf} material={green} raycast={noRaycast} />
              <mesh geometry={g.vein} material={vein} raycast={noRaycast} />
            </group>
          </group>
        </group>
      </group>
    )
  }

  if (kind === 'bow') {
    const ribbon = getClay(color ?? accentFor(body, 'bow'), '#FFFFFF')
    return <BowAt material={ribbon} swayRef={swayRef} />
  }

  // cap, brim turned a little to the side for character
  const fabric = getClay(color ?? accentFor(body, 'cap'), '#FFFFFF')
  return (
    <group rotation={[0, 0.35, 0]}>
      <mesh geometry={g.dome} material={fabric} raycast={noRaycast} />
      <mesh geometry={g.brim} material={fabric} position={[0, 0.33, 0.5]} rotation={[0.22, 0, 0]} raycast={noRaycast} />
      <mesh geometry={g.button} material={fabric} position={[0, MOCHI_TOP + 0.04, 0]} raycast={noRaycast} />
    </group>
  )
}

/** bow perched on the upper right of the head */
export function BowAt({
  material,
  swayRef,
  scale = 1,
}: {
  material: THREE.Material
  swayRef?: RefObject<THREE.Group | null>
  scale?: number
}) {
  const g = getGeo()
  const p = profileAt(0.86)
  const phi = 0.62
  return (
    <group
      position={[Math.sin(phi) * (p.r + 0.03), p.y + 0.03, Math.cos(phi) * (p.r + 0.03)]}
      rotation={[-0.55, 0.45, -0.5]}
      scale={scale}
    >
      <mesh geometry={g.bow} material={material} raycast={noRaycast} />
      <group ref={swayRef}>
        <mesh geometry={g.tails} material={material} raycast={noRaycast} />
      </group>
    </group>
  )
}
