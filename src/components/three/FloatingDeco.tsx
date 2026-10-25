import { useReducedMotion } from 'motion/react'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { MOCHI } from '@/lib/colors'
import type { MochiColor } from '@/lib/types'
import { mulberry32 } from './mochiGeometry'
import { noRaycast } from './props'
import { useViewFrame } from './viewActive'

export type DecoKind = 'sparkle' | 'bubble' | 'ring' | 'chat'

export interface FloatingDecoProps {
  /** total pieces across all kinds */
  count?: number
  /** [width, height, depth] of the box they drift in */
  area?: [number, number, number]
  center?: [number, number, number]
  /** [halfWidth, halfHeight] of an ellipse kept clear for the main subject */
  avoid?: [number, number]
  colors?: MochiColor[]
  kinds?: DecoKind[]
  seed?: number
  size?: number
  speed?: number
}

type Geo = Record<DecoKind, THREE.BufferGeometry>
let geo: Geo | null = null
let mats: Record<DecoKind, THREE.Material> | null = null

function getGeo(): Geo {
  if (geo) return geo
  // puffy four-point sparkle with soft concave sides
  const s = new THREE.Shape()
  const c = 0.17
  s.moveTo(0, 1)
  s.quadraticCurveTo(c, c, 1, 0)
  s.quadraticCurveTo(c, -c, 0, -1)
  s.quadraticCurveTo(-c, -c, -1, 0)
  s.quadraticCurveTo(-c, c, 0, 1)
  const sparkle = new THREE.ExtrudeGeometry(s, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.1,
    bevelSegments: 3,
    curveSegments: 8,
  }).center()
  // tiny puffy speech bubble (hello on the phone)
  const b = new THREE.Shape()
  b.absellipse(0, 0.1, 1, 0.74, 0, Math.PI * 2, false, 0)
  const tail = new THREE.Shape()
  tail.moveTo(-0.55, -0.35)
  tail.quadraticCurveTo(-0.62, -0.75, -0.95, -0.95)
  tail.quadraticCurveTo(-0.3, -0.85, 0.0, -0.45)
  const chat = new THREE.ExtrudeGeometry([b, tail], {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.12,
    bevelSegments: 3,
    curveSegments: 16,
  }).center()
  geo = {
    sparkle,
    bubble: new THREE.SphereGeometry(1, 18, 12),
    ring: new THREE.TorusGeometry(1, 0.32, 10, 26),
    chat,
  }
  return geo
}

function getMats() {
  if (!mats) {
    mats = {
      sparkle: new THREE.MeshStandardMaterial({ roughness: 0.35 }),
      bubble: new THREE.MeshPhysicalMaterial({ roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
      ring: new THREE.MeshStandardMaterial({ roughness: 0.4 }),
      chat: new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    }
  }
  return mats
}

const SHARE: Record<DecoKind, number> = { sparkle: 0.45, bubble: 0.35, ring: 0.2, chat: 0.18 }
const SIZE: Record<DecoKind, [number, number]> = { sparkle: [0.1, 0.17], bubble: [0.05, 0.12], ring: [0.07, 0.11], chat: [0.1, 0.15] }
const _dummy = new THREE.Object3D()
const _c = new THREE.Color()

interface Piece {
  x: number
  z: number
  ph: number
  sp: number
  sway: number
  spin: number
  tilt: number
  s: number
}

function DecoLayer({
  kind,
  n,
  props,
  reduced,
}: {
  kind: DecoKind
  n: number
  props: Required<Omit<FloatingDecoProps, 'avoid' | 'kinds' | 'count'>> & { avoid?: [number, number] }
  reduced: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const done = useRef(false)
  const { area, center, avoid, colors, seed, size, speed } = props
  const layoutKey = [...area, ...center, ...(avoid ?? [])].join(',')
  const colorKey = colors.join(',')

  const pieces = useMemo(() => {
    const rnd = mulberry32(seed * 31 + kind.length * 977)
    const out: Piece[] = []
    for (let i = 0; i < n; i++) {
      let x = 0
      let y = 0
      for (let tries = 0; tries < 10; tries++) {
        x = (rnd() - 0.5) * area[0]
        y = (rnd() - 0.5) * area[1]
        if (!avoid || (x / avoid[0]) ** 2 + (y / avoid[1]) ** 2 > 1) break
      }
      const [lo, hi] = SIZE[kind]
      out.push({
        x,
        z: center[2] + (rnd() - 0.5) * area[2],
        ph: (y / area[1] + 0.5 + 1) % 1,
        sp: (0.06 + rnd() * 0.08) * speed,
        sway: 0.08 + rnd() * 0.14,
        spin: (rnd() - 0.5) * 1.6,
        tilt: rnd() * Math.PI * 2,
        s: (lo + rnd() * (hi - lo)) * size,
      })
    }
    done.current = false
    return out
    // layoutKey stands in for area / center / avoid
  }, [kind, n, layoutKey, seed, size, speed])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rnd = mulberry32(seed * 13 + n)
    for (let i = 0; i < n; i++) {
      const c = colors[Math.floor(rnd() * colors.length) % colors.length]
      _c.set(kind === 'bubble' || kind === 'chat' ? MOCHI[c].base : MOCHI[c].shade)
      mesh.setColorAt(i, _c)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    // colorKey stands in for colors
  }, [colorKey, kind, n, seed])

  useViewFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    if (reduced && done.current) return
    const t = reduced ? 0 : state.clock.elapsedTime
    const H = area[1]
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i]
      const u = (((p.ph + (t * p.sp) / H) % 1) + 1) % 1
      // fade in at the bottom, out at the top, so wrapping never pops
      const fade = Math.pow(Math.sin(Math.PI * u), 0.6)
      const twinkle = kind === 'sparkle' ? 0.82 + 0.18 * Math.sin(t * 2.6 + p.tilt * 3) : 1
      _dummy.position.set(center[0] + p.x + Math.sin(t * 0.7 + p.tilt) * p.sway, center[1] - H / 2 + u * H, p.z)
      if (kind === 'chat') _dummy.rotation.set(Math.sin(t * 0.5 + p.tilt) * 0.25, Math.sin(t * 0.4 + p.tilt) * 0.5, Math.sin(t * 0.7 + p.tilt) * 0.15)
      else if (kind === 'sparkle') _dummy.rotation.set(Math.sin(t * 0.5 + p.tilt) * 0.3, Math.sin(t * 0.4 + p.tilt) * 0.4, p.tilt + t * p.spin)
      else _dummy.rotation.set(p.tilt + t * p.spin * 0.5, p.tilt * 0.7 + t * p.spin * 0.3, 0)
      _dummy.scale.setScalar(Math.max(0.0001, p.s * fade * twinkle))
      _dummy.updateMatrix()
      mesh.setMatrixAt(i, _dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    done.current = true
  })

  const g = getGeo()
  const m = getMats()
  return <instancedMesh ref={ref} args={[g[kind], m[kind], n]} frustumCulled={false} raycast={noRaycast} />
}

