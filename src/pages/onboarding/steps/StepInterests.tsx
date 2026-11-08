import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { Plus, Search, Star, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Avatar, Button, OwnOption } from '@/components/ui'
import { CATEGORY_LABEL, isOwnTag, MAX_OWN_TAGS, OWN_TAG_MAX, ownTagId, sameTag, tagMatches, tagOf, TAGS, tagsInText } from '@/data/tags'
import { CATEGORY_COLOR } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { fadeUp, spring } from '@/lib/motion'
import type { Tag, TagCategory } from '@/lib/types'
import { MAX_LOVES, MIN_TAGS, type StepProps } from '../model'
import { keyPop, keyWiggle } from '../parts/hooks'
import { InterestChip } from '../parts/InterestChip'
import { Pill } from '../parts/Pill'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as TagCategory[]
/** the groups with listed tags; "อื่นๆ" comes last and holds what people typed themselves */
const LISTED = CATEGORIES.filter((c) => c !== 'other')

/** Label, alias or free-text match ("วาโล", "ญุ่น", "stardew" all work). */
function searchTags(query: string): Tag[] {
  const q = query.trim().toLowerCase()
  if (!q) return TAGS
  const hits = new Set(tagsInText(q))
  return TAGS.filter((t) => hits.has(t.id) || tagMatches(t, q))
}

