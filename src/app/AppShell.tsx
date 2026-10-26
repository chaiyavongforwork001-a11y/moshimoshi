import { motion } from 'motion/react'
import { DoorOpen, Download, MessageCircle, MoonStar, Plus, Radio, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, NavLink, useLocation, useOutlet } from 'react-router'
import { JellyRipple, Magnetic, RouteTransition } from '@/components/motion'
import { Avatar, ButtonLink, SignalMeter } from '@/components/ui'
import { useChats, useDataMode, useDataReady, useMatches, usePeople, useRooms, useSessions } from '@/data/hooks'
import { useInstallPrompt, useIsDesktop, useMediaQuery } from '@/lib/hooks'
import { displayName, L, loc, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { MatchResult, Room, Session, User } from '@/lib/types'
import { InstallSheet } from './InstallSheet'

interface NavItem {
  to: string
  label: string
  /** compact label for the phone tab bar */
  short?: string
  Icon: LucideIcon
  end?: boolean
}

const NAV: NavItem[] = [
  loc<NavItem>({ to: '/app', label: L('คืนนี้', 'Tonight'), Icon: MoonStar, end: true }),
  loc<NavItem>({ to: '/app/rooms', label: L('ห้อง', 'Rooms'), Icon: DoorOpen }),
  loc<NavItem>({ to: '/app/people', label: L('คนคลื่นเดียวกัน', 'Same wavelength'), short: L('คลื่นเดียวกัน', 'Wavelength'), Icon: Radio }),
  loc<NavItem>({ to: '/app/chats', label: L('แชท', 'Chats'), Icon: MessageCircle }),
]

/*
 * Enter-only page transition: the new page renders in the same commit as the
 * location change, so ScrollRestoration measures (and restores into) the new
 * page instead of the outgoing one. RouteTransition adds the circular wipe
 * from the tap point on top of the shared page fade.
 */
function AnimatedOutlet() {
  const location = useLocation()
  const outlet = useOutlet()
  return <RouteTransition routeKey={location.pathname}>{outlet}</RouteTransition>
}

/** Unread 1:1 messages across all chats (badge on the แชท tab). */
function useUnread() {
  const chats = useChats()
  return chats.reduce((n, c) => n + c.unread, 0)
}

/**
 * Live mode: the 20+ check happens in onboarding, so a signed-in profile that
 * never passed it (not onboarded, no birth year) is sent there first.
 */
function useNeedsAgeCheck() {
  const mode = useDataMode()
  const ready = useDataReady()
  const onboarded = useMoshi((s) => s.onboarded)
  const birthYear = useMoshi((s) => s.me.birthYear)
  return mode === 'live' && ready && !onboarded && !birthYear
}

export function AppShell() {
  const needsAgeCheck = useNeedsAgeCheck()
  const desktop = useIsDesktop()
  // the right rail only once the content column keeps its full width beside it
  const wide = useMediaQuery('(min-width: 1440px)')
  const location = useLocation()
  // full-screen pages (1:1 chat on phones) hide the bottom bar
  const immersive = !desktop && /^\/app\/chats\/[^/]+$/.test(location.pathname)

  if (needsAgeCheck) return <Navigate to="/onboarding" replace />

  return (
    <div className="relative z-10 min-h-dvh">
      {desktop ? (
        <div className="mx-auto flex max-w-[1440px] gap-6 px-6">
          <Sidebar />
          <main className="min-w-0 flex-1 pb-16">
            <div className="mx-auto max-w-3xl">
              <AnimatedOutlet />
            </div>
          </main>
          {wide && <RightRail />}
        </div>
      ) : (
        <>
          <main className={`px-4 ${immersive ? '' : 'pb-28'}`}>
            <AnimatedOutlet />
          </main>
          {!immersive && <BottomNav />}
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ mobile
function BottomNav() {
  const unread = useUnread()
  const items = [NAV[0], NAV[1]]
  const right = [NAV[2], NAV[3]]
  return (
    <nav aria-label={t('เมนูหลัก', 'Main menu')} className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-3">
      <div className="glass relative mx-auto flex max-w-md items-center justify-between rounded-[1.75rem] px-2 py-1.5">
        {items.map((n) => (
          <TabLink key={n.to} item={n} />
        ))}
        <Link to="/app/post" aria-label={t('โพสต์กำลังหา', "Post what you're looking for")} className="relative -mt-8 flex flex-col items-center">
          <Magnetic max={8}>
            <motion.span
              whileTap={{ scaleX: 1.1, scaleY: 0.84 }}
              transition={{ type: 'spring', stiffness: 520, damping: 11, mass: 0.6 }}
              className="relative flex size-16 items-center justify-center rounded-full bg-coral text-ink shadow-[var(--shadow-puffy)] ring-4 ring-cream"
            >
              <Plus size={30} strokeWidth={2.8} />
              <JellyRipple />
            </motion.span>
          </Magnetic>
          <span className="mt-0.5 text-[11px] font-semibold text-ink">{t('กำลังหา', 'Post')}</span>
        </Link>
        {right.map((n) => (
          <TabLink key={n.to} item={n} badge={n.to === '/app/chats' ? unread : undefined} />
        ))}
      </div>
    </nav>
  )
}

function TabLink({ item, badge }: { item: NavItem; badge?: number }) {
  return (
    <NavLink to={item.to} end={item.end} className="relative flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-2 py-1 text-[11px] font-semibold">
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="tab-bg" className="absolute inset-0 rounded-2xl bg-butter/70" transition={spring.bouncy} />}
          <span className="relative">
            <item.Icon size={24} strokeWidth={isActive ? 2.6 : 2} className="text-ink" />
            {!!badge && (
              <span className="absolute -top-1.5 -right-2.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-coral px-1 text-[10px] text-ink ring-2 ring-white">
                {badge}
                <span className="sr-only">{t(' ข้อความใหม่', badge === 1 ? ' new message' : ' new messages')}</span>
              </span>
            )}
          </span>
          <span className={`relative whitespace-nowrap ${isActive ? 'text-ink' : 'text-ink-soft'}`}>{item.short ?? item.label}</span>
        </>
      )}
    </NavLink>
  )
}

// ------------------------------------------------------------------ desktop
function Sidebar() {
  const me = useMoshi((s) => s.me)
  const unread = useUnread()
  const install = useInstallPrompt()
  const [installOpen, setInstallOpen] = useState(false)
  return (
    <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col py-6">
      <Link to="/" className="flex items-center gap-2.5 px-2" aria-label={t('moshimoshi หน้าแรก', 'moshimoshi home')}>
        <img src="/logo.svg" alt="" className="size-11 rounded-2xl shadow-[var(--shadow-soft)]" />
        <span className="font-display text-2xl font-bold tracking-tight">moshimoshi</span>
      </Link>
      <nav aria-label={t('เมนูหลัก', 'Main menu')} className="mt-8 flex flex-col gap-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="relative flex h-12 items-center gap-3 rounded-2xl px-4 font-display font-semibold">
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="side-bg" className="absolute inset-0 rounded-2xl bg-white shadow-[var(--shadow-soft)]" transition={spring.soft} />}
                <n.Icon size={22} strokeWidth={isActive ? 2.6 : 2} className="relative text-ink" />
                <span className={`relative ${isActive ? 'text-ink' : 'text-ink-soft'}`}>{n.label}</span>
                {n.to === '/app/chats' && !!unread && (
                  <span className="relative ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-coral px-2 text-xs text-ink">
                    {unread}
                    <span className="sr-only">{t(' ข้อความใหม่', unread === 1 ? ' new message' : ' new messages')}</span>
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <Magnetic className="mt-5" max={6} strength={0.25}>
        <ButtonLink to="/app/post" block size="lg" icon={<Plus size={20} strokeWidth={2.8} />} data-cursor={t('เขียนโพสต์', 'Write a post')}>
          {t('โพสต์กำลังหา', 'New post')}
          <JellyRipple />
        </ButtonLink>
      </Magnetic>
      <div className="mt-auto space-y-3">
        {!install.installed && (
          <button
            type="button"
            onClick={() => setInstallOpen(true)}
            className="glass flex w-full items-center gap-3 rounded-3xl p-3 text-left"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-mint/60">
              <Download size={20} />
            </span>
            <span className="text-sm leading-snug">
              <b className="font-display">{t('ติดตั้งแอป', 'Install the app')}</b>
              <br />
              <span className="text-ink-soft">{t('เปิดไว บนหน้าจอโฮม', 'Opens fast from your home screen')}</span>
            </span>
          </button>
        )}
        <NavLink to="/app/me" className="flex items-center gap-3 rounded-3xl p-2 hover:bg-white/60">
          <Avatar color={me.color} size={44} face="happy" online />
          <span className="min-w-0">
            <span className="block truncate font-display font-semibold">{displayName(me.name)}</span>
            <span className="block truncate text-xs text-ink-soft">{t('ดูโปรไฟล์ของเรา', 'View my profile')}</span>
          </span>
        </NavLink>
      </div>
      <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />
    </aside>
  )
}

function RightRail() {
  const ready = useDataReady()
  const matches = useMatches()
  const people = usePeople()
  const sessions = useSessions()
  const rooms = useRooms()
  const top = useMemo(
    () =>
      matches
        .slice(0, 3)
        .map((m) => ({ m, u: people.find((p) => p.id === m.userId) }))
        .filter((x): x is { m: MatchResult; u: User } => !!x.u),
    [matches, people],
  )
  const tonight = useMemo(
    () =>
      sessions
        .filter((s) => s.dayOffset === 0)
        .sort((a, b) => a.time.localeCompare(b.time))
        .slice(0, 3)
        .map((s) => ({ s, room: rooms.find((r) => r.id === s.roomId) }))
        .filter((x): x is { s: Session; room: Room } => !!x.room),
    [sessions, rooms],
  )
  return (
    <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 flex-col gap-5 overflow-y-auto py-8 min-[1440px]:flex">
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{t('คนคลื่นเดียวกัน', 'Same wavelength')}</h2>
          <Link to="/app/people" className="text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
            {t('ดูทั้งหมด', 'See all')}
          </Link>
        </div>
        {!ready ? (
          <RailSkeleton />
        ) : top.length ? (
          <ul className="space-y-1">
            {top.map(({ m, u }) => (
              <li key={m.userId}>
                <Link to={`/app/people/${u.id}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-cream">
                  <Avatar color={u.color} size={42} online={u.isOnline} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-semibold">{u.name}</span>
                    <span className="block truncate text-xs text-ink-soft">{m.reasons[0]?.text}</span>
                  </span>
                  <SignalMeter level={m.level} size="sm" showLabel={false} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-cream p-3 text-sm text-ink-soft">
            {t(
              'ยังไม่เจอใครคลื่นตรงกันเลย ลองโพสต์กำลังหาไว้ ใครใช่จะเห็นเราก่อน',
              "No one on your wavelength yet. Post what you're looking for and the right people will see you first",
            )}
          </p>
        )}
      </div>
      <div className="card p-4">
        <h2 className="mb-3 font-display text-lg font-semibold">{t('รอบคุยคืนนี้', "Tonight's sessions")}</h2>
        {!ready ? (
          <RailSkeleton />
        ) : tonight.length ? (
          <ul className="space-y-2">
            {tonight.map(({ s, room }) => (
              <li key={s.id}>
                <Link to={`/app/rooms/${s.roomId}`} className="flex items-center gap-3 rounded-2xl bg-cream p-3 hover:bg-cream-2">
                  <span className="w-12 font-display text-sm font-bold">{s.time}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{s.title}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {room.name} · {t(`${s.going} คนจะมา`, `${s.going} going`)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-cream p-3 text-sm text-ink-soft">
            {t('คืนนี้ยังไม่มีรอบคุย แวะไปนั่งเล่นในห้องก่อนได้นะ', 'No sessions tonight. Drop by a room and hang out for now')}
          </p>
        )}
      </div>
    </aside>
  )
}

function RailSkeleton() {
  return (
    <div role="status" aria-label={t('กำลังโหลด', 'Loading')} className="space-y-2">
      {[0, 1].map((i) => (
        <span key={i} aria-hidden className="block h-12 rounded-2xl bg-cream motion-safe:animate-pulse" />
      ))}
    </div>
  )
}
