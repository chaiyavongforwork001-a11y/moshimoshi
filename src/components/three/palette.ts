import * as THREE from 'three'
import { MOCHI } from '@/lib/colors'
import type { MochiColor } from '@/lib/types'

// 3D-only colours, derived from the CSS tokens in src/styles/index.css.
export const INK = '#3B2622'
export const INK_SOFT = '#6E5550'
export const CORAL = '#FF7A6B'
export const BLUSH = '#FF8FA8'
export const SHADOW = '#B8684F'
export const CREAM = '#FFF7EE'

/** accessory colour that reads well on a given body colour */
export function accentFor(body: MochiColor, kind: 'bow' | 'cap' | 'leaf'): string {
  if (kind === 'bow') return body === 'pink' || body === 'peach' ? MOCHI.lavender.shade : CORAL
  if (kind === 'cap') return body === 'sky' ? MOCHI.butter.shade : MOCHI.sky.shade
  return body === 'mint' ? '#3FAF84' : MOCHI.mint.shade
}

const colorCache = new Map<string, THREE.Color>()
/** cached THREE.Color (linear) for a hex string — never mutate the result */
export function col(hex: string): THREE.Color {
  let c = colorCache.get(hex)
  if (!c) {
    c = new THREE.Color(hex)
    colorCache.set(hex, c)
  }
  return c
}

/** resolves a MochiColor name or any CSS colour string */
export function resolveColor(c: string | undefined, fallback: string): string {
  if (!c) return fallback
  return c in MOCHI ? MOCHI[c as MochiColor].shade : c
}
