import type { MochiColor } from '@/lib/types'
import type { MochiAccessory, MochiExpression } from '../Mochi'

/*
 * World map of "Moshi Sky". Every chapter lives at its own spot; the camera
 * flies between them. Offsets inside a chapter are relative to its centre,
 * whose y is the floor the characters stand on. Two framings: `wide`
 * (desktop / landscape) and `compact` (phone portrait, subjects in the
 * upper ~55% so text cards can sit below).
 */
export type V3 = [number, number, number]

export const CENTER: Record<'hero' | 'rooms' | 'signal' | 'circle' | 'listen' | 'call', V3> = {
  hero: [0, 0, 0],
  rooms: [3, 7, -9],
  signal: [13, 9.5, -13],
  circle: [21, 5.5, -8],
  listen: [27, 3.2, -1],
  call: [30, 4.2, 7],
}
const CENTERS = [CENTER.hero, CENTER.rooms, CENTER.signal, CENTER.circle, CENTER.listen, CENTER.call]

export const FOV = 36
/** view offset (fraction of the height) that lifts compact subjects up */
export const COMPACT_SHIFT = 0.2
/** share of the compact frame height the subject must fit in */
export const COMPACT_VIS = 0.6
/** wide framing: the landing's copy sits on the left, so subjects shift right (fraction of the width) */
export const WIDE_SHIFT = 0.23
/** share of the wide frame width the subject must fit in */
export const WIDE_VIS = 0.5

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

// ------------------------------------------------------------------ camera shots
export interface Shot {
  look: V3
  /** direction from the look point to the camera (any length) */
  dir: V3
  /** [halfWidth, halfHeight] of world space kept in frame */
  fit: [number, number]
}

type ShotDef = [look: V3, dir: V3, fit: [number, number]]
// per chapter: hold start (a) and hold end (b) — the camera drifts a → b while text reads
const WIDE: [ShotDef, ShotDef][] = [
  [[[-0.35, 0.62, 0], [-0.1, 0.3, 1], [2.6, 1.8]], [[-0.3, 0.55, 0], [0.1, 0.22, 1], [2.3, 1.55]]],
  [[[0, 1.32, 0], [-0.08, 0.2, 1], [2.95, 3.25]], [[0, 1.28, 0], [0.07, 0.15, 1], [2.8, 3.1]]],
  [[[0, 0.8, 0], [-0.06, 0.14, 1], [2.55, 1.8]], [[0, 0.85, 0], [0.04, 0.1, 1], [2.25, 1.62]]],
  [[[0, 0.8, 0], [0.06, 0.42, 1], [2.45, 1.8]], [[0, 0.75, 0], [0.24, 0.34, 1], [2.2, 1.65]]],
  [[[0, 0.62, 0], [0.2, 0.2, 1], [2.05, 1.6]], [[-0.04, 0.6, 0], [-0.05, 0.15, 1], [1.8, 1.45]]],
  [[[0.15, 0.9, 0], [0, 0.2, 1], [2.6, 1.95]], [[0.15, 1.05, 0], [0, 0.1, 1], [2.4, 1.9]]],
]
const COMPACT: [ShotDef, ShotDef][] = [
  [[[-0.15, 0.6, 0], [-0.06, 0.3, 1], [2.3, 2.25]], [[-0.1, 0.55, 0], [0.08, 0.24, 1], [2.1, 2.05]]],
  [[[0, 0.95, 0], [-0.06, 0.18, 1], [1.95, 2.6]], [[0, 1.4, 0], [0.06, 0.14, 1], [1.85, 2.3]]],
  [[[0, 0.8, 0], [-0.05, 0.14, 1], [2.2, 1.9]], [[0, 0.85, 0], [0.04, 0.1, 1], [1.95, 1.7]]],
  [[[-0.12, 0.8, 0], [0.05, 0.42, 1], [2.2, 1.95]], [[-0.1, 0.75, 0], [0.22, 0.34, 1], [2.0, 1.8]]],
  [[[0, 0.62, 0], [0.18, 0.2, 1], [1.85, 1.75]], [[-0.03, 0.6, 0], [-0.04, 0.15, 1], [1.65, 1.55]]],
  [[[0.05, 0.9, 0], [0, 0.2, 1], [2.15, 2.1]], [[0.05, 1.05, 0], [0, 0.1, 1], [1.95, 1.95]]],
]

export function getShots(compact: boolean): [Shot, Shot][] {
  return (compact ? COMPACT : WIDE).map((pair, i) =>
    pair.map(([look, dir, fit]) => ({ look: add(CENTERS[i], look), dir, fit })) as [Shot, Shot],
  )
}

// ------------------------------------------------------------------ cast
export interface Friend {
  color: MochiColor
  accessory: MochiAccessory
  expression: MochiExpression
}
export const CAST = {
  guide: { color: 'peach', accessory: 'leaf', expression: 'smile' },
  partner: { color: 'lavender', accessory: 'bow', expression: 'smile' },
  listener: { color: 'mint', accessory: 'headset', expression: 'smile' },
  gamer: { color: 'butter', accessory: 'cap', expression: 'happy' },
  sky: { color: 'sky', accessory: 'none', expression: 'smile' },
  pink: { color: 'pink', accessory: 'none', expression: 'happy' },
} satisfies Record<string, Friend>

