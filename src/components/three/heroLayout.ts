import { L, type Txt } from '@/lib/i18n'
import type { MochiColor } from '@/lib/types'
import { CLOUD_SEAT } from './clouds'
import type { FrameSphere } from './Lights'
import type { MochiAccessory, MochiFaceExpression } from './Mochi'
import { MOCHI_FOOT } from './mochiGeometry'

/*
 * Landing hero layouts (world units). Two compositions:
 * - WIDE: phone on a cloud island with friends around it in a ring, for the
 *   right side of a landscape screen (the headline sits on the left)
 * - TALL: the same cast packed into a square-ish group for the upper half
 *   of a portrait screen (the lower ~45% stays calm for the copy)
 * Every important thing is listed as a bounding sphere, and ViewCamera fits
 * those spheres into a screen region with true perspective, so nothing is
 * ever cropped between 9:19 and 21:9.
 */
export type V3 = [number, number, number]
export type Rect = [number, number, number, number]

export interface HeroBubble {
  /** tail tip, in the mochi's own (unscaled) space */
  at: V3
  side: 'left' | 'right'
  /** read with tx() when rendering (layouts are built once, at module load) */
  lines: Txt[]
  delay: number
}

export interface HeroFriend {
  color: MochiColor
  accessory?: MochiAccessory
  expression: MochiFaceExpression
  /** standing friends: [x, -, z] on the island; floating friends: cushion centre */
  position: V3
  scale: number
  rotationY?: number
  /** sits on a floating cloud cushion of this colour and size */
  cushion?: { color: MochiColor; scale: number }
  draggable?: boolean
  wave?: boolean
  omega?: boolean
  bubble?: HeroBubble
}

export interface Island {
  x: number
  y: number
  z: number
  s: number
}

export interface HeroLayout {
  island: Island
  phone: { x: number; z: number; scale: number }
  friends: HeroFriend[]
  /** where to aim the warm halo */
  glow: { y: number; scale: number }
  deco: { count: number; area: V3; center: V3; avoid: [number, number] }
  /** bubble rhythm (ms): each appearance types, shows one line for `interval`, then hides for `rest` */
  timing: { interval: number; rest: number }
}

const LINES = {
  peach: [L('โมชิโมชิ~ มาคุยกันไหม', 'Moshi moshi~ wanna chat?'), L('วันนี้เป็นไงบ้าง เล่าให้ฟังหน่อย', 'How was your day? Tell me!')],
  mint: [L('คืนนี้ใครว่างเล่นเกมบ้าง~', "Who's up for games tonight~"), L('ห้องสายชิลก็มีนะ', "There's a chill room too!")],
  pink: [L('ยินดีที่ได้รู้จักนะ!', 'So nice to meet you!'), L('ดูอนิเมะเรื่องไหนอยู่~', 'What anime are you on~')],
  butter: [L('ไปคาเฟ่ด้วยกันไหม', 'Café date, anyone?'), L('เพลงนี้ดีมากเลย!', 'This song is so good!')],
}

// wide: each line stays 3.6 s, then the bubble rests 5.2 s (a 9.75 s cycle with typing);
// about two friends talk at once — a lively chat, never a wall of text
const TIMING_WIDE = { interval: 3600, rest: 5200 }
// tall: the two front bubbles (and the two top ones) point at the same middle spot,
// so each pair takes strict turns: visible 4.35 s of a 10.35 s cycle, partners half a cycle apart
const TIMING_TALL = { interval: 3400, rest: 6000 }

/** height of the island's soft dome at (x, z) — friends stand on it */
export function onIsland(I: Island, x: number, z: number) {
  const u = (x - I.x) / I.s
  const v = (z - I.z) / (0.86 * I.s)
  return I.y + 0.34 * I.s * Math.sqrt(Math.max(0, 1 - u * u - v * v)) - 0.02
}

/** y of a mochi's centre when its base stands at 0 */
export const ground = (scale: number) => -MOCHI_FOOT * scale

export const WIDE: HeroLayout = {
  island: { x: 0.05, y: -0.72, z: 0.15, s: 2.85 },
  phone: { x: 0.05, z: -0.25, scale: 1.2 },
  friends: [
    {
      color: 'peach',
      expression: 'smile',
      position: [-1.5, 0, 0.85],
      scale: 0.95,
      rotationY: 0.32,
      draggable: true,
      wave: true,
      bubble: { at: [-0.35, 1.12, 0.3], side: 'right', lines: LINES.peach, delay: 0.6 },
    },
    {
      color: 'mint',
      accessory: 'headset',
      expression: 'talk',
      position: [1.6, 0, 0.66],
      scale: 0.88,
      rotationY: -0.34,
      draggable: true,
      bubble: { at: [-0.45, 1.12, 0.3], side: 'right', lines: LINES.mint, delay: 7.8 },
    },
    {
      color: 'sky',
      expression: 'smile',
      position: [-0.2, 0, 1.68],
      scale: 0.44,
      rotationY: 0.12,
      draggable: true,
      omega: true,
    },
    {
      color: 'pink',
      expression: 'happy',
      position: [-1.6, 2.25, -1.6],
      scale: 0.5,
      rotationY: 0.3,
      cushion: { color: 'pink', scale: 0.8 },
      // the two cushion bubbles point at the same middle spot: strict turns, half a cycle apart
      bubble: { at: [0.62, 0.95, 0.3], side: 'left', lines: LINES.pink, delay: 7.3 },
    },
    {
      color: 'butter',
      expression: 'sparkle',
      position: [1.65, 2.5, -1.8],
      scale: 0.48,
      rotationY: -0.3,
      cushion: { color: 'sky', scale: 0.78 },
      bubble: { at: [-0.62, 0.95, 0.3], side: 'right', lines: LINES.butter, delay: 2.4 },
    },
  ],
  glow: { y: 1.6, scale: 9 },
  deco: { count: 22, area: [7.5, 5.5, 3], center: [0.1, 1.9, -1.8], avoid: [1.7, 1.4] },
  timing: TIMING_WIDE,
}

