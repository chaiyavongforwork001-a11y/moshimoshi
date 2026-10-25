import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { Check, Clock3, MapPin, MessageCircle, Search, Wifi } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useRooms } from '@/data/hooks'
import { CHAT_STYLES, ONLINE_LABEL, TAG_BY_ID } from '@/data/tags'
import { MOCHI } from '@/lib/colors'
import { fadeUp, spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import { buildIntent, MAX_STYLES, type StepProps } from '../model'
import { INTENT_TEMPLATES, SLOT_OPTIONS } from '../options'
import { keyWiggle } from '../parts/hooks'
import { Pill } from '../parts/Pill'

const WHEN_LABEL = { tonight: 'คืนนี้', weekend: 'สุดสัปดาห์นี้', anytime: 'ว่างเมื่อไหร่ก็ได้', dated: '' } as const

export function StepLooking({ draft, update }: StepProps) {
  const province = useMoshi((s) => s.me.province)
  const rooms = useRooms()
  const preview = buildIntent(draft, province, rooms)
  const [styleScope, wiggle] = useAnimate<HTMLSpanElement>()
  const [styleNotice, setStyleNotice] = useState(0)

  const toggleStyle = (s: string) => {
    if (draft.chatStyle.includes(s)) return update((d) => ({ chatStyle: d.chatStyle.filter((x) => x !== s) }))
    if (draft.chatStyle.length >= MAX_STYLES) {
      setStyleNotice((n) => n + 1)
      if (styleScope.current) wiggle(styleScope.current, { x: [0, -6, 6, -4, 4, 0], scale: [1, 1.1, 1] }, { duration: 0.4 })
      return
    }
    update((d) => ({ chatStyle: [...d.chatStyle, s] }))
  }

  return (
    <div className="space-y-5">
      <Block id="ob-intent" title="อยากหาเพื่อนไว้ทำอะไร" note="เลือกได้ 1 อย่าง หรือข้ามไปก่อนก็ได้" Icon={Search}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2">
          {INTENT_TEMPLATES.map((t) => {
            const on = draft.intent === t.id
            const p = MOCHI[t.color]
            return (
              <motion.button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => update({ intent: on ? null : t.id })}
                whileTap={{ scale: 0.94 }}
                whileHover={{ y: -3 }}
                transition={spring.bouncy}
                className={`relative flex min-h-[7.25rem] flex-col items-start gap-2 rounded-3xl border-2 p-3 pr-9 text-left transition-colors lg:min-h-20 lg:flex-row lg:items-center lg:gap-3 ${on ? '' : 'border-line bg-white/85 hover:bg-white'}`}
                style={on ? { background: p.light, borderColor: p.shade } : undefined}
              >
                <motion.span
                  className="grid size-11 shrink-0 place-items-center rounded-2xl"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, white 0%, ${p.light} 30%, ${p.base} 78%, ${p.shade} 100%)`,
                    boxShadow: `inset 0 -3px 0 ${p.shade}`,
                    color: p.ink,
                  }}
                  animate={{ rotate: on ? [0, -10, 8, 0] : 0, scale: on ? [1, 1.15, 1] : 1, transition: keyWiggle }}
                  aria-hidden
                >
                  <t.Icon size={21} strokeWidth={2.2} />
                </motion.span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-display text-[15px] leading-normal font-semibold text-ink">{t.label}</span>
                  <span className="text-xs leading-normal text-ink-soft">{t.hint}</span>
                </span>
                <AnimatePresence>
                  {on && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={spring.bouncy}
                      className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full bg-ink text-cream"
                      aria-hidden
                    >
                      <Check size={14} strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>

        <AnimatePresence initial={false}>
          {draft.intent === 'talk' && draft.tags.length > 0 && (
            <motion.div
              key="topic"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring.soft}
              className="overflow-hidden"
            >
              <p id="ob-topic" className="mt-4 mb-2 text-sm font-semibold text-ink">
                อยากคุยเรื่องอะไรเป็นพิเศษ?
              </p>
              <div role="group" aria-labelledby="ob-topic" className="flex flex-wrap gap-2">
                {draft.tags.map((id) => {
                  const current = preview?.tagId === id
                  return (
                    <Pill key={id} selected={current} onClick={() => update({ intentTag: id })} color="pink">
                      {TAG_BY_ID[id]?.label ?? id}
                    </Pill>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {preview && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring.soft}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-3xl bg-cream-2/80 p-4">
                <p className="text-xs font-semibold text-ink-soft">เดี๋ยวเราโพสต์ลงกระดานให้แบบนี้นะ (แก้ทีหลังได้)</p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={preview.text}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={spring.soft}
                    className="mt-2 w-fit max-w-full rounded-[1.4rem] rounded-bl-md bg-white px-4 py-2.5 text-[15px] text-ink shadow-[var(--shadow-soft)]"
                  >
                    {preview.text}
                  </motion.p>
                </AnimatePresence>
                <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs font-semibold text-ink">
                  <span className="inline-flex h-7 items-center gap-1 rounded-full bg-white/80 px-2.5">
                    <Clock3 size={12} aria-hidden />
                    {preview.whenLabel ?? WHEN_LABEL[preview.when]}
                  </span>
                  <span className="inline-flex h-7 items-center gap-1 rounded-full bg-white/80 px-2.5">
                    {preview.mode === 'online' ? <Wifi size={12} aria-hidden /> : <MapPin size={12} aria-hidden />}
                    {preview.mode === 'online' ? 'ออนไลน์' : `เจอกันที่${preview.province ?? province}`}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Block>

      <Block id="ob-slots" title="มักออนไลน์ช่วงไหน" note="เลือกได้หลายช่วง" Icon={Clock3}>
        <div role="group" aria-labelledby="ob-slots" className="grid grid-cols-2 gap-2">
          {SLOT_OPTIONS.map(({ id, Icon, time }) => {
            const on = draft.online.includes(id)
            return (
              <motion.button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => update((d) => ({ online: on ? d.online.filter((s) => s !== id) : [...d.online, id] }))}
                whileTap={{ scale: 0.93 }}
                transition={spring.bouncy}
                className={`flex min-h-16 items-center gap-2.5 rounded-2xl border-2 px-3 text-left transition-colors ${
                  on ? 'border-sky bg-sky/45' : 'border-line bg-white/85 hover:bg-white'
                }`}
              >
                <motion.span animate={{ rotate: on ? 360 : 0 }} transition={spring.gentle} className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-ink" aria-hidden>
                  <Icon size={18} />
                </motion.span>
                <span className="min-w-0">
                  <span className="block font-display text-[15px] font-semibold text-ink">{ONLINE_LABEL[id]}</span>
                  <span className="block text-xs text-ink-soft">{time}</span>
                </span>
              </motion.button>
            )
          })}
        </div>
      </Block>

      <Block
        id="ob-style"
        title="สไตล์การคุย"
        note={
          <>
            เลือกได้ไม่เกิน {MAX_STYLES} แบบ{' '}
            <span ref={styleScope} className="inline-block font-semibold text-ink">
              ({draft.chatStyle.length}/{MAX_STYLES})
            </span>
          </>
        }
        Icon={MessageCircle}
      >
        <div role="group" aria-labelledby="ob-style" className="flex flex-wrap gap-2">
          {CHAT_STYLES.map((s) => (
            <Pill key={s} selected={draft.chatStyle.includes(s)} onClick={() => toggleStyle(s)} color="mint">
              {s}
            </Pill>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {styleNotice > 0 && <span key={styleNotice}>เลือกได้ไม่เกิน {MAX_STYLES} แบบนะ</span>}
        </p>
      </Block>
    </div>
  )
}

function Block({ id, title, note, Icon, children }: { id: string; title: string; note: ReactNode; Icon: typeof Search; children: ReactNode }) {
  return (
    <motion.section variants={fadeUp} aria-labelledby={id} className="card p-4 sm:p-5">
      <h2 id={id} className="flex items-center gap-2 font-display text-base font-semibold text-ink">
        <Icon size={18} aria-hidden />
        {title}
      </h2>
      <p className="mt-0.5 mb-3 text-sm text-ink-soft">{note}</p>
      {children}
    </motion.section>
  )
}
