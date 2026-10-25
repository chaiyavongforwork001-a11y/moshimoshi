import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/*
 * Mochi v2 body: a lathe of a soft daifuku profile — a rounded crown, gently
 * sagging lower sides (widest ~20% up, like a mochi settling) and a flat-ish
 * base. Body space: centred on the origin, BODY_W wide, BODY_H tall, front +z.
 * The same dense profile places the face, arms, feet and accessories exactly
 * on the surface.
 */
export const BODY_W = 1.9
export const BODY_H = 1.6
/** y of the flat base (put the shadow / ground here) */
export const MOCHI_FOOT = -BODY_H / 2
/** y of the top of the crown */
export const MOCHI_TOP = BODY_H / 2

// (radius, y) from the base centre up to the crown
const CTRL: [number, number][] = [
  [0, -0.8],
  [0.5, -0.8],
  [0.77, -0.776],
  [0.905, -0.7],
  [0.95, -0.56],
  [0.948, -0.4],
  [0.926, -0.18],
  // full superellipse crown: round shoulders, a soft dome (never a gumdrop point)
  [0.93, 0.06],
  [0.885, 0.3],
  [0.8, 0.48],
  [0.66, 0.63],
  [0.47, 0.73],
  [0.25, 0.785],
  [0, 0.8],
]

export interface ProfileSample {
  r: number
  y: number
  /** outward profile normal (radial, vertical) */
  nr: number
  ny: number
  /** arc length from the base centre */
  s: number
}

const N_DENSE = 600

function buildProfile() {
  const pts = CTRL.map(([r, y]) => new THREE.Vector3(r, y, 0))
  const a = CTRL[1]
  const b = CTRL[CTRL.length - 2]
  // ghosts mirrored across the axis keep the base and crown tangents horizontal
  const curve = new THREE.CatmullRomCurve3(
    [new THREE.Vector3(-a[0], a[1], 0), ...pts, new THREE.Vector3(-b[0], b[1], 0)],
    false,
    'centripetal',
  )
  const seg = pts.length + 1
  const t0 = 1 / seg
  const t1 = (seg - 1) / seg
  const M = 3000
  const raw: THREE.Vector3[] = []
  for (let i = 0; i <= M; i++) raw.push(curve.getPoint(t0 + (t1 - t0) * (i / M)))
  const cum = [0]
  for (let i = 1; i <= M; i++) cum.push(cum[i - 1] + raw[i].distanceTo(raw[i - 1]))
  const total = cum[M]
  const out: ProfileSample[] = []
  let j = 0
  for (let i = 0; i <= N_DENSE; i++) {
    const target = (i / N_DENSE) * total
    while (j < M - 1 && cum[j + 1] < target) j++
    const f = (target - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j])
    const r = raw[j].x + (raw[j + 1].x - raw[j].x) * f
    const y = raw[j].y + (raw[j + 1].y - raw[j].y) * f
    out.push({ r: Math.max(0, r), y: Math.min(MOCHI_TOP, Math.max(MOCHI_FOOT, y)), nr: 0, ny: 0, s: target })
  }
  out[0].r = 0
  out[N_DENSE].r = 0
  // y must never decrease bottom → top (binary search below relies on it)
  for (let i = 1; i <= N_DENSE; i++) out[i].y = Math.max(out[i].y, out[i - 1].y)
  for (let i = 0; i <= N_DENSE; i++) {
    const p = out[Math.max(0, i - 1)]
    const q = out[Math.min(N_DENSE, i + 1)]
    const tr = q.r - p.r
    const ty = q.y - p.y
    const l = Math.hypot(tr, ty) || 1
    out[i].nr = ty / l
    out[i].ny = -tr / l
  }
  out[0].nr = 0
  out[0].ny = -1
  out[N_DENSE].nr = 0
  out[N_DENSE].ny = 1
  return { samples: out, total }
}

const PROFILE = buildProfile()
/** total arc length of the profile */
export const PROFILE_LEN = PROFILE.total

function lerpSample(i: number, f: number): ProfileSample {
  const a = PROFILE.samples[i]
  const b = PROFILE.samples[Math.min(N_DENSE, i + 1)]
  const nr = a.nr + (b.nr - a.nr) * f
  const ny = a.ny + (b.ny - a.ny) * f
  const l = Math.hypot(nr, ny) || 1
  return { r: a.r + (b.r - a.r) * f, y: a.y + (b.y - a.y) * f, nr: nr / l, ny: ny / l, s: a.s + (b.s - a.s) * f }
}

/** profile at a fraction (0 = base centre, 1 = crown) of its arc length */
export function profileAt(u: number): ProfileSample {
  const x = Math.min(1, Math.max(0, u)) * N_DENSE
  const i = Math.min(N_DENSE - 1, Math.floor(x))
  return lerpSample(i, x - i)
}

/** profile at height y on the side of the body (above the flat base) */
export function profileAtY(y: number): ProfileSample {
  const s = PROFILE.samples
  let lo = 0
  let hi = N_DENSE
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (s[mid].y <= y) lo = mid
    else hi = mid
  }
  const dy = s[hi].y - s[lo].y
  return lerpSample(lo, dy > 1e-9 ? (y - s[lo].y) / dy : 0)
}

// ------------------------------------------------------------------ anchors
export interface Anchor {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  normal: THREE.Vector3
}

function anchorFrom(p: ProfileSample, phi: number, lift: number): Anchor {
  const sp = Math.sin(phi)
  const cp = Math.cos(phi)
  const normal = new THREE.Vector3(p.nr * sp, p.ny, p.nr * cp).normalize()
  const position = new THREE.Vector3(p.r * sp, p.y, p.r * cp).addScaledVector(normal, lift)
  // x runs around the body, y up along the surface, z = outward normal (no roll)
  const xAxis = new THREE.Vector3(cp, 0, -sp)
  const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize()
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, normal))
  return { position, quaternion, normal }
}

