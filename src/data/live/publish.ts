import { useCatalog, type CatalogData } from '@/data/catalog'
import { BLANK_ME, useMoshi, type MoshiPolicy, type MoshiState } from '@/lib/store'
import type { ChatMessage, Room } from '@/lib/types'
import { isTmp, resolveId } from './bus'
import { isActiveIntent, others, pairKey, sortByTime, type Cache } from './cache'
import { ONLINE_WINDOW_MIN, toChat, toIntent, toMessage, toQuestion, toRoom, toSession, toUser, type LiveChat } from './map'
import { isSample, isServerId, SAMPLE_INTENTS, SAMPLE_PEOPLE } from './sample'
import { minutesAgo } from './time'

// Cache → stores. "Others" data goes to useCatalog; my own slices go to
// useMoshi. Each function returns a patch so a full refresh lands in one set.

type CatPatch = Partial<CatalogData>
type MinePatch = Partial<MoshiState>

const POLICIES: readonly MoshiPolicy[] = ['everyone', 'rooms', 'chatted']

export function isOnline(c: Cache, id: string, now = Date.now()) {
  const seen = c.profiles.get(id)?.last_seen_at
  return !!seen && minutesAgo(seen, now) < ONLINE_WINDOW_MIN
}

/** Other people, minus anyone in a block relation with me (their profile is hidden from us). */
const visible = (c: Cache, ids: string[]) => ids.filter((u) => !c.hidden.has(u))

function roomsByUser(c: Cache) {
  const out = new Map<string, string[]>()
  c.members.forEach((m) => {
    const list = out.get(m.user_id)
    if (list) list.push(m.room_id)
    else out.set(m.user_id, [m.room_id])
  })
  return out
}

export function mePatch(c: Cache, initial: boolean): MinePatch {
  const s = useMoshi.getState()
  // after the first load my rooms are owned by the store (optimistic joins/leaves)
  const rooms = initial ? (roomsByUser(c).get(c.me) ?? []) : s.me.rooms
  const p = c.profiles.get(c.me)
  if (!p) return { me: { ...BLANK_ME, id: c.me, rooms }, onboarded: false }
  const policy = POLICIES.find((x) => x === p.moshi_policy) ?? 'everyone'
  return { me: toUser(p, rooms, true), onboarded: !!p.onboarded, moshiPolicy: policy }
}

export function peoplePatch(c: Cache): CatPatch {
  const now = Date.now()
  const byUser = roomsByUser(c)
  const partners = new Set<string>()
  c.chatMembers.forEach((list) => list.forEach((m) => m.user_id !== c.me && partners.add(m.user_id)))
  const people = [...c.profiles.values()]
    // same rule as the route guard: finished onboarding, or passed its 20+ step and skipped the rest
    .filter((p) => p.id !== c.me && (p.onboarded || p.birth_year != null || partners.has(p.id)))
    .map((p) => toUser(p, byUser.get(p.id) ?? [], false, now))
    .sort((a, b) => Number(b.isOnline) - Number(a.isOnline))
  return { people: SAMPLE_PEOPLE.length ? [...people, ...SAMPLE_PEOPLE] : people }
}

export function roomsPatch(c: Cache): CatPatch {
  const now = Date.now()
  const mine = new Set(useMoshi.getState().me.rooms)
  const byRoom = new Map<string, { members: number; online: number; hostIds: string[] }>()
  c.rooms.forEach((r) => byRoom.set(r.id, { members: 0, online: 0, hostIds: [] }))
  c.members.forEach((m) => {
    const st = byRoom.get(m.room_id)
    if (!st) return
    if (m.role === 'host') st.hostIds.push(m.user_id)
    if (m.user_id === c.me) return // counted from the store below
    st.members++
    if (isOnline(c, m.user_id, now)) st.online++
  })
  const rooms: Room[] = []
  const roomStats: CatalogData['roomStats'] = {}
  c.rooms.forEach((r) => {
    const st = byRoom.get(r.id)!
    const me = mine.has(r.id) ? 1 : 0
    const stats = { members: st.members + me, online: st.online + me, hostIds: st.hostIds }
    rooms.push(toRoom(r, stats))
    roomStats[r.id] = { members: stats.members, online: stats.online }
  })
  return { rooms, roomStats }
}

