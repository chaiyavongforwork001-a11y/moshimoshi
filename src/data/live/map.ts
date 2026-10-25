import type {
  Chat,
  ChatMessage,
  DailyAnswer,
  DailyQuestion,
  Intent,
  IntentRole,
  IntentTemplate,
  IntentWhen,
  MochiColor,
  OnlineSlot,
  PromptAnswer,
  Room,
  Session,
  User,
} from '@/lib/types'
import type { AnswerRow, ChatMemberRow, ChatMessageRow, ChatRow, ChatStatus, IntentRow, ProfileRow, QuestionRow, RoomMessageRow, RoomRow, SessionRow } from './rows'
import { bangkokYear, dayOffset, hhmm, lastActiveLabel, messageTime, minutesAgo } from './time'

// DB row → app type. Counts and "who else" lists leave me out on purpose:
// pages add me on top when I joined / reacted / RSVP'd (same as demo data).

/** Live chats also carry their server status and who rang (see pages/chats/lib.ts). */
export type LiveChat = Chat & { status: ChatStatus; requestedBy: string }

const COLORS: readonly MochiColor[] = ['peach', 'butter', 'mint', 'lavender', 'sky', 'pink', 'cream']
const FACES: readonly NonNullable<User['face']>[] = ['smile', 'happy', 'wink', 'sleepy', 'talk', 'wow']
const ACCESSORIES: readonly NonNullable<User['accessory']>[] = ['none', 'headset', 'leaf', 'bow', 'cap']
const SLOTS: readonly OnlineSlot[] = ['morning', 'afternoon', 'evening', 'late']
const ROLES: readonly IntentRole[] = ['peer', 'seek', 'offer', 'swap', 'host']
const TEMPLATES: readonly IntentTemplate[] = ['play', 'talk', 'lang', 'event', 'newbie', 'study', 'moved', 'listen']
const WHENS: readonly IntentWhen[] = ['tonight', 'weekend', 'anytime', 'dated']

function oneOf<T extends string>(list: readonly T[], v: unknown, fallback: T): T
function oneOf<T extends string>(list: readonly T[], v: unknown): T | undefined
function oneOf<T extends string>(list: readonly T[], v: unknown, fallback?: T): T | undefined {
  return list.includes(v as T) ? (v as T) : fallback
}

const opt = <T,>(v: T | null | undefined): T | undefined => (v === null ? undefined : v)

/** A user counts as online if seen in the last 5 minutes (the heartbeat runs every 2). */
export const ONLINE_WINDOW_MIN = 5
/** the database keeps prompts small (see profiles_prompts_size) */
const PROMPTS_MAX = 5
const PROMPT_TEXT_MAX = 150

export function parsePrompts(raw: unknown): PromptAnswer[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((p) => {
    if (!p || typeof p !== 'object') return []
    const { promptId, text } = p as Record<string, unknown>
    return typeof promptId === 'string' && typeof text === 'string' && text.trim() ? [{ promptId, text }] : []
  })
}

export function toUser(p: ProfileRow, rooms: string[], present: boolean, now = Date.now()): User {
  const isOnline = present || (!!p.last_seen_at && minutesAgo(p.last_seen_at, now) < ONLINE_WINDOW_MIN)
  return {
    id: p.id,
    name: p.name?.trim() || 'เพื่อนใหม่',
    age: p.birth_year ? bangkokYear(now) - p.birth_year : 0,
    birthYear: opt(p.birth_year),
    color: oneOf(COLORS, p.color, 'peach'),
    face: oneOf(FACES, p.face),
    accessory: oneOf(ACCESSORIES, p.accessory),
    province: p.province || 'กรุงเทพฯ',
    bio: p.bio ?? '',
    tags: p.tags ?? [],
    loves: p.loves ?? [],
    prompts: parsePrompts(p.prompts),
    chatStyle: p.chat_style ?? [],
    online: (p.online ?? []).filter((s): s is OnlineSlot => SLOTS.includes(s as OnlineSlot)),
    rooms,
    languages: p.languages?.length ? p.languages : ['ไทย'],
    isHost: !!p.is_host,
    lastActive: isOnline ? 'ออนไลน์อยู่' : lastActiveLabel(p.last_seen_at, now),
    isOnline,
  }
}

/** User → the profile columns a person may change about themselves. */
export function profilePatch(u: Partial<User>) {
  const patch: Record<string, unknown> = {}
  if (u.name !== undefined) patch.name = u.name.trim().slice(0, 40)
  if (u.color !== undefined) patch.color = u.color
  if (u.face !== undefined) patch.face = u.face
  if (u.accessory !== undefined) patch.accessory = u.accessory
  if (u.province !== undefined) patch.province = u.province
  if (u.bio !== undefined) patch.bio = u.bio
  if (u.birthYear !== undefined) patch.birth_year = u.birthYear
  if (u.tags !== undefined) patch.tags = u.tags
  if (u.loves !== undefined) patch.loves = u.loves
  if (u.prompts !== undefined) patch.prompts = u.prompts.slice(0, PROMPTS_MAX).map(({ promptId, text }) => ({ promptId, text: text.slice(0, PROMPT_TEXT_MAX) }))
  if (u.chatStyle !== undefined) patch.chat_style = u.chatStyle
  if (u.online !== undefined) patch.online = u.online
  if (u.languages !== undefined) patch.languages = u.languages
  return patch
}

