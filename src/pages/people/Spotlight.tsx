import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { TiltCard, TiltGlare } from '@/components/motion'
import { ReasonIcon, SignalMeter, TagChip, WaveMatch } from '@/components/ui'
import { MochiStage, View3D } from '@/components/three'
import { MOCHI } from '@/lib/colors'
import { spring } from '@/lib/motion'
import type { MatchResult, User } from '@/lib/types'
import { ageLabel, statusLabel } from './lib'

const MotionLink = motion.create(Link)

/**
 * The strongest signal right now: their 3D mochi peeks over the top of the
 * card and says hello. The 3D box has no background so the canvas shows.
 */
export function Spotlight({ match, user, myAge }: { match: MatchResult; user: User; myAge: number }) {
  const p = MOCHI[user.color]
  return (
    <section aria-labelledby="spotlight-title" className="relative mt-6">
      <div className="relative flex items-end justify-between gap-2 pl-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={spring.bouncy}
            className="relative mb-16 max-w-[60%] origin-bottom-right rounded-3xl rounded-br-md bg-white px-4 py-2.5 shadow-[var(--shadow-soft)] sm:mb-20"
          >
            <p id="spotlight-title" className="text-xs font-semibold text-ink-soft">
              คลื่นตรงที่สุดตอนนี้
            </p>
            <p className="font-display leading-snug font-semibold text-ink">โมชิโมชิ~ {user.name}เองนะ</p>
          </motion.div>
        </AnimatePresence>
        <View3D className="size-40 shrink-0 sm:size-48" label={`น้องโมชิของ${user.name}กำลังโบกทักทาย`}>
          <MochiStage color={user.color} expression="happy" zoom={1.15} />
        </View3D>
      </div>

      <TiltCard className="-mt-14 sm:-mt-16" max={4} glare={false}>
        <MotionLink
          to={`/app/people/${user.id}`}
          data-cursor="ดูโปรไฟล์"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          transition={spring.bouncy}
          className="card relative block overflow-hidden rounded-3xl p-5"
          style={{ background: `linear-gradient(160deg, white 35%, ${p.light} 100%)` }}
        >
          <TiltGlare />
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-semibold">{user.name}</h2>
              <p className="text-sm text-ink-soft">
                {ageLabel(myAge, user.age)} · {user.province} · {statusLabel(user)}
              </p>
            </div>
            <SignalMeter level={match.level} size="md" />
          </div>
          <WaveMatch level={match.level} height={34} className="mt-3 opacity-80" />
          <ul className="mt-2 space-y-1.5">
            {match.reasons.slice(0, 2).map((r) => (
              <li key={r.text} className="flex items-start gap-2 text-sm text-ink">
                <ReasonIcon kind={r.kind} />
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {match.sharedTags.slice(0, 4).map((s) => (
                <TagChip key={s.tag.id} tag={s.tag} rare={s.rare} size="sm" />
              ))}
            </div>
            <span className="inline-flex items-center gap-1 font-display text-sm font-semibold text-ink">
              ดูโปรไฟล์ <ArrowRight size={16} aria-hidden />
            </span>
          </div>
        </MotionLink>
      </TiltCard>
    </section>
  )
}
