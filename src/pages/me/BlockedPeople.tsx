import { motion, useIsPresent } from 'motion/react'
import { Check, Eye, LockKeyhole, LockKeyholeOpen, MessageCircleHeart, RotateCcw, ShieldCheck } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { Avatar, Button, Sheet } from '@/components/ui'
import { useBlockedPeople, type BlockedPerson } from '@/data/blocked'
import { bangkokYear, dayOffset } from '@/data/live/time'
import { dateLocale, displayName, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import { Bone } from '@/pages/people/Skeleton'

// the question's buttons stay pinned to the bottom of the sheet, so a short phone never hides them
const FOOTER = 'sticky bottom-0 -mx-5 bg-cream/90 px-5 pt-3 pb-1 backdrop-blur'

type Step =
  | { kind: 'list' }
  /** index: where they were in the list, so the focus can come back near there */
  | { kind: 'ask'; person: BlockedPerson; index: number }
  | { kind: 'done'; person: BlockedPerson; index: number }

const nameOf = (p: BlockedPerson) => displayName(p.name?.trim() || 'เพื่อนใหม่')

const dialogOf = (el: HTMLElement | null) => el?.closest<HTMLElement>('[role="dialog"]') ?? null

/** "บล็อกไว้วันนี้", "บล็อกไว้เมื่อวาน", "บล็อกไว้เมื่อ 3 พ.ย." in Bangkok days; null when we don't know */
function blockedWhen(iso: string | undefined): string | null {
  const ms = iso ? Date.parse(iso) : NaN
  if (!iso || Number.isNaN(ms)) return null
  const ago = -dayOffset(iso)
  if (ago <= 0) return t('บล็อกไว้วันนี้', 'Blocked today')
  if (ago === 1) return t('บล็อกไว้เมื่อวาน', 'Blocked yesterday')
  const day = new Intl.DateTimeFormat(dateLocale(), {
    day: 'numeric',
    month: 'short',
    year: bangkokYear(ms) === bangkokYear() ? undefined : 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(ms)
  return t(`บล็อกไว้เมื่อ ${day}`, `Blocked on ${day}`)
}

/** Settings → คนที่บล็อกไว้: everyone I blocked, and a gentle way to unblock them. */
export function BlockedPeopleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t('คนที่บล็อกไว้', 'Blocked people')}>
      <BlockedBody onClose={onClose} />
    </Sheet>
  )
}

