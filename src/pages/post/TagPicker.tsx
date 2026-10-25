import { AnimatePresence, motion } from 'motion/react'
import { Search, Sparkles, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { TagChip } from '@/components/ui'
import { CATEGORY_LABEL, TAG_BY_ID, TAGS } from '@/data/tags'
import { CATEGORY_COLOR } from '@/lib/colors'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import { PickChip, StepCard, fieldClass } from './bits'

/** Activity tag picker: suggestions for the template first, search by label or alias (วาโล, ญุ่น…). */
export function TagStep({
  value,
  guessed,
  suggestions,
  onChange,
  error,
  shakeKey,
}: {
  /** effective main tag ('' = none) */
  value: string
  /** true when the tag came from the free text, not a tap */
  guessed: boolean
  suggestions: string[]
  onChange: (id: string) => void
  error?: string
  shakeKey: number
}) {
  const [q, setQ] = useState('')
  const myTags = useMoshi((s) => s.me.tags)
  const searchId = useId()
  const query = q.trim().toLowerCase()

  const results = useMemo(() => {
    if (!query) return [...new Set([...suggestions, ...myTags])].map((id) => TAG_BY_ID[id]).filter(Boolean).slice(0, 12)
    return TAGS.filter(
      (t) =>
        t.label.toLowerCase().includes(query) ||
        t.aliases?.some((a) => a.toLowerCase().includes(query)) ||
        CATEGORY_LABEL[t.category].toLowerCase().includes(query),
    ).slice(0, 18)
  }, [query, suggestions, myTags])

  const selected = value ? TAG_BY_ID[value] : undefined

  return (
    <StepCard id="step-tag" n={3} title="กิจกรรมหลักคืออะไร?" hint="ใช้จับคู่กับคนที่ชอบเรื่องเดียวกัน" error={error} shakeKey={shakeKey}>
      <div className="mb-3 min-h-11" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring.bouncy} className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-soft">เลือกแล้ว:</span>
              <TagChip tag={selected} selected />
              {guessed ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft">
                  <Sparkles size={13} aria-hidden /> เดาจากข้อความที่พิมพ์
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-cream hover:text-ink"
                >
                  <X size={15} aria-hidden /> ล้าง
                </button>
              )}
            </motion.div>
          ) : (
            <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-11 items-center text-sm text-ink-soft">
              ยังไม่ได้เลือก แตะแท็กด้านล่าง หรือพิมพ์ค้นหาก็ได้
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <label htmlFor={searchId} className="sr-only">
        ค้นหากิจกรรม
      </label>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft" aria-hidden />
        <input
          id={searchId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหา เช่น วาโล, ญี่ปุ่น, คาเฟ่"
          className={`${fieldClass} min-h-12 pl-11`}
          autoComplete="off"
        />
      </div>

      <p className="mt-3 mb-2 text-xs font-semibold text-ink-soft">{query ? `ผลการค้นหา (${results.length})` : 'แนะนำสำหรับแบบนี้'}</p>
      <motion.div layout className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {results.map((t) => (
            <motion.span key={t.id} layout initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={spring.bouncy}>
              <PickChip selected={value === t.id} color={CATEGORY_COLOR[t.category]} onClick={() => onChange(value === t.id && !guessed ? '' : t.id)}>
                {t.label}
              </PickChip>
            </motion.span>
          ))}
        </AnimatePresence>
        {query && results.length === 0 && <p className="text-sm text-ink-soft">ยังไม่มีแท็กนี้ ลองพิมพ์คำอื่นดูนะ</p>}
      </motion.div>
    </StepCard>
  )
}
