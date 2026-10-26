import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight, Clock3, Hand, MapPin, Wifi } from 'lucide-react'
import { Avatar, Chip, TagChip } from '@/components/ui'
import { useRoom } from '@/data/hooks'
import { TAG_BY_ID } from '@/data/tags'
import { MOCHI } from '@/lib/colors'
import { displayName, known, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { User } from '@/lib/types'
import { roomLabel } from '@/pages/home/greeting'
import type { IntentDraft } from './draft'
import { ROLE_BY_KEY, TEMPLATE_BY_KEY, whenText } from './templates'

/** The board card exactly as others will see it (live while composing). */
export function IntentCard({ intent, me, className = '' }: { intent: IntentDraft; me: User; className?: string }) {
  const tpl = TEMPLATE_BY_KEY[intent.template]
  const role = ROLE_BY_KEY[intent.role]
  const tag = TAG_BY_ID[intent.tagId]
  const room = useRoom(intent.roomId)
  const p = MOCHI[tpl.color]
  const meta = [
    { key: `role-${role.key}`, node: <Chip size="sm" color={role.color} icon={<role.Icon size={12} strokeWidth={2.6} aria-hidden />}>{role.label}</Chip> },
    { key: `when-${intent.when}-${intent.whenLabel ?? ''}`, node: <Chip size="sm" color="sky" icon={<Clock3 size={12} strokeWidth={2.6} aria-hidden />}>{whenText(intent.when, intent.whenLabel)}</Chip> },
    {
      key: `mode-${intent.mode}-${intent.province ?? ''}`,
      node:
        intent.mode === 'online' ? (
          <Chip size="sm" color="mint" icon={<Wifi size={12} strokeWidth={2.6} aria-hidden />}>
            {t('ออนไลน์', 'Online')}
          </Chip>
        ) : (
          <Chip size="sm" color="peach" icon={<MapPin size={12} strokeWidth={2.6} aria-hidden />}>
            {known(intent.province) ?? t('เจอตัว', 'In person')}
          </Chip>
        ),
    },
  ]

  return (
    <article className={`card relative overflow-hidden p-4 ${className}`}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${p.base}, ${p.shade})` }} />
      <span aria-hidden className="pointer-events-none absolute -top-14 -right-14 size-36 rounded-full opacity-60 blur-2xl" style={{ background: p.light }} />

      <header className="relative flex items-center gap-3">
        <Avatar color={me.color} size={40} face="happy" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{displayName(me.name)}</p>
          <p className="truncate text-xs text-ink-soft">{room ? `${roomLabel(room.name)} · ` : ''}{t('เมื่อกี้', 'Just now')}</p>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-ink" style={{ background: p.base }}>
          <tpl.Icon size={14} strokeWidth={2.4} aria-hidden />
          {tpl.label}
        </span>
      </header>

      <p className={`relative mt-3 font-display text-[17px] leading-normal break-words ${intent.text ? 'text-ink' : 'text-ink-soft'}`}>
        {intent.text || t('ข้อความของเราจะขึ้นตรงนี้…', 'Your words will show up here…')}
      </p>

      {(intent.give || intent.want) && (
        <div className="relative mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-cream p-2.5 text-sm">
          {intent.give && (
            <span>
              <span className="text-ink-soft">{t('ให้ได้ ', 'Can offer ')}</span>
              <b className="font-semibold">{intent.give}</b>
            </span>
          )}
          {intent.give && intent.want && <ArrowLeftRight size={15} className="text-ink-soft" aria-label={t('แลกกับ', 'in exchange for')} />}
          {intent.want && (
            <span>
              <span className="text-ink-soft">{t('อยากได้ ', 'Wants ')}</span>
              <b className="font-semibold">{intent.want}</b>
            </span>
          )}
        </div>
      )}

      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {tag ? <TagChip tag={tag} size="sm" /> : <Chip size="sm">{t('ยังไม่ได้เลือกกิจกรรม', 'No activity yet')}</Chip>}
        <AnimatePresence mode="popLayout" initial={false}>
          {meta.map((m) => (
            <motion.span key={m.key} layout initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={spring.bouncy}>
              {m.node}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {intent.role === 'host' && intent.slots ? (
        <div className="relative mt-3 flex items-center gap-2 text-sm font-semibold">
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: intent.slots }, (_, i) => (
              <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className="size-3 rounded-full border-2 border-dashed" style={{ borderColor: p.shade }} />
            ))}
          </span>
          {t(`ขาดอีก ${intent.slots} คน`, `${intent.slots} more ${intent.slots === 1 ? 'spot' : 'spots'} open`)}
        </div>
      ) : null}

      <footer className="relative mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-xs text-ink-soft">{t('ยังไม่มีใครกด เป็นคนแรกเลย', 'No one yet. Be the first!')}</span>
        {/* lookalike of the real button others will tap */}
        <span aria-hidden className="inline-flex h-10 items-center gap-1.5 rounded-full bg-coral px-4 font-display text-sm font-semibold text-ink shadow-[var(--shadow-puffy)]">
          <Hand size={16} /> {t('ฉันด้วย', 'Me too!')}
        </span>
      </footer>
    </article>
  )
}
