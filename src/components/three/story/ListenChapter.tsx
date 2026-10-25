import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { MOCHI } from '@/lib/colors'
import { FloatingDeco } from '../FloatingDeco'
import { MOCHI_FOOT, MOCHI_TOP } from '../mochiGeometry'
import { CUSHION_TOP, getFlatPlane, noRaycast, PuffyCushion } from '../props'
import { SpeechBubble } from '../SpeechBubble'
import { getInstCandy } from './bake'
import { FriendMochi, Platform } from './cast'
import { Floaters, type Floater } from './Floaters'
import { ChapterGroup } from './Jelly'
import { CAST, CENTER } from './layout'
import { getNote, getPoolMaterial } from './shapes'
import { presence, syncClock, useStoryCtx } from './timeline'
import { useViewFrame } from '../viewActive'

/** spotlight source above the pair (relative to the chapter centre) */
export const SPOT_FROM: [number, number, number] = [0.05, 4.2, 0.7]
export const SPOT_TO: [number, number, number] = [0, 0, 0.05]
const BEAM_H = 3.9

const BEAM_VERT = /* glsl */ `
varying float vH;
varying float vEdge;
void main() {
  vH = uv.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vEdge = abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`
const BEAM_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
varying float vH;
varying float vEdge;
void main() {
  float a = smoothstep(0.0, 0.35, vH) * (1.0 - smoothstep(0.82, 1.0, vH)) * pow(vEdge, 1.6);
  gl_FragColor = vec4(uColor * a * uStrength, 1.0);
  #include <colorspace_fragment>
}`

/** soft additive light shaft (fake volumetric, no extra pass) */
function Beam({ wide }: { wide: number }) {
  const { clock } = useStoryCtx()
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: BEAM_VERT,
        fragmentShader: BEAM_FRAG,
        uniforms: { uColor: { value: new THREE.Color('#FFD9A0') }, uStrength: { value: 0.5 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // only the far wall: the shaft glows behind the pair and never washes over them
        side: THREE.BackSide,
        toneMapped: false,
      }),
    [],
  )
  const geo = useMemo(() => new THREE.CylinderGeometry(0.12, wide, BEAM_H, 40, 1, true).translate(0, -BEAM_H / 2, 0), [wide])
  useEffect(() => () => mat.dispose(), [mat])
  useEffect(() => () => geo.dispose(), [geo])
  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    const flick = clock.reduced ? 1 : 1 + Math.sin(clock.t * 1.7) * 0.05 + Math.sin(clock.t * 4.3) * 0.025
    mat.uniforms.uStrength.value = 0.4 * flick * presence(clock, 4)
  })
  return <mesh geometry={geo} material={mat} position={SPOT_FROM} rotation={[0.16, 0, 0]} renderOrder={5} raycast={noRaycast} />
}

const NOTES: Floater[] = [
  { p: [-0.25, 1.15, 0.2], s: 0.11, c: MOCHI.butter.shade, mode: 'rise', ph: 0, amp: 0.9, speed: 0.16 },
  { p: [0.2, 1.3, 0.05], s: 0.09, c: MOCHI.pink.shade, mode: 'rise', ph: 1.3, amp: 0.8, speed: 0.18 },
  { p: [0.0, 1.05, 0.35], s: 0.08, c: MOCHI.mint.shade, mode: 'rise', ph: 2.2, amp: 1, speed: 0.15 },
  { p: [-0.5, 1.2, -0.1], s: 0.07, c: MOCHI.lavender.shade, mode: 'rise', ph: 0.7, amp: 0.85, speed: 0.17 },
]

/**
 * "มีคนรับฟังเสมอ": พี่โมชิ with a headset listens to the guide under a
 * warm spotlight, nodding now and then; tiny notes and sparkles float up.
 */
export function ListenChapter() {
  const { compact, cues } = useStoryCtx()
  const talk = cues((s) => s.talk)
  const big = compact ? { at: [0.6, 0, -0.1] as const, s: 0.74 } : { at: [0.74, 0, -0.12] as const, s: 0.8 }
  const cush = 0.72
  const floor = CUSHION_TOP * cush
  const head = floor + (MOCHI_TOP - MOCHI_FOOT) * big.s

  return (
    <ChapterGroup index={4} position={CENTER.listen}>
      <group>
        <Platform size={compact ? 1.85 : 2.15} depth={0.8} color="cloud" />
        <mesh geometry={getFlatPlane()} material={getPoolMaterial()} position={[0, 0.012, 0.05]} scale={[3, 1, 2.4]} renderOrder={-1} raycast={noRaycast} />
        <PuffyCushion position={[big.at[0], 0, big.at[2]]} scale={cush} color="butter" />
        <FriendMochi
          friend={CAST.listener}
          scale={big.s}
          seed={70}
          chapter={4}
          from={[big.at[0], floor, big.at[2]]}
          yaw={-0.55}
          nod={0.12}
          sway={0.015}
        />
        <Beam wide={compact ? 1.45 : 1.75} />
        <Floaters geometry={getNote()} material={getInstCandy()} items={NOTES} />
        <FloatingDeco
          count={compact ? 8 : 12}
          area={[2.6, 2.4, 1.4]}
          center={[0, 1.6, 0]}
          kinds={['sparkle']}
          colors={['butter', 'peach', 'pink']}
          size={0.6}
          speed={0.5}
          seed={41}
        />
        {talk === 4 && (
          <SpeechBubble
            position={[big.at[0] - 0.2, head + 0.12, big.at[2] + 0.2]}
            text="เล่าให้ฟังได้เลยนะ"
            lines={['เล่าให้ฟังได้เลยนะ', 'เราอยู่ตรงนี้นะ~']}
            side="right"
            color="mint"
            delay={4.2}
            interval={3200}
            rest={3600}
          />
        )}
      </group>
    </ChapterGroup>
  )
}
