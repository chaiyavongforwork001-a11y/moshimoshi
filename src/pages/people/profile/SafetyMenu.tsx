import { AnimatePresence, motion } from 'motion/react'
import { Ban, Check, Flag, MoreHorizontal } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Avatar, Button, IconButton, Sheet } from '@/components/ui'
import { L, loc, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { User } from '@/lib/types'

type Kind = 'block' | 'report'

interface Reason {
  /** what gets sent with the report: stays Thai */
  value: string
  label: string
}

const REPORT_REASONS: Reason[] = [
  loc<Reason>({ value: 'สแปม หรือโฆษณา', label: L('สแปม หรือโฆษณา', 'Spam or ads') }),
  loc<Reason>({ value: 'หลอกลวง หรือชวนลงทุน', label: L('หลอกลวง หรือชวนลงทุน', 'Scam or investment pitch') }),
  loc<Reason>({ value: 'คุกคาม หรือพูดไม่สุภาพ', label: L('คุกคาม หรือพูดไม่สุภาพ', 'Harassment or rude talk') }),
  loc<Reason>({ value: 'ปลอมตัวเป็นคนอื่น', label: L('ปลอมตัวเป็นคนอื่น', 'Pretending to be someone else') }),
  loc<Reason>({ value: 'อย่างอื่น', label: L('อย่างอื่น', 'Something else') }),
]

/** Overflow menu (บล็อก / รายงาน) with confirm sheets. */
export function SafetyMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState<Kind | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  // the menuitem that opened the sheet is gone by now: hand focus back to the ⋯ button
  const close = useCallback(() => {
    setSheet(null)
    requestAnimationFrame(() => trigger.current?.focus())
  }, [])

  useEffect(() => {
    if (!open) return
    const first = menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')
    first?.focus()
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])]
        const i = items.indexOf(document.activeElement as HTMLButtonElement)
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
        e.preventDefault()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (k: Kind) => {
    setOpen(false)
    setSheet(k)
  }

  return (
    <div ref={wrap} className="relative">
      <IconButton ref={trigger} label={t('ตัวเลือกเพิ่มเติม', 'More options')} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={20} />
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label={t('ตัวเลือก', 'Options')}
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={spring.bouncy}
            className="absolute top-13 right-0 z-40 w-56 origin-top-right rounded-3xl bg-white p-1.5 shadow-[var(--shadow-lift)]"
          >
            <MenuItem icon={<Ban size={18} aria-hidden />} onClick={() => choose('block')}>
              {t(`บล็อก${user.name}`, `Block ${user.name}`)}
            </MenuItem>
            <MenuItem icon={<Flag size={18} aria-hidden />} onClick={() => choose('report')}>
              {t('รายงานโปรไฟล์นี้', 'Report this profile')}
            </MenuItem>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={sheet === 'block'} onClose={close} title={t(`บล็อก${user.name}`, `Block ${user.name}`)}>
        <BlockConfirm user={user} onClose={close} />
      </Sheet>
      <Sheet open={sheet === 'report'} onClose={close} title={t('รายงานโปรไฟล์นี้', 'Report this profile')}>
        <ReportForm user={user} onClose={close} />
      </Sheet>
    </div>
  )
}

function MenuItem({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left font-semibold text-ink hover:bg-cream focus-visible:bg-cream"
    >
      {icon}
      {children}
    </button>
  )
}

function Done({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft} className="flex flex-col items-center gap-3 pt-2 pb-3 text-center" role="status">
      <span className="relative">
        <Avatar color="mint" size={84} face="happy" />
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring.bouncy, delay: 0.15 }}
          className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-success text-white ring-4 ring-cream"
        >
          <Check size={16} strokeWidth={3} aria-hidden />
        </motion.span>
      </span>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="max-w-sm text-ink-soft">{text}</p>
      <Button block onClick={onClose} className="mt-2">
        {t('โอเค', 'OK')}
      </Button>
    </motion.div>
  )
}