export function StepInterests({ draft, update }: StepProps) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<TagCategory | 'all'>('all')
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null)
  const [starScope, wiggleStars] = useAnimate<HTMLSpanElement>()

  const searching = query.trim().length > 0
  const own = useMemo(() => draft.tags.filter(isOwnTag).flatMap((id) => tagOf(id) ?? []), [draft.tags])
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? [...own.filter((t) => t.label.toLowerCase().includes(q)), ...searchTags(query)] : TAGS
  }, [query, own])
  const groups = useMemo(() => {
    if (searching) return results.length ? [{ key: 'search', title: t(`ผลการค้นหา "${query.trim()}"`, `Results for "${query.trim()}"`), tags: results }] : []
    const cats = LISTED.filter((c) => cat === 'all' || cat === c)
    return cats.map((c) => ({ key: c, title: CATEGORY_LABEL[c], tags: results.filter((t) => t.category === c) })).filter((g) => g.tags.length)
  }, [searching, query, results, cat])

  const n = draft.tags.length
  const pickedIn = (c: TagCategory) => draft.tags.filter((t) => tagOf(t)?.category === c).length
  const ownFull = own.length >= MAX_OWN_TAGS

  // what they typed in the search box, if it isn't something we already have
  const typedId = searching ? ownTagId(query) : null
  const typed = typedId && isOwnTag(typedId) && !draft.tags.some((t) => sameTag(t, typedId)) ? tagOf(typedId) : undefined

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 2600)
    return () => window.clearTimeout(t)
  }, [notice])

  const toggle = (id: string) =>
    update((d) => (d.tags.includes(id) ? { tags: d.tags.filter((t) => t !== id), loves: d.loves.filter((t) => t !== id) } : { tags: [...d.tags, id] }))

  /** Their own words → a tag (or the listed one if it's already there). False when there's no room left. */
  const addOwn = (text: string): boolean => {
    const id = ownTagId(text)
    if (!id) return false
    if (draft.tags.some((t) => sameTag(t, id))) return true
    if (isOwnTag(id) && ownFull) {
      ownLimit()
      return false
    }
    update((d) => ({ tags: [...d.tags, id] }))
    return true
  }

  const ownLimit = () =>
    setNotice({
      id: Date.now(),
      text: t(`เพิ่มเองได้ ${MAX_OWN_TAGS} เรื่องนะ เอาเรื่องเดิมออกก่อนได้เลย`, `You can add ${MAX_OWN_TAGS} of your own. Remove one first`),
    })

  const toggleLove = (id: string) => {
    if (draft.loves.includes(id)) {
      update((d) => ({ loves: d.loves.filter((t) => t !== id) }))
      return
    }
    if (draft.loves.length >= MAX_LOVES) {
      setNotice({
        id: Date.now(),
        text: t(`ติดดาว "รักมาก" ได้ ${MAX_LOVES} อย่างนะ เอาดาวอันอื่นออกก่อนได้เลย`, `You can star ${MAX_LOVES} as "Love it". Unstar one first`),
      })
      if (starScope.current) wiggleStars(starScope.current, { rotate: [0, -10, 10, -6, 6, 0], scale: [1, 1.15, 1] }, { duration: 0.45 })
      if (!draft.tags.includes(id)) update((d) => ({ tags: [...d.tags, id] })) // a hold still picks it
      return
    }
    update((d) => ({ tags: d.tags.includes(id) ? d.tags : [...d.tags, id], loves: [...d.loves, id] }))
  }

  return (
    <div className="space-y-5">
      <motion.div variants={fadeUp} className="relative">
        <label htmlFor="ob-tag-search" className="sr-only">
          {t('ค้นหาเรื่องที่ชอบ', 'Search interests')}
        </label>
        <Search size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft" aria-hidden />
        <input
          id="ob-tag-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter picks the first match (or adds what they typed) instead of moving to the next step
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
            e.preventDefault()
            if (!searching) return
            const first = results[0]
            if (first) {
              if (!draft.tags.includes(first.id)) toggle(first.id)
              setQuery('')
            } else if (addOwn(query)) setQuery('')
          }}
          enterKeyHint="search"
          autoComplete="off"
          placeholder={t('ลองพิมพ์ วาโล, ญี่ปุ่น, แมว, คาเฟ่…', 'Try Valo, Japanese, cat, café…')}
          className="h-13 w-full rounded-full border-2 border-line bg-white pr-12 pl-11 text-base text-ink shadow-[var(--shadow-soft)] outline-none placeholder:text-ink-faint focus:border-peach focus-visible:ring-4 focus-visible:ring-peach/40 [&::-webkit-search-cancel-button]:hidden"
        />
        <AnimatePresence>
          {searching && (
            <motion.button
              type="button"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={spring.bouncy}
              onClick={() => setQuery('')}
              aria-label={t('ล้างคำค้นหา', 'Clear search')}
              className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:text-ink"
            >
              <X size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* the visitor's box: progress toward 3 + star toggles */}
      <motion.section variants={fadeUp} aria-labelledby="ob-picked" className="glass rounded-[1.75rem] p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="ob-picked" className="flex items-center gap-2.5 font-display text-base font-semibold text-ink">
            {t(`เลือกแล้ว ${n} อย่าง`, `${n} picked`)}
            <span className="flex gap-1" aria-hidden>
              {Array.from({ length: MIN_TAGS }, (_, i) => (
                <motion.span
                  key={i}
                  className={`block size-3 rounded-full ${i < n ? 'bg-coral' : 'bg-ink/15'}`}
                  animate={{ scale: i < n ? [1, 1.5, 1] : 1, transition: keyPop }}
                />
              ))}
            </span>
          </h2>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <span ref={starScope} className="inline-flex gap-0.5" aria-hidden>
              {Array.from({ length: MAX_LOVES }, (_, i) => (
                <Star key={i} size={15} className={i < draft.loves.length ? 'text-ink' : 'text-ink/25'} fill={i < draft.loves.length ? 'currentColor' : 'none'} />
              ))}
            </span>
            {t('รักมาก', 'Love it')} {draft.loves.length}/{MAX_LOVES}
          </p>
        </div>

        {n === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            {t('แตะแท็กด้านล่างเพื่อเลือก แตะค้างไว้เพื่อติดดาว "รักมาก"', 'Tap a tag below to pick it. Press and hold to star it as "Love it"')}
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-soft">
              {t(
                `กดดาวให้เรื่องที่รักที่สุด (ได้ ${MAX_LOVES} อย่าง) จะได้เจอเพื่อนที่ใช่ขึ้นนะ`,
                `Star the ones you love most (up to ${MAX_LOVES}) to find even better matches`,
              )}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {draft.tags.map((id) => {
                  const tag = tagOf(id)
                  if (!tag) return null
                  const loved = draft.loves.includes(id)
                  return (
                    <motion.li key={id} layout className="max-w-full" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={spring.bouncy}>
                      <motion.button
                        type="button"
                        aria-pressed={loved}
                        aria-label={t(`ติดดาวรักมาก ${tag.label}`, `Star ${tag.label} as Love it`)}
                        onClick={() => toggleLove(id)}
                        whileTap={{ scale: 0.9 }}
                        transition={spring.bouncy}
                        className={`inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                          loved ? 'border-butter bg-butter text-ink shadow-[inset_0_-2px_0_rgb(59_38_34/0.12)]' : 'border-line bg-white text-ink'
                        }`}
                      >
                        <motion.span animate={{ rotate: loved ? 360 : 0, scale: loved ? [1, 1.35, 1] : 1, transition: keyWiggle }} className="inline-flex" aria-hidden>
                          <Star size={15} fill={loved ? 'currentColor' : 'none'} strokeWidth={2.2} />
                        </motion.span>
                        <span className="min-w-0 truncate">{tag.label}</span>
                      </motion.button>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          </>
        )}
        <div aria-live="polite">
          <AnimatePresence>
            {notice && (
              <motion.p
                key={notice.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 rounded-2xl bg-butter/50 px-3 py-2 text-sm text-ink"
              >
                {notice.text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* category filter */}
      <motion.div
        variants={fadeUp}
        role="group"
        aria-label={t('กรองตามหมวด', 'Filter by category')}
        className={`no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-1.5 transition-opacity lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 ${searching ? 'opacity-50' : ''}`}
      >
        <Pill selected={cat === 'all'} onClick={() => setCat('all')} color="peach" className="snap-start">
          {t('ทั้งหมด', 'All')}
        </Pill>
        {CATEGORIES.map((c) => {
          const picked = pickedIn(c)
          return (
            <Pill key={c} selected={cat === c} onClick={() => setCat(c)} color={CATEGORY_COLOR[c]} className="snap-start">
              {CATEGORY_LABEL[c]}
              {picked > 0 && (
                <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-bold text-cream">
                  {picked}
                </span>
              )}
            </Pill>
          )
        })}
      </motion.div>

      {searching && !results.length && typed && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-3 rounded-3xl bg-white/70 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Avatar color="cream" size={48} face="wow" />
            <p className="min-w-0 text-[15px] text-ink">
              {t(`ยังไม่มี "${typed.label}" ในรายการเลย เพิ่มเองได้นะ`, `"${typed.label}" isn't on the list yet. Add it yourself!`)}
            </p>
          </div>
          <Button block icon={<Plus size={18} strokeWidth={2.8} aria-hidden />} onClick={() => addOwn(query) && setQuery('')}>
            <span className="min-w-0 truncate">{t(`เพิ่ม "${typed.label}"`, `Add "${typed.label}"`)}</span>
          </Button>
        </motion.div>
      )}

      {groups.map((g) => (
        <motion.section key={g.key} variants={fadeUp}>
          <h3 className="mb-2.5 font-display text-base font-semibold text-ink">{g.title}</h3>
          <div className="flex flex-wrap gap-2">
            {g.tags.map((t) => (
              <InterestChip
                key={t.id}
                tag={t}
                selected={draft.tags.includes(t.id)}
                loved={draft.loves.includes(t.id)}
                onToggle={() => toggle(t.id)}
                onHold={() => toggleLove(t.id)}
              />
            ))}
            {searching && typed && (
              <Pill onClick={() => addOwn(query) && setQuery('')} icon={<Plus size={15} strokeWidth={2.8} className="shrink-0" aria-hidden />} className="border-2 border-dashed border-ink/25 font-semibold">
                <span className="min-w-0 truncate">{t(`เพิ่ม "${typed.label}" เอง`, `Add "${typed.label}" myself`)}</span>
              </Pill>
            )}
          </div>
        </motion.section>
      ))}

      {/* the last choice: nothing fits, so say it in your own words */}
      {!searching && (cat === 'all' || cat === 'other') && (
        <motion.section variants={fadeUp} initial="hidden" animate="show" aria-labelledby="ob-own">
          <h3 id="ob-own" className="font-display text-base font-semibold text-ink">
            {CATEGORY_LABEL.other}
          </h3>
          <p className="mt-0.5 mb-2.5 text-sm text-ink-soft">
            {ownFull
              ? t(`เพิ่มเองครบ ${MAX_OWN_TAGS} เรื่องแล้ว แตะเรื่องเดิมเพื่อเอาออกได้นะ`, `That's ${MAX_OWN_TAGS} of your own. Tap one to remove it`)
              : t('ไม่เจอเรื่องที่ชอบในรายการ? พิมพ์เองได้เลย', "Can't find yours on the list? Type it in")}
          </p>
          <div className="flex flex-wrap gap-2">
            {own.map((t) => (
              <InterestChip key={t.id} tag={t} selected loved={draft.loves.includes(t.id)} onToggle={() => toggle(t.id)} onHold={() => toggleLove(t.id)} />
            ))}
            <OwnOption
              name={t('เพิ่มเรื่องที่ชอบเอง', 'Add your own interest')}
              placeholder={t('เช่น ปีนผา, ทำเซรามิก', 'e.g. climbing, pottery')}
              maxLength={OWN_TAG_MAX}
              onAdd={addOwn}
              stayOpen
              blocked={ownFull}
              onBlocked={ownLimit}
            />
          </div>
        </motion.section>
      )}
    </div>
  )
}
