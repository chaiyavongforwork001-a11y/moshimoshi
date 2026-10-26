import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { t } from '@/lib/i18n'
import { Mochi } from '../Mochi'
import { MOCHI_FOOT, MOCHI_TOP } from '../mochiGeometry'
import { SpeechBubble } from '../SpeechBubble'
import { Nimbus, NIMBUS_TOP } from './cast'
import { CAST, getDocks, GUIDE_SCALE, NIMBUS_SCALE, SIGNAL, SIGNAL_GLIDE } from './layout'
import { easeInOut, HOLD_IN, HOLD_OUT, jellyStep, phaseAt, smooth, syncClock, useStoryCtx, type Jelly, type Phase } from './timeline'
import { useViewFrame } from '../viewActive'

const FEET = NIMBUS_TOP * NIMBUS_SCALE
const HEAD = FEET + (MOCHI_TOP - MOCHI_FOOT) * GUIDE_SCALE
/** how far each signal mochi reaches toward the other at the top of the bump hop */
export const BUMP_REACH = 0.5
export const BUMP_LIFT = 0.55


const _a = new THREE.Vector3()
const _b = new THREE.Vector3()

/**
 * น้องโมชิ, the guide: one persistent peach mochi riding its little cloud
 * through every chapter, flying alongside the camera between them (the
 * "hero object" that carries the story). At each stop it docks into the
 * scene: beside the phone, by the lobby, as one of the signal pair, as a
 * seat in the circle, as the one being listened to, next to the call.
 */
export function Guide() {
  const { clock, compact, cues } = useStoryCtx()
  const docks = useMemo(() => getDocks(compact), [compact])
  const sig = compact ? SIGNAL.compact : SIGNAL.wide
  const root = useRef<THREE.Group>(null)
  const feet = useRef<THREE.Group>(null)
  const face = cues((s) => s.guideFace)
  const talk = cues((s) => s.talk)
  const st = useMemo(
    () => ({
      ph: { from: 0, to: 0, u: 0, travel: false } as Phase,
      prev: new THREE.Vector3(),
      vx: 0,
      j: { s: 0, v: 0 } as Jelly,
      jx: { s: 0, v: 0 } as Jelly,
      bumpPrev: 0,
      init: false,
    }),
    [],
  )

  const dockAt = (i: number, c: number, out: THREE.Vector3) => {
    out.set(...docks[i].at)
    if (i === 2) out.x += (sig.apart - sig.near) * smooth(SIGNAL_GLIDE[0], SIGNAL_GLIDE[1], c)
    return out
  }

  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const g = root.current
    const f = feet.current
    if (!g || !f) return
    const dt = clock.dt
    const r = clock.reduced
    let yaw: number
    let size: number
    let lift = 0
    if (r) {
      const i = clock.chapter
      dockAt(i, clock.x - i, _a)
      g.position.copy(_a)
      yaw = docks[i].yaw
      size = docks[i].s
    } else {
      const ph = phaseAt(clock.x, st.ph)
      if (ph.travel) {
        dockAt(ph.from, HOLD_OUT, _a)
        dockAt(ph.to, HOLD_IN, _b)
        const e = easeInOut(ph.u)
        lift = Math.sin(Math.PI * e)
        g.position.lerpVectors(_a, _b, e)
        g.position.y += lift * (0.8 + _a.distanceTo(_b) * 0.07)
        const turn = THREE.MathUtils.clamp((_b.x - _a.x) * 0.08, -0.6, 0.6)
        yaw = THREE.MathUtils.lerp(docks[ph.from].yaw, docks[ph.to].yaw, e) + turn * lift
        size = THREE.MathUtils.lerp(docks[ph.from].s, docks[ph.to].s, e)
      } else {
        const i = ph.from
        dockAt(i, clock.x - i, _a)
        g.position.copy(_a)
        yaw = docks[i].yaw
        size = docks[i].s
      }
      g.position.y += Math.sin(clock.t * 1.4) * 0.045
    }

    // signal bump: hop toward the partner, squish at the top, land back on the cloud
    const b = clock.beat.bump
    const arcB = Math.sin(Math.PI * b)
    if (b > 0 && b < 1 && !r) {
      g.position.x += BUMP_REACH * arcB
      g.position.y += BUMP_LIFT * arcB
    }
    if (!r) {
      if (st.bumpPrev < 0.5 && b >= 0.5) st.jx.v += 5
      if (st.bumpPrev === 0 && b > 0) st.j.v += 2.2
      if (st.bumpPrev < 1 && b === 1) st.j.v -= 3.2
    }
    st.bumpPrev = b

    // travel velocity → lean + stretch
    if (!st.init) {
      st.prev.copy(g.position)
      st.init = true
    }
    const vx = (g.position.x - st.prev.x) / Math.max(dt, 1e-3)
    const vy = (g.position.y - st.prev.y) / Math.max(dt, 1e-3)
    st.prev.copy(g.position)
    st.vx = THREE.MathUtils.damp(st.vx, THREE.MathUtils.clamp(vx, -12, 12), 6, dt)
    if (r) {
      st.j.s = st.j.v = st.jx.s = st.jx.v = 0
    } else {
      jellyStep(st.j, THREE.MathUtils.clamp(Math.abs(vy) * 0.012, 0, 0.08) + lift * 0.05, dt)
      jellyStep(st.jx, 0, dt, 260, 10)
    }
    g.rotation.set(0, yaw, r ? 0 : -st.vx * 0.025 - clock.vel * 0.08)
    g.scale.setScalar(size)
    const s = THREE.MathUtils.clamp(st.j.s, -0.3, 0.3)
    const sx = THREE.MathUtils.clamp(st.jx.s, -0.25, 0.25)
    f.scale.set(1 - s * 0.5 - sx * 0.6, 1 + s + sx * 0.5, 1 - s * 0.5)
  })

  return (
    <group ref={root} position={docks[0].at}>
      <Nimbus scale={NIMBUS_SCALE} />
      <group ref={feet} position={[0, FEET, 0]}>
        <Mochi
          color={CAST.guide.color}
          accessory={CAST.guide.accessory}
          expression={face}
          position={[0, -MOCHI_FOOT * GUIDE_SCALE, 0]}
          scale={GUIDE_SCALE}
          seed={42}
          lookAtPointer
          squishOnTap
          shadow={false}
        />
      </group>
      {talk === 0 && (
        <SpeechBubble
          position={[0.25, HEAD + 0.12, 0.2]}
          text={t('โมชิโมชิ~', 'Moshi moshi~')}
          lines={[t('โมชิโมชิ~', 'Moshi moshi~'), t('ไปเที่ยวด้วยกันนะ!', "Let's explore together!")]}
          side="left"
          color="peach"
          delay={0.7}
          interval={3200}
          rest={1600}
        />
      )}
      {talk === 4 && (
        <SpeechBubble
          position={[0.25, HEAD + 0.12, 0.2]}
          text={t('วันนี้เหนื่อยนิดนึงอะ', 'Kinda tired today')}
          lines={[t('วันนี้เหนื่อยนิดนึงอะ', 'Kinda tired today'), t('ขอบคุณที่ฟังนะ~', 'Thanks for listening~')]}
          side="left"
          color="peach"
          delay={0.6}
          interval={3200}
          rest={3600}
        />
      )}
    </group>
  )
}
