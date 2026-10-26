import { AnimatePresence, motion } from 'motion/react'
import { Clock3, DoorOpen, MessageCircleHeart, PhoneCall, Search, Sparkle, Star, Tags } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MochiExpression } from '@/components/three'
import { RoomIcon } from '@/components/ui'
import { useRooms } from '@/data/hooks'
import { ONLINE_LABEL, PROMPT_BY_ID, TAG_BY_ID } from '@/data/tags'
import { CATEGORY_COLOR, MOCHI } from '@/lib/colors'
import { known, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { textLength, type Draft } from '../model'
import { LAST_STEP, TEMPLATE_BY_ID } from '../options'
import { SignalBars } from './Signal'
import { StageBox } from './StageBox'

interface PreviewPanelProps {
  draft: Draft
  expression: MochiExpression
  pulse: number
  step: number
  province: string
}

/** Desktop left column: the live 3D mochi + a profile card that fills in as you go. */
export function PreviewPanel({ draft, expression, pulse, step, province }: PreviewPanelProps) {
  const connected = step === LAST_STEP
  return (
    <div className="relative flex flex-col gap-3 rounded-[2.5rem] border-2 border-white/80 p-4 xl:p-5">
      <Sparkle className="absolute -top-3 right-10 text-butter" size={22} fill="currentColor" strokeWidth={0} aria-hidden />
      <Sparkle className="absolute top-1/3 -left-3 text-pink" size={16} fill="currentColor" strokeWidth={0} aria-hidden />

      <div className="flex items-center justify-between gap-3 px-1">
        <span className="glass inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-xs font-semibold text-ink">
          <PhoneCall size={14} aria-hidden />
          {connected ? t('เชื่อมสายแล้ว', 'Connected') : t('กำลังต่อสายหาเพื่อน…', 'Calling up friends…')}
          <SignalBars ringing={!connected} />
        </span>
        <span className="text-xs font-semibold text-ink-soft">{t('ตัวอย่างโปรไฟล์', 'Profile preview')}</span>
      </div>

      <StageBox
        color={draft.color}
        expression={expression}
        accessory={draft.accessory}
        name={draft.name}
        pulse={pulse}
        heightClass="h-[clamp(200px,34vh,380px)]"
      />

      <ProfilePreview draft={draft} province={province} />
    </div>
  )
}

function ProfilePreview({ draft, province }: { draft: Draft; province: string }) {
  const ordered = [...draft.loves, ...draft.tags.filter((t) => !draft.loves.includes(t))]
  const shown = ordered.slice(0, 7)
  const more = ordered.length - shown.length
  const story = draft.prompts.find((p) => textLength(p.text) > 0)
  const tpl = draft.intent ? TEMPLATE_BY_ID[draft.intent] : null
  const rhythm = [...draft.online.map((s) => ONLINE_LABEL[s]), ...draft.chatStyle.map((c) => known(c))]
  const rooms = useRooms()

  return (
    <div className="glass rounded-[1.75rem] p-4 xl:p-5">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
        <span className="size-1.5 rounded-full bg-success" aria-hidden />
        {known(province)} · {t('ออนไลน์อยู่', 'Online now')}
      </p>
      <dl className="space-y-3">
        <Row icon={<Tags size={14} />} label={t('ชอบ', 'Likes')}>
          {shown.length ? (
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence initial={false}>
                {shown.map((id) => {
                  const tag = TAG_BY_ID[id]
                  if (!tag) return null
                  const p = MOCHI[CATEGORY_COLOR[tag.category]]
                  const loved = draft.loves.includes(id)
                  return (
                    <motion.span
                      key={id}
                      layout
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={spring.bouncy}
                      className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium"
                      style={{ background: loved ? p.base : p.light, color: p.ink }}
                    >
                      {loved && <Star size={11} fill="currentColor" strokeWidth={0} aria-label={t('รักมาก', 'Love it')} />}
                      {tag.label}
                    </motion.span>
                  )
                })}
              </AnimatePresence>
              {more > 0 && <span className="inline-flex h-7 items-center rounded-full bg-cream-3 px-2.5 text-xs font-semibold text-ink">+{more}</span>}
            </div>
          ) : (
            <Ghosts widths={['w-16', 'w-20', 'w-14']} />
          )}
        </Row>

        <Row icon={<MessageCircleHeart size={14} />} label={t('เล่าให้ฟัง', 'About me')}>
          {story ? (
            <p className="line-clamp-2 text-sm text-ink">
              <span className="font-semibold">{PROMPT_BY_ID[story.promptId]?.label} </span>
              {story.text}
            </p>
          ) : (
            <Ghosts widths={['w-40', 'w-24']} />
          )}
        </Row>

        <Row icon={tpl ? <Search size={14} /> : <Clock3 size={14} />} label={t('จังหวะ', 'Rhythm')}>
          {tpl || rhythm.length ? (
            <div className="flex flex-wrap gap-1.5">
              {tpl && (
                <span className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold" style={{ background: MOCHI[tpl.color].base, color: MOCHI[tpl.color].ink }}>
                  <tpl.Icon size={12} aria-hidden />
                  {tpl.label}
                </span>
              )}
              {rhythm.map((r) => (
                <span key={r} className="inline-flex h-7 items-center rounded-full bg-white px-2.5 text-xs font-medium text-ink">
                  {r}
                </span>
              ))}
            </div>
          ) : (
            <Ghosts widths={['w-20', 'w-16']} />
          )}
        </Row>

        <Row icon={<DoorOpen size={14} />} label={t('ห้อง', 'Rooms')}>
          {draft.rooms.length ? (
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence initial={false}>
                {draft.rooms.map((id) => {
                  const room = rooms.find((r) => r.id === id)
                  if (!room) return null
                  return (
                    <motion.span
                      key={id}
                      layout
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={spring.bouncy}
                      title={room.name}
                    >
                      <RoomIcon room={room} size={30} />
                      <span className="sr-only">{room.name}</span>
                    </motion.span>
                  )
                })}
              </AnimatePresence>
            </div>
          ) : (
            <Ghosts widths={['w-8', 'w-8', 'w-8']} round />
          )}
        </Row>
      </dl>
    </div>
  )
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-2">
      <dt className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-ink-soft">
        <span aria-hidden>{icon}</span>
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  )
}

/** Dashed placeholders that hint at what's still to come. */
function Ghosts({ widths, round }: { widths: string[]; round?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="sr-only">{t('ยังไม่ได้เลือก', 'Nothing picked yet')}</span>
      {widths.map((w, i) => (
        <span key={i} aria-hidden className={`h-7 border-2 border-dashed border-ink/15 ${round ? 'w-8 rounded-xl' : `${w} rounded-full`}`} />
      ))}
    </div>
  )
}
