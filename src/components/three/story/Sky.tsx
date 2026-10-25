import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { noRaycast } from '../props'
import { getSkyCloud, rng } from './clouds'
import { CHAPTERS, smooth, syncClock, useStoryCtx } from './timeline'
import { useViewFrame } from '../viewActive'

/*
 * "Moshi Sky": a gradient dome that follows the camera and slowly changes
 * mood per chapter (peach morning → clear day → lavender → golden hour →
 * dusk with a warm glow → bright call), a sea of clouds far below and soft
 * clouds floating around the route. ~4 draw calls.
 */
type SkyKey = [top: string, mid: string, bottom: string, glow: string, glowDir: [number, number, number], cloud: string]
const KEYS: SkyKey[] = [
  ['#FFDCCB', '#FFF3EA', '#FFE7DA', '#FFFFFF', [0.4, 0.25, -1], '#FFF7F2'],
  ['#B9DEFF', '#E8F4FF', '#FFF3EC', '#FFFFFF', [-0.5, 0.35, -1], '#F7FAFF'],
  ['#D9CCFF', '#F5EEFF', '#FFE6EF', '#FFF7FB', [0.6, 0.2, -1], '#FAF5FF'],
  ['#FFC2A0', '#FFE2C6', '#FFDCC4', '#FFF1C9', [0.2, 0.08, -1], '#FFEEDD'],
  ['#B2A2EA', '#E2D2F3', '#FAD3C8', '#FFE1B8', [-0.3, 0.05, -1], '#F1E6F8'],
  ['#FFC8B8', '#FFEDE3', '#FFF4EC', '#FFFFFF', [0.3, 0.3, -1], '#FFF6F1'],
]

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBottom;
uniform vec3 uGlow;
uniform vec3 uGlowDir;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 c = y > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.62, y)) : mix(uMid, uBottom, smoothstep(0.0, 0.45, -y));
  float g = pow(max(dot(d, uGlowDir), 0.0), 5.0);
  c = mix(c, uGlow, g * 0.55);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`

const keyColors = KEYS.map(([t, m, b, g, d, cl]) => ({
  top: new THREE.Color(t),
  mid: new THREE.Color(m),
  bottom: new THREE.Color(b),
  glow: new THREE.Color(g),
  dir: new THREE.Vector3(...d).normalize(),
  cloud: new THREE.Color(cl),
}))

/** cloud sea + floating clouds scattered around the whole route */
const SEA_Y = -5.5
function scatter() {
  const rnd = rng(77)
  const sea: { x: number; z: number; s: number; tint: number }[] = []
  for (let i = 0; i < 46; i++) sea.push({ x: -14 + rnd() * 60, z: -30 + rnd() * 48, s: 2.4 + rnd() * 2.6, tint: rnd() })
  const floaters: { x: number; y: number; z: number; s: number; v: number; ph: number }[] = []
  const route: [number, number, number][] = [
    [0, 0, 0],
    [3, 7, -9],
    [13, 9.5, -13],
    [21, 5.5, -8],
    [27, 3.2, -1],
    [30, 4.2, 7],
  ]
  route.forEach(([cx, cy, cz], i) => {
    for (let k = 0; k < 4; k++) {
      const side = k % 2 ? 1 : -1
      floaters.push({
        x: cx + side * (5 + rnd() * 5),
        y: cy + (rnd() - 0.4) * 4,
        z: cz - 6 - rnd() * 9,
        s: 0.8 + rnd() * 0.9,
        v: (i + k) % 2,
        ph: rnd() * 10,
      })
    }
  })
  return { sea, floaters }
}

const _o = new THREE.Object3D()
const _c = new THREE.Color()

let seaGeo: THREE.SphereGeometry | null = null
let cloudMat: THREE.MeshStandardMaterial | null = null
function getSeaGeo() {
  return (seaGeo ??= new THREE.SphereGeometry(1, 20, 12).scale(1, 0.42, 1))
}
function getCloudMat() {
  return (cloudMat ??= new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, emissive: new THREE.Color('#FFF1EA'), emissiveIntensity: 0.32 }))
}

export function Sky() {
  const { clock } = useStoryCtx()
  const dome = useRef<THREE.Mesh>(null)
  const seaRef = useRef<THREE.InstancedMesh>(null)
  const floatRefs = useRef<(THREE.InstancedMesh | null)[]>([])
  const data = useMemo(scatter, [])
  const byVariant = useMemo(() => [0, 1].map((v) => data.floaters.filter((f) => f.v === v)), [data])
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uTop: { value: new THREE.Color() },
          uMid: { value: new THREE.Color() },
          uBottom: { value: new THREE.Color() },
          uGlow: { value: new THREE.Color() },
          uGlowDir: { value: new THREE.Vector3(0, 0, -1) },
        },
      }),
    [],
  )
  const domeGeo = useMemo(() => new THREE.SphereGeometry(90, 32, 16), [])
  useLayoutEffect(
    () => () => {
      mat.dispose()
      domeGeo.dispose()
    },
    [mat, domeGeo],
  )

  useLayoutEffect(() => {
    const sea = seaRef.current
    if (sea) {
      data.sea.forEach((p, i) => {
        _o.position.set(p.x, SEA_Y, p.z)
        _o.scale.set(p.s, p.s, p.s * 0.8)
        _o.rotation.set(0, p.tint * 6, 0)
        _o.updateMatrix()
        sea.setMatrixAt(i, _o.matrix)
        sea.setColorAt(i, _c.set(p.tint < 0.33 ? '#FFFFFF' : p.tint < 0.66 ? '#FFF1F4' : '#F4F0FF'))
      })
      sea.instanceMatrix.needsUpdate = true
      if (sea.instanceColor) sea.instanceColor.needsUpdate = true
      sea.computeBoundingSphere()
    }
  }, [data])

  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const d = dome.current
    if (d) d.position.copy(state.camera.position)
    // blend the two nearest chapter moods
    const x = Math.min(CHAPTERS - 0.5, Math.max(0.5, clock.x)) - 0.5
    const i = Math.min(CHAPTERS - 2, Math.floor(x))
    const k = smooth(0.15, 0.85, x - i)
    const a = keyColors[i]
    const b = keyColors[i + 1]
    const u = mat.uniforms
    ;(u.uTop.value as THREE.Color).copy(a.top).lerp(b.top, k)
    ;(u.uMid.value as THREE.Color).copy(a.mid).lerp(b.mid, k)
    ;(u.uBottom.value as THREE.Color).copy(a.bottom).lerp(b.bottom, k)
    ;(u.uGlow.value as THREE.Color).copy(a.glow).lerp(b.glow, k)
    ;(u.uGlowDir.value as THREE.Vector3).copy(a.dir).lerp(b.dir, k).normalize()
    // the clouds pick up the chapter's mood too
    const cm = getCloudMat()
    cm.color.copy(a.cloud).lerp(b.cloud, k)
    cm.emissive.copy(cm.color)

    const t = clock.reduced ? 0 : clock.t
    // plain loops: no closures allocated per frame
    for (let v = 0; v < byVariant.length; v++) {
      const m = floatRefs.current[v]
      if (!m) continue
      const list = byVariant[v]
      for (let n = 0; n < list.length; n++) {
        const f = list[n]
        _o.position.set(f.x + Math.sin(t * 0.05 + f.ph) * 0.8, f.y + Math.sin(t * 0.3 + f.ph) * 0.15, f.z)
        _o.rotation.set(0, 0, 0)
        _o.scale.setScalar(f.s)
        _o.updateMatrix()
        m.setMatrixAt(n, _o.matrix)
      }
      m.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <mesh ref={dome} geometry={domeGeo} material={mat} renderOrder={-100} frustumCulled={false} raycast={noRaycast} />
      <instancedMesh ref={seaRef} args={[getSeaGeo(), getCloudMat(), data.sea.length]} raycast={noRaycast} />
      {byVariant.map((list, v) => (
        <instancedMesh
          key={v}
          ref={(el) => {
            floatRefs.current[v] = el
          }}
          args={[getSkyCloud(v), getCloudMat(), list.length]}
          frustumCulled={false}
          raycast={noRaycast}
        />
      ))}
    </>
  )
}
