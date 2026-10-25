import { type ThreeElements, type ThreeEvent } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { MochiColor } from '@/lib/types'
import { createJellyMaterial, getJellyPart, makeJellyUniforms } from './jelly'
import { MochiAccessoryParts, type MochiAccessory } from './MochiAccessories'
import { createFaceMaterial, type MochiExpression, type MochiFaceExpression } from './MochiFace'
import { anchorAt, ARM_PHI, ARM_Y, BODY_H, getMochiGeometry, MOCHI_FOOT, MOCHI_TOP, type MochiDetail } from './mochiGeometry'
import { createRig, poke, stepBody, stepFace, type RigInput } from './mochiRig'
import { MochiVariantParts, VARIANT_BY_COLOR, type MochiVariant } from './MochiVariants'
import { pointerTarget, readViewPointer, soft, viewMemo } from './pointer'
import { getFlatPlane, makeShadowMaterial, noRaycast } from './props'
import { useViewElement } from './viewElement'
import { useViewFrame } from './viewActive'

export type { MochiAccessory, MochiDetail, MochiExpression, MochiFaceExpression, MochiVariant }

export type MochiProps = ThreeElements['group'] & {
  color?: MochiColor
  expression?: MochiFaceExpression
  /** eyes + body lean toward the pointer / touch */
  lookAtPointer?: boolean
  /** idle hops */
  bounce?: boolean
  /** squash, jelly wobble and a happy hop when tapped */
  squishOnTap?: boolean
  onTap?: () => void
  accessory?: MochiAccessory
  /** stagger idle animations between several mochi */
  seed?: number
  /** soft blob shadow under the base (default true) */
  shadow?: boolean
  /** override the accessory colour (CSS colour) */
  accessoryColor?: string
  /**
   * top-of-head personality: 'auto' (default) gives each colour its own
   * detail when there is no accessory; 'plain' shows none
   */
  variant?: MochiVariant
  /** grab & pull to stretch it (mouse only; touch keeps tap-to-squish so pages always scroll) */
  draggable?: boolean
  /** wave hello now and then */
  wave?: boolean
  /** "ω" mouth instead of the small smile */
  omega?: boolean
  /** tiny stubby arms (default true) */
  arms?: boolean
  /** tiny feet peeking out under the belly (default true) */
  feet?: boolean
  /** mesh density: 'low' for small or distant mochi in busy scenes (default 'high') */
  detail?: MochiDetail
}

const SHADOW_W = 1.95
const SHADOW_D = 1.5
const SHADOW_A = 0.4
const ARM = anchorAt(ARM_PHI, ARM_Y, -0.05).position
const ARM_H = (ARM_Y - MOCHI_FOOT) / BODY_H
const ARM_YAW = ARM_PHI - Math.PI / 2
const { damp } = THREE.MathUtils

let hitGeo: THREE.SphereGeometry | null = null
const hitGeometry = () => (hitGeo ??= new THREE.SphereGeometry(1, 20, 14).scale(1.04, 0.84, 1))

const _v = new THREE.Vector3()
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _cam = new THREE.Vector3()
const _fwd = new THREE.Vector3()
const _m = new THREE.Matrix4()
const _ray = new THREE.Ray()
const _plane = new THREE.Plane()

/**
 * น้องโมชิ v2 — the squishy jelly-mochi mascot. Big glossy eyes, blush,
 * stubby arms, per-colour top details; breathes, blinks, hops, wobbles like
 * jelly when tapped or pulled. All motion runs in useFrame on refs.
 */