/** a frame on the surface at azimuth `phi` (0 = front, + = right) and height `y` */
export function anchorAt(phi: number, y: number, lift = 0): Anchor {
  return anchorFrom(profileAtY(y), phi, lift)
}

/** same, by arc-length fraction `u` (handy near the crown) */
export function anchorAtU(phi: number, u: number, lift = 0): Anchor {
  return anchorFrom(profileAt(u), phi, lift)
}

/** v1 compatibility: (ux, uy) of a unit-sphere direction facing +z */
export function surfaceAnchor(ux: number, uy: number, lift = 0): Anchor {
  const uz = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy))
  return anchorAt(Math.atan2(ux, uz), uy * MOCHI_TOP, lift)
}

/*
 * Face layout in "face space": u = arc length around the body (right +),
 * v = arc length up the profile, 0 at the eye line. Kawaii proportions:
 * eye centres ~42% up, ~40% of the width apart, each ~16% of the width.
 */
export const EYE_Y = MOCHI_FOOT + 0.42 * BODY_H
export const FACE_LAYOUT = {
  eyeU: 0.355,
  eyeRX: 0.165,
  eyeRY: 0.19,
  mouthV: -0.118,
  blushU: 0.56,
  blushV: -0.13,
}
const eyePhi = FACE_LAYOUT.eyeU / profileAtY(EYE_Y).r

export const FACE = {
  eyeL: anchorAt(-eyePhi, EYE_Y),
  eyeR: anchorAt(eyePhi, EYE_Y),
  mouth: anchorAt(0, EYE_Y + FACE_LAYOUT.mouthV),
  cheekL: anchorAt(-0.68, EYE_Y + FACE_LAYOUT.blushV),
  cheekR: anchorAt(0.68, EYE_Y + FACE_LAYOUT.blushV),
}

/** arm shoulders: low on the sides, slightly forward */
export const ARM_Y = MOCHI_FOOT + 0.33 * BODY_H
export const ARM_PHI = 1.3

// ------------------------------------------------------------------ geometry
type GeoCache = {
  body: THREE.LatheGeometry
  face: THREE.BufferGeometry
  arm: THREE.BufferGeometry
  feet: THREE.BufferGeometry
}
export type MochiDetail = 'high' | 'low'
const geos: Partial<Record<MochiDetail, GeoCache>> = {}
// lathe profile steps, lathe sides, face patch columns, face patch rows
const RES: Record<MochiDetail, [number, number, number, number]> = { high: [88, 100, 44, 40], low: [56, 60, 30, 26] }

function buildFacePatch(NX: number, NY: number) {
  const sEye = profileAtY(EYE_Y).s
  const lo = profileAtY(-0.66)
  const hi = profileAtY(0.24)
  const PH = 1.22
  const eps = 0.006
  const pos = new Float32Array((NX + 1) * (NY + 1) * 3)
  const uv = new Float32Array((NX + 1) * (NY + 1) * 2)
  let k = 0
  for (let j = 0; j <= NY; j++) {
    const s = lo.s + ((hi.s - lo.s) * j) / NY
    const p = profileAt(s / PROFILE_LEN)
    for (let i = 0; i <= NX; i++) {
      const phi = -PH + (2 * PH * i) / NX
      const sp = Math.sin(phi)
      const cp = Math.cos(phi)
      pos[k * 3] = (p.r + p.nr * eps) * sp
      pos[k * 3 + 1] = p.y + p.ny * eps
      pos[k * 3 + 2] = (p.r + p.nr * eps) * cp
      uv[k * 2] = p.r * phi
      uv[k * 2 + 1] = s - sEye
      k++
    }
  }
  const idx: number[] = []
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i
      const b = a + 1
      const c = a + NX + 1
      const d = c + 1
      idx.push(a, b, c, b, d, c)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.2, 0.5), 1.6)
  return g
}

/** shared per detail level; 'low' (~40% of the triangles) suits small or distant mochi */
export function getMochiGeometry(detail: MochiDetail = 'high'): GeoCache {
  const hit = geos[detail]
  if (hit) return hit
  const [N, SIDES, FX, FY] = RES[detail]
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= N; i++) {
    const p = profileAt(i / N)
    pts.push(new THREE.Vector2(p.r, p.y))
  }
  // seam at the back so it never crosses the face
  const body = new THREE.LatheGeometry(pts, SIDES, Math.PI, Math.PI * 2)
  body.deleteAttribute('uv')
  // jelly deformation can stretch well beyond the rest shape
  body.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.9)

  // stubby arm nub, pivot at the shoulder, pointing +x
  const arm = new THREE.SphereGeometry(1, 20, 14).scale(0.155, 0.125, 0.12).translate(0.085, 0, 0)

  // tiny feet peeking out under the belly
  const footPhi = 0.4
  const fp = profileAtY(MOCHI_FOOT + 0.07)
  const foot = (side: number) =>
    new THREE.SphereGeometry(1, 18, 10)
      .scale(0.165, 0.085, 0.13)
      .rotateY(side * footPhi)
      .translate(side * Math.sin(footPhi) * (fp.r - 0.02), MOCHI_FOOT + 0.07, Math.cos(footPhi) * (fp.r - 0.02))
  const fl = foot(-1)
  const fr = foot(1)
  const feet = mergeGeometries([fl, fr])
  fl.dispose()
  fr.dispose()

  const out = { body, face: buildFacePatch(FX, FY), arm, feet }
  geos[detail] = out
  return out
}

/** tiny deterministic PRNG so every seed gets its own rhythm */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
