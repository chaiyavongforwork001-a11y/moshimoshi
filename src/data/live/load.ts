import { db } from '@/lib/supabase'
import { latestPerRoom, pairKey, putAnswerSame, putChatMember, putChatMessage, putChatSame, putJoin, putMember, putMessageSame, putPromptSame, putRsvp, type Cache } from './cache'
import { features } from './features'
import type {
  AnswerRow,
  AnswerSameRow,
  ChatMemberRow,
  ChatMessageRow,
  ChatRow,
  ChatSameRow,
  IntentJoinRow,
  IntentRow,
  MessageSameRow,
  ProfileRow,
  PromptSameRow,
  QuestionRow,
  RoomMemberRow,
  RoomMessageRow,
  RoomRow,
  RsvpRow,
  SessionRow,
} from './rows'
import { ONLINE_WINDOW_MIN } from './map'
import { isServerId } from './sample'
import { bangkokDate } from './time'

// Reads. Every function fills the cache it is given and leaves publishing
// to the caller.

type Res = PromiseLike<{ data: unknown; error: unknown }>

export const ROOM_HISTORY = 50
const CHAT_HISTORY = 200
const CHUNK = 80
/** the API's default cap on rows per response (anything past it is dropped silently) */
const PAGE = 1000

async function rows<T>(req: Res): Promise<T[]> {
  const { data, error } = await req
  if (error) throw error
  return (data ?? []) as T[]
}

/** Every row of a query, PAGE at a time. The query needs a stable (unique) order. */
async function allRows<T>(page: (from: number, to: number) => Res): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const part = await rows<T>(page(from, from + PAGE - 1))
    out.push(...part)
    if (part.length < PAGE) return out
  }
}

function slicesOf(ids: string[]): string[][] {
  const slices: string[][] = []
  for (let i = 0; i < ids.length; i += CHUNK) slices.push(ids.slice(i, i + CHUNK))
  return slices
}

/** `in (…)` filters in URL-sized slices, run in parallel. */
async function inChunks<T>(ids: string[], run: (slice: string[]) => Res): Promise<T[]> {
  const parts = await Promise.all(slicesOf(ids).map((s) => rows<T>(run(s))))
  return parts.flat()
}

/** inChunks for lists that can grow past PAGE rows per slice: each slice is paged. */
async function inChunksAll<T>(ids: string[], run: (slice: string[], from: number, to: number) => Res): Promise<T[]> {
  const parts = await Promise.all(slicesOf(ids).map((s) => allRows<T>((from, to) => run(s, from, to))))
  return parts.flat()
}

