import { motion } from 'motion/react'
import {
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Ear,
  Gamepad2,
  Globe2,
  Languages,
  MapPin,
  MessageCircle,
  Plus,
  Quote,
  Sprout,
  Star,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { Avatar, Chip, RoomIcon, Section, SignalDetail, TagChip, WaveMatch } from '@/components/ui'
import { useIntents, usePeople, useRooms } from '@/data/hooks'
import { PROMPT_BY_ID, TAG_BY_ID } from '@/data/tags'
import { MOCHI } from '@/lib/colors'
import { known, L, t, tx, type Txt } from '@/lib/i18n'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Intent, IntentTemplate, MatchResult, SignalLevel, User } from '@/lib/types'
import { SameButton } from '@/pages/chats/SameButton'
import { TEMPLATE_LABEL, WHEN_LABEL } from '../lib'

const WAVE_CAPTION: Record<SignalLevel, Txt> = {
  1: L('คลื่นยังห่างกันนิดนึง แต่คุยไปคุยมาอาจจูนเข้าหากันก็ได้', 'Your waves are a little apart for now, but a few chats might tune them together'),
  2: L('มีช่วงที่คลื่นแตะกันอยู่บ้าง ลองเริ่มจากเรื่องที่ชอบเหมือนกัน', 'Your waves touch here and there. Start with something you both like'),
  3: L('คลื่นเริ่มขยับมาใกล้กันแล้ว คุยกันไม่เงียบแน่', 'Your waves are drifting closer. No awkward silences here'),
  4: L('สองคลื่นวิ่งไปทางเดียวกันเกือบตลอด', 'Your two waves run side by side almost all the way'),
  5: L('สองคลื่นแทบทับกันเป๊ะ เหมือนรู้จักกันมานาน', "Your waves practically overlap, like you've known each other for ages"),
}

/** "สัญญาณถูกคอ" — the graded scale, the reasons and the two waves lining up. */
export function MatchBlock({ match, user }: { match: MatchResult; user: User }) {
  return (
    <Section title={t('สัญญาณถูกคอ', 'Vibe signal')}>
      <div className="grid gap-3">
        <SignalDetail match={match} className="card" />
        <div className="card overflow-hidden rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display font-semibold">{t(`คลื่นของเรากับ${user.name}`, `Your wave and ${user.name}'s`)}</p>
            <div className="flex items-center gap-3 text-xs text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-5 rounded-full bg-linear-to-r from-lavender to-sky" aria-hidden />
                {t('เรา', 'You')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-5 rounded-full bg-linear-to-r from-pink to-coral" aria-hidden />
                {user.name}
              </span>
            </div>
          </div>
          <WaveMatch level={match.level} height={72} className="mt-2" />
          <p className="mt-1 text-sm text-ink-soft">{tx(WAVE_CAPTION[match.level])}</p>
        </div>
      </div>
    </Section>
  )
}

export function TagsBlock({ match, user }: { match: MatchResult; user: User }) {
  const shared = new Set(match.sharedTags.map((s) => s.tag.id))
  const others = user.tags.filter((id) => !shared.has(id) && TAG_BY_ID[id])
  return (
    <Section title={t('ชอบเหมือนกัน', 'You both like')}>
      {match.sharedTags.length ? (
        <motion.div variants={stagger(0.04)} initial="hidden" whileInView="show" viewport={{ once: true }} className="flex flex-wrap gap-2">
          {match.sharedTags.map((s) => (
            <motion.span key={s.tag.id} variants={fadeUp}>
              <TagChip tag={s.tag} rare={s.rare} />
            </motion.span>
          ))}
        </motion.div>
      ) : (
        <p className="rounded-2xl bg-white/70 p-4 text-ink-soft">
          {t('ยังไม่มีเรื่องที่ชอบตรงกันเป๊ะ ลองชวนคุยเรื่องใหม่ๆ ดูสิ อาจได้เปิดโลก', 'No exact matches yet. Try chatting about something new, it might open up a whole new world')}
        </p>
      )}
      {match.sharedTags.some((s) => s.rare) && (
        <p className="mt-2 text-xs text-ink-soft">
          {t('เรื่องที่มีอัญมณี คือเรื่องที่ไม่ค่อยมีใครชอบ เจอคนชอบเหมือนกันถือว่าโชคดีนะ', 'A gem marks something few people like. Finding someone who likes it too is lucky!')}
        </p>
      )}
      {others.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-sm font-semibold text-ink-soft">{t(`เรื่องอื่นที่${user.name}ชอบ`, `Other things ${user.name} likes`)}</h3>
          <div className="flex flex-wrap gap-1.5">
            {others.map((id) => (
              <Chip key={id} size="sm" icon={user.loves.includes(id) ? <Star size={12} strokeWidth={2.6} className="fill-butter" aria-label={t('รักมาก', 'Love it')} /> : undefined}>
                {TAG_BY_ID[id].label}
              </Chip>
            ))}
          </div>
        </>
      )}
    </Section>
  )
}

