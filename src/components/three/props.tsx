import type { ThreeElements } from '@react-three/fiber'
import { forwardRef } from 'react'
import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { MOCHI } from '@/lib/colors'
import type { MochiColor } from '@/lib/types'
import { col, SHADOW } from './palette'
import { getSoftDot } from './textures'

// ------------------------------------------------------------------ shared geometry
/** welds the UV seam of a deformed sphere so normals are smooth everywhere */
export function smoothSeams(g: THREE.BufferGeometry) {
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  const merged = mergeVertices(g, 1e-4)
  merged.computeVertexNormals()
  g.dispose()
  return merged
}

let planeGeo: THREE.PlaneGeometry | null = null
export function getFlatPlane() {
  if (!planeGeo) {
    planeGeo = new THREE.PlaneGeometry(1, 1)
    planeGeo.rotateX(-Math.PI / 2)
  }
  return planeGeo
}

/** a fresh blob-shadow material (each shadow animates its own opacity) */
export function makeShadowMaterial(opacity = 0.34, color = SHADOW) {
  return new THREE.MeshBasicMaterial({
    map: getSoftDot(),
    color: col(color),
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
  })
}

const staticShadowMats = new Map<string, THREE.MeshBasicMaterial>()
function getStaticShadowMat(opacity: number) {
  const key = opacity.toFixed(2)
  let m = staticShadowMats.get(key)
  if (!m) {
    m = makeShadowMaterial(opacity)
    staticShadowMats.set(key, m)
  }
  return m
}

/** Soft warm shadow blob lying on the ground (cheap replacement for contact shadows). */
export const BlobShadow = forwardRef<THREE.Mesh, ThreeElements['mesh'] & { size?: [number, number]; opacity?: number }>(
  function BlobShadow({ size = [2, 1.4], opacity = 0.34, ...mesh }, ref) {
    return (
      <mesh
        ref={ref}
        geometry={getFlatPlane()}
        material={getStaticShadowMat(opacity)}
        scale={[size[0], 1, size[1]]}
        renderOrder={-1}
        raycast={noRaycast}
        {...mesh}
      />
    )
  },
)

export const noRaycast = () => null

// ------------------------------------------------------------------ clay materials
const clayMats = new Map<string, THREE.MeshPhysicalMaterial>()
/** soft velvety clay (cushions, pedestals, leaves) */
export function getClay(hex: string, sheenHex = '#FFFFFF') {
  const key = hex + sheenHex
  let m = clayMats.get(key)
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({
      color: col(hex),
      roughness: 0.6,
      sheen: 0.5,
      sheenRoughness: 0.5,
      sheenColor: col(sheenHex),
      clearcoat: 0.08,
      clearcoatRoughness: 0.5,
    })
    clayMats.set(key, m)
  }
  return m
}

// ------------------------------------------------------------------ cushion
let cushionGeo: THREE.BufferGeometry | null = null
function getCushionGeo() {
  if (!cushionGeo) {
    // squashed sphere with a flattened, slightly domed top — a floating pillow
    const g = new THREE.SphereGeometry(1, 40, 20)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i)
      const r = Math.hypot(p.getX(i), p.getZ(i))
      const ny = y > 0 ? 0.26 * Math.pow(y, 0.55) : -0.3 * Math.pow(-y, 0.8)
      const bulge = 1 + 0.06 * (1 - Math.abs(y))
      p.setXYZ(i, p.getX(i) * bulge, ny + 0.02 * r, p.getZ(i) * bulge)
    }
    cushionGeo = smoothSeams(g)
  }
  return cushionGeo
}

/** Puffy floating pillow that mochi can sit on. Its top is at y = CUSHION_TOP. */
export function PuffyCushion({ color = 'cream', ...group }: ThreeElements['group'] & { color?: MochiColor }) {
  const p = MOCHI[color]
  return (
    <group {...group}>
      <mesh geometry={getCushionGeo()} material={getClay(p.base, p.light)} scale={[1, 1, 0.82]} />
    </group>
  )
}
export const CUSHION_TOP = 0.262

// ------------------------------------------------------------------ pedestal
let pedestalGeo: THREE.LatheGeometry | null = null
function getPedestalGeo() {
  if (!pedestalGeo) {
    // rounded-edge disc: a soft "stage" for the mascot
    const R = 1.25
    const H = 0.26
    const r = 0.13
    const pts: THREE.Vector2[] = [new THREE.Vector2(0, H)]
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI / 2 - (i / 8) * (Math.PI / 2)
      pts.push(new THREE.Vector2(R - r + Math.cos(a) * r, H - r + Math.sin(a) * r))
    }
    for (let i = 0; i <= 8; i++) {
      const a = -(i / 8) * (Math.PI / 2)
      pts.push(new THREE.Vector2(R - r + Math.cos(a) * r, r + Math.sin(a) * r))
    }
    pts.push(new THREE.Vector2(0, 0))
    // lathe normals face outward when the profile runs bottom → top
    pedestalGeo = new THREE.LatheGeometry(pts.reverse(), 56)
  }
  return pedestalGeo
}

/** Round clay stage; its top surface sits at the group origin. */
export function Pedestal({ color = 'cream', ...group }: ThreeElements['group'] & { color?: MochiColor }) {
  const p = MOCHI[color]
  return (
    <group {...group}>
      <mesh geometry={getPedestalGeo()} material={getClay(p.light, p.base)} position={[0, -0.26, 0]} />
      <BlobShadow position={[0, -0.255, 0]} size={[3.3, 3.3]} opacity={0.26} />
    </group>
  )
}
