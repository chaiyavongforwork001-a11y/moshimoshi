import { Check, Share2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Avatar, Button, type MochiFace } from '@/components/ui'
import type { MochiColor } from '@/lib/types'

/** Soft placeholder rows while live data is still on its way. */
export function SoftSkeleton({ rows = 2, className = '' }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="กำลังโหลด" className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden className="card flex items-center gap-3 p-4">
          <span className="size-11 shrink-0 rounded-full bg-cream-3 motion-safe:animate-pulse" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-1/3 rounded-full bg-cream-3 motion-safe:animate-pulse" />
            <span className="block h-3 w-2/3 rounded-full bg-cream-3/70 motion-safe:animate-pulse" />
          </span>
        </div>
      ))}
    </div>
  )
}

/** Warm empty state: the mascot says what's going on, then one or two next steps. */
export function EmptyNote({
  title,
  sub,
  face = 'smile',
  color = 'peach',
  children,
  className = '',
}: {
  title: string
  sub?: string
  face?: MochiFace
  color?: MochiColor
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-white/80 bg-linear-to-br from-butter/40 via-cream-2 to-peach/30 p-5 shadow-[var(--shadow-soft)] ${className}`}
    >
      <div className="flex items-center gap-3">
        <Avatar color={color} size={52} face={face} />
        <div className="min-w-0">
          <p className="font-display text-lg leading-snug font-semibold">{title}</p>
          {sub && <p className="text-sm text-ink-soft">{sub}</p>}
        </div>
      </div>
      {children && <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">{children}</div>}
    </div>
  )
}

/** "ชวนเพื่อนมาเล่นด้วยกัน": the share sheet when there is one, otherwise copy the link. */
export function InviteButton({ variant = 'secondary', className = '' }: { variant?: 'primary' | 'secondary' | 'soft'; className?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const invite = async () => {
    const url = window.location.origin
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'moshimoshi', text: 'มาหาเพื่อนคลื่นเดียวกันที่ moshimoshi ด้วยกันนะ', url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // share sheet closed or clipboard blocked: nothing to undo
    }
  }

  return (
    <Button variant={variant} icon={copied ? <Check size={18} strokeWidth={2.8} /> : <Share2 size={18} />} onClick={invite} className={className}>
      <span aria-live="polite">{copied ? 'คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย' : 'ชวนเพื่อนมาเล่นด้วยกัน'}</span>
    </Button>
  )
}
