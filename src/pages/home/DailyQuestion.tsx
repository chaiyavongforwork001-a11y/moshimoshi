import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, Lock, MessageCircleMore, Pencil, Send, Sparkles } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Avatar, Button, ButtonLink, IconButton } from '@/components/ui'
import { useDailyQuestion, useDataReady, usePeople, usePerson, useRoom } from '@/data/hooks'
import { t } from '@/lib/i18n'
import { spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { DailyAnswer, DailyQuestion as Question, User } from '@/lib/types'
import { AnimatedNumber, Block } from './Block'
import { roomLabel } from './greeting'
import { EmptyNote, SoftSkeleton } from './Soft'

const MAX = 80

/** "คำถามวันนี้" — answer first, then friends' answers open up like a reveal. */
export function DailyQuestion({ className = '' }: { className?: string }) {
  const ready = useDataReady()
  const q = useDailyQuestion('lobby')
  return (
    <Block id="home-question" title={t('คำถามวันนี้', "Today's question")} icon={<MessageCircleMore size={18} strokeWidth={2.4} />} className={className}>
      {!ready ? (
        <SoftSkeleton rows={1} />
      ) : q ? (
        <QuestionCard key={q.id} q={q} />
      ) : (
        <EmptyNote
          face="sleepy"
          color="butter"
          title={t('คำถามวันนี้ยังมาไม่ถึงนะ', "Today's question isn't here yet")}
          sub={t(
            'พี่โมชิกำลังคิดคำถามใหม่อยู่ แวะมาดูอีกทีนะ ระหว่างนี้ไปทักทายในห้องนั่งเล่นก่อนได้',
            'Our Mochi hosts are cooking up a new one. Check back soon, and say hi in The Lounge meanwhile',
          )}
        >
          <ButtonLink to="/app/rooms" variant="secondary" className="w-full sm:w-auto">
            {t('ไปดูห้องต่างๆ', 'Browse rooms')}
          </ButtonLink>
        </EmptyNote>
      )}
    </Block>
  )
}

/** Friends' answers that can be shown: not mine (shown separately), and the person still exists. */
function othersAnswers(q: Question, me: User, people: User[]): DailyAnswer[] {
  const ids = new Set(people.map((u) => u.id))
  return q.answers.filter((a) => a.userId !== me.id && ids.has(a.userId))
}

function QuestionCard({ q }: { q: Question }) {
  const me = useMoshi((s) => s.me)
  const people = usePeople()
  const mine = useMoshi((s) => s.answers[q.id])
  const answerQuestion = useMoshi((s) => s.answerQuestion)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(mine ?? '')
  const inputId = useId()
  const answered = !!mine && !editing
  const room = useRoom(q.roomId)
  const answers = useMemo(() => othersAnswers(q, me, people), [q, me, people])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    answerQuestion(q.id, text)
    setEditing(false)
  }

  return (
    <div className="card relative overflow-hidden p-4 sm:p-5">
      <span aria-hidden className="pointer-events-none absolute -top-16 -left-10 size-40 rounded-full bg-butter/50 blur-2xl" />
      <p className="relative text-xs font-semibold text-ink-soft">
        {t(`จาก${room ? roomLabel(room.name) : 'ห้องนั่งเล่น'}`, `From ${room ? room.name : 'The Lounge'}`)}
      </p>
      <p className="relative mt-1 font-display text-xl leading-normal font-semibold text-ink sm:text-[22px]">{q.text}</p>

      <AnimatePresence mode="wait" initial={false}>
        {answered ? (
          <motion.div key="mine" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={spring.bouncy}>
            <div className="relative mt-4 flex items-start gap-3 rounded-3xl rounded-tl-md bg-butter/45 p-3 pr-2">
              <Avatar color={me.color} size={36} face="happy" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-soft">{t('คำตอบของเรา', 'Your answer')}</p>
                <p className="text-ink">{mine}</p>
              </div>
              <IconButton
                label={t('แก้คำตอบ', 'Edit answer')}
                variant="ghost"
                onClick={() => {
                  setDraft(mine ?? '')
                  setEditing(true)
                }}
              >
                <Pencil size={17} />
              </IconButton>
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative mt-4">
            <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink">
              {t('คำตอบของเรา', 'Your answer')}
            </label>
            <div className="flex items-end gap-2 rounded-3xl border border-line bg-cream p-2 pl-4 focus-within:border-lavender focus-within:bg-white focus-within:ring-3 focus-within:ring-lavender/40">
              <textarea
                id={inputId}
                value={draft}
                maxLength={MAX}
                rows={2}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('เล่าสั้นๆ ก็ได้นะ เช่น ได้กินข้าวร้านโปรด', 'Short is fine, e.g. lunch at my favorite spot')}
                className="min-h-12 flex-1 resize-none bg-transparent py-1.5 text-ink outline-none placeholder:text-ink-faint"
              />
              <Button type="submit" size="md" disabled={!draft.trim()} icon={<Send size={17} />} aria-label={t('ส่งคำตอบ', 'Send answer')} className="shrink-0">
                <span className="hidden sm:inline">{t('ตอบ', 'Answer')}</span>
              </Button>
            </div>
            <div className="mt-1 flex items-center justify-end gap-3">
              {editing && (
                <button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-full px-3 text-sm font-semibold text-ink-soft hover:text-ink">
                  {t('ยกเลิก', 'Cancel')}
                </button>
              )}
              <p className="text-xs text-ink-soft" aria-live="polite">
                {draft.length}/{MAX}
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="relative mt-3">
        {mine ? <Answers qid={q.id} answers={answers} /> : <LockedAnswers count={answers.length} />}
      </div>

      <Link
        to={`/app/rooms/${q.roomId}`}
        className="relative mt-3 inline-flex min-h-11 items-center gap-1 rounded-full px-1 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        {t(`ไปคุยต่อใน${room ? roomLabel(room.name) : 'ห้องนั่งเล่น'}`, `Keep chatting in ${room ? room.name : 'The Lounge'}`)} <ChevronRight size={16} aria-hidden />
      </Link>
    </div>
  )
}

/** Blurred teaser so it's clear something is waiting after you answer. */
function LockedAnswers({ count }: { count: number }) {
  if (!count)
    return (
      <p className="rounded-2xl bg-cream p-3 text-sm text-ink-soft">
        {t('ยังไม่มีใครตอบเลย ตอบเป็นคนแรกได้นะ เพื่อนๆ จะได้เห็นคำตอบของเรา', 'No answers yet. Be the first, so friends can see yours')}
      </p>
    )
  return (
    <div className="relative">
      <div aria-hidden className="space-y-2 blur-[6px] select-none">
        {Array.from({ length: Math.min(count, 2) }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
            <span className="size-9 rounded-full bg-peach/60" />
            <span className="h-3 flex-1 rounded-full bg-ink/10" />
          </div>
        ))}
      </div>
      <p className="absolute inset-0 flex items-center justify-center gap-2 text-center text-sm font-semibold text-ink">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-[var(--shadow-soft)]">
          <Lock size={15} aria-hidden />
          {t(
            `ตอบก่อน แล้วจะเห็นคำตอบของเพื่อนๆ อีก ${count} คน`,
            `Answer first to see ${count === 1 ? "a friend's answer" : `${count} friends' answers`}`,
          )}
        </span>
      </p>
    </div>
  )
}

