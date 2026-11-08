import { t } from '@/lib/i18n'
import type { Intent, IntentRole, IntentTemplate, IntentWhen, Room } from '@/lib/types'
import { giveWantFor } from './templates'

export const TEXT_MAX = 100
export const TEXT_MIN = 8

/** Everything the composer edits. `tagId` is what the user picked; the parser may fill it in. */
export interface Draft {
  template: IntentTemplate
  role: IntentRole
  tagId: string
  text: string
  when: IntentWhen
  /** HH:mm, optional (tonight / dated) */
  time: string
  /** yyyy-mm-dd (dated) */
  date: string
  mode: 'online' | 'offline'
  province: string
  slots: number
  give: string
  want: string
  /** room the post was started from (/app/post?room=…); otherwise picked from the tag */
  roomId?: string
  /** editing: the post's saved time label, kept until "when" is touched (a saved date can't be read back) */
  keptWhenLabel?: string
}

export type IntentDraft = Omit<Intent, 'id' | 'userId' | 'postedMinutesAgo' | 'joinedBy'>

export const initialDraft = (province: string): Draft => ({
  template: 'talk',
  role: 'peer',
  tagId: '',
  text: '',
  when: 'anytime',
  time: '',
  date: '',
  mode: 'online',
  province,
  slots: 2,
  give: '',
  want: '',
})

/** Saved with the post and shown to everyone: always Thai (displayed through known()). */
export function whenLabelOf(d: Draft): string | undefined {
  if (d.keptWhenLabel) return d.keptWhenLabel
  if (d.when === 'tonight') return d.time ? `คืนนี้ ${d.time}` : 'คืนนี้'
  if (d.when === 'weekend') return 'สุดสัปดาห์นี้'
  if (d.when === 'dated' && d.date) {
    const day = new Date(`${d.date}T00:00`).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
    return d.time ? `${day} ${d.time}` : day
  }
  return undefined
}

/** Draft → the intent others will see (and the one matching runs on). `rooms` picks a room from the tag. */
export function toIntent(d: Draft, tagId: string, rooms: Room[]): IntentDraft {
  const gw = giveWantFor(d.role)
  return {
    template: d.template,
    role: d.role,
    tagId,
    text: d.text.trim(),
    when: d.when,
    whenLabel: whenLabelOf(d),
    mode: d.mode,
    province: d.mode === 'offline' ? d.province : undefined,
    slots: d.role === 'host' ? d.slots : undefined,
    give: gw.give && d.give.trim() ? d.give.trim() : undefined,
    want: gw.want && d.want.trim() ? d.want.trim() : undefined,
    // a tag no room lists (anything typed by hand) still lands on a board: the lobby's, same as onboarding
    roomId: d.roomId ?? rooms.find((r) => !r.isLobby && r.tags.includes(tagId))?.id ?? (tagId ? rooms.find((r) => r.isLobby)?.id : undefined),
  }
}

/** One of my posts back in the composer, to edit. */
export function draftFromIntent(i: Intent, fallbackProvince: string): Draft {
  // "คืนนี้ 21:00" reads back exactly; any other saved label is kept as it is
  const tonight = i.when === 'tonight' ? /^คืนนี้(?: (\d{2}:\d{2}))?$/.exec(i.whenLabel ?? 'คืนนี้') : null
  return {
    template: i.template,
    role: i.role,
    tagId: i.tagId,
    text: i.text,
    when: i.when,
    time: tonight?.[1] ?? '',
    date: '',
    mode: i.mode,
    province: i.province ?? fallbackProvince,
    slots: i.slots ?? 2,
    give: i.give ?? '',
    want: i.want ?? '',
    roomId: i.roomId,
    keptWhenLabel: tonight || i.when === 'anytime' || i.when === 'weekend' ? undefined : i.whenLabel,
  }
}

export interface DraftErrors {
  tag?: string
  text?: string
  date?: string
}

export function validate(d: Draft, tagId: string): DraftErrors {
  const e: DraftErrors = {}
  if (!tagId) e.tag = t('เลือกกิจกรรมหลักก่อนนะ เพื่อนๆ จะได้หาเจอ', 'Pick a main activity first so people can find you')
  if (d.text.trim().length < TEXT_MIN) e.text = t(`เล่าอีกนิดนะ อย่างน้อย ${TEXT_MIN} ตัวอักษร`, `Tell us a bit more, at least ${TEXT_MIN} characters`)
  if (d.when === 'dated' && !d.date && !d.keptWhenLabel) e.date = t('เลือกวันด้วยนะ', 'Pick a date too')
  return e
}

export const todayISO = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
