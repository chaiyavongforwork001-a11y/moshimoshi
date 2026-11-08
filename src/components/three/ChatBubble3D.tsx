import type { ThreeElements } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import * as THREE from 'three'
import { MOCHI } from '@/lib/colors'
import type { MochiColor } from '@/lib/types'
import { BlobShadow, getClay, noRaycast } from './props'
import { useViewFrame } from './viewActive'

const DEPTH = 0.3
const BEVEL = 0.22
/** front face of the extruded bubble (after centring), where the dots sit */
const FRONT = DEPTH / 2 + BEVEL
const DOTS = [-0.52, 0, 0.52]

let geo: { bubble: THREE.BufferGeometry; dot: THREE.SphereGeometry } | null = null
function getGeo() {
  if (geo) return geo
  // a puffy rounded speech bubble with a little tail at the bottom left
  const w = 1.3
  const h = 0.86
  const r = 0.62
  // clockwise from the top-left corner; the tail leaves the bottom edge and points down-left
  const s = new THREE.Shape()
  s.moveTo(-w + r, h)
  s.lineTo(w - r, h)
  s.quadraticCurveTo(w, h, w, h - r)
  s.lineTo(w, -h + r)
  s.quadraticCurveTo(w, -h, w - r, -h)
  s.lineTo(-0.2, -h)
  s.quadraticCurveTo(-0.3, -h - 0.35, -0.95, -h - 0.5) // tail out to its tip
  s.quadraticCurveTo(-0.62, -h - 0.25, -0.6, -h) // and back to the edge
  s.lineTo(-w + r, -h)
  s.quadraticCurveTo(-w, -h, -w, -h + r)
  s.lineTo(-w, h - r)
  s.quadraticCurveTo(-w, h, -w + r, h)
  const bubble = new THREE.ExtrudeGeometry(s, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: 0.2,
    bevelSegments: 5,
    curveSegments: 20,
  })
  bubble.translate(0, 0, -DEPTH / 2)
  geo = { bubble, dot: new THREE.SphereGeometry(0.17, 20, 14) }
  return geo
}

/**
 * A big puffy chat bubble with "typing" dots: the 3D stand-in for "a message is on its way"
 * (it replaced the ringing phone, so nobody mistakes a hello for a call).
 */
export function ChatBubble3D({ color = 'pink', ...group }: ThreeElements['group'] & { color?: MochiColor }) {
  const g = getGeo()
  const reduced = useReducedMotion() ?? false
  const body = useRef<THREE.Group>(null)
  const dots = useRef<(THREE.Mesh | null)[]>([])
  const p = MOCHI[color]

  useViewFrame((state) => {
    if (reduced) return
    const t = state.clock.elapsedTime
    const b = body.current
    if (b) {
      b.position.y = 1.15 + Math.sin(t * 1.6) * 0.07
      b.rotation.z = Math.sin(t * 0.9) * 0.05
      b.rotation.y = Math.sin(t * 0.6) * 0.12
    }
    // the typing wave: each dot hops in turn
    dots.current.forEach((d, i) => {
      if (!d) return
      const k = Math.max(0, Math.sin(t * 5 - i * 0.9))
      d.position.y = 0.04 + k * 0.16
      d.scale.setScalar(1 + k * 0.12)
    })
  })

  return (
    <group {...group}>
      <BlobShadow position={[0, 0.005, 0]} size={[2.6, 1.3]} opacity={0.26} />
      <group ref={body} position={[0, 1.15, 0]}>
        <mesh geometry={g.bubble} material={getClay(p.base)} raycast={noRaycast} />
        {DOTS.map((x, i) => (
          <mesh
            key={x}
            ref={(m) => {
              dots.current[i] = m
            }}
            geometry={g.dot}
            material={getClay(i === 1 ? p.shade : '#FFFFFF')}
            position={[x, 0.04, FRONT + 0.04]}
            scale={[1, 1, 0.55]}
            raycast={noRaycast}
          />
        ))}
      </group>
    </group>
  )
}
