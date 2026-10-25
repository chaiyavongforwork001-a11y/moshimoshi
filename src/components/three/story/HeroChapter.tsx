import { FloatingDeco } from '../FloatingDeco'
import { CUSHION_TOP, PuffyCushion } from '../props'
import { RetroPhone } from '../RetroPhone'
import { FriendMochi, Platform } from './cast'
import { ChapterGroup } from './Jelly'
import { CAST, CENTER, type Friend, type V3 } from './layout'
import { useStoryCtx } from './timeline'

type Spot = { friend: Friend; at: V3; s: number; yaw: number; cushion?: number }
const CUSH = 0.56
// every friend stays clear of the phone's silhouette (and of the guide on the left):
// the listener on a cushion behind-right, the gamer small up front like the hero's sky mochi
const WIDE: Spot[] = [
  { friend: CAST.partner, at: [1.6, 0, 0.75], s: 0.48, yaw: -0.4 },
  { friend: CAST.listener, at: [1.4, 0, -1.2], s: 0.42, yaw: -0.3, cushion: CUSH },
  { friend: CAST.gamer, at: [-0.72, 0, 1.25], s: 0.38, yaw: 0.25 },
]
const COMPACT: Spot[] = [
  { friend: CAST.partner, at: [1.1, 0, 0.85], s: 0.42, yaw: -0.35 },
  { friend: CAST.listener, at: [1.0, 0, -1.1], s: 0.38, yaw: -0.25, cushion: 0.48 },
  { friend: CAST.gamer, at: [-0.4, 0, 1.3], s: 0.33, yaw: 0.2 },
]

/** Opening shot: a smaller recap of the hero — the ringing phone with the gang on a cloud. */
export function HeroChapter() {
  const { compact } = useStoryCtx()
  const spots = compact ? COMPACT : WIDE
  return (
    <ChapterGroup index={0} position={CENTER.hero}>
      <Platform size={compact ? 2.35 : 2.55} depth={0.85} />
      <RetroPhone position={[0, 0, -0.3]} scale={compact ? 0.78 : 0.95} ringing />
      {spots.map((p, i) => {
        const floor = p.cushion ? CUSHION_TOP * p.cushion : 0
        return (
          <group key={p.friend.color}>
            {p.cushion && <PuffyCushion position={p.at} scale={p.cushion} color={i === 1 ? 'butter' : 'lavender'} />}
            <FriendMochi friend={p.friend} scale={p.s} seed={10 + i} chapter={0} from={[p.at[0], floor, p.at[2]]} yaw={p.yaw} bounce sway={0.02} />
          </group>
        )
      })}
      <FloatingDeco
        count={compact ? 12 : 20}
        area={compact ? [5.4, 4.6, 2.5] : [9, 4.4, 3]}
        center={[0, 1.5, -1.6]}
        avoid={compact ? [1.4, 1.1] : [2, 1.3]}
        seed={4}
      />
    </ChapterGroup>
  )
}
