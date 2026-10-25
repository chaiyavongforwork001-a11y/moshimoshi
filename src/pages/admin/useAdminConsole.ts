import { useCallback, useEffect, useState } from 'react'
import { isNetworkError, writeError } from '@/data/live/errors'
import { useMoshi } from '@/lib/store'
import * as api from './api'
import type { AdminReport, AdminStats, Closing, ReportStatus } from './api'

type Lists = Partial<Record<ReportStatus, AdminReport[]>>
type Load<T> = { data: T | null; error: boolean }

const DAY = 86_400_000

// the short keys the admin RPCs raise (see 20261025000002_admin.sql)
const KEYS: Record<string, string> = {
  not_admin: 'บัญชีนี้ยังไม่มีสิทธิ์ทำอันนี้นะ',
  report_not_found: 'ไม่เจอรายงานนี้แล้ว ลองรีเฟรชดูนะ',
  message_not_found: 'ไม่เจอข้อความนี้แล้ว อาจถูกลบไปก่อนหน้านี้',
  user_not_found: 'ไม่เจอบัญชีนี้แล้ว อาจปิดบัญชีไปแล้ว',
  cannot_suspend_admin: 'พักบัญชีทีมงานด้วยกันไม่ได้นะ',
  own_report: 'รายงานนี้เป็นเรื่องของบัญชีเราเอง ให้ทีมงานคนอื่นดูแทนนะ',
}

function failText(e: unknown, what: string) {
  if (isNetworkError(e) || (typeof navigator !== 'undefined' && !navigator.onLine)) return writeError(e)
  const message = ((e && typeof e === 'object' ? (e as { message?: string }).message : '') ?? '').trim()
  return KEYS[message] ?? `${what}ไม่สำเร็จ ลองใหม่อีกทีนะ`
}

const mapLists = (l: Lists, fn: (r: AdminReport) => AdminReport): Lists =>
  Object.fromEntries(Object.entries(l).map(([k, rows]) => [k, rows?.map(fn)])) as Lists

/**
 * Reports per tab, the stats strip and the moderation actions. Every action
 * shows its result right away and puts things back (with a toast) when the
 * server says no. `busy` holds keys like "report:<id>" while a call is out.
 */
export function useAdminConsole(tab: ReportStatus) {
  const notify = useMoshi((s) => s.notify)
  const [lists, setLists] = useState<Lists>({})
  const [listError, setListError] = useState<Partial<Record<ReportStatus, boolean>>>({})
  const [stats, setStats] = useState<Load<AdminStats>>({ data: null, error: false })
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set())
  const [refreshing, setRefreshing] = useState(false)

  const loadList = useCallback(async (status: ReportStatus) => {
    setListError((e) => ({ ...e, [status]: false }))
    try {
      const rows = await api.listReports(status)
      setLists((l) => ({ ...l, [status]: rows }))
    } catch (e) {
      console.warn('[moshi] admin reports', e)
      setListError((x) => ({ ...x, [status]: true }))
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const data = await api.fetchStats()
      setStats({ data, error: false })
    } catch (e) {
      console.warn('[moshi] admin stats', e)
      setStats((s) => ({ data: s.data, error: true }))
    }
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  const loaded = !!lists[tab]
  useEffect(() => {
    if (!loaded) void loadList(tab)
  }, [tab, loaded, loadList])

  const refresh = useCallback(() => {
    // the other tabs reload the next time they're opened
    setLists((l) => ({ [tab]: l[tab] }))
    setRefreshing(true)
    void Promise.all([loadList(tab), loadStats()]).finally(() => setRefreshing(false))
  }, [tab, loadList, loadStats])

  const run = useCallback(
    async (key: string, work: () => Promise<unknown>, undo: () => void, what: string) => {
      setBusy((b) => new Set(b).add(key))
      try {
        await work()
        void loadStats()
        return true
      } catch (e) {
        console.warn('[moshi] admin action', e)
        undo()
        notify(failText(e, what))
        return false
      } finally {
        setBusy((b) => {
          const n = new Set(b)
          n.delete(key)
          return n
        })
      }
    },
    [notify, loadStats],
  )

  const resolve = useCallback(
    (report: AdminReport, status: Closing, note: string | null) => {
      const from = report.status
      const index = lists[from]?.findIndex((r) => r.id === report.id) ?? -1
      const closed: AdminReport = { ...report, status, note, resolvedAt: new Date().toISOString() }
      setLists((l) => {
        const into = l[status]
        return { ...l, [from]: l[from]?.filter((r) => r.id !== report.id), [status]: into && [closed, ...into.filter((r) => r.id !== report.id)] }
      })
      return run(
        `report:${report.id}`,
        () => api.resolveReport(report.id, status, note),
        () =>
          setLists((l) => {
            const back = l[from]?.filter((r) => r.id !== report.id)
            if (back) back.splice(index < 0 ? 0 : Math.min(index, back.length), 0, report)
            return { ...l, [from]: back, [status]: l[status]?.filter((r) => r.id !== report.id) }
          }),
        status === 'resolved' ? 'เคลียร์รายงาน' : 'ปิดรายงาน',
      )
    },
    [lists, run],
  )

  const setRemoved = useCallback((messageId: string, removed: boolean) => {
    setLists((l) =>
      mapLists(l, (r) => (r.message?.roomMessageId === messageId ? { ...r, message: { ...r.message, removedBy: removed ? 'staff' : null } } : r)),
    )
  }, [])

  const deleteMessage = useCallback(
    (report: AdminReport) => {
      const id = report.message?.roomMessageId
      if (!id) return Promise.resolve(false)
      setRemoved(id, true)
      return run(`msg:${id}`, () => api.deleteRoomMessage(id), () => setRemoved(id, false), 'ลบข้อความ')
    },
    [run, setRemoved],
  )

  const setSuspended = useCallback((userId: string, until: string | null) => {
    setLists((l) => mapLists(l, (r) => (r.target?.id === userId ? { ...r, target: { ...r.target, suspendedUntil: until } } : r)))
  }, [])

  const suspend = useCallback(
    (report: AdminReport, days: number, reason: string) => {
      const target = report.target
      if (!target) return Promise.resolve(false)
      const prev = target.suspendedUntil
      setSuspended(target.id, new Date(Date.now() + days * DAY).toISOString())
      return run(
        `user:${target.id}`,
        async () => {
          // the server's own end time
          const until = await api.suspendUser(target.id, days, reason)
          if (until) setSuspended(target.id, until)
        },
        () => setSuspended(target.id, prev),
        'พักบัญชี',
      )
    },
    [run, setSuspended],
  )

  const unsuspend = useCallback(
    (report: AdminReport) => {
      const target = report.target
      if (!target) return Promise.resolve(false)
      const prev = target.suspendedUntil
      setSuspended(target.id, null)
      return run(`user:${target.id}`, () => api.unsuspendUser(target.id), () => setSuspended(target.id, prev), 'ปลดพัก')
    },
    [run, setSuspended],
  )

  return {
    reports: lists[tab] ?? null,
    listError: !!listError[tab],
    openCount: lists.open?.length,
    stats,
    busy,
    refreshing,
    refresh,
    retryList: () => void loadList(tab),
    retryStats: () => void loadStats(),
    resolve,
    deleteMessage,
    suspend,
    unsuspend,
  }
}
