import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Lock, MessageCircleHeart, ShieldCheck, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import type { MochiExpression } from '@/components/three'
import { Avatar, Button } from '@/components/ui'
import { useDataMode } from '@/data/hooks'
import { signOut } from '@/lib/auth'
import { L, loc, t, tx } from '@/lib/i18n'
import { fadeUp, spring } from '@/lib/motion'
import { ageState, MIN_AGE, NAME_MAX, type StepProps } from '../model'
import { StageBox } from '../parts/StageBox'

const MONTHS = [
  L('มกราคม', 'January'),
  L('กุมภาพันธ์', 'February'),
  L('มีนาคม', 'March'),
  L('เมษายน', 'April'),
  L('พฤษภาคม', 'May'),
  L('มิถุนายน', 'June'),
  L('กรกฎาคม', 'July'),
  L('สิงหาคม', 'August'),
  L('กันยายน', 'September'),
  L('ตุลาคม', 'October'),
  L('พฤศจิกายน', 'November'),
  L('ธันวาคม', 'December'),
]

const fieldClass =
  'h-16 w-full rounded-[1.4rem] border-2 border-line bg-white px-5 font-display text-xl text-ink shadow-[var(--shadow-soft)] transition-colors outline-none placeholder:text-ink-faint focus:border-peach focus-visible:ring-4 focus-visible:ring-peach/40'

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

      {draft.needsAge && <BirthFields draft={draft} update={update} />}

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

/** Month + year of birth for the 20+ check (design: by month and year, พ.ศ. or ค.ศ.). Only the year is kept. */
function BirthFields({ draft, update }: Pick<StepProps, 'draft' | 'update'>) {
  const under = ageState(draft).kind === 'under'
  const live = useDataMode() === 'live'
  const navigate = useNavigate()
  return (
    <motion.div variants={fadeUp}>
      <p id="ob-birth" className="mb-2 font-display text-lg font-semibold text-ink">
        {t('เดือนและปีเกิด', 'Birth month and year')}
      </p>
      <div role="group" aria-labelledby="ob-birth" aria-describedby="ob-birth-hint" className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-2.5">
        <label htmlFor="ob-birth-month" className="sr-only">
          {t('เดือนเกิด', 'Birth month')}
        </label>
        <div className="relative">
          <select
            id="ob-birth-month"
            value={draft.birthMonth}
            onChange={(e) => update({ birthMonth: e.target.value })}
            autoComplete="bday-month"
            className={`${fieldClass} appearance-none pr-11 pl-4 ${draft.birthMonth ? '' : 'text-ink-faint'}`}
          >
            <option value="">{t('เดือน', 'Month')}</option>
            {MONTHS.map((m, i) => (
              <option key={m.th} value={String(i + 1)} className="text-ink">
                {tx(m)}
              </option>
            ))}
          </select>
          <ChevronDown size={20} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-soft" aria-hidden />
        </div>
        <label htmlFor="ob-birth-year" className="sr-only">
          {t('ปีเกิด (พ.ศ. หรือ ค.ศ.)', 'Birth year (Buddhist or Western)')}
        </label>
        <input
          id="ob-birth-year"
          value={draft.birthYear}
          onChange={(e) => update({ birthYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          inputMode="numeric"
          autoComplete="bday-year"
          enterKeyHint="next"
          maxLength={4}
          placeholder={t('ปี เช่น 2541', 'Year, e.g. 1998')}
          className={fieldClass}
        />
      </div>
      <p id="ob-birth-hint" className="mt-2 flex items-start gap-1.5 text-sm text-ink-soft">
        <Lock size={14} className="mt-1 shrink-0" aria-hidden />
        {t(
          `ใช้เช็กว่าอายุ ${MIN_AGE} ปีขึ้นไป พิมพ์ได้ทั้ง พ.ศ. และ ค.ศ. เราไม่โชว์ปีเกิดให้ใครเห็นนะ`,
          `Only used to check you're ${MIN_AGE}+. Buddhist or Western years both work, and we never show it to anyone`,
        )}
      </p>

      <AnimatePresence initial={false}>
        {under && (
          <motion.div
            key="under"
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.soft}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-start gap-3 rounded-3xl bg-lavender/35 p-4">
              <Avatar color="lavender" size={46} face="smile" />
              <div className="min-w-0 text-[15px] text-ink">
                <p className="font-display text-base font-semibold">{t('ขอบคุณที่อยากมาเป็นเพื่อนกันนะ', 'Thanks for wanting to be friends!')}</p>
                <p className="mt-0.5 text-ink-soft">
                  {t(
                    `ตอนนี้ moshimoshi เปิดให้เพื่อนที่อายุ ${MIN_AGE} ปีขึ้นไปก่อน ไว้ถึงวันนั้นแล้วกลับมาหากันใหม่นะ โมชิจะรออยู่ตรงนี้`,
                    `For now, moshimoshi is open to friends aged ${MIN_AGE} and up. Come back once you turn ${MIN_AGE}. Mochi will be right here waiting`,
                  )}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <Link to="/" className="inline-flex min-h-11 items-center rounded-full font-semibold text-ink underline underline-offset-4">
                    {t('กลับหน้าแรก', 'Back to home')}
                  </Link>
                  {live && (
                    <Button variant="ghost" size="sm" onClick={() => void signOut().then(() => navigate('/', { replace: true }))}>
                      {t('ออกจากระบบ', 'Sign out')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
