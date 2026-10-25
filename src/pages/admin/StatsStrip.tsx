import { RotateCcw } from 'lucide-react'
import type { AdminStats } from './api'

const LABEL: Record<string, string> = {
  open_reports: 'รอเคลียร์',
  users: 'สมาชิกทั้งหมด',
  active_24h: 'เข้ามาใน 24 ชม.',
  messages_24h: 'ข้อความใน 24 ชม.',
}

// a warm tint on the numbers that ask for attention
const TINT: Record<string, string> = {
  open_reports: 'bg-butter/45 border-butter',
}

const fmt = new Intl.NumberFormat('th-TH')

export function StatsStrip({ stats, error, onRetry }: { stats: AdminStats | null; error: boolean; onRetry: () => void }) {
  if (!stats && error) {
    return (
      <div className="card mt-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm text-ink-soft" role="alert">
        ดึงตัวเลขภาพรวมไม่สำเร็จ
        <button type="button" onClick={onRetry} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 font-semibold text-ink hover:bg-ink/5">
          <RotateCcw size={16} aria-hidden />
          ลองใหม่
        </button>
      </div>
    )
  }
  if (!stats) {
    return (
      <ul className="mt-1 grid grid-cols-2 gap-2.5 sm:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="card h-[76px] rounded-2xl motion-safe:animate-pulse" />
        ))}
      </ul>
    )
  }
  if (!stats.length) return null
  return (
    <ul className="mt-1 grid grid-cols-2 gap-2.5 sm:grid-cols-4" aria-label="ภาพรวม">
      {stats.map((s) => (
        <li key={s.key} className={`rounded-2xl border px-4 py-3 shadow-[var(--shadow-soft)] ${TINT[s.key] && s.value > 0 ? TINT[s.key] : 'border-line bg-white'}`}>
          <p className="truncate text-xs font-semibold text-ink-soft">{LABEL[s.key] ?? s.key.replaceAll('_', ' ')}</p>
          <p className="font-display text-2xl leading-tight font-semibold text-ink tabular-nums">{fmt.format(s.value)}</p>
        </li>
      ))}
    </ul>
  )
}
