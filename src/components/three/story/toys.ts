import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { MOCHI } from '@/lib/colors'
import { CORAL, CREAM, INK_SOFT } from '../palette'
import { at, bake, hazed, inside, type Part } from './bake'
import type { RoomKind } from './layout'

/*
 * Tiny room dioramas for the floating islands. Built for an island of
 * radius 1 with its floor at y = 0, front facing +z. Props sit toward the
 * back corners so the mochi who hops in can land front-centre.
 */
const box = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2))
const cyl = (rt: number, rb: number, h: number, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg)
const ball = (r: number, seg = 18) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7))
const torus = (r: number, t: number, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 8, 24, arc)
const INK = '#4A3530'
const WHITE = '#FFFFFF'

function cupParts(m: THREE.Matrix4, body: string, band: string, drink: string): Part[] {
  return [
    [cyl(0.17, 0.15, 0.025, 28), CREAM, inside(m, at(0, 0.012, 0))],
    [cyl(0.105, 0.08, 0.17, 24), body, inside(m, at(0, 0.11, 0))],
    [torus(0.103, 0.012), band, inside(m, at(0, 0.15, 0, Math.PI / 2))],
    [cyl(0.094, 0.094, 0.01, 24), drink, inside(m, at(0, 0.19, 0))],
    [torus(0.05, 0.016, Math.PI * 1.3), body, inside(m, at(0.105, 0.11, 0, 0, 0, -Math.PI * 0.65))],
  ]
}

function game(): Part[] {
  const tv = at(0.46, 0.06, -0.3, 0, -0.4, 0)
  const pad = at(-0.46, 0.12, -0.08, 0.55, 0.45, 0)
  return [
    // retro TV
    [box(0.5, 0.4, 0.36, 0.09), CREAM, inside(tv, at(0, 0.24, 0))],
    [box(0.36, 0.27, 0.04, 0.05), MOCHI.sky.base, inside(tv, at(-0.04, 0.25, 0.17))],
    [ball(0.035), CORAL, inside(tv, at(0.18, 0.3, 0.18))],
    [ball(0.035), MOCHI.mint.shade, inside(tv, at(0.18, 0.19, 0.18))],
    [box(0.07, 0.07, 0.02, 0.01), WHITE, inside(tv, at(-0.08, 0.27, 0.195))],
    [box(0.05, 0.05, 0.02, 0.01), MOCHI.butter.shade, inside(tv, at(0.02, 0.22, 0.195))],
    [cyl(0.012, 0.012, 0.26, 8), INK_SOFT, inside(tv, at(-0.06, 0.53, 0, 0, 0, 0.45))],
    [cyl(0.012, 0.012, 0.26, 8), INK_SOFT, inside(tv, at(0.06, 0.53, 0, 0, 0, -0.45))],
    [ball(0.03), CORAL, inside(tv, at(-0.115, 0.645, 0))],
    [ball(0.03), MOCHI.butter.shade, inside(tv, at(0.115, 0.645, 0))],
    [cyl(0.03, 0.04, 0.06, 10), INK_SOFT, inside(tv, at(-0.16, 0.03, 0))],
    [cyl(0.03, 0.04, 0.06, 10), INK_SOFT, inside(tv, at(0.16, 0.03, 0))],
    // game controller, propped toward the viewer
    [box(0.4, 0.11, 0.2, 0.055), CORAL, pad],
    [ball(0.12), CORAL, inside(pad, at(-0.2, -0.005, 0.06, 0, 0, 0, [1, 0.55, 1.05]))],
    [ball(0.12), CORAL, inside(pad, at(0.2, -0.005, 0.06, 0, 0, 0, [1, 0.55, 1.05]))],
    [box(0.13, 0.03, 0.04, 0.012), CREAM, inside(pad, at(-0.13, 0.06, 0.01))],
    [box(0.04, 0.03, 0.13, 0.012), CREAM, inside(pad, at(-0.13, 0.06, 0.01))],
    [ball(0.026), MOCHI.butter.shade, inside(pad, at(0.13, 0.06, -0.035))],
    [ball(0.026), MOCHI.mint.shade, inside(pad, at(0.17, 0.06, 0.005))],
    [ball(0.026), MOCHI.sky.shade, inside(pad, at(0.09, 0.06, 0.005))],
    [ball(0.026), MOCHI.lavender.shade, inside(pad, at(0.13, 0.06, 0.045))],
  ]
}

