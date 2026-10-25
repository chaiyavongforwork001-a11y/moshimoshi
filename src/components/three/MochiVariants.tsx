import type { RefObject } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MOCHI } from '@/lib/colors'
import type { MochiColor } from '@/lib/types'
import { getJellyPart } from './jelly'
import { BowAt } from './MochiAccessories'
import { MOCHI_TOP, profileAt } from './mochiGeometry'
import { CORAL } from './palette'
import { getClay, noRaycast } from './props'

/**
 * Per-colour personality on top of the head:
 * peach seedling, pink bunny ears, lavender cat ears, mint curly ahoge,
 * butter chick tuft, sky water-drop tuft, cream little bow.
 */
export type MochiVariant = 'auto' | 'plain' | 'sprout' | 'bunny' | 'cat' | 'ahoge' | 'chick' | 'drop' | 'ribbon'

export const VARIANT_BY_COLOR: Record<MochiColor, Exclude<MochiVariant, 'auto' | 'plain'>> = {
  peach: 'sprout',
  pink: 'bunny',
  lavender: 'cat',
  mint: 'ahoge',
  butter: 'chick',
  sky: 'drop',
  cream: 'ribbon',
}

type Geo = Record<string, THREE.BufferGeometry>
let geo: Geo | null = null

function lathe(points: [number, number][], seg = 28) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    seg,
  )
}

function getGeo(): Geo {
  if (geo) return geo
  const T = MOCHI_TOP
  // seedling: a short curved stem with two round leaves
  const stem = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([new THREE.Vector3(0, T - 0.05, 0), new THREE.Vector3(0.0, T + 0.09, 0), new THREE.Vector3(0.03, T + 0.19, 0)]),
    12,
    0.028,
    8,
  )
  const leafL = new THREE.SphereGeometry(1, 18, 12).scale(0.155, 0.045, 0.115).translate(-0.14, 0, 0).rotateZ(-0.45)
  const leafR = new THREE.SphereGeometry(1, 18, 12).scale(0.17, 0.045, 0.12).translate(0.155, 0, 0).rotateZ(0.5)
  const leaves = mergeGeometries([leafL, leafR])
  leafL.dispose()
  leafR.dispose()

  // long soft bunny ear (origin at its base) + the pink inside
  const ear = lathe([
    [0, -0.04],
    [0.085, 0.0],
    [0.115, 0.12],
    [0.118, 0.26],
    [0.095, 0.38],
    [0.05, 0.45],
    [0, 0.465],
  ]).scale(1, 1, 0.62)
  const earIn = lathe([
    [0, 0.06],
    [0.06, 0.1],
    [0.075, 0.22],
    [0.06, 0.34],
    [0, 0.39],
  ]).scale(1, 1, 0.3)

  // soft rounded cat ear
  const cat = lathe([
    [0, -0.02],
    [0.19, 0.0],
    [0.16, 0.09],
    [0.1, 0.19],
    [0.045, 0.255],
    [0, 0.27],
  ], 32).scale(1.25, 1.25, 0.66)
  const catIn = lathe([
    [0, 0.03],
    [0.11, 0.04],
    [0.07, 0.13],
    [0.03, 0.19],
    [0, 0.2],
  ]).scale(1.25, 1.25, 0.36)

  // one curly hair strand
  const curlPts: THREE.Vector3[] = []
  for (let i = 0; i <= 40; i++) {
    const k = i / 40
    const a = k * Math.PI * 1.65
    const rad = 0.165 * (1 - k * 0.45)
    curlPts.push(new THREE.Vector3(Math.sin(a) * rad * 0.9, T - 0.03 + (1 - Math.cos(a)) * rad + k * 0.15, Math.sin(a * 0.5) * 0.06))
  }
  // chunky enough to read at card size
  const ahoge = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curlPts), 64, 0.067, 12)
  const ahogeEnd = new THREE.SphereGeometry(0.067, 14, 10).translate(curlPts[40].x, curlPts[40].y, curlPts[40].z)
  const ahogeAll = mergeGeometries([ahoge, ahogeEnd])
  ahoge.dispose()
  ahogeEnd.dispose()

  // chick tuft: three little feathers fanned out
  const feathers: THREE.BufferGeometry[] = []
  for (const [a, s] of [
    [-0.55, 0.78],
    [0, 1],
    [0.55, 0.78],
  ] as const) {
    feathers.push(new THREE.SphereGeometry(1, 14, 10).scale(0.065 * s, 0.19 * s, 0.065 * s).translate(0, 0.15 * s, 0).rotateZ(a).translate(0, T - 0.05, 0))
  }
  const tuft = mergeGeometries(feathers)
  feathers.forEach((f) => f.dispose())

  // water drop standing on the crown
  const dropPts: [number, number][] = []
  for (let i = 0; i <= 20; i++) {
    const t = (i / 20) * Math.PI
    dropPts.push([0.165 * Math.sin(t) * Math.pow((1 + Math.cos(t)) / 2, 0.55), 0.165 * (1 - Math.cos(t)) * 1.35])
  }
  dropPts[0][0] = 0
  dropPts[20][0] = 0
  const drop = lathe(dropPts, 28)

  geo = { stem, leaves, ear, earIn, cat, catIn, ahoge: ahogeAll, tuft, drop }
  return geo
}

