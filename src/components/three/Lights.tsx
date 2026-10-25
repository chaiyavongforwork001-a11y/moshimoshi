import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SHADOW } from './palette'
import { readViewPointer, soft, viewMemo } from './pointer'
import { useStage } from './stage'
import { useViewElement } from './viewElement'
import { useViewFrame } from './viewActive'

/*
 * Light budget (Stage3D renders with NoToneMapping, so 1.0 = the albedo):
 * a warm gradient dome gives ~0.7 everywhere, the key adds ~0.3 on faces
 * turned to the viewer and the lavender fill lifts the far side. The jelly
 * shader keeps shadow sides saturated, so pastels stay luminous.
 *
 * The environment (dome + softboxes) is prefiltered ONCE per brightness and
 * shared by every view, instead of each view re-rendering its own cube.
 */
const DOME_RADIUS = 40
let domeGeo: THREE.SphereGeometry | null = null

function getDomeGeo() {
  if (domeGeo) return domeGeo
  domeGeo = new THREE.SphereGeometry(DOME_RADIUS, 32, 16)
  const pos = domeGeo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  // near-neutral warm white, so cool pastels (sky, lavender) stay clean
  const top = new THREE.Color('#FFFBF7')
  const mid = new THREE.Color('#FFF3EC')
  const bottom = new THREE.Color('#FFE4DA')
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / DOME_RADIUS
    if (y >= 0) c.copy(mid).lerp(top, Math.min(1, y * 1.4))
    else c.copy(mid).lerp(bottom, Math.min(1, -y * 1.6))
    colors.set([c.r, c.g, c.b], i * 3)
  }
  domeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return domeGeo
}

function softbox(form: 'circle' | 'rect', color: string, intensity: number, pos: [number, number, number], scale: [number, number]) {
  const geo = form === 'circle' ? new THREE.CircleGeometry(0.5, 32) : new THREE.PlaneGeometry(1, 1)
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide, toneMapped: false })
  const m = new THREE.Mesh(geo, mat)
  m.position.set(...pos)
  m.scale.set(scale[0], scale[1], 1)
  m.lookAt(0, 0, 0)
  return m
}

const envCache = new WeakMap<THREE.WebGLRenderer, Map<string, THREE.Texture>>()

/** forget the prefiltered environments (their render targets are empty after a context loss) */
export function resetSharedEnv(gl: THREE.WebGLRenderer) {
  envCache.get(gl)?.forEach((t) => t.dispose())
  envCache.delete(gl)
}

function getSharedEnv(gl: THREE.WebGLRenderer, level: number): THREE.Texture {
  let byLevel = envCache.get(gl)
  if (!byLevel) envCache.set(gl, (byLevel = new Map()))
  const key = level.toFixed(2)
  const hit = byLevel.get(key)
  if (hit) return hit
  const scene = new THREE.Scene()
  const domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false })
  domeMat.color.setScalar(0.74 * level)
  scene.add(new THREE.Mesh(getDomeGeo(), domeMat))
  const boxes = [
    // key softbox: soft top highlight on jelly, glints on candy plastic
    softbox('circle', '#FFF6EE', 1.7, [-3, 4.5, 4], [3, 2.2]),
    // catch-light strip across glossy fronts
    softbox('rect', '#FFFFFF', 0.65, [0, 0.6, 6], [8, 1.4]),
    // lavender + peach rims
    softbox('rect', '#EFE6FF', 1.25, [-5, 1.5, -1.5], [2.5, 6]),
    softbox('rect', '#FFE0D2', 1.05, [5, 0.5, -2], [2.5, 5]),
  ]
  boxes.forEach((b) => scene.add(b))
  const pmrem = new THREE.PMREMGenerator(gl)
  const tex = pmrem.fromScene(scene, 0, 0.1, 100).texture
  pmrem.dispose()
  boxes.forEach((b) => {
    b.geometry.dispose()
    ;(b.material as THREE.Material).dispose()
  })
  domeMat.dispose()
  byLevel.set(key, tex)
  return tex
}

/**
 * Warm studio lighting shared by every 3D view (no HDR download, works
 * offline in the PWA). Objects bring their own blob shadows; `shadow` adds
 * an optional ContactShadows floor at `shadowY`.
 */
