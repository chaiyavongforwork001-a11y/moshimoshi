import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Lock, MapPin, Minus, Plus, Sparkles, WandSparkles, Wifi } from 'lucide-react'
import { useId } from 'react'
import { IconButton } from '@/components/ui'
import { TAG_BY_ID } from '@/data/tags'
import { CATEGORY_COLOR, MOCHI } from '@/lib/colors'
import { known, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { AnimatedNumber } from '@/pages/home/Block'
import { PickChip, StepCard, fieldClass } from './bits'
import { TEXT_MAX, todayISO, type Draft } from './draft'
import { PROVINCES, ROLE_BY_KEY, ROLES, TEMPLATE_BY_KEY, TEMPLATES, WHENS, giveWantFor } from './templates'

type Patch = (p: Partial<Draft>) => void

const reveal = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: spring.soft,
}

// ------------------------------------------------------------------ 1. template
export function TemplateStep({ draft, onPick, onUseExample }: { draft: Draft; onPick: (k: Draft['template']) => void; onUseExample: () => void }) {
  const tpl = TEMPLATE_BY_KEY[draft.template]
  return (
    <StepCard
      id="step-template"
      n={1}
      title={t('อยากหาเพื่อนมาทำอะไร?', 'What do you want to do together?')}
      hint={t('เลือกแบบที่ใกล้ที่สุด เดี๋ยวโมชิตั้งค่าที่เหลือให้', 'Pick the closest one and Mochi will set up the rest')}
    >
      <div role="group" aria-label={t('แบบโพสต์', 'Post type')} className="flex flex-wrap gap-2">
        {TEMPLATES.map((x) => (
          <PickChip key={x.key} selected={draft.template === x.key} color={x.color} onClick={() => onPick(x.key)} icon={<x.Icon size={18} strokeWidth={2.3} aria-hidden />}>
            {x.label}
          </PickChip>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tpl.key}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          transition={spring.soft}
          className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-3xl rounded-tl-md p-3 pl-4"
          style={{ background: MOCHI[tpl.color].light }}
        >
          <p className="min-w-0 flex-1 text-sm text-ink">
            <span className="font-semibold">{t('ตัวอย่าง: ', 'Example: ')}</span>"{tpl.example}"
          </p>
          <button
            type="button"
            onClick={onUseExample}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3.5 font-display text-sm font-semibold text-ink shadow-[var(--shadow-soft)] transition-transform active:scale-95"
          >
            <WandSparkles size={15} aria-hidden /> {t('ใช้ข้อความนี้', 'Use this')}
          </button>
        </motion.div>
      </AnimatePresence>
    </StepCard>
  )
}

// ------------------------------------------------------------------ 2. role (+ slots / give-want)
export function RoleStep({ draft, patch }: { draft: Draft; patch: Patch }) {
  const role = ROLE_BY_KEY[draft.role]
  const gw = giveWantFor(draft.role)
  const tpl = TEMPLATE_BY_KEY[draft.template]
  const giveId = useId()
  const wantId = useId()
  return (
    <StepCard id="step-role" n={2} title={t('เราอยู่ฝั่งไหน?', "What's your role?")} hint={t('ตั้งให้ตามแบบที่เลือกแล้ว เปลี่ยนได้นะ', 'Set from your pick. Feel free to change it')}>
      <div role="group" aria-label={t('บทบาท', 'Role')} className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <PickChip key={r.key} selected={draft.role === r.key} color={r.color} onClick={() => patch({ role: r.key })} icon={<r.Icon size={17} strokeWidth={2.3} aria-hidden />}>
            {r.label}
          </PickChip>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={role.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="mt-2.5 text-sm text-ink-soft">
          {role.hint}
        </motion.p>
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {draft.role === 'host' && (
          <motion.div key="slots" {...reveal} className="overflow-hidden">
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-cream p-3">
              <div>
                <p className="font-display font-semibold">{t('ยังว่างอีกกี่ที่?', 'How many spots left?')}</p>
                <p className="text-xs text-ink-soft">
                  {t(`เพื่อนๆ จะเห็นว่า "ขาดอีก ${draft.slots} คน"`, `People will see "${draft.slots} more ${draft.slots === 1 ? 'spot' : 'spots'} open"`)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <IconButton label={t('ลดจำนวนที่ว่าง', 'Fewer spots')} disabled={draft.slots <= 1} onClick={() => patch({ slots: Math.max(1, draft.slots - 1) })} className="disabled:opacity-40">
                  <Minus size={18} />
                </IconButton>
                <span className="w-8 text-center font-display text-2xl font-bold" aria-live="polite">
                  <AnimatedNumber value={draft.slots} />
                </span>
                <IconButton label={t('เพิ่มจำนวนที่ว่าง', 'More spots')} disabled={draft.slots >= 10} onClick={() => patch({ slots: Math.min(10, draft.slots + 1) })} className="disabled:opacity-40">
                  <Plus size={18} />
                </IconButton>
              </div>
            </div>
          </motion.div>
        )}
        {(gw.give || gw.want) && (
          <motion.div key="gw" {...reveal} className="overflow-hidden">
            <div className={`mt-3 grid gap-3 ${gw.give && gw.want ? 'sm:grid-cols-2' : ''}`}>
              {gw.give && (
                <div>
                  <label htmlFor={giveId} className="mb-1 block text-sm font-semibold">
                    {t('เราให้อะไรได้', 'What you can offer')}
                  </label>
                  <input
                    id={giveId}
                    value={draft.give}
                    maxLength={40}
                    onChange={(e) => patch({ give: e.target.value })}
                    placeholder={tpl.give ?? t('เช่น สอนพื้นฐานได้', 'e.g. I can teach the basics')}
                    className={fieldClass}
                  />
                </div>
              )}
              {gw.want && (
                <div>
                  <label htmlFor={wantId} className="mb-1 block text-sm font-semibold">
                    {t('อยากได้อะไร', 'What you want')}
                  </label>
                  <input
                    id={wantId}
                    value={draft.want}
                    maxLength={40}
                    onChange={(e) => patch({ want: e.target.value })}
                    placeholder={tpl.want ?? t('เช่น คนช่วยแนะนำ', 'e.g. someone to show me the ropes')}
                    className={fieldClass}
                  />
                </div>
              )}
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">{t('ใส่ไว้ช่วยให้จับคู่แม่นขึ้น ไม่ใส่ก็ได้', 'Helps us match you better. Totally optional')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </StepCard>
  )
}

// ------------------------------------------------------------------ 4. free text
export function TextStep({
  draft,
  patch,
  detected,
  mainTag,
  error,
  shakeKey,
}: {
  draft: Draft
  patch: Patch
  detected: string[]
  mainTag: string
  error?: string
  shakeKey: number
}) {
  const id = useId()
  const len = draft.text.length
  const tpl = TEMPLATE_BY_KEY[draft.template]
  const ratio = Math.min(1, len / TEXT_MAX)
  const near = len >= TEXT_MAX - 10
  return (
    <StepCard
      id="step-text"
      n={4}
      title={t('เล่าเพิ่มอีกนิด', 'Tell us a little more')}
      hint={t('สั้นๆ เป็นกันเองก็พอ เหมือนชวนเพื่อนในแชท', 'Short and casual, like asking a friend in chat')}
      error={error}
      shakeKey={shakeKey}
    >
      <label htmlFor={id} className="sr-only">
        {t('ข้อความโพสต์', 'Post text')}
      </label>
      <div className="relative">
        <textarea
          id={id}
          value={draft.text}
          maxLength={TEXT_MAX}
          rows={3}
          onChange={(e) => patch({ text: e.target.value })}
          placeholder={tpl.example}
          aria-invalid={!!error}
          className={`${fieldClass} resize-none pr-14 text-[16px] leading-relaxed`}
        />
        {/* character ring */}
        <span className="absolute right-3 bottom-3 inline-flex items-center justify-center" aria-hidden>
          <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(59 38 34 / 0.1)" strokeWidth="3.5" />
            <motion.circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke={near ? MOCHI.pink.shade : MOCHI.mint.shade}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 15}
              animate={{ strokeDashoffset: 2 * Math.PI * 15 * (1 - ratio) }}
              transition={spring.soft}
            />
          </svg>
        </span>
      </div>
      <p className={`mt-1 text-right text-xs ${near ? 'font-semibold text-ink' : 'text-ink-soft'}`} aria-live="polite">
        {len}/{TEXT_MAX}
      </p>

      <div className="mt-1 min-h-9">
        <AnimatePresence initial={false}>
          {detected.length > 0 && (
            <motion.div key="detected" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-soft">
                <Sparkles size={14} aria-hidden /> {t('โมชิเจอในข้อความ', 'Mochi spotted')}
              </span>
              <AnimatePresence mode="popLayout" initial={false}>
                {detected.map((tid) => {
                  const tag = TAG_BY_ID[tid]
                  if (!tag) return null
                  return (
                    <motion.span key={tid} layout initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={spring.bouncy}>
                      <PickChip selected={mainTag === tid} color={CATEGORY_COLOR[tag.category]} onClick={() => patch({ tagId: tid })} label={t(`ตั้ง ${tag.label} เป็นกิจกรรมหลัก`, `Make ${tag.label} the main activity`)}>
                        {tag.label}
                      </PickChip>
                    </motion.span>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
        {detected.length > 0 && <p className="mt-1 text-xs text-ink-soft">{t('แตะเพื่อตั้งเป็นกิจกรรมหลัก', 'Tap one to make it the main activity')}</p>}
      </div>
    </StepCard>
  )
}

// ------------------------------------------------------------------ 5. when + where
export function WhenWhereStep({ draft, patch, error, shakeKey }: { draft: Draft; patch: Patch; error?: string; shakeKey: number }) {
  const timeId = useId()
  const dateId = useId()
  const provId = useId()
  return (
    <StepCard id="step-when" n={5} title={t('เมื่อไหร่ ที่ไหนดี?', 'When and where?')} error={error} shakeKey={shakeKey}>
      <div role="group" aria-label={t('เวลา', 'Time')} className="flex flex-wrap gap-2">
        {WHENS.map((w) => (
          <PickChip key={w.key} selected={draft.when === w.key} color="sky" onClick={() => patch({ when: w.key })} icon={<w.Icon size={17} strokeWidth={2.3} aria-hidden />}>
            {w.label}
          </PickChip>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {(draft.when === 'tonight' || draft.when === 'dated') && (
          <motion.div key="time" {...reveal} className="overflow-hidden">
            <div className={`mt-3 grid gap-3 ${draft.when === 'dated' ? 'grid-cols-2' : 'grid-cols-1 sm:max-w-56'}`}>
              {draft.when === 'dated' && (
                <div className="min-w-0">
                  <label htmlFor={dateId} className="mb-1 block text-sm font-semibold">
                    {t('วันไหน', 'Which day')}
                  </label>
                  <input id={dateId} type="date" min={todayISO()} value={draft.date} onChange={(e) => patch({ date: e.target.value })} aria-invalid={!!error} className={`${fieldClass} min-h-12`} />
                </div>
              )}
              <div className="min-w-0">
                <label htmlFor={timeId} className="mb-1 block text-sm font-semibold">
                  {t('ประมาณกี่โมง', 'Around what time')} <span className="font-normal text-ink-soft">{t('(ไม่ใส่ก็ได้)', '(optional)')}</span>
                </label>
                <input id={timeId} type="time" value={draft.time} onChange={(e) => patch({ time: e.target.value })} className={`${fieldClass} min-h-12`} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div role="group" aria-label={t('รูปแบบ', 'Format')} className="mt-4 grid grid-cols-2 gap-2">
        {(
          [
            { key: 'online', label: t('ออนไลน์', 'Online'), sub: t('แชท คุยเสียง เล่นด้วยกัน', 'Chat, voice, play together'), Icon: Wifi, color: 'mint' },
            { key: 'offline', label: t('เจอตัวจริง', 'In person'), sub: t('ไปงาน หรือนัดเป็นกลุ่ม', 'Events or group meetups'), Icon: MapPin, color: 'peach' },
          ] as const
        ).map((m) => {
          const on = draft.mode === m.key
          const p = MOCHI[m.color]
          return (
            <motion.button
              key={m.key}
              type="button"
              aria-pressed={on}
              onClick={() => patch({ mode: m.key })}
              whileTap={{ scale: 0.95 }}
              transition={spring.bouncy}
              className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${on ? '' : 'border-line bg-white hover:bg-cream'}`}
              style={on ? { background: p.light, borderColor: p.shade, boxShadow: `inset 0 -3px 0 ${p.shade}` } : undefined}
            >
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-ink" style={{ background: p.base }} aria-hidden>
                <m.Icon size={20} strokeWidth={2.3} />
              </span>
              <span className="min-w-0">
                <span className="block font-display font-semibold text-ink">{m.label}</span>
                <span className="block text-xs leading-normal text-ink-soft">{m.sub}</span>
              </span>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence initial={false}>
        {draft.mode === 'offline' && (
          <motion.div key="prov" {...reveal} className="overflow-hidden">
            <div className="mt-3">
              <label htmlFor={provId} className="mb-1 block text-sm font-semibold">
                {t('จังหวัด', 'Province')}
              </label>
              <div className="relative">
                <select id={provId} value={draft.province} onChange={(e) => patch({ province: e.target.value })} className={`${fieldClass} min-h-12 appearance-none pr-11`}>
                  {(PROVINCES.includes(draft.province) ? PROVINCES : [draft.province, ...PROVINCES]).map((p) => (
                    <option key={p} value={p}>
                      {known(p)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-soft" aria-hidden />
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
                <Lock size={13} aria-hidden /> {t('แสดงแค่จังหวัด ไม่บอกที่อยู่ละเอียด', 'Only your province shows, never your exact address')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StepCard>
  )
}
