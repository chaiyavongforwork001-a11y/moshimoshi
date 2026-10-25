import type { Chat, ChatMessage } from '@/lib/types'

export type { ChatStatus } from '@/lib/types'

/**
 * ringing  = we sent a moshi, they haven't picked up
 * incoming = they sent us a moshi, waiting for our answer
 * ended    = the call is over (declined looks the same as ended, on purpose)
 * open     = talking
 */
export type ChatPhase = 'ringing' | 'incoming' | 'ended' | 'open'

/** A moshi we sent that the other person hasn't picked up yet (demo: read from the system line). */
export function isWaiting(chat: Chat): boolean {
  let sys = -1
  chat.messages.forEach((m, i) => {
    if (m.kind === 'system') sys = i
  })
  if (sys < 0 || !chat.messages[sys].text.includes('รอ')) return false
  return !chat.messages.slice(sys + 1).some((m) => m.userId === chat.withUserId)
}

export function chatPhase(chat: Chat): ChatPhase {
  if (!chat.status) return isWaiting(chat) ? 'ringing' : 'open'
  if (chat.status === 'active') return 'open'
  if (chat.status === 'ended') return 'ended'
  return chat.requestedBy === chat.withUserId ? 'incoming' : 'ringing'
}

/** The chat a "ส่งโมชิ" button opens instead of ringing (undefined = ring). Only a call they rang and we closed can ring again. */
export function chatToOpen(chats: Chat[], userId: string): Chat | undefined {
  return chats.find((c) => c.withUserId === userId && !(c.status === 'ended' && c.requestedBy === userId))
}

/** They rang, we said "ไว้ก่อน", and we never wrote anything: hide it from our list. */
export function setAside(chat: Chat, isMine: (id: string) => boolean): boolean {
  return chat.status === 'ended' && chat.requestedBy === chat.withUserId && !chat.messages.some((m) => isMine(m.userId))
}

export function lastMessage(chat: Chat): ChatMessage | undefined {
  return chat.messages[chat.messages.length - 1]
}

export function previewText(chat: Chat, isMine: (id: string) => boolean = (id) => id === 'me'): string {
  const m = lastMessage(chat)
  if (!m) return 'ยังไม่มีข้อความ ทักก่อนเลย'
  return isMine(m.userId) ? `เรา: ${m.text}` : m.text
}
