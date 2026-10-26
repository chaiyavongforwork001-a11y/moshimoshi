// Small building blocks shared by the rooms list and the room page.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarClock, Check, Hand, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Avatar, type MochiFace } from '@/components/ui'
import { usePerson, useSessions } from '@/data/hooks'
import { MOCHI } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { ease, spring } from '@/lib/motion'
import type { MochiColor, Room } from '@/lib/types'
import { nextSession, sessionWhen } from './roomData'

export interface StackPerson {
  id: string
  color: MochiColor
  face?: MochiFace
}

/** Overlapping mochi avatars; new faces pop in, the rest slide over. */
export function AvatarStack({
  people,
  size = 28,
  max = 4,
  ring,
  label,
  className = '',
}: {
  people: StackPerson[]
  size?: number
  max?: number
  ring?: boolean
  label?: string
  className?: string
}) {
  const shown = people.slice(0, max)
  const more = people.length - shown.length
  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {shown.map((p, i) => (
          <motion.span
            key={p.id}
            layout
            initial={{ scale: 0, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={spring.bouncy}
            className="relative inline-flex rounded-full bg-white ring-2 ring-white"
            style={{ marginLeft: i ? -size * 0.32 : 0, zIndex: max - i }}
          >
            <Avatar color={p.color} size={size} face={p.face} ring={ring} />
          </motion.span>
        ))}
      </AnimatePresence>
      {more > 0 && (
        <span
          className="relative inline-flex items-center justify-center rounded-full bg-cream-3 font-display text-[11px] font-semibold text-ink ring-2 ring-white"
          style={{ width: size, height: size, marginLeft: -size * 0.32 }}
        >
          +{more}
        </span>
      )}
    </span>
  )
}

/** Pulsing "on air" dot. */
export function LiveDot({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion()
  return (
    <span className={`relative inline-flex size-2.5 shrink-0 ${className}`} aria-hidden>
      {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-success/50" />}
      <span className="relative inline-flex size-2.5 rounded-full bg-success" />
    </span>
  )
}

/** "กำลังคุย N คน" — or, when nobody is on, when the next session starts (never "0 online"). */
export function PresenceLine({ room, className = '' }: { room: Room; className?: string }) {
  if (room.onlineCount > 0) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm font-semibold text-ink ${className}`}>
        <LiveDot />
        {t(`กำลังคุย ${room.onlineCount} คน`, `${room.onlineCount} chatting now`)}
      </span>
    )
  }
  return <NextSessionLine room={room} className={className} />
}

function NextSessionLine({ room, className }: { room: Room; className: string }) {
  const s = nextSession(room.id, useSessions())
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft ${className}`}>
      <CalendarClock size={15} strokeWidth={2.4} aria-hidden />
      {s ? t(`รอบถัดไป ${sessionWhen(s)}`, `Next session: ${sessionWhen(s)}`) : t(`คึกคักช่วง ${room.primeTime}`, `Busiest ${room.primeTime}`)}
    </span>
  )
}

/** Host pill: ringed avatar + "พี่โมชิ". */
export function HostBadge({ userId, withName = true, className = '' }: { userId?: string; withName?: boolean; className?: string }) {
  const u = usePerson(userId)
  if (!u) return null
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-butter/45 py-0.5 pr-3 pl-0.5 text-xs font-semibold text-ink ${className}`}
    >
      <Avatar color={u.color} size={24} face="happy" ring />
      <span>
        {t('พี่โมชิ', 'Mochi host')}
        {withName && <span className="font-normal text-ink-soft"> · {u.name}</span>}
      </span>
    </span>
  )
}

const BURST = (['peach', 'butter', 'mint', 'lavender', 'sky', 'pink'] as const).map((c) => MOCHI[c].shade)

/** Ring + confetti pop, re-triggered by changing its key. */
function Burst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <motion.span
        className="absolute inset-0 rounded-full border-2 border-coral"
        initial={{ scale: 1, opacity: 0.9 }}
        animate={{ scale: 1.9, opacity: 0 }}
        transition={{ duration: 0.6, ease: ease.out }}
      />
      {BURST.map((c, i) => {
        const a = (i / BURST.length) * Math.PI * 2 - Math.PI / 2
        return (
          <motion.span
            key={c}
            className="absolute top-1/2 left-1/2 -mt-1 -ml-1 size-2 rounded-full"
            style={{ background: c }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(a) * 34, y: Math.sin(a) * 30, scale: 0.2, opacity: 0 }}
            transition={{ duration: 0.65, ease: ease.out }}
          />
        )
      })}
    </span>
  )
}

/**
 * Squishy on/off button with a celebratory pop when switched on.
 * `compact` = round icon-only below md (label stays for screen readers).
 */
export function PopToggle({
  on,
  onToggle,
  labelOn,
  labelOff,
  ariaLabel,
  iconOn = <Check size={18} strokeWidth={2.8} />,
  iconOff = <Plus size={18} strokeWidth={2.8} />,
  compact,
  size = 'md',
  className = '',
}: {
  on: boolean
  onToggle: () => void
  labelOn: string
  labelOff: string
  /** stable accessible name; on/off is conveyed by aria-pressed */
  ariaLabel?: string
  iconOn?: ReactNode
  iconOff?: ReactNode
  compact?: boolean
  size?: 'md' | 'lg'
  className?: string
}) {
  const reduce = useReducedMotion()
  const [burst, setBurst] = useState(0)
  const sizing = size === 'lg' ? 'h-12 px-6 text-[15px]' : compact ? 'h-11 w-11 md:w-auto md:px-4 text-sm' : 'h-11 px-4 text-sm'
  return (
    <motion.button
      type="button"
      aria-pressed={on}
      aria-label={ariaLabel}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!on) setBurst((b) => b + 1)
        onToggle()
      }}
      whileTap={{ scale: 0.88 }}
      initial={false}
      animate={{ scale: on && !reduce ? [1, 1.14, 0.97, 1] : 1 }}
      transition={{ duration: 0.45, ease: ease.out }}
      className={`relative z-10 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-display font-semibold transition-colors ${sizing} ${
        on ? 'bg-mint/70 text-ink shadow-[inset_0_-2px_0_rgb(59_38_34/0.12)]' : 'bg-coral text-ink shadow-[var(--shadow-puffy)] hover:brightness-105'
      } ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={on ? 'on' : 'off'}
          className="inline-flex"
          initial={{ scale: 0, rotate: -70 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 70 }}
          transition={spring.bouncy}
        >
          {on ? iconOn : iconOff}
        </motion.span>
      </AnimatePresence>
      <span className={compact ? 'sr-only md:not-sr-only' : ''}>{on ? labelOn : labelOff}</span>
      {burst > 0 && !reduce && <Burst key={burst} />}
    </motion.button>
  )
}

