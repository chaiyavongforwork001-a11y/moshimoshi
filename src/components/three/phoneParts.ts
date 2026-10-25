import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MOCHI } from '@/lib/colors'
import { col, CREAM, INK } from './palette'
import { getClay, smoothSeams } from './props'

/*
 * Toy phone v2 parts. Origin at the centre of the base (it sits on y = 0),
 * ~2.1 wide and ~1.75 tall to the top of the handset, front +z.
 */
export const BODY = { hx: 1.02, hy: 0.54, hz: 0.76 }
export const BODY_Y = 0.54
export const DIAL_POS = new THREE.Vector3(0, 0.68, 0.66)
export const DIAL_TILT = 0.62
export const HANDSET_REST = new THREE.Vector3(0, 1.2, -0.2)
export const CORD_A = new THREE.Vector3(-1.0, 0.42, 0.25)
export const CORD_B = new THREE.Vector3(-0.86, 1.08, -0.2)
export const HOLES = 10

/** a soft rounded-box blob: a sphere pushed toward a superellipsoid */
function blob(hx: number, hy: number, hz: number, e: number, segW = 64, segH = 40) {
  const g = new THREE.SphereGeometry(1, segW, segH)
  const p = g.attributes.position
  const f = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), e)
  for (let i = 0; i < p.count; i++) {
    let X = f(p.getX(i)) * hx
    let Y = f(p.getY(i)) * hy
    const Z = f(p.getZ(i)) * hz
    // flatter, settled base; the upper front leans back toward the dial
    if (Y < 0) Y *= 0.82
    else Y -= Math.max(0, Z / hz) * 0.34 * (Y / hy)
    // a hint of a waist so it reads as a squishy toy
    X *= 1 - 0.035 * Math.exp(-(((Y / hy) - 0.1) ** 2) * 6)
    p.setXYZ(i, X, Y, Z)
  }
  return smoothSeams(g)
}

function coiledCord() {
  const base = new THREE.CatmullRomCurve3(
    [
      CORD_B.clone(),
      new THREE.Vector3(-1.08, 0.98, -0.1),
      new THREE.Vector3(-1.38, 0.78, 0.1),
      new THREE.Vector3(-1.46, 0.52, 0.32),
      new THREE.Vector3(-1.28, 0.38, 0.42),
      CORD_A.clone(),
    ].map((v) => v.sub(CORD_A)),
  )
  const N = 480
  const frames = base.computeFrenetFrames(N, false)
  const pts: THREE.Vector3[] = []
  const turns = 15
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const p = base.getPointAt(u)
    const rad = 0.06 * Math.min(1, u * 14, (1 - u) * 14)
    const a = u * turns * Math.PI * 2
    p.addScaledVector(frames.normals[i], Math.cos(a) * rad).addScaledVector(frames.binormals[i], Math.sin(a) * rad)
    pts.push(p)
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.round(N * 1.3), 0.026, 7)
}

type Geo = Record<string, THREE.BufferGeometry>
let geo: Geo | null = null

export function getPhoneGeo(): Geo {
  if (geo) return geo
  // motion arcs ")" around the handset
  const arc = new THREE.TorusGeometry(1, 0.05, 6, 24, 1.0).rotateZ(-0.5)
  const handle = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.74, -0.02, 0),
      new THREE.Vector3(-0.4, 0.14, 0),
      new THREE.Vector3(0, 0.18, 0),
      new THREE.Vector3(0.4, 0.14, 0),
      new THREE.Vector3(0.74, -0.02, 0),
    ]),
    48,
    0.135,
    18,
  )
  const endL = new THREE.SphereGeometry(1, 32, 22).scale(0.31, 0.2, 0.3).translate(-0.76, -0.04, 0)
  const endR = endL.clone().translate(1.52, 0, 0)
  const handset = mergeGeometries([handle, endL, endR])
  ;[handle, endL, endR].forEach((g) => g.dispose())

  const foot = new THREE.SphereGeometry(1, 16, 10).scale(0.16, 0.08, 0.16)
  geo = {
    body: blob(BODY.hx, BODY.hy, BODY.hz, 0.62),
    plate: new THREE.CylinderGeometry(0.47, 0.5, 0.12, 64),
    wheel: new THREE.CylinderGeometry(0.41, 0.42, 0.06, 64),
    button: new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.07, 0.045, 0.07),
    cap: new THREE.CylinderGeometry(0.17, 0.18, 0.06, 40),
    face: new THREE.CircleGeometry(0.165, 40).rotateX(-Math.PI / 2),
    stop: new THREE.CapsuleGeometry(0.03, 0.12, 4, 10).rotateX(Math.PI / 2),
    cradle: new THREE.SphereGeometry(1, 20, 14).scale(0.15, 0.16, 0.2),
    handset,
    cord: coiledCord(),
    foot,
    arc,
  }
  return geo
}

