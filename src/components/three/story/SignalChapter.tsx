import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { MOCHI, SIGNAL_GRADIENT } from '@/lib/colors'
import { FloatingDeco } from '../FloatingDeco'
import { Mochi } from '../Mochi'
import { MOCHI_FOOT, MOCHI_TOP } from '../mochiGeometry'
import { noRaycast } from '../props'
import { at, bake, getCandy } from './bake'
import { Burst, Nimbus, NIMBUS_TOP } from './cast'
import { BUMP_LIFT, BUMP_REACH } from './Guide'
import { ChapterGroup } from './Jelly'
import { CAST, CENTER, GUIDE_SCALE, NIMBUS_SCALE, SIGNAL, SIGNAL_GLIDE } from './layout'
import { jellyStep, local, smooth, syncClock, useStoryCtx, type Jelly } from './timeline'
import { useViewFrame } from '../viewActive'

const FEET = NIMBUS_TOP * NIMBUS_SCALE
const BODY = (MOCHI_TOP - MOCHI_FOOT) * GUIDE_SCALE
const BAR_W = 0.2
const BAR_GAP = 0.1
const BAR_H = [0.24, 0.37, 0.5, 0.63, 0.76]
/** local progress at which bar k lights up */
const barAt = (k: number) => 0.1 + k * 0.08
const barX = (k: number) => (k - 2) * (BAR_W + BAR_GAP)

let bars: THREE.BufferGeometry[] | null = null
let ghosts: THREE.BufferGeometry | null = null
function getBars() {
  if (!bars) {
    bars = BAR_H.map((h, k) => bake([[new RoundedBoxGeometry(BAR_W, h, BAR_W, 3, 0.085), SIGNAL_GRADIENT[k], at(0, h / 2, 0)]]))
    ghosts = bake(BAR_H.map((h, k) => [new RoundedBoxGeometry(BAR_W, h, BAR_W, 3, 0.085), '#FFFFFF', at(barX(k), h / 2, -0.02)]))
  }
  return { bars, ghosts: ghosts! }
}
let ghostMat: THREE.MeshBasicMaterial | null = null
const getGhostMat = () => (ghostMat ??= new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }))

let ringGeo: THREE.BufferGeometry | null = null
const getRing = () => (ringGeo ??= new THREE.TorusGeometry(0.3, 0.035, 8, 22, 1.5).rotateZ(-0.75))
let ringMats: THREE.MeshBasicMaterial[] | null = null
const getRingMats = () =>
  (ringMats ??= [MOCHI.peach.shade, MOCHI.lavender.shade].map((c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false })))

const RINGS = 4
const _o = new THREE.Object3D()

/**
 * "สัญญาณถูกคอ": the guide (left, see Guide.tsx) and a lavender friend on
 * two clouds. Five signal bars rise one by one, sound-wave rings travel
 * between them, the clouds drift together and they hop into a jelly bump
 * with a sparkle burst. Signal is shown only as bars — never numbers.
 */
