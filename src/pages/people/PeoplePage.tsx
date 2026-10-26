import { AnimatePresence, motion } from 'motion/react'
import { CircleHelp, Plus, Wifi } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { KineticText } from '@/components/motion'
import { Avatar, ButtonLink, Chip, IconButton, PageHeader, SignalMeter } from '@/components/ui'
import { useDataReady, useMatches, usePeople } from '@/data/hooks'
import { spring } from '@/lib/motion'
import { L, loc, t } from '@/lib/i18n'
import { signalMeta } from '@/lib/matching'
import { useMoshi } from '@/lib/store'
import type { MatchResult, SignalLevel, User } from '@/lib/types'
import { PersonCard } from './PersonCard'
import { SignalInfoSheet, SignalLegend } from './SignalScale'
import { ListSkeleton } from './Skeleton'
import { Spotlight } from './Spotlight'

type FilterKey = 'all' | 'good' | 'great' | 'online'

interface Filter {
  key: FilterKey
  label: string
  test: (m: MatchResult, u: User) => boolean
  icon?: ReactNode
}

/** "ถูกคอขึ้นไป": a signal level and everything above it (level names come from signalMeta) */
const atLeast = (level: SignalLevel) => t(`${signalMeta(level).short}ขึ้นไป`, `${signalMeta(level).short} & up`)

const FILTERS: Filter[] = [
  loc<Filter>({ key: 'all', label: L('ทั้งหมด', 'Everyone'), test: () => true }),
  {
    key: 'good',
    get label() {
      return atLeast(3)
    },
    test: (m) => m.level >= 3,
    icon: <span aria-hidden><SignalMeter level={3} size="xs" showLabel={false} /></span>,
  },
  {
    key: 'great',
    get label() {
      return atLeast(4)
    },
    test: (m) => m.level >= 4,
    icon: <span aria-hidden><SignalMeter level={4} size="xs" showLabel={false} /></span>,
  },
  loc<Filter>({ key: 'online', label: L('ออนไลน์อยู่', 'Online now'), test: (_, u) => u.isOnline, icon: <Wifi size={14} strokeWidth={2.6} aria-hidden /> }),
]

export default function PeoplePage() {
  const ready = useDataReady()
  const myAge = useMoshi((s) => s.me.age)
  const people = usePeople()
  const byId = useMemo(() => new Map(people.map((u) => [u.id, u])), [people])
  const matches = useMatches()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [infoOpen, setInfoOpen] = useState(false)
  const closeInfo = useCallback(() => setInfoOpen(false), [])

  const counts = useMemo(() => {
    const c: Record<SignalLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const m of matches) c[m.level]++
    return c
  }, [matches])

  const list = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!
    return matches.flatMap((m) => {
      const u = byId.get(m.userId)
      return u && f.test(m, u) ? [{ m, u }] : []
    })
  }, [matches, byId, filter])

  const [top, ...rest] = list
  const nobody = people.length === 0

  return (
    <div>
      <PageHeader
        title={<KineticText text={t('คนคลื่นเดียวกัน', 'People on your wavelength')} />}
        subtitle={t('เรียงจากคนที่ชอบอะไรคล้ายเรามากที่สุด', 'Sorted by who shares the most with you')}
        action={
          <IconButton label={t('สัญญาณถูกคอคืออะไร', "What's a vibe signal?")} onClick={() => setInfoOpen(true)}>
            <CircleHelp size={20} />
          </IconButton>
        }
      />

      <SignalLegend counts={counts} />

      <div role="group" aria-label={t('กรองรายชื่อ', 'Filter the list')} className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {FILTERS.map((f) => (
          <Chip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)} icon={f.icon} color={f.key === 'online' ? 'mint' : 'butter'}>
            {f.label}
          </Chip>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {t(`เจอ ${list.length} คน`, `Found ${list.length} ${list.length === 1 ? 'person' : 'people'}`)}
      </p>

      {!ready && <ListSkeleton count={3} grid label={t('กำลังหาคนคลื่นเดียวกัน…', 'Finding people on your wavelength…')} />}

      {top && <Spotlight match={top.m} user={top.u} myAge={myAge} />}

      {rest.length > 0 && (
        <h2 className="mt-8 mb-3 font-display text-lg font-semibold text-ink">
          {t(`อีก ${rest.length} คนที่คลื่นใกล้กัน`, `${rest.length} more on a similar wavelength`)}
        </h2>
      )}

      <motion.ul layout className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {rest.map(({ m, u }, i) => (
            <motion.li
              key={m.userId}
              layout
              initial={{ opacity: 0, y: 22, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { ...spring.soft, delay: Math.min(i, 8) * 0.05 } }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
              transition={spring.soft}
            >
              <PersonCard match={m} user={u} myAge={myAge} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <AnimatePresence>
        {ready && list.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring.soft}
            className="card mt-6 flex flex-col items-center gap-3 rounded-3xl px-6 py-10 text-center"
          >
            <Avatar color="lavender" size={84} face="sleepy" />
            <h2 className="font-display text-xl font-semibold">{nobody ? t('ยังไม่มีเพื่อนคนอื่นแวะมาเลย', 'Nobody else has dropped by yet') : t('ช่วงนี้ยังไม่มีใครในคลื่นนี้', 'Nobody on this wavelength right now')}</h2>
            <p className="max-w-sm text-ink-soft">
              {nobody
                ? t(
                    'ชุมชนเพิ่งเริ่มต้น โพสต์ว่ากำลังหาอะไรไว้ก่อนก็ได้นะ พอมีคนที่ชอบเหมือนกันเข้ามา จะเจอเราได้ทันที',
                    "The community's just getting started. Post what you're looking for now, and people who like the same things will find you as soon as they join.",
                  )
                : t(
                    'ลองดูทุกคนก่อน หรือโพสต์ว่ากำลังหาอะไรอยู่ คนที่ชอบเหมือนกันจะได้เจอเราง่ายขึ้น',
                    "Try seeing everyone, or post what you're looking for so people who like the same things can find you more easily.",
                  )}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <ButtonLink to="/app/post" icon={<Plus size={18} strokeWidth={2.6} />}>
                {t('โพสต์กำลังหา', 'New post')}
              </ButtonLink>
              {!nobody && (
                <button type="button" onClick={() => setFilter('all')} className="h-12 rounded-full px-5 font-display font-semibold text-ink underline-offset-4 hover:underline">
                  {t('ดูทุกคน', 'See everyone')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SignalInfoSheet open={infoOpen} onClose={closeInfo} />
    </div>
  )
}
