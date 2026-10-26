import { CheckCheck, CircleSlash, DoorOpen, Flag, MessageCircle, PauseCircle, PlayCircle, Trash2, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Avatar, Button } from '@/components/ui'
import { useCatalog } from '@/data/catalog'
import { lastActiveLabel, messageTime, minutesAgo } from '@/data/live/time'
import { dateLocale, known, t } from '@/lib/i18n'
import { roomInLang } from '@/lib/i18n/catalog'
import type { Room } from '@/lib/types'
import type { AdminReport, Closing } from './api'

const stamp = (ms: number) =>
  new Intl.DateTimeFormat(dateLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }).format(ms)
const fullStamp = (ms: number) => new Intl.DateTimeFormat(dateLocale(), { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(ms)

/** "15 นาทีที่แล้ว" within the week, then a date. */
function ago(iso: string) {
  return known(minutesAgo(iso) < 7 * 24 * 60 ? lastActiveLabel(iso) : messageTime(iso))
}

const fullDate = (iso: string) => {
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? undefined : fullStamp(ms)
}

/**
 * reports.reason is stored as the Thai option text from the report sheet
 * (people/profile/SafetyMenu); known() has the English labels.
 */
export const reasonLabel = (reason: string) => known(reason)

/** The room's English name when we have one; the name stored with the report otherwise. */
const roomName = (id: string, stored: string | null) => roomInLang({ id, name: stored ?? id } as Room).name

/** Same, when only the stored (Thai) room name is left. */
const roomNameByStored = (stored: string) => {
  const room = useCatalog.getState().rooms.find((r) => r.name === stored)
  return room ? roomName(room.id, stored) : stored
}

export const isSuspended = (until: string | null | undefined) => !!until && Date.parse(until) > Date.now()

/** Earlier reports about the person; the server leaves out the ones closed as ไม่ผิดกติกา. */
export const priorText = (n: number) =>
  n > 0
    ? t(`ถูกรายงานก่อนหน้านี้ ${n} ครั้ง (ไม่นับที่ไม่ผิดกติกา)`, `Reported ${n} ${n === 1 ? 'time' : 'times'} before (not counting “no violation”)`)
    : t('ไม่มีรายงานก่อนหน้านี้ (ไม่นับที่ไม่ผิดกติกา)', 'No earlier reports (not counting “no violation”)')

export interface CardActions {
  onResolve: (r: AdminReport, mode: Closing) => void
  onSuspend: (r: AdminReport) => void
  onUnsuspend: (r: AdminReport) => void
  onDeleteMessage: (r: AdminReport) => void
}

export function ReportCard({ report, busy, ...act }: { report: AdminReport; busy: ReadonlySet<string> } & CardActions) {
  const { target, reporter, message } = report
  const open = report.status === 'open'
  const suspended = isSuspended(target?.suspendedUntil)
  const userBusy = !!target && busy.has(`user:${target.id}`)
  const reportBusy = busy.has(`report:${report.id}`)
  const canDelete = !!message?.roomMessageId && !message.removedBy

  return (
    <article className="card flex h-full flex-col gap-3.5 rounded-3xl p-4 sm:p-5" aria-label={t(`รายงาน: ${report.reason}`, `Report: ${reasonLabel(report.reason)}`)}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-pink/45 px-3 py-1 text-sm font-semibold text-ink">
          <Flag size={14} aria-hidden className="shrink-0" />
          <span className="truncate">{reasonLabel(report.reason)}</span>
        </span>
        {!open && <StatusBadge status={report.status} />}
        <time dateTime={report.createdAt} title={fullDate(report.createdAt)} className="ml-auto text-xs text-ink-faint">
          {ago(report.createdAt)}
        </time>
      </header>

      {report.details && <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink">{report.details}</p>}

      <Context report={report} />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        {target ? (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar color={target.color} size={44} face={suspended ? 'sleepy' : 'smile'} />
            <div className="min-w-0">
              <p className="text-xs text-ink-faint">{t('คนที่ถูกรายงาน', 'Reported person')}</p>
              <Link to={`/app/people/${target.id}`} className="block truncate font-display font-semibold text-ink underline-offset-4 hover:underline">
                {target.name}
              </Link>
              <p className={`text-xs ${target.priorReports >= 2 ? 'font-semibold text-coral-deep' : 'text-ink-soft'}`}>
                {priorText(target.priorReports)}
              </p>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <UserRound size={16} aria-hidden />
            {t('บัญชีนี้ถูกลบไปแล้ว', 'This account has been deleted')}
          </p>
        )}
        <p className="flex min-w-0 items-center gap-2 text-xs text-ink-soft sm:justify-end">
          {reporter ? <Avatar color={reporter.color} size={24} face="smile" /> : null}
          <span className="truncate">
            {t(`รายงานโดย ${reporter?.name ?? 'บัญชีที่ลบไปแล้ว'}`, `Reported by ${reporter?.name ?? 'a deleted account'}`)}
          </span>
        </p>
      </div>

      {suspended && target?.suspendedUntil && (
        <p className="rounded-2xl bg-lavender/25 px-3 py-2 text-sm text-ink">
          <PauseCircle size={15} aria-hidden className="mr-1.5 inline -translate-y-px" />
          {t(`พักบัญชีอยู่ถึง ${stamp(Date.parse(target.suspendedUntil))}`, `Suspended until ${stamp(Date.parse(target.suspendedUntil))}`)}
        </p>
      )}

      {!open && (report.note || report.resolvedAt) && (
        <p className="rounded-2xl bg-cream-2 px-3 py-2 text-sm text-ink-soft">
          {report.note ? <span className="text-ink">{report.note}</span> : t('ไม่มีบันทึก', 'No note')}
          <span className="text-ink-faint">
            {report.resolverName && ` · ${report.resolverName}`}
            {report.resolvedAt && ` · ${ago(report.resolvedAt)}`}
          </span>
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
        {canDelete && <DeleteMessage busy={busy.has(`msg:${message?.roomMessageId}`)} onConfirm={() => act.onDeleteMessage(report)} />}
        {target &&
          (suspended ? (
            <Button size="sm" variant="secondary" icon={<PlayCircle size={16} aria-hidden />} disabled={userBusy} onClick={() => act.onUnsuspend(report)}>
              {t('ปลดพัก', 'Lift suspension')}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" icon={<PauseCircle size={16} aria-hidden />} disabled={userBusy} onClick={() => act.onSuspend(report)}>
              {t('พักบัญชี', 'Suspend')}
            </Button>
          ))}
        {open && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" icon={<CircleSlash size={16} aria-hidden />} disabled={reportBusy} onClick={() => act.onResolve(report, 'dismissed')}>
              {t('ไม่ผิดกติกา', 'No violation')}
            </Button>
            <Button size="sm" variant="dark" icon={<CheckCheck size={16} aria-hidden />} disabled={reportBusy} onClick={() => act.onResolve(report, 'resolved')}>
              {t('เคลียร์แล้ว', 'Resolve')}
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}

/** Where it happened, with the reported message quoted when there is one. */
function Context({ report }: { report: AdminReport }) {
  const m = report.message
  if (!m) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-ink-soft">
        <UserRound size={15} aria-hidden />
        {t('รายงานจากหน้าโปรไฟล์', 'Reported from their profile')}
      </p>
    )
  }
  return (
    <figure className="rounded-2xl border-l-4 border-peach bg-cream-2/80 px-3.5 py-2.5">
      <figcaption className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-soft">
        {m.kind === 'room' ? <DoorOpen size={14} aria-hidden /> : <MessageCircle size={14} aria-hidden />}
        {m.kind === 'room' ? (
          <>
            {t('ข้อความในห้อง', 'Message in room')}
            {m.roomId ? (
              <Link to={`/app/rooms/${m.roomId}`} className="font-semibold text-ink underline-offset-4 hover:underline">
                {roomName(m.roomId, m.context)}
              </Link>
            ) : (
              m.context && <span className="font-semibold text-ink">{roomNameByStored(m.context)}</span>
            )}
          </>
        ) : (
          t('ข้อความในแชทส่วนตัว', 'Message in a private chat')
        )}
      </figcaption>
      {m.removedBy ? (
        <div className="mt-1 text-sm">
          {m.body && <s className="whitespace-pre-line text-ink-faint">{m.body}</s>}
          <p className="text-xs font-semibold text-ink-soft">{m.removedBy === 'staff' ? t('ทีมงานลบข้อความนี้แล้ว', 'Removed by staff') : t('เจ้าของลบข้อความนี้ไปแล้ว', 'Deleted by its author')}</p>
        </div>
      ) : (
        <blockquote className="mt-1 text-[15px] whitespace-pre-line text-ink">{m.body}</blockquote>
      )}
    </figure>
  )
}

/**
 * Two taps: ask first, then delete. Focus moves to "ไม่ลบ", and back to the delete button
 * on "ไม่ลบ". The question folds back after a few seconds, but never while focus is inside it.
 */
function DeleteMessage({ busy, onConfirm }: { busy: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false)
  const [hold, setHold] = useState(false)
  const noRef = useRef<HTMLButtonElement>(null)
  const askRef = useRef<HTMLButtonElement>(null)
  const cancelled = useRef(false)

  useEffect(() => {
    if (asking) noRef.current?.focus()
    else if (cancelled.current) askRef.current?.focus()
    cancelled.current = false
  }, [asking])

  useEffect(() => {
    if (!asking || hold) return
    const timer = window.setTimeout(() => setAsking(false), 6000)
    return () => window.clearTimeout(timer)
  }, [asking, hold])

  const close = (cancel: boolean) => {
    cancelled.current = cancel
    setHold(false)
    setAsking(false)
  }

  if (!asking) {
    return (
      <Button ref={askRef} size="sm" variant="soft" icon={<Trash2 size={16} aria-hidden />} disabled={busy} onClick={() => setAsking(true)}>
        {t('ลบข้อความ', 'Delete message')}
      </Button>
    )
  }
  return (
    <span
      className="inline-flex flex-wrap items-center gap-1.5 rounded-full bg-cream-3/70 py-1 pr-1 pl-3 text-sm font-semibold text-ink"
      role="group"
      aria-label={t('ยืนยันการลบข้อความ', 'Confirm deleting the message')}
      aria-live="polite"
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHold(false)
      }}
    >
      {t('ลบจริงไหม', 'Delete it?')}
      <Button
        size="sm"
        variant="dark"
        onClick={() => {
          close(false)
          onConfirm()
        }}
      >
        {t('ลบเลย', 'Delete')}
      </Button>
      <Button ref={noRef} size="sm" variant="ghost" onClick={() => close(true)}>
        {t('ไม่ลบ', 'Keep')}
      </Button>
    </span>
  )
}

function StatusBadge({ status }: { status: AdminReport['status'] }) {
  return status === 'resolved' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-mint/50 px-2.5 py-0.5 text-xs font-semibold text-ink">
      <CheckCheck size={13} aria-hidden />
      {t('เคลียร์แล้ว', 'Resolved')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/8 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
      <CircleSlash size={13} aria-hidden />
      {t('ไม่ผิดกติกา', 'No violation')}
    </span>
  )
}