function BlockConfirm({ user, onClose }: { user: User; onClose: () => void }) {
  const blockUser = useMoshi((s) => s.blockUser)
  const [done, setDone] = useState(false)
  if (done)
    return (
      <Done
        title={t('บล็อกแล้วนะ', 'Blocked')}
        text={t(
          `จากนี้${user.name}จะไม่เห็นเรา และส่งโมชิหาเราไม่ได้ พักใจก่อนได้เลย ถ้าเปลี่ยนใจก็ปลดบล็อกได้ทุกเมื่อ`,
          `From now on ${user.name} won't see you and can't send you a moshi. Take a breather. Changed your mind? You can unblock anytime.`,
        )}
        onClose={onClose}
      />
    )
  return (
    <div className="space-y-4 pb-3">
      <div className="flex items-center gap-3 rounded-3xl bg-white p-3">
        <Avatar color={user.color} size={48} face="sleepy" />
        <p className="text-ink">
          {t('บล็อก', 'Block ')}
          <b className="font-semibold">{user.name}</b>
          {t('ไหม?', '?')}
        </p>
      </div>
      <ul className="space-y-2 text-sm text-ink-soft">
        <li>· {t('เขาจะไม่เห็นโปรไฟล์ โพสต์ และข้อความของเรา', "They won't see your profile, posts or messages")}</li>
        <li>· {t('เขาส่งโมชิหาเราไม่ได้ และจะไม่ได้รับแจ้งว่าถูกบล็อก', "They can't send you a moshi, and they won't be told they're blocked")}</li>
        <li>· {t('ปลดบล็อกได้ทุกเมื่อจากหน้าของเรา', 'You can unblock anytime from your page')}</li>
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          variant="dark"
          block
          icon={<Ban size={18} aria-hidden />}
          onClick={() => {
            blockUser(user.id)
            setDone(true)
          }}
        >
          {t('บล็อก', 'Block')}
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          {t('ยกเลิก', 'Cancel')}
        </Button>
      </div>
    </div>
  )
}

function ReportForm({ user, onClose }: { user: User; onClose: () => void }) {
  const reportUser = useMoshi((s) => s.reportUser)
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)
  const id = useId()
  if (done)
    return (
      <Done
        title={t('ขอบคุณที่บอกเรานะ', 'Thanks for telling us')}
        text={t(
          `ทีมงานจะดูให้เร็วที่สุด ${user.name}จะไม่รู้ว่าใครเป็นคนรายงาน ถ้าไม่สบายใจ บล็อกไว้ก่อนได้เลย`,
          `Our team will look into it as soon as we can. ${user.name} won't know who reported them. If you feel uneasy, go ahead and block them.`,
        )}
        onClose={onClose}
      />
    )
  return (
    <form
      className="space-y-4 pb-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!reason) return
        reportUser(user.id, reason, note.trim() || undefined)
        setDone(true)
      }}
    >
      <fieldset>
        <legend className="font-display font-semibold">{t('เกิดอะไรขึ้น', 'What happened?')}</legend>
        <div className="mt-2 grid gap-2">
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-4 py-2 transition-colors ${reason === r.value ? 'bg-butter/60' : 'bg-white'}`}>
              <input type="radio" name={`${id}-reason`} value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="size-4 accent-coral-deep" />
              <span className="text-ink">{r.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-note`} className="font-display font-semibold">
          {t('เล่าเพิ่มเติม', 'Tell us more')} <span className="font-body text-sm font-normal text-ink-soft">{t('(ไม่บังคับ)', '(optional)')}</span>
        </label>
        <textarea
          id={`${id}-note`}
          rows={3}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-2 block w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-ink focus:border-lavender"
        />
      </div>
      <Button type="submit" variant="dark" block icon={<Flag size={18} aria-hidden />} disabled={!reason}>
        {t('ส่งรายงาน', 'Send report')}
      </Button>
    </form>
  )
}