export function PromptsBlock({ user }: { user: User }) {
  const sames = useMoshi((s) => s.sames)
  const toggleSame = useMoshi((s) => s.toggleSame)
  const p = MOCHI[user.color]
  if (!user.prompts.length) return null
  return (
    <Section title={t(`เรื่องเล่าของ${user.name}`, `${user.name}'s stories`)}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {user.prompts.map((pa, i) => {
          const id = `prompt:${user.id}:${pa.promptId}`
          return (
            <motion.li
              key={pa.promptId}
              initial={{ opacity: 0, y: 18, rotate: i % 2 ? 1.2 : -1.2 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ ...spring.soft, delay: i * 0.06 }}
              className="relative flex flex-col overflow-hidden rounded-3xl border border-white p-5 shadow-[var(--shadow-soft)]"
              style={{ background: `linear-gradient(150deg, ${p.light} 0%, white 80%)` }}
            >
              <Quote size={44} strokeWidth={1.6} aria-hidden className="absolute -top-1 right-3 text-ink opacity-10" />
              <p className="relative text-sm font-semibold text-ink-soft">{PROMPT_BY_ID[pa.promptId]?.label ?? t('เล่าให้ฟังหน่อย', 'Tell us something')}</p>
              <p id={id} className="relative mt-1.5 font-display text-lg leading-normal text-ink">
                “{pa.text}”
              </p>
              <div className="relative mt-auto pt-2">
                <SameButton active={sames.includes(id)} onToggle={() => toggleSame(id)} describedBy={id} />
              </div>
            </motion.li>
          )
        })}
      </ul>
    </Section>
  )
}

const TEMPLATE_ICON: Record<IntentTemplate, LucideIcon> = {
  play: Gamepad2,
  talk: MessageCircle,
  lang: Languages,
  event: CalendarDays,
  newbie: Sprout,
  study: BookOpen,
  moved: Truck,
  listen: Ear,
}

export function IntentsBlock({ user }: { user: User }) {
  const intents = useIntents({ userId: user.id })
  if (!intents.length) return null
  return (
    <Section title={t(`${user.name}กำลังหา`, `${user.name} is looking for`)}>
      <ul className="grid gap-3">
        {intents.map((i) => (
          <IntentCard key={i.id} intent={i} />
        ))}
      </ul>
    </Section>
  )
}

