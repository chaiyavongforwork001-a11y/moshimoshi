import type { CSSProperties } from 'react'
import '@/components/motion/sky.css'
import { MOCHI } from '@/lib/colors'
import type { MochiColor } from '@/lib/types'

interface Blob {
  color: MochiColor
  /** peak alpha of the soft fill */
  a: number
  /** width in vmax; height follows `ratio` */
  size: number
  ratio: number
  pos: CSSProperties
  drift: 'a' | 'b' | 'c'
  dur: number
  delay: number
  /** scroll parallax travel */
  depth: string
  /** only on wider screens: phones get four big blobs (fewer large GPU layers) */
  extra?: boolean
}

const BLOBS: Blob[] = [
  { color: 'peach', a: 0.75, size: 74, ratio: 0.82, pos: { top: '-22%', left: '-24%' }, drift: 'a', dur: 26, delay: 0, depth: '-6vh' },
  { color: 'lavender', a: 0.6, size: 62, ratio: 1.15, pos: { top: '16%', right: '-30%' }, drift: 'b', dur: 31, delay: -9, depth: '-14vh' },
  { color: 'butter', a: 0.62, size: 70, ratio: 0.78, pos: { bottom: '-26%', left: '2%' }, drift: 'c', dur: 29, delay: -4, depth: '-9vh' },
  { color: 'mint', a: 0.5, size: 50, ratio: 1.2, pos: { top: '48%', left: '-28%' }, drift: 'b', dur: 24, delay: -15, depth: '-18vh', extra: true },
  { color: 'sky', a: 0.55, size: 46, ratio: 0.9, pos: { top: '-14%', right: '-12%' }, drift: 'c', dur: 35, delay: -20, depth: '-4vh' },
  { color: 'pink', a: 0.5, size: 42, ratio: 1.1, pos: { bottom: '-12%', right: '-10%' }, drift: 'a', dur: 27, delay: -12, depth: '-12vh', extra: true },
]

const BUBBLES = [
  { left: '8%', size: 14, dur: 26, delay: -3 },
  { left: '22%', size: 9, dur: 32, delay: -19 },
  { left: '47%', size: 18, dur: 38, delay: -11 },
  { left: '66%', size: 11, dur: 29, delay: -24 },
  { left: '81%', size: 16, dur: 34, delay: -6 },
  { left: '93%', size: 10, dur: 30, delay: -15 },
]

/** #RRGGBB + alpha → #RRGGBBAA */
const alpha = (hex: string, a: number) =>
  hex +
  Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')

/**
 * "Moshi Sky": a slowly breathing pastel mesh gradient + grain behind
 * everything (CSS only, compositor-friendly, still for reduced motion).
 * Sits below the 3D canvas.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="moshi-sky grain">
      {BLOBS.map((b) => {
        const c = MOCHI[b.color].base
        return (
          <div
            key={b.color}
            className={b.extra ? 'moshi-sky__blob moshi-sky__blob--extra' : 'moshi-sky__blob'}
            style={
              {
                ...b.pos,
                width: `${b.size}vmax`,
                height: `${b.size * b.ratio}vmax`,
                background: `radial-gradient(closest-side, ${alpha(c, b.a)} 0%, ${alpha(c, b.a * 0.55)} 48%, ${alpha(c, 0)} 100%)`,
                '--drift': `sky-drift-${b.drift}`,
                '--dur': `${b.dur}s`,
                '--delay': `${b.delay}s`,
                '--depth': b.depth,
              } as CSSProperties
            }
          />
        )
      })}
      <div className="absolute inset-0">
        {BUBBLES.map((s) => (
          <span
            key={s.left}
            className="moshi-sky__bubble"
            style={{ left: s.left, width: s.size, height: s.size, '--dur': `${s.dur}s`, '--delay': `${s.delay}s` } as CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}
