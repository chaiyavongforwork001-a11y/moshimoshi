import { useThree, type ThreeElements } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { tx } from '@/lib/i18n'
import { CloudBank, CloudCushion, SkyClouds } from './clouds'
import { FloatingDeco } from './FloatingDeco'
import { frameSpheres, ground, onIsland, regionFor, TALL, WIDE, type HeroFriend, type HeroLayout, type Island } from './heroLayout'
import { SoftLights, ViewCamera } from './Lights'
import { Mochi } from './Mochi'
import { noRaycast } from './props'
import { RetroPhone } from './RetroPhone'
import { SpeechBubble } from './SpeechBubble'
import { getSoftDot } from './textures'
import { useViewFrame } from './viewActive'

/*
 * Landing hero, built for a FULL-BLEED view (absolute inset-0). Moshi Sky:
 * a candy phone ringing on a cloud island, mochi friends around it chatting
 * in warm Thai bubbles, soft sky layers far behind. Layouts and framing
 * live in heroLayout.ts.
 */

function FriendMochi({ f, seed, island, timing }: { f: HeroFriend; seed: number; island: Island; timing: HeroLayout['timing'] }) {
  const inner = f.cushion ? f.scale / f.cushion.scale : f.scale
  const b = f.bubble
  const mochi = (
    <Mochi
      color={f.color}
      accessory={f.accessory}
      expression={f.expression}
      position={[0, f.cushion ? ground(inner) - 0.05 : 0, 0]}
      scale={inner}
      rotation={[0, f.rotationY ?? 0, 0]}
      seed={seed}
      bounce
      lookAtPointer
      squishOnTap
      shadow={!f.cushion}
      draggable={f.draggable}
      wave={f.wave}
      omega={f.omega}
      // small / far friends don't need the dense lathe (saves ~35k triangles)
      detail={f.cushion || f.scale <= 0.55 ? 'low' : 'high'}
    >
      {b && (
        <SpeechBubble
          position={b.at}
          text={tx(b.lines[0])}
          lines={b.lines.map(tx)}
          side={b.side}
          color={f.color}
          delay={b.delay}
          {...timing}
        />
      )}
    </Mochi>
  )
  if (f.cushion)
    return (
      <CloudCushion position={f.position} scale={f.cushion.scale} color={f.cushion.color} float seed={seed}>
        {mochi}
      </CloudCushion>
    )
  const [x, , z] = f.position
  return <group position={[x, onIsland(island, x, z) + ground(f.scale), z]}>{mochi}</group>
}

/** Slow, gentle float of the whole composition. */
function Drift({ children, ...group }: ThreeElements['group']) {
  const ref = useRef<THREE.Group>(null)
  const reduced = useReducedMotion() ?? false
  useViewFrame((state) => {
    const g = ref.current
    if (!g || reduced) return
    const t = state.clock.elapsedTime
    g.rotation.y = Math.sin(t * 0.21) * 0.03
    g.position.y = Math.sin(t * 0.5) * 0.04
  })
  return (
    <group ref={ref} {...group}>
      {children}
    </group>
  )
}

/** Far layers ride along with the camera, so the sky is composed the same at any aspect. */
function FollowCamera({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useViewFrame(({ camera }) => {
    if (ref.current) ref.current.position.set(camera.position.x, camera.position.y, 0)
  })
  return <group ref={ref}>{children}</group>
}

let glowMat: THREE.MeshBasicMaterial | null = null
let glowGeo: THREE.PlaneGeometry | null = null
/** a big warm halo behind the phone (soft light, not a post effect) */
function Glow(props: ThreeElements['mesh']) {
  glowMat ??= new THREE.MeshBasicMaterial({ map: getSoftDot(), color: '#FFF0C8', transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false })
  glowGeo ??= new THREE.PlaneGeometry(1, 1)
  return <mesh geometry={glowGeo} material={glowMat} raycast={noRaycast} {...props} />
}

// far sky clouds, [x, y, z, scale] relative to the camera
const SKY_WIDE: [number, number, number, number][] = [
  [-11, 3.7, -12, 1.2],
  [-4.5, 4.4, -12, 0.95],
  [3.5, 3.1, -11, 1.35],
  [10, 4, -12, 1.1],
  [16, 2.7, -11, 1],
]
const SKY_TALL: [number, number, number, number][] = [
  [-2.4, 5.4, -12, 0.9],
  [2.6, 4.6, -12, 1],
]

/** Landing hero: ringing toy phone + mochi friends chatting in Thai bubbles. */
export function HeroScene({ compact = false }: { compact?: boolean }) {
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const width = useThree((s) => s.size.width)
  const tall = aspect < 1.05
  const L = tall ? TALL : WIDE
  const { island, phone } = L
  const spheres = useMemo(() => frameSpheres(L), [L])
  const region = useMemo(() => regionFor(tall, compact, width), [tall, compact, width])
  const phoneY = onIsland(island, phone.x, phone.z)
  return (
    <>
      <ViewCamera frame={{ spheres, region }} y={0.9} fov={32} parallax={0.4} />
      <SoftLights />
      <FollowCamera>
        <SkyClouds clouds={tall ? SKY_TALL : SKY_WIDE} span={tall ? 10 : 36} />
      </FollowCamera>
      <CloudBank width={46} color="lavender" seed={11} detail={14} position={[-4, island.y - 0.45, -7.5]} scale={1.7} />
      <Glow position={[phone.x, L.glow.y, -3.4]} scale={L.glow.scale} />
      <CloudBank width={34} color="peach" seed={3} detail={18} position={[-4, island.y - 0.62, -0.9]} scale={1.15} />
      <Drift>
        <CloudCushion position={[island.x, island.y, island.z]} scale={island.s} color="butter" />
        <RetroPhone position={[phone.x, phoneY, phone.z]} scale={phone.scale} ringing />
        {L.friends.map((f, i) => (
          <FriendMochi key={f.color} f={f} seed={i + 1} island={island} timing={L.timing} />
        ))}
        <FloatingDeco
          count={L.deco.count}
          kinds={['sparkle', 'bubble', 'chat', 'ring']}
          area={L.deco.area}
          center={L.deco.center}
          avoid={L.deco.avoid}
        />
      </Drift>
    </>
  )
}