function IntentCard({ intent }: { intent: Intent }) {
  const joined = useMoshi((s) => s.joinedIntentIds.includes(intent.id))
  const toggle = useMoshi((s) => s.toggleJoinIntent)
  const color = useMoshi((s) => s.me.color)
  const people = usePeople()
  const Icon = TEMPLATE_ICON[intent.template]
  const tag = TAG_BY_ID[intent.tagId]
  const others = useMemo(
    () => intent.joinedBy.flatMap((id) => people.find((u) => u.id === id) ?? []),
    [intent.joinedBy, people],
  )
  return (
    <li className="card rounded-3xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip size="sm" color="butter" icon={<Icon size={13} strokeWidth={2.4} aria-hidden />}>
          {TEMPLATE_LABEL[intent.template]}
        </Chip>
        {tag && <TagChip tag={tag} size="sm" />}
        <Chip size="sm" icon={<Clock3 size={13} aria-hidden />}>
          {known(intent.whenLabel) ?? WHEN_LABEL[intent.when]}
        </Chip>
      </div>
      <p className="mt-2.5 font-display text-lg leading-normal text-ink">{intent.text}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-1">
          {intent.mode === 'online' ? <Globe2 size={14} aria-hidden /> : <MapPin size={14} aria-hidden />}
          {intent.mode === 'online'
            ? t('ออนไลน์', 'Online')
            : t(`เจอกันที่${intent.province ?? 'นัดกันในวง'}`, intent.province ? `Meet in ${known(intent.province)}` : 'Place TBD in the group')}
        </span>
        {intent.slots != null && (
          <span className="inline-flex items-center gap-1">
            <Users size={14} aria-hidden />
            {t(`ว่างอีก ${intent.slots} ที่`, `${intent.slots} ${intent.slots === 1 ? 'spot' : 'spots'} left`)}
          </span>
        )}
        {intent.give && <span>{t('ให้ได้:', 'Can offer:')} {intent.give}</span>}
        {intent.want && <span>{t('อยากได้:', 'Wants:')} {intent.want}</span>}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center">
          {others.slice(0, 3).map((u) => (
            <Avatar key={u.id} color={u.color} size={28} className="-mr-2 rounded-full ring-2 ring-white" />
          ))}
          {joined && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className="-mr-2 rounded-full ring-2 ring-white">
              <Avatar color={color} size={28} face="happy" />
            </motion.span>
          )}
          <span className="ml-4 text-xs text-ink-soft">
            {others.length + (joined ? 1 : 0)
              ? t(`${others.length + (joined ? 1 : 0)} คนบอกว่าฉันด้วย`, `${others.length + (joined ? 1 : 0)} said "Me too!"`)
              : t('เป็นคนแรกที่บอกว่าฉันด้วยสิ', 'Be the first to say "Me too!"')}
          </span>
        </div>
        <motion.button
          type="button"
          aria-pressed={joined}
          onClick={() => toggle(intent.id)}
          whileTap={{ scale: 0.9 }}
          animate={{ scale: joined ? [1, 1.1, 1] : 1, transition: { duration: 0.38, ease: 'easeOut' } }}
          transition={spring.bouncy}
          className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 font-display text-sm font-semibold transition-colors ${
            joined ? 'bg-mint text-ink shadow-[inset_0_-2px_0_rgb(59_38_34/0.12)]' : 'bg-coral text-ink shadow-[var(--shadow-puffy)]'
          }`}
        >
          {joined ? <Check size={16} strokeWidth={3} aria-hidden /> : <Plus size={16} strokeWidth={3} aria-hidden />}
          {joined ? t('ฉันด้วยแล้ว', "You're in") : t('ฉันด้วย', 'Me too!')}
        </motion.button>
      </div>
    </li>
  )
}

export function RoomsBlock({ user }: { user: User }) {
  const myRooms = useMoshi((s) => s.me.rooms)
  const allRooms = useRooms()
  const rooms = user.rooms.flatMap((id) => allRooms.find((r) => r.id === id) ?? [])
  if (!rooms.length) return null
  return (
    <Section title={t(`ห้องที่${user.name}อยู่`, `${user.name}'s rooms`)}>
      <ul className="flex flex-wrap gap-2">
        {rooms.map((room) => (
          <li key={room.id}>
            <Link
              to={`/app/rooms/${room.id}`}
              className="group inline-flex h-14 items-center gap-2.5 rounded-full bg-white py-1.5 pr-4 pl-1.5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              <RoomIcon room={room} size={42} />
              <span className="leading-tight">
                <span className="block font-display font-semibold text-ink">{room.name}</span>
                {myRooms.includes(room.id) && !room.isLobby && <span className="block text-xs text-ink-soft">{t('เราก็อยู่ห้องนี้', "You're here too")}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}
