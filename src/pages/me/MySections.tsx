import { AnimatePresence, motion } from 'motion/react'
import { Clock3, Pencil, Plus, Quote, Star, X } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink, Chip, IconButton, RoomIcon, Section, TagChip } from '@/components/ui'
import { useRooms } from '@/data/hooks'
import { PROMPT_BY_ID, TAG_BY_ID } from '@/data/tags'
import { MOCHI } from '@/lib/colors'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import { TEMPLATE_LABEL, WHEN_LABEL } from '@/pages/people/lib'

const EditLink = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink hover:bg-white/70">
    <Pencil size={14} aria-hidden /> {label}
  </button>
)

export function MyTags({ onEdit }: { onEdit: () => void }) {
  const me = useMoshi((s) => s.me)
  const loves = me.tags.filter((t) => me.loves.includes(t))
  const rest = me.tags.filter((t) => !me.loves.includes(t))
  return (
    <Section title="เรื่องที่ชอบ" action={<EditLink onClick={onEdit} label="แก้" />}>
      <motion.ul key={me.tags.join()} variants={stagger(0.03)} initial="hidden" animate="show" className="flex flex-wrap gap-2">
        {[...loves, ...rest].map((t) => {
          const tag = TAG_BY_ID[t]
          if (!tag) return null
          return (
            <motion.li key={t} variants={fadeUp} className="relative">
              <TagChip tag={tag} />
              {me.loves.includes(t) && (
                <span className="absolute -top-1.5 -right-1 flex size-5 items-center justify-center rounded-full bg-butter ring-2 ring-cream">
                  <Star size={11} strokeWidth={2.6} className="fill-white" aria-label="รักมาก" />
                </span>
              )}
            </motion.li>
          )
        })}
      </motion.ul>
      {loves.length > 0 && <p className="mt-2 text-xs text-ink-soft">ติดดาว = รักมาก ช่วยให้เจอคนคลื่นเดียวกันได้แม่นขึ้น</p>}
    </Section>
  )
}

export function MyPrompts() {
  const me = useMoshi((s) => s.me)
  const p = MOCHI[me.color]
  if (!me.prompts.length) return null
  return (
    <Section title="เรื่องเล่าของเรา">
      <ul className="grid gap-3 sm:grid-cols-2">
        {me.prompts.map((pa) => (
          <li
            key={pa.promptId}
            className="relative overflow-hidden rounded-3xl border border-white p-5 shadow-[var(--shadow-soft)]"
            style={{ background: `linear-gradient(150deg, ${p.light} 0%, white 80%)` }}
          >
            <Quote size={44} strokeWidth={1.6} aria-hidden className="absolute -top-1 right-3 text-ink opacity-10" />
            <p className="relative text-sm font-semibold text-ink-soft">{PROMPT_BY_ID[pa.promptId]?.label}</p>
            <p className="relative mt-1.5 font-display text-lg leading-normal text-ink">“{pa.text}”</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function MyIntents() {
  const intents = useMoshi((s) => s.myIntents)
  const remove = useMoshi((s) => s.removeIntent)
  return (
    <Section
      title="กำลังหา"
      action={
        intents.length > 0 && intents.length < 3 ? (
          <Link to="/app/post" className="inline-flex h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ink hover:bg-white/70">
            <Plus size={15} strokeWidth={2.6} aria-hidden /> โพสต์เพิ่ม
          </Link>
        ) : undefined
      }
    >
      {intents.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-3xl border-2 border-dashed border-line bg-white/50 p-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-ink-soft">ยังไม่ได้โพสต์ว่ากำลังหาอะไร บอกสักนิด เพื่อนที่ชอบเหมือนกันจะได้ทักมาง่ายขึ้น</p>
          <ButtonLink to="/app/post" icon={<Plus size={18} strokeWidth={2.6} aria-hidden />}>
            โพสต์กำลังหา
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-3">
          <AnimatePresence initial={false}>
            {intents.map((i) => {
              const tag = TAG_BY_ID[i.tagId]
              return (
                <motion.li
                  key={i.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                  transition={spring.soft}
                  className="card flex items-start gap-3 rounded-3xl p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5">
                      <Chip size="sm" color="butter">
                        {TEMPLATE_LABEL[i.template]}
                      </Chip>
                      {tag && <TagChip tag={tag} size="sm" />}
                      <Chip size="sm" icon={<Clock3 size={12} aria-hidden />}>
                        {i.whenLabel ?? WHEN_LABEL[i.when]}
                      </Chip>
                    </div>
                    <p className="mt-2 font-display text-lg leading-normal">{i.text}</p>
                  </div>
                  <IconButton label={`ลบโพสต์ "${i.text}"`} variant="soft" onClick={() => remove(i.id)}>
                    <X size={18} />
                  </IconButton>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </Section>
  )
}

export function MyRooms() {
  const rooms = useMoshi((s) => s.me.rooms)
  const allRooms = useRooms()
  const list = rooms.flatMap((id) => allRooms.find((r) => r.id === id) ?? [])
  return (
    <Section
      title="ห้องของเรา"
      action={
        <Link to="/app/rooms" className="inline-flex h-11 items-center px-2 text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
          หาห้องใหม่
        </Link>
      }
    >
      {list.length ? (
        <ul className="flex flex-wrap gap-2">
          {list.map((room) => (
            <li key={room.id}>
              <Link
                to={`/app/rooms/${room.id}`}
                className="inline-flex h-14 items-center gap-2.5 rounded-full bg-white py-1.5 pr-4 pl-1.5 font-display font-semibold shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 active:scale-95"
              >
                <RoomIcon room={room} size={42} />
                {room.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-white/70 p-4 text-ink-soft">ยังไม่ได้เข้าห้องไหนเลย ลองเข้าห้องที่ชอบดูสิ มีคนรอคุยอยู่</p>
      )}
    </Section>
  )
}