export function SignalChapter() {
  const { clock, compact, cues } = useStoryCtx()
  const sig = compact ? SIGNAL.compact : SIGNAL.wide
  const partner = useRef<THREE.Group>(null)
  const feet = useRef<THREE.Group>(null)
  const barRefs = useRef<(THREE.Mesh | null)[]>([])
  const barsGroup = useRef<THREE.Group>(null)
  const ringRefs = useRef<(THREE.InstancedMesh | null)[]>([])
  const happy = cues((s) => s.signalHappy)
  const g = getBars()
  const st = useMemo(
    () => ({ bars: BAR_H.map(() => ({ s: 0, v: 0 }) as Jelly), j: { s: 0, v: 0 } as Jelly, jx: { s: 0, v: 0 } as Jelly, prev: 0, level: 0 }),
    [],
  )

  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const dt = clock.dt
    const r = clock.reduced
    const c = local(clock, 2)
    const t = r ? 0 : clock.t
    const glide = smooth(SIGNAL_GLIDE[0], SIGNAL_GLIDE[1], c)
    const x = sig.apart - (sig.apart - sig.near) * glide
    const b = clock.beat.bump
    const arcB = r ? 0 : Math.sin(Math.PI * b)

    // partner mirrors the guide's bump hop
    const p = partner.current
    if (p) p.position.set(x - BUMP_REACH * arcB, (r ? 0 : Math.sin(t * 1.4 + 1.3) * 0.045) + BUMP_LIFT * arcB, 0)
    if (!r) {
      if (st.prev < 0.5 && b >= 0.5) st.jx.v += 5
      if (st.prev === 0 && b > 0) st.j.v += 2.2
      if (st.prev < 1 && b === 1) st.j.v -= 3.2
      jellyStep(st.j, 0, dt)
      jellyStep(st.jx, 0, dt, 260, 10)
    }
    st.prev = b
    const f = feet.current
    if (f) {
      const s = THREE.MathUtils.clamp(st.j.s, -0.3, 0.3)
      const sx = THREE.MathUtils.clamp(st.jx.s, -0.25, 0.25)
      f.scale.set(1 - s * 0.5 - sx * 0.6, 1 + s + sx * 0.5, 1 - s * 0.5)
    }

    // bars pop up one by one (jelly overshoot)
    let level = 0
    for (let k = 0; k < BAR_H.length; k++) {
      const on = c >= barAt(k) ? 1 : 0
      level += on
      const j = st.bars[k]
      if (r) j.s = on
      else jellyStep(j, on, dt, 180, 9)
      const m = barRefs.current[k]
      if (!m) continue
      const s = Math.max(1e-4, j.s)
      m.visible = j.s > 0.01
      m.scale.set(1 + (1 - Math.min(1, s)) * 0.3, s, 1 + (1 - Math.min(1, s)) * 0.3)
    }
    st.level = level
    const bg = barsGroup.current
    if (bg) {
      const full = level === BAR_H.length && !r ? Math.max(0, Math.sin(t * 3)) * 0.03 : 0
      bg.position.y = sig.bars[1] + (r ? 0 : Math.sin(t * 1.1) * 0.06)
      bg.scale.setScalar(sig.barScale * (1 + full))
    }

    // wave rings travel from each mochi toward the middle, stronger with more bars
    const strength = (0.25 + (level / BAR_H.length) * 0.75) * (1 - smooth(0.3, 0.6, b))
    const y = FEET + BODY * 0.55
    for (let side = 0; side < 2; side++) {
      const m = ringRefs.current[side]
      if (!m) continue
      const dir = side === 0 ? 1 : -1
      const x0 = -dir * (x - 0.45)
      for (let k = 0; k < RINGS; k++) {
        const u = r ? (k + 0.5) / RINGS : (((t * 0.55 + k / RINGS) % 1) + 1) % 1
        const span = Math.max(0.2, x - 0.45 - 0.15)
        _o.position.set(x0 + dir * u * span, y, 0.1)
        _o.rotation.set(0, 0, side === 0 ? 0 : Math.PI)
        const fade = Math.pow(Math.sin(Math.PI * u), 0.8)
        _o.scale.setScalar(Math.max(1e-4, (0.55 + u * 0.7) * fade * strength))
        _o.updateMatrix()
        m.setMatrixAt(k, _o.matrix)
      }
      m.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <ChapterGroup index={2} position={CENTER.signal}>
      <group ref={partner} position={[sig.apart, 0, 0]} rotation={[0, -0.55, 0]}>
        <Nimbus scale={NIMBUS_SCALE} />
        <group ref={feet} position={[0, FEET, 0]}>
          <Mochi
            color={CAST.partner.color}
            accessory={CAST.partner.accessory}
            expression={happy ? 'happy' : 'smile'}
            position={[0, -MOCHI_FOOT * GUIDE_SCALE, 0]}
            scale={GUIDE_SCALE}
            seed={51}
            lookAtPointer
            squishOnTap
            shadow={false}
          />
        </group>
      </group>
      <group ref={barsGroup} position={sig.bars} scale={sig.barScale}>
        <mesh geometry={g.ghosts} material={getGhostMat()} raycast={noRaycast} />
        {g.bars.map((geo, k) => (
          <mesh
            key={k}
            ref={(el) => {
              barRefs.current[k] = el
            }}
            geometry={geo}
            material={getCandy()}
            position={[barX(k), 0, 0]}
            visible={false}
            raycast={noRaycast}
          />
        ))}
      </group>
      {getRingMats().map((mat, side) => (
        <instancedMesh
          key={side}
          ref={(el) => {
            ringRefs.current[side] = el
          }}
          args={[getRing(), mat, RINGS]}
          frustumCulled={false}
          raycast={noRaycast}
        />
      ))}
      <Burst
        beat="bump"
        position={[0, FEET + BODY * 0.75 + BUMP_LIFT, 0.25]}
        radius={1.05}
        size={0.1}
        count={12}
        colors={[...SIGNAL_GRADIENT, MOCHI.butter.shade, '#FFFFFF']}
      />
      <FloatingDeco
        count={compact ? 10 : 16}
        area={compact ? [5, 4, 2.5] : [8, 4, 3]}
        center={[0, 0.8, -1.8]}
        avoid={[2.2, 1.2]}
        kinds={['sparkle', 'ring']}
        colors={['lavender', 'pink', 'peach', 'butter']}
        seed={21}
      />
    </ChapterGroup>
  )
}
