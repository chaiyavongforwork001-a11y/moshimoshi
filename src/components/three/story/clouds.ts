import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MOCHI } from '@/lib/colors'
import type { MochiColor } from '@/lib/types'

/*
 * Puffy cloud shapes built from overlapping spheres (the creases between
 * puffs read as soft cloud lobes). Colour is baked per vertex: a light top,
 * the pastel on the sides and a deeper underside, so one shared velvet
 * material covers every cloud and island.
 */
type Puff = [x: number, y: number, z: number, rx: number, ry: number, rz: number]

/** tiny deterministic PRNG */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function puffs(list: Puff[], seg = 28) {
  const parts = list.map(([x, y, z, rx, ry, rz]) => {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.6))
    g.deleteAttribute('uv')
    g.scale(rx, ry, rz).translate(x, y, z)
    return g
  })
  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  return merged
}

/** island / floor platform, radius ~1, flat-ish cushion top at y = PLATFORM_TOP */
export const PLATFORM_TOP = 0.22
function platformShape() {
  const rnd = rng(17)
  const list: Puff[] = [[0, -0.08, 0, 1, 0.3, 0.88]]
  const rim = 10
  for (let i = 0; i < rim; i++) {
    const a = (i / rim) * Math.PI * 2 + 0.2
    const r = 0.3 + rnd() * 0.07
    list.push([Math.cos(a) * 0.86, -0.13 + rnd() * 0.04, Math.sin(a) * 0.74, r, r * 0.85, r])
  }
  list.push([0.38, -0.34, 0.2, 0.5, 0.36, 0.46], [-0.4, -0.33, -0.12, 0.48, 0.34, 0.44], [0.05, -0.32, -0.42, 0.44, 0.3, 0.4])
  list.push([-0.12, -0.5, 0.12, 0.38, 0.26, 0.34])
  return puffs(list, 24)
}

/** the guide's little cloud, top (where it stands) at y = NIMBUS_TOP */
export const NIMBUS_TOP = 0.34
function nimbusShape() {
  const list: Puff[] = [[0, 0, 0, 0.95, 0.36, 0.78]]
  const n = 7
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4
    const r = i % 2 ? 0.34 : 0.4
    list.push([Math.cos(a) * 0.78, -0.06, Math.sin(a) * 0.62, r, r * 0.9, r])
  }
  // two puffs behind like a little seat back
  list.push([-0.42, 0.16, -0.42, 0.36, 0.32, 0.32], [0.38, 0.12, -0.46, 0.32, 0.3, 0.3])
  return puffs(list, 24)
}

/** a free-floating sky cloud (background) */
function skyCloudShape(seed: number) {
  const rnd = rng(seed)
  const list: Puff[] = [[0, 0, 0, 1.6, 0.55, 0.9]]
  const n = 5 + Math.floor(rnd() * 2)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * 2.6
    const r = 0.55 + Math.sin((i / (n - 1)) * Math.PI) * 0.45 + rnd() * 0.15
    list.push([x, 0.15 + r * 0.35, (rnd() - 0.5) * 0.4, r, r * 0.9, r * 0.85])
  }
  return puffs(list, 14)
}

const shapes = new Map<string, THREE.BufferGeometry>()
function shape(key: string, make: () => THREE.BufferGeometry) {
  let g = shapes.get(key)
  if (!g) {
    g = make()
    g.computeBoundingBox()
    shapes.set(key, g)
  }
  return g
}

const tinted = new Map<string, THREE.BufferGeometry>()
/** a cloud shape with baked vertex colours (light top → base → deeper underside) */
function tint(key: string, base: THREE.BufferGeometry, light: string, mid: string, under: string) {
  const id = `${key}|${light}|${mid}|${under}`
  let g = tinted.get(id)
  if (g) return g
  const pos = base.attributes.position
  const box = base.boundingBox!
  const cl = new THREE.Color(light)
  const cm = new THREE.Color(mid)
  const cu = new THREE.Color(under)
  const c = new THREE.Color()
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - box.min.y) / (box.max.y - box.min.y)
    if (t > 0.55) c.copy(cm).lerp(cl, Math.min(1, (t - 0.55) / 0.35))
    else c.copy(cu).lerp(cm, Math.pow(t / 0.55, 0.8))
    colors.set([c.r, c.g, c.b], i * 3)
  }
  g = new THREE.BufferGeometry()
  g.setIndex(base.index)
  g.setAttribute('position', pos)
  g.setAttribute('normal', base.attributes.normal)
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.boundingBox = box
  g.computeBoundingSphere()
  tinted.set(id, g)
  return g
}

const _h = new THREE.Color()
/** desaturate a CSS colour by `k` (aerial perspective for far sets) */
function haze(color: string, k: number) {
  _h.set(color)
  const l = _h.r * 0.299 + _h.g * 0.587 + _h.b * 0.114
  _h.setRGB(_h.r + (l - _h.r) * k, _h.g + (l - _h.g) * k, _h.b + (l - _h.b) * k).lerp(new THREE.Color('#FFF3EC'), k * 0.35)
  return `#${_h.getHexString()}`
}

/** pastel island / floor platform; `far` desaturates it by that much */
export function getPlatform(color: MochiColor | 'cloud', far = 0) {
  const base = shape('platform', platformShape)
  if (color === 'cloud') return tint('platform', base, '#FFFFFF', '#FFF6F0', '#F6DCD2')
  const p = MOCHI[color]
  if (far > 0) return tint('platform', base, haze(p.light, far), haze(p.base, far), haze(p.shade, far))
  return tint('platform', base, p.light, p.base, p.shade)
}

export function getNimbus() {
  return tint('nimbus', shape('nimbus', nimbusShape), '#FFFFFF', '#FFF5EF', '#FFD9CB')
}

export function getSkyCloud(variant: number) {
  return shape(`sky${variant}`, () => skyCloudShape(31 + variant * 17))
}

let velvet: THREE.MeshPhysicalMaterial | null = null
/** soft velvet for every cloud / island (colour comes from the vertices) */
export function getVelvet() {
  if (!velvet) {
    velvet = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.78,
      sheen: 0.7,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color('#FFFFFF'),
    })
  }
  return velvet
}
