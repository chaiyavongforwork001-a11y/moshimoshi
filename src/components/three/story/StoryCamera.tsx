import { PerspectiveCamera } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { readViewPointer, soft, viewMemo } from '../pointer'
import { useViewElement } from '../viewElement'
import { COMPACT_SHIFT, COMPACT_VIS, FOV, getShots, WIDE_SHIFT, WIDE_VIS, type Shot } from './layout'
import { CHAPTERS, easeInOut, phaseAt, syncClock, useStoryCtx, type Phase } from './timeline'
import { useViewFrame } from '../viewActive'

const TAN = Math.tan(THREE.MathUtils.degToRad(FOV) / 2)
const SEGMENTS = CHAPTERS * 2 - 1

function shotPosition(s: Shot, aspect: number, compact: boolean, out: THREE.Vector3) {
  const hh = compact ? s.fit[1] / COMPACT_VIS : s.fit[1]
  const hw = compact ? s.fit[0] : s.fit[0] / WIDE_VIS
  const d = Math.max(hw / (TAN * aspect), hh / TAN)
  return out.set(...s.dir).normalize().multiplyScalar(d).add(new THREE.Vector3(...s.look))
}

/** curve parameter for a damped progress: holds drift a → b, travels ease across chapter boundaries */
function curveParam(ph: Phase) {
  const seg = ph.travel ? ph.from * 2 + 1 + easeInOut(ph.u) : ph.from * 2 + ph.u
  return seg / SEGMENTS
}

const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _fwd = new THREE.Vector3()

/**
 * The story camera: rides a Catmull-Rom path (positions + look targets)
 * through every chapter, fitted to the view's aspect. Pointer parallax
 * orbits it a touch; scroll velocity adds a little roll. Compact framing
 * offsets the frustum so subjects sit in the upper part of a phone screen.
 */
export function StoryCamera({ compact }: { compact: boolean }) {
  const cam = useRef<THREE.PerspectiveCamera>(null)
  const viewEl = useViewElement()
  const { clock } = useStoryCtx()
  const shots = useMemo(() => getShots(compact), [compact])
  const st = useMemo(
    () => ({
      aspect: 0,
      w: 0,
      h: 0,
      pos: null as THREE.CatmullRomCurve3 | null,
      look: null as THREE.CatmullRomCurve3 | null,
      ph: { from: 0, to: 0, u: 0, travel: false } as Phase,
      mem: viewMemo(),
      ptr: { x: 0, y: 0 },
      px: 0,
      py: 0,
      roll: 0,
      p: new THREE.Vector3(),
      l: new THREE.Vector3(),
    }),
    [],
  )

  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __storyCam: cam.current })
  }, [])

  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const c = cam.current
    if (!c) return
    const { width: w, height: h } = state.size
    const aspect = w / Math.max(1, h)
    if (!st.pos || Math.abs(aspect - st.aspect) > 0.002 || w !== st.w || h !== st.h) {
      st.aspect = aspect
      st.w = w
      st.h = h
      const pts: THREE.Vector3[] = []
      const looks: THREE.Vector3[] = []
      for (const pair of shots)
        for (const s of pair) {
          pts.push(shotPosition(s, aspect, compact, new THREE.Vector3()))
          looks.push(new THREE.Vector3(...s.look))
        }
      st.pos = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
      st.look = new THREE.CatmullRomCurve3(looks, false, 'centripetal')
      if (compact) c.setViewOffset(w, h, 0, h * COMPACT_SHIFT, w, h)
      else c.setViewOffset(w, h, -w * WIDE_SHIFT, 0, w, h)
      c.aspect = aspect
      c.updateProjectionMatrix()
    }

    let u: number
    if (clock.reduced) {
      // no flying: a still shot per chapter
      u = (clock.chapter * 2 + 0.5) / SEGMENTS
    } else u = curveParam(phaseAt(clock.x, st.ph))
    st.pos.getPoint(Math.min(1, Math.max(0, u)), st.p)
    st.look!.getPoint(Math.min(1, Math.max(0, u)), st.l)

    const dt = clock.dt
    if (!clock.reduced) {
      const att = readViewPointer(state.size, st.mem, st.ptr, viewEl)
      st.px = THREE.MathUtils.damp(st.px, soft(st.ptr.x, 1.2) * att, 2, dt)
      st.py = THREE.MathUtils.damp(st.py, soft(st.ptr.y, 1.2) * att, 2, dt)
      st.roll = THREE.MathUtils.damp(st.roll, THREE.MathUtils.clamp(-clock.vel * 0.05, -0.05, 0.05), 3, dt)
    }
    const dist = st.p.distanceTo(st.l)
    _fwd.subVectors(st.l, st.p).normalize()
    _right.crossVectors(_fwd, THREE.Object3D.DEFAULT_UP).normalize()
    _up.crossVectors(_right, _fwd)
    const k = dist * 0.045
    c.position.copy(st.p).addScaledVector(_right, st.px * k).addScaledVector(_up, st.py * k * 0.6)
    c.lookAt(st.l)
    if (st.roll) c.rotateZ(st.roll)
  })

  return <PerspectiveCamera ref={cam} makeDefault fov={FOV} near={0.1} far={240} position={[0, 2, 12]} />
}