function anime(): Part[] {
  const book = at(-0.42, 0.13, -0.12, 0.85, 0.4, 0)
  const stack = at(0.46, 0, -0.28, 0, -0.3, 0)
  const parts: Part[] = []
  for (const sx of [-1, 1]) {
    parts.push([box(0.3, 0.025, 0.42, 0.012), MOCHI.lavender.shade, inside(book, at(sx * 0.15, 0, 0, 0, 0, -sx * 0.16))])
    parts.push([box(0.27, 0.04, 0.39, 0.015), '#FFFDF8', inside(book, at(sx * 0.145, 0.028, 0, 0, 0, -sx * 0.16))])
  }
  // manga panels
  parts.push([box(0.2, 0.01, 0.13, 0.004), '#E6D9D3', inside(book, at(-0.15, 0.06, -0.09, 0, 0, 0.16))])
  parts.push([box(0.09, 0.01, 0.14, 0.004), '#E6D9D3', inside(book, at(-0.2, 0.065, 0.09, 0, 0, 0.16))])
  parts.push([box(0.09, 0.01, 0.14, 0.004), MOCHI.pink.base, inside(book, at(-0.09, 0.07, 0.09, 0, 0, 0.16))])
  parts.push([box(0.2, 0.01, 0.3, 0.004), '#E6D9D3', inside(book, at(0.15, 0.06, 0, 0, 0, -0.16))])
  parts.push([ball(0.045), MOCHI.butter.shade, inside(book, at(0.15, 0.08, -0.02, 0, 0, 0, [1, 0.3, 1]))])
  // closed books
  parts.push([box(0.36, 0.08, 0.26, 0.02), MOCHI.sky.shade, inside(stack, at(0, 0.04, 0))])
  parts.push([box(0.33, 0.06, 0.23, 0.01), '#FFFDF8', inside(stack, at(0.02, 0.04, 0))])
  parts.push([box(0.32, 0.075, 0.24, 0.02), MOCHI.butter.shade, inside(stack, at(0.01, 0.115, 0, 0, 0.35, 0))])
  parts.push([box(0.29, 0.055, 0.21, 0.01), '#FFFDF8', inside(stack, at(0.025, 0.115, 0, 0, 0.35, 0))])
  parts.push([box(0.27, 0.07, 0.2, 0.02), MOCHI.pink.shade, inside(stack, at(0, 0.185, 0, 0, -0.2, 0))])
  return parts
}

function work(): Part[] {
  const lap = at(-0.44, 0.02, -0.2, 0, 0.45, 0)
  const lid = inside(lap, at(0, 0.02, -0.16, -0.3, 0, 0))
  return [
    [box(0.52, 0.035, 0.34, 0.015), CREAM, lap],
    [box(0.44, 0.01, 0.16, 0.004), MOCHI.cream.shade, inside(lap, at(0, 0.02, -0.04))],
    [box(0.13, 0.01, 0.07, 0.004), MOCHI.cream.shade, inside(lap, at(0, 0.02, 0.11))],
    [box(0.52, 0.34, 0.03, 0.015), CREAM, inside(lid, at(0, 0.17, 0))],
    [box(0.45, 0.27, 0.01, 0.006), MOCHI.sky.light, inside(lid, at(0, 0.18, 0.016))],
    [box(0.2, 0.035, 0.01, 0.012), CORAL, inside(lid, at(-0.06, 0.25, 0.022))],
    [box(0.28, 0.03, 0.01, 0.012), MOCHI.mint.shade, inside(lid, at(0, 0.18, 0.022))],
    [box(0.16, 0.03, 0.01, 0.012), MOCHI.lavender.base, inside(lid, at(-0.06, 0.12, 0.022))],
    [ball(0.04), MOCHI.butter.shade, inside(lid, at(0.15, 0.25, 0.02, 0, 0, 0, [1, 1, 0.3]))],
    [ball(0.05), CORAL, inside(lid, at(0.1, 0.2, -0.018, 0, 0, 0, [1, 1, 0.25]))],
    ...cupParts(at(0.5, 0, -0.16), WHITE, CORAL, '#B9806A'),
    // little plant
    [cyl(0.075, 0.06, 0.12, 18), CORAL, at(0.06, 0.06, -0.55)],
    [ball(0.07), MOCHI.mint.shade, at(0.03, 0.19, -0.55, 0, 0, 0.4, [0.7, 1.2, 0.7])],
    [ball(0.07), MOCHI.mint.shade, at(0.11, 0.18, -0.55, 0, 0, -0.5, [0.7, 1.1, 0.7])],
    [ball(0.06), '#5CC79F', at(0.065, 0.24, -0.53, 0, 0, 0, [0.7, 1.15, 0.7])],
  ]
}

