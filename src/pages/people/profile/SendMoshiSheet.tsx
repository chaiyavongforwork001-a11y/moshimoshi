import { motion } from 'motion/react'
import { PhoneCall, ShieldCheck, Sparkles } from 'lucide-react'
import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Avatar, Button, Sheet, SignalMeter } from '@/components/ui'
import { spring } from '@/lib/motion'
import type { MatchResult, User } from '@/lib/types'
import { toOpener } from '../lib'

const MAX = 200

export function SendMoshiSheet({
  open,
  onClose,
  user,
  match,
  onSend,
}: {
  open: boolean
  onClose: () => void
  user: User
  match: MatchResult
  onSend: (text: string) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={`ส่งโมชิหา${user.name}`} width={560}>
      {/* mounted fresh on every open, so the draft starts clean */}
      <MoshiForm user={user} match={match} onSend={onSend} />
    </Sheet>
  )
}

function MoshiForm({ user, match, onSend }: { user: User; match: MatchResult; onSend: (text: string) => void }) {
  const id = useId()
  const area = useRef<HTMLTextAreaElement>(null)
  const openers = useMemo(() => {
    const list = match.icebreakers.map((i) => toOpener(i, user.name))
    if (!list.length) list.push({ text: `โมชิโมชิ~ เห็นโปรไฟล์แล้วรู้สึกว่าน่าจะคุยกันสนุก ทักมาทำความรู้จักนะ`, from: 'ทักทายแบบง่ายๆ' })
    return list
  }, [match.icebreakers, user.name])
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<number | null>(null)
  // the button stays live while the sheet animates out: one moshi per open
  const sent = useRef(false)

  const pick = (i: number) => {
    setPicked(i)
    setText(openers[i].text.slice(0, MAX))
    requestAnimationFrame(() => {
      const el = area.current
      if (!el) return
      el.focus({ preventScroll: true })
      el.setSelectionRange(el.value.length, el.value.length)
    })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || sent.current) return
    sent.current = true
    onSend(t)
  }

  return (
    <form onSubmit={submit} className="space-y-5 pb-2">
      <div className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-[var(--shadow-soft)]">
        <Avatar color={user.color} size={52} face="talk" online={user.isOnline} />
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold">{user.name}</p>
          <SignalMeter level={match.level} size="xs" />
        </div>
        <p className="hidden max-w-[12rem] text-right text-xs text-ink-soft sm:block">ประโยคเปิดดีๆ ช่วยให้เขารับสายง่ายขึ้นนะ</p>
      </div>

      <fieldset>
        <legend className="flex items-center gap-1.5 font-display font-semibold">
          <Sparkles size={16} aria-hidden /> ไอเดียประโยคเปิด
        </legend>
        <p className="text-sm text-ink-soft">แตะเพื่อใส่ในช่องข้อความ แล้วแก้ให้เป็นสไตล์เราได้เลย</p>
        <ul className="mt-3 grid gap-2">
          {openers.map((o, i) => {
            const on = picked === i
            return (
              <li key={o.text}>
                <motion.button
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(i)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring.soft, delay: 0.08 + i * 0.06 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative block w-full rounded-2xl bg-white px-4 py-3 text-left shadow-[inset_0_0_0_1px_var(--color-line)]"
                >
                  {on && (
                    <motion.span
                      layoutId={`${id}-picked`}
                      transition={spring.bouncy}
                      className="absolute inset-0 rounded-2xl bg-butter/45 shadow-[inset_0_0_0_2px_var(--color-butter)]"
                    />
                  )}
                  <span className="relative block text-xs font-semibold text-ink-soft">{o.from}</span>
                  <span className="relative block text-[15px] leading-relaxed text-ink">{o.text}</span>
                </motion.button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <div>
        <label htmlFor={`${id}-text`} className="font-display font-semibold">
          ประโยคเปิดของเรา
        </label>
        <textarea
          ref={area}
          id={`${id}-text`}
          value={text}
          maxLength={MAX}
          rows={3}
          onChange={(e) => {
            setText(e.target.value)
            setPicked(null)
          }}
          placeholder="ทักแบบเป็นกันเอง เล่าว่าเห็นอะไรในโปรไฟล์แล้วอยากคุยด้วย"
          aria-describedby={`${id}-count`}
          className="mt-2 block w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-ink shadow-[inset_0_2px_4px_rgb(59_38_34/0.04)] placeholder:text-ink-faint focus:border-lavender"
        />
        <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-ink-soft">
          <span>สั้นๆ จริงใจ ดีที่สุด</span>
          <span id={`${id}-count`} className={text.length >= MAX ? 'font-semibold text-ink' : ''}>
            {text.length}/{MAX} ตัวอักษร
          </span>
        </div>
      </div>

      <p className="flex items-start gap-2.5 rounded-2xl bg-mint/30 p-3 text-sm text-ink">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden />
        เขาจะเห็นโปรไฟล์และประโยคเปิดของเรา ถ้ากดรับสายถึงจะเริ่มคุยกันได้ ไม่มีใครต้องฝืนใจ
      </p>

      <Button type="submit" block size="lg" icon={<PhoneCall size={20} aria-hidden />} disabled={!text.trim()}>
        ส่งโมชิ
      </Button>
    </form>
  )
}
