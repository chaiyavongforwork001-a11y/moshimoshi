import { AnimatePresence, motion } from 'motion/react'
import { Dices, Palette, Shirt, SmilePlus, type LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import type { MochiExpression } from '@/components/three'
import { Avatar } from '@/components/ui'
import { MOCHI, MOCHI_COLORS } from '@/lib/colors'
import { fadeUp, spring } from '@/lib/motion'
import type { StepProps } from '../model'
import { ACCESSORY_LABEL, ACCESSORY_OPTIONS, COLOR_LABEL, FACE_LABEL, FACE_OPTIONS } from '../options'
import { Pill } from '../parts/Pill'
import { StageBox } from '../parts/StageBox'

const pickOther = <T,>(list: readonly T[], current: T): T => {
  const rest = list.filter((x) => x !== current)
  return rest[Math.floor(Math.random() * rest.length)] ?? current
}

/** Native radios underneath (arrow keys work), puffy visuals on top. */
const radioCls = 'peer sr-only'
const focusRing = 'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-lavender'

export function StepMochi({ draft, update, desktop, expression, pulse }: StepProps & { expression: MochiExpression; pulse: number }) {
  const shuffle = () =>
    update((d) => ({
      color: pickOther(MOCHI_COLORS, d.color),
      face: pickOther(FACE_OPTIONS.map((f) => f.id), d.face),
      accessory: pickOther(ACCESSORY_OPTIONS.map((a) => a.id), d.accessory),
    }))

  return (
    <div className="space-y-5">
      {!desktop && (
        <motion.div variants={fadeUp}>
          <StageBox color={draft.color} expression={expression} accessory={draft.accessory} name={draft.name} pulse={pulse} heightClass="h-56" />
        </motion.div>
      )}

      <Group
        title="สีตัว"
        Icon={Palette}
        value={COLOR_LABEL[draft.color]}
        action={
          <Pill onClick={shuffle} icon={<Dices size={16} aria-hidden />} color="butter">
            สุ่มให้หน่อย
          </Pill>
        }
      >
        <div className="flex flex-wrap gap-3 sm:gap-3.5">
          {MOCHI_COLORS.map((c) => {
            const p = MOCHI[c]
            const on = draft.color === c
            return (
              <label key={c} className="relative cursor-pointer">
                <input type="radio" name="ob-color" value={c} checked={on} onChange={() => update({ color: c })} className={radioCls} />
                <motion.span
                  whileTap={{ scale: 0.84 }}
                  whileHover={{ y: -2 }}
                  transition={spring.bouncy}
                  className={`block size-12 rounded-full sm:size-14 ${focusRing}`}
                  style={{
                    background: `radial-gradient(circle at 35% 30%, white 0%, ${p.light} 26%, ${p.base} 68%, ${p.shade} 100%)`,
                    boxShadow: `inset 0 -3px 0 ${p.shade}, 0 8px 16px -8px ${p.shade}`,
                  }}
                />
                {on && (
                  <motion.span layoutId="ob-swatch-ring" transition={spring.bouncy} className="pointer-events-none absolute -inset-1.5 rounded-full border-[3px] border-ink" />
                )}
                <span className="sr-only">{COLOR_LABEL[c]}</span>
              </label>
            )
          })}
        </div>
      </Group>

      <Group title="หน้าตา" Icon={SmilePlus} value={FACE_LABEL[draft.face]}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {FACE_OPTIONS.map((f) => {
            const on = draft.face === f.id
            return (
              <label key={f.id} className="relative cursor-pointer">
                <input type="radio" name="ob-face" value={f.id} checked={on} onChange={() => update({ face: f.id })} className={radioCls} />
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  transition={spring.bouncy}
                  className={`relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 ${focusRing}`}
                >
                  {on && <motion.span layoutId="ob-face-bg" transition={spring.bouncy} className="absolute inset-0 rounded-2xl border-2 border-peach bg-peach/25" />}
                  <span className="relative">
                    <Avatar color={draft.color} size={48} face={f.id} />
                  </span>
                  <span className="relative text-xs font-semibold text-ink">{f.label}</span>
                </motion.span>
              </label>
            )
          })}
        </div>
      </Group>

      <Group title="ของแต่งตัว" Icon={Shirt} value={ACCESSORY_LABEL[draft.accessory]}>
        <div className="grid grid-cols-5 gap-2">
          {ACCESSORY_OPTIONS.map(({ id, label, Icon }) => {
            const on = draft.accessory === id
            return (
              <label key={id} className="relative cursor-pointer">
                <input type="radio" name="ob-accessory" value={id} checked={on} onChange={() => update({ accessory: id })} className={radioCls} />
                <motion.span
                  whileTap={{ scale: 0.88 }}
                  transition={spring.bouncy}
                  className={`relative flex min-h-[5.25rem] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2 ${focusRing}`}
                >
                  {on && <motion.span layoutId="ob-acc-bg" transition={spring.bouncy} className="absolute inset-0 rounded-2xl border-2 border-lavender bg-lavender/25" />}
                  <span
                    className="relative grid size-11 place-items-center rounded-full"
                    style={{ background: on ? MOCHI.lavender.base : MOCHI.cream.light, color: MOCHI.lavender.ink }}
                  >
                    <Icon size={20} strokeWidth={2.2} aria-hidden />
                  </span>
                  <span className="relative text-xs font-semibold text-ink">{label}</span>
                </motion.span>
              </label>
            )
          })}
        </div>
      </Group>
    </div>
  )
}

function Group({ title, Icon, value, action, children }: { title: string; Icon: LucideIcon; value: string; action?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <motion.section variants={fadeUp} className="card p-4 sm:p-5">
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
        <h2 id={id} className="flex min-w-0 items-center gap-2 font-display text-base font-semibold text-ink">
          <Icon size={18} aria-hidden />
          {title}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={value}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={spring.soft}
              className="truncate font-body text-sm font-medium text-ink-soft"
            >
              · {value}
            </motion.span>
          </AnimatePresence>
        </h2>
        {action}
      </div>
      <div role="radiogroup" aria-labelledby={id}>
        {children}
      </div>
    </motion.section>
  )
}
