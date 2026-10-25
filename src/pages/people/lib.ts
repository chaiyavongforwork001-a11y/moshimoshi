import { useCallback } from 'react'
import { useMoshi } from '@/lib/store'
import type { IntentTemplate, IntentWhen, MochiColor, User } from '@/lib/types'

export const COLOR_NAME: Record<MochiColor, string> = {
  peach: 'พีช',
  butter: 'เนย',
  mint: 'มิ้นต์',
  lavender: 'ลาเวนเดอร์',
  sky: 'ฟ้า',
  pink: 'ชมพู',
  cream: 'ครีม',
}

/** Relative age only, never the exact number. */
export function ageLabel(myAge: number, theirAge: number): string {
  if (!myAge || !theirAge) return 'เพื่อนใหม่'
  const d = theirAge - myAge
  if (Math.abs(d) <= 2) return 'รุ่นเดียวกัน'
  return d > 0 ? 'รุ่นพี่' : 'รุ่นน้อง'
}

export function statusLabel(u: User): string {
  return u.isOnline ? 'ออนไลน์อยู่' : `แวะมาล่าสุด ${u.lastActive}`
}

export const WHEN_LABEL: Record<IntentWhen, string> = {
  tonight: 'คืนนี้',
  weekend: 'สุดสัปดาห์นี้',
  anytime: 'ว่างเมื่อไหร่ก็ได้',
  dated: 'นัดวันไว้แล้ว',
}

export const TEMPLATE_LABEL: Record<IntentTemplate, string> = {
  play: 'หาเพื่อนเล่น',
  talk: 'หาคนคุยด้วย',
  lang: 'แลกภาษา',
  event: 'หาเพื่อนไปงาน',
  newbie: 'มือใหม่',
  study: 'นั่งทำงานด้วยกัน',
  moved: 'เพิ่งย้ายมา',
  listen: 'รับฟัง',
}

/**
 * Is this record mine? Demo data uses 'me'; live rows may carry my auth id,
 * so pages compare through this instead of `=== 'me'`.
 */
export function useIsMine() {
  const myId = useMoshi((s) => s.me.id)
  return useCallback((id: string | undefined) => !!id && (id === 'me' || id === myId), [myId])
}

/**
 * Icebreakers from the matcher are partly tips for the sender
 * ("ทักเรื่อง … ได้เลย"). Turn those into lines that can be sent as-is.
 */
export function toOpener(icebreaker: string, name: string): { text: string; from: string } {
  const post = icebreaker.match(/^ทักเรื่อง "(.+)" ได้เลย/)
  if (post) return { text: `เห็นโพสต์ "${post[1]}" แล้วสนใจมากเลย ยังหาอยู่ไหม?`, from: 'จากโพสต์กำลังหาของเขา' }
  const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const story = icebreaker.match(new RegExp(`^${safeName}บอกว่า "(.+)" ลองถามต่อดูสิ`))
  if (story) return { text: `เห็นว่า "${story[1]}" อยากฟังต่อจัง เล่าเพิ่มหน่อยได้ไหม`, from: 'จากเรื่องเล่าของเขา' }
  // "…ลองถามว่า X?" → X?
  const ask = icebreaker.match(/ลองถามว่า(.+)$/)
  if (ask) return { text: ask[1].trim(), from: 'จากเรื่องที่ชอบเหมือนกัน' }
  // "ชวน<name>…ดูไหม?" → "…ด้วยกันไหม?" (sent to them, so their name goes)
  const invite = icebreaker.match(new RegExp(`^ชวน(?:${safeName})?\\s*(.+?)ดูไหม\\??$`))
  if (invite) return { text: `${invite[1].trim()}ด้วยกันไหม?`, from: 'ชวนทำอะไรด้วยกัน' }
  return { text: icebreaker, from: 'จากเรื่องที่ชอบเหมือนกัน' }
}
