import { CheckCheck, CircleSlash, DoorOpen, Flag, MessageCircle, PauseCircle, PlayCircle, Trash2, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Avatar, Button } from '@/components/ui'
import { lastActiveLabel, messageTime, minutesAgo } from '@/data/live/time'
import type { AdminReport, Closing } from './api'

const stamp = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
const fullStamp = new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Bangkok' })

/** "15 นาทีที่แล้ว" within the week, then a date. */
function ago(iso: string) {
  return minutesAgo(iso) < 7 * 24 * 60 ? lastActiveLabel(iso) : messageTime(iso)
}

const fullDate = (iso: string) => {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? undefined : fullStamp.format(t)
}

export const isSuspended = (until: string | null | undefined) => !!until && Date.parse(until) > Date.now()

/** Earlier reports about the person; the server leaves out the ones closed as ไม่ผิดกติกา. */
export const priorText = (n: number) =>
  n > 0 ? `ถูกรายงานก่อนหน้านี้ ${n} ครั้ง (ไม่นับที่ไม่ผิดกติกา)` : 'ไม่มีรายงานก่อนหน้านี้ (ไม่นับที่ไม่ผิดกติกา)'

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
    <article className="card flex h-full flex-col gap-3.5 rounded-3xl p-4 sm:p-5" aria-label={`รายงาน: ${report.reason}`}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-pink/45 px-3 py-1 text-sm font-semibold text-ink">
          <Flag size={14} aria-hidden className="shrink-0" />
          <span className="truncate">{report.reason}</span>
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
              <p className="text-xs text-ink-faint">คนที่ถูกรายงาน</p>
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
            บัญชีนี้ถูกลบไปแล้ว
          </p>
        )}
        <p className="flex min-w-0 items-center gap-2 text-xs text-ink-soft sm:justify-end">
          {reporter ? <Avatar color={reporter.color} size={24} face="smile" /> : null}
          <span className="truncate">รายงานโดย {reporter?.name ?? 'บัญชีที่ลบไปแล้ว'}</span>
        </p>
      </div>

      {suspended && target?.suspendedUntil && (
        <p className="rounded-2xl bg-lavender/25 px-3 py-2 text-sm text-ink">
          <PauseCircle size={15} aria-hidden className="mr-1.5 inline -translate-y-px" />
          พักบัญชีอยู่ถึง {stamp.format(Date.parse(target.suspendedUntil))}
        </p>
      )}

      {!open && (report.note || report.resolvedAt) && (
        <p className="rounded-2xl bg-cream-2 px-3 py-2 text-sm text-ink-soft">
          {report.note ? <span className="text-ink">{report.note}</span> : 'ไม่มีบันทึก'}
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
              ปลดพัก
            </Button>
          ) : (
            <Button size="sm" variant="secondary" icon={<PauseCircle size={16} aria-hidden />} disabled={userBusy} onClick={() => act.onSuspend(report)}>
              พักบัญชี
            </Button>
          ))}
        {open && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" icon={<CircleSlash size={16} aria-hidden />} disabled={reportBusy} onClick={() => act.onResolve(report, 'dismissed')}>
              ไม่ผิดกติกา
            </Button>
            <Button size="sm" variant="dark" icon={<CheckCheck size={16} aria-hidden />} disabled={reportBusy} onClick={() => act.onResolve(report, 'resolved')}>
              เคลียร์แล้ว
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
        รายงานจากหน้าโปรไฟล์
      </p>
    )
  }
  return (
    <figure className="rounded-2xl border-l-4 border-peach bg-cream-2/80 px-3.5 py-2.5">
      <figcaption className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-soft">
        {m.kind === 'room' ? <DoorOpen size={14} aria-hidden /> : <MessageCircle size={14} aria-hidden />}
        {m.kind === 'room' ? (
          <>
            ข้อความในห้อง
            {m.roomId ? (
              <Link to={`/app/rooms/${m.roomId}`} className="font-semibold text-ink underline-offset-4 hover:underline">
                {m.context ?? m.roomId}
              </Link>
            ) : (
              m.context && <span className="font-semibold text-ink">{m.context}</span>
            )}
          </>
        ) : (
          'ข้อความในแชทส่วนตัว'
        )}
      </figcaption>
      {m.removedBy ? (
        <div className="mt-1 text-sm">
          {m.body && <s className="whitespace-pre-line text-ink-faint">{m.body}</s>}
          <p className="text-xs font-semibold text-ink-soft">{m.removedBy === 'staff' ? 'ทีมงานลบข้อความนี้แล้ว' : 'เจ้าของลบข้อความนี้ไปแล้ว'}</p>
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
    const t = window.setTimeout(() => setAsking(false), 6000)
    return () => window.clearTimeout(t)
  }, [asking, hold])

  const close = (cancel: boolean) => {
    cancelled.current = cancel
    setHold(false)
    setAsking(false)
  }

  if (!asking) {
    return (
      <Button ref={askRef} size="sm" variant="soft" icon={<Trash2 size={16} aria-hidden />} disabled={busy} onClick={() => setAsking(true)}>
        ลบข้อความ
      </Button>
    )
  }
  return (
    <span
      className="inline-flex flex-wrap items-center gap-1.5 rounded-full bg-cream-3/70 py-1 pr-1 pl-3 text-sm font-semibold text-ink"
      role="group"
      aria-label="ยืนยันการลบข้อความ"
      aria-live="polite"
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHold(false)
      }}
    >
      ลบจริงไหม
      <Button
        size="sm"
        variant="dark"
        onClick={() => {
          close(false)
          onConfirm()
        }}
      >
        ลบเลย
      </Button>
      <Button ref={noRef} size="sm" variant="ghost" onClick={() => close(true)}>
        ไม่ลบ
      </Button>
    </span>
  )
}

function StatusBadge({ status }: { status: AdminReport['status'] }) {
  return status === 'resolved' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-mint/50 px-2.5 py-0.5 text-xs font-semibold text-ink">
      <CheckCheck size={13} aria-hidden />
      เคลียร์แล้ว
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/8 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
      <CircleSlash size={13} aria-hidden />
      ไม่ผิดกติกา
    </span>
  )
}