export const SoftLights = memo(function SoftLights({
  shadow = false,
  shadowY = -1.1,
  level = 1,
}: {
  shadow?: boolean
  shadowY?: number
  /** overall brightness multiplier */
  level?: number
}) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const envVersion = useStage((s) => s.envVersion)
  useLayoutEffect(() => {
    const prev = scene.environment
    scene.environment = getSharedEnv(gl, level)
    return () => {
      scene.environment = prev
    }
  }, [gl, scene, level, envVersion])
  return (
    <>
      <directionalLight position={[-2.5, 4, 5]} intensity={1.15 * level} color="#FFF6EE" />
      <directionalLight position={[4, 1.5, 2.5]} intensity={0.42 * level} color="#F3EEFF" />
      {shadow && (
        <ContactShadows position={[0, shadowY, 0]} opacity={0.3} scale={9} blur={2.6} far={2} resolution={256} color={SHADOW} />
      )}
    </>
  )
})

type Rect = [number, number, number, number]
/** [x, y, z, radius] of something that must stay fully in frame */
export type FrameSphere = [number, number, number, number]

/**
 * Smallest camera distance d (camera at z = d looking down -z) and the
 * centre (cx, cy) that put every sphere inside the NDC region, with true
 * perspective: things in front (z > 0) take more room than things behind.
 * Per axis it is a 2-variable linear program, solved exactly over pairs.
 */
function fitSpheres(sp: FrameSphere[], n: number, reg: Rect, kx: number, ky: number, out: { d: number; cx: number; cy: number }) {
  const rw = Math.max(0.05, reg[2] - reg[0])
  const rh = Math.max(0.05, reg[3] - reg[1])
  let d = 0
  for (let i = 0; i < n; i++) {
    const a = sp[i]
    d = Math.max(d, a[2] + a[3] + 0.5)
    for (let j = 0; j < n; j++) {
      const b = sp[j]
      d = Math.max(d, (a[0] + a[3] - b[0] + b[3] + kx * (reg[2] * a[2] - reg[0] * b[2])) / (kx * rw))
      d = Math.max(d, (a[1] + a[3] - b[1] + b[3] + ky * (reg[3] * a[2] - reg[1] * b[2])) / (ky * rh))
    }
  }
  let xlo = -Infinity
  let xhi = Infinity
  let ylo = -Infinity
  let yhi = Infinity
  for (let i = 0; i < n; i++) {
    const [x, y, z, r] = sp[i]
    xlo = Math.max(xlo, x + r - reg[2] * kx * (d - z))
    xhi = Math.min(xhi, x - r - reg[0] * kx * (d - z))
    ylo = Math.max(ylo, y + r - reg[3] * ky * (d - z))
    yhi = Math.min(yhi, y - r - reg[1] * ky * (d - z))
  }
  out.d = d
  out.cx = (xlo + xhi) / 2
  out.cy = (ylo + yhi) / 2
}

export interface ViewCameraProps {
  z?: number
  y?: number
  fov?: number
  /**
   * [halfWidth, halfHeight] of the world area that must stay in frame. The
   * camera distance then adapts to the view's aspect ratio every frame, so
   * a scene fits a phone portrait box and a wide desktop hero alike.
   */
  fit?: [number, number]
  /**
   * Like `fit`, but places a world box [minX, minY, maxX, maxY] (z = 0 plane)
   * inside a screen region [left, bottom, right, top] in NDC (-1..1). The
   * region may depend on the view's aspect ratio, e.g. "right half on wide
   * screens, upper half on phones". Overrides `fit` and `target`.
   */
  frame?: {
    box?: Rect
    /**
     * bounding spheres [x, y, z, r] instead of a flat box: depth-aware, so
     * characters standing in front of z = 0 are never cropped
     */
    spheres?: FrameSphere[]
    region?: Rect | ((aspect: number) => Rect)
  }
  /** point the camera looks at (default origin) */
  target?: [number, number, number]
  /** how far (world units) the camera drifts toward the pointer */
  parallax?: number
}

const FULL_REGION: Rect = [-1, -1, 1, 1]

