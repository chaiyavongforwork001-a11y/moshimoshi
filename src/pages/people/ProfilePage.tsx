import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { MessageCircle, PhoneCall } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { KineticText, Reveal } from '@/components/motion'
import { Avatar, Button, ButtonLink, PageHeader, SignalMeter } from '@/components/ui'
import { useChat, useChats, useDataReady, useMatch, usePerson } from '@/data/hooks'
import { known, t } from '@/lib/i18n'
import { useMoshi } from '@/lib/store'
import { spring } from '@/lib/motion'
import type { MatchResult, User } from '@/lib/types'
import { chatPhase, chatToOpen } from '@/pages/chats/lib'
import { ageLabel, useIsMine } from './lib'
import { CallingScreen } from './profile/CallingScreen'
import { ProfileHero } from './profile/ProfileHero'
import { IntentsBlock, MatchBlock, PromptsBlock, RoomsBlock, TagsBlock } from './profile/ProfileSections'
import { SafetyMenu } from './profile/SafetyMenu'
import { SendMoshiSheet } from './profile/SendMoshiSheet'
import { PageSkeleton } from './Skeleton'

export default function ProfilePage() {
  const { userId = '' } = useParams()
  const ready = useDataReady()
  const isMine = useIsMine()
  const user = usePerson(userId)
  const match = useMatch(userId)
  const blocked = useMoshi((s) => s.blocked.includes(userId))
  if (isMine(userId)) return <Navigate to="/app/me" replace />
  if (!user && !ready) return <PageSkeleton label={t('กำลังเปิดโปรไฟล์…', 'Opening profile…')} />
  if (!user || !match) return <NotFound blocked={blocked} />
  return <Profile key={user.id} user={user} match={match} />
}

function Profile({ user, match }: { user: User; match: MatchResult }) {
  const reduce = useReducedMotion()
  const myAge = useMoshi((s) => s.me.age)
  const chats = useChats()
  // a call they rang and we closed can ring again; one they declined opens the chat instead
  const chat = chatToOpen(chats, user.id)
  const sendMoshi = useMoshi((s) => s.sendMoshi)
  const [params, setParams] = useSearchParams()
  // "ส่งโมชิ" from a card elsewhere lands here with ?send=1: open the sheet right away
  const [sheetOpen, setSheetOpen] = useState(() => params.get('send') === '1' && !chat)
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  useEffect(() => {
    if (!params.has('send')) return
    setParams(
      (p) => {
        p.delete('send')
        return p
      },
      { replace: true },
    )
  }, [params, setParams])
  const [calling, setCalling] = useState<{ chatId: string; opener: string } | null>(null)
  const callChat = useChat(calling?.chatId)
  useEffect(() => {
    // the server said no (the toast already explains): back to the profile, not a false "sent"
    if (calling && (!callChat || chatPhase(callChat) === 'ended')) setCalling(null)
  }, [calling, callChat])

  // live: the id may be temporary until the server answers (useChat follows it); a refusal shows as a toast
  const send = (text: string) => {
    const chatId = sendMoshi(user.id, text)
    setSheetOpen(false)
    setCalling({ chatId, opener: text })
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  const cta = (compact: boolean) =>
    chat ? (
      <ButtonLink to={`/app/chats/${chat.id}`} size={compact ? 'md' : 'lg'} icon={<MessageCircle size={20} aria-hidden />}>
        {t('ไปที่แชท', 'Go to chat')}
      </ButtonLink>
    ) : (
      <Button size={compact ? 'md' : 'lg'} icon={<PhoneCall size={20} aria-hidden />} onClick={() => setSheetOpen(true)}>
        {compact ? t('ส่งโมชิ', 'Send a moshi') : t(`ส่งโมชิหา${user.name}`, `Send ${user.name} a moshi`)}
      </Button>
    )

  return (
    <div>
      <PageHeader
        back={(window.history.state as { idx?: number } | null)?.idx ? true : '/app/people'}
        title={<KineticText text={user.name} />}
        subtitle={`${ageLabel(myAge, user.age)} · ${known(user.province)}`}
        action={<SafetyMenu user={user} />}
      />

      <AnimatePresence mode="wait" initial={false}>
        {calling ? (
          <CallingScreen key="calling" user={user} chatId={calling.chatId} opener={calling.opener} onBack={() => setCalling(null)} />
        ) : (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ProfileHero user={user} cta={cta(false)} />
            <MatchBlock match={match} user={user} />
            <Reveal>
              <TagsBlock match={match} user={user} />
            </Reveal>
            <Reveal>
              <PromptsBlock user={user} />
            </Reveal>
            <Reveal>
              <IntentsBlock user={user} />
            </Reveal>
            <Reveal>
              <RoomsBlock user={user} />
            </Reveal>
            <StickyCta user={user} match={match}>
              {cta(true)}
            </StickyCta>
          </motion.div>
        )}
      </AnimatePresence>

      <SendMoshiSheet open={sheetOpen} onClose={closeSheet} user={user} match={match} onSend={send} />
    </div>
  )
}

/**
 * Phones: the CTA floats above the bottom nav while scrolling (sticky, so it
 * settles into place at the end of the page instead of covering content).
 */
function StickyCta({ user, match, children }: { user: User; match: MatchResult; children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.9rem)] z-20 mt-8 lg:hidden">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring.soft, delay: 0.35 }}
        className="glass flex items-center gap-3 rounded-[1.75rem] p-2 pl-3"
      >
        <Avatar color={user.color} size={40} face="smile" online={user.isOnline} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-semibold">{user.name}</span>
          <SignalMeter level={match.level} size="xs" short />
        </span>
        <span className="shrink-0">{children}</span>
      </motion.div>
    </div>
  )
}

function NotFound({ blocked = false }: { blocked?: boolean }) {
  return (
    <div>
      <PageHeader back="/app/people" title={blocked ? t('บล็อกเรียบร้อย', 'Blocked') : t('ไม่เจอเพื่อนคนนี้', "Can't find this friend")} />
      <div className="card mt-4 flex flex-col items-center gap-3 rounded-3xl px-6 py-12 text-center">
        <Avatar color={blocked ? 'mint' : 'sky'} size={96} face={blocked ? 'smile' : 'sleepy'} />
        <h2 className="font-display text-xl font-semibold">{blocked ? t('บล็อกแล้วนะ พักใจได้เลย', 'Blocked. Take a breather') : t('สายหลุดไปแล้วแฮะ', 'Looks like the line dropped')}</h2>
        <p className="max-w-sm text-ink-soft">
          {blocked
            ? t(
                'จากนี้เขาจะไม่เห็นเรา และส่งโมชิหาเราไม่ได้ ไปเจอคนที่คลื่นตรงกันต่อกันดีกว่า',
                "From now on they won't see you and can't send you a moshi. Let's go find people on your wavelength.",
              )
            : t(
                'เพื่อนคนนี้อาจออกไปพักก่อน หรือลิงก์อาจไม่ถูกต้อง ลองไปดูคนอื่นที่คลื่นตรงกันดีไหม',
                'This friend may be taking a break, or the link might be off. Want to check out others on your wavelength?',
              )}
        </p>
        <ButtonLink to="/app/people" className="mt-2">
          {t('ไปหาคนคลื่นเดียวกัน', 'Find people on your wavelength')}
        </ButtonLink>
      </div>
    </div>
  )
}
