import { AnimatePresence, motion } from 'motion/react'
import { CheckCheck, CircleSlash, Home, Inbox, RefreshCw, RotateCcw } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar, Button, PageHeader, Tabs, tabId, tabPanelId, type TabItem } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { spring } from '@/lib/motion'
import { isLive } from '@/lib/supabase'
import { CardSkeleton } from '@/pages/people/Skeleton'
import { isAdmin, type AdminReport, type Closing, type ReportStatus } from './api'
import { ReportCard } from './ReportCard'
import { ResolveSheet, SuspendSheet } from './Sheets'
import { StaffLoading, StaffOnly } from './StaffOnly'
import { StatsStrip } from './StatsStrip'
import { useAdminConsole } from './useAdminConsole'

type Check = { uid: string; ok: boolean | 'error' }

/** /admin: live mode, signed in, and `is_admin()` says yes. Everyone else gets a friendly wall. */
export default function AdminPage() {
  const { status, userId } = useAuth()
  const [check, setCheck] = useState<Check | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (status !== 'signedIn' || !userId) return
    let alive = true
    isAdmin()
      .then((ok) => alive && setCheck({ uid: userId, ok }))
      .catch((e: unknown) => {
        console.warn('[moshi] is_admin', e)
        if (alive) setCheck({ uid: userId, ok: 'error' })
      })
    return () => {
      alive = false
    }
  }, [status, userId, attempt])

  if (!isLive || status === 'demo') return <StaffOnly reason="demo" />
  if (status === 'signedOut') return <StaffOnly reason="signedOut" />
  if (status === 'loading' || !check || check.uid !== userId) return <StaffLoading />
  if (check.ok === 'error')
    return (
      <StaffOnly
        reason="error"
        onRetry={() => {
          setCheck(null)
          setAttempt((n) => n + 1)
        }}
      />
    )
  if (!check.ok) return <StaffOnly reason="denied" />
  return <Console />
}

const TABS: { key: ReportStatus; label: string; icon: ReactNode }[] = [
  { key: 'open', label: 'รอเคลียร์', icon: <Inbox size={16} /> },
  { key: 'resolved', label: 'เคลียร์แล้ว', icon: <CheckCheck size={16} /> },
  { key: 'dismissed', label: 'ไม่ผิดกติกา', icon: <CircleSlash size={16} /> },
]

const EMPTY: Record<ReportStatus, string> = {
  open: 'ถ้ามีใครแจ้งเข้ามา จะขึ้นที่นี่ กดรีเฟรชดูได้เรื่อยๆ',
  resolved: 'รายงานที่จัดการเรียบร้อยแล้วจะมาอยู่ตรงนี้',
  dismissed: 'รายงานที่ดูแล้วไม่ผิดกติกาจะมาอยู่ตรงนี้',
}

