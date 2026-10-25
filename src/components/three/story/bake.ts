import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/*
 * Small toy-making kit: parts (geometry + colour + transform) are baked into
 * ONE vertex-coloured geometry, so a whole diorama costs a single draw call
 * with the shared candy material.
 */
export type Part = [geometry: THREE.BufferGeometry, color: string, matrix?: THREE.Matrix4]

const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()

/** transform: position, euler rotation (XYZ), uniform or per-axis scale */
export function at(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: number | [number, number, number] = 1) {
  _p.set(x, y, z)
  _q.setFromEuler(_e.set(rx, ry, rz))
  if (typeof s === 'number') _s.setScalar(s)
  else _s.set(s[0], s[1], s[2])
  return new THREE.Matrix4().compose(_p, _q, _s)
}

/** child transform inside a parent transform */
export const inside = (parent: THREE.Matrix4, child: THREE.Matrix4) => parent.clone().multiply(child)

export function bake(parts: Part[]): THREE.BufferGeometry {
  const c = new THREE.Color()
  const gs = parts.map(([geo, color, m]) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone()
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k)
    g.clearGroups()
    if (m) g.applyMatrix4(m)
    if (!g.attributes.normal) g.computeVertexNormals()
    c.set(color)
    const n = g.attributes.position.count
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3)
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    return g
  })
  const merged = mergeGeometries(gs)
  gs.forEach((g) => g.dispose())
  new Set(parts.map((p) => p[0])).forEach((g) => g.dispose())
  merged.computeBoundingSphere()
  return merged
}

/**
 * Aerial-perspective copy of a vertex-coloured geometry (shares position /
 * normal / index): colours lose `k` of their saturation and drift a little
 * toward the warm sky haze, so far-away sets recede.
 */
export function hazed(src: THREE.BufferGeometry, k: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  if (src.index) g.setIndex(src.index)
  g.setAttribute('position', src.attributes.position)
  g.setAttribute('normal', src.attributes.normal)
  const from = src.attributes.color
  const out = new Float32Array(from.count * 3)
  const haze = new THREE.Color('#FFF3EC')
  const c = new THREE.Color()
  for (let i = 0; i < from.count; i++) {
    c.setRGB(from.getX(i), from.getY(i), from.getZ(i))
    const l = c.r * 0.299 + c.g * 0.587 + c.b * 0.114
    c.r += (l - c.r) * k
    c.g += (l - c.g) * k
    c.b += (l - c.b) * k
    c.lerp(haze, k * 0.35)
    out.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3))
  g.boundingBox = src.boundingBox
  g.boundingSphere = src.boundingSphere
  return g
}

let candy: THREE.MeshPhysicalMaterial | null = null
/** glossy candy plastic for baked toys (colour from the vertices) */
export function getCandy() {
  if (!candy) {
    candy = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.38,
      clearcoat: 0.75,
      clearcoatRoughness: 0.18,
    })
  }
  return candy
}

let instCandy: THREE.MeshPhysicalMaterial | null = null
/** candy for instanced parts (colour per instance) */
export function getInstCandy() {
  if (!instCandy) {
    instCandy = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15 })
  }
  return instCandy
}
