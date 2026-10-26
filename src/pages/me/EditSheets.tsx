import { AnimatePresence, motion } from 'motion/react'
import { Star } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { Avatar, Button, Chip, Sheet, TagChip } from '@/components/ui'
import { CATEGORY_LABEL, CHAT_STYLES, TAG_BY_ID, TAGS } from '@/data/tags'
import { known, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { MochiColor, TagCategory } from '@/lib/types'
import { MAX_STYLES } from '@/pages/onboarding/model'
import { ColorSwatches } from './ColorSwatches'

export type EditKind = 'basics' | 'tags' | 'style'

const field =
  'mt-1.5 block w-full rounded-2xl border border-line bg-white px-4 py-3 text-ink shadow-[inset_0_2px_4px_rgb(59_38_34/0.04)] placeholder:text-ink-faint focus:border-lavender'

/** One component for the three edit sheets; each form mounts fresh on open. */
export function EditSheets({ open, onClose }: { open: EditKind | null; onClose: () => void }) {
  return (
    <>
      <Sheet open={open === 'basics'} onClose={onClose} title={t('แก้ไขโปรไฟล์', 'Edit profile')}>
        <BasicsForm onDone={onClose} />
      </Sheet>
      <Sheet open={open === 'tags'} onClose={onClose} title={t('เรื่องที่ชอบ', 'My interests')} width={640}>
        <TagsForm onDone={onClose} />
      </Sheet>
      <Sheet open={open === 'style'} onClose={onClose} title={t('สไตล์การคุยของเรา', 'My chat style')}>
        <StyleForm onDone={onClose} />
      </Sheet>
    </>
  )
}

function BasicsForm({ onDone }: { onDone: () => void }) {
  const me = useMoshi((s) => s.me)
  const updateMe = useMoshi((s) => s.updateMe)
  const [name, setName] = useState(me.name === 'เรา' ? '' : me.name)
  const [bio, setBio] = useState(me.bio)
  const [color, setColor] = useState<MochiColor>(me.color)
  const id = useId()

  const save = (e: FormEvent) => {
    e.preventDefault()
    updateMe({ name: name.trim() || me.name, bio: bio.trim(), color })
    onDone()
  }

  return (
    <form onSubmit={save} className="space-y-5 pb-2">
      <div className="flex flex-col items-center gap-2 pt-1">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={color} initial={{ scale: 0.6, rotate: -10, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={spring.bouncy}>
            <Avatar color={color} size={96} face="happy" />
          </motion.span>
        </AnimatePresence>
        <ColorSwatches value={color} onChange={setColor} legend={t('สีโมชิของเรา', "My Mochi's color")} size={34} className="flex justify-center" />
      </div>
      <div>
        <label htmlFor={`${id}-name`} className="font-display font-semibold">
          {t('ชื่อเล่น', 'Nickname')}
        </label>
        <input
          id={`${id}-name`}
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          autoComplete="nickname"
          placeholder={t('ชื่อที่อยากให้เพื่อนเรียก', 'What friends should call you')}
          className={field}
        />
      </div>
      <div>
        <label htmlFor={`${id}-bio`} className="font-display font-semibold">
          {t('แนะนำตัวสั้นๆ', 'A short intro')}
        </label>
        <textarea
          id={`${id}-bio`}
          value={bio}
          maxLength={120}
          rows={3}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t('เช่น ชอบอนิเมะ เกมชิลๆ และคาเฟ่เงียบๆ', 'e.g. Into anime, chill games and quiet cafés')}
          aria-describedby={`${id}-bio-count`}
          className={`${field} resize-none`}
        />
        <p id={`${id}-bio-count`} className="mt-1 text-right text-xs text-ink-soft">
          {t(`${bio.length}/120 ตัวอักษร`, `${bio.length}/120 characters`)}
        </p>
      </div>
      <Button type="submit" block size="lg">
        {t('บันทึก', 'Save')}
      </Button>
    </form>
  )
}

const CATEGORIES = Object.keys(CATEGORY_LABEL) as TagCategory[]

function TagsForm({ onDone }: { onDone: () => void }) {
  const me = useMoshi((s) => s.me)
  const updateMe = useMoshi((s) => s.updateMe)
  const [tags, setTags] = useState<string[]>(me.tags)
  const [loves, setLoves] = useState<string[]>(me.loves.filter((t) => me.tags.includes(t)))
  const grouped = useMemo(() => CATEGORIES.map((c) => ({ c, tags: TAGS.filter((t) => t.category === c) })), [])

  const toggleTag = (id: string) => {
    if (tags.includes(id)) {
      setTags(tags.filter((t) => t !== id))
      setLoves(loves.filter((t) => t !== id))
    } else setTags([...tags, id])
  }
  const toggleLove = (id: string) => {
    if (loves.includes(id)) setLoves(loves.filter((t) => t !== id))
    else if (loves.length < 3) setLoves([...loves, id])
    else setLoves([...loves.slice(1), id]) // keep the newest three
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        updateMe({ tags, loves })
        onDone()
      }}
    >
      <p className="text-sm text-ink-soft">
        {t(
          'เลือกอย่างน้อย 3 เรื่อง แล้วติดดาวเรื่องที่รักมากได้ 3 เรื่อง ยิ่งเลือกตรงใจ ยิ่งเจอคนคลื่นเดียวกันง่าย',
          'Pick at least 3, then star up to 3 you love most. The truer your picks, the easier it is to find people on your wavelength',
        )}
      </p>

      <section className="mt-4 rounded-3xl bg-white p-4" aria-labelledby="loves-h">
        <h3 id="loves-h" className="flex items-center gap-1.5 font-display font-semibold">
          <Star size={16} className="fill-butter" aria-hidden /> {t(`รักมาก (${loves.length}/3)`, `Love it (${loves.length}/3)`)}
        </h3>
        {tags.length ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const tag = TAG_BY_ID[t]
              if (!tag) return null
              const on = loves.includes(t)
              return (
                <li key={t}>
                  <motion.button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleLove(t)}
                    whileTap={{ scale: 0.9 }}
                    transition={spring.bouncy}
                    className={`relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium text-ink transition-colors after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${
                      on ? 'border-butter bg-butter shadow-[inset_0_-2px_0_rgb(59_38_34/0.12)]' : 'border-line bg-cream'
                    }`}
                  >
                    <motion.span animate={{ rotate: on ? 72 : 0, scale: on ? 1.15 : 1 }} transition={spring.bouncy} className="inline-flex">
                      <Star size={14} strokeWidth={2.4} className={on ? 'fill-white' : ''} aria-hidden />
                    </motion.span>
                    {tag.label}
                  </motion.button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">{t('เลือกเรื่องที่ชอบด้านล่างก่อนนะ', 'Pick some interests below first')}</p>
        )}
      </section>

      <div className="mt-4 space-y-4">
        {grouped.map(({ c, tags: list }) => (
          <section key={c} aria-labelledby={`cat-${c}`}>
            <h3 id={`cat-${c}`} className="mb-2 text-sm font-semibold text-ink-soft">
              {CATEGORY_LABEL[c]}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {list.map((t) => (
                <TagChip key={t.id} tag={t} selected={tags.includes(t.id)} onClick={() => toggleTag(t.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-5 bg-cream/90 px-5 pt-3 pb-1 backdrop-blur">
        <Button type="submit" block size="lg" disabled={tags.length < 3}>
          {tags.length < 3
            ? t(`เลือกอีก ${3 - tags.length} เรื่องนะ`, `Pick ${3 - tags.length} more`)
            : t(`บันทึก ${tags.length} เรื่องที่ชอบ`, `Save ${tags.length} interests`)}
        </Button>
      </div>
    </form>
  )
}

function StyleForm({ onDone }: { onDone: () => void }) {
  const me = useMoshi((s) => s.me)
  const updateMe = useMoshi((s) => s.updateMe)
  // same rule as onboarding: at most MAX_STYLES (the oldest pick makes room)
  const [styles, setStyles] = useState<string[]>(() => me.chatStyle.slice(0, MAX_STYLES))
  const toggle = (s: string) =>
    setStyles(styles.includes(s) ? styles.filter((x) => x !== s) : styles.length < MAX_STYLES ? [...styles, s] : [...styles.slice(1), s])
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        updateMe({ chatStyle: styles })
        onDone()
      }}
      className="space-y-5 pb-2"
    >
      <p className="text-sm text-ink-soft">
        {t(
          `บอกให้เพื่อนรู้ว่าเราคุยแบบไหน เลือกได้ไม่เกิน ${MAX_STYLES} แบบ ไม่มีแบบไหนดีกว่ากันนะ`,
          `Let friends know how you like to chat. Pick up to ${MAX_STYLES}. There's no wrong answer`,
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {CHAT_STYLES.map((s) => (
          <Chip key={s} color={me.color} selected={styles.includes(s)} onClick={() => toggle(s)}>
            {known(s)}
          </Chip>
        ))}
      </div>
      <Button type="submit" block size="lg">
        {t('บันทึก', 'Save')}
      </Button>
    </form>
  )
}
