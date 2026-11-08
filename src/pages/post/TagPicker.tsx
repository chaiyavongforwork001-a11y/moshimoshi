import { AnimatePresence, motion } from 'motion/react'
import { Plus, Search, Sparkles, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { OwnOption, TagChip } from '@/components/ui'
import { CATEGORY_LABEL, isOwnTag, OWN_TAG_MAX, ownTagId, sameTag, tagMatches, tagOf, TAGS } from '@/data/tags'
import { CATEGORY_COLOR } from '@/lib/colors'
import { t } from '@/lib/i18n'
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
    if (!query) return [...new Set([...suggestions, ...myTags])].flatMap((id) => tagOf(id) ?? []).slice(0, 12)
    const mine = myTags.filter(isOwnTag).flatMap((id) => tagOf(id) ?? [])
    return [...mine.filter((tg) => tg.label.toLowerCase().includes(query)), ...TAGS.filter(
      (tg) => tagMatches(tg, query) || CATEGORY_LABEL[tg.category].toLowerCase().includes(query),
    )].slice(0, 18)
  }, [query, suggestions, myTags])

  const selected = value ? tagOf(value) : undefined
  // what they typed, if it isn't one we already show
  const typedId = query ? ownTagId(q) : null
  const typed = typedId && isOwnTag(typedId) && !results.some((tg) => sameTag(tg.id, typedId)) ? tagOf(typedId) : undefined
  const pickTyped = () => {
    if (!typed) return
    onChange(typed.id)
    setQ('')
  }

  return (
    <StepCard
      id="step-tag"
      n={3}
      title={t('กิจกรรมหลักคืออะไร?', "What's the main activity?")}
      hint={t('ใช้จับคู่กับคนที่ชอบเรื่องเดียวกัน', 'We use it to match you with people into the same thing')}
      error={error}
      shakeKey={shakeKey}
    >
      <div className="mb-3 min-h-11" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring.bouncy} className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-soft">{t('เลือกแล้ว:', 'Picked:')}</span>
              <TagChip tag={selected} selected />
              {guessed ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft">
                  <Sparkles size={13} aria-hidden /> {t('เดาจากข้อความที่พิมพ์', 'Guessed from your text')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-cream hover:text-ink"
                >
                  <X size={15} aria-hidden /> {t('ล้าง', 'Clear')}
                </button>
              )}
            </motion.div>
          ) : (
            <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-11 items-center text-sm text-ink-soft">
              {t('ยังไม่ได้เลือก แตะแท็กด้านล่าง หรือพิมพ์ค้นหาก็ได้', 'Nothing yet. Tap a tag below or search')}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <label htmlFor={searchId} className="sr-only">
        {t('ค้นหากิจกรรม', 'Search activities')}
      </label>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft" aria-hidden />
        <input
          id={searchId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
            e.preventDefault()
            if (!query) return
            if (results[0]) {
              onChange(results[0].id)
              setQ('')
            } else pickTyped()
          }}
          placeholder={t('ค้นหา เช่น วาโล, ญี่ปุ่น, คาเฟ่', 'Search, e.g. Valo, Japanese, café')}
          className={`${fieldClass} min-h-12 pl-11`}
          autoComplete="off"
        />
      </div>

      <p className="mt-3 mb-2 text-xs font-semibold text-ink-soft">{query ? t(`ผลการค้นหา (${results.length})`, `Results (${results.length})`) : t('แนะนำสำหรับแบบนี้', 'Suggested for this post')}</p>
      <motion.div layout className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {results.map((tg) => (
            <motion.span key={tg.id} layout className="max-w-full" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={spring.bouncy}>
              <PickChip selected={value === tg.id} color={CATEGORY_COLOR[tg.category]} onClick={() => onChange(value === tg.id && !guessed ? '' : tg.id)}>
                <span className="min-w-0 truncate">{tg.label}</span>
              </PickChip>
            </motion.span>
          ))}
        </AnimatePresence>
        {typed && (
          <PickChip selected={false} onClick={pickTyped} icon={<Plus size={16} strokeWidth={2.8} className="shrink-0" aria-hidden />} className="max-w-full border-2 border-dashed border-ink/25">
            <span className="min-w-0 truncate">{t(`ใช้ "${typed.label}"`, `Use "${typed.label}"`)}</span>
          </PickChip>
        )}
        {!query && (
          <OwnOption
            label={t('อื่นๆ พิมพ์เอง', 'Other (type your own)')}
            name={t('พิมพ์กิจกรรมเอง', 'Type your own activity')}
            placeholder={t('เช่น ปีนผา, ทำเซรามิก', 'e.g. climbing, pottery')}
            maxLength={OWN_TAG_MAX}
            onAdd={(text) => {
              const id = ownTagId(text)
              if (!id) return false
              onChange(id)
            }}
          />
        )}
      </motion.div>
    </StepCard>
  )
}