/** Mounted while the sheet is open: list → "ปลดบล็อกไหม?" → done, all inside the one sheet. */
function BlockedBody({ onClose }: { onClose: () => void }) {
  const { people, error, reload } = useBlockedPeople()
  const blocked = useMoshi((s) => s.blocked)
  const unblockUser = useMoshi((s) => s.unblockUser)
  const [step, setStep] = useState<Step>({ kind: 'list' })
  // unblocked from here: off the list at once (the server's list can lag a moment),
  // and back on it if the unblock didn't go through (the store puts the id back)
  const [unblocked, setUnblocked] = useState<string[]>([])
  const shown = useMemo(() => people?.filter((p) => !unblocked.includes(p.id) || blocked.includes(p.id)) ?? null, [people, unblocked, blocked])
  // the closing sheet still shows this for a moment: that copy takes no more taps
  const present = useIsPresent()
  const ids = useId()

  const root = useRef<HTMLDivElement>(null)
  const keep = useRef<HTMLButtonElement>(null)
  const ok = useRef<HTMLButtonElement>(null)
  const emptyTitle = useRef<HTMLHeadingElement>(null)
  const rowButtons = useRef(new Map<string, HTMLButtonElement>())

  // each step takes the focus into itself (the button that led there is gone)
  const focusNext = useRef<(() => void) | null>(null)
  useEffect(() => {
    const run = focusNext.current
    focusNext.current = null
    run?.()
  }, [step])
  const go = (next: Step, focus: () => void) => {
    focusNext.current = focus
    setStep(next)
  }

  // "ปลดบล็อกเลย" can open right where a row's "ปลดบล็อก" was: the rest of a double tap mustn't count
  const lastTap = useRef(0)
  const tooSoon = () => {
    const now = performance.now()
    const soon = now - lastTap.current < 500
    lastTap.current = now
    return soon
  }

  const ask = (person: BlockedPerson, index: number) => {
    lastTap.current = performance.now()
    go({ kind: 'ask', person, index }, () => keep.current?.focus())
  }
  const cancel = (person: BlockedPerson) => go({ kind: 'list' }, () => (rowButtons.current.get(person.id) ?? dialogOf(root.current))?.focus())
  const confirm = (person: BlockedPerson, index: number) => {
    if (tooSoon()) return
    setUnblocked((list) => (list.includes(person.id) ? list : [...list, person.id]))
    unblockUser(person.id)
    go({ kind: 'done', person, index }, () => ok.current?.focus())
  }
  // back to the list: the focus goes to whoever took their place (or the empty state)
  const backToList = (index: number) => {
    if (tooSoon()) return
    const next = shown && shown.length ? shown[Math.min(index, shown.length - 1)] : undefined
    go({ kind: 'list' }, () => ((next && rowButtons.current.get(next.id)) ?? emptyTitle.current ?? dialogOf(root.current))?.focus())
  }
  const retryUnblock = (person: BlockedPerson) => {
    if (tooSoon()) return
    unblockUser(person.id)
  }
  const retryLoad = () => {
    // the retry button is about to go away: keep the focus inside the sheet
    dialogOf(root.current)?.focus()
    reload()
  }

  // one short line for screen readers whenever the list changes state
  const count = shown?.length ?? 0
  const status =
    step.kind !== 'list'
      ? ''
      : shown === null
        ? error
          ? t('โหลดรายชื่อไม่สำเร็จ', "Couldn't load the list")
          : t('กำลังโหลดรายชื่อ…', 'Loading the list…')
        : count === 0
          ? t('ยังไม่ได้บล็อกใครเลย', "You haven't blocked anyone")
          : t(`บล็อกไว้ ${count} คน`, count === 1 ? '1 person blocked' : `${count} people blocked`)

  return (
    <div ref={root} inert={!present} className="pb-3">
      <p role="status" className="sr-only">
        {status}
      </p>
      {step.kind === 'ask' ? (
        <Ask person={step.person} ids={ids} keepRef={keep} onConfirm={() => confirm(step.person, step.index)} onCancel={() => cancel(step.person)} />
      ) : step.kind === 'done' ? (
        <Done
          person={step.person}
          // the store puts the id back when the unblock fails
          failed={blocked.includes(step.person.id)}
          id={`${ids}-done`}
          okRef={ok}
          onOk={() => backToList(step.index)}
          onRetry={() => retryUnblock(step.person)}
        />
      ) : shown === null ? (
        error ? (
          <LoadError onRetry={retryLoad} />
        ) : (
          <Loading />
        )
      ) : shown.length === 0 ? (
        <Empty titleRef={emptyTitle} onClose={onClose} />
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="space-y-3">
          <p className="flex items-start gap-2.5 rounded-2xl bg-lavender/25 p-3 text-sm text-ink">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden />
            {t(
              'คนในรายชื่อนี้มองไม่เห็นโปรไฟล์และโพสต์ของเรา และทักแชทหาเราไม่ได้ โดยไม่มีการแจ้งเตือนให้เขารู้',
              "People here can't see your profile or posts and can't message you. They're never notified",
            )}
          </p>
          <ul aria-label={t('คนที่บล็อกไว้', 'Blocked people')} className="space-y-2.5">
            {shown.map((p, i) => (
              <PersonRow
                key={p.id}
                person={p}
                buttonRef={(el) => {
                  if (el) rowButtons.current.set(p.id, el)
                  else rowButtons.current.delete(p.id)
                }}
                onUnblock={() => ask(p, i)}
              />
            ))}
          </ul>
          {error && <Stale onRetry={retryLoad} />}
        </motion.div>
      )}
    </div>
  )
}

function PersonRow({ person, buttonRef, onUnblock }: { person: BlockedPerson; buttonRef: Ref<HTMLButtonElement>; onUnblock: () => void }) {
  const name = nameOf(person)
  const when = blockedWhen(person.blockedAt)
  // the name takes the spare room; on the narrowest phones the button drops to its own full-width line
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-3">
      <Avatar color={person.color} size={44} face={person.face ?? 'smile'} />
      <span className="min-w-0 flex-[100_1_7rem]">
        <span className="block truncate font-display font-semibold text-ink">{name}</span>
        {when && <span className="block text-xs text-ink-soft">{when}</span>}
      </span>
      <Button ref={buttonRef} variant="soft" className="flex-[1_0_auto]" aria-label={t(`ปลดบล็อก${name}`, `Unblock ${name}`)} onClick={onUnblock}>
        {t('ปลดบล็อก', 'Unblock')}
      </Button>
    </li>
  )
}