function Answers({ qid, answers }: { qid: string; answers: DailyAnswer[] }) {
  if (!answers.length)
    return (
      <p className="rounded-2xl bg-cream p-3 text-sm text-ink-soft">
        {t('เราตอบเป็นคนแรกเลย! เพื่อนๆ มาตอบเมื่อไหร่ จะขึ้นให้เห็นตรงนี้นะ', "You're the first to answer! Friends' answers will pop up here")}
      </p>
    )
  return (
    <motion.ul variants={stagger(0.09, 0.15)} initial="hidden" animate="show" className="space-y-2">
      {answers.map((a) => (
        <AnswerRow key={a.userId} id={`${qid}:${a.userId}`} answer={a} />
      ))}
    </motion.ul>
  )
}

function AnswerRow({ id, answer }: { id: string; answer: DailyAnswer }) {
  const on = useMoshi((s) => s.sames.includes(id))
  const toggleSame = useMoshi((s) => s.toggleSame)
  const u = usePerson(answer.userId)
  if (!u) return null
  return (
    <motion.li
      variants={{ hidden: { opacity: 0, y: 14, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: spring.soft } }}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-cream p-3"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar color={u.color} size={36} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink-soft">{u.name}</p>
          <p className="text-ink">{answer.text}</p>
        </div>
      </div>
      <motion.button
        type="button"
        aria-pressed={on}
        aria-label={t(`เหมือนกัน กับคำตอบของ ${u.name}`, `Same as ${u.name}'s answer`)}
        onClick={() => toggleSame(id)}
        whileTap={{ scale: 0.88 }}
        animate={{ scale: on ? [1, 1.12, 1] : 1 }}
        transition={{ ...spring.bouncy, scale: { duration: 0.35 } }}
        className={`ml-auto inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 font-display text-sm font-semibold text-ink transition-colors ${
          on ? 'bg-butter shadow-[inset_0_-3px_0_rgb(59_38_34/0.12)]' : 'border border-line bg-white hover:bg-cream-2'
        }`}
      >
        <Sparkles size={15} strokeWidth={2.4} aria-hidden />
        {t('เหมือนกัน!', 'Same!')}
        <AnimatedNumber value={answer.sameCount + (on ? 1 : 0)} className="min-w-4 justify-center" />
      </motion.button>
    </motion.li>
  )
}
