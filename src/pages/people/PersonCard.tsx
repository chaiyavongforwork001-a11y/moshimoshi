import { motion } from 'motion/react'
import { MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { TiltCard, TiltGlare } from '@/components/motion'
import { Avatar, ReasonIcon, SignalMeter, TagChip } from '@/components/ui'
import { MOCHI } from '@/lib/colors'
import { known, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { MatchResult, User } from '@/lib/types'
import { ageLabel } from './lib'

const MotionLink = motion.create(Link)

/** One person in the "คนคลื่นเดียวกัน" list. The whole card opens the profile. */
export function PersonCard({ match, user, myAge }: { match: MatchResult; user: User; myAge: number }) {
  const p = MOCHI[user.color]
  const tags = match.sharedTags.slice(0, 3)
  const more = match.sharedTags.length - tags.length
  return (
    <TiltCard className="h-full" glare={false}>
      <MotionLink
        to={`/app/people/${user.id}`}
        data-cursor={t('ดูโปรไฟล์', 'View profile')}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.97 }}
        transition={spring.bouncy}
        className="card group relative flex h-full flex-col gap-3 overflow-hidden rounded-3xl p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
      >
        <TiltGlare />
        {/* soft wash in their mochi colour */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 size-48 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125"
          style={{ background: `radial-gradient(circle, ${p.base} 0%, ${p.light} 55%, transparent 75%)`, opacity: 0.55 }}
        />
        <div className="relative flex items-start gap-3">
          <Avatar color={user.color} size={56} online={user.isOnline} face={match.level >= 4 ? 'happy' : 'smile'} />
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate font-display text-lg leading-snug font-semibold">{user.name}</h3>
            <p className="flex items-center gap-1 truncate text-sm text-ink-soft">
              <span>{ageLabel(myAge, user.age)}</span>
              <span aria-hidden>·</span>
              <MapPin size={13} aria-hidden className="shrink-0" />
              <span className="truncate">{known(user.province)}</span>
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/90 px-2.5 py-1 shadow-[inset_0_0_0_1px_var(--color-line)]">
            <SignalMeter level={match.level} size="sm" short />
          </span>
        </div>

        {match.reasons.length > 0 && (
          <ul className="relative space-y-1.5">
            {match.reasons.slice(0, 2).map((r) => (
              <li key={r.text} className="flex items-start gap-2 text-sm leading-relaxed text-ink">
                <ReasonIcon kind={r.kind} />
                <span className="line-clamp-2">{r.text}</span>
              </li>
            ))}
          </ul>
        )}

        {tags.length > 0 && (
          <div className="relative mt-auto flex flex-wrap gap-1.5 pt-1">
            {tags.map((s) => (
              <TagChip key={s.tag.id} tag={s.tag} rare={s.rare} size="sm" />
            ))}
            {more > 0 && (
              <span className="inline-flex h-7 items-center rounded-full bg-cream-2 px-2.5 text-xs font-medium text-ink-soft">
                +{more}
              </span>
            )}
          </div>
        )}
      </MotionLink>
    </TiltCard>
  )
}
