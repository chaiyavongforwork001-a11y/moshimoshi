// Soft placeholders shown while live data does its first sync.
import { t } from '@/lib/i18n'

export function Bone({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`block rounded-full bg-ink/10 motion-safe:animate-pulse ${className}`} />
}

/** Avatar + two lines, the shape of most cards in the app. */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`card flex items-center gap-3 rounded-3xl p-4 ${className}`}>
      <Bone className="size-14 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Bone className="h-4 w-2/5" />
        <Bone className="h-3 w-4/5" />
      </div>
    </div>
  )
}

/** A short list of card placeholders with a screen-reader status. */
export function ListSkeleton({ count = 4, label = t('กำลังโหลด…', 'Loading…'), grid = false }: { count?: number; label?: string; grid?: boolean }) {
  return (
    <div role="status" className={`mt-5 grid gap-3 ${grid ? 'md:grid-cols-2 md:gap-4' : ''}`}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} className={i > 1 ? 'opacity-70' : ''} />
      ))}
    </div>
  )
}

/** Whole-page placeholder: a big hero block and a couple of cards. */
export function PageSkeleton({ label = t('กำลังโหลด…', 'Loading…') }: { label?: string }) {
  return (
    <div role="status" className="pt-4">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="card space-y-3 rounded-[2rem] p-6">
        <Bone className="size-16" />
        <Bone className="h-6 w-1/2" />
        <Bone className="h-4 w-3/4" />
        <Bone className="h-4 w-2/3" />
      </div>
      <div className="mt-4 grid gap-3">
        <CardSkeleton />
        <CardSkeleton className="opacity-70" />
      </div>
    </div>
  )
}
