import { useMemo } from 'react'
import { FloatingDeco } from '../FloatingDeco'
import { FriendMochi, Platform } from './cast'
import { ChapterGroup } from './Jelly'
import { CENTER, getIslands, HOP_AT, HOP_GAP, LOBBY, type V3 } from './layout'
import { RoomIsland } from './RoomIsland'
import { useStoryCtx } from './timeline'

// friends leave the lobby centre-out (by lobby slot), one by one
const HOP_ORDER = [2, 1, 3, 0, 4]

/**
 * "เข้าห้องที่ชอบ": five floating room islands (late-night games, anime,
 * work café, music, a cosy listening corner). Friends wait on a lobby
 * cloud and hop onto their favourite room as the chapter scrolls by.
 */
export function RoomsChapter() {
  const { compact } = useStoryCtx()
  const islands = useMemo(() => getIslands(compact), [compact])
  const lobby = compact ? LOBBY.compact : LOBBY.wide
  const hops = useMemo(() => {
    // each friend waits in the lobby slot under its island (left to right), so no paths cross
    const order = islands.map((s, k) => ({ x: s.pos[0], k })).sort((a, b) => a.x - b.x)
    return islands.map((s, k) => {
      const slot = order.findIndex((o) => o.k === k)
      const from: V3 = [lobby.pos[0] + (slot - 2) * lobby.gap, lobby.pos[1], lobby.pos[2] + (slot % 2 ? -0.08 : 0.06)]
      const to: V3 = [s.pos[0] + 0.02 * s.r, s.pos[1], s.pos[2] + 0.34 * s.r]
      const dist = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2])
      return { from, to, slot, height: 0.7 + dist * 0.16, at: HOP_AT + HOP_ORDER.indexOf(slot) * HOP_GAP, duration: 0.6 + dist * 0.04 }
    })
  }, [islands, lobby])
  const half = compact ? 2.4 : 6.4

  return (
    <ChapterGroup index={1} position={CENTER.rooms}>
      {islands.map((s) => (
        <RoomIsland key={s.kind} spot={s} />
      ))}
      <Platform position={lobby.pos} scale={lobby.scale} />
      {islands.map((s, k) => (
        <FriendMochi
          key={s.kind}
          friend={s.friend}
          scale={lobby.mochi}
          seed={30 + k}
          chapter={1}
          from={hops[k].from}
          to={hops[k].to}
          at={hops[k].at}
          height={hops[k].height}
          duration={hops[k].duration}
          yaw={(2 - hops[k].slot) * 0.12}
          toYaw={-s.pos[0] * 0.04}
          sway={0.03}
        />
      ))}
      <FloatingDeco
        count={compact ? 12 : 22}
        area={[half * 2, compact ? 5 : 4.5, 3]}
        center={[0, compact ? 1.2 : 0.6, -2.4]}
        kinds={['sparkle', 'bubble']}
        seed={12}
        size={0.9}
      />
    </ChapterGroup>
  )
}
