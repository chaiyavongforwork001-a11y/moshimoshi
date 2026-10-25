import * as THREE from 'three'
import { EXPRESSIONS, EYE, MOUTH, type FaceUniforms, type MochiFaceExpression } from './MochiFace'
import { mulberry32 } from './mochiGeometry'

/*
 * Mochi motion, kept free of React: one state object per mochi, stepped in
 * useFrame. Springs are sub-stepped (stable at any frame rate) and nothing
 * here allocates per frame.
 */
const { damp, clamp } = THREE.MathUtils
const TAU = Math.PI * 2
const MAX_LEAN = 0.68

export function createRig(seed: number) {
  const rnd = mulberry32(seed * 7919 + 101)
  const t = rnd() * 100
  return {
    rnd,
    t,
    ph: rnd() * TAU,
    // squash (+ = tall) and hop
    s: 0,
    sv: 0,
    y: 0,
    vy: 0,
    airborne: false,
    hopT: -1,
    chain: 0,
    nextHop: t + 0.8 + rnd() * 3,
    tapHopAt: -1,
    // jelly: lean = crown displacement (xz) + stretch (y); jig = base↔crown bulge
    lean: new THREE.Vector3(),
    leanV: new THREE.Vector3(),
    leanT: new THREE.Vector3(),
    jig: 0,
    jigV: 0,
    // arms (rotation about the shoulder, + = up)
    armL: -0.5,
    armLV: 0,
    armR: -0.5,
    armRV: 0,
    // face
    blinkT: -1,
    nextBlink: t + 0.5 + rnd() * 3,
    joyT: -1,
    joy: 0,
    eyeScale: 1,
    wiggleT: -1,
    nextWiggle: t + 5 + rnd() * 7,
    // gaze
    yaw: 0,
    pitch: 0,
    ex: 0,
    ey: 0,
    att: 0,
    hovered: false,
    hover: 0,
    // drag
    dragging: false,
    dragMoved: 0,
    dragX: 0,
    dragY: 0,
    grab: new THREE.Vector3(),
  }
}
export type Rig = ReturnType<typeof createRig>

export interface RigInput {
  reduced: boolean
  bounce: boolean
  expression: MochiFaceExpression
  wave: boolean
  omega: boolean
}

function launch(st: Rig, v: number) {
  st.airborne = true
  st.vy = v
  st.sv += 2.1
  st.jigV -= 1.6
}

/** a jelly poke: squash + wobble in a random direction */
export function poke(st: Rig, strength = 1) {
  st.sv -= 6.5 * strength
  st.jigV += 3.4 * strength
  const a = st.rnd() * TAU
  st.leanV.x += Math.cos(a) * 1.4 * strength
  st.leanV.z += Math.sin(a) * 0.8 * strength
}

