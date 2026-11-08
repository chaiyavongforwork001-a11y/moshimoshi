import { useCallback, useEffect, useState } from 'react'
import { isNetworkError, writeError } from '@/data/live/errors'
import { L, t, tx, type Txt } from '@/lib/i18n'
import { useMoshi } from '@/lib/store'
import * as api from './api'
import type { AdminReport, AdminStats, Closing, ReportedMessage, ReportStatus } from './api'

type Lists = Partial<Record<ReportStatus, AdminReport[]>>
type Load<T> = { data: T | null; error: boolean }

const DAY = 86_400_000

// the short keys the admin RPCs raise (see 20261025000002_admin.sql)
const KEYS: Record<string, Txt> = {
  not_admin: L('บัญชีนี้ยังไม่มีสิทธิ์ทำอันนี้นะ', "This account isn't allowed to do that"),
  report_not_found: L('ไม่เจอรายงานนี้แล้ว ลองรีเฟรชดูนะ', "This report can't be found anymore. Try refreshing"),
  message_not_found: L('ไม่เจอข้อความนี้แล้ว อาจถูกลบไปก่อนหน้านี้', "This message can't be found. It may have been deleted already"),
  user_not_found: L('ไม่เจอบัญชีนี้แล้ว อาจปิดบัญชีไปแล้ว', "This account can't be found. It may have been closed"),
  cannot_suspend_admin: L('พักบัญชีทีมงานด้วยกันไม่ได้นะ', "Staff accounts can't be suspended"),
  own_report: L('รายงานนี้เป็นเรื่องของบัญชีเราเอง ให้ทีมงานคนอื่นดูแทนนะ', 'This report is about your own account. Ask another team member to handle it'),
}

/** `what`: the action in the current language (Thai "ลบข้อความ", English "delete the message"). */
function failText(e: unknown, what: string) {
  if (isNetworkError(e) || (typeof navigator !== 'undefined' && !navigator.onLine)) return writeError(e)
  const message = ((e && typeof e === 'object' ? (e as { message?: string }).message : '') ?? '').trim()
  const line = KEYS[message]
  return line ? tx(line) : t(`${what}ไม่สำเร็จ ลองใหม่อีกทีนะ`, `Couldn't ${what}. Try again`)
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
        status === 'resolved' ? t('เคลียร์รายงาน', 'resolve the report') : t('ปิดรายงาน', 'close the report'),
      )
    },
    [lists, run],
  )

  /** the same change on every card about that message (one photo can be reported twice) */
  const patchMessages = useCallback((match: (m: ReportedMessage) => boolean, patch: Partial<ReportedMessage>) => {
    setLists((l) => mapLists(l, (r) => (r.message && match(r.message) ? { ...r, message: { ...r.message, ...patch } } : r)))
  }, [])

  const deleteMessage = useCallback(
    (report: AdminReport) => {
      const m = report.message
      if (!m) return Promise.resolve(false)
      const path = m.image
      // a photo already out of the chat (its author unsent it, or a takedown left the file): only the file is left
      if (path && m.removedBy) {
        const sameFile = (x: ReportedMessage) => x.image === path
        const before = m.removedBy
        patchMessages(sameFile, { removedBy: 'staff', fileGone: true })
        return run(
          `file:${path}`,
          async () => {
            // the server keeps the file while an open report about this photo is about me
            if ((await api.removeReportedFile(path)) === 'kept') throw new Error('own_report')
          },
          () => patchMessages(sameFile, { removedBy: before, fileGone: false }),
          t('ลบไฟล์รูป', 'delete the photo file'),
        )
      }
      const id = path ? m.chatMessageId : m.roomMessageId
      if (!id) return Promise.resolve(false)
      const sameMessage = (x: ReportedMessage) => x.roomMessageId === id || x.chatMessageId === id
      if (!path) {
        patchMessages(sameMessage, { removedBy: 'staff' })
        return run(`msg:${id}`, () => api.deleteRoomMessage(id), () => patchMessages(sameMessage, { removedBy: null }), t('ลบข้อความ', 'delete the message'))
      }
      patchMessages(sameMessage, { removedBy: 'staff', fileGone: true })
      return run(
        `msg:${id}`,
        async () => {
          const file = await api.removeChatImage(id)
          if (file === 'deleted' || file === 'gone') return
          // the photo is out of the chat either way; the card offers to delete the file again
          patchMessages(sameMessage, { fileGone: false })
          notify(
            file === 'kept'
              ? t(
                  'รูปออกจากแชทแล้ว แต่ไฟล์รูปยังถูกเก็บไว้ เพราะมีรายงานที่เกี่ยวกับบัญชีเราเปิดอยู่ ให้ทีมงานคนอื่นลบไฟล์แทนนะ',
                  'The photo is out of the chat, but its file is kept because an open report is about your account. Ask another team member to delete it',
                )
              : t(
                  'รูปออกจากแชทแล้ว แต่ลบไฟล์รูปไม่สำเร็จ กด “ลบรูป” ที่การ์ดนี้อีกครั้งนะ',
                  "The photo is out of the chat, but its file couldn't be deleted. Press “Delete photo” on this card again",
                ),
          )
        },
        () => patchMessages(sameMessage, { removedBy: null, fileGone: false }),
        t('ลบรูป', 'remove the photo'),
      )
    },
    [run, patchMessages, notify],
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
        t('พักบัญชี', 'suspend the account'),
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
      return run(`user:${target.id}`, () => api.unsuspendUser(target.id), () => setSuspended(target.id, prev), t('ปลดพัก', 'lift the suspension'))
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