export const TALL: HeroLayout = {
  island: { x: 0, y: -0.72, z: 0.15, s: 2.3 },
  phone: { x: 0, z: -0.3, scale: 0.92 },
  friends: [
    {
      color: 'peach',
      expression: 'smile',
      position: [-1.12, 0, 0.78],
      scale: 0.58,
      rotationY: 0.3,
      draggable: true,
      wave: true,
      bubble: { at: [0.3, 1.14, 0.3], side: 'left', lines: LINES.peach, delay: 0.6 },
    },
    {
      color: 'mint',
      accessory: 'headset',
      expression: 'talk',
      position: [1.14, 0, 0.66],
      scale: 0.54,
      rotationY: -0.3,
      draggable: true,
      bubble: { at: [-0.3, 1.14, 0.3], side: 'right', lines: LINES.mint, delay: 5.8 },
    },
    {
      color: 'sky',
      expression: 'smile',
      position: [-0.2, 0, 1.55],
      scale: 0.33,
      rotationY: 0.1,
      omega: true,
    },
    {
      color: 'pink',
      expression: 'happy',
      position: [-1.0, 2.1, -1.2],
      scale: 0.45,
      rotationY: 0.28,
      cushion: { color: 'pink', scale: 0.72 },
      bubble: { at: [0.6, 0.9, 0.3], side: 'left', lines: LINES.pink, delay: 8.4 },
    },
    {
      color: 'butter',
      expression: 'sparkle',
      position: [1.02, 2.4, -1.45],
      scale: 0.43,
      rotationY: -0.28,
      cushion: { color: 'sky', scale: 0.7 },
      bubble: { at: [-0.6, 0.9, 0.3], side: 'right', lines: LINES.butter, delay: 3.2 },
    },
  ],
  glow: { y: 1.4, scale: 6.5 },
  deco: { count: 14, area: [4.8, 4.4, 2.5], center: [0, 1.7, -1.8], avoid: [1.3, 1.2] },
  timing: TIMING_TALL,
}

/** bounding spheres of the phone and every friend (+ cushions) */
export function frameSpheres(L: HeroLayout): FrameSphere[] {
  const { island, phone } = L
  const out: FrameSphere[] = []
  const py = onIsland(island, phone.x, phone.z)
  out.push([phone.x, py + 0.86 * phone.scale, phone.z, 1.12 * phone.scale])
  for (const f of L.friends) {
    const [x, y, z] = f.position
    if (f.cushion) {
      const cs = f.cushion.scale
      out.push([x, y, z, 1.22 * cs])
      out.push([x, y + CLOUD_SEAT * cs + 0.9 * f.scale, z + 0.2 * f.scale, 1.2 * f.scale])
    } else {
      const base = onIsland(island, x, z)
      out.push([x, base + 0.9 * f.scale, z + 0.2 * f.scale, 1.2 * f.scale])
    }
  }
  return out
}

/*
 * Screen regions (NDC) for the subject. The landing copy sits bottom-left
 * (lg+) or along the bottom (phones/tablets); the nav takes the top ~10%.
 */
const R_TALL: Rect = [-0.93, -0.05, 0.93, 0.75]
// landscape tablets: the big copy leaves only the upper right
const R_COMPACT: Rect = [0.18, -0.3, 0.96, 0.76]

/**
 * NDC x where the lg hero headline ends, for a full-bleed view `width` px wide
 * (mirrors Hero.tsx: max-w-7xl container, lg:px-12, text-[clamp(3.25rem,5.2vw,5.6rem)],
 * the longest line is ~7.7 em wide). About -0.03 at 1440 px, 0.10 at 1920 px.
 */
function copyEdge(width: number) {
  const w = Math.max(1, width)
  const font = Math.min(89.6, Math.max(52, 0.052 * w))
  const right = Math.max(0, (w - 1280) / 2) + 48 + 7.7 * font
  return (right / w) * 2 - 1
}

/** desktop: the right side, starting just past the headline (so the cast is as big as it can be) */
function wideRegion(width: number): Rect {
  return [Math.min(0.3, Math.max(0.02, copyEdge(width) + 0.06)), -0.82, 0.98, 0.72]
}

export function regionFor(tall: boolean, compact: boolean, width: number): Rect {
  if (tall) return R_TALL
  return compact ? R_COMPACT : wideRegion(width)
}
