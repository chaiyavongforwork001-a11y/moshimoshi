import { type ThreeElements } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { MochiColor } from '@/lib/types'
import { Mochi, type MochiExpression } from '../Mochi'
import { MOCHI_FOOT } from '../mochiGeometry'
import { noRaycast } from '../props'
import { getNimbus, getPlatform, getVelvet, NIMBUS_TOP, PLATFORM_TOP } from './clouds'
import { Hopper, type HopperProps } from './Jelly'
import type { Friend } from './layout'
import { getSparkle } from './shapes'
import { getInstCandy } from './bake'
import { syncClock, useStoryCtx, type BeatName } from './timeline'
import { useViewFrame } from '../viewActive'

/** A friend mochi standing at its feet inside a Hopper (hops, sway, jelly). */
export function FriendMochi({
  friend,
  scale,
  seed,
  expression,
  bounce = false,
  ...hop
}: Omit<HopperProps, 'children' | 'seed' | 'shadow'> & {
  friend: Friend
  scale: number
  seed: number
  expression?: MochiExpression
  bounce?: boolean
}) {
  return (
    <Hopper {...hop} seed={seed} shadow={[1.9 * scale, 1.45 * scale]}>
      <Mochi
        color={friend.color}
        accessory={friend.accessory}
        expression={expression ?? friend.expression}
        position={[0, -MOCHI_FOOT * scale, 0]}
        scale={scale}
        seed={seed}
        bounce={bounce}
        lookAtPointer
        squishOnTap
        shadow={false}
        detail="low"
      />
    </Hopper>
  )
}

/** Soft cloud platform; `top` is where things stand (local y = 0 at the top surface). */
export function Platform({
  color = 'cloud',
  size = 1,
  depth = 1,
  far = 0,
  ...group
}: ThreeElements['group'] & { color?: MochiColor | 'cloud'; size?: number; depth?: number; far?: number }) {
  return (
    <group {...group}>
      <mesh geometry={getPlatform(color, far)} material={getVelvet()} position={[0, -PLATFORM_TOP * size, 0]} scale={[size, size, size * depth]} raycast={noRaycast} />
    </group>
  )
}

/** the guide's little cloud (origin at its centre) */
export function Nimbus(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh geometry={getNimbus()} material={getVelvet()} raycast={noRaycast} />
    </group>
  )
}
export { NIMBUS_TOP }

// ------------------------------------------------------------------ sparkle burst
const _o = new THREE.Object3D()
const _c = new THREE.Color()

/**
 * Sparkles that burst out once when a beat's play head passes `fireAt`
 * (time-based, so it always completes). Skipped under reduced motion.
 */
export function Burst({
  beat,
  fireAt = 0.5,
  count = 12,
  radius = 1,
  size = 0.09,
  colors,
  ...group
}: ThreeElements['group'] & { beat: BeatName; fireAt?: number; count?: number; radius?: number; size?: number; colors: string[] }) {
  const { clock } = useStoryCtx()
  const ref = useRef<THREE.InstancedMesh>(null)
  const st = useMemo(() => ({ prev: 0, t0: -99 }), [])
  const dirs = useMemo(() => {
    const out: THREE.Vector3[] = []
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (i % 2) * 0.3
      const up = 0.35 + ((i * 37) % 10) / 14
      out.push(new THREE.Vector3(Math.cos(a), up, Math.sin(a) * 0.6).normalize().multiplyScalar(0.7 + ((i * 53) % 7) / 10))
    }
    return out
  }, [count])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    for (let i = 0; i < count; i++) m.setColorAt(i, _c.set(colors[i % colors.length]))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [colors, count])

  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const m = ref.current
    if (!m) return
    const b = clock.beat[beat]
    if (!clock.reduced && st.prev < fireAt && b >= fireAt) st.t0 = clock.t
    st.prev = b
    const u = (clock.t - st.t0) / 1.1
    m.visible = u >= 0 && u < 1
    if (!m.visible) return
    const out = 1 - Math.pow(1 - u, 3)
    for (let i = 0; i < count; i++) {
      const d = dirs[i]
      _o.position.set(d.x * radius * out, d.y * radius * out - u * u * 0.25 * radius, d.z * radius * out)
      _o.rotation.set(0, 0, i + u * 4 * (i % 2 ? 1 : -1))
      _o.scale.setScalar(Math.max(1e-4, size * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (0.75 + (i % 3) * 0.2)))
      _o.updateMatrix()
      m.setMatrixAt(i, _o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <group {...group}>
      <instancedMesh ref={ref} args={[getSparkle(), getInstCandy(), count]} frustumCulled={false} visible={false} raycast={noRaycast} />
    </group>
  )
}
