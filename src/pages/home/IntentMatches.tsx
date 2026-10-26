import { motion, useReducedMotion } from 'motion/react'
import { ChevronRight, Plus, Search } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { Avatar, ButtonLink, SignalMeter, TagChip } from '@/components/ui'
import { useDataReady, usePerson } from '@/data/hooks'
import { TAG_BY_ID } from '@/data/tags'
import { MOCHI } from '@/lib/colors'
import { L, t, tx } from '@/lib/i18n'
import { matchAll } from '@/lib/matching'
import { fadeUp, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Intent, MatchResult } from '@/lib/types'
import { TEMPLATE_BY_KEY } from '@/pages/post/templates'
import { Block, seeAllClass } from './Block'
import { useMatchInputs } from './matches'
import { SoftSkeleton } from './Soft'

/** "ตรงกับที่เราหา" — best 3 people for each of my active intents, or a CTA to post one. */
export function IntentMatches() {
  const myIntents = useMoshi((s) => s.myIntents)
  const ready = useDataReady()
  const { me, people, others } = useMatchInputs()
  const groups = useMemo(
    () => myIntents.map((intent) => ({ intent, matches: matchAll(me, [intent], people, others).slice(0, 3) })),
    [me, myIntents, people, others],
  )

  return (
    <Block
      id="home-intents"
      title={t('ตรงกับที่เราหา', 'Matches for your posts')}
      icon={<Search size={18} strokeWidth={2.4} />}
      action={
        groups.length > 0 && (
          <Link to="/app/post" className={seeAllClass}>
            <Plus size={16} aria-hidden /> {t('โพสต์เพิ่ม', 'New post')}
          </Link>
        )
      }
    >
      {groups.length === 0 ? (
        <PostCta />
      ) : !ready ? (
        <SoftSkeleton rows={Math.min(groups.length, 2)} />
      ) : (
        <motion.ul variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-3">
          {groups.map((g) => (
            <motion.li key={g.intent.id} variants={fadeUp}>
              <IntentGroup intent={g.intent} matches={g.matches} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </Block>
  )
}

function IntentGroup({ intent, matches }: { intent: Intent; matches: MatchResult[] }) {
  const tpl = TEMPLATE_BY_KEY[intent.template]
  const tag = TAG_BY_ID[intent.tagId]
  const p = MOCHI[tpl?.color ?? 'cream']
  return (
    <article className="card overflow-hidden">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3" style={{ background: `linear-gradient(180deg, ${p.light}, transparent)` }}>
        {tpl && (
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl text-ink" style={{ background: p.base }} aria-hidden>
            <tpl.Icon size={20} strokeWidth={2.3} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink-soft">
            {t('เรากำลังหา', "You're looking for")}
            {tpl ? ` · ${tpl.label}` : ''}
          </p>
          <h3 className="truncate font-display font-semibold">{intent.text}</h3>
        </div>
        {tag && (
          <span className="hidden sm:inline-flex">
            <TagChip tag={tag} size="sm" />
          </span>
        )}
      </header>
      {matches.length ? (
        <ul className="divide-y divide-line/70 px-2 pb-2">
          {matches.map((m) => (
            <MatchRow key={m.userId} match={m} />
          ))}
        </ul>
      ) : (
        <p className="px-4 pb-4 text-sm text-ink-soft">
          {t('ยังไม่มีใครตรงกับใบนี้ โมชิคอยดูให้อยู่นะ ใครมาแล้วจะขึ้นตรงนี้เลย', "No matches for this one yet. Mochi's keeping watch, and they'll pop up right here")}
        </p>
      )}
    </article>
  )
}

function MatchRow({ match: m }: { match: MatchResult }) {
  const u = usePerson(m.userId)
  if (!u) return null
  const reason = m.reasons.find((r) => r.kind === 'intent' || r.kind === 'swap') ?? m.reasons[0]
  return (
    <li>
      <Link to={`/app/people/${u.id}`} className="flex min-h-16 items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-cream">
        <Avatar color={u.color} size={42} online={u.isOnline} />
        <span className="min-w-0 flex-1">
          <span className="block font-display font-semibold">{u.name}</span>
          {reason && <span className="block truncate text-xs text-ink-soft">{reason.text}</span>}
        </span>
        <SignalMeter level={m.level} size="xs" short />
        <ChevronRight size={18} className="shrink-0 text-ink-soft" aria-hidden />
      </Link>
    </li>
  )
}

const EXAMPLES = [
  L('หาเพื่อนเล่น Valo ดึกๆ', 'Late-night Valo buddies'),
  L('อยากมีคนคุยเรื่อง Frieren', 'Someone to talk Frieren with'),
  L('หาเพื่อนไปคอนเสาร์นี้', 'Concert buddy this Saturday'),
  L('แลกภาษา ไทย ⇄ ญี่ปุ่น', 'Language swap: Thai ⇄ Japanese'),
]

/** Empty state: invite to post a "กำลังหา" with drifting example bubbles. */
function PostCta() {
  const reduce = useReducedMotion()
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-linear-to-br from-butter/50 via-cream-2 to-peach/40 p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div aria-hidden className="mb-4 flex flex-wrap gap-2">
        {EXAMPLES.map((e, i) => (
          <motion.span
            key={e.th}
            className={`rounded-2xl bg-white/90 px-3 py-1.5 text-sm text-ink shadow-[var(--shadow-soft)] ${i % 2 ? 'rounded-br-md' : 'rounded-bl-md'} ${i > 2 ? 'hidden sm:inline-block' : ''}`}
            animate={reduce ? undefined : { y: [0, -5, 0] }}
            transition={{ duration: 3.2 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
          >
            {tx(e)}
          </motion.span>
        ))}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 sm:flex-1">
          <Avatar color="peach" size={52} face="talk" />
          <div>
            <p className="font-display text-lg leading-snug font-semibold">{t('กำลังหาเพื่อนทำอะไรอยู่หรือเปล่า?', 'Looking for friends to do something with?')}</p>
            <p className="text-sm text-ink-soft">{t('บอกสั้นๆ ก็พอ แล้วโมชิจะช่วยหาคนที่คลื่นตรงกันให้', "Just a few words, and Mochi will find people on your wavelength")}</p>
          </div>
        </div>
        <ButtonLink to="/app/post" icon={<Plus size={18} strokeWidth={2.8} />} className="w-full sm:w-auto">
          {t('โพสต์กำลังหา', 'New post')}
        </ButtonLink>
      </div>
    </div>
  )
}
