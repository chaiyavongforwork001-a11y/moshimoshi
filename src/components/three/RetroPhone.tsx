import { type ThreeElements, type ThreeEvent } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { col, CORAL, resolveColor } from './palette'
import {
  BODY_Y,
  CORD_A,
  CORD_B,
  DIAL_POS,
  DIAL_TILT,
  getCandy,
  getPhoneGeo,
  getPhoneParts,
  HANDSET_REST,
  HOLE_COLORS,
  HOLES,
} from './phoneParts'
import { pointerTarget } from './pointer'
import { BlobShadow, noRaycast } from './props'
import { MOCHI } from '@/lib/colors'
import { useViewElement } from './viewElement'
import { useViewFrame } from './viewActive'

export type RetroPhoneProps = ThreeElements['group'] & {
  /** handset hops and motion arcs pulse out in "ring-ring" bursts */
  ringing?: boolean
  /** body colour: any CSS colour or a MochiColor name */
  color?: string
  onTap?: () => void
  /** soft blob shadow under the phone (default true) */
  shadow?: boolean
  /**
   * lifts the handset off its cradle toward the viewer, the curly cord
   * stretching after it: 0..1 (may overshoot for a jelly settle). A ref,
   * read every frame, so the caller can animate it without re-renders.
   */
  lift?: { readonly current: number }
  /**
   * where the lifted handset goes instead (e.g. a mochi's ear), in this
   * phone's own frame: centre, yaw and roll. Mutable, read every frame.
   */
  liftTo?: { at: THREE.Vector3; yaw: number; roll: number; scale: number }
}

const CYCLE = 3.4 // ring-ring … pause
const ARC_BIRTHS = [0, 0.16, 0.75, 0.91]
const ARC_LIFE = 0.9
const ARC_COLORS = [CORAL, MOCHI.butter.shade, MOCHI.pink.shade, MOCHI.lavender.shade]
const FEET: [number, number][] = [
  [-0.68, 0.42],
  [0.68, 0.42],
  [-0.68, -0.42],
  [0.68, -0.42],
]
const _a = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
/** where the cord meets the handset, in the handset's own frame */
const PLUG = CORD_B.clone().sub(HANDSET_REST)
const _dummy = new THREE.Object3D()
const _c = new THREE.Color()
const { damp } = THREE.MathUtils

