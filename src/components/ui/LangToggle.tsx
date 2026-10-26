import { motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { getLang, setLang, useLang, type Lang } from '@/lib/i18n'
import { spring } from '@/lib/motion'

const OPTIONS: { lang: Lang; label: string; name: string }[] = [
  { lang: 'th', label: 'ไทย', name: 'ภาษาไทย' },
  { lang: 'en', label: 'EN', name: 'English' },
]

/** Which toggle (in page order) had focus when the language changed, so the remounted one can take it back. */
let pendingFocus: { index: number; lang: Lang } | null = null

/**
 * ไทย | EN pill. The page re-renders in the new language right after the
 * pill slides over (switching remounts the route tree, this button included).
 */
export function LangToggle({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const lang = useLang()
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(lang)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!pendingFocus) return
    const group = document.querySelectorAll('[data-lang-toggle]')[pendingFocus.index]
    group?.querySelector<HTMLButtonElement>(`button[lang="${pendingFocus.lang}"]`)?.focus()
    pendingFocus = null
  }, [])

  const pick = (next: Lang) => {
    if (next === shown) return
    setShown(next)
    const el = root.current
    const index = el?.contains(document.activeElement) ? [...document.querySelectorAll('[data-lang-toggle]')].indexOf(el) : -1
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (next === getLang()) return
      pendingFocus = index >= 0 ? { index, lang: next } : null
      setLang(next)
    }, 240)
  }

  const h = size === 'sm' ? 'h-9' : 'h-11'
  return (
    <div
      ref={root}
      role="group"
      aria-label="ภาษา / Language"
      data-lang-toggle
      className={`relative inline-flex shrink-0 items-center rounded-full bg-white/75 p-1 ring-1 ring-ink/10 shadow-[var(--shadow-soft)] ${h} ${className}`}
    >
      {OPTIONS.map((o) => {
        const on = shown === o.lang
        return (
          <button
            key={o.lang}
            type="button"
            lang={o.lang}
            aria-pressed={on}
            aria-label={o.name}
            onClick={() => pick(o.lang)}
            className={`relative h-full min-w-10 rounded-full px-2.5 font-display text-sm font-bold transition-colors ${on ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
          >
            {on && <motion.span layoutId={`lang-pill-${id}`} className="absolute inset-0 rounded-full bg-butter shadow-[var(--shadow-soft)]" transition={spring.bouncy} />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
