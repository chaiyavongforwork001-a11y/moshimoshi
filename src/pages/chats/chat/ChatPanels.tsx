import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, ChevronLeft, Clock3, Lightbulb, Lock, PhoneCall, PhoneIncoming, PhoneOff, Pin, Radio, ShieldCheck, Shuffle } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { Avatar, Button, ButtonLink, SignalMeter } from '@/components/ui'
import { spring } from '@/lib/motion'
import type { SignalLevel, User } from '@/lib/types'
import { statusLabel } from '@/pages/people/lib'

export function ChatHeader({
  them,
  level,
  typing,
  waiting,
  incoming = false,
}: {
  them: User
  level: SignalLevel
  typing: boolean
  waiting: boolean
  /** they rang us and we haven't answered yet */
  incoming?: boolean
}) {
  const status = typing ? 'กำลังพิมพ์…' : waiting ? 'รอรับสายอยู่…' : incoming ? 'โทรมาหาเรา' : statusLabel(them)
  return (
    <header className="safe-top sticky top-0 z-30 flex items-center gap-2 border-b border-line/70 bg-cream/80 px-3 pb-2.5 backdrop-blur-xl lg:static lg:rounded-t-[2rem] lg:bg-white/70 lg:px-5 lg:pt-4 lg:pb-3">
      <Link
        to="/app/chats"
        aria-label="กลับไปหน้าแชท"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-[var(--shadow-soft)] transition-transform active:scale-90"
      >
        <ChevronLeft size={22} />
      </Link>
      <Link to={`/app/people/${them.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 pr-2 hover:bg-white/60">
        <Avatar color={them.color} size={42} online={them.isOnline} face={typing ? 'talk' : 'smile'} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-display text-lg leading-tight font-semibold">{them.name}</span>
            <SignalMeter level={level} size="xs" short />
          </span>
          <span className="block" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={status}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="block truncate text-xs text-ink-soft"
              >
                {status}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
      </Link>
    </header>
  )
}

export interface Topic {
  tip: string
  text: string
}

/** Pinned topic card: tap "ใช้หัวข้อนี้" to drop a ready opener into the composer. */
export function IcebreakerCard({ topics, onUse }: { topics: Topic[]; onUse: (text: string) => void }) {
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(true)
  const id = useId()
  if (!topics.length) return null
  const t = topics[i % topics.length]
  return (
    <motion.section
      layout
      transition={spring.soft}
      aria-labelledby={`${id}-h`}
      className="relative overflow-hidden rounded-3xl border border-butter/70 bg-butter/25 p-3.5 sm:p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-butter shadow-[inset_0_-2px_0_rgb(59_38_34/0.12)]">
          <Lightbulb size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 id={`${id}-h`} className="flex items-center gap-1 text-xs font-semibold text-ink-soft">
              <Pin size={12} aria-hidden /> หัวข้อชวนคุย
            </h2>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? 'ย่อหัวข้อชวนคุย' : 'ขยายหัวข้อชวนคุย'}
              className="-my-2 -mr-2 inline-flex size-11 items-center justify-center rounded-full text-ink-soft hover:text-ink"
            >
              <motion.span animate={{ rotate: open ? 0 : -90 }} transition={spring.bouncy} className="inline-flex">
                <ChevronDown size={18} />
              </motion.span>
            </button>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={t.tip}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`text-[15px] leading-relaxed text-ink ${open ? '' : 'line-clamp-1'}`}
            >
              {t.tip}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={spring.soft}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-2.5">
                  <Button size="sm" variant="secondary" onClick={() => onUse(t.text)}>
                    ใช้หัวข้อนี้
                  </Button>
                  {topics.length > 1 && (
                    <Button size="sm" variant="ghost" icon={<Shuffle size={15} aria-hidden />} onClick={() => setI((n) => n + 1)}>
                      หัวข้ออื่น
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  )
}

/**
 * บันไดความไว้ใจ — step 2 (photos / links / LINE) needs both people to switch it on.
 * Without `onToggle` (live chats: nothing locks links or LINE ids) it's an honest reminder instead.
 */
export function TrustLadder({ name, consent = false, onToggle }: { name: string; consent?: boolean; onToggle?: () => void }) {
  const id = useId()
  if (!onToggle) {
    return (
      <section aria-labelledby={`${id}-h`} className="rounded-3xl bg-white/80 p-3.5 shadow-[var(--shadow-soft)] sm:p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-mint/60">
            <ShieldCheck size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-h`} className="text-xs font-semibold text-ink-soft">
              บันไดความไว้ใจ
            </h2>
            <p className="text-sm leading-relaxed text-ink">
              <b className="font-display font-semibold">ขั้น 1: คุยกันได้แล้ว</b> · ขั้น 2: ตกลงกับ{name}ก่อนค่อยแลกรูป ลิงก์ หรือไลน์นะ ไม่ต้องรีบ
            </p>
            <p className="mt-1 text-xs text-ink-soft">ไม่สบายใจตรงไหน บล็อกหรือรายงานได้ทุกเมื่อนะ</p>
          </div>
        </div>
      </section>
    )
  }
  return (
    <section aria-labelledby={`${id}-h`} className="rounded-3xl bg-white/80 p-3.5 shadow-[var(--shadow-soft)] sm:p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-mint/60">
          <ShieldCheck size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-h`} className="text-xs font-semibold text-ink-soft">
            บันไดความไว้ใจ
          </h2>
          <p className="text-sm leading-relaxed text-ink">
            <b className="font-display font-semibold">ขั้น 1: คุยกันได้แล้ว</b> · ส่งรูป/ลิงก์/ไลน์ได้เมื่อทั้งคู่กดยินยอม
          </p>
        </div>
      </div>

      {/* two-step ladder */}
      <ol className="mt-3 flex items-center gap-2 px-1" aria-label="ขั้นของบันไดความไว้ใจ">
        <li className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <span className="flex size-6 items-center justify-center rounded-full bg-mint">
            <Check size={13} strokeWidth={3} aria-hidden />
          </span>
          คุยกันได้
        </li>
        <li aria-hidden className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
          <motion.span
            className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-mint to-butter"
            animate={{ width: consent ? '50%' : '0%' }}
            transition={spring.soft}
          />
        </li>
        <li className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
          <span className="flex size-6 items-center justify-center rounded-full bg-ink/10">
            <Lock size={12} strokeWidth={2.6} aria-hidden />
          </span>
          รูป ลิงก์ ไลน์
        </li>
      </ol>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-cream px-3 py-1.5">
        <span id={`${id}-label`} className="text-sm text-ink">
          {consent ? `เรากดยินยอมแล้ว รอ${name}กดด้วยนะ` : 'เรายินยอมให้ปลดล็อกขั้น 2'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={consent}
          aria-labelledby={`${id}-label`}
          onClick={onToggle}
          className="relative inline-flex h-11 w-14 shrink-0 items-center justify-center"
        >
          <span className={`relative h-7 w-12 rounded-full transition-colors ${consent ? 'bg-success' : 'bg-ink/20'}`}>
            <motion.span
              className="absolute top-0.5 size-6 rounded-full bg-white shadow-[0_2px_6px_rgb(59_38_34/0.25)]"
              animate={{ left: consent ? 22 : 2 }}
              transition={spring.bouncy}
            />
          </span>
        </button>
      </div>
      <p className="mt-2 px-1 text-xs text-ink-soft">เปลี่ยนใจได้ทุกเมื่อ ปิดเมื่อไหร่ก็กลับมาขั้น 1 ทันที</p>
    </section>
  )
}

export function RingingBanner({ them }: { them: User }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={spring.soft}
      className="flex items-center gap-3 rounded-3xl bg-peach/45 p-3"
      role="status"
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-coral/40" aria-hidden />
        <span className="relative flex size-11 animate-wiggle items-center justify-center rounded-full bg-coral text-ink shadow-[var(--shadow-puffy)]">
          <PhoneCall size={20} aria-hidden />
        </span>
      </span>
      <p className="min-w-0 text-sm leading-relaxed">
        <b className="font-display font-semibold">กำลังรอ{them.name}รับสาย</b>
        <br />
        <span className="text-ink-soft">ส่งโมชิไปแล้ว ถ้าเขารับสายจะบอกทันทีนะ</span>
      </p>
    </motion.div>
  )
}

/**
 * Stands in for the composer while a moshi is still ringing: nobody can be
 * messaged first, so only the opener goes out until they pick up.
 */
export function WaitingNote({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      className="safe-bottom sticky bottom-0 z-30 border-t border-line/70 bg-cream/85 px-3 pt-2.5 backdrop-blur-xl lg:static lg:rounded-b-[2rem] lg:bg-white/70 lg:px-5 lg:pb-4"
    >
      <div className="flex items-center gap-3 rounded-[1.4rem] border border-line bg-white/80 px-3.5 py-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-peach/60" aria-hidden>
          <PhoneCall size={18} />
        </span>
        <p className="min-w-0 text-sm leading-relaxed">
          <b className="font-display font-semibold text-ink">รอ{name}รับสายก่อนนะ แล้วค่อยคุยกันต่อ</b>
          <br />
          <span className="text-ink-soft">ส่งได้แค่ข้อความทักแรก ให้เขาได้เลือกเองว่าจะรับสายไหม</span>
        </p>
      </div>
    </motion.div>
  )
}

/** They rang us: their opener is in the list below; we decide whether to pick up. */
export function IncomingBanner({ them }: { them: User }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={spring.soft}
      className="flex items-center gap-3 rounded-3xl bg-mint/40 p-3"
      role="status"
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-mint" aria-hidden />
        <span className="relative flex size-11 animate-wiggle items-center justify-center rounded-full bg-mint text-ink shadow-[var(--shadow-puffy)]">
          <PhoneIncoming size={20} aria-hidden />
        </span>
      </span>
      <p className="min-w-0 text-sm leading-relaxed">
        <b className="font-display font-semibold">{them.name}ส่งโมชิมาหาเรา</b>
        <br />
        <span className="text-ink-soft">อ่านประโยคเปิดของเขาด้านล่างได้เลย อยากคุยด้วยก็รับสาย ไม่สะดวกก็ไว้ก่อนได้</span>
      </p>
    </motion.div>
  )
}

const dock =
  'safe-bottom sticky bottom-0 z-30 border-t border-line/70 bg-cream/85 px-3 pt-2.5 backdrop-blur-xl lg:static lg:rounded-b-[2rem] lg:bg-white/70 lg:px-5 lg:pb-4'

/** Stands in for the composer on a moshi someone sent us: รับสาย / ไว้ก่อน. */
export function IncomingActions({ name, onAccept, onDecline }: { name: string; onAccept: () => void; onDecline: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className={dock}>
      <div className="rounded-[1.4rem] border border-line bg-white/80 p-3">
        <p className="text-sm leading-relaxed text-ink">
          <b className="font-display font-semibold">รับสาย{name}ไหม?</b>{' '}
          <span className="text-ink-soft">รับแล้วคุยกันต่อได้เลย ถ้ากดไว้ก่อน ไม่มีใครเห็นคำว่าปฏิเสธนะ</span>
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
          <Button block icon={<PhoneCall size={18} aria-hidden />} onClick={onAccept}>
            รับสาย
          </Button>
          <Button variant="ghost" block icon={<Clock3 size={18} aria-hidden />} onClick={onDecline}>
            ไว้ก่อน
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

/** The call is over (ended, or never picked up): no composer, a gentle way onward. */
export function EndedNote({ name }: { name: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className={dock}>
      <div className="flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-line bg-white/80 px-3.5 py-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream-3" aria-hidden>
          <PhoneOff size={18} />
        </span>
        <p className="min-w-0 flex-1 text-sm leading-relaxed">
          <b className="font-display font-semibold text-ink">สายกับ{name}วางไปแล้ว</b>
          <br />
          <span className="text-ink-soft">ไม่เป็นไรเลยนะ ยังมีคนคลื่นเดียวกันรอคุยอยู่อีกเยอะ</span>
        </p>
        <ButtonLink to="/app/people" variant="soft" size="sm" icon={<Radio size={15} aria-hidden />}>
          หาคนคลื่นเดียวกัน
        </ButtonLink>
      </div>
    </motion.div>
  )
}
