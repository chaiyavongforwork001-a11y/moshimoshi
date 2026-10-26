// Small derived-data helpers shared by the rooms list and the room page.
import { TAG_BY_ID, tagsInText } from '@/data/tags'
import { getLang, L, t, texts } from '@/lib/i18n'
import type { IntentRole, IntentWhen, Room, Session, User } from '@/lib/types'

export const roomMembers = (roomId: string, people: User[]): User[] => people.filter((u) => u.rooms.includes(roomId))

const sessionOrder = (s: Session) => s.dayOffset * 1440 + Number(s.time.slice(0, 2)) * 60 + Number(s.time.slice(3, 5))

export function nextSession(roomId: string, sessions: Session[]): Session | undefined {
  return sessions.filter((s) => s.roomId === roomId).sort((a, b) => sessionOrder(a) - sessionOrder(b))[0]
}

export const sortBySession = (sessions: Session[]) => (a: Room, b: Room) => {
  const sa = nextSession(a.id, sessions)
  const sb = nextSession(b.id, sessions)
  if (!sa || !sb) return sa ? -1 : sb ? 1 : 0
  return sessionOrder(sa) - sessionOrder(sb)
}

export function dayLabel(dayOffset: number): string {
  if (dayOffset <= 0) return t('วันนี้', 'Today')
  if (dayOffset === 1) return t('พรุ่งนี้', 'Tomorrow')
  if (dayOffset === 2) return t('มะรืนนี้', 'In 2 days')
  return t(`อีก ${dayOffset} วัน`, `In ${dayOffset} days`)
}

export const sessionWhen = (s: Session) => `${dayLabel(s.dayOffset)} ${s.time}`

/** Room tags I also have, loves first. */
export function sharedRoomTags(room: Room, me: User): string[] {
  return room.tags.filter((t) => me.tags.includes(t)).sort((a, b) => Number(me.loves.includes(b)) - Number(me.loves.includes(a)))
}

/** Room members who share at least one interest with me. */
export function kindredMembers(roomId: string, me: User, people: User[]): User[] {
  return roomMembers(roomId, people).filter((u) => u.tags.some((t) => me.tags.includes(t)))
}

/** "For you" score: shared room tags (loves count extra) + like-minded members + a little life. */
export function roomAffinity(room: Room, me: User, people: User[]): number {
  const shared = sharedRoomTags(room, me)
  const loves = shared.filter((t) => me.loves.includes(t)).length
  return shared.length + loves * 0.5 + kindredMembers(room.id, me, people).length * 0.2 + (room.isLobby ? 0.4 : 0) + room.onlineCount / 400
}

export function rankRooms(rooms: Room[], me: User, people: User[]): Room[] {
  return [...rooms].sort((a, b) => roomAffinity(b, me, people) - roomAffinity(a, me, people))
}

/** Matches name / tagline / tag labels, and Thai slang via tagsInText ("วาโล" → Valorant). */
export function roomMatches(room: Room, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (room.name.toLowerCase().includes(q) || room.tagline.toLowerCase().includes(q)) return true
  if (room.tags.some((t) => TAG_BY_ID[t]?.label.toLowerCase().includes(q))) return true
  const ids = tagsInText(q)
  return ids.some((t) => room.tags.includes(t))
}

export const ROLE_LABEL: Readonly<Record<IntentRole, string>> = texts({
  peer: L('หาเพื่อนทำด้วยกัน', 'Looking for buddies'),
  seek: L('อยากหาคนช่วย', 'Looking for help'),
  offer: L('ช่วยได้นะ', 'Happy to help'),
  swap: L('แลกกัน', 'Swap'),
  host: L('เปิดตี้', 'Squad open'),
})

export const WHEN_LABEL: Readonly<Record<IntentWhen, string>> = texts({
  tonight: L('คืนนี้', 'Tonight'),
  weekend: L('เสาร์–อาทิตย์', 'Weekend'),
  anytime: L('เมื่อไหร่ก็ได้', 'Anytime'),
  dated: L('นัดวันไว้แล้ว', 'Date set'),
})

export function agoLabel(minutes: number): string {
  const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many} ago`
  if (minutes < 1) return t('เมื่อกี้', 'Just now')
  if (minutes < 60) return t(`${minutes} นาทีที่แล้ว`, n(minutes, 'min', 'mins'))
  if (minutes < 1440) return t(`${Math.round(minutes / 60)} ชั่วโมงที่แล้ว`, n(Math.round(minutes / 60), 'hour', 'hours'))
  return t(`${Math.round(minutes / 1440)} วันที่แล้ว`, n(Math.round(minutes / 1440), 'day', 'days'))
}

/** Pull the newcomer's name out of a seeded welcome card ("ยินดีต้อนรับ ไอซ์ (…"). */
export function welcomedName(text: string): string | undefined {
  return text.match(/^ยินดีต้อนรับ\s+([^\s(]+)/)?.[1]
}

const WELCOME_TAILS: Record<string, string> = {
  'ใครอยากทักทายบ้าง?': 'Who wants to say hi?',
  'ใครดูอยู่บ้าง?': 'Anyone else watching?',
}

/**
 * Display text of a welcome card. The card body is written in Thai by the server
 * (supabase post_room_welcome) or the demo seed; in English only the template
 * around the person's name and words is translated. Unknown shapes pass through.
 */
export function welcomeText(text: string): string {
  if (getLang() === 'th') return text
  const m = /^ยินดีต้อนรับ\s+(.+?)\s+\(มาครั้ง(?:แรก|ที่\s*(\d+))\)\s*([\s\S]*)$/.exec(text)
  if (!m) return text
  const [, who, visit, rest] = m
  // the server writes เพื่อนใหม่ when the profile has no name
  const nameOf = (n: string) => (n === 'เพื่อนใหม่' ? 'new friend' : n)
  const head = `Welcome, ${nameOf(who)} (${visit ? `visit #${visit}` : 'first visit'})`
  if (!rest || rest === 'มาทักทายกันหน่อยนะ') return rest ? `${head}. Come say hi!` : head
  const said = /^([\s\S]+?)บอกว่า\s*"([\s\S]*)"\s*([\s\S]*)$/.exec(rest)
  if (!said) return `${head}. ${rest}`
  const [, name, words, tail] = said
  const ask = tail ? (WELCOME_TAILS[tail.trim()] ?? tail) : ''
  return `${head}. ${nameOf(name.trim())} says "${words}"${ask ? ` ${ask}` : ''}`
}
