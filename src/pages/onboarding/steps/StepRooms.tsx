import { AnimatePresence, motion } from 'motion/react'
import { Check, Clock3, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { RoomIcon, TagChip } from '@/components/ui'
import { useRooms } from '@/data/hooks'
import { TAG_BY_ID } from '@/data/tags'
import { MOCHI } from '@/lib/colors'
import { fadeUp, spring } from '@/lib/motion'
import type { Room } from '@/lib/types'
import { lobbyOf, rankRooms, type StepProps } from '../model'
import { keyWiggle } from '../parts/hooks'

export function StepRooms({ draft, update }: StepProps) {
  const rooms = useRooms()
  const ranked = useMemo(() => rankRooms(draft, rooms), [draft, rooms])
  const lobby = lobbyOf(rooms)
  const recommended = new Set(ranked.filter((r) => r.score > 0).slice(0, 2).map((r) => r.room.id))

  const toggle = (id: string) =>
    update((d) => ({ roomsTouched: true, rooms: d.rooms.includes(id) ? d.rooms.filter((r) => r !== id) : [...d.rooms, id] }))

  return (
    <div className="space-y-5">
      <motion.p variants={fadeUp} className="text-sm font-semibold text-ink-soft" aria-live="polite">
        {rooms.length ? `เลือกไว้ ${draft.rooms.length} ห้อง` : 'ยังไม่มีห้องเปิดเลย เดี๋ยวพี่โมชิเปิดห้องแล้วจะชวนนะ ไปต่อได้เลย'}
      </motion.p>
      <div className="grid gap-3 sm:grid-cols-2">
        {lobby && (
          <RoomCard room={lobby} selected={draft.rooms.includes(lobby.id)} onToggle={() => toggle(lobby.id)} note="ห้องรวมของทุกคน แวะมาทักทายได้เสมอ" shared={[]} />
        )}
        {ranked.map(({ room, shared }) => (
          <RoomCard
            key={room.id}
            room={room}
            selected={draft.rooms.includes(room.id)}
            onToggle={() => toggle(room.id)}
            recommended={recommended.has(room.id)}
            shared={shared}
          />
        ))}
      </div>
    </div>
  )
}

interface RoomCardProps {
  room: Room
  selected: boolean
  onToggle: () => void
  recommended?: boolean
  note?: string
  shared: string[]
}

function RoomCard({ room, selected, onToggle, recommended, note, shared }: RoomCardProps) {
  const p = MOCHI[room.color]
  return (
    <motion.button
      type="button"
      variants={fadeUp}
      aria-pressed={selected}
      onClick={onToggle}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -3 }}
      transition={spring.bouncy}
      className={`relative flex h-full w-full flex-col gap-2.5 rounded-[1.75rem] border-2 p-4 text-left transition-colors ${
        selected ? 'shadow-[var(--shadow-lift)]' : 'border-line bg-white/80 shadow-[var(--shadow-soft)] hover:bg-white'
      }`}
      style={selected ? { background: `linear-gradient(160deg, white 0%, ${p.light} 100%)`, borderColor: p.shade } : undefined}
    >
      <span className="flex items-start justify-between gap-3">
        <motion.span animate={{ rotate: selected ? [0, -8, 6, 0] : 0, transition: keyWiggle }}>
          <RoomIcon room={room} size={48} />
        </motion.span>
        {recommended && (
          <span className="mt-1 mr-auto inline-flex h-7 items-center gap-1 rounded-full bg-butter/70 px-2.5 text-xs font-semibold text-ink">
            <Sparkles size={12} aria-hidden /> น่าจะถูกใจ
          </span>
        )}
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors ${selected ? 'border-ink bg-ink text-cream' : 'border-ink/20 bg-white'}`}
          aria-hidden
        >
          <AnimatePresence>
            {selected && (
              <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={spring.bouncy} className="inline-flex">
                <Check size={16} strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </span>

      <span className="block">
        <span className="block font-display text-[17px] leading-normal font-semibold text-ink">{room.name}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{note ?? room.tagline}</span>
      </span>

      {shared.length > 0 && (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-soft">มีเรื่องที่ชอบ</span>
          {shared.slice(0, 3).map((id) => (TAG_BY_ID[id] ? <TagChip key={id} tag={TAG_BY_ID[id]} size="sm" /> : null))}
          {shared.length > 3 && <span className="text-xs font-semibold text-ink-soft">+{shared.length - 3}</span>}
        </span>
      )}

      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-success" aria-hidden />
          ออนไลน์ {room.onlineCount} คน
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 size={12} aria-hidden />
          คึกคักช่วง {room.primeTime}
        </span>
      </span>
    </motion.button>
  )
}
