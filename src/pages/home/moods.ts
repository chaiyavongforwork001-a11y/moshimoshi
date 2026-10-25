import { BatteryLow, CloudDrizzle, Coffee, PartyPopper, Smile, type LucideIcon } from 'lucide-react'
import type { MochiAccessory, MochiExpression } from '@/components/three'
import type { MochiColor, Mood } from '@/lib/types'

export interface MoodDef {
  key: Mood
  /** quick-reply chip */
  label: string
  /** what "I" say in the thread */
  say: string
  Icon: LucideIcon
  color: MochiColor
  /** mascot's answer: empathy first, then a gentle suggestion */
  reply: string
  follow: string
  expression: MochiExpression
  accessory: MochiAccessory
}

export const MOODS: MoodDef[] = [
  {
    key: 'happy',
    label: 'แฮปปี้ดี',
    say: 'วันนี้แฮปปี้ดีนะ',
    Icon: Smile,
    color: 'butter',
    reply: 'ดีใจด้วยน้า! วันดีๆ แบบนี้ เอาไปแบ่งเพื่อนๆ บ้างไหม',
    follow: 'ห้องพวกนี้กำลังคึกคักเลย แวะไปทักทายได้นะ',
    expression: 'happy',
    accessory: 'bow',
  },
  {
    key: 'chill',
    label: 'ชิลๆ',
    say: 'ชิลๆ สบายๆ',
    Icon: Coffee,
    color: 'mint',
    reply: 'ชิลๆ แบบนี้ดีที่สุดแล้ว ไม่ต้องรีบอะไรเลยนะ',
    follow: 'ถ้าอยากมีเพื่อนนั่งเงียบๆ ด้วยกัน ลองห้องนี้ดู',
    expression: 'wink',
    accessory: 'leaf',
  },
  {
    key: 'tired',
    label: 'เหนื่อยจัง',
    say: 'วันนี้เหนื่อยจัง',
    Icon: BatteryLow,
    color: 'lavender',
    reply: 'เหนื่อยมาทั้งวันเลยสินะ มานั่งพักในมุมเล่าให้ฟังไหม',
    follow: 'จะเล่า หรือแค่นั่งฟังเพื่อนๆ คุยกันเงียบๆ ก็ได้นะ',
    expression: 'sleepy',
    accessory: 'headset',
  },
  {
    key: 'lonely',
    label: 'เหงานิดๆ',
    say: 'เหงานิดๆ',
    Icon: CloudDrizzle,
    color: 'sky',
    reply: 'ขอบคุณที่เล่าให้ฟังนะ คืนนี้มีเพื่อนๆ นั่งคุยกันอยู่ ไปนั่งด้วยกันไหม',
    follow: 'ไม่ต้องพูดเก่งก็ได้ แค่แวะไปนั่งด้วยก็อุ่นขึ้นแล้ว',
    expression: 'smile',
    accessory: 'headset',
  },
  {
    key: 'excited',
    label: 'ตื่นเต้น',
    say: 'ตื่นเต้นมาก!',
    Icon: PartyPopper,
    color: 'pink',
    reply: 'ว้าว พลังเต็มเลย! คืนนี้มีตี้สนุกๆ รออยู่หลายวงเลยนะ',
    follow: 'เอาพลังนี้ไปแจมกับเพื่อนๆ กัน',
    expression: 'wow',
    accessory: 'cap',
  },
]

export const MOOD_BY_KEY = Object.fromEntries(MOODS.map((m) => [m.key, m])) as Record<Mood, MoodDef>

/** Rooms the mascot suggests for each mood (ids that don't exist on the server are skipped). */
export const MOOD_ROOMS: Record<Mood, string[]> = {
  happy: ['lobby', 'music'],
  excited: ['game-night', 'music'],
  chill: ['cowork', 'anime'],
  tired: ['listen', 'cowork'],
  lonely: ['listen', 'lobby'],
}
