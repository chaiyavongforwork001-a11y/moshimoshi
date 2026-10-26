import { useId } from 'react'
import { MOCHI } from '@/lib/colors'
import { t } from '@/lib/i18n'
import type { MochiColor } from '@/lib/types'

/** 'sparkle' = starry excited eyes (the same faces as the 3D mochi) */
export type MochiFace = 'smile' | 'happy' | 'wink' | 'sleepy' | 'talk' | 'wow' | 'sparkle'

interface AvatarProps {
  color: MochiColor
  size?: number
  face?: MochiFace
  online?: boolean
  /** decorative ring, e.g. for hosts ("พี่โมชิ") */
  ring?: boolean
  label?: string
  className?: string
}

/**
 * 2D mochi avatar (SVG) — the same character as the 3D mascot (same face
 * proportions: big glossy eyes ~40% of the width apart, low blush).
 * Blinks on its own; the delay is derived from useId so a list of avatars
 * doesn't blink in unison. The drawing is decorative; "ออนไลน์" is still read
 * out (inside `label` when given, otherwise as sr-only text).
 */
export function Avatar({ color, size = 48, face = 'smile', online, ring, label, className = '' }: AvatarProps) {
  const p = MOCHI[color]
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const blinkDelay = (id.charCodeAt(id.length - 1) % 7) * 0.7
  const status = online ? t('ออนไลน์อยู่', 'online') : undefined
  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label ? (status ? `${label} (${status})` : label) : undefined}
      aria-hidden={label || status ? undefined : true}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible" aria-hidden>
        <defs>
          <radialGradient id={`g${id}`} cx="0.38" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="0.35" stopColor={p.light} />
            <stop offset="0.8" stopColor={p.base} />
            <stop offset="1" stopColor={p.shade} />
          </radialGradient>
          <linearGradient id={`e${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3B2622" />
            <stop offset="1" stopColor="#8A4F48" />
          </linearGradient>
        </defs>
        {ring && <circle cx="50" cy="54" r="49" fill="none" stroke={p.shade} strokeWidth="3" strokeDasharray="4 5" />}
        <ellipse cx="50" cy="92" rx="30" ry="4" fill="#3B2622" opacity="0.08" />
        {/* the 3D mochi's front silhouette: near-straight sides, round shoulders, soft flat base */}
        <path d={BODY} fill={`url(#g${id})`} />
        <ellipse cx="38" cy="30" rx="10" ry="5" fill="#fff" opacity="0.7" transform="rotate(-20 38 30)" />
        <ellipse cx="21" cy="67" rx="7.5" ry="4" fill="#FF8FA3" opacity="0.55" />
        <ellipse cx="79" cy="67" rx="7.5" ry="4" fill="#FF8FA3" opacity="0.55" />
        <Face face={face} blinkDelay={blinkDelay} eyeFill={`url(#e${id})`} />
      </svg>
      {online !== undefined && (
        <span
          className={`absolute right-0 bottom-0.5 rounded-full border-2 border-white ${online ? 'bg-success' : 'bg-ink-faint/50'}`}
          style={{ width: Math.max(10, size * 0.24), height: Math.max(10, size * 0.24) }}
        >
          {status && !label && <span className="sr-only">{status}</span>}
        </span>
      )}
    </span>
  )
}

const BODY =
  'M50 17.5C62.5 17.5 74.5 19.8 81.5 27.5C86.5 33 89 41.5 89.5 50.5L90 76C90 82.5 87.5 86 83 87.3C78 88.5 66 88.5 50 88.5C34 88.5 22 88.5 17 87.3C12.5 86 10 82.5 10 76L10.5 50.5C11 41.5 13.5 33 18.5 27.5C25.5 19.8 37.5 17.5 50 17.5Z'
const INK = '#3B2622'
const MOUTH = '#5C2A2E'
const EYES = [34, 66] as const
const EYE_Y = 60

/** soft four-point sparkle centred on (x, y) */
function star(x: number, y: number, r: number) {
  const k = r * 0.28
  return `M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}z`
}

function Face({ face, blinkDelay, eyeFill }: { face: MochiFace; blinkDelay: number; eyeFill: string }) {
  const blink = { animation: `mochi-blink 5s ${blinkDelay}s infinite`, transformOrigin: 'center', transformBox: 'fill-box' as const }
  const big = face === 'wow' || face === 'sparkle'
  const rx = big ? 8 : 7.2
  const ry = big ? 9.4 : 8.4
  const open = (cx: number) => (
    <g key={cx}>
      <ellipse cx={cx} cy={EYE_Y} rx={rx} ry={ry} fill={eyeFill} />
      {face === 'sparkle' ? (
        <>
          <path d={star(cx - 2.2, EYE_Y - 3, 3.8)} fill="#fff" />
          <path d={star(cx + 2.8, EYE_Y + 3.2, 1.9)} fill="#fff" opacity="0.9" />
        </>
      ) : (
        <>
          <circle cx={cx - 2} cy={EYE_Y - 3} r="2.6" fill="#fff" />
          <circle cx={cx + 2.4} cy={EYE_Y + 2.8} r="1.2" fill="#fff" opacity="0.9" />
        </>
      )}
    </g>
  )
  // ^ closed happy eye
  const arc = (cx: number) => (
    <path key={cx} d={`M${cx - 6} ${EYE_Y + 2}q6-7.5 12 0`} stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
  )
  const eyes =
    face === 'happy' ? (
      EYES.map(arc)
    ) : face === 'sleepy' ? (
      EYES.map((cx) => <path key={cx} d={`M${cx - 6} ${EYE_Y - 1}q6 6 12 0`} stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />)
    ) : face === 'wink' ? (
      <>
        <g style={blink}>{open(EYES[0])}</g>
        {arc(EYES[1])}
      </>
    ) : (
      <g style={blink}>{EYES.map(open)}</g>
    )
  const mouth =
    face === 'talk' || face === 'wow' ? (
      <ellipse cx="50" cy="69" rx="3" ry={face === 'wow' ? 3.8 : 2.8} fill={MOUTH} />
    ) : face === 'sleepy' ? (
      <ellipse cx="50" cy="69" rx="2.2" ry="1.7" fill={MOUTH} />
    ) : face === 'happy' || face === 'sparkle' ? (
      <path d="M45.5 67h9a4.5 4.5 0 0 1-9 0z" fill={MOUTH} />
    ) : (
      <path d="M46 67.5q4 3.6 8 0" stroke={MOUTH} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    )
  return (
    <>
      {eyes}
      {mouth}
    </>
  )
}
