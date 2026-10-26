import { AnimatePresence, motion } from 'motion/react'
import { CalendarHeart, DoorOpen, Radio, Search, Sparkles, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { KineticText } from '@/components/motion'
import { Avatar, Button, Chip, PageHeader, tabId, tabPanelId, Tabs, type TabItem } from '@/components/ui'
import { useDataReady, usePeople, useRooms, useSessions } from '@/data/hooks'
import { getLang, L, loc, t } from '@/lib/i18n'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Room } from '@/lib/types'
import { ListSkeleton } from '@/pages/people/Skeleton'
import { LiveDot } from './bits'
import { FeaturedRoomCard, RoomCard } from './list/RoomCard'
import { nextSession, rankRooms, roomMatches, sortBySession } from './roomData'

type Filter = 'forYou' | 'mine' | 'live' | 'soon'

const FILTERS: TabItem<Filter>[] = [
  loc<TabItem<Filter>>({ key: 'forYou', label: L('แนะนำ', 'For you'), icon: <Sparkles size={16} strokeWidth={2.4} /> }),
  loc<TabItem<Filter>>({ key: 'mine', label: L('ห้องที่เข้าแล้ว', 'My rooms'), icon: <DoorOpen size={16} strokeWidth={2.4} /> }),
  loc<TabItem<Filter>>({ key: 'live', label: L('กำลังคุย', 'Live now'), icon: <Radio size={16} strokeWidth={2.4} /> }),
  loc<TabItem<Filter>>({ key: 'soon', label: L('เร็วๆ นี้', 'Coming up'), icon: <CalendarHeart size={16} strokeWidth={2.4} /> }),
]

const SEARCH_IDEAS = { th: ['วาโล', 'อนิเมะ', 'คาเฟ่', 'ญี่ปุ่น', 'คอนเสิร์ต'], en: ['Valo', 'Anime', 'Café', 'Japanese', 'Concert'] }

export default function RoomsPage() {
  const ready = useDataReady()
  const allRooms = useRooms()
  const totalOnline = allRooms.reduce((n, r) => n + r.onlineCount, 0)
  return (
    <>
      <PageHeader
        title={<KineticText text={t('ห้อง', 'Rooms')} />}
        subtitle={
          !ready ? (
            t('กำลังเปิดประตูห้องต่างๆ…', 'Opening the room doors…')
          ) : totalOnline > 0 ? (
            <>
              <LiveDot className="mr-1.5 align-middle" />
              {t(`ตอนนี้มีเพื่อนออนไลน์ ${totalOnline} คน รอคุยอยู่`, `${totalOnline} ${totalOnline === 1 ? 'person is' : 'people are'} online and up for a chat`)}
            </>
          ) : (
            t('แวะเข้าห้องที่ชอบ แล้วทักทายเพื่อนๆ ได้เลย', 'Pop into a room you like and say hi')
          )
        }
      />
      {ready ? <RoomsBrowser allRooms={allRooms} /> : <ListSkeleton count={4} grid label={t('กำลังโหลดห้อง…', 'Loading rooms…')} />}
    </>
  )
}

