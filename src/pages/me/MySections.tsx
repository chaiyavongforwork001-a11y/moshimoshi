import { AnimatePresence, motion } from 'motion/react'
import { Clock3, DoorOpen, Heart, Pencil, Plus, Quote, Search, Star, X } from 'lucide-react'
import { Link } from 'react-router'
import { ButtonLink, Chip, IconButton, RoomIcon, Section, TagChip, zoneAction } from '@/components/ui'
import { useCatalog } from '@/data/catalog'
import { useRooms } from '@/data/hooks'
import { promptKey, promptLabel, tagOf } from '@/data/tags'
import { MOCHI } from '@/lib/colors'
import { known, t } from '@/lib/i18n'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import { TEMPLATE_LABEL, WHEN_LABEL } from '@/pages/people/lib'
import { ReactedBadge } from '@/pages/rooms/bits'

const EditLink = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick} className={zoneAction}>
    <Pencil size={14} aria-hidden /> {label}
  </button>
)

export function MyTags({ onEdit }: { onEdit: () => void }) {
  const me = useMoshi((s) => s.me)
  const loves = me.tags.filter((t) => me.loves.includes(t))
  const rest = me.tags.filter((t) => !me.loves.includes(t))
  return (
    <Section tone="pink" icon={<Heart size={18} strokeWidth={2.4} />} title={t('เรื่องที่ชอบ', 'My interests')} action={<EditLink onClick={onEdit} label={t('แก้', 'Edit')} />}>
      <motion.ul key={me.tags.join()} variants={stagger(0.03)} initial="hidden" animate="show" className="flex flex-wrap gap-2">
        {[...loves, ...rest].map((id) => {
          const tag = tagOf(id)
          if (!tag) return null
          return (
            <motion.li key={id} variants={fadeUp} className="relative max-w-full">
              <TagChip tag={tag} />
              {me.loves.includes(id) && (
                <span className="absolute -top-1.5 -right-1 flex size-5 items-center justify-center rounded-full bg-butter ring-2 ring-cream">
                  <Star size={11} strokeWidth={2.6} className="fill-white" aria-label={t('รักมาก', 'Love it')} />
                </span>
              )}
            </motion.li>
          )
        })}
      </motion.ul>
      {loves.length > 0 && (
        <p className="mt-2 text-xs text-ink-soft">
          {t('ติดดาว = รักมาก ช่วยให้เจอคนคลื่นเดียวกันได้แม่นขึ้น', 'Star = love it. Helps us find people on your wavelength more accurately')}
        </p>
      )}
    </Section>
  )
}

/** who reacted to one story (own keys only: storySames is filled from rows other people wrote) */
const reactedTo = (map: Record<string, string[]>, key: string) => (Object.hasOwn(map, key) ? map[key] : undefined)

export function MyPrompts() {
  const me = useMoshi((s) => s.me)
  const storySames = useCatalog((s) => s.storySames)
  const p = MOCHI[me.color]
  if (!me.prompts.length) return null
  return (
    <Section tone="butter" icon={<Quote size={18} strokeWidth={2.4} />} title={t('เรื่องเล่าของเรา', 'My stories')}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {me.prompts.map((pa, i) => (
          <li
            key={`${pa.promptId}-${i}`}
            className="relative overflow-hidden rounded-3xl border border-white p-5 shadow-[var(--shadow-soft)]"
            style={{ background: `linear-gradient(150deg, ${p.light} 0%, white 80%)` }}
          >
            <Quote size={44} strokeWidth={1.6} aria-hidden className="absolute -top-1 right-3 text-ink opacity-10" />
            <p className="relative text-sm font-semibold text-ink-soft">{promptLabel(pa)}</p>
            <p className="relative mt-1.5 font-display text-lg leading-normal text-ink">“{pa.text}”</p>
            <ReactedBadge ids={reactedTo(storySames, promptKey(pa))} className="relative mt-3" />
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
      tone="mint"
      icon={<Search size={18} strokeWidth={2.4} />}
      title={t('โพสต์หาเพื่อนของเรา', 'My posts')}
      action={
        intents.length > 0 && intents.length < 3 ? (
          <Link to="/app/post" className={zoneAction}>
            <Plus size={15} strokeWidth={2.6} aria-hidden /> {t('โพสต์เพิ่ม', 'New post')}
          </Link>
        ) : undefined
      }
    >
      {intents.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-3xl border-2 border-dashed border-line bg-white/50 p-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-ink-soft">
            {t(
              'ยังไม่มีโพสต์หาเพื่อน บอกสักนิดว่าอยากหาเพื่อนมาทำอะไร คนที่ชอบเหมือนกันจะได้ทักมาง่ายขึ้น',
              "You haven't posted what you're looking for yet. Share a little, so friends who love the same things can say hi more easily",
            )}
          </p>
          <ButtonLink to="/app/post" icon={<Plus size={18} strokeWidth={2.6} aria-hidden />}>
            {t('โพสต์หาเพื่อน', 'Post to find friends')}
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-3">
          <AnimatePresence initial={false}>
            {intents.map((i) => {
              const tag = tagOf(i.tagId)
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
                        {known(i.whenLabel) ?? WHEN_LABEL[i.when]}
                      </Chip>
                    </div>
                    <p className="mt-2 font-display text-lg leading-normal">{i.text}</p>
                    <ReactedBadge kind="metoo" ids={i.joinedBy} className="mt-2" />
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Link
                      to={`/app/post?edit=${i.id}`}
                      aria-label={t(`แก้ไขโพสต์ "${i.text}"`, `Edit post "${i.text}"`)}
                      className="inline-flex size-11 items-center justify-center rounded-full bg-cream-3/70 text-ink hover:bg-cream-3"
                    >
                      <Pencil size={17} />
                    </Link>
                    <IconButton label={t(`ลบโพสต์ "${i.text}"`, `Delete post "${i.text}"`)} variant="soft" onClick={() => remove(i.id)}>
                      <X size={18} />
                    </IconButton>
                  </div>
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
      tone="sky"
      icon={<DoorOpen size={18} strokeWidth={2.4} />}
      title={t('ห้องของเรา', 'My rooms')}
      action={
        <Link to="/app/rooms" className={zoneAction}>
          {t('หาห้องใหม่', 'Find a new room')}
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
        <p className="rounded-2xl bg-white/70 p-4 text-ink-soft">
          {t('ยังไม่ได้เข้าห้องไหนเลย ลองเข้าห้องที่ชอบดูสิ มีคนรอคุยอยู่', "You haven't joined any rooms yet. Try one you like, people are waiting to chat")}
        </p>
      )}
    </Section>
  )
}
