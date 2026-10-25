import { AnimatePresence, motion } from 'motion/react'
import { Ban, Check, Flag, MoreHorizontal } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Avatar, Button, IconButton, Sheet } from '@/components/ui'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { User } from '@/lib/types'

type Kind = 'block' | 'report'

const REPORT_REASONS = ['สแปม หรือโฆษณา', 'หลอกลวง หรือชวนลงทุน', 'คุกคาม หรือพูดไม่สุภาพ', 'ปลอมตัวเป็นคนอื่น', 'อย่างอื่น']

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
      <IconButton ref={trigger} label="ตัวเลือกเพิ่มเติม" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={20} />
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label="ตัวเลือก"
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={spring.bouncy}
            className="absolute top-13 right-0 z-40 w-56 origin-top-right rounded-3xl bg-white p-1.5 shadow-[var(--shadow-lift)]"
          >
            <MenuItem icon={<Ban size={18} aria-hidden />} onClick={() => choose('block')}>
              บล็อก{user.name}
            </MenuItem>
            <MenuItem icon={<Flag size={18} aria-hidden />} onClick={() => choose('report')}>
              รายงานโปรไฟล์นี้
            </MenuItem>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={sheet === 'block'} onClose={close} title={`บล็อก${user.name}`}>
        <BlockConfirm user={user} onClose={close} />
      </Sheet>
      <Sheet open={sheet === 'report'} onClose={close} title="รายงานโปรไฟล์นี้">
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
        โอเค
      </Button>
    </motion.div>
  )
}

function BlockConfirm({ user, onClose }: { user: User; onClose: () => void }) {
  const blockUser = useMoshi((s) => s.blockUser)
  const [done, setDone] = useState(false)
  if (done) return <Done title="บล็อกแล้วนะ" text={`จากนี้${user.name}จะไม่เห็นเรา และส่งโมชิหาเราไม่ได้ พักใจก่อนได้เลย ถ้าเปลี่ยนใจก็ปลดบล็อกได้ทุกเมื่อ`} onClose={onClose} />
  return (
    <div className="space-y-4 pb-3">
      <div className="flex items-center gap-3 rounded-3xl bg-white p-3">
        <Avatar color={user.color} size={48} face="sleepy" />
        <p className="text-ink">
          บล็อก<b className="font-semibold">{user.name}</b>ไหม?
        </p>
      </div>
      <ul className="space-y-2 text-sm text-ink-soft">
        <li>· เขาจะไม่เห็นโปรไฟล์ โพสต์ และข้อความของเรา</li>
        <li>· เขาส่งโมชิหาเราไม่ได้ และจะไม่ได้รับแจ้งว่าถูกบล็อก</li>
        <li>· ปลดบล็อกได้ทุกเมื่อจากหน้าของเรา</li>
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
          บล็อก
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          ยกเลิก
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
  if (done) return <Done title="ขอบคุณที่บอกเรานะ" text={`ทีมงานจะดูให้เร็วที่สุด ${user.name}จะไม่รู้ว่าใครเป็นคนรายงาน ถ้าไม่สบายใจ บล็อกไว้ก่อนได้เลย`} onClose={onClose} />
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
        <legend className="font-display font-semibold">เกิดอะไรขึ้น</legend>
        <div className="mt-2 grid gap-2">
          {REPORT_REASONS.map((r) => (
            <label key={r} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-4 py-2 transition-colors ${reason === r ? 'bg-butter/60' : 'bg-white'}`}>
              <input type="radio" name={`${id}-reason`} value={r} checked={reason === r} onChange={() => setReason(r)} className="size-4 accent-coral-deep" />
              <span className="text-ink">{r}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-note`} className="font-display font-semibold">
          เล่าเพิ่มเติม <span className="font-body text-sm font-normal text-ink-soft">(ไม่บังคับ)</span>
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
        ส่งรายงาน
      </Button>
    </form>
  )
}
