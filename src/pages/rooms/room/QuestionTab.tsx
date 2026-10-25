import { AnimatePresence, motion } from 'motion/react'
import { Lock, MessageCircleQuestion, Pencil, Quote, Send } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Avatar, Button } from '@/components/ui'
import { useDailyQuestion, usePeople, useRoom } from '@/data/hooks'
import { MOCHI } from '@/lib/colors'
import { fadeUp, spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Room } from '@/lib/types'
import { useIsMine } from '@/pages/people/lib'
import { SameToggle } from '../bits'

export function QuestionTab({ room }: { room: Room }) {
  const q = useDailyQuestion(room.id)
  const fromRoom = useRoom(q?.roomId)
  const people = usePeople()
  const isMine = useIsMine()
  const answers = useMoshi((s) => s.answers)
  const answerQuestion = useMoshi((s) => s.answerQuestion)
  const sames = useMoshi((s) => s.sames)
  const toggleSame = useMoshi((s) => s.toggleSame)
  const me = useMoshi((s) => s.me)
  const [editing, setEditing] = useState(false)
  const inputId = useId()
  const mine = q ? answers[q.id] : undefined
  const [draft, setDraft] = useState(mine ?? '')
  // friends' answers only (in live mode my own row comes back from the server too)
  const theirs = useMemo(() => {
    const byId = new Map(people.map((u) => [u.id, u]))
    return (q?.answers ?? []).flatMap((a) => {
      const u = isMine(a.userId) ? undefined : byId.get(a.userId)
      return u ? [{ a, u }] : []
    })
  }, [q, people, isMine])
  if (!q) return <NoQuestion room={room} />

  const borrowed = q.roomId !== room.id
  const revealed = !!mine
  const p = MOCHI[room.color]
  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const t = draft.trim()
    if (!t) return
    answerQuestion(q.id, t)
    setEditing(false)
  }

  return (
    <section aria-labelledby="dq-title" className="space-y-4">
      {/* the question */}
      <div
        className="relative overflow-hidden rounded-[2rem] border border-white p-5 shadow-[var(--shadow-soft)] sm:p-6"
        style={{ background: `linear-gradient(150deg, #fff 0%, ${p.light} 70%, ${p.base} 140%)` }}
      >
        <Quote aria-hidden size={96} strokeWidth={1.4} className="absolute -top-3 -right-2 rotate-180 text-ink/5" />
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-ink">
          <MessageCircleQuestion size={14} strokeWidth={2.4} aria-hidden />
          คำถามวันนี้{borrowed && ` · จาก${fromRoom?.name ?? 'ห้องนั่งเล่น'}`}
        </p>
        <h2 id="dq-title" className="relative mt-3 font-display text-xl leading-snug font-semibold sm:text-2xl">
          {q.text}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">ตอบแล้ว {theirs.length + (mine ? 1 : 0)} คน · ไม่มีคำตอบไหนผิด เล่าแบบสบายๆ ได้เลย</p>

        <AnimatePresence mode="wait" initial={false}>
          {!revealed || editing ? (
            <motion.form
              key="form"
              onSubmit={submit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={spring.soft}
              className="mt-4"
            >
              <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink">
                คำตอบของเรา
              </label>
              <textarea
                id={inputId}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    submit()
                  }
                }}
                rows={2}
                maxLength={200}
                placeholder="เล่าสั้นๆ ก็ได้นะ…"
                className="block w-full resize-none rounded-3xl border border-line bg-white/90 px-4 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus-visible:ring-3 focus-visible:ring-lavender"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-ink-soft">{revealed ? 'แก้ได้ตลอดนะ' : 'ตอบแล้วจะได้เห็นคำตอบของเพื่อนๆ'}</span>
                <div className="flex gap-2">
                  {editing && (
                    <Button variant="ghost" onClick={() => setEditing(false)}>
                      ยกเลิก
                    </Button>
                  )}
                  <Button type="submit" disabled={!draft.trim()} icon={<Send size={16} strokeWidth={2.4} />}>
                    ส่งคำตอบ
                  </Button>
                </div>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="mine"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={spring.bouncy}
              className="mt-4 flex items-start gap-3 rounded-3xl bg-white/90 p-4"
            >
              <Avatar color={me.color} size={40} face="happy" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-soft">คำตอบของเรา</p>
                <p className="text-[15px] text-ink">{mine}</p>
              </div>
              <Button
                variant="ghost"
                icon={<Pencil size={15} strokeWidth={2.4} />}
                onClick={() => {
                  setDraft(mine ?? '')
                  setEditing(true)
                }}
              >
                แก้
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* friends' answers: blurred until I answer, then revealed one by one */}
      <div className="relative">
        <h3 className="mb-3 font-display text-lg font-semibold">เพื่อนๆ ตอบว่า…</h3>
        <motion.ul
          key={revealed ? 'open' : 'closed'}
          variants={stagger(0.08, 0.05)}
          initial="hidden"
          animate="show"
          className="grid gap-3 sm:grid-cols-2"
          aria-hidden={!revealed}
        >
          {theirs.map(({ a, u }) => {
            const sameId = `${q.id}:${a.userId}`
            const on = sames.includes(sameId)
            return (
              <motion.li
                key={a.userId}
                variants={
                  revealed
                    ? { hidden: { opacity: 0, y: 14, filter: 'blur(8px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: spring.soft } }
                    : fadeUp
                }
                className="card flex flex-col gap-3 p-4"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar color={u.color} size={36} online={u.isOnline} />
                  {revealed ? (
                    <Link to={`/app/people/${u.id}`} className="font-display font-semibold text-ink underline-offset-4 hover:underline">
                      {u.name}
                    </Link>
                  ) : (
                    <span className="h-3 w-16 rounded-full bg-ink/10" />
                  )}
                </div>
                <p className={`text-[15px] text-ink ${revealed ? '' : 'blur-[6px] select-none'}`}>{a.text}</p>
                {revealed && (
                  <SameToggle on={on} onToggle={() => toggleSame(sameId)} count={a.sameCount + (on ? 1 : 0)} className="self-start" />
                )}
              </motion.li>
            )
          })}
        </motion.ul>
        {theirs.length === 0 && (
          <p className="rounded-3xl bg-white/70 p-5 text-center text-ink-soft">
            {revealed ? 'ยังไม่มีเพื่อนตอบเลย เราเป็นคนแรกนะ พอมีคนตอบจะเห็นตรงนี้' : 'ยังไม่มีใครตอบเลย ตอบเป็นคนแรกไหม'}
          </p>
        )}
        {!revealed && theirs.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-10 bottom-0 flex items-center justify-center">
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-ink">
              <Lock size={15} strokeWidth={2.4} aria-hidden />
              ตอบก่อน แล้วมาดูกันว่าเพื่อนๆ ตอบว่าอะไร
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

/** No question set for today (live mode, nothing in the lobby either). */
function NoQuestion({ room }: { room: Room }) {
  const p = MOCHI[room.color]
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl" style={{ background: p.light }}>
        <MessageCircleQuestion size={28} strokeWidth={2.2} color={p.ink} aria-hidden />
      </span>
      <h2 className="mt-3 font-display text-lg font-semibold">วันนี้ยังไม่มีคำถามนะ</h2>
      <p className="mt-1 max-w-xs text-ink-soft">พี่โมชิกำลังคิดคำถามสนุกๆ อยู่ แวะมาใหม่พรุ่งนี้ หรือไปทักทายเพื่อนในแชทห้องก่อนก็ได้</p>
    </div>
  )
}