export function toRoom(r: RoomRow, stats: { members: number; online: number; hostIds: string[] }): Room {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon || 'Sparkles',
    color: oneOf(COLORS, r.color, 'cream'),
    tagline: r.tagline ?? '',
    vibe: r.vibe ?? '',
    tags: r.tags ?? [],
    memberCount: stats.members,
    onlineCount: stats.online,
    primeTime: r.prime_time ?? '20:00–23:00',
    hostIds: stats.hostIds,
    isLobby: !!r.is_lobby,
  }
}

/** `joinedBy` = everyone else who pressed "ฉันด้วย"; `slots` = spots still open before me. */
export function toIntent(row: IntentRow, joinedBy: string[], now = Date.now()): Intent {
  return {
    id: row.id,
    userId: row.user_id,
    template: oneOf(TEMPLATES, row.template, 'talk'),
    role: oneOf(ROLES, row.role, 'peer'),
    tagId: row.tag_id,
    text: row.body,
    when: oneOf(WHENS, row.when_kind, 'anytime'),
    whenLabel: opt(row.when_label),
    mode: row.mode === 'offline' ? 'offline' : 'online',
    province: opt(row.province),
    slots: row.slots == null ? undefined : Math.max(0, row.slots - joinedBy.length),
    give: opt(row.give),
    want: opt(row.want),
    roomId: opt(row.room_id),
    postedMinutesAgo: minutesAgo(row.created_at, now),
    joinedBy,
  }
}

/** Intent → insert columns (user, status and expiry are added by the caller). */
export function intentColumns(i: Omit<Intent, 'id' | 'userId' | 'postedMinutesAgo' | 'joinedBy'>) {
  return {
    template: i.template,
    role: i.role,
    tag_id: i.tagId,
    body: i.text.trim().slice(0, 200),
    when_kind: i.when,
    when_label: i.whenLabel ?? null,
    mode: i.mode,
    province: i.province ?? null,
    slots: i.slots ?? null,
    give: i.give ?? null,
    want: i.want ?? null,
    room_id: i.roomId ?? null,
  }
}

/** Team-hosted sessions have no host profile: `hostName` carries the label. */
export function toSession(row: SessionRow, going: number, now = Date.now()): Session {
  const start = Date.parse(row.starts_at)
  const duration = row.duration_min ?? 60
  return {
    id: row.id,
    roomId: row.room_id,
    title: row.title,
    dayOffset: dayOffset(row.starts_at, now),
    time: hhmm(row.starts_at),
    durationMin: duration,
    going,
    hostId: row.host_id ?? '',
    live: now >= start && now < start + duration * 60_000,
    ...(row.host_name ? { hostName: row.host_name } : {}),
  }
}

export function toQuestion(q: QuestionRow, answers: AnswerRow[], sameCount: (a: AnswerRow) => number): DailyQuestion {
  const list: DailyAnswer[] = answers.map((a) => ({ userId: a.user_id, text: a.body, sameCount: sameCount(a) }))
  return { id: q.id, roomId: q.room_id, text: q.body, answers: list }
}

const KINDS: readonly NonNullable<ChatMessage['kind']>[] = ['text', 'system', 'welcome']

export function toMessage(row: RoomMessageRow | ChatMessageRow, sameBy: string[], now = Date.now()): ChatMessage {
  const kind = oneOf(KINDS, row.kind) ?? (row.user_id ? 'text' : 'system')
  return {
    id: row.id,
    userId: row.user_id ?? 'system',
    text: row.body,
    at: messageTime(row.created_at, now),
    kind,
    ...(sameBy.length ? { sameBy } : {}),
  }
}

export function toChat(
  chat: ChatRow,
  members: ChatMemberRow[],
  messages: ChatMessage[],
  rows: ChatMessageRow[],
  myId: string,
): LiveChat {
  const other = members.find((m) => m.user_id !== myId)
  const mine = members.find((m) => m.user_id === myId)
  const readAt = mine?.last_read_at ? Date.parse(mine.last_read_at) : 0
  // their lines, plus "picked up" on a moshi I rang (a system line, but news to me)
  const pickedUp = chat.status === 'active' && chat.requested_by === myId
  const unread = rows.filter(
    (r) => Date.parse(r.created_at) > readAt && (r.user_id ? r.user_id !== myId : pickedUp && r.kind === 'system'),
  ).length
  return {
    id: chat.id,
    withUserId: other?.user_id ?? '',
    messages,
    icebreaker: opt(chat.icebreaker),
    unread,
    status: chat.status === 'active' || chat.status === 'ended' ? chat.status : 'pending',
    requestedBy: chat.requested_by,
  }
}
