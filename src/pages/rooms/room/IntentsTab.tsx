import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, Hand, MapPin, Megaphone, Plus, Repeat2, Users, Wifi } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { Avatar, ButtonLink } from '@/components/ui'
import { useIntents, usePeople } from '@/data/hooks'
import { TAG_BY_ID } from '@/data/tags'
import { CATEGORY_COLOR, MOCHI } from '@/lib/colors'
import { known, t } from '@/lib/i18n'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Intent, Room, User } from '@/lib/types'
import { useIsMine } from '@/pages/people/lib'
import { AvatarStack, PopToggle, type StackPerson } from '../bits'
import { agoLabel, ROLE_LABEL, WHEN_LABEL } from '../roomData'

export function IntentsTab({ room }: { room: Room }) {
  const me = useMoshi((s) => s.me)
  const joinedIds = useMoshi((s) => s.joinedIntentIds)
  const toggleJoin = useMoshi((s) => s.toggleJoinIntent)
  const isMine = useIsMine()
  const people = usePeople()
  const byId = useMemo(() => new Map(people.map((u) => [u.id, u])), [people])
  const all = useIntents({ roomId: room.id })
  // mine first, then everyone else newest first
  const intents = useMemo(() => [...all.filter((i) => isMine(i.userId)), ...all.filter((i) => !isMine(i.userId))], [all, isMine])

  return (
    <section aria-labelledby="intents-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="intents-title" className="font-display text-xl font-semibold">
            {t('ใครกำลังหาอะไรอยู่', "Who's looking for what")}
          </h2>
          <p className="text-sm text-ink-soft">
            {t('กด “ฉันด้วย” ให้เขารู้ว่ามีเพื่อนสนใจ แล้วค่อยทักไปคุยต่อ', 'Tap “Me too!” so they know someone’s keen, then say hi')}
          </p>
        </div>
        <ButtonLink to={`/app/post?room=${room.id}`} icon={<Plus size={16} strokeWidth={2.8} />}>
          {t('โพสต์กำลังหา', 'New post')}
        </ButtonLink>
      </div>

      {intents.length > 0 ? (
        <motion.ul variants={stagger(0.07)} initial="hidden" animate="show" className="grid gap-5 pt-2 sm:grid-cols-2">
          {intents.map((it, i) => (
            <motion.li key={it.id} variants={fadeUp}>
              <IntentNote
                intent={it}
                me={me}
                mine={isMine(it.userId)}
                byId={byId}
                tilt={i % 2 ? 0.8 : -0.8}
                joined={joinedIds.includes(it.id)}
                onToggle={() => toggleJoin(it.id)}
              />
            </motion.li>
          ))}
        </motion.ul>
      ) : (
        <div className="card flex flex-col items-center px-6 py-10 text-center">
          <span className="flex size-16 items-center justify-center rounded-3xl bg-butter/60">
            <Megaphone size={28} strokeWidth={2.2} aria-hidden />
          </span>
          <h3 className="mt-3 font-display text-lg font-semibold">{t('ยังไม่มีใครโพสต์ในห้องนี้', 'No posts in this room yet')}</h3>
          <p className="mt-1 max-w-xs text-ink-soft">
            {t('เป็นคนแรกเลยไหม บอกเพื่อนๆ ว่าอยากหาใครมาทำอะไรด้วยกัน', "Want to be first? Tell everyone who you'd like to find, and what to do together")}
          </p>
          <ButtonLink to={`/app/post?room=${room.id}`} className="mt-4" icon={<Plus size={18} strokeWidth={2.8} />}>
            {t('โพสต์กำลังหา', 'New post')}
          </ButtonLink>
        </div>
      )}
    </section>
  )
}

