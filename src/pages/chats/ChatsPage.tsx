import { motion } from 'motion/react'
import { PhoneIncoming, PhoneOutgoing, Radio } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { KineticText, Reveal } from '@/components/motion'
import { Avatar, ButtonLink, PageHeader, Section, SignalMeter } from '@/components/ui'
import { useChats, useDataReady, useMatches, usePeople } from '@/data/hooks'
import { MOCHI } from '@/lib/colors'
import { known, t } from '@/lib/i18n'
import { fadeUp, spring, stagger } from '@/lib/motion'
import type { Chat, MatchResult, User } from '@/lib/types'
import { useIsMine } from '@/pages/people/lib'
import { Rings } from '@/pages/people/profile/Rings'
import { ListSkeleton } from '@/pages/people/Skeleton'
import { chatPhase, lastMessage, previewText, setAside } from './lib'

const MotionLink = motion.create(Link)

interface Row {
  chat: Chat
  user: User
  match?: MatchResult
}

type IsMine = (id: string) => boolean

export default function ChatsPage() {
  const ready = useDataReady()
  const chats = useChats()
  const people = usePeople()
  const matches = useMatches()
  const isMine = useIsMine()
  const users = useMemo(() => new Map(people.map((u) => [u.id, u])), [people])

  const { incoming, waiting, talking } = useMemo(() => {
    const byUser = new Map(matches.map((m) => [m.userId, m]))
    const rows = chats.flatMap((chat): Row[] => {
      const user = users.get(chat.withUserId)
      return user && !setAside(chat, isMine) ? [{ chat, user, match: byUser.get(user.id) }] : []
    })
    return {
      incoming: rows.filter((r) => chatPhase(r.chat) === 'incoming'),
      waiting: rows.filter((r) => chatPhase(r.chat) === 'ringing'),
      talking: rows.filter((r) => ['open', 'ended'].includes(chatPhase(r.chat))),
    }
  }, [chats, users, matches, isMine])

  const total = incoming.length + waiting.length + talking.length
  const chattingWith = new Set(chats.map((c) => c.withUserId))
  const suggestions = matches.filter((m) => !chattingWith.has(m.userId) && users.has(m.userId)).slice(0, 4)

  return (
    <div>
      <PageHeader title={<KineticText text={t('แชท', 'Chats')} />} subtitle={t('คุยกับเพื่อนที่คลื่นตรงกัน', 'Talk with friends on your wavelength')} />

      {!ready ? (
        <ListSkeleton count={3} label={t('กำลังโหลดแชท…', 'Loading chats…')} />
      ) : total === 0 ? (
        <EmptyChats />
      ) : (
        <>
          {incoming.length > 0 && (
            <Section
              title={t('มีคนโทรมา', "Someone's calling")}
              action={<span className="text-sm text-ink-soft">{t('รับสายหรือไว้ก่อนก็ได้', 'Pick up, or maybe later')}</span>}
            >
              <motion.ul variants={stagger(0.06)} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2">
                {incoming.map((r) => (
                  <motion.li key={r.chat.id} variants={fadeUp}>
                    <CallCard row={r} incoming isMine={isMine} />
                  </motion.li>
                ))}
              </motion.ul>
            </Section>
          )}

          {talking.length > 0 && (
            <Section title={t('คุยอยู่', 'Chatting')}>
              <motion.ul variants={stagger(0.06)} initial="hidden" animate="show" className="card space-y-0.5 overflow-hidden rounded-3xl p-1.5">
                {talking.map((r) => (
                  <motion.li key={r.chat.id} variants={fadeUp}>
                    <ChatRow row={r} isMine={isMine} />
                  </motion.li>
                ))}
              </motion.ul>
            </Section>
          )}

          {waiting.length > 0 && (
            <Reveal>
              <Section
                title={t('โมชิที่ส่งไป', 'Moshis you sent')}
                action={<span className="text-sm text-ink-soft">{t('รอเขารับสายอยู่', 'Waiting for them to pick up')}</span>}
              >
                <motion.ul variants={stagger(0.06, 0.1)} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2">
                  {waiting.map((r) => (
                    <motion.li key={r.chat.id} variants={fadeUp}>
                      <CallCard row={r} isMine={isMine} />
                    </motion.li>
                  ))}
                </motion.ul>
              </Section>
            </Reveal>
          )}
        </>
      )}

      {ready && suggestions.length > 0 && (
        <Reveal>
          <Section
            title={t('อาจอยากคุยด้วย', 'You might click with')}
            action={
              <Link to="/app/people" className="inline-flex h-11 items-center text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
                {t('ดูทั้งหมด', 'See all')}
              </Link>
            }
          >
            <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
              {suggestions.map((m) => {
                const u = users.get(m.userId)
                if (!u) return null
                return (
                  <li key={m.userId} className="w-36 shrink-0 snap-start lg:w-auto">
                    <MotionLink
                      to={`/app/people/${u.id}`}
                      data-cursor={t('ดูโปรไฟล์', 'View profile')}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.95 }}
                      transition={spring.bouncy}
                      className="card flex h-full flex-col items-center gap-1.5 rounded-3xl p-4 text-center"
                    >
                      <Avatar color={u.color} size={56} online={u.isOnline} face="happy" />
                      <span className="font-display font-semibold">{u.name}</span>
                      <SignalMeter level={m.level} size="xs" short />
                    </MotionLink>
                  </li>
                )
              })}
            </ul>
          </Section>
        </Reveal>
      )}
    </div>
  )
}