/** Everything the app shows right after sign-in. */
export async function loadAll(c: Cache): Promise<void> {
  const q = db()
  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  const [rooms, myMemberships, members, profiles, intents, sessions, questions, myChats, blocks] = await Promise.all([
    rows<RoomRow>(q.from('rooms').select('*').order('sort', { ascending: true })),
    // mine on their own: my room list must never depend on paging the whole table
    rows<RoomMemberRow>(q.from('room_members').select('room_id,user_id,role').eq('user_id', c.me)),
    allRows<RoomMemberRow>((from, to) => q.from('room_members').select('room_id,user_id,role').order('room_id').order('user_id').range(from, to)),
    rows<ProfileRow>(q.from('profiles').select('*').order('last_seen_at', { ascending: false }).limit(1000)),
    rows<IntentRow>(
      q.from('intents').select('*').eq('status', 'active').or(`expires_at.is.null,expires_at.gt."${nowIso}"`).order('created_at', { ascending: false }).limit(300),
    ),
    rows<SessionRow>(
      q
        .from('sessions')
        .select('*')
        .gte('starts_at', new Date(now - 6 * 3600_000).toISOString())
        .lte('starts_at', new Date(now + 8 * 86_400_000).toISOString())
        .order('starts_at'),
    ),
    rows<QuestionRow>(q.from('daily_questions').select('*').lte('day', bangkokDate(now)).order('day', { ascending: false }).limit(100)),
    rows<ChatMemberRow>(q.from('chat_members').select('*').eq('user_id', c.me)),
    rows<{ blocked: string }>(q.from('blocks').select('blocked').eq('blocker', c.me)),
  ])

  c.rooms = rooms
  blocks.forEach((b) => c.blocked.add(b.blocked))
  members.forEach((m) => putMember(c, m, true))
  myMemberships.forEach((m) => putMember(c, m, true))
  profiles.forEach((p) => c.profiles.set(p.id, p))
  intents.forEach((i) => c.intents.set(i.id, i))
  sessions.forEach((s) => c.sessions.set(s.id, s))
  c.questions = latestPerRoom(questions)

  const intentIds = intents.map((i) => i.id)
  const sessionIds = sessions.map((s) => s.id)
  const questionIds = [...c.questions.values()].map((x) => x.id)
  const chatIds = myChats.map((m) => m.chat_id)
  const myRooms = myMemberships.map((m) => m.room_id)

  const [joins, rsvps, answers, answerSames, chats, chatMembers, chatMsgs, promptSames] = await Promise.all([
    inChunksAll<IntentJoinRow>(intentIds, (s, from, to) =>
      q.from('intent_joins').select('intent_id,user_id').in('intent_id', s).order('intent_id').order('user_id').range(from, to),
    ),
    inChunksAll<RsvpRow>(sessionIds, (s, from, to) =>
      q.from('session_rsvps').select('session_id,user_id').in('session_id', s).order('session_id').order('user_id').range(from, to),
    ),
    inChunksAll<AnswerRow>(questionIds, (s, from, to) =>
      q.from('daily_answers').select('*').in('question_id', s).order('created_at').order('question_id').order('user_id').range(from, to),
    ),
    inChunksAll<AnswerSameRow>(questionIds, (s, from, to) =>
      q
        .from('daily_answer_sames')
        .select('question_id,answer_user_id,user_id')
        .in('question_id', s)
        .order('question_id')
        .order('answer_user_id')
        .order('user_id')
        .range(from, to),
    ),
    inChunks<ChatRow>(chatIds, (s) => q.from('chats').select('*').in('id', s)),
    inChunks<ChatMemberRow>(chatIds, (s) => q.from('chat_members').select('*').in('chat_id', s)),
    inChunks<ChatMessageRow>(chatIds, (s) => q.from('chat_messages').select('*').in('chat_id', s).order('created_at', { ascending: false }).limit(1000)),
    loadPromptSames(),
    ...myRooms.map((r) => loadRoomHistory(c, r)),
  ])

  joins.forEach((j) => putJoin(c, j, true))
  rsvps.forEach((r) => putRsvp(c, r, true))
  answers.forEach((a) => c.answers.set(pairKey(a.question_id, a.user_id), a))
  answerSames.forEach((s) => putAnswerSame(c, s, true))
  chats.forEach((ch) => c.chats.set(ch.id, ch))
  chatMembers.forEach((m) => putChatMember(c, m, true))
  chatMsgs.forEach((m) => putChatMessage(c, m))
  promptSames?.forEach((r) => putPromptSame(c, r, true))
  features.promptSames = !!promptSames

  const msgIds = chatMsgs.map((m) => m.id)
  const sames = await inChunks<ChatSameRow>(msgIds, (s) => q.from('chat_message_sames').select('id,message_id,user_id').in('message_id', s))
  sames.forEach((s) => putChatSame(c, s, true))

  // people I chat with, post authors, answerers and who joined my posts may be outside the
  // newest 1000 profiles; ids the server won't return are a block relation and become hidden
  const mine = new Set(intents.filter((i) => i.user_id === c.me).map((i) => i.id))
  await ensureProfiles(c, [
    ...chatMembers.map((m) => m.user_id),
    ...intents.map((i) => i.user_id),
    ...answers.map((a) => a.user_id),
    ...joins.filter((j) => mine.has(j.intent_id)).map((j) => j.user_id),
    ...(promptSames ?? []).filter((r) => r.profile_id === c.me).map((r) => r.user_id),
  ])
}

/**
 * Story reactions I gave or got (RLS returns only those). undefined: the table isn't there
 * yet (20261108000003_live_reactions.sql hasn't run), so they stay on this device as before.
 */