/** A board note: washi tape on top, a tiny tilt that straightens on hover. */
function IntentNote({
  intent: it,
  me,
  mine,
  byId,
  tilt,
  joined,
  onToggle,
}: {
  intent: Intent
  me: User
  mine: boolean
  byId: Map<string, User>
  tilt: number
  joined: boolean
  onToggle: () => void
}) {
  const author = mine ? me : byId.get(it.userId)
  const tag = TAG_BY_ID[it.tagId]
  const c = MOCHI[tag ? CATEGORY_COLOR[tag.category] : 'peach']
  const left = it.role === 'host' && it.slots !== undefined ? Math.max(0, it.slots - (joined ? 1 : 0)) : undefined
  const crowd: StackPerson[] = [
    ...(joined ? [{ id: 'me', color: me.color, face: 'happy' as const }] : []),
    ...it.joinedBy.map((id) => byId.get(id)).filter((u): u is User => !!u),
  ]
  if (!author) return null

  return (
    <motion.article
      initial={false}
      animate={{ rotate: tilt }}
      whileHover={{ rotate: 0, y: -4 }}
      transition={spring.soft}
      className="relative flex h-full flex-col rounded-3xl border border-line bg-white p-4 pt-5 shadow-[var(--shadow-soft)]"
    >
      <span
        aria-hidden
        className="absolute -top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 -rotate-3 rounded-[3px] opacity-85"
        style={{ background: `repeating-linear-gradient(135deg, ${c.base} 0 8px, ${c.light} 8px 14px)` }}
      />
      <header className="flex items-center gap-2.5">
        {mine ? (
          <Avatar color={author.color} size={40} face="happy" />
        ) : (
          <Link to={`/app/people/${author.id}`} aria-label={t(`ดูโปรไฟล์ ${author.name}`, `See ${author.name}'s profile`)} className="rounded-full">
            <Avatar color={author.color} size={40} online={author.isOnline} />
          </Link>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-display font-semibold text-ink">{mine ? t('เรา', 'You') : author.name}</p>
          <p className="text-xs text-ink-soft">{agoLabel(it.postedMinutesAgo)}</p>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: c.light, color: c.ink }}>
          {ROLE_LABEL[it.role]}
        </span>
      </header>

      <p className="mt-3 text-[15px] leading-relaxed text-ink">{it.text}</p>
      {(it.give || it.want) && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-soft">
          <Repeat2 size={15} strokeWidth={2.4} className="mt-1 shrink-0" aria-hidden />
          <span>
            {it.give && (
              <>
                {t('ให้ได้: ', 'Can offer: ')}
                <b className="font-semibold text-ink">{it.give}</b>
              </>
            )}
            {it.give && it.want && ' · '}
            {it.want && (
              <>
                {t('อยากได้: ', 'Wants: ')}
                <b className="font-semibold text-ink">{it.want}</b>
              </>
            )}
          </span>
        </p>
      )}

      <ul className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-ink">
        <li className="inline-flex h-7 items-center gap-1 rounded-full bg-cream px-2.5">
          <CalendarClock size={13} strokeWidth={2.4} aria-hidden />
          {known(it.whenLabel) ?? WHEN_LABEL[it.when]}
        </li>
        <li className="inline-flex h-7 items-center gap-1 rounded-full bg-cream px-2.5">
          {it.mode === 'online' ? <Wifi size={13} strokeWidth={2.4} aria-hidden /> : <MapPin size={13} strokeWidth={2.4} aria-hidden />}
          {it.mode === 'online' ? t('ออนไลน์', 'Online') : (known(it.province) ?? t('เจอกันจริง', 'In person'))}
        </li>
        {left !== undefined && (
          <li className="relative inline-flex h-7 items-center gap-1 overflow-hidden rounded-full bg-butter/70 px-2.5">
            <Users size={13} strokeWidth={2.4} aria-hidden />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={left} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={spring.bouncy}>
                {left > 0 ? t(`ขาดอีก ${left}`, `${left} more`) : t('ครบแล้ว!', 'Full!')}
              </motion.span>
            </AnimatePresence>
          </li>
        )}
      </ul>

      <footer className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="flex min-w-0 items-center gap-2">
          <AvatarStack people={crowd} size={28} max={4} />
          <span className="truncate text-sm text-ink-soft">
            {crowd.length ? t(`${crowd.length} คนสนใจ`, `${crowd.length} interested`) : t('ยังไม่มีใครกด เป็นคนแรกเลย', 'No one yet. Be the first!')}
          </span>
        </span>
        {mine ? (
          <span className="shrink-0 rounded-full bg-cream-3/70 px-3 py-1.5 text-xs font-semibold text-ink">{t('โพสต์ของเรา', 'Your post')}</span>
        ) : (
          <PopToggle
            on={joined}
            onToggle={onToggle}
            labelOn={t('ฉันด้วยแล้ว', "You're in!")}
            labelOff={t('ฉันด้วย', 'Me too!')}
            iconOff={<Hand size={17} strokeWidth={2.4} />}
            ariaLabel={t(`ฉันด้วย ในโพสต์ของ${author.name}`, `Me too! on ${author.name}'s post`)}
          />
        )}
      </footer>
    </motion.article>
  )
}