function RoomsBrowser({ allRooms }: { allRooms: Room[] }) {
  const me = useMoshi((s) => s.me)
  const joinRoom = useMoshi((s) => s.joinRoom)
  const leaveRoom = useMoshi((s) => s.leaveRoom)
  const people = usePeople()
  const sessions = useSessions()
  const [filter, setFilter] = useState<Filter>('forYou')
  const [query, setQuery] = useState('')
  const q = useDeferredValue(query.trim())

  const ranked = useMemo(() => rankRooms(allRooms, me, people), [allRooms, me, people])
  // The top pick is chosen once (best room I'm not in yet) so joining it doesn't swap the card away.
  const [featuredId] = useState(() => (ranked.find((r) => !me.rooms.includes(r.id)) ?? ranked[0])?.id)
  const showFeatured = filter === 'forYou' && !q
  const featured = ranked.find((r) => r.id === featuredId)

  const rooms = useMemo(() => {
    let list: Room[]
    if (filter === 'mine') list = ranked.filter((r) => me.rooms.includes(r.id))
    else if (filter === 'live') list = allRooms.filter((r) => r.onlineCount > 0).sort((a, b) => b.onlineCount - a.onlineCount)
    else if (filter === 'soon') list = allRooms.filter((r) => nextSession(r.id, sessions)).sort(sortBySession(sessions))
    else list = ranked
    list = list.filter((r) => roomMatches(r, q))
    return showFeatured ? list.filter((r) => r.id !== featuredId) : list
  }, [filter, ranked, allRooms, sessions, me.rooms, q, showFeatured, featuredId])

  const toggle = (r: Room) => (me.rooms.includes(r.id) ? leaveRoom(r.id) : joinRoom(r.id))

  return (
    <>

      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-3">
        <motion.form variants={fadeUp} role="search" onSubmit={(e) => e.preventDefault()} className="relative">
          <label htmlFor="room-search" className="sr-only">
            {t('ค้นหาห้อง', 'Search rooms')}
          </label>
          <Search size={20} strokeWidth={2.4} className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            id="room-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ค้นหาห้อง เช่น วาโล, อนิเมะ, คาเฟ่', 'Search rooms, e.g. Valo, anime, café')}
            autoComplete="off"
            enterKeyHint="search"
            className="glass h-13 w-full rounded-full pr-14 pl-12 text-[15px] text-ink outline-none placeholder:text-ink-faint focus-visible:ring-3 focus-visible:ring-lavender [&::-webkit-search-cancel-button]:hidden"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                aria-label={t('ล้างคำค้นหา', 'Clear search')}
                onClick={() => setQuery('')}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileTap={{ scale: 0.85 }}
                transition={spring.bouncy}
                className="absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink hover:bg-ink/5"
              >
                <X size={18} strokeWidth={2.6} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.form>

        <motion.div variants={fadeUp}>
          <Tabs items={FILTERS} value={filter} onChange={setFilter} idBase="rooms" className="w-fit max-w-full" />
        </motion.div>
      </motion.div>

      <p className="sr-only" aria-live="polite">
        {q ? t(`พบ ${rooms.length} ห้องที่ตรงกับ ${q}`, `${rooms.length} ${rooms.length === 1 ? 'room matches' : 'rooms match'} ${q}`) : ''}
      </p>

      <div className="mt-5" role="tabpanel" id={tabPanelId('rooms', filter)} aria-labelledby={tabId('rooms', filter)}>
        <AnimatePresence initial={false}>
          {showFeatured && featured && (
            <motion.div
              key="featured"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.18 } }}
              transition={spring.soft}
              className="mb-4"
            >
              <FeaturedRoomCard room={featured} me={me} joined={me.rooms.includes(featured.id)} onToggle={() => toggle(featured)} />
            </motion.div>
          )}
        </AnimatePresence>

        {rooms.length > 0 ? (
          <motion.ul variants={stagger(0.05, 0.1)} initial="hidden" animate="show" className="relative grid gap-3 md:grid-cols-2 md:gap-4">
            <AnimatePresence mode="popLayout">
              {rooms.map((r, i) => (
                <motion.li
                  key={r.id}
                  layout
                  variants={fadeUp}
                  exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
                  className={rooms.length % 2 === 1 && i === rooms.length - 1 ? 'md:col-span-2' : ''}
                >
                  <RoomCard room={r} me={me} joined={me.rooms.includes(r.id)} onToggle={() => toggle(r)} showSession={filter === 'soon'} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        ) : (
          <EmptyState
            filter={filter}
            query={q}
            onClear={() => setQuery('')}
            onIdea={setQuery}
            onBrowse={() => {
              setQuery('')
              setFilter('forYou')
            }}
          />
        )}
      </div>
    </>
  )
}

function EmptyState({
  filter,
  query,
  onClear,
  onIdea,
  onBrowse,
}: {
  filter: Filter
  query: string
  onClear: () => void
  onIdea: (q: string) => void
  onBrowse: () => void
}) {
  const searching = !!query
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      className="card flex flex-col items-center px-6 py-10 text-center"
    >
      <motion.span animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 1.6, repeat: 1 }}>
        <Avatar color={searching ? 'sky' : 'cream'} size={84} face={searching ? 'wow' : 'sleepy'} />
      </motion.span>
      <h2 className="mt-3 font-display text-xl font-semibold">
        {searching
          ? t(`ยังไม่เจอห้องที่ตรงกับ “${query}”`, `No rooms match “${query}” yet`)
          : filter === 'mine'
            ? t('ยังไม่ได้เข้าห้องไหนเลย', "You haven't joined any rooms yet")
            : t('ตอนนี้ยังเงียบๆ อยู่', "It's quiet right now")}
      </h2>
      <p className="mt-1 max-w-sm text-ink-soft">
        {searching
          ? t('ลองคำอื่นดูไหม หรือเลือกจากเรื่องที่คนชอบคุยกันบ่อยๆ', 'Try another word, or pick from what people talk about most')
          : filter === 'mine'
            ? t('เข้าห้องที่ชอบไว้ แล้วห้องจะมารออยู่ตรงนี้ กลับมาคุยต่อได้ทุกเมื่อ', "Join rooms you like and they'll wait for you here, ready whenever you are")
            : t('แวะดูห้องที่เหมาะกับเราก่อนก็ได้นะ', 'Have a look at rooms picked for you')}
      </p>
      {searching && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {SEARCH_IDEAS[getLang()].filter((s) => s !== query).map((s) => (
            <Chip key={s} onClick={() => onIdea(s)} icon={<Search size={14} strokeWidth={2.4} />}>
              {s}
            </Chip>
          ))}
        </div>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {searching && (
          <Button variant="soft" onClick={onClear}>
            {t('ล้างคำค้นหา', 'Clear search')}
          </Button>
        )}
        {(filter !== 'forYou' || searching) && (
          <Button icon={<Sparkles size={18} strokeWidth={2.4} />} onClick={onBrowse}>
            {t('ดูห้องที่เหมาะกับเรา', 'Rooms for you')}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
