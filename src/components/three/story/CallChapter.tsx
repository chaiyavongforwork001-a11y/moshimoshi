import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { MOCHI } from '@/lib/colors'
import { FloatingDeco } from '../FloatingDeco'
import { BODY_H } from '../mochiGeometry'
import { CORAL } from '../palette'
import { RetroPhone } from '../RetroPhone'
import { SpeechBubble } from '../SpeechBubble'
import { Burst, FriendMochi, NIMBUS_TOP, Platform } from './cast'
import { ChapterGroup } from './Jelly'
import { CAST, CENTER, getDocks, GUIDE_SCALE, NIMBUS_SCALE, type Friend, type V3 } from './layout'
import { jellyStep, local, smooth, syncClock, useStoryCtx, type Jelly } from './timeline'
import { useViewFrame } from '../viewActive'

type Spot = { friend: Friend; at: V3; s: number; yaw: number }
// friends stand forward and out to the right, clear of the phone
const FRIENDS_WIDE: Spot[] = [
  { friend: CAST.gamer, at: [1.3, 0, 1.2], s: 0.48, yaw: -0.45 },
  { friend: CAST.pink, at: [2.05, 0, 0.15], s: 0.42, yaw: -0.5 },
]
const FRIENDS_COMPACT: Spot[] = [
  { friend: CAST.gamer, at: [1.05, 0, 1.15], s: 0.42, yaw: -0.4 },
  { friend: CAST.pink, at: [1.45, 0, 0.35], s: 0.36, yaw: -0.45 },
]

/** where the lifted handset rests against the guide's cheek (chapter-local), and its yaw */
function earSpot(compact: boolean) {
  const d = getDocks(compact)[5]
  const s = d.s
  // at the front of the right cheek, so it reads against the guide rather than the phone behind
  const side = (0.93 * GUIDE_SCALE - 0.02) * s
  const fwd = 0.34 * s
  const y = (NIMBUS_TOP * NIMBUS_SCALE + 0.4 * BODY_H * GUIDE_SCALE) * s
  const at = new THREE.Vector3(d.at[0] - CENTER.call[0], d.at[1] - CENTER.call[1], d.at[2] - CENTER.call[2])
  at.x += Math.cos(d.yaw) * side + Math.sin(d.yaw) * fwd
  at.y += y
  at.z += -Math.sin(d.yaw) * side + Math.cos(d.yaw) * fwd
  // stood on its cord end (roll > 0) and turned round so the cups face the head
  return { at, yaw: d.yaw - Math.PI, roll: 1.05 }
}

const _m = new THREE.Matrix4()

/**
 * The call: the toy phone glides forward, rings, hops, then น้องโมชิ picks
 * up — the handset springs off the cradle to its ear, the curly cord
 * stretching after it — and says hello: the CTA moment. Friends cheer.
 */
export function CallChapter() {
  const { clock, compact, cues } = useStoryCtx()
  const phone = useRef<THREE.Group>(null)
  const squash = useRef<THREE.Group>(null)
  const lift = useRef(0)
  const st = useMemo(() => ({ j: { s: 0, v: 0 } as Jelly, lift: { s: 0, v: 0 } as Jelly, prev: 0 }), [])
  const ear = useMemo(() => earSpot(compact), [compact])
  // the handset's target in the phone's own frame (updated every frame as the phone moves)
  const aim = useMemo(() => ({ at: new THREE.Vector3(), yaw: ear.yaw, roll: ear.roll, scale: 0.56 }), [ear])
  const hello = cues((s) => s.callHello)
  const base = compact ? 0.86 : 1.02
  const friends = compact ? FRIENDS_COMPACT : FRIENDS_WIDE

  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const g = phone.current
    const sq = squash.current
    if (!g || !sq) return
    const r = clock.reduced
    const c = local(clock, 5)
    const come = smooth(0.15, 0.6, c)
    const b = clock.beat.phone
    const hop = r ? 0 : Math.sin(Math.PI * b)
    if (!r) {
      if (st.prev === 0 && b > 0) st.j.v += 2.6
      if (st.prev < 1 && b === 1) st.j.v -= 4
      jellyStep(st.j, 0, clock.dt, 220, 9)
    }
    st.prev = b
    g.position.set(0, hop * 0.55, -0.3 + come * 0.45)
    g.rotation.set(come * 0.22 - hop * 0.1, r ? 0 : Math.sin(clock.t * 0.6) * 0.06 * (1 - come), 0)
    g.scale.setScalar(base * (1 + come * 0.1))
    const s = THREE.MathUtils.clamp(st.j.s, -0.3, 0.3)
    sq.scale.set(1 - s * 0.45, 1 + s, 1 - s * 0.45)
    g.updateMatrix()
    aim.at.copy(ear.at).applyMatrix4(_m.copy(g.matrix).invert())

    // once the hop lands, the handset lifts toward the viewer (springy, rewinds when scrolling back)
    const up = b >= 1 ? 1 : 0
    if (r) st.lift.s = up
    else jellyStep(st.lift, up, clock.dt, 90, 9)
    lift.current = st.lift.s
  })

  return (
    <ChapterGroup index={5} position={CENTER.call}>
      <Platform size={compact ? 2.05 : 2.5} depth={0.85} color="cloud" />
      <group ref={phone}>
        <group ref={squash}>
          <RetroPhone ringing lift={lift} liftTo={aim} />
          {hello && (
            <SpeechBubble position={[0.72, 1.95, 0.35]} text="ฮัลโหล~" lines={['ฮัลโหล~', 'มาคุยกันนะ!']} side="left" color="peach" delay={0.5} interval={2800} rest={1400} />
          )}
        </group>
      </group>
      {friends.map((p, i) => (
        <FriendMochi key={p.friend.color} friend={p.friend} scale={p.s} seed={80 + i} chapter={5} from={p.at} yaw={p.yaw} expression="happy" bounce sway={0.03} />
      ))}
      <Burst beat="phone" fireAt={0.95} position={[0, 1.4, 0.4]} radius={1.5} size={0.11} count={14} colors={[CORAL, MOCHI.butter.shade, MOCHI.mint.shade, MOCHI.lavender.shade, MOCHI.sky.shade, '#FFFFFF']} />
      <FloatingDeco count={compact ? 12 : 20} area={compact ? [5, 4.4, 2.5] : [8.5, 4.4, 3]} center={[0, 1.4, -1.6]} avoid={[1.6, 1.3]} seed={55} />
    </ChapterGroup>
  )
}
