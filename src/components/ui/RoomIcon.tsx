import {
  Building2,
  Coffee,
  Gamepad2,
  HeartHandshake,
  Languages,
  Music,
  Sofa,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { MOCHI } from '@/lib/colors'
import type { Room } from '@/lib/types'

const ICONS: Record<string, LucideIcon> = { Building2, Coffee, Gamepad2, HeartHandshake, Languages, Music, Sofa, Sparkles }

/** Puffy rounded-square room badge. */
export function RoomIcon({ room, size = 48, className = '' }: { room: Room; size?: number; className?: string }) {
  const Icon = ICONS[room.icon] ?? Sparkles
  const p = MOCHI[room.color]
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.36,
        background: `radial-gradient(circle at 35% 30%, #fff 0%, ${p.light} 30%, ${p.base} 75%, ${p.shade} 100%)`,
        boxShadow: `inset 0 -3px 0 ${p.shade}, 0 8px 18px -8px ${p.shade}`,
      }}
      aria-hidden
    >
      <Icon size={size * 0.46} strokeWidth={2.2} color={p.ink} />
    </span>
  )
}