const crown = (u: number) => profileAt(u)

export function MochiVariantParts({
  variant,
  body,
  swayRef,
}: {
  variant: Exclude<MochiVariant, 'auto'>
  body: MochiColor
  swayRef?: RefObject<THREE.Group | null>
}) {
  if (variant === 'plain') return null
  const g = getGeo()
  const T = MOCHI_TOP

  if (variant === 'sprout') {
    const green = getClay('#7FD9A8', '#EFFFF6')
    return (
      <group>
        <mesh geometry={g.stem} material={green} raycast={noRaycast} />
        <group position={[0.03, T + 0.19, 0]}>
          <group ref={swayRef}>
            <mesh geometry={g.leaves} material={green} raycast={noRaycast} />
          </group>
        </group>
      </group>
    )
  }

  if (variant === 'bunny' || variant === 'cat') {
    const bunny = variant === 'bunny'
    const skin = getJellyPart(body, 0.92)
    const inner = getClay(bunny ? '#FFB0C4' : '#FFC2D3', '#FFFFFF')
    const p = crown(bunny ? 0.93 : 0.86)
    const x = p.r - (bunny ? 0.03 : 0.05)
    const y = p.y - 0.02
    return (
      <group position={[0, T, 0]}>
        <group ref={swayRef}>
          <group position={[0, -T, 0]}>
            {[-1, 1].map((s) => (
              <group
                key={s}
                position={[s * x, y, bunny ? -0.02 : 0.02]}
                rotation={bunny ? [-0.12, 0, -s * (s > 0 ? 0.42 : 0.2)] : [0.05, 0, -s * 0.5]}
              >
                <mesh geometry={bunny ? g.ear : g.cat} material={skin} raycast={noRaycast} />
                {/* the bunny's inner panel sits proud of the ear's front so it always reads */}
                <mesh geometry={bunny ? g.earIn : g.catIn} material={inner} position={[0, 0, bunny ? 0.058 : 0.06]} raycast={noRaycast} />
              </group>
            ))}
          </group>
        </group>
      </group>
    )
  }

  if (variant === 'ahoge') {
    // a touch deeper than the crown, so the curl never melts into a matching background
    const hair = getJellyPart(body, 0.25)
    return (
      <group position={[0, T, 0]}>
        <group ref={swayRef}>
          <mesh geometry={g.ahoge} material={hair} position={[0, -T, 0]} raycast={noRaycast} />
        </group>
      </group>
    )
  }

  if (variant === 'chick') {
    const fluff = getClay(MOCHI.butter.shade, '#FFF4CF')
    return (
      <group position={[0, T, 0]}>
        <group ref={swayRef}>
          <mesh geometry={g.tuft} material={fluff} position={[0, -T, 0]} raycast={noRaycast} />
        </group>
      </group>
    )
  }

  if (variant === 'drop') {
    const water = getJellyPart(body, 0.25)
    return (
      <group position={[0, T - 0.04, 0]}>
        <group ref={swayRef} rotation={[0, 0, -0.25]}>
          <mesh geometry={g.drop} material={water} raycast={noRaycast} />
        </group>
      </group>
    )
  }

  // ribbon
  return <BowAt material={getClay(CORAL, '#FFFFFF')} swayRef={swayRef} scale={0.8} />
}
