import type { Database } from '@/lib/database.types'
import { db } from '@/lib/supabase'
import { CHAT_IMAGES, LINK_SECONDS } from '@/data/chatImages'
import type { AnswerRow, BlockedPersonRow, ChatMemberRow, ChatMessageRow, IntentRow, ProfileRow, PromptSameRow, RoomMemberRow, RoomMessageRow } from './rows'

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

/** When my suspension ends (null when I'm not suspended). Only I can read it, never other people. */
export async function mySuspendedUntil(): Promise<string | null> {
  return check(await db().rpc('my_suspended_until')) ?? null
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

/** An edited post. expires_at null lets the database count its time again from the new "when". */
export async function updateIntent(id: string, cols: Update<'intents'>): Promise<IntentRow> {
  const res = await db().from('intents').update(cols).eq('id', id).select().single()
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
  | { kind: 'prompt'; profileId: string; promptKey: string }

/** Returns the stored row for a story reaction (its id lets a realtime delete find it later). */
export async function setSame(target: SameTarget, userId: string, on: boolean): Promise<PromptSameRow | null> {
  const q = db()
  if (target.kind === 'prompt') {
    const row = { profile_id: target.profileId, prompt_key: target.promptKey, user_id: userId }
    if (!on) {
      check(await q.from('prompt_sames').delete().match(row))
      return row
    }
    const saved = check(
      await q
        .from('prompt_sames')
        .upsert(row as Insert<'prompt_sames'>, { onConflict: 'profile_id,prompt_key,user_id', ignoreDuplicates: true })
        .select('id,profile_id,prompt_key,user_id'),
    ) as PromptSameRow[] | null
    return saved?.[0] ?? row
  }
  if (target.kind === 'answer') {
    const row = { question_id: target.questionId, answer_user_id: target.answerUserId, user_id: userId }
    check(
      on
        ? await q.from('daily_answer_sames').upsert(row as Insert<'daily_answer_sames'>, { onConflict: 'question_id,answer_user_id,user_id', ignoreDuplicates: true })
        : await q.from('daily_answer_sames').delete().match(row),
    )
    return null
  }
  const table = target.kind === 'room' ? 'room_message_sames' : 'chat_message_sames'
  const row = { message_id: target.messageId, user_id: userId }
  check(
    on
      ? await q.from(table).upsert(row as Insert<typeof table>, { onConflict: 'message_id,user_id', ignoreDuplicates: true })
      : await q.from(table).delete().match(row),
  )
  return null
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

/** Only my own blocks can go (blocks_delete). Unblocking twice deletes nothing, which is no error. */
export async function unblockUser(blocker: string, blocked: string) {
  check(await db().from('blocks').delete().eq('blocker', blocker).eq('blocked', blocked))
}

/**
 * The people I blocked, newest first, with the name and look the profiles table won't show me
 * (my_blocked_people, 20261108000006_rooms_and_blocks.sql). A database without that file yet:
 * my blocks rows alone, without names, so the list still opens.
 */
export async function myBlockedPeople(): Promise<BlockedPersonRow[]> {
  const res = await db().rpc('my_blocked_people')
  if (!res.error) return (res.data ?? []) as BlockedPersonRow[]
  const code = (res.error as { code?: string }).code
  if (code !== 'PGRST202' && code !== '42883') throw res.error
  const rows = check(await db().from('blocks').select('blocked, created_at').order('created_at', { ascending: false })) as
    | { blocked: string; created_at: string }[]
    | null
  return (rows ?? []).map((b) => ({ user_id: b.blocked, name: null, color: null, face: null, accessory: null, blocked_at: b.created_at }))
}

/** Am I in this room as the server has it? Room lines need it (20261108000006_rooms_and_blocks.sql). */
export async function isRoomMember(roomId: string, userId: string): Promise<boolean> {
  return !!check(await db().from('room_members').select('room_id').eq('room_id', roomId).eq('user_id', userId).maybeSingle())
}

/** บันไดความไว้ใจ ขั้น 2: my own yes/no to photos in this chat (returns my updated row). */
export async function setMediaConsent(chatId: string, userId: string, on: boolean): Promise<ChatMemberRow> {
  const res = await db()
    .from('chat_members')
    .update({ consent_media: on } as Update<'chat_members'>)
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .select()
    .single()
  return check(res) as ChatMemberRow
}

export async function uploadChatImage(path: string, blob: Blob) {
  // browsers and the CDN keep a copy no longer than a signed link lives (not after an unsend)
  const { error } = await db().storage.from(CHAT_IMAGES).upload(path, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: String(LINK_SECONDS) })
  if (error) throw error
}

/**
 * Best effort: a file left behind is only wasted space (the bucket is private, and once no
 * message points at it only its sender can open it). While a report about the photo is open
 * the server keeps the file for the team: remove() then deletes nothing, which is no error.
 */
export async function removeChatImageFile(path: string) {
  const { error } = await db().storage.from(CHAT_IMAGES).remove([path])
  if (error) console.warn('[moshi] could not remove a chat photo', error)
}

/** Can I still see this person? Not across a block (either way), nor once their account is gone. */
export async function canSeeProfile(id: string): Promise<boolean> {
  return !!check(await db().from('profiles').select('id').eq('id', id).maybeSingle())
}

/** A chat as the server has it now: still active, and both people said yes to photos (null: not found). */
export async function chatPhotoState(chatId: string): Promise<{ active: boolean; bothSaidYes: boolean } | null> {
  const res = await db().from('chats').select('status, chat_members(consent_media)').eq('id', chatId).maybeSingle()
  const row = check(res) as { status: string; chat_members: { consent_media: boolean | null }[] } | null
  if (!row) return null
  const members = row.chat_members ?? []
  return { active: row.status === 'active', bothSaidYes: members.length > 0 && members.every((m) => !!m.consent_media) }
}

export async function insertChatImage(chatId: string, userId: string, path: string): Promise<ChatMessageRow> {
  const res = await db()
    .from('chat_messages')
    .insert({ chat_id: chatId, user_id: userId, kind: 'image', body: path } as Insert<'chat_messages'>)
    .select()
    .single()
  return check(res) as ChatMessageRow
}

export async function deleteChatMessage(id: string) {
  check(await db().from('chat_messages').delete().eq('id', id))
}

/** A report about one chat message (the server copies the message and its author). */
export async function reportChatMessage(messageId: string, reason: string, details?: string) {
  check(await db().from('reports').insert({ chat_message_id: messageId, reason, details: details ?? null } as Insert<'reports'>))
}

/**
 * A report about one line in a room's chat. Insert only, no .select(): nobody reads reports back.
 * The server copies the line, its author (target_user) and the room's name.
 */
export async function reportRoomMessage(reporter: string, messageId: string, reason: string, details?: string) {
  // no id yet (still signing in): the column's default is the signed-in user anyway
  const who = reporter ? { reporter } : {}
  check(await db().from('reports').insert({ ...who, room_message_id: messageId, reason, details: details ?? null } as Insert<'reports'>))
}

export async function reportUser(target: string, reason: string, details?: string) {
  check(await db().from('reports').insert({ target_user: target, reason, details: details ?? null } as Insert<'reports'>))
}

export async function setMoshiPolicy(id: string, policy: 'everyone' | 'rooms' | 'chatted') {
  check(await db().from('profiles').update({ moshi_policy: policy } as Update<'profiles'>).eq('id', id))
}