export function Mochi({
  color = 'peach',
  expression = 'smile',
  lookAtPointer = false,
  bounce = false,
  squishOnTap = false,
  onTap,
  accessory = 'none',
  seed = 0,
  shadow = true,
  accessoryColor,
  variant = 'auto',
  draggable = false,
  wave = false,
  omega,
  arms = true,
  feet = true,
  detail = 'high',
  children,
  ...group
}: MochiProps) {
  const reduced = useReducedMotion() ?? false
  const viewEl = useViewElement()
  const hopRef = useRef<THREE.Group>(null)
  const squashRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const topRef = useRef<THREE.Group>(null)
  const swayRef = useRef<THREE.Group>(null)
  const armLRef = useRef<THREE.Group>(null)
  const armRRef = useRef<THREE.Group>(null)
  const armLInner = useRef<THREE.Group>(null)
  const armRInner = useRef<THREE.Group>(null)
  const shadowRef = useRef<THREE.Mesh>(null)
  const g = getMochiGeometry(detail)

  const mats = useMemo(() => {
    const jelly = makeJellyUniforms()
    return { jelly, body: createJellyMaterial(color, jelly), face: createFaceMaterial(color, jelly) }
  }, [color])
  // cream reads weakly on cream pages: a touch more shadow under it
  const shadowA = color === 'cream' ? SHADOW_A + 0.05 : SHADOW_A
  const shadowMat = useMemo(() => (shadow ? makeShadowMaterial(shadowA) : null), [shadow, shadowA])
  useEffect(
    () => () => {
      mats.body.dispose()
      mats.face.dispose()
    },
    [mats],
  )
  useEffect(() => () => shadowMat?.dispose(), [shadowMat])

  const st = useMemo(() => ({ ...createRig(seed), mem: viewMemo(), ptr: { x: 0, y: 0 } }), [seed])
  const resolvedVariant = variant === 'auto' ? (accessory === 'none' ? VARIANT_BY_COLOR[color] : 'plain') : variant
  const input = useMemo<RigInput>(() => ({ reduced, bounce, expression, wave, omega: false }), [])
  const live = useRef({ lookAtPointer, squishOnTap, draggable, onTap, viewEl })
  useEffect(() => {
    live.current = { lookAtPointer, squishOnTap, draggable, onTap, viewEl }
    input.reduced = reduced
    input.bounce = bounce
    input.expression = expression
    input.wave = wave
    input.omega = omega ?? resolvedVariant === 'cat'
  })

  // drag listeners live on window; make sure they never outlive the mochi
  const endDrag = useRef<(() => void) | null>(null)
  useEffect(
    () => () => {
      endDrag.current?.()
      if (st.hovered && viewEl) viewEl.style.cursor = ''
    },
    [st, viewEl],
  )

  useViewFrame((state, delta) => {
    const hop = hopRef.current
    const sq = squashRef.current
    if (!hop || !sq) return
    const L = live.current
    const dt = Math.min(delta, 1 / 20)
    const r = input.reduced

    // --- drag: pull the crown toward the pointer (in body space)
    if (st.dragging && bodyRef.current) {
      readViewPointer(state.size, st.mem, st.ptr, L.viewEl)
      const cam = state.camera
      _cam.setFromMatrixPosition(cam.matrixWorld)
      _a.set(st.ptr.x, st.ptr.y, 0.5).unproject(cam).sub(_cam).normalize()
      _ray.set(_cam, _a)
      cam.getWorldDirection(_fwd)
      _plane.setFromNormalAndCoplanarPoint(_fwd, st.grab)
      if (_ray.intersectPlane(_plane, _v)) {
        _m.copy(bodyRef.current.matrixWorld).invert()
        _a.copy(_v).applyMatrix4(_m)
        _b.copy(st.grab).applyMatrix4(_m)
        st.leanT.subVectors(_a, _b).multiplyScalar(0.85)
      }
    }

    stepBody(st, dt, input)

    // --- squash & stretch (pivot at the base) + hover puff
    const breathe = r ? 0 : Math.sin(st.t * (input.expression === 'sleepy' ? 1.1 : 1.8) + st.ph) * (input.expression === 'sleepy' ? 0.03 : 0.02)
    const s = THREE.MathUtils.clamp(st.s + breathe, -0.36, 0.24)
    const hoverOn = st.hovered && pointerTarget() === L.viewEl
    st.hover = damp(st.hover, hoverOn ? 1 : 0, 10, dt)
    const hs = 1 + st.hover * 0.04
    const sxz = 1 - s * 0.5
    sq.scale.set(sxz * hs, (1 + s) * hs, sxz * hs)
    hop.position.y = st.y

    // --- gaze: body turns + leans toward the pointer, eyes lead
    let yawT = 0
    let pitchT = 0
    let exT = 0
    let eyT = 0
    if (L.lookAtPointer) {
      const att = readViewPointer(state.size, st.mem, st.ptr, L.viewEl)
      st.att = damp(st.att, att, 3, dt)
      _v.setFromMatrixPosition(hop.matrixWorld).project(state.camera)
      const aspect = state.size.width / Math.max(1, state.size.height)
      const dx = (st.ptr.x - _v.x) * aspect
      const dy = st.ptr.y - _v.y
      yawT = soft(dx * 0.55, 0.55) * st.att
      pitchT = soft(-dy * 0.45, 0.24) * st.att
      exT = soft(dx * 0.07, 0.042) * st.att
      eyT = soft(dy * 0.06, 0.03) * st.att
      if (!st.dragging) st.leanT.set(soft(dx * 0.05, 0.07) * st.att, 0, 0)
    } else {
      st.att = 0
      if (!st.dragging) st.leanT.set(0, 0, 0)
    }
    if (!r) {
      const w = 1 - st.att
      yawT += (Math.sin(st.t * 0.37 + st.ph) * 0.12 + Math.sin(st.t * 0.13 + st.ph * 2) * 0.06) * w
      exT += Math.sin(st.t * 0.53 + st.ph) * 0.014 * w
    }
    st.yaw = damp(st.yaw, yawT, 4, dt)
    st.pitch = damp(st.pitch, pitchT, 4, dt)
    st.ex = damp(st.ex, exT, 9, dt)
    st.ey = damp(st.ey, eyT, 9, dt)
    const doze = input.expression === 'sleepy' && !r ? Math.sin(st.t * 0.9 + st.ph) * 0.035 : 0
    sq.rotation.set(st.pitch, st.yaw, -st.yaw * 0.15 + doze, 'YXZ')

    stepFace(st, dt, input, mats.face.uniforms)
    mats.jelly.uLean.value.copy(st.lean)
    mats.jelly.uJiggle.value = st.jig

    // --- parts ride the jelly: the crown carries the top details, arms follow at shoulder height
    const top = topRef.current
    if (top) {
      top.position.set(st.lean.x, MOCHI_TOP + st.lean.y, st.lean.z)
      top.rotation.set(Math.atan((2 * st.lean.z) / BODY_H), 0, -Math.atan((2 * st.lean.x) / BODY_H))
      const k = 1 - st.jig * 0.5 - Math.max(st.lean.y, 0) * 0.32
      top.scale.set(k, 1, k)
    }
    const sway = swayRef.current
    if (sway) sway.rotation.z = (r ? 0 : Math.sin(st.t * 2 + st.ph) * 0.06) + THREE.MathUtils.clamp(-st.leanV.x * 0.16 - st.sv * 0.03, -0.45, 0.45)
    const rad = 1 + st.jig * (0.5 - ARM_H) - Math.max(st.lean.y, 0) * 0.32 * ARM_H
    const lx = st.lean.x * ARM_H * ARM_H
    const lz = st.lean.z * ARM_H * ARM_H
    const ly = st.lean.y * ARM_H
    armRRef.current?.position.set(ARM.x * rad + lx, ARM.y + ly, ARM.z * rad + lz)
    armLRef.current?.position.set(-ARM.x * rad + lx, ARM.y + ly, ARM.z * rad + lz)
    if (armRInner.current) armRInner.current.rotation.z = st.armR
    if (armLInner.current) armLInner.current.rotation.z = st.armL

    // --- blob shadow shrinks and fades as the mochi leaves the ground
    const sh = shadowRef.current
    if (sh && shadowMat) {
      const lift = Math.min(1, st.y / 0.35)
      const k = (1 - lift * 0.35) * sxz * hs * (1 + st.jig * 0.4)
      sh.scale.set(SHADOW_W * k, 1, SHADOW_D * k)
      shadowMat.opacity = shadowA * (1 - lift * 0.55)
    }
  })

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (st.dragMoved > 6) return
      const L = live.current
      if (L.squishOnTap) {
        poke(st, input.reduced ? 0.3 : 1)
        if (!input.reduced) st.tapHopAt = st.t + 0.12
        st.joyT = st.t + 0.95
      }
      L.onTap?.()
    },
    [st, input],
  )

  const handleDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const L = live.current
      st.dragMoved = 0
      if (!L.draggable || input.reduced || e.pointerType !== 'mouse' || e.button !== 0) return
      e.stopPropagation()
      e.nativeEvent.preventDefault()
      st.dragging = true
      st.dragX = e.nativeEvent.clientX
      st.dragY = e.nativeEvent.clientY
      st.grab.copy(e.point)
      if (L.viewEl) L.viewEl.style.cursor = 'grabbing'
      const move = (ev: PointerEvent) => {
        st.dragMoved = Math.max(st.dragMoved, Math.hypot(ev.clientX - st.dragX, ev.clientY - st.dragY))
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
        window.removeEventListener('blur', up)
        endDrag.current = null
        if (!st.dragging) return
        st.dragging = false
        st.leanT.set(0, 0, 0)
        // let go: the stretch snaps back into a big jelly wobble
        st.jigV -= Math.hypot(st.lean.x, st.lean.y, st.lean.z) * 5
        st.sv += st.lean.y * 3
        st.joyT = st.t + 1
        const el = live.current.viewEl
        if (el) el.style.cursor = st.hovered ? 'grab' : ''
      }
      window.addEventListener('pointermove', move, { passive: true })
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
      window.addEventListener('blur', up)
      endDrag.current = up
    },
    [st, input],
  )

  const handleOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      st.hovered = true
      const el = live.current.viewEl
      if (el && !st.dragging) el.style.cursor = live.current.draggable && e.pointerType === 'mouse' ? 'grab' : 'pointer'
    },
    [st],
  )
  const handleOut = useCallback(() => {
    st.hovered = false
    const el = live.current.viewEl
    if (el && !st.dragging) el.style.cursor = ''
  }, [st])

  const interactive = squishOnTap || !!onTap || draggable
  const armMat = getJellyPart(color, ARM_H)

  return (
    <group {...group}>
      {shadowMat && (
        <mesh
          ref={shadowRef}
          geometry={getFlatPlane()}
          material={shadowMat}
          position={[0, MOCHI_FOOT + 0.004, 0]}
          scale={[SHADOW_W, 1, SHADOW_D]}
          renderOrder={-1}
          raycast={noRaycast}
        />
      )}
      <group ref={hopRef}>
        <group ref={squashRef} position={[0, MOCHI_FOOT, 0]}>
          <group ref={bodyRef} position={[0, -MOCHI_FOOT, 0]}>
            <mesh geometry={g.body} material={mats.body} raycast={noRaycast} />
            <mesh geometry={g.face} material={mats.face} renderOrder={1} raycast={noRaycast} />
            {feet && <mesh geometry={g.feet} material={getJellyPart(color, 0.04)} raycast={noRaycast} />}
            {arms && (
              <>
                <group ref={armRRef} position={ARM} rotation={[0, ARM_YAW, 0]}>
                  <group ref={armRInner} rotation={[0, 0, -0.5]}>
                    <mesh geometry={g.arm} material={armMat} raycast={noRaycast} />
                  </group>
                </group>
                <group ref={armLRef} position={[-ARM.x, ARM.y, ARM.z]} rotation={[0, -ARM_YAW, 0]} scale={[-1, 1, 1]}>
                  <group ref={armLInner} rotation={[0, 0, -0.5]}>
                    <mesh geometry={g.arm} material={armMat} raycast={noRaycast} />
                  </group>
                </group>
              </>
            )}
            <group ref={topRef} position={[0, MOCHI_TOP, 0]}>
              <group position={[0, -MOCHI_TOP, 0]}>
                {resolvedVariant !== 'plain' && <MochiVariantParts variant={resolvedVariant} body={color} swayRef={swayRef} />}
                <MochiAccessoryParts
                  kind={accessory}
                  body={color}
                  color={accessoryColor}
                  swayRef={resolvedVariant === 'plain' ? swayRef : undefined}
                />
              </group>
            </group>
            {interactive && (
              <mesh
                geometry={hitGeometry()}
                visible={false}
                onClick={handleClick}
                onPointerDown={handleDown}
                onPointerOver={handleOver}
                onPointerOut={handleOut}
              />
            )}
          </group>
        </group>
      </group>
      {/* children (e.g. a SpeechBubble) follow the mochi but not its hops */}
      {children}
    </group>
  )
}
