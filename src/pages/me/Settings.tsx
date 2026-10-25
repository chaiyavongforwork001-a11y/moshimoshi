import { motion } from 'motion/react'
import { ChevronRight, Download, Flag, Info, PhoneCall, PhoneIncoming, Radio, RotateCcw, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react'
import { useCallback, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { InstallSheet } from '@/app/InstallSheet'
import { Avatar, Button, ButtonLink, Section, Sheet } from '@/components/ui'
import { useDataMode } from '@/data/hooks'
import { useInstallPrompt } from '@/lib/hooks'
import { spring } from '@/lib/motion'
import { useMoshi, type MoshiPolicy as Who } from '@/lib/store'

type SheetKind = 'who' | 'install' | 'reset' | 'about'

const WHO: { key: Who; label: string; hint: string }[] = [
  { key: 'everyone', label: 'ทุกคน', hint: 'ใครก็ส่งโมชิมาได้ เราเลือกรับหรือไม่รับเองได้เสมอ' },
  { key: 'rooms', label: 'คนที่อยู่ห้องเดียวกัน', hint: 'เฉพาะคนที่อยู่ห้องความสนใจเดียวกับเรา (ห้องนั่งเล่นไม่นับ)' },
  { key: 'chatted', label: 'คนที่เคยคุยกัน', hint: 'เฉพาะคนที่เคยคุยแชทกับเรามาแล้ว คนใหม่จะยังส่งโมชิมาไม่ได้นะ' },
]

export function Settings() {
  const demo = useDataMode() === 'demo'
  const who = useMoshi((s) => s.moshiPolicy)
  const setWho = useMoshi((s) => s.setMoshiPolicy)
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  const install = useInstallPrompt()
  const close = useCallback(() => setSheet(null), [])
  return (
    <Section title="ตั้งค่า">
      <ul className="card divide-y divide-line/70 overflow-hidden rounded-3xl">
        <Row icon={PhoneIncoming} tint="bg-peach/50" label="ใครส่งโมชิหาเราได้บ้าง" value={WHO.find((w) => w.key === who)?.label} onClick={() => setSheet('who')} />
        <Row icon={Download} tint="bg-mint/50" label="ติดตั้งแอป" value={install.installed ? 'ติดตั้งแล้ว' : 'เปิดไวจากหน้าจอโฮม'} onClick={() => setSheet('install')} />
        <Row icon={Sparkles} tint="bg-butter/50" label="แนะนำตัวใหม่อีกรอบ" value="เลือกเรื่องที่ชอบใหม่ทีละขั้น" to="/onboarding" />
        {demo && <Row icon={RotateCcw} tint="bg-lavender/40" label="รีเซ็ตเดโม" value="เริ่มใหม่หมดทุกอย่าง" onClick={() => setSheet('reset')} />}
        <Row icon={Info} tint="bg-sky/50" label="เกี่ยวกับ moshimoshi" onClick={() => setSheet('about')} />
      </ul>

      <Sheet open={sheet === 'who'} onClose={close} title="ใครส่งโมชิหาเราได้บ้าง">
        <WhoForm value={who} onChange={setWho} onDone={close} />
      </Sheet>
      <InstallSheet open={sheet === 'install'} onClose={close} />
      {demo && (
        <Sheet open={sheet === 'reset'} onClose={close} title="รีเซ็ตเดโม">
          <ResetConfirm onClose={close} />
        </Sheet>
      )}
      <Sheet open={sheet === 'about'} onClose={close} title="เกี่ยวกับ moshimoshi">
        <About demo={demo} />
      </Sheet>
    </Section>
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
      <p className="text-sm text-ink-soft">ไม่ว่าเลือกแบบไหน ทุกโมชิต้องมีประโยคเปิด และเราเลือกรับสายเองได้เสมอ</p>
      <fieldset>
        <legend className="sr-only">ใครส่งโมชิหาเราได้บ้าง</legend>
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
        เรียบร้อย
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
        <h3 className="font-display text-xl font-semibold">รีเซ็ตเรียบร้อย</h3>
        <p className="text-ink-soft">ทุกอย่างกลับเป็นเหมือนวันแรก จะเริ่มเลือกเรื่องที่ชอบใหม่เลยก็ได้นะ</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <ButtonLink to="/onboarding" block icon={<Sparkles size={18} aria-hidden />}>
            เริ่มแนะนำตัวใหม่
          </ButtonLink>
          <Button variant="ghost" block onClick={onClose}>
            อยู่หน้านี้ต่อ
          </Button>
        </div>
      </motion.div>
    )
  }
  return (
    <div className="space-y-4 pb-3">
      <div className="flex items-center gap-3 rounded-3xl bg-white p-4">
        <Avatar color="lavender" size={52} face="wow" />
        <p className="text-ink">แน่ใจนะ? แชท โพสต์ ห้องที่เข้า และโปรไฟล์ที่ลองแก้ไว้ จะกลับเป็นค่าเริ่มต้นทั้งหมด</p>
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
          รีเซ็ตเลย
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          ยังก่อน
        </Button>
      </div>
    </div>
  )
}

const PRINCIPLES: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Radio, title: 'สัญญาณถูกคอ ไม่ใช่คะแนน', text: 'บอกความคล้ายเป็นขีดสัญญาณ 5 ระดับ ไม่มีเปอร์เซ็นต์ ไม่มีตัวเลขมาตัดสินใคร' },
  { Icon: PhoneCall, title: 'ส่งโมชิ = ยินยอมทั้งสองฝ่าย', text: 'คุย 1:1 ได้ก็ต่อเมื่ออีกฝ่ายกดรับสายแล้วเท่านั้น' },
  { Icon: ShieldCheck, title: 'บันไดความไว้ใจ', text: 'คุยกันก่อน ตกลงกันได้แล้วค่อยแลกรูป ลิงก์ หรือไลน์ ไม่ต้องรีบ' },
  { Icon: Flag, title: 'รายงานและบล็อกได้ทุกที่', text: 'ไม่สบายใจตรงไหน บอกเราได้เลย ทีมงานพร้อมดูแล' },
]

function About({ demo }: { demo: boolean }) {
  return (
    <div className="space-y-5 pb-3">
      <div className="flex items-center gap-4">
        <img src="/logo.svg" alt="" className="size-16 rounded-3xl shadow-[var(--shadow-soft)]" />
        <div>
          <p className="font-display text-2xl font-semibold">moshimoshi</p>
          <p className="text-sm text-ink-soft">{demo ? 'เวอร์ชันเดโม' : 'เวอร์ชันแรก'} · โมชิโมชิ แปลว่า "ฮัลโหล"</p>
        </div>
      </div>
      <p className="text-ink">
        ที่ที่ให้เราเจอเพื่อนจากเรื่องที่ชอบเหมือนกัน ไม่ว่าจะเป็นอนิเมะ เกม คาเฟ่ หรือแค่อยากมีใครสักคนถามว่า "วันนี้เป็นไงบ้าง"
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
      <p className="text-center text-sm text-ink-soft">ทำด้วยความอบอุ่น ให้ทุกคนมีเพื่อนคุยกันนะ</p>
    </div>
  )
}