/** Instanced pastel sparkles, candy bubbles and rings drifting softly upward. */
export function FloatingDeco({
  count = 24,
  area = [8, 4.5, 3],
  center = [0, 0, -1],
  avoid,
  colors = ['peach', 'butter', 'mint', 'lavender', 'sky', 'pink'],
  kinds = ['sparkle', 'bubble', 'ring'],
  seed = 7,
  size = 1,
  speed = 1,
}: FloatingDecoProps) {
  const reduced = useReducedMotion() ?? false
  const total = kinds.reduce((n, k) => n + SHARE[k], 0)
  const props = { area, center, avoid, colors, seed, size, speed }
  return (
    <>
      {kinds.map((k) => {
        const n = Math.max(1, Math.round((count * SHARE[k]) / total))
        return <DecoLayer key={`${k}-${n}`} kind={k} n={n} props={props} reduced={reduced} />
      })}
    </>
  )
}

// ------------------------------------------------------------------ signal arc
let dotGeo: THREE.SphereGeometry | null = null
let dotMat: THREE.MeshStandardMaterial | null = null
const _from = new THREE.Vector3()
const _to = new THREE.Vector3()
const _p = new THREE.Vector3()

/**
 * A dotted "signal" travelling along an arc from one point to another,
 * like a call connecting. Dots shift colour from `colors[0]` to `colors[1]`.
 */
export function SignalArc({
  from,
  to,
  height = 1,
  count = 9,
  colors = ['peach', 'mint'],
  size = 0.065,
  speed = 0.38,
}: {
  from: [number, number, number]
  to: [number, number, number]
  height?: number
  count?: number
  colors?: [MochiColor, MochiColor]
  size?: number
  speed?: number
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const reduced = useReducedMotion() ?? false
  const curve = useMemo(() => {
    _from.set(...from)
    _to.set(...to)
    const mid = _from.clone().add(_to).multiplyScalar(0.5)
    mid.y += height
    return new THREE.QuadraticBezierCurve3(_from.clone(), mid, _to.clone())
  }, [from[0], from[1], from[2], to[0], to[1], to[2], height])
  const ca = useMemo(() => new THREE.Color(MOCHI[colors[0]].shade), [colors[0]])
  const cb = useMemo(() => new THREE.Color(MOCHI[colors[1]].shade), [colors[1]])
  if (!dotGeo) dotGeo = new THREE.SphereGeometry(1, 14, 10)
  if (!dotMat) dotMat = new THREE.MeshStandardMaterial({ roughness: 0.3 })

  const done = useRef(false)
  useViewFrame((state) => {
    const mesh = ref.current
    if (!mesh || (reduced && done.current)) return
    const t = reduced ? 0 : state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const u = (((t * speed + i / count) % 1) + 1) % 1
      curve.getPoint(u, _p)
      _dummy.position.copy(_p)
      _dummy.rotation.set(0, 0, 0)
      _dummy.scale.setScalar(Math.max(0.0001, size * Math.pow(Math.sin(Math.PI * u), 0.7)))
      _dummy.updateMatrix()
      mesh.setMatrixAt(i, _dummy.matrix)
      mesh.setColorAt(i, _c.copy(ca).lerp(cb, u))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    done.current = true
  })

  return <instancedMesh key={count} ref={ref} args={[dotGeo, dotMat, count]} frustumCulled={false} raycast={noRaycast} />
}
