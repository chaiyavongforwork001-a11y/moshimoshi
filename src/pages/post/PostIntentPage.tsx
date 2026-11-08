import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, CircleDashed, Eye, Pencil, Send, X } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { KineticText, Reveal } from '@/components/motion'
import { MochiStage, View3D } from '@/components/three'
import { Button, leaveField, PageHeader } from '@/components/ui'
import { useMyIntent, useRoom, useRooms } from '@/data/hooks'
import { tagsInText } from '@/data/tags'
import { useIsDesktop } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { spring, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Intent } from '@/lib/types'
import { IntentCard } from './IntentCard'
import { LikelyMatches } from './LikelyMatches'
import { MAX_ACTIVE, MyIntents } from './MyIntents'
import { PostSuccess } from './PostSuccess'
import { TagStep } from './TagPicker'
import { draftFromIntent, initialDraft, TEXT_MIN, toIntent, validate, type Draft } from './draft'
import { RoleStep, TemplateStep, TextStep, WhenWhereStep } from './steps'
import { TEMPLATE_BY_KEY } from './templates'

/** /app/post — compose a โพสต์หาเพื่อน with a live preview and live matches; ?edit=<id> edits one of mine. */
export default function PostIntentPage() {
  const me = useMoshi((s) => s.me)
  const activeCount = useMoshi((s) => s.myIntents.length)
  const postIntent = useMoshi((s) => s.postIntent)
  const updateIntent = useMoshi((s) => s.updateIntent)
  const notify = useMoshi((s) => s.notify)
  const desktop = useIsDesktop()
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editing = useMyIntent(params.get('edit') ?? undefined)
  const textRef = useRef<HTMLTextAreaElement>(null)
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
  // touching "when" lets go of a saved time label (see Draft.keptWhenLabel)
  const patchWhen = useCallback((p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p, keptWhenLabel: undefined })), [])

  // ?edit=<id>: that post goes into the composer (once per post)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  if (editing && loadedFor !== editing.id) {
    setLoadedFor(editing.id)
    setDraft(draftFromIntent(editing, me.province))
    setTried(false)
    setPosted(null)
  }
  if (!editing && loadedFor) {
    setLoadedFor(null)
    setDraft(initialDraft(me.province))
    setTried(false)
  }

  // the parser fills the main tag from the text until the user picks one
  const detected = useMemo(() => tagsInText(draft.text), [draft.text])
  const mainTag = draft.tagId || detected[0] || ''
  const guessed = !draft.tagId && !!mainTag
  const errors = validate(draft, mainTag)
  const shown = tried ? errors : {}

  const preview = useMemo(() => toIntent({ ...draft, roomId: roomId ?? draft.roomId }, mainTag, rooms), [draft, roomId, mainTag, rooms])
  const deferred = useDeferredValue(preview)
  const forMatching = useMemo<Intent>(() => ({ ...deferred, id: 'draft', userId: me.id, postedMinutesAgo: 0, joinedBy: [] }), [deferred, me.id])

  const pickTemplate = (k: Draft['template']) => {
    const tpl = TEMPLATE_BY_KEY[k]
    patch({ template: k, role: tpl.role, mode: tpl.mode, when: tpl.when })
  }

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })

  // "ใช้ข้อความนี้ แล้วแก้ต่อ": the example lands in the text box, ready to edit
  const takeExample = () => {
    const text = TEMPLATE_BY_KEY[draft.template].example
    patch({ text })
    requestAnimationFrame(() => {
      const el = textRef.current
      if (!el) return
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
      el.setSelectionRange(text.length, text.length)
    })
  }

  const stopEditing = () => {
    navigate('/app/post', { replace: true })
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  const submit = () => {
    setTried(true)
    const first = errors.text ? 'step-text' : errors.tag ? 'step-tag' : errors.date ? 'step-when' : null
    if (first) {
      setShakeKey((n) => n + 1)
      scrollTo(first)
      return
    }
    if (editing) {
      updateIntent(editing.id, preview)
      notify(t('อัปเดตโพสต์แล้ว เพื่อนๆ จะเห็นเวอร์ชันใหม่นะ', "Post updated. Everyone sees the new version"))
      stopEditing()
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
      <PageHeader
        title={<KineticText key={editing ? 'edit' : 'new'} text={editing ? t('แก้ไขโพสต์หาเพื่อน', 'Edit your post') : t('โพสต์หาเพื่อน', 'Find friends')} />}
        subtitle={
          editing
            ? t('แก้แล้วกด “อัปเดตโพสต์” เพื่อนๆ จะเห็นเวอร์ชันใหม่ทันที', 'Make your changes, then tap “Update post”. Everyone sees the new version right away')
            : t('บอกว่าอยากหาเพื่อนมาทำอะไร คนที่สนใจกด “ฉันด้วย” แล้วทักมาคุยกันได้', 'Say what you want to do and who with. People who are in tap “Me too!” and say hi')
        }
      />

      <AnimatePresence mode="wait" initial={false}>
        {posted ? (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PostSuccess intent={posted} onAgain={again} />
          </motion.div>
        ) : (
          <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={spring.soft}>
            {/* mascot intro — the 3D box has no background on top of it */}
            <div className="flex items-center gap-2 sm:gap-3">
              <View3D className="size-28 shrink-0 sm:size-32" label={t('น้องโมชิชวนเขียนโพสต์', 'Little Mochi invites you to write a post')}>
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
                <p className="relative font-display text-lg leading-snug font-semibold">{t('อยากหาเพื่อนมาทำอะไรดี?', 'What would you like to do together?')}</p>
                <p className="relative text-sm text-ink-soft">
                  {t(
                    `เลือกทีละขั้น ไม่ถึงนาทีก็เสร็จ ${desktop ? 'ด้านขวา' : 'ด้านล่าง'}จะโชว์ว่าเพื่อนๆ เห็นโพสต์แบบไหน`,
                    `One step at a time, done in under a minute. The preview ${desktop ? 'on the right' : 'below'} shows what everyone will see`,
                  )}
                </p>
              </motion.div>
            </div>

            <MyIntents editingId={editing?.id} />

            {editing && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-3xl border-2 border-lavender bg-lavender/20 p-3 pl-4" role="status">
                <Pencil size={18} aria-hidden className="shrink-0 text-ink" />
                <p className="min-w-0 flex-[1_1_12rem] text-sm text-ink">
                  <b className="font-display font-semibold">{t('กำลังแก้โพสต์: ', 'Editing: ')}</b>“{editing.text}”
                </p>
                <Button size="sm" variant="ghost" icon={<X size={16} aria-hidden />} onClick={stopEditing}>
                  {t('ยกเลิกการแก้', 'Stop editing')}
                </Button>
              </div>
            )}

            <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_17rem] md:items-start lg:grid-cols-[minmax(0,1fr)_18rem]">
              <motion.div variants={stagger(0.06, 0.1)} initial="hidden" animate="show" className="flex min-w-0 flex-col gap-4 md:col-start-1 md:row-start-1">
                <TemplateStep draft={draft} onPick={pickTemplate} onUseExample={takeExample} />
                <TextStep draft={draft} patch={patch} detected={detected} mainTag={mainTag} error={shown.text} shakeKey={shakeKey} inputRef={textRef} />
                <TagStep
                  value={mainTag}
                  guessed={guessed}
                  suggestions={TEMPLATE_BY_KEY[draft.template].tags}
                  onChange={(id) => patch({ tagId: id })}
                  error={shown.tag}
                  shakeKey={shakeKey}
                />
                <RoleStep draft={draft} patch={patch} />
                <WhenWhereStep draft={draft} patch={patchWhen} error={shown.date} shakeKey={shakeKey} />
              </motion.div>

              <aside
                aria-label={t('ตัวอย่างโพสต์และคนที่น่าจะตรง', 'Post preview and likely matches')}
                className="flex min-w-0 flex-col gap-4 md:sticky md:top-24 md:col-start-2 md:row-span-2 md:row-start-1 lg:top-6"
              >
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
                    <Eye size={16} aria-hidden /> {t('เพื่อนๆ จะเห็นแบบนี้', "Here's what everyone sees")}
                  </p>
                  <IntentCard intent={preview} me={me} />
                </div>
                <LikelyMatches intent={forMatching} ready={!!deferred.tagId} />
              </aside>

              {/* phones: after the preview · md+: under the steps, so the sticky preview stays short */}
              <Reveal className="card p-4 sm:p-5 md:col-start-1 md:row-start-2">
                <p className="mb-2 font-display text-lg font-semibold">{editing ? t('พร้อมอัปเดตหรือยัง?', 'Ready to update?') : t('พร้อมส่งสัญญาณหรือยัง?', 'Ready to send it out?')}</p>
                <ul className="space-y-1.5" aria-label={t('สิ่งที่ต้องมีก่อนโพสต์', 'Before you post')}>
                  <CheckItem ok={draft.text.trim().length >= TEXT_MIN}>{t(`เขียนข้อความอย่างน้อย ${TEXT_MIN} ตัวอักษร`, `At least ${TEXT_MIN} characters`)}</CheckItem>
                  <CheckItem ok={!!mainTag}>{t('เลือกกิจกรรมหลักแล้ว', 'Main activity picked')}</CheckItem>
                  {draft.when === 'dated' && <CheckItem ok={!!draft.date || !!draft.keptWhenLabel}>{t('เลือกวันแล้ว', 'Date picked')}</CheckItem>}
                </ul>
                {!editing && activeCount >= MAX_ACTIVE && (
                  <p className="mt-3 rounded-2xl bg-butter/40 p-2.5 text-xs text-ink">
                    {t(`มีครบ ${MAX_ACTIVE} ใบแล้ว ใบใหม่จะแทนที่ใบที่เก่าที่สุดนะ`, `You already have ${MAX_ACTIVE} posts. A new one replaces your oldest`)}
                  </p>
                )}
                <Button block size="lg" className="mt-4" icon={editing ? <Check size={19} /> : <Send size={19} />} onPointerDown={leaveField} onClick={submit}>
                  {editing ? t('อัปเดตโพสต์', 'Update post') : t('โพสต์เลย', 'Post it')}
                </Button>
                {editing && (
                  <Button block variant="ghost" className="mt-2" onClick={stopEditing}>
                    {t('ยกเลิกการแก้', 'Stop editing')}
                  </Button>
                )}
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
        <span className="sr-only">{ok ? t(' (เรียบร้อย)', ' (done)') : t(' (ยังไม่ครบ)', ' (not yet)')}</span>
      </span>
    </li>
  )
}
