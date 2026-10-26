import { motion } from 'motion/react'
import { Clock3, Languages, MessagesSquare } from 'lucide-react'
import type { ReactNode } from 'react'
import { Chip } from '@/components/ui'
import { MochiStage, View3D } from '@/components/three'
import { ONLINE_LABEL } from '@/data/tags'
import { MOCHI } from '@/lib/colors'
import { known, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { User } from '@/lib/types'
import { COLOR_NAME, statusLabel } from '../lib'
import { Rings } from './Rings'

/** Big 3D mochi in their colour + a speech-bubble bio + how they like to chat. */
export function ProfileHero({ user, cta }: { user: User; cta: ReactNode }) {
  const p = MOCHI[user.color]
  return (
    <section aria-label={t(`เกี่ยวกับ${user.name}`, `About ${user.name}`)} className="relative grid items-center gap-3 lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-8">
      <div className="relative">
        {user.isOnline && <Rings color={p.shade} size={200} speed={3.2} />}
        <View3D
          className="h-64 w-full sm:h-72"
          cursor={t('ลากเล่นได้', 'Drag to play')}
          label={t(`น้องโมชิสี${COLOR_NAME[user.color]}ของ${user.name} แตะเพื่อบีบเล่นได้`, `${user.name}'s ${COLOR_NAME[user.color]} Mochi. Tap to give it a squish`)}
        >
          <MochiStage color={user.color} expression={user.isOnline ? 'smile' : 'sleepy'} />
        </View3D>
        <span className="absolute bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold whitespace-nowrap text-ink shadow-[var(--shadow-soft)]">
          <span className={`size-2.5 rounded-full ${user.isOnline ? 'bg-success' : 'bg-ink-faint/60'}`} aria-hidden />
          {statusLabel(user)}
        </span>
      </div>

      <div className="min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...spring.bouncy, delay: 0.15 }}
          className="relative rounded-3xl bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5"
        >
          {/* bubble tail: points up at the mochi on phones, left on desktop */}
          <span aria-hidden className="absolute -top-2 left-1/2 size-5 -translate-x-1/2 rotate-45 rounded-sm bg-white lg:top-10 lg:-left-2 lg:translate-x-0" />
          <p className="relative text-xs font-semibold text-ink-soft">{t(`${user.name}แนะนำตัว`, `${user.name}'s intro`)}</p>
          <p className="relative mt-0.5 text-[17px] text-ink">{user.bio || t(`${user.name}ยังไม่ได้เขียนแนะนำตัว ลองทักไปถามดูสิ`, `${user.name} hasn't written an intro yet. Say hi and ask!`)}</p>
        </motion.div>

        <dl className="mt-4 space-y-3">
          <Row icon={<MessagesSquare size={15} aria-hidden />} label={t('สไตล์การคุย', 'Chat style')}>
            {user.chatStyle.map((s) => (
              <Chip key={s} size="sm" color={user.color}>
                {known(s)}
              </Chip>
            ))}
          </Row>
          <Row icon={<Languages size={15} aria-hidden />} label={t('ภาษา', 'Languages')}>
            {user.languages.map((l) => (
              <Chip key={l} size="sm" color="sky">
                {known(l)}
              </Chip>
            ))}
          </Row>
          <Row icon={<Clock3 size={15} aria-hidden />} label={t('ออนไลน์บ่อย', 'Usually online')}>
            {user.online.map((o) => (
              <Chip key={o} size="sm" color="mint">
                {ONLINE_LABEL[o]}
              </Chip>
            ))}
          </Row>
        </dl>

        <div className="mt-5 hidden lg:block">{cta}</div>
      </div>
    </section>
  )
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode[] }) {
  if (!children.length) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <dt className="flex w-28 shrink-0 items-center gap-1.5 text-sm text-ink-soft">
        {icon}
        {label}
      </dt>
      <dd className="flex min-w-0 flex-wrap gap-1.5">{children}</dd>
    </div>
  )
}
