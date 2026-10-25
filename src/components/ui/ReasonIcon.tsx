import { Clock3, DoorOpen, Gem, MessageCircleHeart, Repeat2, Search, Sparkles, Tags } from 'lucide-react'
import type { MatchReasonKind } from '@/lib/types'

const MAP: Record<MatchReasonKind, { Icon: typeof Gem; bg: string }> = {
  rareTag: { Icon: Gem, bg: 'bg-lavender/40' },
  tag: { Icon: Tags, bg: 'bg-pink/40' },
  intent: { Icon: Search, bg: 'bg-butter/50' },
  swap: { Icon: Repeat2, bg: 'bg-sky/50' },
  prompt: { Icon: MessageCircleHeart, bg: 'bg-peach/50' },
  time: { Icon: Clock3, bg: 'bg-mint/50' },
  room: { Icon: DoorOpen, bg: 'bg-cream-3' },
  style: { Icon: Sparkles, bg: 'bg-butter/40' },
}

export function ReasonIcon({ kind, size = 16 }: { kind: MatchReasonKind; size?: number }) {
  const { Icon, bg } = MAP[kind]
  return (
    <span className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full p-1 ${bg}`} aria-hidden>
      <Icon size={size - 4} strokeWidth={2.4} className="text-ink" />
    </span>
  )
}