function Point({ icon, tint, children }: { icon: ReactNode; tint: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
      <span className="min-w-0 pt-1 text-sm text-ink">{children}</span>
    </li>
  )
}

/** Asks first, in plain words, what unblocking changes. */
function Ask({
  person,
  ids,
  keepRef,
  onConfirm,
  onCancel,
}: {
  person: BlockedPerson
  ids: string
  keepRef: Ref<HTMLButtonElement>
  onConfirm: () => void
  onCancel: () => void
}) {
  const name = nameOf(person)
  const askId = `${ids}-ask`
  const whatId = `${ids}-what`
  return (
    <div role="group" aria-labelledby={askId}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="space-y-3">
        <div className="flex items-center gap-3 rounded-3xl bg-white p-3">
          <Avatar color={person.color} size={52} face={person.face ?? 'smile'} />
          <h3 id={askId} className="min-w-0 font-display text-lg font-semibold text-ink">
            {t(`ปลดบล็อก${name}ไหม?`, `Unblock ${name}?`)}
          </h3>
        </div>
        <ul id={whatId} className="space-y-3 rounded-3xl bg-white p-4">
          <Point icon={<Eye size={17} aria-hidden />} tint="bg-sky/45">
            {t(`${name}จะกลับมาเห็นโปรไฟล์และโพสต์ของเราได้ และเราก็จะเห็นของเขาด้วย`, `${name} will see your profile and posts again, and you'll see theirs`)}
          </Point>
          <Point icon={<MessageCircleHeart size={17} aria-hidden />} tint="bg-peach/50">
            {t(
              'เขาทักแชทหาเราได้อีกครั้ง ตามที่ตั้งไว้ใน "ใครทักแชทหาเราได้บ้าง" และเราเลือกตอบรับเองได้เสมอ',
              'They can say hi to you again, within your "Who can say hi to me" setting, and you still choose whether to accept',
            )}
          </Point>
          <Point icon={<LockKeyhole size={17} aria-hidden />} tint="bg-butter/50">
            {t('ถ้าเคยคุยแชทกันไว้ รูปในแชทนั้นจะยังล็อกอยู่ จนกว่าทั้งคู่จะกดยินยอมกันใหม่', 'If you chatted before, photos in that chat stay locked until you both agree again')}
          </Point>
        </ul>
        <p className="px-1 text-xs text-ink-soft">
          {t('เขาจะไม่ได้รับการแจ้งเตือน และถ้าไม่สบายใจอีก บล็อกใหม่ได้ทุกเมื่อจากโปรไฟล์ของเขา', "They won't be notified, and if anything feels off again you can block them anytime from their profile")}
        </p>
      </motion.div>
      <div className={`mt-3 ${FOOTER}`}>
        <div className="flex flex-row-reverse gap-2">
          <Button variant="dark" className="flex-1" icon={<LockKeyholeOpen size={18} aria-hidden />} aria-describedby={askId} onClick={onConfirm}>
            {t('ปลดบล็อกเลย', 'Unblock')}
          </Button>
          {/* the safe answer gets the focus; iOS VoiceOver skips group names, so it carries the question and what happens */}
          <Button ref={keepRef} variant="ghost" aria-describedby={`${askId} ${whatId}`} onClick={onCancel}>
            {t('ยังก่อน', 'Not now')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** A short "done" (or, if the unblock didn't go through, a way to try again). */
function Done({
  person,
  failed,
  id,
  okRef,
  onOk,
  onRetry,
}: {
  person: BlockedPerson
  failed: boolean
  id: string
  okRef: Ref<HTMLButtonElement>
  onOk: () => void
  onRetry: () => void
}) {
  const name = nameOf(person)
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft} className="flex flex-col items-center gap-3 pt-2 text-center">
      <div id={id} role="status" className="flex flex-col items-center gap-3">
        <span className="relative">
          <Avatar color={person.color} size={84} face={failed ? 'sleepy' : 'happy'} />
          {!failed && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...spring.bouncy, delay: 0.15 }}
              className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-success text-white ring-4 ring-cream"
            >
              <Check size={16} strokeWidth={3} aria-hidden />
            </motion.span>
          )}
        </span>
        <h3 className="font-display text-xl font-semibold">{failed ? t('ยังปลดบล็อกไม่สำเร็จ', "Couldn't unblock yet") : t(`ปลดบล็อก${name}แล้ว`, `${name} is unblocked`)}</h3>
        <p className="max-w-sm text-ink-soft">
          {failed
            ? t('สัญญาณอาจสะดุดนิดหน่อย ลองอีกครั้งนะ', 'The connection may have hiccuped. Give it another go')
            : t('ตอนนี้เห็นโปรไฟล์และโพสต์ของกันได้อีกครั้ง ถ้าวันไหนไม่สบายใจ บล็อกใหม่ได้เสมอนะ', "You can see each other's profiles and posts again. If anything ever feels off, you can always block again")}
        </p>
      </div>
      {/* one button for both: the focus stays put when it turns from ลองอีกครั้ง into โอเค */}
      <Button ref={okRef} block className="mt-1" aria-describedby={id} icon={failed ? <RotateCcw size={18} aria-hidden /> : undefined} onClick={failed ? onRetry : onOk}>
        {failed ? t('ลองอีกครั้ง', 'Try again') : t('โอเค', 'OK')}
      </Button>
      {failed && (
        <Button variant="ghost" block onClick={onOk}>
          {t('กลับไปที่รายชื่อ', 'Back to the list')}
        </Button>
      )}
    </motion.div>
  )
}

