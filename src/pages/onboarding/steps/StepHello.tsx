import { motion } from 'motion/react'
import { MessageCircleHeart, ShieldCheck, Users } from 'lucide-react'
import type { MochiExpression } from '@/components/three'
import { L, loc, t } from '@/lib/i18n'
import { fadeUp } from '@/lib/motion'
import { NAME_MAX, type StepProps } from '../model'
import { StageBox } from '../parts/StageBox'

type PromiseItem = { Icon: typeof Users; text: string; tint: string }

const PROMISES: PromiseItem[] = [
  loc<PromiseItem>({ Icon: Users, text: L('มาหาเพื่อน ไม่ได้มาหาแฟน', 'Here for friends, not dates'), tint: 'bg-mint/45' }),
  loc<PromiseItem>({ Icon: MessageCircleHeart, text: L('ชวนคุยกันอย่างใจดี ไม่ตัดสินกัน', 'Chat kindly, no judging'), tint: 'bg-pink/45' }),
  loc<PromiseItem>({ Icon: ShieldCheck, text: L('ค่อยๆ รู้จักกัน ไม่รีบขอช่องทางติดต่อ', 'Take it slow, no rushing to swap contacts'), tint: 'bg-sky/50' }),
]

export function StepHello({ draft, update, desktop, expression, pulse }: StepProps & { expression: MochiExpression; pulse: number }) {
  const len = draft.name.length
  return (
    <div className="space-y-6">
      {!desktop && (
        <motion.div variants={fadeUp}>
          <StageBox
            color={draft.color}
            expression={expression}
            accessory={draft.accessory}
            name={draft.name}
            pulse={pulse}
            heightClass="h-56"
          />
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <label htmlFor="ob-name" className="mb-2 block font-display text-lg font-semibold text-ink">
          {t('ชื่อเล่น', 'Nickname')}
        </label>
        <div className="relative">
          <input
            id="ob-name"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value.slice(0, NAME_MAX) })}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            enterKeyHint="next"
            autoFocus={desktop}
            placeholder={t('เช่น ต้นข้าว, มิว, Ploy', 'e.g. Mew, Ploy, Kai')}
            aria-describedby="ob-name-hint"
            className="h-16 w-full rounded-[1.4rem] border-2 border-line bg-white pr-20 pl-5 font-display text-xl text-ink shadow-[var(--shadow-soft)] transition-colors outline-none placeholder:text-ink-faint focus:border-peach focus-visible:ring-4 focus-visible:ring-peach/40"
          />
          <span className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-xs font-semibold text-ink-soft" aria-hidden>
            {len}/{NAME_MAX}
          </span>
        </div>
        <p id="ob-name-hint" className="mt-2 text-sm text-ink-soft">
          {t(
            `ใช้ชื่อที่อยากให้เพื่อนเรียก ไม่ต้องเป็นชื่อจริงก็ได้ (สูงสุด ${NAME_MAX} ตัวอักษร)`,
            `What you'd like friends to call you. It doesn't have to be your real name (up to ${NAME_MAX} characters)`,
          )}
        </p>
      </motion.div>

      <motion.section variants={fadeUp} aria-labelledby="ob-promise" className="card p-4 sm:p-5">
        <h2 id="ob-promise" className="font-display text-base font-semibold text-ink">
          {t('ที่นี่เราตกลงกันเบาๆ ว่า…', 'A few soft rules around here…')}
        </h2>
        <ul className="mt-3 space-y-2.5">
          {PROMISES.map(({ Icon, text, tint }) => (
            <li key={text} className="flex items-center gap-3 text-[15px] text-ink">
              <span className={`grid size-9 shrink-0 place-items-center rounded-full ${tint}`} aria-hidden>
                <Icon size={17} strokeWidth={2.3} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </motion.section>
    </div>
  )
}
