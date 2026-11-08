import { AnimatePresence, motion } from 'motion/react'
import { Ban, Check, Flag, MoreHorizontal } from 'lucide-react'
import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
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
  // the last choice, said in their own words (older reports say 'อย่างอื่น')
  loc<Reason>({ value: 'อื่นๆ', label: L('อื่นๆ', 'Something else') }),
]
/** "อื่นๆ" needs a reason of its own, 2 to NOTE_MAX characters */
const OTHER = 'อื่นๆ'
const NOTE_MAX = 300

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
      className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 py-2 text-left font-semibold text-ink hover:bg-cream focus-visible:bg-cream [&>svg]:shrink-0"
    >
      {icon}
      <span className="min-w-0">{children}</span>
    </button>
  )
}

/** Where unblocking lives: โปรไฟล์ของเรา › ตั้งค่า › คนที่บล็อกไว้ */
function UnblockPath() {
  const steps = [t('โปรไฟล์ของเรา', 'My profile'), t('ตั้งค่า', 'Settings'), t('คนที่บล็อกไว้', 'Blocked people')]
  return (
    <span className="font-semibold text-ink">
      {steps.map((s, i) => (
        <Fragment key={s}>
          {i > 0 && (
            <>
              <span aria-hidden> › </span>
              <span className="sr-only">, </span>
            </>
          )}
          <span className="whitespace-nowrap">{s}</span>
        </Fragment>
      ))}
    </span>
  )
}

function Done({ title, text, onClose }: { title: string; text: ReactNode; onClose: () => void }) {
  const ok = useRef<HTMLButtonElement>(null)
  const textId = useId()
  // the button that led here is gone: the focus waits on โอเค, which also reads the message
  useEffect(() => {
    ok.current?.focus()
  }, [])
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
      <p id={textId} className="max-w-sm text-ink-soft">
        {text}
      </p>
      <Button ref={ok} block onClick={onClose} aria-describedby={textId} className="mt-2">
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
        text={
          <>
            {t(
              `จากนี้${user.name}จะไม่เห็นเรา และทักแชทหาเราไม่ได้ พักใจก่อนได้เลย ถ้าเปลี่ยนใจ ปลดบล็อกได้ทุกเมื่อที่ `,
              `From now on ${user.name} won't see you and can't message you. Take a breather. Changed your mind? You can unblock anytime in `,
            )}
            <UnblockPath />
            {t('', '.')}
          </>
        }
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
        <li>· {t('เขาทักแชทหาเราไม่ได้ และจะไม่มีการแจ้งเตือนว่าถูกบล็อก', "They can't message you, and they won't get a notification about it")}</li>
        <li>
          · {t('ปลดบล็อกได้ทุกเมื่อที่ ', 'You can unblock anytime in ')}
          <UnblockPath />
        </li>
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
  const other = reason === OTHER
  // "อื่นๆ" needs a few words of its own; for the other reasons the note is optional
  const short = other && note.trim().length < 2
  const canSend = reason !== null && !short
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
        if (!reason || !canSend) return
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
          {other ? (
            t('เล่าเหตุผลให้ทีมงานฟังหน่อย', 'Tell the team what happened')
          ) : (
            <>
              {t('เล่าเพิ่มเติม', 'Tell us more')} <span className="font-body text-sm font-normal text-ink-soft">{t('(ไม่บังคับ)', '(optional)')}</span>
            </>
          )}
        </label>
        <textarea
          id={`${id}-note`}
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          required={other}
          aria-invalid={short && note.length > 0 ? true : undefined}
          aria-describedby={`${id}-note-hint`}
          placeholder={other ? t('เช่น ส่งข้อความมาตื๊อซ้ำๆ หลังจากเราปฏิเสธไปแล้ว', 'e.g. keeps messaging me after I said no') : undefined}
          onChange={(e) => setNote(e.target.value)}
          className="mt-2 block w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-ink placeholder:text-ink-faint focus:border-lavender"
        />
        <p id={`${id}-note-hint`} className="mt-1 flex justify-between gap-3 text-xs text-ink-soft">
          <span>{short ? t('พิมพ์อย่างน้อย 2 ตัวอักษรนะ', 'Type at least 2 characters') : ''}</span>
          <span className="shrink-0 tabular-nums">
            {note.length}/{NOTE_MAX}
          </span>
        </p>
      </div>
      <Button type="submit" variant="dark" block icon={<Flag size={18} aria-hidden />} disabled={!canSend}>
        {t('ส่งรายงาน', 'Send report')}
      </Button>
    </form>
  )
}