function Console() {
  const [tab, setTab] = useState<ReportStatus>('open')
  const c = useAdminConsole(tab)
  const [suspendFor, setSuspendFor] = useState<AdminReport | null>(null)
  const [resolveAsk, setResolveAsk] = useState<{ report: AdminReport; mode: Closing } | null>(null)

  // the list stops at 100 (oldest first); the stats count every open report
  const openTotal = c.stats.data?.find((s) => s.key === 'open_reports')?.value ?? c.openCount
  const items: TabItem<ReportStatus>[] = TABS.map((t) => ({ ...t, badge: t.key === 'open' ? openTotal : undefined }))

  return (
    <main className="relative z-10 mx-auto min-h-dvh max-w-6xl px-4 pb-16 lg:px-8">
      <PageHeader
        title="ดูแลชุมชน"
        subtitle="moshimoshi · ทีมงาน"
        action={
          <div className="flex items-center gap-2">
            <IconLink />
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={16} aria-hidden className={c.refreshing ? 'motion-safe:animate-spin' : ''} />}
              disabled={c.refreshing}
              onClick={c.refresh}
            >
              รีเฟรช
            </Button>
          </div>
        }
      />

      <StatsStrip stats={c.stats.data} error={c.stats.error} onRetry={c.retryStats} />

      <div className="mt-6">
        <Tabs items={items} value={tab} onChange={setTab} idBase="admin" className="w-fit max-w-full" />
      </div>

      <section id={tabPanelId('admin', tab)} role="tabpanel" aria-labelledby={tabId('admin', tab)} className="mt-4">
        {c.listError && c.reports && (
          <div role="alert" className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-butter/45 px-4 py-2.5 text-sm text-ink">
            <span className="min-w-0 flex-1">รีเฟรชรายงานไม่สำเร็จ ที่เห็นอยู่อาจยังไม่ล่าสุด</span>
            <Button size="sm" variant="secondary" icon={<RotateCcw size={16} aria-hidden />} onClick={c.retryList}>
              ลองใหม่
            </Button>
          </div>
        )}
        {c.listError && !c.reports ? (
          <div className="card flex flex-col items-center gap-3 rounded-3xl px-6 py-10 text-center" role="alert">
            <Avatar color="sky" size={72} face="sleepy" />
            <p className="text-ink-soft">โหลดรายงานไม่สำเร็จ สัญญาณอาจหลุดไปนิด</p>
            <Button size="sm" icon={<RotateCcw size={16} aria-hidden />} onClick={c.retryList}>
              ลองใหม่
            </Button>
          </div>
        ) : !c.reports ? (
          <div role="status" className="grid gap-3 xl:grid-cols-2">
            <span className="sr-only">กำลังโหลดรายงาน…</span>
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} className="h-44" />
            ))}
          </div>
        ) : c.reports.length === 0 ? (
          <Empty tab={tab} />
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            <AnimatePresence initial={false} mode="popLayout">
              {c.reports.map((r) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                  transition={spring.soft}
                  className="h-full"
                >
                  <ReportCard
                    report={r}
                    busy={c.busy}
                    onResolve={(report, mode) => setResolveAsk({ report, mode })}
                    onSuspend={setSuspendFor}
                    onUnsuspend={(report) => void c.unsuspend(report)}
                    onDeleteMessage={(report) => void c.deleteMessage(report)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
        {tab === 'open' && !!c.reports?.length && openTotal !== undefined && openTotal > c.reports.length && (
          <p className="mt-3 text-center text-sm text-ink-soft">
            แสดง {c.reports.length} รายการที่รอนานที่สุด จากทั้งหมด {openTotal} รายการ เคลียร์ชุดนี้แล้วกดรีเฟรชเพื่อดูที่เหลือ
          </p>
        )}
      </section>

      <SuspendSheet report={suspendFor} onClose={() => setSuspendFor(null)} onConfirm={(r, days, reason) => void c.suspend(r, days, reason)} />
      <ResolveSheet ask={resolveAsk} onClose={() => setResolveAsk(null)} onConfirm={(r, mode, note) => void c.resolve(r, mode, note)} />
    </main>
  )
}

function IconLink() {
  return (
    <Link
      to="/app"
      aria-label="กลับเข้าแอป"
      title="กลับเข้าแอป"
      className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-white/90 text-ink shadow-[var(--shadow-soft)] hover:bg-white"
    >
      <Home size={18} aria-hidden />
    </Link>
  )
}

function Empty({ tab }: { tab: ReportStatus }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      className="card flex flex-col items-center gap-2 rounded-3xl px-6 py-12 text-center"
    >
      <span className="animate-float">
        <Avatar color="mint" size={84} face={tab === 'open' ? 'happy' : 'smile'} />
      </span>
      <h2 className="mt-2 font-display text-xl font-semibold text-ink">{tab === 'open' ? 'ยังไม่มีรายงาน ชุมชนสงบดี' : 'ยังไม่มีรายงานในหมวดนี้'}</h2>
      <p className="max-w-xs text-sm text-ink-soft">{EMPTY[tab]}</p>
    </motion.div>
  )
}
