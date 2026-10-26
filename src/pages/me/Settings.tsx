import { motion } from 'motion/react'
import { ChevronRight, Download, Flag, Info, Languages, PhoneCall, PhoneIncoming, Radio, RotateCcw, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react'
import { useCallback, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { InstallSheet } from '@/app/InstallSheet'
import { Avatar, Button, ButtonLink, LangToggle, Section, Sheet } from '@/components/ui'
import { useDataMode } from '@/data/hooks'
import { useInstallPrompt } from '@/lib/hooks'
import { L, loc, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi, type MoshiPolicy as Who } from '@/lib/store'
import { LegalLinks } from '@/pages/legal/LegalLinks'

type SheetKind = 'who' | 'install' | 'reset' | 'about'

type WhoOption = { key: Who; label: string; hint: string }

const WHO: WhoOption[] = [
  loc<WhoOption>({
    key: 'everyone',
    label: L('ทุกคน', 'Everyone'),
    hint: L('ใครก็ส่งโมชิมาได้ เราเลือกรับหรือไม่รับเองได้เสมอ', 'Anyone can send you a moshi. You always choose whether to pick up'),
  }),
  loc<WhoOption>({
    key: 'rooms',
    label: L('คนที่อยู่ห้องเดียวกัน', 'People in my rooms'),
    hint: L('เฉพาะคนที่อยู่ห้องความสนใจเดียวกับเรา (ห้องนั่งเล่นไม่นับ)', "Only people in the same interest rooms as you (The Lounge doesn't count)"),
  }),
  loc<WhoOption>({
    key: 'chatted',
    label: L('คนที่เคยคุยกัน', "People I've chatted with"),
    hint: L('เฉพาะคนที่เคยคุยแชทกับเรามาแล้ว คนใหม่จะยังส่งโมชิมาไม่ได้นะ', "Only people you've chatted with before. New people can't send you a moshi yet"),
  }),
]

export function Settings() {
  const demo = useDataMode() === 'demo'
  const who = useMoshi((s) => s.moshiPolicy)
  const setWho = useMoshi((s) => s.setMoshiPolicy)
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  const install = useInstallPrompt()
  const close = useCallback(() => setSheet(null), [])
  return (
    <Section title={t('ตั้งค่า', 'Settings')}>
      <ul className="card divide-y divide-line/70 overflow-hidden rounded-3xl">
        <LangRow />
        <Row
          icon={PhoneIncoming}
          tint="bg-peach/50"
          label={t('ใครส่งโมชิหาเราได้บ้าง', 'Who can send me a moshi')}
          value={WHO.find((w) => w.key === who)?.label}
          onClick={() => setSheet('who')}
        />
        <Row
          icon={Download}
          tint="bg-mint/50"
          label={t('ติดตั้งแอป', 'Install the app')}
          value={install.installed ? t('ติดตั้งแล้ว', 'Installed') : t('เปิดไวจากหน้าจอโฮม', 'Opens fast from your home screen')}
          onClick={() => setSheet('install')}
        />
        <Row
          icon={Sparkles}
          tint="bg-butter/50"
          label={t('แนะนำตัวใหม่อีกรอบ', 'Redo my intro')}
          value={t('เลือกเรื่องที่ชอบใหม่ทีละขั้น', 'Pick your interests again, step by step')}
          to="/onboarding"
        />
        {demo && (
          <Row icon={RotateCcw} tint="bg-lavender/40" label={t('รีเซ็ตเดโม', 'Reset demo')} value={t('เริ่มใหม่หมดทุกอย่าง', 'Start everything over')} onClick={() => setSheet('reset')} />
        )}
        <Row
          icon={Info}
          tint="bg-sky/50"
          label={t('เกี่ยวกับ moshimoshi', 'About moshimoshi')}
          value={t('หลักการ ข้อตกลง และความเป็นส่วนตัว', 'Principles, terms and privacy')}
          onClick={() => setSheet('about')}
        />
      </ul>

      <Sheet open={sheet === 'who'} onClose={close} title={t('ใครส่งโมชิหาเราได้บ้าง', 'Who can send me a moshi')}>
        <WhoForm value={who} onChange={setWho} onDone={close} />
      </Sheet>
      <InstallSheet open={sheet === 'install'} onClose={close} />
      {demo && (
        <Sheet open={sheet === 'reset'} onClose={close} title={t('รีเซ็ตเดโม', 'Reset demo')}>
          <ResetConfirm onClose={close} />
        </Sheet>
      )}
      <Sheet open={sheet === 'about'} onClose={close} title={t('เกี่ยวกับ moshimoshi', 'About moshimoshi')}>
        <About demo={demo} />
      </Sheet>
    </Section>
  )
}

/**
 * ไทย | EN switch. The label stays in both languages so it's easy to spot
 * whichever language the app is in.
 */
function LangRow() {
  return (
    <li className="flex min-h-16 w-full items-center gap-3 px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-pink/45">
        <Languages size={19} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">ภาษา / Language</span>
        <span className="block truncate text-sm text-ink-soft">{t('ภาษาที่ใช้ในแอป', 'The language the app speaks')}</span>
      </span>
      <LangToggle size="sm" />
    </li>
  )
}

function Row({
  icon: Icon,
  tint,
  label,
  value,
  onClick,
  to,
}: {
  icon: LucideIcon
  tint: string
  label: string
  value?: ReactNode
  onClick?: () => void
  to?: string
}) {
  const inner = (
    <>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
        <Icon size={19} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{label}</span>
        {value && <span className="block truncate text-sm text-ink-soft">{value}</span>}
      </span>
      <ChevronRight size={18} className="shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" aria-hidden />
    </>
  )
  const cls = 'group flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cream active:bg-cream-2'
  return <li>{to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>}</li>
}

function WhoForm({ value, onChange, onDone }: { value: Who; onChange: (w: Who) => void; onDone: () => void }) {
  const name = useId()
  return (
    <div className="space-y-4 pb-2">
      <p className="text-sm text-ink-soft">
        {t(
          'ไม่ว่าเลือกแบบไหน ทุกโมชิต้องมีประโยคเปิด และเราเลือกรับสายเองได้เสมอ',
          'Whatever you pick, every moshi comes with an opening line, and you always decide whether to pick up',
        )}
      </p>
      <fieldset>
        <legend className="sr-only">{t('ใครส่งโมชิหาเราได้บ้าง', 'Who can send me a moshi')}</legend>
        <div className="grid gap-2">
          {WHO.map((w) => {
            const on = value === w.key
            return (
              <label key={w.key} className="relative flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4">
                <input type="radio" name={name} checked={on} onChange={() => onChange(w.key)} className="peer sr-only" />
                {on && <motion.span layoutId={`${name}-on`} transition={spring.bouncy} className="absolute inset-0 rounded-2xl bg-butter/40 shadow-[inset_0_0_0_2px_var(--color-butter)]" />}
                <span
                  aria-hidden
                  className={`relative mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lavender ${on ? 'border-ink' : 'border-ink-faint'}`}
                >
                  {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className="size-2.5 rounded-full bg-ink" />}
                </span>
                <span className="relative">
                  <span className="block font-display font-semibold">{w.label}</span>
                  <span className="block text-sm text-ink-soft">{w.hint}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
      <Button block onClick={onDone}>
        {t('เรียบร้อย', 'Done')}
      </Button>
    </div>
  )
}

function ResetConfirm({ onClose }: { onClose: () => void }) {
  const resetDemo = useMoshi((s) => s.resetDemo)
  const [done, setDone] = useState(false)
  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft} className="flex flex-col items-center gap-3 pb-3 text-center" role="status">
        <Avatar color="butter" size={88} face="happy" />
        <h3 className="font-display text-xl font-semibold">{t('รีเซ็ตเรียบร้อย', 'All reset!')}</h3>
        <p className="text-ink-soft">
          {t('ทุกอย่างกลับเป็นเหมือนวันแรก จะเริ่มเลือกเรื่องที่ชอบใหม่เลยก็ได้นะ', "Everything's back to day one. Feel free to pick your interests all over again")}
        </p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <ButtonLink to="/onboarding" block icon={<Sparkles size={18} aria-hidden />}>
            {t('เริ่มแนะนำตัวใหม่', 'Start my intro again')}
          </ButtonLink>
          <Button variant="ghost" block onClick={onClose}>
            {t('อยู่หน้านี้ต่อ', 'Stay here')}
          </Button>
        </div>
      </motion.div>
    )
  }
  return (
    <div className="space-y-4 pb-3">
      <div className="flex items-center gap-3 rounded-3xl bg-white p-4">
        <Avatar color="lavender" size={52} face="wow" />
        <p className="text-ink">
          {t(
            'แน่ใจนะ? แชท โพสต์ ห้องที่เข้า และโปรไฟล์ที่ลองแก้ไว้ จะกลับเป็นค่าเริ่มต้นทั้งหมด',
            'Sure? Your chats, posts, joined rooms and any profile edits will all go back to the start',
          )}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          variant="dark"
          block
          icon={<RotateCcw size={18} aria-hidden />}
          onClick={() => {
            resetDemo()
            setDone(true)
          }}
        >
          {t('รีเซ็ตเลย', 'Reset it')}
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          {t('ยังก่อน', 'Not yet')}
        </Button>
      </div>
    </div>
  )
}

type Principle = { Icon: LucideIcon; title: string; text: string }

const PRINCIPLES: Principle[] = [
  loc<Principle>({
    Icon: Radio,
    title: L('สัญญาณถูกคอ ไม่ใช่คะแนน', 'A vibe signal, not a score'),
    text: L('บอกความคล้ายเป็นขีดสัญญาณ 5 ระดับ ไม่มีเปอร์เซ็นต์ ไม่มีตัวเลขมาตัดสินใคร', 'How alike you are shows as 5 signal bars. No percentages, no numbers judging anyone'),
  }),
  loc<Principle>({
    Icon: PhoneCall,
    title: L('ส่งโมชิ = ยินยอมทั้งสองฝ่าย', 'A moshi = both sides say yes'),
    text: L('คุย 1:1 ได้ก็ต่อเมื่ออีกฝ่ายกดรับสายแล้วเท่านั้น', '1:1 chats only open once the other person picks up'),
  }),
  loc<Principle>({
    Icon: ShieldCheck,
    title: L('บันไดความไว้ใจ', 'The trust ladder'),
    text: L('คุยกันก่อน ตกลงกันได้แล้วค่อยแลกรูป ลิงก์ หรือไลน์ ไม่ต้องรีบ', 'Chat first. Swap photos, links or LINE only once you both agree. No rush'),
  }),
  loc<Principle>({
    Icon: Flag,
    title: L('รายงานและบล็อกได้ทุกที่', 'Report and block from anywhere'),
    text: L('ไม่สบายใจตรงไหน บอกเราได้เลย ทีมงานพร้อมดูแล', "If anything feels off, tell us. The team's here to help"),
  }),
]

function About({ demo }: { demo: boolean }) {
  return (
    <div className="space-y-5 pb-3">
      <div className="flex items-center gap-4">
        <img src="/logo.svg" alt="" className="size-16 rounded-3xl shadow-[var(--shadow-soft)]" />
        <div>
          <p className="font-display text-2xl font-semibold">moshimoshi</p>
          <p className="text-sm text-ink-soft">
            {demo ? t('เวอร์ชันเดโม', 'Demo version') : t('เวอร์ชันแรก', 'First version')} · {t('โมชิโมชิ แปลว่า "ฮัลโหล"', '"moshi moshi" means "hello?" on the phone')}
          </p>
        </div>
      </div>
      <p className="text-ink">
        {t(
          'ที่ที่ให้เราเจอเพื่อนจากเรื่องที่ชอบเหมือนกัน ไม่ว่าจะเป็นอนิเมะ เกม คาเฟ่ หรือแค่อยากมีใครสักคนถามว่า "วันนี้เป็นไงบ้าง"',
          `A place to meet friends who love the same things, whether that's anime, games, cafés, or just wanting someone to ask "how was your day?"`,
        )}
      </p>
      <ul className="space-y-2.5">
        {PRINCIPLES.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3 rounded-2xl bg-white p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cream-3">
              <Icon size={18} aria-hidden />
            </span>
            <span>
              <span className="block font-display font-semibold">{title}</span>
              <span className="block text-sm text-ink-soft">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-center text-sm text-ink-soft">{t('ทำด้วยความอบอุ่น ให้ทุกคนมีเพื่อนคุยกันนะ', 'Made with warmth, so everyone has someone to talk to')}</p>
      <LegalLinks className="justify-center" />
    </div>
  )
}
