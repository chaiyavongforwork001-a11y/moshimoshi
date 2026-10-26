// Onboarding draft: what the visitor is building step by step, plus the
// rules that turn it into a profile, a first intent and room picks.
import type { MochiAccessory, MochiExpression } from '@/components/three'
import { PROMPTS, TAG_BY_ID } from '@/data/tags'
import { known, t } from '@/lib/i18n'
import type { Intent, IntentTemplate, MochiColor, OnlineSlot, PromptAnswer, Room, TagCategory, User } from '@/lib/types'

export interface Draft {
  name: string
  /** '1'..'12' or '' (month + year are only used for the 20+ check) */
  birthMonth: string
  /** raw digits as typed, พ.ศ. or ค.ศ. */
  birthYear: string
  /** false once the profile already has a birth year (the check never repeats) */
  needsAge: boolean
  color: MochiColor
  face: MochiExpression
  accessory: MochiAccessory
  tags: string[]
  /** up to 3 starred tags ("รักมาก"), always a subset of tags */
  loves: string[]
  /** first answer is required, the second one optional */
  prompts: PromptAnswer[]
  intent: IntentTemplate | null
  /** topic for the "คุยเรื่อง…" template */
  intentTag: string | null
  online: OnlineSlot[]
  chatStyle: string[]
  rooms: string[]
  /** once the visitor toggles a room we stop auto-picking for them */
  roomsTouched: boolean
}

export type DraftPatch = Partial<Draft> | ((d: Draft) => Partial<Draft>)
export type UpdateDraft = (patch: DraftPatch) => void

export interface StepProps {
  draft: Draft
  update: UpdateDraft
  desktop: boolean
}

export const NAME_MAX = 20
export const STORY_MIN = 15
export const STORY_MAX = 150
export const MIN_TAGS = 3
export const MAX_LOVES = 3
export const MAX_STYLES = 2
export const MIN_AGE = 20

export const lookPatch = (d: Draft): Pick<User, 'face' | 'accessory'> => ({ face: d.face, accessory: d.accessory })

/** First visit starts fresh; a finished profile is loaded so revisiting edits it. */
export function initialDraft(me: User, onboarded: boolean): Draft {
  const base = {
    birthMonth: '',
    birthYear: '',
    needsAge: !me.birthYear,
    color: me.color,
    face: me.face ?? 'smile',
    accessory: me.accessory ?? 'none',
    intent: null,
    intentTag: null,
  } satisfies Partial<Draft>
  const blankPrompt = { promptId: PROMPTS[0].id, text: '' }
  if (!onboarded) {
    // someone who skipped after the 20+ step keeps the name they typed; brand-new people start blank
    const name = me.birthYear ? me.name.slice(0, NAME_MAX) : ''
    return { ...base, name, tags: [], loves: [], prompts: [blankPrompt], online: [], chatStyle: [], rooms: [], roomsTouched: false }
  }
  return {
    ...base,
    name: me.name.slice(0, NAME_MAX),
    tags: [...me.tags],
    loves: me.loves.filter((t) => me.tags.includes(t)).slice(0, MAX_LOVES),
    prompts: me.prompts.length ? me.prompts.slice(0, 2).map((p) => ({ ...p })) : [blankPrompt],
    online: [...me.online],
    chatStyle: me.chatStyle.slice(0, MAX_STYLES),
    rooms: [...me.rooms],
    roomsTouched: me.rooms.length > 0,
  }
}

export const textLength = (s: string) => s.trim().length

// ------------------------------------------------------------------ age (20+)
/** Typed year → ค.ศ. (พ.ศ. when > 2400), or null if it can't be a birth year. */
export function parseBirthYear(raw: string, now = new Date()): number | null {
  if (!/^\d{4}$/.test(raw)) return null
  const n = Number(raw)
  const year = n > 2400 ? n - 543 : n
  return year >= 1900 && year <= now.getFullYear() ? year : null
}

/** Whole years, counting the birth month itself as "not yet" (design: hard 20+ by month and year). */
export function ageFrom(year: number, month: number, now = new Date()): number {
  return now.getFullYear() - year - (month >= now.getMonth() + 1 ? 1 : 0)
}

export type AgeState = { kind: 'skip' } | { kind: 'incomplete' } | { kind: 'invalid' } | { kind: 'under' } | { kind: 'ok'; year: number; age: number }

export function ageState(d: Draft): AgeState {
  if (!d.needsAge) return { kind: 'skip' }
  if (!d.birthMonth || d.birthYear.length < 4) return { kind: 'incomplete' }
  const year = parseBirthYear(d.birthYear)
  if (year === null) return { kind: 'invalid' }
  const age = ageFrom(year, Number(d.birthMonth))
  return age >= MIN_AGE ? { kind: 'ok', year, age } : { kind: 'under' }
}

/** What goes onto the profile: the year (ค.ศ.) and the age it gives today. Never the month. */
export function birthPatch(d: Draft): Pick<User, 'birthYear' | 'age'> | Record<string, never> {
  const a = ageState(d)
  return a.kind === 'ok' ? { birthYear: a.year, age: a.age } : {}
}

