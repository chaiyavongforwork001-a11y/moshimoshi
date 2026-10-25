// Small derived-data helpers shared by the rooms list and the room page.
import { TAG_BY_ID, tagsInText } from '@/data/tags'
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
  if (dayOffset <= 0) return 'วันนี้'
  if (dayOffset === 1) return 'พรุ่งนี้'
  if (dayOffset === 2) return 'มะรืนนี้'
  return `อีก ${dayOffset} วัน`
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

export const ROLE_LABEL: Record<IntentRole, string> = {
  peer: 'หาเพื่อนทำด้วยกัน',
  seek: 'อยากหาคนช่วย',
  offer: 'ช่วยได้นะ',
  swap: 'แลกกัน',
  host: 'เปิดตี้',
}

export const WHEN_LABEL: Record<IntentWhen, string> = {
  tonight: 'คืนนี้',
  weekend: 'เสาร์–อาทิตย์',
  anytime: 'เมื่อไหร่ก็ได้',
  dated: 'นัดวันไว้แล้ว',
}

export function agoLabel(minutes: number): string {
  if (minutes < 1) return 'เมื่อกี้'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  if (minutes < 1440) return `${Math.round(minutes / 60)} ชั่วโมงที่แล้ว`
  return `${Math.round(minutes / 1440)} วันที่แล้ว`
}

/** Pull the newcomer's name out of a seeded welcome card ("ยินดีต้อนรับ ไอซ์ (…"). */
export function welcomedName(text: string): string | undefined {
  return text.match(/^ยินดีต้อนรับ\s+([^\s(]+)/)?.[1]
}