/** guide (น้องโมชิ on its little cloud) */
export const GUIDE_SCALE = 0.56
export const NIMBUS_SCALE = 0.62
/** nimbus centre height above a floor when it hovers there */
export const HOVER = 0.36

// ------------------------------------------------------------------ rooms
export type RoomKind = 'game' | 'anime' | 'work' | 'music' | 'corner'
export interface IslandSpot {
  kind: RoomKind
  color: MochiColor
  pos: V3
  r: number
  friend: Friend
  /** a secondary room, further back and hazed (the DOM card names the three front ones) */
  far: boolean
}

const ISLANDS: { kind: RoomKind; color: MochiColor; friend: Friend }[] = [
  { kind: 'game', color: 'lavender', friend: CAST.gamer },
  { kind: 'anime', color: 'pink', friend: CAST.pink },
  { kind: 'work', color: 'mint', friend: CAST.sky },
  { kind: 'music', color: 'butter', friend: CAST.partner },
  { kind: 'corner', color: 'peach', friend: CAST.listener },
]
// [position, radius] per ISLANDS entry: game / anime / corner up front (the rooms the
// chapter card lists), work + music small and hazed further back
const ISLAND_POS_WIDE: [V3, number][] = [
  [[-1.75, 2.45, -1.2], 0.9],
  [[1.75, 2.6, -1.5], 0.9],
  [[-2.05, 0.55, -2.2], 0.6],
  [[2.05, 0.65, -2.2], 0.6],
  [[0, 1.3, -0.6], 0.9],
]
const ISLAND_POS_COMPACT: [V3, number][] = [
  [[-1.0, 1.95, -0.9], 0.65],
  [[1.0, 2.05, -1.2], 0.65],
  [[-1.15, 0.3, -2.0], 0.44],
  [[1.15, 0.4, -2.0], 0.44],
  [[0, 0.95, -0.55], 0.66],
]
const FAR: RoomKind[] = ['work', 'music']

export function getIslands(compact: boolean): IslandSpot[] {
  const pos = compact ? ISLAND_POS_COMPACT : ISLAND_POS_WIDE
  return ISLANDS.map((s, i) => ({ ...s, pos: pos[i][0], r: pos[i][1], far: FAR.includes(s.kind) }))
}

export const LOBBY = {
  wide: { pos: [0, -0.95, 1.2] as V3, scale: [1.6, 1, 0.7] as V3, mochi: 0.34, gap: 0.58 },
  compact: { pos: [0, -0.75, 0.9] as V3, scale: [1.3, 1, 0.6] as V3, mochi: 0.28, gap: 0.47 },
}
/** first and spacing of the rooms hops (local chapter progress) */
export const HOP_AT = 0.14
export const HOP_GAP = 0.12

// ------------------------------------------------------------------ guide docks
/** where the guide waits in each chapter; `s` scales it (smaller among the little room islands) */
type Dock = { at: V3; yaw: number; s?: number }
const DOCKS_WIDE: Dock[] = [
  { at: [-1.8, HOVER, 0.4], yaw: 0.4 },
  { at: [1.7, -0.95 + HOVER, 1.0], yaw: -0.35, s: 0.72 },
  { at: [-1.6, 0, 0], yaw: 0.55 },
  { at: [-1.46, HOVER, 0.53], yaw: 0.95 },
  { at: [-0.82, HOVER, 0.34], yaw: 0.5 },
  // finale: in FRONT of the phone, so the handset can come up to its ear
  { at: [-1.55, HOVER, 1.25], yaw: 0.45 },
]
const DOCKS_COMPACT: Dock[] = [
  { at: [-1.1, HOVER, 0.75], yaw: 0.35 },
  { at: [1.2, -0.75 + HOVER, 0.7], yaw: -0.3, s: 0.7 },
  { at: [-1.25, 0, 0], yaw: 0.55 },
  { at: [-1.22, HOVER, 0.44], yaw: 0.95 },
  { at: [-0.64, HOVER, 0.36], yaw: 0.5 },
  { at: [-0.95, HOVER, 1.2], yaw: 0.4, s: 0.88 },
]
export function getDocks(compact: boolean): Required<Dock>[] {
  return (compact ? DOCKS_COMPACT : DOCKS_WIDE).map((d, i) => ({ at: add(CENTERS[i], d.at), yaw: d.yaw, s: d.s ?? 1 }))
}

// ------------------------------------------------------------------ signal
export const SIGNAL = {
  wide: { apart: 1.6, near: 1.05, scale: 0.6, bars: [0, 1.62, -0.25] as V3, barScale: 1 },
  compact: { apart: 1.25, near: 0.98, scale: 0.52, bars: [0, 1.5, -0.25] as V3, barScale: 0.85 },
}
/** clouds glide together over this local range, then the mochi bump */
export const SIGNAL_GLIDE: [number, number] = [0.5, 0.66]

// ------------------------------------------------------------------ circle
export const CIRCLE = {
  wide: { radius: 1.55, floor: 2.55 },
  compact: { radius: 1.3, floor: 2.2 },
}
/** seat angles (deg, counter-clockwise from +x seen from above); the first one is the guide's */
export const CIRCLE_SEATS = [200, 132, 92, 50, -8]
export const CIRCLE_FRIENDS: Friend[] = [CAST.pink, CAST.listener, CAST.gamer, CAST.sky]