function music(): Part[] {
  const vinyl = at(-0.44, 0.25, -0.26, Math.PI / 2 - 0.25, 0, 0.35)
  const tape = at(-0.5, 0.03, 0.18, 0, 0.6, 0)
  return [
    [cyl(0.24, 0.24, 0.02, 48), INK, vinyl],
    [torus(0.17, 0.004), '#6A5450', inside(vinyl, at(0, 0.011, 0, Math.PI / 2))],
    [torus(0.12, 0.004), '#6A5450', inside(vinyl, at(0, 0.011, 0, Math.PI / 2))],
    [cyl(0.075, 0.075, 0.024, 28), CORAL, vinyl],
    [cyl(0.012, 0.012, 0.03, 8), CREAM, vinyl],
    [box(0.3, 0.05, 0.19, 0.02), MOCHI.sky.shade, tape],
    [box(0.22, 0.012, 0.08, 0.005), CREAM, inside(tape, at(0, 0.027, -0.03))],
    [cyl(0.03, 0.03, 0.014, 16), INK_SOFT, inside(tape, at(-0.06, 0.03, 0.035))],
    [cyl(0.03, 0.03, 0.014, 16), INK_SOFT, inside(tape, at(0.06, 0.03, 0.035))],
  ]
}

function corner(): Part[] {
  const lamp = at(-0.46, 0, -0.26)
  const pot = at(0.48, 0, -0.24, 0, -0.5, 0)
  return [
    [cyl(0.12, 0.14, 0.04, 28), CREAM, inside(lamp, at(0, 0.02, 0))],
    [cyl(0.018, 0.018, 0.4, 10), MOCHI.butter.shade, inside(lamp, at(0, 0.22, 0))],
    [cyl(0.11, 0.21, 0.2, 32), '#FFF8DC', inside(lamp, at(0, 0.48, 0))],
    [torus(0.21, 0.012), MOCHI.butter.shade, inside(lamp, at(0, 0.38, 0, Math.PI / 2))],
    // teapot
    [ball(0.14, 24), MOCHI.lavender.light, inside(pot, at(0, 0.13, 0, 0, 0, 0, [1, 0.82, 1]))],
    [torus(0.1, 0.012), MOCHI.lavender.shade, inside(pot, at(0, 0.13, 0, Math.PI / 2, 0, 0, [1.25, 1.25, 1]))],
    [cyl(0.06, 0.07, 0.03, 18), MOCHI.lavender.shade, inside(pot, at(0, 0.245, 0))],
    [ball(0.028), MOCHI.lavender.shade, inside(pot, at(0, 0.275, 0))],
    [cyl(0.02, 0.035, 0.16, 10), MOCHI.lavender.light, inside(pot, at(0.15, 0.17, 0, 0, 0, -0.85))],
    [torus(0.06, 0.016, Math.PI * 1.2), MOCHI.lavender.shade, inside(pot, at(-0.13, 0.14, 0, 0, 0, Math.PI * 0.4))],
    ...cupParts(at(0.18, 0, 0.12), MOCHI.mint.light, MOCHI.mint.shade, '#D79A6A'),
  ]
}

const BUILD: Record<RoomKind, () => Part[]> = { game, anime, work, music, corner }
const dioramas = new Map<string, THREE.BufferGeometry>()
/** how much the far (secondary) rooms are desaturated */
export const FAR_HAZE = 0.3
export function getDiorama(kind: RoomKind, far = false): THREE.BufferGeometry {
  const key = far ? `${kind}:far` : kind
  let g = dioramas.get(key)
  if (!g) {
    g = far ? hazed(getDiorama(kind), FAR_HAZE) : bake(BUILD[kind]())
    dioramas.set(key, g)
  }
  return g
}

let speaker: THREE.BufferGeometry | null = null
/** mini speaker (separate so it can pulse to the beat); origin at its base */
export function getSpeaker() {
  if (!speaker) {
    speaker = bake([
      [box(0.34, 0.46, 0.28, 0.08), CORAL, at(0, 0.24, 0)],
      [cyl(0.11, 0.11, 0.02, 32), INK_SOFT, at(0, 0.18, 0.141, Math.PI / 2)],
      [ball(0.06), CREAM, at(0, 0.18, 0.15, 0, 0, 0, [1, 1, 0.45])],
      [cyl(0.05, 0.05, 0.02, 24), INK_SOFT, at(0, 0.37, 0.141, Math.PI / 2)],
      [ball(0.025), MOCHI.butter.shade, at(0, 0.37, 0.152)],
    ])
  }
  return speaker
}
