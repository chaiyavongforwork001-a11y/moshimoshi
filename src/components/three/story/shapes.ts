import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { getSoftDot } from '../textures'

/*
 * Small shared shapes for animated deco (instanced): puffy stars, a crescent
 * moon, music notes, steam wisps and burst sparkles. All built once.
 */
const puffy = (shape: THREE.Shape, depth: number, bevel: number) =>
  new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 3,
    curveSegments: 10,
  }).center()

const cache = new Map<string, THREE.BufferGeometry>()
function once(key: string, make: () => THREE.BufferGeometry) {
  let g = cache.get(key)
  if (!g) {
    g = make()
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k)
    g.computeBoundingSphere()
    cache.set(key, g)
  }
  return g
}

/** five-point star with rounded tips, radius ~1 */
export const getStar = () =>
  once('star', () => {
    const s = new THREE.Shape()
    const pts = 5
    for (let i = 0; i <= pts * 2; i++) {
      const a = Math.PI / 2 + (i / (pts * 2)) * Math.PI * 2
      const r = i % 2 ? 0.48 : 1
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (i === 0) s.moveTo(x, y)
      else {
        const pa = Math.PI / 2 + ((i - 0.5) / (pts * 2)) * Math.PI * 2
        s.quadraticCurveTo(Math.cos(pa) * 0.7, Math.sin(pa) * 0.7, x, y)
      }
    }
    return puffy(s, 0.22, 0.16)
  })

/** soft four-point sparkle, radius ~1 */
export const getSparkle = () =>
  once('sparkle', () => {
    const s = new THREE.Shape()
    const c = 0.16
    s.moveTo(0, 1)
    s.quadraticCurveTo(c, c, 1, 0)
    s.quadraticCurveTo(c, -c, 0, -1)
    s.quadraticCurveTo(-c, -c, -1, 0)
    s.quadraticCurveTo(-c, c, 0, 1)
    return puffy(s, 0.14, 0.12)
  })

/** puffy crescent moon, radius ~1, opening to +x */
export const getMoon = () =>
  once('moon', () => {
    const s = new THREE.Shape()
    const a0 = 1.21
    const cx = 0.55
    const rIn = Math.hypot(Math.cos(a0) - cx, Math.sin(a0))
    const b0 = Math.atan2(Math.sin(a0), Math.cos(a0) - cx)
    s.moveTo(Math.cos(a0), Math.sin(a0))
    s.absarc(0, 0, 1, a0, Math.PI * 2 - a0, false)
    s.absarc(cx, 0, rIn, Math.PI * 2 - b0, b0, true)
    return puffy(s, 0.3, 0.14)
  })

/** eighth note, ~1 tall, head at the origin */
export const getNote = () =>
  once('note', () => {
    const head = new THREE.SphereGeometry(0.26, 18, 12).scale(1.2, 0.9, 0.75).rotateZ(0.35)
    const stem = new THREE.CylinderGeometry(0.05, 0.05, 0.85, 8).translate(0.27, 0.42, 0)
    const flag = new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.27, 0.84, 0), new THREE.Vector3(0.62, 0.66, 0), new THREE.Vector3(0.5, 0.36, 0)),
      12,
      0.055,
      8,
    )
    const parts = [head, stem, flag].map((g) => {
      g.deleteAttribute('uv')
      return g.index ? g.toNonIndexed() : g
    })
    const merged = mergeGeometries(parts)
    ;[head, stem, flag, ...parts].forEach((g) => g.dispose())
    return merged
  })

/** a wavy steam wisp, ~0.3 tall, base at the origin */
export const getWisp = () =>
  once('wisp', () =>
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.035, 0.08, 0),
        new THREE.Vector3(-0.03, 0.17, 0),
        new THREE.Vector3(0.025, 0.26, 0),
        new THREE.Vector3(0, 0.32, 0),
      ]),
      20,
      0.016,
      6,
    ),
  )

let steamMat: THREE.MeshBasicMaterial | null = null
export function getSteamMaterial() {
  if (!steamMat) steamMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false })
  return steamMat
}

const glowMats = new Map<string, THREE.SpriteMaterial>()
/** warm additive glow sprite material (shared per colour + strength) */
export function getGlow(color: string, opacity: number) {
  const key = color + opacity
  let m = glowMats.get(key)
  if (!m) {
    m = new THREE.SpriteMaterial({
      map: getSoftDot(),
      color,
      opacity,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    glowMats.set(key, m)
  }
  return m
}

let poolMat: THREE.MeshBasicMaterial | null = null
/** soft warm light pool lying on a floor */
export function getPoolMaterial() {
  if (!poolMat) {
    poolMat = new THREE.MeshBasicMaterial({
      map: getSoftDot(),
      color: '#FFE2A8',
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      toneMapped: false,
    })
  }
  return poolMat
}
