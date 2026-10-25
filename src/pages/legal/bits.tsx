import { Scale } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

/** Lawyer review mode: dev builds, or any build opened with ?review (e.g. /privacy?review). */
export function useReviewNotes() {
  const { search } = useLocation()
  return import.meta.env.DEV || new URLSearchParams(search).has('review')
}

/** Paragraph with the extra line height Thai legal text needs. */
export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 leading-[1.9] text-ink">{children}</p>
}

export function Sub({ children }: { children: ReactNode }) {
  return <h3 className="mt-7 font-display text-lg font-semibold text-ink">{children}</h3>
}

export function List({ children, ordered }: { children: ReactNode; ordered?: boolean }) {
  const cls = `mt-3 space-y-2 pl-6 leading-[1.85] text-ink marker:text-ink-soft ${ordered ? 'list-decimal' : 'list-disc'}`
  return ordered ? <ol className={cls}>{children}</ol> : <ul className={cls}>{children}</ul>
}

/** Something still to fill in before launch, e.g. the company name. Rendered as a yellow [placeholder]. */
export function Ph({ children }: { children: ReactNode }) {
  return <mark className="rounded-md bg-butter/70 px-1 py-0.5 text-ink [box-decoration-break:clone]">[{children}]</mark>
}

/** A point for the reviewing lawyer, shown only in review mode. Remove these once the text is final. */
export function Note({ children }: { children: ReactNode }) {
  if (!useReviewNotes()) return null
  return (
    <div role="note" className="mt-4 flex gap-2.5 rounded-2xl bg-lavender/20 p-3.5 text-sm leading-relaxed text-ink">
      <Scale size={17} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden />
      <p>
        <b className="font-semibold">ถึงทนาย: </b>
        {children}
      </p>
    </div>
  )
}

/** A row of the "what for / which data / on what basis" list (a table would be cramped on phones). */
export function Basis({ purpose, data, basis }: { purpose: ReactNode; data: ReactNode; basis: ReactNode }) {
  return (
    <li className="rounded-2xl bg-cream-2/70 p-4">
      <p className="font-display font-semibold leading-snug text-ink">{purpose}</p>
      <dl className="mt-2 grid gap-1 text-[15px] leading-[1.8] sm:grid-cols-[7.5rem_1fr]">
        <dt className="text-ink-soft">ข้อมูลที่ใช้</dt>
        <dd className="text-ink">{data}</dd>
        <dt className="text-ink-soft">ฐานทางกฎหมาย</dt>
        <dd className="text-ink">{basis}</dd>
      </dl>
    </li>
  )
}