/** Default camera for a View (each View needs its own). */
export function ViewCamera({ z = 6, y = 0.2, fov = 35, fit, frame, target, parallax = 0 }: ViewCameraProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null)
  const reduced = useReducedMotion() ?? false
  const viewEl = useViewElement()
  const st = useMemo(
    () => ({ mem: viewMemo(), ptr: { x: 0, y: 0 }, px: 0, py: 0, d: 0, cx: 0, cy: 0, cz: 0, fit: { d: 0, cx: 0, cy: 0 }, tmp: [] as FrameSphere[] }),
    [],
  )
  const animated = !!fit || !!frame || parallax > 0 || !!target

  useViewFrame((state, delta) => {
    const c = cam.current
    if (!c || !animated) return
    const dt = Math.min(Math.max(delta, 0), 0.1)
    const aspect = state.size.width / Math.max(1, state.size.height)
    const tanH = Math.tan(THREE.MathUtils.degToRad(fov) / 2)
    let tx = target?.[0] ?? 0
    let ty = target?.[1] ?? 0
    let tz = target?.[2] ?? 0
    let d = z
    // spheres are fitted in the camera's own pitched frame (it looks down at atan(y / d))
    let sn = 0
    let cs = 1
    const reg = frame && (typeof frame.region === 'function' ? frame.region(aspect) : (frame.region ?? FULL_REGION))
    if (frame?.spheres && reg) {
      const th = Math.atan2(y, st.d || z)
      sn = Math.sin(th)
      cs = Math.cos(th)
      const src = frame.spheres
      const tmp = st.tmp
      while (tmp.length < src.length) tmp.push([0, 0, 0, 0])
      for (let i = 0; i < src.length; i++) {
        const a = src[i]
        const b = tmp[i]
        b[0] = a[0]
        b[1] = a[1] * cs - a[2] * sn
        b[2] = a[1] * sn + a[2] * cs
        b[3] = a[3]
      }
      fitSpheres(tmp, src.length, reg, tanH * aspect, tanH, st.fit)
      d = st.fit.d
      tx = st.fit.cx
      ty = st.fit.cy * cs
      tz = -st.fit.cy * sn
    } else if (frame?.box && reg) {
      const [x0, y0, x1, y1] = frame.box
      const rw = Math.max(0.05, reg[2] - reg[0])
      const rh = Math.max(0.05, reg[3] - reg[1])
      d = Math.max((x1 - x0) / (rw * tanH * aspect), (y1 - y0) / (rh * tanH))
      tx = (x0 + x1) / 2 - ((reg[0] + reg[2]) / 2) * d * tanH * aspect
      ty = (y0 + y1) / 2 - ((reg[1] + reg[3]) / 2) * d * tanH
    } else if (fit) {
      d = Math.max(fit[0] / (tanH * aspect), fit[1] / tanH)
    }
    const first = st.d === 0
    st.d = first ? d : THREE.MathUtils.damp(st.d, d, 6, dt)
    st.cx = first ? tx : THREE.MathUtils.damp(st.cx, tx, 6, dt)
    st.cy = first ? ty : THREE.MathUtils.damp(st.cy, ty, 6, dt)
    st.cz = first ? tz : THREE.MathUtils.damp(st.cz, tz, 6, dt)
    // a degenerate frame (zero-size box, bad delta) must never poison the damped state for good
    if (!Number.isFinite(st.d + st.cx + st.cy + st.cz)) {
      st.d = 0
      return
    }
    if (parallax > 0 && !reduced) {
      const att = readViewPointer(state.size, st.mem, st.ptr, viewEl)
      st.px = THREE.MathUtils.damp(st.px, soft(st.ptr.x, 1.2) * att, 2.2, dt)
      st.py = THREE.MathUtils.damp(st.py, soft(st.ptr.y, 1.2) * att, 2.2, dt)
    }
    // parallax scales with distance so wide shots drift as much as close ones
    const p = parallax * (frame ? st.d / 10 : 1)
    if (sn !== 0) c.position.set(st.cx + st.px * p, st.cy + st.d * sn + st.py * p * 0.6, st.cz + st.d * cs)
    else c.position.set(st.cx + st.px * p, st.cy + y + st.py * p * 0.6, st.cz + st.d)
    c.lookAt(st.cx, st.cy, st.cz)
  })

  return <PerspectiveCamera ref={cam} makeDefault position={[0, y, z]} fov={fov} />
}