export interface StepCheck {
  ok: boolean
  /** short, kind nudge shown on the action button / announced when blocked */
  need?: string
}

export function validate(step: number, d: Draft): StepCheck {
  switch (step) {
    case 0: {
      if (!textLength(d.name)) return { ok: false, need: t('บอกชื่อเล่นให้เรารู้จักหน่อยนะ', 'Tell me your nickname first') }
      const age = ageState(d)
      if (age.kind === 'incomplete') return { ok: false, need: t('บอกเดือนและปีเกิดด้วยนะ', 'Add your birth month and year too') }
      if (age.kind === 'invalid') return { ok: false, need: t('ปีเกิดดูแปลกๆ ลองเช็กอีกทีนะ', 'That birth year looks off. Check it again?') }
      if (age.kind === 'under') return { ok: false, need: t(`ตอนนี้เปิดให้อายุ ${MIN_AGE} ปีขึ้นไปก่อนนะ`, `For now, it's ${MIN_AGE}+ only. Sorry!`) }
      return { ok: true }
    }
    case 2: {
      const left = MIN_TAGS - d.tags.length
      return left > 0 ? { ok: false, need: t(`เลือกอีก ${left} อย่างนะ`, `Pick ${left} more`) } : { ok: true }
    }
    case 3: {
      const first = textLength(d.prompts[0]?.text ?? '')
      if (first < STORY_MIN) {
        const left = STORY_MIN - first
        return {
          ok: false,
          need: first
            ? t(`อีก ${left} ตัวอักษรก็ครบ`, `${left} more ${left === 1 ? 'character' : 'characters'} to go`)
            : t('เล่าให้ฟังสักนิดนะ', 'Tell me a little something'),
        }
      }
      const second = d.prompts[1] ? textLength(d.prompts[1].text) : 0
      if (second > 0 && second < STORY_MIN) return { ok: false, need: t('ข้อสองยังสั้นไปนิดนะ', 'The second one is a bit short') }
      return { ok: true }
    }
    case 5:
      return d.rooms.length ? { ok: true } : { ok: false, need: t('เลือกอย่างน้อย 1 ห้องนะ', 'Pick at least 1 room') }
    default:
      return { ok: true }
  }
}

export const cleanPrompts = (d: Draft): PromptAnswer[] =>
  d.prompts.filter((p) => textLength(p.text) >= STORY_MIN).map((p) => ({ promptId: p.promptId, text: p.text.trim() }))

const label = (tagId: string) => TAG_BY_ID[tagId]?.label ?? tagId

/** One-line bio for first-timers, from what they love most (written in their language, like a bio they typed). */
export function autoBio(d: Draft): string {
  const ids = [...d.loves, ...d.tags.filter((id) => !d.loves.includes(id))].slice(0, 3).map(label)
  if (!ids.length) return ''
  if (ids.length === 1) return t(`ชอบ${ids[0]}`, `Into ${ids[0]}`)
  const head = ids.slice(0, -1).join(', ')
  const last = ids[ids.length - 1]
  return t(`ชอบ ${head} และ ${last}`, `Into ${head} and ${last}`)
}

// ------------------------------------------------------------------ rooms
export interface RankedRoom {
  room: Room
  shared: string[]
  score: number
}

const TEMPLATE_ROOM: Record<IntentTemplate, string> = {
  play: 'game-night',
  talk: '',
  lang: 'lang',
  event: 'music',
  newbie: 'lobby',
  study: 'cowork',
  moved: 'moved-bkk',
  listen: 'listen',
}

export const lobbyOf = (rooms: Room[]) => rooms.find((r) => r.isLobby)

/** Non-lobby rooms ranked by tag overlap (loved tags count more, the chosen intent's room gets a nudge). */
export function rankRooms(d: Draft, rooms: Room[]): RankedRoom[] {
  const intentRoom = d.intent ? TEMPLATE_ROOM[d.intent] : ''
  return rooms
    .filter((r) => !r.isLobby)
    .map((room) => {
      const shared = room.tags.filter((t) => d.tags.includes(t))
      const score = shared.reduce((s, t) => s + (d.loves.includes(t) ? 1.5 : 1), 0) + (room.id === intentRoom ? 2 : 0)
      return { room, shared, score }
    })
    .sort((a, b) => b.score - a.score || b.room.onlineCount - a.room.onlineCount)
}

export function defaultRooms(d: Draft, rooms: Room[]): string[] {
  const lobby = lobbyOf(rooms)
  return [...(lobby ? [lobby.id] : []), ...rankRooms(d, rooms).slice(0, 2).map((r) => r.room.id)]
}

// ------------------------------------------------------------------ first intent
export type IntentDraft = Omit<Intent, 'id' | 'userId' | 'postedMinutesAgo' | 'joinedBy'>

const roomForTag = (tagId: string, rooms: Room[]) => rooms.find((r) => !r.isLobby && r.tags.includes(tagId))?.id ?? lobbyOf(rooms)?.id

function pickTag(d: Draft, cats: TagCategory[], fallback: string): string {
  const inCat = (t: string) => cats.includes(TAG_BY_ID[t]?.category as TagCategory)
  return d.loves.find(inCat) ?? d.tags.find(inCat) ?? fallback
}

