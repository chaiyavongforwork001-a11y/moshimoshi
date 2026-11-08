import { known, t } from '@/lib/i18n'
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

/** The chat a "ทักแชท" button opens instead of a new hello (undefined = send one). Only a hello they sent and we set aside can be answered with a new one. */
export function chatToOpen(chats: Chat[], userId: string): Chat | undefined {
  return chats.find((c) => c.withUserId === userId && !(c.status === 'ended' && c.requestedBy === userId))
}

/** They said hi, we said "ไว้ก่อน", and we never wrote anything: hide it from our list. */
export function setAside(chat: Chat, isMine: (id: string) => boolean): boolean {
  return chat.status === 'ended' && chat.requestedBy === chat.withUserId && !chat.messages.some((m) => isMine(m.userId))
}

export function lastMessage(chat: Chat): ChatMessage | undefined {
  return chat.messages[chat.messages.length - 1]
}

/**
 * A system line in the current language. System lines are stored in Thai
 * (the store's "ส่งข้อความทักแล้ว…", the server's lines, the demo "<name>ตอบรับแล้ว…"),
 * so they're translated only here, where they're shown.
 */
export function systemText(text: string): string {
  // the demo line, also as it was stored back when hellos were "calls"
  const accepted = /^(.+)(?:รับสาย|ตอบรับ)แล้ว! คุยกันได้เลย$/.exec(text)
  if (accepted) return t(`${accepted[1]}ตอบรับแล้ว! คุยกันได้เลย`, `${accepted[1]} accepted! Chat away`)
  // the lines the server writes (respond_moshi) are in known(); older ones read in today's words
  return known(OLD_LINES[text] ?? text)
}

/** System lines stored before a hello stopped being called a "moshi" (a call), as they read now. */
const OLD_LINES: Record<string, string> = {
  'ส่งโมชิแล้ว! รอเขาตอบรับนะ': 'ส่งข้อความทักแล้ว! รอเขาตอบรับนะ',
  'ตอบรับโมชิแล้ว เริ่มคุยกันได้เลย!': 'ตอบรับคำทักแล้ว เริ่มแชทกันได้เลย!',
}

export function previewText(chat: Chat, isMine: (id: string) => boolean = (id) => id === 'me'): string {
  const m = lastMessage(chat)
  if (!m) return t('ยังไม่มีข้อความ ทักก่อนเลย', 'No messages yet. Say hi first!')
  if (m.kind === 'system' || m.userId === 'system') return systemText(m.text)
  if (m.kind === 'image') return isMine(m.userId) ? t('เรา: 📷 รูปภาพ', 'You: 📷 Photo') : t('📷 ส่งรูปมา', '📷 Sent a photo')
  return isMine(m.userId) ? t(`เรา: ${m.text}`, `You: ${m.text}`) : m.text
}
