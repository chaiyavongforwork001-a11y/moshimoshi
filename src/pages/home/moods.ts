import { BatteryLow, CloudDrizzle, Coffee, PartyPopper, Smile, type LucideIcon } from 'lucide-react'
import type { MochiAccessory, MochiExpression } from '@/components/three'
import { L, loc } from '@/lib/i18n'
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
  loc<MoodDef>({
    key: 'happy',
    label: L('แฮปปี้ดี', 'Happy'),
    say: L('วันนี้แฮปปี้ดีนะ', "I'm feeling happy today"),
    Icon: Smile,
    color: 'butter',
    reply: L('ดีใจด้วยน้า! วันดีๆ แบบนี้ เอาไปแบ่งเพื่อนๆ บ้างไหม', 'Yay, so happy for you! Want to share a good day like this with friends?'),
    follow: L('ห้องพวกนี้กำลังคึกคักเลย แวะไปทักทายได้นะ', 'These rooms are buzzing right now. Pop in and say hi'),
    expression: 'happy',
    accessory: 'bow',
  }),
  loc<MoodDef>({
    key: 'chill',
    label: L('ชิลๆ', 'Chill'),
    say: L('ชิลๆ สบายๆ', 'Chill and easy'),
    Icon: Coffee,
    color: 'mint',
    reply: L('ชิลๆ แบบนี้ดีที่สุดแล้ว ไม่ต้องรีบอะไรเลยนะ', 'Chill is the best. No need to rush anything'),
    follow: L('ถ้าอยากมีเพื่อนนั่งเงียบๆ ด้วยกัน ลองห้องนี้ดู', "If you'd like some quiet company, try these"),
    expression: 'wink',
    accessory: 'leaf',
  }),
  loc<MoodDef>({
    key: 'tired',
    label: L('เหนื่อยจัง', 'So tired'),
    say: L('วันนี้เหนื่อยจัง', "I'm so tired today"),
    Icon: BatteryLow,
    color: 'lavender',
    reply: L('เหนื่อยมาทั้งวันเลยสินะ มานั่งพักในมุมเล่าให้ฟังไหม', 'Long day, huh? Want to rest a while in The Listening Corner?'),
    follow: L('จะเล่า หรือแค่นั่งฟังเพื่อนๆ คุยกันเงียบๆ ก็ได้นะ', 'Share if you like, or just sit back and listen to everyone chat'),
    expression: 'sleepy',
    accessory: 'headset',
  }),
  loc<MoodDef>({
    key: 'lonely',
    label: L('เหงานิดๆ', 'A bit lonely'),
    say: L('เหงานิดๆ', 'Feeling a bit lonely'),
    Icon: CloudDrizzle,
    color: 'sky',
    reply: L('ขอบคุณที่เล่าให้ฟังนะ คืนนี้มีเพื่อนๆ นั่งคุยกันอยู่ ไปนั่งด้วยกันไหม', "Thanks for telling me. Some friends are chatting tonight. Want to join them?"),
    follow: L('ไม่ต้องพูดเก่งก็ได้ แค่แวะไปนั่งด้วยก็อุ่นขึ้นแล้ว', "You don't have to say much. Just being there feels warmer"),
    expression: 'smile',
    accessory: 'headset',
  }),
  loc<MoodDef>({
    key: 'excited',
    label: L('ตื่นเต้น', 'Excited'),
    say: L('ตื่นเต้นมาก!', 'So excited!'),
    Icon: PartyPopper,
    color: 'pink',
    reply: L('ว้าว พลังเต็มเลย! คืนนี้มีตี้สนุกๆ รออยู่หลายวงเลยนะ', 'Wow, full power! Lots of fun squads are waiting tonight'),
    follow: L('เอาพลังนี้ไปแจมกับเพื่อนๆ กัน', 'Bring that energy and jam with friends'),
    expression: 'wow',
    accessory: 'cap',
  }),
]

// the same objects (not copies), so their text keeps following the current language
export const MOOD_BY_KEY = Object.fromEntries(MOODS.map((m) => [m.key, m])) as Record<Mood, MoodDef>

/** Rooms the mascot suggests for each mood (ids that don't exist on the server are skipped). */
export const MOOD_ROOMS: Record<Mood, string[]> = {
  happy: ['lobby', 'music'],
  excited: ['game-night', 'music'],
  chill: ['cowork', 'anime'],
  tired: ['listen', 'cowork'],
  lonely: ['listen', 'lobby'],
}
