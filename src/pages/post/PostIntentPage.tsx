import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, CircleDashed, Eye, Send } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { KineticText, Reveal } from '@/components/motion'
import { MochiStage, View3D } from '@/components/three'
import { Button, PageHeader } from '@/components/ui'
import { useMyIntent, useRoom, useRooms } from '@/data/hooks'
import { tagsInText } from '@/data/tags'
import { useIsDesktop } from '@/lib/hooks'
import { spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Intent } from '@/lib/types'
import { IntentCard } from './IntentCard'
import { LikelyMatches } from './LikelyMatches'
import { MAX_ACTIVE, MyIntents } from './MyIntents'
import { PostSuccess } from './PostSuccess'
import { TagStep } from './TagPicker'
import { initialDraft, TEXT_MIN, toIntent, validate, type Draft } from './draft'
import { RoleStep, TemplateStep, TextStep, WhenWhereStep } from './steps'
import { TEMPLATE_BY_KEY } from './templates'

/** /app/post — compose a "กำลังหา" with a live preview and live matches. */
export default function PostIntentPage() {
  const me = useMoshi((s) => s.me)
  const activeCount = useMoshi((s) => s.myIntents.length)
  const postIntent = useMoshi((s) => s.postIntent)
  const desktop = useIsDesktop()
  const reduce = useReducedMotion()
  const [params] = useSearchParams()
  // started from a room's กำลังหา tab → the post lands in that room
  const rooms = useRooms()
  const roomId = useRoom(params.get('room') ?? undefined)?.id

  const [draft, setDraft] = useState<Draft>(() => initialDraft(me.province))
  const [tried, setTried] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const [posted, setPosted] = useState<Intent | null>(null)
  // live: a post the server turned down is rolled back (with a toast): back to the kept draft
  const stillThere = useMyIntent(posted?.id)
  useEffect(() => {
    if (posted && !stillThere) setPosted(null)
  }, [posted, stillThere])
  const patch = useCallback((p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p })), [])

  // the parser fills the main tag from the text until the user picks one
  const detected = useMemo(() => tagsInText(draft.text), [draft.text])
  const mainTag = draft.tagId || detected[0] || ''
  const guessed = !draft.tagId && !!mainTag
  const errors = validate(draft, mainTag)
  const shown = tried ? errors : {}

  const preview = useMemo(() => toIntent({ ...draft, roomId }, mainTag, rooms), [draft, roomId, mainTag, rooms])
  const deferred = useDeferredValue(preview)
  const forMatching = useMemo<Intent>(() => ({ ...deferred, id: 'draft', userId: me.id, postedMinutesAgo: 0, joinedBy: [] }), [deferred, me.id])

  const pickTemplate = (k: Draft['template']) => {
    const t = TEMPLATE_BY_KEY[k]
    patch({ template: k, role: t.role, mode: t.mode, when: t.when })
  }

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })

  const submit = () => {
    setTried(true)
    const first = errors.tag ? 'step-tag' : errors.text ? 'step-text' : errors.date ? 'step-when' : null
    if (first) {
      setShakeKey((n) => n + 1)
      scrollTo(first)
      return
    }
    setPosted(postIntent(preview))
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  const again = () => {
    setPosted(null)
    setTried(false)
    setDraft(initialDraft(me.province))
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <PageHeader title={<KineticText text="โพสต์กำลังหา" />} subtitle="บอกเพื่อนๆ ว่าอยากหาใครมาทำอะไรด้วยกัน" />

      <AnimatePresence mode="wait" initial={false}>
        {posted ? (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PostSuccess intent={posted} onAgain={again} />
          </motion.div>
        ) : (
          <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={spring.soft}>
            {/* mascot intro — the 3D box has no background on top of it */}
            <div className="flex items-center gap-2 sm:gap-3">
              <View3D className="size-28 shrink-0 sm:size-32" label="น้องโมชิชวนเขียนโพสต์">
                <MochiStage color="peach" expression="talk" zoom={0.85} />
              </View3D>
              <motion.div
                initial={{ opacity: 0, scale: 0.85, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ ...spring.bouncy, delay: 0.25 }}
                style={{ transformOrigin: 'left center' }}
                className="relative min-w-0 flex-1 rounded-3xl rounded-bl-md bg-white px-4 py-3 shadow-[var(--shadow-soft)]"
              >
                <span aria-hidden className="absolute bottom-3 -left-2 size-4 rotate-45 rounded-[4px] bg-white" />
                <p className="relative font-display text-lg leading-snug font-semibold">อยากหาเพื่อนมาทำอะไรดี?</p>
                <p className="relative text-sm text-ink-soft">
                  เลือกทีละขั้น ไม่ถึงนาทีก็เสร็จ {desktop ? 'ด้านขวา' : 'ด้านล่าง'}จะโชว์ว่าเพื่อนๆ เห็นโพสต์แบบไหน
                </p>
              </motion.div>
            </div>

            <MyIntents />

            <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_17rem] md:items-start lg:grid-cols-[minmax(0,1fr)_18rem]">
              <motion.div variants={stagger(0.06, 0.1)} initial="hidden" animate="show" className="flex min-w-0 flex-col gap-4 md:col-start-1 md:row-start-1">
                <TemplateStep draft={draft} onPick={pickTemplate} onUseExample={() => patch({ text: TEMPLATE_BY_KEY[draft.template].example })} />
                <RoleStep draft={draft} patch={patch} />
                <TagStep
                  value={mainTag}
                  guessed={guessed}
                  suggestions={TEMPLATE_BY_KEY[draft.template].tags}
                  onChange={(id) => patch({ tagId: id })}
                  error={shown.tag}
                  shakeKey={shakeKey}
                />
                <TextStep draft={draft} patch={patch} detected={detected} mainTag={mainTag} error={shown.text} shakeKey={shakeKey} />
                <WhenWhereStep draft={draft} patch={patch} error={shown.date} shakeKey={shakeKey} />
              </motion.div>

              <aside
                aria-label="ตัวอย่างโพสต์และคนที่น่าจะตรง"
                className="flex min-w-0 flex-col gap-4 md:sticky md:top-24 md:col-start-2 md:row-span-2 md:row-start-1 lg:top-6"
              >
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
                    <Eye size={16} aria-hidden /> เพื่อนๆ จะเห็นแบบนี้
                  </p>
                  <IntentCard intent={preview} me={me} />
                </div>
                <LikelyMatches intent={forMatching} ready={!!deferred.tagId} />
              </aside>

              {/* phones: after the preview · md+: under the steps, so the sticky preview stays short */}
              <Reveal className="card p-4 sm:p-5 md:col-start-1 md:row-start-2">
                <p className="mb-2 font-display text-lg font-semibold">พร้อมส่งสัญญาณหรือยัง?</p>
                <ul className="space-y-1.5" aria-label="สิ่งที่ต้องมีก่อนโพสต์">
                  <CheckItem ok={!!mainTag}>เลือกกิจกรรมหลักแล้ว</CheckItem>
                  <CheckItem ok={draft.text.trim().length >= TEXT_MIN}>เล่าอย่างน้อย {TEXT_MIN} ตัวอักษร</CheckItem>
                  {draft.when === 'dated' && <CheckItem ok={!!draft.date}>เลือกวันแล้ว</CheckItem>}
                </ul>
                {activeCount >= MAX_ACTIVE && (
                  <p className="mt-3 rounded-2xl bg-butter/40 p-2.5 text-xs text-ink">มีครบ {MAX_ACTIVE} ใบแล้ว ใบใหม่จะแทนที่ใบที่เก่าที่สุดนะ</p>
                )}
                <Button block size="lg" className="mt-4" icon={<Send size={19} />} onClick={submit}>
                  โพสต์เลย
                </Button>
              </Reveal>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function CheckItem({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-center gap-2 text-sm ${ok ? 'text-ink' : 'text-ink-soft'}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={ok ? 'ok' : 'todo'}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={spring.bouncy}
          className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-mint text-ink' : 'bg-cream-3 text-ink-soft'}`}
        >
          {ok ? <Check size={14} strokeWidth={3} /> : <CircleDashed size={14} strokeWidth={2.4} />}
        </motion.span>
      </AnimatePresence>
      <span>
        {children}
        <span className="sr-only">{ok ? ' (เรียบร้อย)' : ' (ยังไม่ครบ)'}</span>
      </span>
    </li>
  )
}
