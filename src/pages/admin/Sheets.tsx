import { CheckCheck, CircleSlash, PauseCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { Avatar, Button, Sheet } from '@/components/ui'
import type { AdminReport, Closing } from './api'
import { priorText } from './ReportCard'

const DAYS = [1, 7, 30] as const
const DAY = 86_400_000
const untilFmt = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' })

const field = 'mt-2 block w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-ink focus:border-lavender'

/** พักบัญชี: how long (1/7/30 days) and why. Opens with the report's reason filled in. */
export function SuspendSheet({
  report,
  onClose,
  onConfirm,
}: {
  report: AdminReport | null
  onClose: () => void
  onConfirm: (report: AdminReport, days: number, reason: string) => void
}) {
  return (
    <Sheet open={!!report?.target} onClose={onClose} title="พักบัญชีชั่วคราว" width={480}>
      {report?.target && <SuspendForm key={report.id} report={report} onClose={onClose} onConfirm={onConfirm} />}
    </Sheet>
  )
}

function SuspendForm({
  report,
  onClose,
  onConfirm,
}: {
  report: AdminReport
  onClose: () => void
  onConfirm: (report: AdminReport, days: number, reason: string) => void
}) {
  const target = report.target!
  const [days, setDays] = useState<number>(7)
  const [reason, setReason] = useState(report.reason)
  const id = useId()
  const ok = reason.trim().length > 0

  return (
    <form
      className="space-y-4 pb-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!ok) return
        onConfirm(report, days, reason.trim())
        onClose()
      }}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
        <Avatar color={target.color} size={44} face="sleepy" />
        <div className="min-w-0">
          <p className="truncate font-display font-semibold text-ink">{target.name}</p>
          <p className="text-sm text-ink-soft">{priorText(target.priorReports)}</p>
        </div>
      </div>

      <fieldset>
        <legend className="font-display font-semibold">นานเท่าไหร่</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DAYS.map((d) => (
            <label
              key={d}
              className={`flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border px-3 font-display font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-lavender ${days === d ? 'border-ink bg-ink text-cream' : 'border-line bg-white text-ink hover:bg-cream-2'}`}
            >
              <input type="radio" name={`${id}-days`} value={d} checked={days === d} onChange={() => setDays(d)} className="sr-only" />
              {d} วัน
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          ถึง{untilFmt.format(Date.now() + days * DAY)} ระหว่างนี้ยังเปิดดูแอปได้ แต่ส่งข้อความ โพสต์ และส่งโมชิไม่ได้ ปลดพักก่อนได้ทุกเมื่อ
        </p>
      </fieldset>

      <div>
        <label htmlFor={`${id}-reason`} className="font-display font-semibold">
          เหตุผล <span className="font-body text-sm font-normal text-ink-soft">(บันทึกไว้ให้ทีมงาน)</span>
        </label>
        <textarea
          id={`${id}-reason`}
          rows={3}
          maxLength={300}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-describedby={`${id}-reason-hint`}
          className={field}
        />
        <p id={`${id}-reason-hint`} className="mt-1.5 text-sm text-ink-soft">
          เจ้าของบัญชีจะเห็นแค่ว่าบัญชีพักอยู่ถึงวันไหน ไม่เห็นข้อความนี้
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" variant="dark" block icon={<PauseCircle size={18} aria-hidden />} disabled={!ok}>
          พักบัญชี {days} วัน
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          ยกเลิก
        </Button>
      </div>
    </form>
  )
}

const RESOLVE: Record<Closing, { title: string; text: string; cta: string }> = {
  resolved: {
    title: 'เคลียร์รายงานนี้',
    text: 'ใช้เมื่อจัดการเรียบร้อยแล้ว เช่น ลบข้อความหรือพักบัญชีไปแล้ว รายงานจะย้ายไปอยู่ในแท็บ “เคลียร์แล้ว”',
    cta: 'เคลียร์แล้ว',
  },
  dismissed: {
    title: 'ปิดรายงาน: ไม่ผิดกติกา',
    text: 'ใช้เมื่อดูแล้วไม่ผิดกติกา รายงานจะย้ายไปอยู่ในแท็บ “ไม่ผิดกติกา”',
    cta: 'ปิดรายงาน',
  },
}

/** เคลียร์แล้ว / ไม่ผิดกติกา, with an optional note for the rest of the team. */
export function ResolveSheet({
  ask,
  onClose,
  onConfirm,
}: {
  ask: { report: AdminReport; mode: Closing } | null
  onClose: () => void
  onConfirm: (report: AdminReport, mode: Closing, note: string | null) => void
}) {
  return (
    <Sheet open={!!ask} onClose={onClose} title={ask ? RESOLVE[ask.mode].title : undefined} width={480}>
      {ask && <ResolveForm key={`${ask.report.id}-${ask.mode}`} {...ask} onClose={onClose} onConfirm={onConfirm} />}
    </Sheet>
  )
}

function ResolveForm({
  report,
  mode,
  onClose,
  onConfirm,
}: {
  report: AdminReport
  mode: Closing
  onClose: () => void
  onConfirm: (report: AdminReport, mode: Closing, note: string | null) => void
}) {
  const [note, setNote] = useState('')
  const id = useId()
  const copy = RESOLVE[mode]
  return (
    <form
      className="space-y-4 pb-3"
      onSubmit={(e) => {
        e.preventDefault()
        onConfirm(report, mode, note.trim() || null)
        onClose()
      }}
    >
      <p className="text-ink-soft">{copy.text}</p>
      <div>
        <label htmlFor={`${id}-note`} className="font-display font-semibold">
          บันทึกสั้นๆ <span className="font-body text-sm font-normal text-ink-soft">(ไม่บังคับ)</span>
        </label>
        <textarea
          id={`${id}-note`}
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === 'resolved' ? 'เช่น ลบข้อความแล้ว เตือนไปหนึ่งครั้ง' : 'เช่น คุยเล่นกันปกติ ไม่ผิดกติกา'}
          className={`${field} placeholder:text-ink-faint/70`}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="submit"
          variant={mode === 'resolved' ? 'dark' : 'secondary'}
          block
          icon={mode === 'resolved' ? <CheckCheck size={18} aria-hidden /> : <CircleSlash size={18} aria-hidden />}
        >
          {copy.cta}
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          ยกเลิก
        </Button>
      </div>
    </form>
  )
}