function Loading() {
  return (
    <div aria-hidden className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex items-center gap-3 rounded-3xl bg-white p-3 ${i ? 'opacity-70' : ''}`}>
          <Bone className="size-11 shrink-0" />
          <span className="min-w-0 flex-1 space-y-2">
            <Bone className="h-4 w-2/5" />
            <Bone className="h-3 w-1/3" />
          </span>
          <Bone className="h-12 w-24 shrink-0" />
        </div>
      ))}
    </div>
  )
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-5 py-7 text-center">
      <Avatar color="sky" size={72} face="sleepy" />
      <h3 className="font-display text-lg font-semibold">{t('โหลดรายชื่อไม่สำเร็จ', "Couldn't load the list")}</h3>
      <p className="max-w-xs text-sm text-ink-soft">{t('สัญญาณอาจสะดุดนิดหน่อย ลองอีกครั้งนะ', 'The connection may have hiccuped. Give it another go')}</p>
      <Button variant="secondary" icon={<RotateCcw size={17} aria-hidden />} onClick={onRetry}>
        {t('ลองอีกครั้ง', 'Try again')}
      </Button>
    </div>
  )
}

/** The list is showing, but the latest load failed. */
function Stale({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-butter/30 p-3 text-sm text-ink">
      <span className="min-w-0 flex-[1_1_10rem]">{t('รายชื่ออาจยังไม่อัปเดต', 'This list may be out of date')}</span>
      <Button variant="secondary" icon={<RotateCcw size={17} aria-hidden />} onClick={onRetry}>
        {t('โหลดใหม่', 'Reload')}
      </Button>
    </div>
  )
}

function Empty({ titleRef, onClose }: { titleRef: Ref<HTMLHeadingElement>; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft} className="flex flex-col items-center gap-3 px-1 pt-2 text-center">
      <Avatar color="mint" size={88} face="happy" />
      <h3 ref={titleRef} tabIndex={-1} className="font-display text-xl font-semibold">
        {t('ยังไม่ได้บล็อกใครเลย', "You haven't blocked anyone")}
      </h3>
      <p className="max-w-sm text-ink-soft">
        {t(
          'ทุกอย่างสงบดี ถ้าวันไหนมีใครทำให้ไม่สบายใจ บล็อกได้จากปุ่มตัวเลือกเพิ่มเติม (⋯) บนโปรไฟล์ของเขา',
          'All calm here. If anyone ever makes you uneasy, you can block them from the More options (⋯) button on their profile',
        )}
      </p>
      <Button block className="mt-1" onClick={onClose}>
        {t('โอเค', 'OK')}
      </Button>
    </motion.div>
  )
}