const candyMats = new Map<string, { body: THREE.MeshPhysicalMaterial; cord: THREE.MeshPhysicalMaterial }>()
/** glossy candy plastic in the phone's colour (+ a slightly deeper cord) */
export function getCandy(hex: string) {
  let m = candyMats.get(hex)
  if (!m) {
    const c = new THREE.Color(hex)
    m = {
      body: new THREE.MeshPhysicalMaterial({
        color: c,
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        sheen: 0.6,
        sheenColor: new THREE.Color('#FFE9E2'),
        sheenRoughness: 0.4,
      }),
      cord: new THREE.MeshPhysicalMaterial({ color: c.clone().multiplyScalar(0.88), roughness: 0.38, clearcoat: 0.7 }),
    }
    candyMats.set(hex, m)
  }
  return m
}

// ------------------------------------------------------------------ dial face
type FaceKind = 'calm' | 'ring'
const faceTex = new Map<FaceKind, THREE.CanvasTexture>()

/** the little face on the dial cap (canvas, no downloads) */
function getFaceTexture(kind: FaceKind) {
  let t = faceTex.get(kind)
  if (t) return t
  const S = 256
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = MOCHI.butter.light
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2)
  ctx.fill()
  // blush
  for (const x of [0.22, 0.78]) {
    const g = ctx.createRadialGradient(S * x, S * 0.6, 0, S * x, S * 0.6, S * 0.15)
    g.addColorStop(0, 'rgba(255,128,158,0.75)')
    g.addColorStop(1, 'rgba(255,128,158,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
  }
  ctx.strokeStyle = INK
  ctx.fillStyle = INK
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = S * 0.05
  if (kind === 'calm') {
    for (const x of [0.34, 0.66]) {
      ctx.beginPath()
      ctx.ellipse(S * x, S * 0.46, S * 0.062, S * 0.075, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(S * (x - 0.018), S * 0.43, S * 0.022, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = INK
    }
    ctx.beginPath()
    ctx.arc(S * 0.5, S * 0.58, S * 0.07, Math.PI * 0.15, Math.PI * 0.85)
    ctx.stroke()
  } else {
    // > <  and a big open smile
    for (const s of [-1, 1]) {
      const x = S * (0.5 + s * 0.17)
      ctx.beginPath()
      ctx.moveTo(x + s * 0.06 * S, S * 0.39)
      ctx.lineTo(x - s * 0.05 * S, S * 0.45)
      ctx.lineTo(x + s * 0.06 * S, S * 0.51)
      ctx.stroke()
    }
    ctx.fillStyle = '#6A2E2C'
    ctx.beginPath()
    ctx.arc(S * 0.5, S * 0.58, S * 0.1, 0, Math.PI)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#FF8E9E'
    ctx.beginPath()
    ctx.ellipse(S * 0.5, S * 0.65, S * 0.055, S * 0.03, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  faceTex.set(kind, t)
  return t
}

let parts: Record<string, THREE.Material> | null = null
export function getPhoneParts() {
  if (!parts) {
    parts = {
      plate: getClay(CREAM, '#FFFFFF'),
      wheel: new THREE.MeshPhysicalMaterial({ color: col('#FFFDF9'), roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 }),
      button: new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
      cap: new THREE.MeshPhysicalMaterial({ color: col(MOCHI.butter.base), roughness: 0.3, clearcoat: 1 }),
      faceCalm: new THREE.MeshBasicMaterial({ map: getFaceTexture('calm'), transparent: true, toneMapped: false }),
      faceRing: new THREE.MeshBasicMaterial({ map: getFaceTexture('ring'), transparent: true, toneMapped: false }),
      stop: new THREE.MeshPhysicalMaterial({ color: col(MOCHI.lavender.shade), roughness: 0.3, clearcoat: 1 }),
      foot: getClay(CREAM, '#FFFFFF'),
    }
  }
  return parts
}

/** pastel finger-hole buttons, one colour each */
export const HOLE_COLORS = [
  MOCHI.peach.shade,
  MOCHI.butter.shade,
  MOCHI.mint.shade,
  MOCHI.sky.shade,
  MOCHI.lavender.shade,
  MOCHI.pink.shade,
  MOCHI.peach.shade,
  MOCHI.butter.shade,
  MOCHI.mint.shade,
  MOCHI.sky.shade,
]
