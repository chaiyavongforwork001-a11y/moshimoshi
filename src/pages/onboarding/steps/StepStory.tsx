import { AnimatePresence, motion } from 'motion/react'
import { Check, Lightbulb, Plus, X } from 'lucide-react'
import { PROMPT_BY_ID, PROMPTS, TAG_BY_ID } from '@/data/tags'
import { fadeUp, spring } from '@/lib/motion'
import type { PromptAnswer } from '@/lib/types'
import { STORY_MAX, STORY_MIN, textLength, type StepProps } from '../model'
import { Pill } from '../parts/Pill'

export function StepStory({ draft, update }: StepProps) {
  const [first, second] = draft.prompts

  const setAnswer = (index: number, patch: Partial<PromptAnswer>) =>
    update((d) => ({ prompts: d.prompts.map((p, i) => (i === index ? { ...p, ...patch } : p)) }))

  const addSecond = () =>
    update((d) => {
      const used = new Set(d.prompts.map((p) => p.promptId))
      const next = PROMPTS.find((p) => !used.has(p.id)) ?? PROMPTS[1]
      return { prompts: [d.prompts[0], { promptId: next.id, text: '' }] }
    })

  const removeSecond = () => update((d) => ({ prompts: d.prompts.slice(0, 1) }))

  // helper chips: the visitor's own interests, ready to drop into the answer
  const helpers = [...draft.loves, ...draft.tags.filter((t) => !draft.loves.includes(t))].slice(0, 4).map((id) => TAG_BY_ID[id]).filter(Boolean)

  return (
    <div className="space-y-5">
      {first && (
        <AnswerBlock
          index={0}
          answer={first}
          exclude={second?.promptId}
          helpers={helpers.map((t) => t.label)}
          onChange={(patch) => setAnswer(0, patch)}
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {second ? (
          <motion.div key="second" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={spring.soft}>
            <AnswerBlock
              index={1}
              answer={second}
              exclude={first?.promptId}
              helpers={[]}
              onChange={(patch) => setAnswer(1, patch)}
              onRemove={removeSecond}
            />
          </motion.div>
        ) : (
          <motion.div key="add" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={spring.soft}>
            <motion.button
              type="button"
              onClick={addSecond}
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -2 }}
              transition={spring.bouncy}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.6rem] border-2 border-dashed border-ink/20 bg-white/50 px-4 font-display text-[15px] font-semibold text-ink hover:bg-white/80"
            >
              <Plus size={18} aria-hidden />
              ตอบอีกข้อ <span className="font-body text-sm font-normal text-ink-soft">(ไม่บังคับ)</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface AnswerBlockProps {
  index: number
  answer: PromptAnswer
  /** prompt already used by the other answer */
  exclude?: string
  helpers: string[]
  onChange: (patch: Partial<PromptAnswer>) => void
  onRemove?: () => void
}

function AnswerBlock({ index, answer, exclude, helpers, onChange, onRemove }: AnswerBlockProps) {
  const prompt = PROMPT_BY_ID[answer.promptId] ?? PROMPTS[0]
  const len = textLength(answer.text)
  const enough = len >= STORY_MIN
  const fieldId = `ob-story-${index}`
  const groupId = `ob-prompt-${index}`

  const insert = (piece: string) => {
    const base = answer.text.trimEnd()
    onChange({ text: (base ? `${base} ${piece}` : piece).slice(0, STORY_MAX) })
  }

  return (
    <motion.section variants={fadeUp} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={groupId} className="font-display text-base font-semibold text-ink">
          {index === 0 ? 'เลือกคำถามที่อยากตอบ' : 'คำถามข้อที่สอง'}
        </h2>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-white/70 hover:text-ink"
          >
            <X size={16} aria-hidden /> เอาออก
          </button>
        )}
      </div>

      <div role="radiogroup" aria-labelledby={groupId} className="flex flex-wrap gap-2">
        {PROMPTS.filter((p) => p.id !== exclude).map((p) => {
          const on = p.id === answer.promptId
          return (
            <label key={p.id} className="relative cursor-pointer">
              <input
                type="radio"
                name={groupId}
                value={p.id}
                checked={on}
                onChange={() => onChange({ promptId: p.id })}
                className="peer sr-only"
              />
              <motion.span
                whileTap={{ scale: 0.94 }}
                transition={spring.bouncy}
                className={`inline-flex min-h-11 items-center rounded-2xl border px-3.5 py-2 text-sm transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lavender ${
                  on ? 'border-peach bg-peach/45 font-semibold text-ink' : 'border-line bg-white/85 text-ink hover:bg-white'
                }`}
              >
                {p.label}
              </motion.span>
            </label>
          )
        })}
      </div>

      {/* the answer, on a little lined note card */}
      <div className="card p-4 transition-shadow focus-within:ring-4 focus-within:ring-peach/35 sm:p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.label
            key={prompt.id}
            htmlFor={fieldId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={spring.soft}
            className="block font-display text-lg font-semibold text-ink"
          >
            {prompt.label}
          </motion.label>
        </AnimatePresence>
        <textarea
          id={fieldId}
          rows={3}
          value={answer.text}
          maxLength={STORY_MAX}
          onChange={(e) => onChange({ text: e.target.value.slice(0, STORY_MAX) })}
          enterKeyHint="next"
          placeholder={prompt.example}
          aria-describedby={`${fieldId}-count`}
          className="mt-1 block w-full resize-none bg-transparent text-base leading-8 text-ink outline-none placeholder:text-ink-faint"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0, transparent calc(2rem - 1px), var(--color-line) calc(2rem - 1px), var(--color-line) 2rem)',
            backgroundAttachment: 'local',
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink/10" aria-hidden>
            <motion.span
              className={`absolute inset-y-0 left-0 rounded-full ${enough ? 'bg-mint' : 'bg-peach'}`}
              initial={false}
              animate={{ width: `${Math.min(100, (len / STORY_MIN) * 100)}%` }}
              transition={spring.soft}
            />
          </span>
          <span id={`${fieldId}-count`} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-soft">
            {enough ? (
              <>
                <Check size={13} strokeWidth={3} className="text-success" aria-hidden /> กำลังดี
              </>
            ) : len ? (
              `อีก ${STORY_MIN - len} ตัวอักษร`
            ) : (
              `อย่างน้อย ${STORY_MIN} ตัวอักษร`
            )}
            <span className="text-ink-soft/80">
              · {answer.text.length}/{STORY_MAX}
            </span>
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Pill onClick={() => onChange({ text: prompt.example })} icon={<Lightbulb size={15} aria-hidden />} color="butter">
            ใช้ตัวอย่าง
          </Pill>
          {helpers.map((h) => (
            <Pill key={h} onClick={() => insert(h)} ariaLabel={`เติมคำว่า ${h}`} icon={<Plus size={14} aria-hidden />}>
              {h}
            </Pill>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
