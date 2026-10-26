import { useThree, type ThreeElements } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import { useMemo, useRef } from 'react'
import type * as THREE from 'three'
import { t } from '@/lib/i18n'
import type { MochiColor } from '@/lib/types'
import { CloudCushion, CLOUD_SEAT } from './clouds'
import { FloatingDeco, SignalArc } from './FloatingDeco'
import { SoftLights, ViewCamera, type FrameSphere } from './Lights'
import { Mochi, type MochiAccessory, type MochiFaceExpression, type MochiVariant } from './Mochi'
import { MOCHI_FOOT } from './mochiGeometry'
import { RetroPhone } from './RetroPhone'
import { SpeechBubble } from './SpeechBubble'
import { useViewFrame } from './viewActive'

export { HeroScene } from './HeroScene'

/** y for a mochi of `scale` standing on a surface at `floor` */
const stand = (floor: number, scale: number) => floor - MOCHI_FOOT * scale

/** Slow, gentle float of a whole composition. */
function Drift({ amount = 1, children, ...group }: ThreeElements['group'] & { amount?: number }) {
  const ref = useRef<THREE.Group>(null)
  const reduced = useReducedMotion() ?? false
  useViewFrame((state) => {
    const g = ref.current
    if (!g || reduced) return
    const t = state.clock.elapsedTime
    g.rotation.y = Math.sin(t * 0.21) * 0.05 * amount
    g.position.y = Math.sin(t * 0.5) * 0.05 * amount
  })
  return (
    <group ref={ref} {...group}>
      {children}
    </group>
  )
}

/** pull frame spheres toward their common centre (zoom > 1 = closer) */
function zoomSpheres(sp: FrameSphere[], zoom: number): FrameSphere[] {
  if (zoom === 1) return sp
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y, , r] of sp) {
    x0 = Math.min(x0, x - r)
    x1 = Math.max(x1, x + r)
    y0 = Math.min(y0, y - r)
    y1 = Math.max(y1, y + r)
  }
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  return sp.map(([x, y, z, r]) => [cx + (x - cx) / zoom, cy + (y - cy) / zoom, z, r / zoom])
}

/** bounding sphere of a standing mochi of `scale` whose base is at `floor` */
const mochiSphere = (x: number, floor: number, z: number, scale: number): FrameSphere => [x, floor + 0.9 * scale, z + 0.2 * scale, 1.2 * scale]

// ------------------------------------------------------------------ single mascot
const CUSHION_S = 1.15
const CUSHION_Y = MOCHI_FOOT - CLOUD_SEAT * CUSHION_S + 0.03

/** A single mochi on a soft cloud cushion: avatars, greetings, onboarding preview. */
export function MochiStage({
  color = 'peach',
  expression = 'smile',
  accessory = 'none',
  variant = 'auto',
  interactive = true,
  zoom = 1,
  stage = true,
  deco = true,
  bubble,
  onTap,
}: {
  color?: MochiColor
  expression?: MochiFaceExpression
  accessory?: MochiAccessory
  /** top-of-head personality (default: one per colour) */
  variant?: MochiVariant
  interactive?: boolean
  zoom?: number
  /** puffy cloud cushion under the mascot (default true) */
  stage?: boolean
  /** a few floating sparkles (default true) */
  deco?: boolean
  /** optional greeting bubble; an array cycles through lines */
  bubble?: string | string[]
  onTap?: () => void
}) {
  const lines = Array.isArray(bubble) ? bubble : undefined
  const hasBubble = !!bubble
  const spheres = useMemo(() => {
    const sp: FrameSphere[] = [[0, 0.1, 0.2, 1.2]]
    if (stage) sp.push([-1.0, CUSHION_Y, 0.15, 0.5], [1.0, CUSHION_Y, 0.15, 0.5], [0, CUSHION_Y - 0.04, 0.45, 0.5])
    // headroom for the greeting bubble above the mascot
    if (hasBubble) sp.push([0.1, 1.55, 0.3, 0.42])
    return zoomSpheres(sp, zoom)
  }, [stage, hasBubble, zoom])
  const cushion = color === 'cream' ? 'butter' : color === 'lavender' ? 'sky' : 'lavender'
  return (
    <>
      <ViewCamera frame={{ spheres }} y={0.55} parallax={interactive ? 0.3 : 0} />
      <SoftLights />
      {stage && <CloudCushion position={[0, CUSHION_Y, 0]} scale={CUSHION_S} color={cushion} />}
      <Mochi
        color={color}
        expression={expression}
        accessory={accessory}
        variant={variant}
        lookAtPointer={interactive}
        bounce
        squishOnTap={interactive}
        draggable={interactive}
        onTap={onTap}
        shadow={!stage}
      >
        {bubble && (
          <SpeechBubble
            position={[0.5, 1.08, 0.3]}
            side="right"
            text={lines ? lines[0] : (bubble as string)}
            lines={lines}
            color={color}
            delay={0.5}
            interval={3800}
          />
        )}
      </Mochi>
      {deco && (
        <FloatingDeco count={10} kinds={['sparkle', 'bubble']} area={[4.4, 3, 1.5]} center={[0, 0.3, -1]} avoid={[1.4, 1.2]} size={0.8} seed={3} />
      )}
    </>
  )
}

// ------------------------------------------------------------------ crowd
type CrowdSpot = { x: number; z: number; s: number; floor: number }

