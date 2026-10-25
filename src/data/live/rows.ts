// Row shapes of the public schema as this client reads them. They mirror the
// database contract; '@/lib/database.types' is the generated source of truth
// for the typed client, these stay narrow so mapping code reads cleanly.
import type { ChatStatus } from '@/lib/types'

export type { ChatStatus }
export type MoshiPolicy = 'everyone' | 'rooms' | 'chatted'

export interface ProfileRow {
  id: string
  name: string
  color: string | null
  face: string | null
  accessory: string | null
  province: string | null
  bio: string | null
  birth_year: number | null
  tags: string[] | null
  loves: string[] | null
  prompts: unknown
  chat_style: string[] | null
  online: string[] | null
  languages: string[] | null
  is_host: boolean | null
  onboarded: boolean | null
  moshi_policy: string | null
  last_seen_at: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface RoomRow {
  id: string
  name: string
  icon: string | null
  color: string | null
  tagline: string | null
  vibe: string | null
  tags: string[] | null
  prime_time: string | null
  is_lobby: boolean | null
  sort: number | null
}

export interface RoomMemberRow {
  room_id: string
  user_id: string
  role: string | null
  joined_at?: string | null
}

export interface RoomMessageRow {
  id: string
  room_id: string
  user_id: string | null
  body: string
  kind: string | null
  created_at: string
}

export interface MessageSameRow {
  message_id: string
  user_id: string
}

export interface SessionRow {
  id: string
  room_id: string
  title: string
  starts_at: string
  duration_min: number | null
  host_id: string | null
  host_name: string | null
}

export interface RsvpRow {
  session_id: string
  user_id: string
}

export interface QuestionRow {
  id: string
  room_id: string
  body: string
  day: string
}

export interface AnswerRow {
  question_id: string
  user_id: string
  body: string
  created_at?: string | null
}

export interface AnswerSameRow {
  question_id: string
  answer_user_id: string
  user_id: string
}

export interface IntentRow {
  id: string
  user_id: string
  template: string
  role: string
  tag_id: string
  body: string
  when_kind: string
  when_label: string | null
  mode: string
  province: string | null
  slots: number | null
  give: string | null
  want: string | null
  room_id: string | null
  status: string | null
  expires_at: string | null
  created_at: string
}

export interface IntentJoinRow {
  intent_id: string
  user_id: string
}

export interface ChatRow {
  id: string
  requested_by: string
  status: string
  icebreaker: string | null
  created_at: string
}

export interface ChatMemberRow {
  chat_id: string
  user_id: string
  last_read_at: string | null
  consent_media?: boolean | null
}

export interface ChatMessageRow {
  id: string
  chat_id: string
  user_id: string | null
  body: string
  kind: string | null
  created_at: string
}

/** Tables the client keeps a local copy of (initial load + realtime + own writes). */
export interface TableRows {
  profiles: ProfileRow
  room_members: RoomMemberRow
  room_messages: RoomMessageRow
  room_message_sames: MessageSameRow
  session_rsvps: RsvpRow
  daily_answers: AnswerRow
  daily_answer_sames: AnswerSameRow
  intents: IntentRow
  intent_joins: IntentJoinRow
  chats: ChatRow
  chat_members: ChatMemberRow
  chat_messages: ChatMessageRow
  chat_message_sames: MessageSameRow
}

export type LiveTable = keyof TableRows

export type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE'

/** One row-level change, from realtime or from one of our own writes. */
export type Change = {
  [T in LiveTable]: { table: T; type: ChangeType; row: TableRows[T] }
}[LiveTable]
