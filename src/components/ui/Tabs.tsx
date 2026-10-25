import { motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { spring } from '@/lib/motion'

export interface TabItem<K extends string> {
  key: K
  label: string
  icon?: ReactNode
  badge?: number
}

/** ids that tie a tab to its panel: give the panel `id={tabPanelId(base, key)}` and `aria-labelledby={tabId(base, key)}`. */
export const tabId = (base: string, key: string) => `${base}-tab-${key}`
export const tabPanelId = (base: string, key: string) => `${base}-panel-${key}`

/**
 * Segmented pill tabs with a sliding squishy indicator.
 * Phones: labels only (icons from sm up) so four tabs fit at 375px; if they
 * still overflow, the strip scrolls with soft edge fades and keeps the active
 * tab in view. Arrow keys / Home / End move between tabs.
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  idBase,
  className = '',
}: {
  items: TabItem<K>[]
  value: K
  onChange: (k: K) => void
  /** pass to wire aria-controls to panels built with tabPanelId() */
  idBase?: string
  className?: string
}) {
  const id = useId()
  const list = useRef<HTMLDivElement>(null)
  const refs = useRef(new Map<K, HTMLButtonElement>())
  const [overflow, setOverflow] = useState(false)

  useEffect(() => {
    const l = list.current
    if (!l) return
    const ro = new ResizeObserver(() => setOverflow(l.scrollWidth > l.clientWidth + 1))
    ro.observe(l)
    return () => ro.disconnect()
  }, [])

  // keep the active tab inside the strip (horizontal only: never scroll the page)
  useEffect(() => {
    const l = list.current
    const el = refs.current.get(value)
    if (!l || !el || !overflow) return
    const lr = l.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    if (er.left < lr.left + 16) l.scrollLeft -= lr.left + 16 - er.left
    else if (er.right > lr.right - 16) l.scrollLeft += er.right - (lr.right - 16)
  }, [value, overflow])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.key === value)
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % items.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next < 0) return
    e.preventDefault()
    const k = items[next].key
    onChange(k)
    refs.current.get(k)?.focus()
  }

  return (
    <div
      ref={list}
      role="tablist"
      onKeyDown={onKeyDown}
      className={`no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-white/70 p-1 shadow-[var(--shadow-soft)] ${overflow ? '[mask-image:linear-gradient(90deg,transparent,#000_14px,#000_calc(100%-14px),transparent)]' : ''} ${className}`}
    >
      {items.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            ref={(el) => {
              if (el) refs.current.set(t.key, el)
              else refs.current.delete(t.key)
            }}
            role="tab"
            type="button"
            id={idBase ? tabId(idBase, t.key) : undefined}
            aria-controls={idBase ? tabPanelId(idBase, t.key) : undefined}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={`relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 font-display text-[13px] font-semibold transition-colors sm:px-4 sm:text-sm ${active ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
          >
            {active && (
              <motion.span
                layoutId={`tab-${id}`}
                className="absolute inset-0 rounded-full bg-butter shadow-[inset_0_-2px_0_rgb(59_38_34/0.12)]"
                transition={spring.bouncy}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5 whitespace-nowrap">
              {t.icon && (
                <span className="hidden sm:inline-flex" aria-hidden>
                  {t.icon}
                </span>
              )}
              {t.label}
              {!!t.badge && (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] text-ink">
                  {t.badge}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
