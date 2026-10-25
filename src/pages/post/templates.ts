import {
  CalendarDays,
  CalendarClock,
  Ear,
  Gamepad2,
  HandHelping,
  InfinityIcon,
  Languages,
  Lightbulb,
  Luggage,
  MessagesSquare,
  MoonStar,
  NotebookPen,
  Repeat2,
  Sprout,
  Ticket,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { IntentRole, IntentTemplate, IntentWhen, MochiColor } from '@/lib/types'

export interface TemplateDef {
  key: IntentTemplate
  label: string
  Icon: LucideIcon
  color: MochiColor
  role: IntentRole
  mode: 'online' | 'offline'
  when: IntentWhen
  example: string
  /** activity tags suggested first in the picker */
  tags: string[]
  /** placeholders for give / want */
  give?: string
  want?: string
}

export const TEMPLATES: TemplateDef[] = [
  {
    key: 'play',
    label: 'เล่นเกมด้วยกัน',
    Icon: Gamepad2,
    color: 'lavender',
    role: 'peer',
    mode: 'online',
    when: 'tonight',
    example: 'หาเพื่อนเล่น Valorant ตอนดึก ชิลๆ ไม่ toxic',
    tags: ['valorant', 'rov', 'genshin', 'minecraft', 'cozygame', 'pokemon', 'boardgame'],
  },
  {
    key: 'talk',
    label: 'คุยเรื่อง…',
    Icon: MessagesSquare,
    color: 'pink',
    role: 'peer',
    mode: 'online',
    when: 'anytime',
    example: 'อยากมีคนคุยเรื่องนิยายสืบสวนญี่ปุ่น ชอบฮิงาชิโนะ',
    tags: ['frieren', 'onepiece', 'ghibli', 'kdrama', 'mystery', 'horror', 'astrology'],
  },
  {
    key: 'lang',
    label: 'ฝึก / แลกภาษา',
    Icon: Languages,
    color: 'sky',
    role: 'swap',
    mode: 'online',
    when: 'anytime',
    example: 'อยากฝึกญี่ปุ่น N4 สอนไทยแลกได้ ผิดได้ ขำได้',
    tags: ['japanese', 'english', 'korean', 'thai'],
    give: 'เช่น ภาษาไทย',
    want: 'เช่น ภาษาญี่ปุ่น',
  },
  {
    key: 'event',
    label: 'ไปงาน / คอนเสิร์ต',
    Icon: Ticket,
    color: 'peach',
    role: 'peer',
    mode: 'offline',
    when: 'dated',
    example: 'มีใครไปคอนเสาร์นี้ที่อิมแพ็คบ้าง ไปคนเดียวเขิน',
    tags: ['concert', 'tpop', 'kpop', 'indie', 'jpop', 'cosplay'],
  },
  {
    key: 'newbie',
    label: 'มือใหม่หาเพื่อน',
    Icon: Sprout,
    color: 'mint',
    role: 'seek',
    mode: 'online',
    when: 'weekend',
    example: 'อยากเริ่มวิ่ง หาคนวิ่งชิลๆ ไม่เร็ว คุยไปวิ่งไป',
    tags: ['running', 'guitar', 'hiking', 'baking', 'drawing', 'crochet', 'photography'],
    give: 'เช่น วิ่งมา 3 ปี ให้คำแนะนำได้',
    want: 'เช่น เพื่อนวิ่งชิลๆ',
  },
  {
    key: 'study',
    label: 'ทำงาน / ติวด้วยกัน',
    Icon: NotebookPen,
    color: 'mint',
    role: 'peer',
    mode: 'online',
    when: 'tonight',
    example: 'หาก๊วนติว TOEIC ทุกเช้าวันเสาร์ เปิดกล้องเงียบๆ',
    tags: ['cowork', 'toeic', 'coding', 'design', 'firstjob'],
  },
  {
    key: 'moved',
    label: 'เพิ่งย้ายมา',
    Icon: Luggage,
    color: 'butter',
    role: 'peer',
    mode: 'online',
    when: 'anytime',
    example: 'เพิ่งย้ายมาทำงานกรุงเทพฯ อยากมีเพื่อนกินข้าวเย็น',
    tags: ['movedbkk', 'firstjob', 'streetfood', 'cafe', 'mookata'],
  },
  {
    key: 'listen',
    label: 'อยากมีคนคุยด้วย',
    Icon: Ear,
    color: 'peach',
    role: 'peer',
    mode: 'online',
    when: 'tonight',
    example: 'อยากมีเพื่อนคุยก่อนนอน เล่าเรื่องวันนี้ให้กันฟัง',
    tags: ['listening', 'journaling', 'nightowl', 'selfhelp'],
    give: 'เช่น รับฟังได้ ไม่ตัดสิน',
    want: 'เช่น คนรับฟังเรื่องงาน',
  },
]

export const TEMPLATE_BY_KEY = Object.fromEntries(TEMPLATES.map((t) => [t.key, t])) as Record<IntentTemplate, TemplateDef>

export interface RoleDef {
  key: IntentRole
  label: string
  hint: string
  Icon: LucideIcon
  color: MochiColor
}

export const ROLES: RoleDef[] = [
  { key: 'peer', label: 'ทำด้วยกัน', hint: 'หาเพื่อนมาทำเรื่องเดียวกัน สนุกไปด้วยกัน', Icon: Users, color: 'mint' },
  { key: 'seek', label: 'อยากหาคนช่วย', hint: 'อยากเริ่มหรืออยากเก่งขึ้น หาคนที่แนะนำได้', Icon: HandHelping, color: 'sky' },
  { key: 'offer', label: 'ช่วยคนอื่นได้', hint: 'มีเรื่องที่ถนัด ยินดีแบ่งปันหรือพามือใหม่', Icon: Lightbulb, color: 'butter' },
  { key: 'swap', label: 'แลกกัน', hint: 'เราให้อย่างหนึ่ง แลกกับอีกอย่างที่อยากได้', Icon: Repeat2, color: 'lavender' },
  { key: 'host', label: 'มีที่ว่าง', hint: 'เปิดตี้หรือวงไว้แล้ว ยังขาดเพื่อนอีกไม่กี่คน', Icon: UserPlus, color: 'pink' },
]

export const ROLE_BY_KEY = Object.fromEntries(ROLES.map((r) => [r.key, r])) as Record<IntentRole, RoleDef>

export const WHENS: { key: IntentWhen; label: string; Icon: LucideIcon }[] = [
  { key: 'tonight', label: 'คืนนี้', Icon: MoonStar },
  { key: 'weekend', label: 'สุดสัปดาห์', Icon: CalendarDays },
  { key: 'anytime', label: 'เมื่อไหร่ก็ได้', Icon: InfinityIcon },
  { key: 'dated', label: 'ระบุวัน', Icon: CalendarClock },
]

export const PROVINCES = [
  'กรุงเทพฯ',
  'นนทบุรี',
  'ปทุมธานี',
  'สมุทรปราการ',
  'นครปฐม',
  'ชลบุรี',
  'ระยอง',
  'เชียงใหม่',
  'เชียงราย',
  'ขอนแก่น',
  'อุดรธานี',
  'นครราชสีมา',
  'อุบลราชธานี',
  'พิษณุโลก',
  'ภูเก็ต',
  'สงขลา',
  'สุราษฎร์ธานี',
]

/** Which give / want fields a role asks for. */
export function giveWantFor(role: IntentRole): { give: boolean; want: boolean } {
  return { give: role === 'swap' || role === 'offer', want: role === 'swap' || role === 'seek' }
}

/** Human "when" text shown on the card. */
export function whenText(when: IntentWhen, whenLabel?: string): string {
  if (whenLabel) return whenLabel
  return WHENS.find((w) => w.key === when)?.label ?? ''
}