/**
 * Turns the chosen quick template into a sensible board post (rooms that don't exist are left off).
 * The post text reads like the person wrote it, so it's in their language; whenLabel stays Thai (stored, shown with known()).
 */
export function buildIntent(d: Draft, province: string, rooms: Room[]): IntentDraft | null {
  const intent = templateIntent(d, province, rooms)
  if (!intent) return null
  const roomId = intent.roomId && rooms.some((r) => r.id === intent.roomId) ? intent.roomId : undefined
  return { ...intent, roomId }
}

function templateIntent(d: Draft, province: string, rooms: Room[]): IntentDraft | null {
  const tpl = d.intent
  if (!tpl) return null
  switch (tpl) {
    case 'play': {
      const tagId = pickTag(d, ['game'], 'cozygame')
      const text = t(`หาเพื่อนเล่น ${label(tagId)} ด้วยกัน สบายๆ ไม่ toxic`, `Looking for friends to play ${label(tagId)} with. Chill, no toxicity`)
      return { template: tpl, role: 'peer', tagId, text, when: 'tonight', whenLabel: 'คืนนี้', mode: 'online', roomId: 'game-night' }
    }
    case 'talk': {
      const tagId = (d.intentTag && d.tags.includes(d.intentTag) ? d.intentTag : null) ?? d.loves[0] ?? d.tags[0] ?? 'frieren'
      const text = t(`อยากมีคนคุยเรื่อง ${label(tagId)} ยาวๆ แบบไม่มีใครตัดสิน`, `Want someone to talk ${label(tagId)} with for hours, no judgment`)
      return { template: tpl, role: 'peer', tagId, text, when: 'anytime', mode: 'online', roomId: roomForTag(tagId, rooms) }
    }
    case 'lang': {
      const tagId = pickTag(d, ['lang'], 'japanese')
      if (tagId === 'thai') {
        const text = t('อยากหาเพื่อนฝึกภาษาไทย คุยเล่นสบายๆ ผิดได้ ขำได้', 'Looking for a friend to practice Thai with. Casual chats, mistakes and laughs welcome')
        return { template: tpl, role: 'peer', tagId, text, when: 'anytime', mode: 'online', roomId: 'lang' }
      }
      return {
        template: tpl,
        role: 'swap',
        tagId,
        text: t(`สอนภาษาไทยให้ได้ อยากฝึก${label(tagId)} แลกกันไหม`, `I can teach Thai and want to practice ${label(tagId)}. Swap?`),
        when: 'anytime',
        mode: 'online',
        give: t('ภาษาไทย', 'Thai'),
        want: label(tagId),
        roomId: 'lang',
      }
    }
    case 'event': {
      const tagId = d.tags.includes('concert') ? 'concert' : pickTag(d, ['music'], 'concert')
      const text = t('หาเพื่อนไปคอนเสิร์ตหรืองานอีเวนต์ ไปคนเดียวเขิน ไปเป็นแก๊งกัน', "Looking for concert or event buddies. Going solo is awkward, let's go as a gang")
      return { template: tpl, role: 'peer', tagId, text, when: 'weekend', whenLabel: 'สุดสัปดาห์นี้', mode: 'offline', province, roomId: 'music' }
    }
    case 'newbie': {
      const tagId = d.loves[0] ?? d.tags[0] ?? 'cozygame'
      const text = t(`เพิ่งมาใหม่ ยังไม่รู้จักใครเลย ชอบ ${label(tagId)} ทักมาคุยกันได้นะ`, `New here and don't know anyone yet. Into ${label(tagId)}, come say hi!`)
      return { template: tpl, role: 'peer', tagId, text, when: 'anytime', mode: 'online', roomId: lobbyOf(rooms)?.id }
    }
    case 'study': {
      const tagId = pickTag(d, ['study'], 'cowork')
      const text = t('หาเพื่อนนั่งทำงานหรือติวด้วยกัน ทำเงียบๆ แต่ไม่เหงา', 'Looking for a work or study buddy. Quiet, but never lonely')
      return { template: tpl, role: 'peer', tagId, text, when: 'tonight', whenLabel: 'คืนนี้', mode: 'online', roomId: 'cowork' }
    }
    case 'moved': {
      const text = t(`เพิ่งย้ายมา${province} อยากมีเพื่อนแถวนี้ไปหาของอร่อยด้วยกัน`, `Just moved to ${known(province)}. Looking for local friends to hunt down good food with`)
      return { template: tpl, role: 'peer', tagId: 'movedbkk', text, when: 'weekend', whenLabel: 'สุดสัปดาห์นี้', mode: 'offline', province, roomId: 'moved-bkk' }
    }
    case 'listen': {
      const text = t('ช่วงนี้อยากมีคนรับฟัง คุยเบาๆ ไม่ต้องมีคำตอบก็ได้', 'Could use someone to listen lately. Gentle chats, no answers needed')
      return { template: tpl, role: 'seek', tagId: 'listening', text, when: 'anytime', mode: 'online', roomId: 'listen' }
    }
  }
}