/** Chunky candy toy phone with a smiley dial; rings in bouncy bursts. Tap for an extra ring. */
export function RetroPhone({ ringing = false, color = '#FF8E7E', onTap, shadow = true, lift, liftTo, ...group }: RetroPhoneProps) {
  const reduced = useReducedMotion() ?? false
  const viewEl = useViewElement()
  const g = getPhoneGeo()
  const parts = getPhoneParts()
  const candy = getCandy(resolveColor(color, '#FF8E7E'))

  const rootRef = useRef<THREE.Group>(null)
  const handsetRef = useRef<THREE.Group>(null)
  const wheelRef = useRef<THREE.Group>(null)
  const stretchRef = useRef<THREE.Group>(null)
  const cordRef = useRef<THREE.Group>(null)
  const faceRef = useRef<THREE.Mesh>(null)
  const buttonsRef = useRef<THREE.InstancedMesh>(null)
  const arcRefs = useRef<(THREE.Mesh | null)[]>([])
  const arcMats = useMemo(
    () => ARC_COLORS.map((c) => new THREE.MeshBasicMaterial({ color: col(c), transparent: true, opacity: 0, depthWrite: false, toneMapped: false })),
    [],
  )
  useEffect(() => () => arcMats.forEach((m) => m.dispose()), [arcMats])

  // cord stretch frame: local +y runs from the body end to the handset end
  const cordFrame = useMemo(() => {
    const axis = CORD_B.clone().sub(CORD_A)
    const len = axis.length()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize())
    return { q, qi: q.clone().invert(), len, axis }
  }, [])

  // candy buttons in the finger wheel, a gap left at the finger stop
  useLayoutEffect(() => {
    const b = buttonsRef.current
    if (!b) return
    for (let i = 0; i < HOLES; i++) {
      const a = Math.PI * 0.62 + (i / (HOLES - 1)) * Math.PI * 1.62
      _dummy.position.set(Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29)
      _dummy.updateMatrix()
      b.setMatrixAt(i, _dummy.matrix)
      b.setColorAt(i, _c.set(HOLE_COLORS[i]))
    }
    b.instanceMatrix.needsUpdate = true
    if (b.instanceColor) b.instanceColor.needsUpdate = true
    b.computeBoundingSphere()
  }, [])

  const st = useMemo(
    () => ({ t: 0, shift: 0, tapT: -99, hy: 0, hvy: 0, tilt: 0, dir: 1, s: 0, sv: 0, dial: 0, dv: 0, hovered: false, kick: 0 }),
    [],
  )
  const live = useRef({ ringing, reduced, onTap, viewEl, lift, liftTo })
  useEffect(() => {
    live.current = { ringing, reduced, onTap, viewEl, lift, liftTo }
  })

  useViewFrame((_, delta) => {
    const root = rootRef.current
    const hs = handsetRef.current
    if (!root || !hs) return
    const { ringing: on, reduced: r } = live.current
    const dt = Math.min(delta, 1 / 20)
    st.t += dt
    const t = st.t
    const sinceTap = t - st.tapT
    const active = on || sinceTap < 1.3
    const cyc = (((t - st.shift) % CYCLE) + CYCLE) % CYCLE
    const inBurst = active && !r && (cyc < 0.55 || (cyc > 0.75 && cyc < 1.3))

    // handset: little bouncy hops during each burst, tilting side to side
    if (inBurst && st.hy <= 0.001 && st.hvy <= 0) {
      st.hvy = 1.45 + (st.kick++ % 3) * 0.12
      st.dir = -st.dir
    }
    st.hvy -= 30 * dt
    st.hy += st.hvy * dt
    if (st.hy < 0) {
      st.hy = 0
      if (st.hvy < -0.6) st.sv -= 0.45 + Math.abs(st.hvy) * 0.22
      st.hvy = st.hvy < -0.9 ? -st.hvy * 0.18 : 0
    }
    st.tilt = damp(st.tilt, inBurst ? st.dir * 0.13 : 0, 12, dt)

    let rem = dt
    while (rem > 1e-6) {
      const h = Math.min(rem, 1 / 120)
      st.sv += (260 * -st.s - 10 * st.sv) * h
      st.s += st.sv * h
      st.dv += (40 * -st.dial - 5 * st.dv) * h
      st.dial += st.dv * h
      rem -= h
    }
    hs.position.set(HANDSET_REST.x, HANDSET_REST.y + st.hy, HANDSET_REST.z)
    hs.rotation.set(-st.hy * 0.5, 0, st.tilt + st.dir * st.hy * 0.5)
    hs.scale.setScalar(1)
    const hover = st.hovered && pointerTarget() === live.current.viewEl ? 0.03 : 0
    root.scale.set(1 - st.s * 0.5 + hover, 1 + st.s + hover, 1 - st.s * 0.5 + hover)
    if (wheelRef.current) wheelRef.current.rotation.y = st.dial
    if (faceRef.current) faceRef.current.material = active ? parts.faceRing : parts.faceCalm

    // the curly cord stretches along its axis when the handset jumps
    const lifted = live.current.lift?.current ?? 0
    const cord = cordRef.current
    if (stretchRef.current && cord) {
      if (Math.abs(lifted) > 1e-3) {
        const aim = live.current.liftTo
        if (aim) {
          // picked up and carried to someone's ear: stands on end, cups toward the head
          const k = Math.min(1, Math.max(0, lifted))
          hs.position.lerp(aim.at, lifted)
          hs.rotation.set(hs.rotation.x * (1 - k) + 0.12 * k, aim.yaw * lifted, hs.rotation.z * (1 - k) + aim.roll * lifted)
          // the toy handset is huge next to a mochi: it shrinks to about the holder's height
          hs.scale.setScalar(1 - (1 - aim.scale) * k)
        } else {
          // picked up: the handset rises and tips toward the viewer
          hs.position.y += 0.62 * lifted
          hs.position.z += 0.2 * lifted
          hs.rotation.x -= 0.42 * lifted
          hs.rotation.z += 0.16 * lifted
        }
        // the curly cord re-aims (and stretches) to stay plugged in
        _a.copy(PLUG).multiplyScalar(hs.scale.x).applyEuler(hs.rotation).add(hs.position).sub(CORD_A)
        const len = _a.length()
        cord.quaternion.setFromUnitVectors(_up, _a.divideScalar(len))
        stretchRef.current.scale.y = len / cordFrame.len
      } else {
        cord.quaternion.copy(cordFrame.q)
        _a.copy(CORD_B).sub(CORD_A)
        _a.y += st.hy
        stretchRef.current.scale.y = _a.dot(cordFrame.axis) / cordFrame.len
      }
    }

    // motion arcs  ( (  phone  ) )
    for (let k = 0; k < ARC_BIRTHS.length; k++) {
      const w = arcRefs.current[k]
      if (!w) continue
      const m = arcMats[k]
      if (r) {
        w.visible = on
        w.scale.setScalar(0.3 + (k % 2) * 0.14)
        m.opacity = 0.7
        continue
      }
      const age = cyc - ARC_BIRTHS[k]
      const alive = (on || sinceTap < 1.3 + ARC_LIFE) && age >= 0 && age < ARC_LIFE
      w.visible = alive
      if (!alive) continue
      const u = age / ARC_LIFE
      w.scale.setScalar(0.26 + u * 0.3)
      m.opacity = Math.pow(1 - u, 1.4) * 0.9 * Math.min(1, age / 0.06)
    }
  })

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (!live.current.reduced) {
        st.tapT = st.t
        st.shift = st.t // restart the ring cycle right now
        st.sv -= 2.6
        st.dv += 9
      }
      live.current.onTap?.()
    },
    [st],
  )
  const handleOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      st.hovered = true
      if (live.current.viewEl) live.current.viewEl.style.cursor = 'pointer'
    },
    [st],
  )
  const handleOut = useCallback(() => {
    st.hovered = false
    if (live.current.viewEl) live.current.viewEl.style.cursor = ''
  }, [st])

  return (
    <group {...group}>
      {shadow && <BlobShadow position={[0, 0.005, 0.02]} size={[3, 2.3]} opacity={0.34} />}
      <group ref={rootRef} onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut}>
        <mesh geometry={g.body} material={candy.body} position={[0, BODY_Y, 0]} />
        {FEET.map(([x, z]) => (
          <mesh key={`${x}${z}`} geometry={g.foot} material={parts.foot} position={[x, 0.08, z]} raycast={noRaycast} />
        ))}
        {/* dial on the sloped front */}
        <group position={DIAL_POS} rotation={[DIAL_TILT, 0, 0]}>
          <mesh geometry={g.plate} material={parts.plate} raycast={noRaycast} />
          <group ref={wheelRef} position={[0, 0.07, 0]}>
            <mesh geometry={g.wheel} material={parts.wheel} raycast={noRaycast} />
            <instancedMesh ref={buttonsRef} args={[g.button, parts.button, HOLES]} raycast={noRaycast} />
          </group>
          <mesh geometry={g.cap} material={parts.cap} position={[0, 0.12, 0]} raycast={noRaycast} />
          <mesh ref={faceRef} geometry={g.face} material={parts.faceCalm} position={[0, 0.152, 0]} raycast={noRaycast} />
          <mesh geometry={g.stop} material={parts.stop} position={[0.26, 0.12, 0.29]} rotation={[0, -0.75, 0]} raycast={noRaycast} />
        </group>
        {[-0.62, 0.62].map((x) => (
          <mesh key={x} geometry={g.cradle} material={candy.body} position={[x, 1.0, HANDSET_REST.z]} raycast={noRaycast} />
        ))}
        <group ref={handsetRef} position={HANDSET_REST}>
          <mesh geometry={g.handset} material={candy.body} />
        </group>
        {/* curly cord, in a frame that can stretch along body → handset */}
        <group ref={cordRef} position={CORD_A} quaternion={cordFrame.q}>
          <group ref={stretchRef}>
            <group quaternion={cordFrame.qi}>
              <mesh geometry={g.cord} material={candy.cord} raycast={noRaycast} />
            </group>
          </group>
        </group>
        {arcMats.map((m, k) => {
          const side = k % 2 === 0 ? 1 : -1
          return (
            <mesh
              key={k}
              ref={(el) => {
                arcRefs.current[k] = el
              }}
              geometry={g.arc}
              material={m}
              position={[side * 0.95, HANDSET_REST.y + 0.08, HANDSET_REST.z + 0.2]}
              rotation={[0, 0, side > 0 ? 0 : Math.PI]}
              visible={false}
              renderOrder={2}
              raycast={noRaycast}
            />
          )
        })}
      </group>
    </group>
  )
}
