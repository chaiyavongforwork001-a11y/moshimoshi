import { useThree } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { SoftLights } from '../Lights'
import { CallChapter } from './CallChapter'
import { CircleChapter, LANTERN_AT } from './CircleChapter'
import { Guide } from './Guide'
import { HeroChapter } from './HeroChapter'
import { add, CENTER } from './layout'
import { ListenChapter, SPOT_FROM, SPOT_TO } from './ListenChapter'
import { RoomsChapter } from './RoomsChapter'
import { SignalChapter } from './SignalChapter'
import { Sky } from './Sky'
import { StoryCamera } from './StoryCamera'
import { makeClock, presence, StoryContext, syncClock, useStoryCtx, type StoryCtx } from './timeline'
import { useViewFrame } from '../viewActive'
import { createCues, stepCues } from './cues'

/**
 * The warm lights of the evening chapters. They always exist (toggling a
 * light's visibility would recompile every material); only their
 * intensity follows the chapter's presence.
 */
function StoryLights() {
  const ctx = useMemo(() => ({ lantern: add(CENTER.circle, LANTERN_AT), from: add(CENTER.listen, SPOT_FROM), to: add(CENTER.listen, SPOT_TO) }), [])
  const target = useMemo(() => new THREE.Object3D(), [])
  const lantern = useRef<THREE.PointLight>(null)
  const spot = useRef<THREE.SpotLight>(null)
  const { clock, cues } = useStoryCtx()
  useViewFrame((state, delta) => {
    syncClock(clock, state, delta)
    stepCues(cues, clock)
    const t = clock.reduced ? 0 : clock.t
    const flick = 1 + Math.sin(t * 2.3) * 0.06 + Math.sin(t * 6.1) * 0.03
    if (lantern.current) lantern.current.intensity = 3 * flick * presence(clock, 3)
    if (spot.current) spot.current.intensity = 7 * presence(clock, 4)
  })
  return (
    <>
      <pointLight ref={lantern} position={ctx.lantern} color="#FFB56B" intensity={0} distance={6} decay={2} />
      <primitive object={target} position={ctx.to} />
      <spotLight ref={spot} position={ctx.from} target={target} color="#FFD49A" intensity={0} angle={0.42} penumbra={0.9} distance={10} decay={2} />
    </>
  )
}

/**
 * Scroll-driven landing story — ONE persistent scene in a sticky
 * full-viewport View3D. The landing writes scroll progress to useStory;
 * the camera flies a smooth path through six chapters of "Moshi Sky"
 * (hero → rooms → signal → circle → listen → call) while น้องโมชิ rides
 * its little cloud alongside. Far chapters are hidden to save draw calls.
 * `compact` = phone portrait framing (subjects in the upper ~55%).
 */
export function StoryScene({ compact = false }: { compact?: boolean }) {
  const reduced = useReducedMotion() ?? false
  const [clock] = useState(() => makeClock(reduced))
  const [cues] = useState(createCues)
  const ctx = useMemo<StoryCtx>(() => ({ clock, compact, cues }), [clock, compact, cues])
  useEffect(() => {
    clock.reduced = reduced
  }, [clock, reduced])
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __storyScene: scene, __storyClock: clock })
  }, [scene, clock])

  // pre-compile every program (hidden chapters included: three's compile traverses all
  // materials) while the visitor is still in the sections above, so entering the story
  // and each chapter's pop-in never stall on a shader compile
  const get = useThree((s) => s.get)
  useEffect(() => {
    let alive = true
    const run = () => {
      if (!alive) return
      const s = get()
      s.gl.compileAsync(s.scene, s.camera).catch(() => {})
    }
    const idle = 'requestIdleCallback' in window
    const id = idle ? window.requestIdleCallback(run, { timeout: 800 }) : window.setTimeout(run, 200)
    return () => {
      alive = false
      if (idle) window.cancelIdleCallback(id)
      else window.clearTimeout(id)
    }
  }, [get, compact])

  return (
    <StoryContext.Provider value={ctx}>
      <StoryCamera compact={compact} />
      <SoftLights />
      <StoryLights />
      <Sky />
      <HeroChapter />
      <RoomsChapter />
      <SignalChapter />
      <CircleChapter />
      <ListenChapter />
      <CallChapter />
      <Guide />
    </StoryContext.Provider>
  )
}