/** one zig-zag row, or (squarish boxes) a front row + a raised back row */
function crowdSpots(n: number, rows: boolean, floor: number): CrowdSpot[] {
  if (!rows) {
    const gap = 1.2
    return Array.from({ length: n }, (_, i) => {
      const back = i % 2 === 1
      return { x: (i - (n - 1) / 2) * gap, z: back ? -0.55 : 0, s: back ? 0.54 : 0.58, floor }
    })
  }
  const front = Math.max(2, Math.floor(n / 2))
  const back = n - front
  return Array.from({ length: n }, (_, i) =>
    i < front
      ? { x: (i - (front - 1) / 2) * 1.1, z: 0.3, s: 0.58, floor }
      : // the back row peeks out between / beside the front pair
        { x: (i - front - (back - 1) / 2) * (back > 2 ? 1 : 2.1), z: -0.7, s: 0.54, floor: floor + 0.5 },
  )
}

const CROWD_ACCESSORIES: MochiAccessory[] = ['headset', 'none', 'none', 'cap', 'none']
const CROWD_FACES: MochiFaceExpression[] = ['smile', 'happy', 'talk', 'wink', 'smile']

/** A small crowd of mochi (rooms / community illustrations). */
export function MochiCrowd({
  colors = ['peach', 'mint', 'lavender', 'butter', 'pink'],
  accessories = CROWD_ACCESSORIES,
  expressions = CROWD_FACES,
  interactive = true,
}: {
  colors?: MochiColor[]
  accessories?: MochiAccessory[]
  expressions?: MochiFaceExpression[]
  interactive?: boolean
}) {
  const n = Math.max(1, colors.length)
  const floor = -0.62
  // squarish boxes stagger the crowd into two rows, so it fills the frame instead of a thin strip
  const aspect = useThree((st) => st.size.width / Math.max(1, st.size.height))
  const rows = aspect < 1.3 && n >= 3
  const spots = useMemo(() => crowdSpots(n, rows, floor), [n, rows])
  const spheres = useMemo(() => spots.map((p): FrameSphere => mochiSphere(p.x, p.floor, p.z, p.s)), [spots])
  const halfW = Math.max(...spots.map((p) => Math.abs(p.x))) + 0.75
  return (
    <>
      <ViewCamera frame={{ spheres }} y={0.5} parallax={interactive ? 0.25 : 0} />
      <SoftLights />
      {colors.map((c, i) => {
        const { x, z, s, floor: f } = spots[i]
        return (
          <Mochi
            key={c + i}
            color={c}
            accessory={accessories[i % accessories.length]}
            expression={expressions[i % expressions.length]}
            seed={i + 11}
            detail="low"
            position={[x, stand(f, s), z]}
            rotation={[0, -x * 0.08, 0]}
            scale={s}
            bounce
            lookAtPointer={interactive}
            squishOnTap={interactive}
          />
        )
      })}
      <FloatingDeco count={Math.min(14, 6 + n * 2)} kinds={['sparkle', 'ring']} area={[halfW * 2 + 1, 2.6, 1.5]} center={[0, 0.5, -1.4]} size={0.75} seed={5} />
    </>
  )
}

// ------------------------------------------------------------------ call
const CALL_PHONE = 1.06
const CALL_X = 2.1
const CALL_SPHERES: FrameSphere[] = [
  [0, -1 + 0.86 * CALL_PHONE, -1.3, 1.12 * CALL_PHONE],
  // a little padding under the mochi, so their bases never touch the box edge or a caption
  mochiSphere(-CALL_X, -1.12, 0.2, 0.68),
  mochiSphere(CALL_X, -1.12, 0.2, 0.68),
  // the two greeting bubbles
  [-1.35, 0.95, 0.3, 0.45],
  [1.35, 0.95, 0.3, 0.45],
]
/**
 * The "ส่งโมชิ" success moment: the phone rings between two mochi, a dotted
 * signal arcs from one to the other, and they trade a hello.
 */
export function CallScene({
  fromColor = 'peach',
  toColor = 'mint',
  fromAccessory = 'headset',
  toAccessory = 'none',
  fromText = t('โมชิโมชิ~', 'Moshi moshi~'),
  toText = t('ฮัลโหล~ ยินดีที่ได้รู้จักนะ', 'Hello~ nice to meet you'),
}: {
  fromColor?: MochiColor
  toColor?: MochiColor
  fromAccessory?: MochiAccessory
  toAccessory?: MochiAccessory
  fromText?: string
  toText?: string
}) {
  const s = 0.68
  const floor = -1
  const y = stand(floor, s)
  return (
    <>
      <ViewCamera frame={{ spheres: CALL_SPHERES }} y={0.5} parallax={0.3} />
      <SoftLights />
      <Drift amount={0.6}>
        <RetroPhone position={[0, floor, -1.3]} scale={CALL_PHONE} ringing />
        <Mochi color={fromColor} accessory={fromAccessory} expression="talk" position={[-CALL_X, y, 0.2]} rotation={[0, 0.4, 0]} scale={s} seed={21} bounce lookAtPointer squishOnTap draggable>
          <SpeechBubble position={[0.35, 1.3, 0.3]} text={fromText} side="left" color={fromColor} delay={0.35} />
        </Mochi>
        <Mochi color={toColor} accessory={toAccessory} expression="happy" position={[CALL_X, y, 0.2]} rotation={[0, -0.4, 0]} scale={s} seed={22} bounce lookAtPointer squishOnTap draggable wave>
          <SpeechBubble position={[-0.35, 1.3, 0.3]} text={toText} side="right" color={toColor} delay={1.6} />
        </Mochi>
        <SignalArc from={[-1.65, y + 0.3, 0.25]} to={[1.65, y + 0.3, 0.25]} height={1.05} colors={[fromColor, toColor]} />
        <FloatingDeco count={16} kinds={['sparkle', 'ring', 'chat']} area={[7, 4, 2.5]} center={[0, 0.4, -1.8]} avoid={[1.4, 1.1]} seed={9} />
      </Drift>
    </>
  )
}
