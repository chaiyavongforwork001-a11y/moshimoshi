import type { Database } from '@/lib/database.types'
import { t } from '@/lib/i18n'
import { CHAT_IMAGES, forgetImageLink, isChatImagePath } from '@/data/chatImages'
import { db } from '@/lib/supabase'
import type { MochiColor } from '@/lib/types'

// Admin RPCs from supabase/migrations/20261025000002_admin.sql (typed in database.types.ts).

export type ReportStatus = 'open' | 'resolved' | 'dismissed'
export type Closing = Exclude<ReportStatus, 'open'>

export interface Person {
  id: string
  name: string
  color: MochiColor
}

export interface Target extends Person {
  /** reports about this person filed before this one */
  priorReports: number
  suspendedUntil: string | null
}

export interface ReportedMessage {
  /** room_messages.id: set only while the room message still exists */
  roomMessageId: string | null
  /** chat_messages.id: set only while the chat message still exists */
  chatMessageId: string | null
  /** a reported photo: its path in the chat-images bucket (the body is that path) */
  image: string | null
  body: string
  kind: 'room' | 'chat'
  roomId: string | null
  /** room name, or 'แชทส่วนตัว' */
  context: string | null
  /** staff: turned into a staff notice (the row stays) · author: deleted, so both ids went null */
  removedBy: 'staff' | 'author' | null
  /**
   * The photo's file was deleted from this console (only known here: after a reload a missing
   * file simply won't open). A photo that left the chat can leave its file behind: the server
   * keeps it while a report about it is open, and a takedown can fail halfway.
   */
  fileGone?: boolean
}

export interface AdminReport {
  id: string
  status: ReportStatus
  reason: string
  details: string | null
  createdAt: string
  reporter: Person | null
  target: Target | null
  message: ReportedMessage | null
  resolvedAt: string | null
  resolverName: string | null
  note: string | null
}

export type AdminStats = { key: string; value: number }[]

/** one row of admin_list_reports */
type ReportRow = Database['public']['Functions']['admin_list_reports']['Returns'][number]

// ------------------------------------------------------------------ calls

function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error
  return res.data
}

export async function isAdmin(): Promise<boolean> {
  return check(await db().rpc('is_admin')) === true
}

export async function fetchStats(): Promise<AdminStats> {
  const rows = check(await db().rpc('admin_stats'))
  return toStats(rows?.[0] ?? {})
}

export async function listReports(status: ReportStatus): Promise<AdminReport[]> {
  const rows = check(await db().rpc('admin_list_reports', { p_status: status, p_limit: 100 }))
  return (rows ?? []).map(toReport)
}

export async function deleteRoomMessage(messageId: string) {
  check(await db().rpc('admin_delete_room_message', { p_message: messageId }))
}

/** What became of a reported photo's file: deleted now, kept by the server, or gone already. */
export type FileOutcome = 'deleted' | 'kept' | 'gone'

/**
 * A reported photo comes down: the message becomes a staff notice, then the file goes.
 * Resolves to what became of the file, or 'failed' when deleting it didn't work (the message
 * is down either way).
 */
export async function removeChatImage(messageId: string): Promise<FileOutcome | 'failed'> {
  const path = check(await db().rpc('admin_remove_chat_image', { p_message: messageId }))
  if (!path) return 'gone'
  try {
    return await removeReportedFile(path)
  } catch (e) {
    console.warn('[moshi] the photo message is down, the file stayed', e)
    return 'failed'
  }
}

/**
 * Deletes a reported photo's file through the Storage API (admins may delete the photos that
 * are in a report). remove() answers an empty list with no error both when the file was gone
 * already and when the server keeps it (an open report about that photo targets this admin),
 * so an empty answer is checked: 'kept' means the file is still stored.
 */
export async function removeReportedFile(path: string): Promise<FileOutcome> {
  const bucket = db().storage.from(CHAT_IMAGES)
  const { data, error } = await bucket.remove([path])
  if (error) throw error
  forgetImageLink(path)
  if (data?.length) return 'deleted'
  const { data: still } = await bucket.exists(path)
  return still ? 'kept' : 'gone'
}

/** Resolves to the new suspended_until. */
export async function suspendUser(userId: string, days: number, reason: string): Promise<string | null> {
  return check(await db().rpc('admin_suspend_user', { p_user: userId, p_days: days, p_reason: reason }))
}

/** p_days 0 lifts the suspension. */
export async function unsuspendUser(userId: string) {
  check(await db().rpc('admin_suspend_user', { p_user: userId, p_days: 0 }))
}

/** A null note is left out, which keeps the old one; '' clears it. */
export async function resolveReport(reportId: string, status: Closing, note: string | null) {
  check(await db().rpc('admin_resolve_report', { p_report: reportId, p_status: status, ...(note === null ? {} : { p_note: note }) }))
}

// ------------------------------------------------------------------ mapping

const COLORS: readonly MochiColor[] = ['peach', 'butter', 'mint', 'lavender', 'sky', 'pink', 'cream']
const STATUSES: readonly ReportStatus[] = ['open', 'resolved', 'dismissed']
// the SQL's message_context for 1:1 chats (a stored value, compared as is)
const PRIVATE_CHAT = 'แชทส่วนตัว'

const asColor = (v: string | null, fallback: MochiColor): MochiColor => (COLORS.includes(v as MochiColor) ? (v as MochiColor) : fallback)

function toMessage(r: ReportRow): ReportedMessage | null {
  if (!r.message_body && !r.room_message_id && !r.chat_message_id) return null
  // both ids go null when the author deletes the message; the context still tells which kind it was
  const kind = r.room_message_id ? 'room' : r.chat_message_id || r.message_context === PRIVATE_CHAT ? 'chat' : 'room'
  const body = r.message_body ?? ''
  return {
    roomMessageId: r.room_message_id,
    chatMessageId: r.chat_message_id,
    image: kind === 'chat' && isChatImagePath(body) ? body : null,
    body,
    kind,
    roomId: r.room_id,
    context: r.message_context,
    // a removed message whose row is still there was turned into a staff notice
    removedBy: !r.message_removed ? null : r.room_message_id || r.chat_message_id ? 'staff' : 'author',
  }
}

function toReport(r: ReportRow): AdminReport {
  return {
    id: r.id,
    status: STATUSES.includes(r.status as ReportStatus) ? (r.status as ReportStatus) : 'open',
    reason: r.reason,
    details: r.details,
    createdAt: r.created_at,
    reporter: r.reporter ? { id: r.reporter, name: r.reporter_name ?? t('ไม่มีชื่อ', 'No name'), color: 'cream' } : null,
    target: r.target_user
      ? {
          id: r.target_user,
          name: r.target_name ?? t('ไม่มีชื่อ', 'No name'),
          color: asColor(r.target_color, 'sky'),
          priorReports: r.prior_reports ?? 0,
          suspendedUntil: r.target_suspended_until,
        }
      : null,
    message: toMessage(r),
    resolvedAt: r.resolved_at,
    resolverName: r.resolver_name,
    note: r.resolution_note,
  }
}

const STAT_ORDER = ['open_reports', 'users', 'active_24h', 'messages_24h']

/** admin_stats' counters in a fixed order; anything the SQL adds later follows them. */
function toStats(row: Record<string, unknown>): AdminStats {
  const keys = [...STAT_ORDER.filter((k) => k in row), ...Object.keys(row).filter((k) => !STAT_ORDER.includes(k))]
  return keys.flatMap((key) => {
    const value = Number(row[key])
    return row[key] !== null && typeof row[key] !== 'boolean' && Number.isFinite(value) ? [{ key, value }] : []
  })
}