/** hops, squash & stretch and the soft-body springs */
export function stepBody(st: Rig, dt: number, I: RigInput) {
  const r = I.reduced
  st.t += dt
  const t = st.t

  // hops: anticipation squash → launch with stretch → land with a jelly splat
  let target = 0
  if (I.bounce && !r && !st.airborne && st.hopT < 0 && !st.dragging && t > st.nextHop) st.hopT = 0
  if (st.hopT >= 0) {
    st.hopT += dt
    if (st.hopT < 0.16) target = -0.17
    else {
      st.hopT = -1
      launch(st, st.chain ? 2.3 : 3.2)
    }
  }
  if (st.tapHopAt >= 0 && t >= st.tapHopAt) {
    st.tapHopAt = -1
    if (!st.airborne && !st.dragging) launch(st, 2.6)
  }
  if (st.airborne) {
    st.vy -= 24 * dt
    st.y += st.vy * dt
    target = st.vy > 0 ? 0.08 : 0.02
    if (st.y <= 0) {
      st.y = 0
      st.airborne = false
      const impact = Math.abs(st.vy)
      st.sv -= 2.4 + impact * 0.25
      st.jigV += 1.5 + impact * 0.55
      st.leanV.x += (st.rnd() - 0.5) * 1.2
      if (I.bounce && st.chain === 0 && st.rnd() < 0.3) {
        st.chain = 1
        st.nextHop = t + 0.16
      } else {
        st.chain = 0
        st.nextHop = t + 2.6 + st.rnd() * 3.8
      }
    }
  }

  // now and then a happy little side-to-side wiggle
  if (!r && !st.dragging && !st.airborne && st.wiggleT < 0 && t > st.nextWiggle) st.wiggleT = 0
  if (st.wiggleT >= 0) {
    const prev = st.wiggleT
    st.wiggleT += dt
    if (prev < 0.001) st.leanV.x += 1.5
    if (prev < 0.22 && st.wiggleT >= 0.22) st.leanV.x -= 2.4
    if (prev < 0.44 && st.wiggleT >= 0.44) st.leanV.x += 1.8
    if (st.wiggleT > 1.2) {
      st.wiggleT = -1
      st.nextWiggle = t + 7 + st.rnd() * 9
    }
  }

  const kL = st.dragging ? 420 : 260
  const cL = st.dragging ? 36 : 6.2
  let rem = dt
  while (rem > 1e-6) {
    const h = Math.min(rem, 1 / 120)
    st.sv += (210 * (target - st.s) - 10 * st.sv) * h
    st.s += st.sv * h
    st.leanV.x += (kL * (st.leanT.x - st.lean.x) - cL * st.leanV.x) * h
    st.leanV.y += (kL * 1.3 * (st.leanT.y - st.lean.y) - cL * 1.2 * st.leanV.y) * h
    st.leanV.z += (kL * (st.leanT.z - st.lean.z) - cL * st.leanV.z) * h
    st.lean.addScaledVector(st.leanV, h)
    st.jigV += (440 * -st.jig - 8 * st.jigV) * h
    st.jig += st.jigV * h
    rem -= h
  }
  const len = Math.hypot(st.lean.x, st.lean.z)
  if (len > MAX_LEAN) {
    st.lean.x *= MAX_LEAN / len
    st.lean.z *= MAX_LEAN / len
  }
  st.lean.y = clamp(st.lean.y, -0.3, 0.62)
  st.jig = clamp(st.jig, -0.22, 0.22)

  // arms: idle sway, float up mid-air, flap when happy, wave when greeted
  const happy = t < st.joyT || st.wiggleT >= 0 || I.expression === 'happy' || I.expression === 'sparkle'
  const sway = r ? 0 : Math.sin(t * 1.7 + st.ph) * 0.09
  let tL = -0.48 + sway
  let tR = -0.48 - sway
  if (!r) {
    if (st.airborne) {
      tL += 0.55
      tR += 0.55
    }
    if (st.dragging) {
      tL = 0.85 + Math.sin(t * 15) * 0.3
      tR = 0.85 - Math.sin(t * 15) * 0.3
    } else if (happy) {
      const flap = Math.sin(t * 10 + st.ph) * 0.18
      tL = 0.5 + flap
      tR = 0.5 - flap
    }
    // `wave`: says hello now and then (about every 7 s)
    const greeting = I.wave && (t + st.ph) % 7 < 1.7
    if ((st.hovered || greeting) && !st.dragging) tR = 1.15 + Math.sin(t * 12) * 0.38
  }
  rem = dt
  while (rem > 1e-6) {
    const h = Math.min(rem, 1 / 120)
    st.armLV += (190 * (tL - st.armL) - 13 * st.armLV) * h
    st.armL += st.armLV * h
    st.armRV += (190 * (tR - st.armR) - 13 * st.armRV) * h
    st.armR += st.armRV * h
    rem -= h
  }
}

/** blinks, expressions, mouth and gaze → face shader uniforms */
export function stepFace(st: Rig, dt: number, I: RigInput, u: FaceUniforms) {
  const r = I.reduced
  const t = st.t
  const exp = EXPRESSIONS[I.expression]

  if (!r && st.blinkT < 0 && t > st.nextBlink) {
    st.blinkT = 0
    st.nextBlink = t + (st.rnd() < 0.2 ? 0.32 : 2.2 + st.rnd() * 3.6)
  }
  let open = 1
  if (st.blinkT >= 0) {
    st.blinkT += dt
    const k = st.blinkT / 0.16
    if (k >= 1) st.blinkT = -1
    else open = 1 - Math.sin(k * Math.PI) * 0.94
  }

  const joyOn = t < st.joyT
  st.joy = damp(st.joy, joyOn ? 1 : 0, 8, dt)
  let l: number = exp.l
  let rr: number = exp.r
  let mouth: number = exp.mouth
  const scale = exp.eyeScale ?? 1
  if (st.dragging) {
    l = EYE.squeeze
    rr = EYE.squeeze
    mouth = MOUTH.o
  } else if (joyOn || st.wiggleT >= 0) {
    l = EYE.happy
    rr = EYE.happy
    if (mouth !== MOUTH.talk) mouth = MOUTH.open
  }
  if (I.omega && mouth === MOUTH.smile) mouth = MOUTH.omega
  st.eyeScale = damp(st.eyeScale, scale + st.hover * 0.05, 10, dt)

  u.uEyeKind.value.set(l, rr)
  u.uOpen.value.set(l === EYE.open || l === EYE.sparkle ? open : 1, rr === EYE.open || rr === EYE.sparkle ? open : 1)
  u.uEyeScale.value = st.eyeScale
  u.uMouthKind.value = mouth
  if (mouth === MOUTH.talk) {
    u.uMouthOpen.value = r ? 0.55 : Math.max(0, Math.sin(t * 9.2 + st.ph)) * (0.55 + 0.45 * Math.sin(t * 2.3 + st.ph))
  } else if (mouth === MOUTH.small || mouth === MOUTH.o) {
    u.uMouthOpen.value = r ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.3 + st.ph)
  } else u.uMouthOpen.value = 0
  u.uBlush.value = 0.72 + st.joy * 0.24 + st.hover * 0.04
  // gaze: the dark eyes move; highlights stay fixed to the light
  u.uLook.value.set(st.ex, st.ey)
  u.uHi.value.set(clamp(-st.yaw * 0.05, -0.03, 0.03), clamp(st.pitch * 0.05, -0.02, 0.02))
}