function ChatRow({ row: { chat, user: u, match }, isMine }: { row: Row; isMine: IsMine }) {
  const last = lastMessage(chat)
  const unread = chat.unread > 0
  const ended = chatPhase(chat) === 'ended'
  return (
    <MotionLink
      to={`/app/chats/${chat.id}`}
      data-cursor={t('เปิดแชท', 'Open chat')}
      whileTap={{ scale: 0.98 }}
      transition={spring.bouncy}
      className={`flex items-center gap-3 rounded-[1.4rem] p-3 transition-colors hover:bg-cream ${unread ? 'bg-butter/20' : ''}`}
    >
      <Avatar color={u.color} size={54} online={u.isOnline} face={ended ? 'sleepy' : unread ? 'talk' : 'smile'} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-display text-[17px] font-semibold">{u.name}</span>
          {ended ? (
            <span className="shrink-0 rounded-full bg-cream-3 px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{t('วางสายแล้ว', 'Hung up')}</span>
          ) : (
            match && <SignalMeter level={match.level} size="xs" showLabel={false} />
          )}
          <span className="ml-auto shrink-0 text-xs text-ink-soft">{known(last?.at)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={`truncate text-sm ${unread ? 'font-semibold text-ink' : 'text-ink-soft'}`}>{previewText(chat, isMine)}</span>
          {unread && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={spring.bouncy}
              className="ml-auto inline-flex h-5.5 min-w-5.5 shrink-0 items-center justify-center rounded-full bg-coral px-1.5 text-xs font-bold text-ink"
            >
              {chat.unread}
              <span className="sr-only">{t(' ข้อความใหม่', chat.unread === 1 ? ' new message' : ' new messages')}</span>
            </motion.span>
          )}
        </span>
      </span>
    </MotionLink>
  )
}

/** A moshi still ringing: one we sent, or (incoming) one waiting for our answer. */
function CallCard({ row: { chat, user: u, match }, incoming = false, isMine }: { row: Row; incoming?: boolean; isMine: IsMine }) {
  const opener = [...chat.messages].reverse().find((m) => (incoming ? m.userId === u.id : isMine(m.userId)))
  const p = MOCHI[u.color]
  return (
    <MotionLink
      to={`/app/chats/${chat.id}`}
      data-cursor={t('เปิดแชท', 'Open chat')}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.bouncy}
      className="card flex h-full flex-col gap-3 rounded-3xl p-4"
    >
      <span className="flex items-center gap-3">
        <span className="relative flex size-14 shrink-0 items-center justify-center">
          <Rings color={p.shade} size={52} count={2} speed={2.2} />
          <Avatar color={u.color} size={50} face={incoming ? 'talk' : 'wow'} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[17px] font-semibold">{u.name}</span>
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            {incoming ? <PhoneIncoming size={13} aria-hidden /> : <PhoneOutgoing size={13} aria-hidden />}
            {incoming ? t('โทรหาเรา แตะเพื่อรับสาย', 'Calling you. Tap to pick up') : t('กำลังรอรับสาย', 'Waiting for them to pick up')}
          </span>
        </span>
        {match && <SignalMeter level={match.level} size="xs" showLabel={false} />}
      </span>
      {opener && (
        <span
          className={`line-clamp-2 rounded-3xl px-3.5 py-2 text-sm text-ink ${
            incoming ? 'self-start rounded-bl-md bg-white shadow-[inset_0_0_0_1px_var(--color-line)]' : 'self-end rounded-br-md bg-peach/50'
          }`}
        >
          {opener.text}
        </span>
      )}
    </MotionLink>
  )
}

function EmptyChats() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.gentle}
      className="card relative mt-4 flex flex-col items-center gap-3 overflow-hidden rounded-3xl px-6 py-12 text-center"
    >
      {/* curly phone cord linking two mochi */}
      <div className="relative flex items-end gap-1">
        <Avatar color="peach" size={88} face="wink" />
        <svg width="96" height="40" viewBox="0 0 96 40" aria-hidden className="mb-6 text-ink-faint">
          <path
            d="M2 30c6 0 6-14 12-14s6 14 12 14 6-14 12-14 6 14 12 14 6-14 12-14 6 14 12 14 6-14 12-14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="4 6"
          />
        </svg>
        <Avatar color="mint" size={72} face="sleepy" />
      </div>
      <h2 className="mt-2 font-display text-2xl font-semibold">{t('ยังไม่มีสายเข้าเลย', 'No calls yet')}</h2>
      <p className="max-w-sm text-ink-soft">
        {t(
          'ลองส่งโมชิหาคนที่คลื่นตรงกันดูสิ บางทีเขาอาจรอให้ใครสักคนทักอยู่ก็ได้',
          'Try sending a moshi to someone on your wavelength. They might be waiting for someone to say hi.',
        )}
      </p>
      <ButtonLink to="/app/people" size="lg" icon={<Radio size={20} aria-hidden />} className="mt-3">
        {t('ไปหาคนคลื่นเดียวกัน', 'Find people on your wavelength')}
      </ButtonLink>
    </motion.div>
  )
}
