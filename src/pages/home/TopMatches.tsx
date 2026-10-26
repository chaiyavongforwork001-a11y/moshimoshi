import { motion } from 'motion/react'
import { ChevronRight, MapPin, MessageCircle, PhoneCall, Plus, Radio } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { TiltCard, TiltGlare } from '@/components/motion'
import { Avatar, Button, ButtonLink, ReasonIcon, SignalMeter, TagChip, WaveMatch } from '@/components/ui'
import { useChats, useDataReady, useMatches, usePerson } from '@/data/hooks'
import { MOCHI } from '@/lib/colors'
import { known, t } from '@/lib/i18n'
import { press, stagger, fadeUp } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { MatchResult, User } from '@/lib/types'
import { chatToOpen } from '@/pages/chats/lib'
import { Block, seeAllClass } from './Block'
import { ageLabel } from './greeting'
import { EmptyNote, InviteButton, SoftSkeleton } from './Soft'

/** "คนคลื่นเดียวกับเรา" — the best match as a feature card, then two more. */
export function TopMatches() {
  const me = useMoshi((s) => s.me)
  const ready = useDataReady()
  const matches = useMatches()
  const top = useMemo(() => matches.slice(0, 3), [matches])
  const [first, ...rest] = top

  return (
    <Block
      id="home-matches"
      title={t('คนคลื่นเดียวกับเรา', 'People on your wavelength')}
      icon={<Radio size={18} strokeWidth={2.4} />}
      action={
        first && (
          <Link to="/app/people" className={seeAllClass}>
            {t('ดูทั้งหมด', 'See all')} <ChevronRight size={16} aria-hidden />
          </Link>
        )
      }
    >
      {!ready ? (
        <SoftSkeleton rows={2} />
      ) : !first ? (
        <EmptyNote
          face="wink"
          title={t('ยังไม่เจอคนคลื่นเดียวกันเลย', 'No one on your wavelength yet')}
          sub={t(
            'ตอนนี้เพื่อนๆ ยังมากันไม่เยอะ ชวนเพื่อนมาเล่นด้วยกัน หรือโพสต์กำลังหาไว้ ใครคลื่นตรงจะเห็นเราก่อนเลย',
            "It's still quiet here. Invite your friends, or post what you're looking for so people on your wavelength see you first",
          )}
        >
          <InviteButton className="w-full sm:w-auto" />
          <ButtonLink to="/app/post" icon={<Plus size={18} strokeWidth={2.8} />} className="w-full sm:w-auto">
            {t('โพสต์กำลังหา', 'New post')}
          </ButtonLink>
        </EmptyNote>
      ) : (
        <motion.ul variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-3 sm:grid-cols-2">
          <motion.li variants={fadeUp} className="sm:col-span-2">
            <FeaturedMatch match={first} me={me} />
          </motion.li>
          {rest.map((m) => (
            <motion.li key={m.userId} variants={fadeUp}>
              <MatchCard match={m} me={me} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </Block>
  )
}

/**
 * Already talking (a sent moshi or an older chat) → straight to the chat.
 * Otherwise open their profile with the "ส่งโมชิ" sheet already up.
 */
function useSendMoshi(userId: string) {
  const navigate = useNavigate()
  const chats = useChats()
  const chatId = chatToOpen(chats, userId)?.id
  return {
    sent: !!chatId,
    go: () => navigate(chatId ? `/app/chats/${chatId}` : `/app/people/${userId}?send=1`),
  }
}

/** The strongest signal: your wave and theirs lining up. */
function FeaturedMatch({ match: m, me }: { match: MatchResult; me: User }) {
  const u = usePerson(m.userId)
  const { sent, go } = useSendMoshi(m.userId)
  if (!u) return null
  const p = MOCHI[u.color]
  return (
    <TiltCard max={3} glare={false}>
      <motion.article whileHover={{ y: -3 }} transition={press.transition} className="card relative overflow-hidden p-4 sm:p-5">
        <TiltGlare />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-80"
          style={{ background: `linear-gradient(180deg, ${p.light}, transparent)` }}
        />
        <p className="relative text-xs font-semibold text-ink-soft">{t('คลื่นที่ตรงกับเรามากที่สุดตอนนี้', 'Most on your wavelength right now')}</p>
        <div className="relative mt-2 flex items-center gap-2 sm:gap-4">
          <Avatar color={me.color} size={52} face="happy" label={t('เรา', 'You')} />
          <div className="min-w-0 flex-1">
            <WaveMatch level={m.level} height={46} />
          </div>
          <Link to={`/app/people/${u.id}`} className="shrink-0 rounded-full" aria-label={t(`ดูโปรไฟล์ ${u.name}`, `View ${u.name}'s profile`)}>
            <Avatar color={u.color} size={52} face="happy" online={u.isOnline} />
          </Link>
        </div>

        <div className="relative mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-semibold">
              <Link to={`/app/people/${u.id}`} className="rounded-md hover:underline hover:decoration-2 hover:underline-offset-4">
                {u.name}
              </Link>
            </h3>
            <p className="flex items-center gap-1.5 text-sm text-ink-soft">
              {ageLabel(me.age, u.age)}
              <span aria-hidden>·</span>
              <MapPin size={14} aria-hidden />
              {known(u.province)}
              <span aria-hidden>·</span>
              {known(u.lastActive)}
            </p>
          </div>
          <SignalMeter level={m.level} size="md" />
        </div>

        {m.reasons.length > 0 && (
          <ul className="relative mt-3 space-y-1.5">
            {m.reasons.slice(0, 2).map((r) => (
              <li key={r.text} className="flex items-start gap-2 text-sm text-ink">
                <ReasonIcon kind={r.kind} />
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        )}

        {m.sharedTags.length > 0 && (
          <div className="relative mt-3 flex flex-wrap gap-1.5">
            {m.sharedTags.slice(0, 4).map((s) => (
              <TagChip key={s.tag.id} tag={s.tag} rare={s.rare} size="sm" />
            ))}
          </div>
        )}

        <div className="relative mt-4 flex flex-wrap gap-2">
          <Button
            onClick={go}
            variant={sent ? 'soft' : 'primary'}
            icon={sent ? <MessageCircle size={18} /> : <PhoneCall size={18} />}
            className="flex-1 sm:flex-none"
          >
            {sent ? t('ไปที่แชท', 'Go to chat') : t('ส่งโมชิ', 'Send a moshi')}
          </Button>
          <ButtonLink to={`/app/people/${u.id}`} variant="secondary" className="flex-1 sm:flex-none">
            {t('ดูโปรไฟล์', 'View profile')}
          </ButtonLink>
        </div>
      </motion.article>
    </TiltCard>
  )
}

function MatchCard({ match: m, me }: { match: MatchResult; me: User }) {
  const u = usePerson(m.userId)
  const { sent, go } = useSendMoshi(m.userId)
  if (!u) return null
  const reason = m.reasons[0]
  const rare = m.sharedTags.find((s) => s.rare)
  return (
    <TiltCard className="h-full" max={6} glare={false}>
      <motion.article whileHover={{ y: -3 }} transition={press.transition} className="card relative flex h-full flex-col p-4">
        <TiltGlare />
        <Link to={`/app/people/${u.id}`} className="group flex items-center gap-3 rounded-2xl">
          <Avatar color={u.color} size={50} online={u.isOnline} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-lg font-semibold group-hover:underline group-hover:underline-offset-4">{u.name}</span>
            <span className="block truncate text-xs text-ink-soft">
              {ageLabel(me.age, u.age)} · {known(u.province)}
            </span>
          </span>
        </Link>
        <SignalMeter level={m.level} size="sm" className="mt-3" />
        {reason && (
          <p className="mt-2 flex items-start gap-2 text-sm text-ink">
            <ReasonIcon kind={reason.kind} />
            <span className="line-clamp-2">{reason.text}</span>
          </p>
        )}
        {rare && (
          <div className="mt-2">
            <TagChip tag={rare.tag} rare size="sm" />
          </div>
        )}
        <div className="mt-auto pt-3">
          <Button onClick={go} block variant={sent ? 'soft' : 'secondary'} icon={sent ? <MessageCircle size={17} /> : <PhoneCall size={17} />}>
            {sent ? t('ไปที่แชท', 'Go to chat') : t('ส่งโมชิ', 'Send a moshi')}
          </Button>
        </div>
      </motion.article>
    </TiltCard>
  )
}
