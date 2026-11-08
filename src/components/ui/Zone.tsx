import { useId, type CSSProperties, type ReactNode } from 'react'
import { MOCHI } from '@/lib/colors'
import type { MochiColor } from '@/lib/types'

/** A link or button in a zone's title band: a small white pill. */
export const zoneAction =
  'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full bg-white/85 px-3 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-white'

export interface ZoneProps {
  title?: ReactNode
  /** small icon in a coloured bubble before the title */
  icon?: ReactNode
  /** a short line under the title */
  note?: ReactNode
  /** trailing link or buttons in the title row */
  action?: ReactNode
  /** the whole title band, for something other than a title (tabs): replaces title, icon and note */
  head?: ReactNode
  /** the zone's colour: its border, title band and icon bubble */
  tone?: MochiColor
  /** id for the title (the section is labelled by it); one is made up when left out */
  id?: string
  children: ReactNode
  className?: string
  /** extra classes for the content area */
  bodyClassName?: string
}

/**
 * One framed area of a page: a clear border in the zone's colour, a tinted title band with a
 * dashed line under it, then the content. A page reads as a few calm blocks instead of one
 * long mix, so it's obvious where each topic starts and ends. Content that scrolls sideways
 * can run to the frame's inner edge with `zone-bleed`.
 */
export function Zone({ title, icon, note, action, head, tone = 'peach', id, children, className = '', bodyClassName = '' }: ZoneProps) {
  const auto = useId()
  const titleId = id ?? `zone${auto.replace(/:/g, '')}`
  const p = MOCHI[tone]
  const style = { '--zone': p.base, '--zone-shade': p.shade, '--zone-light': p.light } as CSSProperties
  return (
    <section aria-labelledby={title && !head ? titleId : undefined} className={`zone ${className}`} style={style}>
      {head ? (
        <header className="zone-head">{head}</header>
      ) : (title || action) && (
        <header className="zone-head">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span className="zone-icon" aria-hidden>
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="font-display text-lg leading-snug font-semibold text-ink sm:text-xl">
                  {title}
                </h2>
              )}
              {note && <p className="text-xs text-ink-soft sm:text-sm">{note}</p>}
            </div>
          </div>
          {action && <div className="flex shrink-0 items-center">{action}</div>}
        </header>
      )}
      <div className={`zone-body ${bodyClassName}`}>{children}</div>
    </section>
  )
}
