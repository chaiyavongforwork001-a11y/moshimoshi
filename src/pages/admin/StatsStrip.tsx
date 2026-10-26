import { RotateCcw } from 'lucide-react'
import { L, t, texts } from '@/lib/i18n'
import type { AdminStats } from './api'

const LABEL: Readonly<Record<string, string>> = texts({
  open_reports: L('รอเคลียร์', 'Open reports'),
  users: L('สมาชิกทั้งหมด', 'Total members'),
  active_24h: L('เข้ามาใน 24 ชม.', 'Active in 24h'),
  messages_24h: L('ข้อความใน 24 ชม.', 'Messages in 24h'),
})

// a warm tint on the numbers that ask for attention
const TINT: Record<string, string> = {
  open_reports: 'bg-butter/45 border-butter',
}

const fmt = new Intl.NumberFormat('th-TH')

export function StatsStrip({ stats, error, onRetry }: { stats: AdminStats | null; error: boolean; onRetry: () => void }) {
  if (!stats && error) {
    return (
      <div className="card mt-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm text-ink-soft" role="alert">
        {t('ดึงตัวเลขภาพรวมไม่สำเร็จ', "Couldn't load the overview numbers")}
        <button type="button" onClick={onRetry} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 font-semibold text-ink hover:bg-ink/5">
          <RotateCcw size={16} aria-hidden />
          {t('ลองใหม่', 'Retry')}
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
    <ul className="mt-1 grid grid-cols-2 gap-2.5 sm:grid-cols-4" aria-label={t('ภาพรวม', 'Overview')}>
      {stats.map((s) => (
        <li key={s.key} className={`rounded-2xl border px-4 py-3 shadow-[var(--shadow-soft)] ${TINT[s.key] && s.value > 0 ? TINT[s.key] : 'border-line bg-white'}`}>
          <p className="truncate text-xs font-semibold text-ink-soft">{LABEL[s.key] ?? s.key.replaceAll('_', ' ')}</p>
          <p className="font-display text-2xl leading-tight font-semibold text-ink tabular-nums">{fmt.format(s.value)}</p>
        </li>
      ))}
    </ul>
  )
}
