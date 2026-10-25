import type {
  AnswerRow,
  AnswerSameRow,
  ChatMemberRow,
  ChatMessageRow,
  ChatRow,
  IntentJoinRow,
  IntentRow,
  MessageSameRow,
  ProfileRow,
  QuestionRow,
  RoomMemberRow,
  RoomMessageRow,
  RoomRow,
  RsvpRow,
  SessionRow,
} from './rows'

/** The client's copy of the server rows it cares about, keyed for quick updates. */
export interface Cache {
  me: string
  rooms: RoomRow[]
  /** key `${room}|${user}` */
  members: Map<string, RoomMemberRow>
  profiles: Map<string, ProfileRow>
  intents: Map<string, IntentRow>
  /** intent → user ids */
  joins: Map<string, Set<string>>
  sessions: Map<string, SessionRow>
  /** session → user ids */
  rsvps: Map<string, Set<string>>
  /** newest question per room */
  questions: Map<string, QuestionRow>
  /** key `${question}|${user}` */
  answers: Map<string, AnswerRow>
  /** key `${question}|${answerUser}` → user ids */
  answerSames: Map<string, Set<string>>
  /** loaded rooms only: room → message id → row */
  roomMsgs: Map<string, Map<string, RoomMessageRow>>
  msgRoom: Map<string, string>
  roomSames: Map<string, Set<string>>
  chats: Map<string, ChatRow>
  chatMembers: Map<string, ChatMemberRow[]>
  chatMsgs: Map<string, Map<string, ChatMessageRow>>
  msgChat: Map<string, string>
  chatSames: Map<string, Set<string>>
  /** people I blocked (blocks rows) */
  blocked: Set<string>
  /** ids whose profile the server won't show us (a block either way): their lines stay hidden */
  hidden: Set<string>
}

export function createCache(me: string): Cache {
  return {
    me,
    rooms: [],
    members: new Map(),
    profiles: new Map(),
    intents: new Map(),
    joins: new Map(),
    sessions: new Map(),
    rsvps: new Map(),
    questions: new Map(),
    answers: new Map(),
    answerSames: new Map(),
    roomMsgs: new Map(),
    msgRoom: new Map(),
    roomSames: new Map(),
    chats: new Map(),
    chatMembers: new Map(),
    chatMsgs: new Map(),
    msgChat: new Map(),
    chatSames: new Map(),
    blocked: new Set(),
    hidden: new Set(),
  }
}

export const pairKey = (a: string, b: string) => `${a}|${b}`

export function toggleIn(map: Map<string, Set<string>>, key: string, user: string, on: boolean) {
  let set = map.get(key)
  if (on) {
    if (!set) map.set(key, (set = new Set()))
    set.add(user)
  } else if (set) {
    set.delete(user)
    if (!set.size) map.delete(key)
  }
}

export const others = (set: Set<string> | undefined, me: string) => (set ? [...set].filter((u) => u !== me) : [])

// ---------------------------------------------------------------- row helpers

export function putMember(c: Cache, row: RoomMemberRow, on: boolean) {
  const key = pairKey(row.room_id, row.user_id)
  if (on) c.members.set(key, { ...c.members.get(key), ...row })
  else c.members.delete(key)
}

export function putRoomMessage(c: Cache, row: RoomMessageRow) {
  const room = c.roomMsgs.get(row.room_id)
  if (!room) return false // history for this room isn't loaded: nothing to keep in sync
  room.set(row.id, row)
  c.msgRoom.set(row.id, row.room_id)
  return true
}

export function dropRoomMessage(c: Cache, id: string): string | undefined {
  const roomId = c.msgRoom.get(id)
  if (roomId) c.roomMsgs.get(roomId)?.delete(id)
  c.msgRoom.delete(id)
  c.roomSames.delete(id)
  return roomId
}

export function putChatMessage(c: Cache, row: ChatMessageRow) {
  let msgs = c.chatMsgs.get(row.chat_id)
  if (!msgs) c.chatMsgs.set(row.chat_id, (msgs = new Map()))
  msgs.set(row.id, row)
  c.msgChat.set(row.id, row.chat_id)
}

export function dropChatMessage(c: Cache, id: string): string | undefined {
  const chatId = c.msgChat.get(id)
  if (chatId) c.chatMsgs.get(chatId)?.delete(id)
  c.msgChat.delete(id)
  c.chatSames.delete(id)
  return chatId
}

export function putChatMember(c: Cache, row: ChatMemberRow, on: boolean) {
  const list = (c.chatMembers.get(row.chat_id) ?? []).filter((m) => m.user_id !== row.user_id)
  const prev = c.chatMembers.get(row.chat_id)?.find((m) => m.user_id === row.user_id)
  if (on) list.push({ ...prev, ...row })
  c.chatMembers.set(row.chat_id, list)
}

export function dropChat(c: Cache, id: string) {
  c.chats.delete(id)
  c.chatMembers.delete(id)
  c.chatMsgs.get(id)?.forEach((_, mid) => {
    c.msgChat.delete(mid)
    c.chatSames.delete(mid)
  })
  c.chatMsgs.delete(id)
}

export function putJoin(c: Cache, row: IntentJoinRow, on: boolean) {
  toggleIn(c.joins, row.intent_id, row.user_id, on)
}

export function putRsvp(c: Cache, row: RsvpRow, on: boolean) {
  toggleIn(c.rsvps, row.session_id, row.user_id, on)
}

export function putAnswerSame(c: Cache, row: AnswerSameRow, on: boolean) {
  toggleIn(c.answerSames, pairKey(row.question_id, row.answer_user_id), row.user_id, on)
}

export function putMessageSame(map: Map<string, Set<string>>, row: MessageSameRow, on: boolean) {
  toggleIn(map, row.message_id, row.user_id, on)
}

export function isActiveIntent(row: IntentRow, now = Date.now()) {
  return (row.status ?? 'active') === 'active' && (!row.expires_at || Date.parse(row.expires_at) > now)
}

/** Newest question per room from a newest-first list. */
export function latestPerRoom(rows: QuestionRow[]): Map<string, QuestionRow> {
  const out = new Map<string, QuestionRow>()
  for (const q of rows) if (!out.has(q.room_id)) out.set(q.room_id, q)
  return out
}

export function sortByTime<T extends { created_at: string }>(rows: Iterable<T>): T[] {
  return [...rows].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
}