export function intentsPatch(c: Cache): CatPatch {
  const now = Date.now()
  const list = [...c.intents.values()]
    .filter((i) => i.user_id !== c.me && !c.hidden.has(i.user_id) && isActiveIntent(i, now))
    .map((i) => toIntent(i, visible(c, others(c.joins.get(i.id), c.me)), now))
  return { intents: SAMPLE_INTENTS.length ? [...list, ...SAMPLE_INTENTS] : list }
}

export function myIntentsPatch(c: Cache): MinePatch {
  const now = Date.now()
  const pending = useMoshi.getState().myIntents.filter((i) => isTmp(i.id))
  const mine = [...c.intents.values()]
    .filter((i) => i.user_id === c.me && isActiveIntent(i, now))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((i) => toIntent(i, visible(c, others(c.joins.get(i.id), c.me)), now))
  return { myIntents: [...pending, ...mine] }
}

export function myJoinsPatch(c: Cache): MinePatch {
  const local = useMoshi.getState().joinedIntentIds.filter((id) => !isServerId(id))
  const server = [...c.joins.entries()].filter(([, users]) => users.has(c.me)).map(([id]) => id)
  return { joinedIntentIds: [...local, ...server] }
}

export function sessionsPatch(c: Cache): CatPatch {
  const now = Date.now()
  const sessions = [...c.sessions.values()]
    .filter((s) => Date.parse(s.starts_at) + (s.duration_min ?? 60) * 60_000 > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .map((s) => toSession(s, others(c.rsvps.get(s.id), c.me).length, now))
  return { sessions }
}

export function myGoingPatch(c: Cache): MinePatch {
  const local = useMoshi.getState().going.filter((id) => !isServerId(id))
  const server = [...c.rsvps.entries()].filter(([, users]) => users.has(c.me)).map(([id]) => id)
  return { going: [...local, ...server] }
}

export function questionsPatch(c: Cache): CatPatch {
  const answers = [...c.answers.values()]
  const questions = [...c.questions.values()].map((q) =>
    toQuestion(
      q,
      answers.filter((a) => a.question_id === q.id && a.user_id !== c.me && !c.hidden.has(a.user_id)),
      (a) => visible(c, others(c.answerSames.get(pairKey(q.id, a.user_id)), c.me)).length,
    ),
  )
  return { questions }
}

export function myAnswersPatch(c: Cache): MinePatch {
  const current = useMoshi.getState().answers
  const out: Record<string, string> = {}
  Object.entries(current).forEach(([qid, text]) => {
    if (!isServerId(qid)) out[qid] = text
  })
  c.answers.forEach((a) => {
    if (a.user_id === c.me) out[a.question_id] = a.body
  })
  return { answers: out }
}

const isServerSame = (id: string) => {
  const parts = id.split(':')
  return parts.length === 2 ? isServerId(parts[0]) && isServerId(parts[1]) : isServerId(id)
}

export function mySamesPatch(c: Cache): MinePatch {
  const local = useMoshi.getState().sames.filter((id) => !isServerSame(id))
  const server: string[] = []
  c.roomSames.forEach((users, id) => users.has(c.me) && server.push(id))
  c.chatSames.forEach((users, id) => users.has(c.me) && server.push(id))
  c.answerSames.forEach((users, key) => {
    if (!users.has(c.me)) return
    const [q, u] = key.split('|')
    server.push(`${q}:${u}`)
  })
  return { sames: [...local, ...server] }
}

/** Server history for loaded rooms; also drops local copies the server now holds. */
export function roomMessagesPatch(c: Cache, roomIds: Iterable<string>): { cat: CatPatch; mine: MinePatch } {
  const now = Date.now()
  const history = { ...useCatalog.getState().roomMessages }
  const local = { ...useMoshi.getState().roomMessages }
  let localChanged = false
  for (const roomId of roomIds) {
    const rows = sortByTime(c.roomMsgs.get(roomId)?.values() ?? []).filter((r) => !r.user_id || !c.hidden.has(r.user_id))
    history[roomId] = rows.map((r) => toMessage(r, others(c.roomSames.get(r.id), c.me), now))
    const mine = local[roomId]
    if (mine?.some((m) => c.roomMsgs.get(roomId)?.has(m.id))) {
      local[roomId] = mine.filter((m) => !c.roomMsgs.get(roomId)?.has(m.id))
      localChanged = true
    }
  }
  return { cat: { roomMessages: history }, mine: localChanged ? { roomMessages: local } : {} }
}

export function chatsPatch(c: Cache): MinePatch {
  const now = Date.now()
  const s = useMoshi.getState()
  const prevById = new Map(s.chats.map((ch) => [ch.id, ch]))
  const lastAt = new Map<string, number>()
  const live: LiveChat[] = []
  c.chats.forEach((row) => {
    const rows = sortByTime(c.chatMsgs.get(row.id)?.values() ?? [])
    const msgs = rows.map((r) => toMessage(r, others(c.chatSames.get(r.id), c.me), now))
    // my messages still on their way stay at the bottom (an opener sent through the rpc
    // never learns its id: drop it once the same line from me shows up from the server)
    const recent = rows.slice(-10)
    const pending: ChatMessage[] =
      prevById.get(row.id)?.messages.filter((m) => isTmp(m.id) && !recent.some((r) => r.user_id === c.me && r.body === m.text)) ?? []
    live.push(toChat(row, c.chatMembers.get(row.id) ?? [], [...msgs, ...pending], rows, c.me))
    lastAt.set(row.id, Date.parse(rows.at(-1)?.created_at ?? row.created_at))
  })
  live.sort((a, b) => (lastAt.get(b.id) ?? 0) - (lastAt.get(a.id) ?? 0))
  const visible = live.filter((ch) => !c.hidden.has(ch.withUserId))
  const real = new Set(live.map((ch) => ch.id))
  // sample chats stay local; a moshi still ringing through the rpc keeps its temporary chat
  const keep = s.chats.filter((ch) => isSample(ch.withUserId) || (isTmp(ch.id) && !real.has(resolveId(ch.id))))
  const sent = [...keep, ...live].filter((ch) => ch.requestedBy === c.me).map((ch) => ch.withUserId)
  return {
    chats: [...keep, ...visible],
    sentMoshi: [...new Set([...s.sentMoshi.filter((id) => isSample(id)), ...sent])],
  }
}

export function apply(cat: CatPatch, mine: MinePatch) {
  if (Object.keys(cat).length) useCatalog.getState().set(cat)
  if (Object.keys(mine).length) useMoshi.setState(mine)
}

/** Everything at once (first load, refresh after reconnect). */
export function publishAll(c: Cache) {
  // me first: room counts read my rooms from the store
  const blocked = [...new Set([...useMoshi.getState().blocked, ...c.blocked])]
  useMoshi.setState({ ...mePatch(c, true), blocked })
  const rooms = roomMessagesPatch(c, c.roomMsgs.keys())
  apply(
    { ...peoplePatch(c), ...roomsPatch(c), ...intentsPatch(c), ...sessionsPatch(c), ...questionsPatch(c), ...rooms.cat, ready: true, error: null },
    {
      ...myIntentsPatch(c),
      ...myJoinsPatch(c),
      ...myGoingPatch(c),
      ...myAnswersPatch(c),
      ...mySamesPatch(c),
      ...chatsPatch(c),
      ...rooms.mine,
    },
  )
}
