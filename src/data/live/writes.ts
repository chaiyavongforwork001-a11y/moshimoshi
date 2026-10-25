import type { Database } from '@/lib/database.types'
import { db } from '@/lib/supabase'
import type { AnswerRow, ChatMessageRow, IntentRow, ProfileRow, RoomMemberRow, RoomMessageRow } from './rows'

// Thin Supabase writes for the store actions. Each one throws on failure so
// the caller can roll its optimistic update back.

type Tables = Database['public']['Tables']
type Insert<T extends keyof Tables> = Tables[T]['Insert']
type Update<T extends keyof Tables> = Tables[T]['Update']

function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error
  return res.data
}

export async function saveProfile(id: string, patch: Record<string, unknown>): Promise<ProfileRow> {
  const res = await db()
    .from('profiles')
    .upsert({ ...patch, id } as Insert<'profiles'>, { onConflict: 'id' })
    .select()
    .single()
  return check(res) as ProfileRow
}

export async function touchLastSeen(id: string) {
  check(await db().from('profiles').update({ last_seen_at: new Date().toISOString() } as Update<'profiles'>).eq('id', id))
}

export async function joinRoom(roomId: string, userId: string): Promise<RoomMemberRow> {
  const res = await db()
    .from('room_members')
    .upsert({ room_id: roomId, user_id: userId } as Insert<'room_members'>, { onConflict: 'room_id,user_id', ignoreDuplicates: true })
    .select()
  const rows = (check(res) ?? []) as RoomMemberRow[]
  return rows[0] ?? { room_id: roomId, user_id: userId, role: 'member' }
}

export async function leaveRoom(roomId: string, userId: string) {
  check(await db().from('room_members').delete().eq('room_id', roomId).eq('user_id', userId))
}

export async function insertIntent(cols: Omit<Insert<'intents'>, 'user_id'>, userId: string): Promise<IntentRow> {
  const res = await db()
    .from('intents')
    .insert({ ...cols, user_id: userId } as Insert<'intents'>)
    .select()
    .single()
  return check(res) as IntentRow
}

export async function setIntentStatus(id: string, status: 'active' | 'paused' | 'fulfilled' | 'expired'): Promise<IntentRow> {
  const res = await db().from('intents').update({ status } as Update<'intents'>).eq('id', id).select().single()
  return check(res) as IntentRow
}

export async function deleteIntent(id: string) {
  check(await db().from('intents').delete().eq('id', id))
}

export async function joinIntent(intentId: string, userId: string) {
  check(
    await db()
      .from('intent_joins')
      .upsert({ intent_id: intentId, user_id: userId } as Insert<'intent_joins'>, { onConflict: 'intent_id,user_id', ignoreDuplicates: true }),
  )
}

export async function leaveIntent(intentId: string, userId: string) {
  check(await db().from('intent_joins').delete().eq('intent_id', intentId).eq('user_id', userId))
}

export async function rsvp(sessionId: string, userId: string) {
  check(
    await db()
      .from('session_rsvps')
      .upsert({ session_id: sessionId, user_id: userId } as Insert<'session_rsvps'>, { onConflict: 'session_id,user_id', ignoreDuplicates: true }),
  )
}

export async function unrsvp(sessionId: string, userId: string) {
  check(await db().from('session_rsvps').delete().eq('session_id', sessionId).eq('user_id', userId))
}

export async function insertRoomMessage(roomId: string, userId: string, body: string): Promise<RoomMessageRow> {
  const res = await db()
    .from('room_messages')
    .insert({ room_id: roomId, user_id: userId, body } as Insert<'room_messages'>)
    .select()
    .single()
  return check(res) as RoomMessageRow
}

export async function insertChatMessage(chatId: string, userId: string, body: string): Promise<ChatMessageRow> {
  const res = await db()
    .from('chat_messages')
    .insert({ chat_id: chatId, user_id: userId, body } as Insert<'chat_messages'>)
    .select()
    .single()
  return check(res) as ChatMessageRow
}

export async function upsertAnswer(questionId: string, userId: string, body: string): Promise<AnswerRow> {
  const res = await db()
    .from('daily_answers')
    .upsert({ question_id: questionId, user_id: userId, body } as Insert<'daily_answers'>, { onConflict: 'question_id,user_id' })
    .select()
    .single()
  return check(res) as AnswerRow
}

export type SameTarget =
  | { kind: 'room'; messageId: string }
  | { kind: 'chat'; messageId: string }
  | { kind: 'answer'; questionId: string; answerUserId: string }

export async function setSame(target: SameTarget, userId: string, on: boolean) {
  const q = db()
  if (target.kind === 'answer') {
    const row = { question_id: target.questionId, answer_user_id: target.answerUserId, user_id: userId }
    check(
      on
        ? await q.from('daily_answer_sames').upsert(row as Insert<'daily_answer_sames'>, { onConflict: 'question_id,answer_user_id,user_id', ignoreDuplicates: true })
        : await q.from('daily_answer_sames').delete().match(row),
    )
    return
  }
  const table = target.kind === 'room' ? 'room_message_sames' : 'chat_message_sames'
  const row = { message_id: target.messageId, user_id: userId }
  check(
    on
      ? await q.from(table).upsert(row as Insert<typeof table>, { onConflict: 'message_id,user_id', ignoreDuplicates: true })
      : await q.from(table).delete().match(row),
  )
}

export async function sendMoshi(target: string, opener: string): Promise<string> {
  const res = await db().rpc('send_moshi', { target, opener })
  return check(res) as string
}

export async function respondMoshi(chatId: string, accept: boolean) {
  check(await db().rpc('respond_moshi', { p_chat: chatId, accept }))
}

export async function markChatRead(chatId: string) {
  check(await db().rpc('mark_chat_read', { p_chat: chatId }))
}

export async function blockUser(blocker: string, blocked: string) {
  check(
    await db()
      .from('blocks')
      .upsert({ blocker, blocked } as Insert<'blocks'>, { onConflict: 'blocker,blocked', ignoreDuplicates: true }),
  )
}

export async function reportUser(target: string, reason: string, details?: string) {
  check(await db().from('reports').insert({ target_user: target, reason, details: details ?? null } as Insert<'reports'>))
}

export async function setMoshiPolicy(id: string, policy: 'everyone' | 'rooms' | 'chatted') {
  check(await db().from('profiles').update({ moshi_policy: policy } as Update<'profiles'>).eq('id', id))
}