/** Join / leave a room. */
export function JoinButton({
  room,
  joined,
  onToggle,
  compact,
  size,
  className,
}: {
  room: Room
  joined: boolean
  onToggle: () => void
  compact?: boolean
  size?: 'md' | 'lg'
  className?: string
}) {
  return (
    <PopToggle
      on={joined}
      onToggle={onToggle}
      labelOn={t('อยู่ในห้องแล้ว', "You're in")}
      labelOff={size === 'lg' ? t('เข้าห้องนี้', 'Join this room') : t('เข้าห้อง', 'Join')}
      ariaLabel={t(`เข้าห้อง${room.name}`, `Join ${room.name}`)}
      compact={compact}
      size={size}
      className={className}
    />
  )
}

/** "เหมือนกัน!" reaction — raise a hand with the others. */
export function SameToggle({
  on,
  onToggle,
  people = [],
  count,
  className = '',
}: {
  on: boolean
  onToggle: () => void
  people?: StackPerson[]
  /** show a number instead of faces (daily-question answers) */
  count?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  const p = MOCHI.butter
  const total = count ?? people.length
  return (
    <motion.button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      whileTap={{ scale: 0.88 }}
      initial={false}
      animate={{ scale: on && !reduce ? [1, 1.16, 1] : 1 }}
      transition={{ duration: 0.4, ease: ease.out }}
      className={`relative inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-ink transition-colors after:absolute after:-inset-y-1.5 after:inset-x-0 ${
        on ? '' : 'bg-white/80 ring-1 ring-line'
      } ${className}`}
      style={on ? { background: p.base, boxShadow: `inset 0 -2px 0 ${p.shade}` } : undefined}
    >
      {count === undefined && people.length > 0 && <AvatarStack people={people} size={18} max={3} />}
      <motion.span
        className="inline-flex"
        animate={on && !reduce ? { rotate: [0, -18, 14, 0] } : { rotate: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Hand size={14} strokeWidth={2.4} aria-hidden />
      </motion.span>
      {t('เหมือนกัน!', 'Same!')}
      {count !== undefined && total > 0 && <span className="tabular-nums">{total}</span>}
      {count === undefined && total > 0 && <span className="sr-only">{t(`มี ${total} คนกดแล้ว`, `${total} ${total === 1 ? 'person' : 'people'} tapped this`)}</span>}
    </motion.button>
  )
}
