import { useCallback } from 'react'
import { known, L, t, texts } from '@/lib/i18n'
import { useMoshi } from '@/lib/store'
import type { IntentTemplate, IntentWhen, MochiColor, User } from '@/lib/types'

export const COLOR_NAME: Readonly<Record<MochiColor, string>> = texts({
  peach: L('พีช', 'peach'),
  butter: L('เนย', 'butter'),
  mint: L('มิ้นต์', 'mint'),
  lavender: L('ลาเวนเดอร์', 'lavender'),
  sky: L('ฟ้า', 'sky blue'),
  pink: L('ชมพู', 'pink'),
  cream: L('ครีม', 'cream'),
})

/** Relative age only, never the exact number. */
export function ageLabel(myAge: number, theirAge: number): string {
  if (!myAge || !theirAge) return t('เพื่อนใหม่', 'New friend')
  const d = theirAge - myAge
  if (Math.abs(d) <= 2) return t('รุ่นเดียวกัน', 'Around your age')
  return d > 0 ? t('รุ่นพี่', 'A bit older') : t('รุ่นน้อง', 'A bit younger')
}

/** "Yesterday" reads "yesterday" after "Last seen"; dates ("Sat 2 Nov") stay as they are. */
const midSentence = (s: string) => (/^(Just|Yesterday|A while|Ages|Tonight|This)\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s)

export function statusLabel(u: User): string {
  return u.isOnline ? t('ออนไลน์อยู่', 'Online now') : t(`แวะมาล่าสุด ${u.lastActive}`, `Last seen ${midSentence(known(u.lastActive))}`)
}

export const WHEN_LABEL: Readonly<Record<IntentWhen, string>> = texts({
  tonight: L('คืนนี้', 'Tonight'),
  weekend: L('สุดสัปดาห์นี้', 'This weekend'),
  anytime: L('ว่างเมื่อไหร่ก็ได้', 'Anytime'),
  dated: L('นัดวันไว้แล้ว', 'Date set'),
})

export const TEMPLATE_LABEL: Readonly<Record<IntentTemplate, string>> = texts({
  play: L('หาเพื่อนเล่น', 'Play buddies'),
  talk: L('หาคนคุยด้วย', 'Someone to talk to'),
  lang: L('แลกภาษา', 'Language swap'),
  event: L('หาเพื่อนไปงาน', 'Event buddy'),
  newbie: L('มือใหม่', 'Newbie'),
  study: L('นั่งทำงานด้วยกัน', 'Work together'),
  moved: L('เพิ่งย้ายมา', 'Just moved here'),
  listen: L('รับฟัง', 'A listening ear'),
})

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
 * The matcher writes them in the current language, so both wordings are read.
 */
export function toOpener(icebreaker: string, name: string): { text: string; from: string } {
  const sameLikes = () => t('จากเรื่องที่ชอบเหมือนกัน', 'From what you both like')
  const post = icebreaker.match(/^ทักเรื่อง "(.+)" ได้เลย/) ?? icebreaker.match(/^Say hi about "(.+)"\. They're looking/)
  if (post)
    return {
      text: t(`เห็นโพสต์ "${post[1]}" แล้วสนใจมากเลย ยังหาอยู่ไหม?`, `Saw your post "${post[1]}" and I'm really interested. Still looking?`),
      from: t('จากโพสต์กำลังหาของเขา', 'From their looking-for post'),
    }
  const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const story =
    icebreaker.match(new RegExp(`^${safeName}บอกว่า "(.+)" ลองถามต่อดูสิ`)) ?? icebreaker.match(new RegExp(`^${safeName} said "(.+)"\\. Ask them more`))
  if (story)
    return {
      text: t(`เห็นว่า "${story[1]}" อยากฟังต่อจัง เล่าเพิ่มหน่อยได้ไหม`, `Saw you said "${story[1]}". I'd love to hear more!`),
      from: t('จากเรื่องเล่าของเขา', 'From their story'),
    }
  // "…ลองถามว่า X?" → X?
  const ask = icebreaker.match(/ลองถามว่า(.+)$/)
  if (ask) return { text: ask[1].trim(), from: sameLikes() }
  // "ชวน<name>…ดูไหม?" → "…ด้วยกันไหม?" (sent to them, so their name goes)
  const invite = icebreaker.match(new RegExp(`^ชวน(?:${safeName})?\\s*(.+?)ดูไหม\\??$`))
  if (invite) return { text: `${invite[1].trim()}ด้วยกันไหม?`, from: t('ชวนทำอะไรด้วยกัน', 'Invite them to do something') }
  // "Invite <name> to a … squad tonight?" → "Join me for a … squad tonight?"
  const inviteEn = icebreaker.match(new RegExp(`^Invite (?:${safeName} )?to (.+?)\\??$`))
  if (inviteEn) return { text: `Join me for ${inviteEn[1].trim()}?`, from: t('ชวนทำอะไรด้วยกัน', 'Invite them to do something') }
  return { text: icebreaker, from: sameLikes() }
}