async function loadPromptSames(): Promise<PromptSameRow[] | undefined> {
  try {
    return await allRows<PromptSameRow>((from, to) => db().from('prompt_sames').select('id,profile_id,prompt_key,user_id').order('id').range(from, to))
  } catch (err) {
    // only "no such table" means it isn't set up yet; anything else is a failed load (retried like the rest)
    const code = (err as { code?: string } | null)?.code
    if (code !== 'PGRST205' && code !== '42P01') throw err
    console.info('[moshi] story reactions stay on this device until prompt_sames is set up', err)
    return undefined
  }
}

/**
 * Who has been around lately (the online dots): fresh last_seen_at for people we know,
 * whole profiles for newcomers. Returns true if anything changed.
 */
export async function loadRecentlySeen(c: Cache): Promise<boolean> {
  const since = new Date(Date.now() - ONLINE_WINDOW_MIN * 60_000).toISOString()
  const list = await rows<Pick<ProfileRow, 'id' | 'last_seen_at'>>(
    db().from('profiles').select('id,last_seen_at').gt('last_seen_at', since).order('last_seen_at', { ascending: false }).limit(PAGE),
  )
  let changed = false
  const unknown: string[] = []
  for (const r of list) {
    const p = c.profiles.get(r.id)
    if (!p) unknown.push(r.id)
    else if (p.last_seen_at !== r.last_seen_at) {
      c.profiles.set(r.id, { ...p, last_seen_at: r.last_seen_at })
      changed = true
    }
  }
  return (await ensureProfiles(c, unknown)) || changed
}

/** The last ROOM_HISTORY messages of a room (+ their "เหมือนกัน!"s). */
export async function loadRoomHistory(c: Cache, roomId: string): Promise<RoomMessageRow[]> {
  const q = db()
  const list = await rows<RoomMessageRow>(
    q.from('room_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: false }).limit(ROOM_HISTORY),
  )
  const sames = await inChunksAll<MessageSameRow>(
    list.map((m) => m.id),
    (s, from, to) => q.from('room_message_sames').select('message_id,user_id').in('message_id', s).order('message_id').order('user_id').range(from, to),
  )
  const map = c.roomMsgs.get(roomId) ?? new Map<string, RoomMessageRow>()
  list.forEach((m) => {
    map.set(m.id, m)
    c.msgRoom.set(m.id, roomId)
  })
  c.roomMsgs.set(roomId, map)
  sames.forEach((s) => putMessageSame(c.roomSames, s, true))
  // reactors too: a block either way hides them, and the ones we know get their faces
  await ensureProfiles(c, [...list.map((m) => m.user_id ?? ''), ...sames.map((s) => s.user_id)])
  return list
}

/** One chat with its members, recent messages and reactions (e.g. a new moshi). */
export async function loadChat(c: Cache, chatId: string): Promise<boolean> {
  const q = db()
  const [chat, members, msgs] = await Promise.all([
    rows<ChatRow>(q.from('chats').select('*').eq('id', chatId).limit(1)),
    rows<ChatMemberRow>(q.from('chat_members').select('*').eq('chat_id', chatId)),
    rows<ChatMessageRow>(q.from('chat_messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: false }).limit(CHAT_HISTORY)),
  ])
  if (!chat[0]) return false
  const sames = await inChunks<ChatSameRow>(
    msgs.map((m) => m.id),
    (s) => q.from('chat_message_sames').select('id,message_id,user_id').in('message_id', s),
  )
  c.chats.set(chatId, chat[0])
  members.forEach((m) => putChatMember(c, m, true))
  msgs.forEach((m) => putChatMessage(c, m))
  sames.forEach((s) => putChatSame(c, s, true))
  await ensureProfiles(
    c,
    members.map((m) => m.user_id),
  )
  return true
}

/**
 * Fetch profiles we haven't seen yet (new members, chat partners). Ids the
 * server won't return are in a block relation with me and become `hidden`.
 * Returns true if anything changed.
 */
export async function ensureProfiles(c: Cache, ids: string[]): Promise<boolean> {
  const missing = [...new Set(ids)].filter((id) => isServerId(id) && !c.profiles.has(id) && !c.hidden.has(id))
  if (!missing.length) return false
  const q = db()
  const found = await inChunks<ProfileRow>(missing, (s) => q.from('profiles').select('*').in('id', s))
  found.forEach((p) => c.profiles.set(p.id, p))
  missing.filter((id) => !c.profiles.has(id)).forEach((id) => c.hidden.add(id))
  return true
}
