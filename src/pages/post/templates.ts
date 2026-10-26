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
import { known, L, loc } from '@/lib/i18n'
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
  loc<TemplateDef>({
    key: 'play',
    label: L('เล่นเกมด้วยกัน', 'Play games together'),
    Icon: Gamepad2,
    color: 'lavender',
    role: 'peer',
    mode: 'online',
    when: 'tonight',
    example: L('หาเพื่อนเล่น Valorant ตอนดึก ชิลๆ ไม่ toxic', 'Looking for late-night Valorant buddies, chill and no toxicity'),
    tags: ['valorant', 'rov', 'genshin', 'minecraft', 'cozygame', 'pokemon', 'boardgame'],
  }),
  loc<TemplateDef>({
    key: 'talk',
    label: L('คุยเรื่อง…', 'Talk about…'),
    Icon: MessagesSquare,
    color: 'pink',
    role: 'peer',
    mode: 'online',
    when: 'anytime',
    example: L('อยากมีคนคุยเรื่องนิยายสืบสวนญี่ปุ่น ชอบฮิงาชิโนะ', 'Want someone to talk Japanese mystery novels with. Big Higashino fan'),
    tags: ['frieren', 'onepiece', 'ghibli', 'kdrama', 'mystery', 'horror', 'astrology'],
  }),
  loc<TemplateDef>({
    key: 'lang',
    label: L('ฝึก / แลกภาษา', 'Practice / swap languages'),
    Icon: Languages,
    color: 'sky',
    role: 'swap',
    mode: 'online',
    when: 'anytime',
    example: L('อยากฝึกญี่ปุ่น N4 สอนไทยแลกได้ ผิดได้ ขำได้', 'Practicing Japanese N4, happy to teach Thai back. Mistakes and laughs welcome'),
    tags: ['japanese', 'english', 'korean', 'thai'],
    give: L('เช่น ภาษาไทย', 'e.g. Thai'),
    want: L('เช่น ภาษาญี่ปุ่น', 'e.g. Japanese'),
  }),
  loc<TemplateDef>({
    key: 'event',
    label: L('ไปงาน / คอนเสิร์ต', 'Events / concerts'),
    Icon: Ticket,
    color: 'peach',
    role: 'peer',
    mode: 'offline',
    when: 'dated',
    example: L('มีใครไปคอนเสาร์นี้ที่อิมแพ็คบ้าง ไปคนเดียวเขิน', 'Anyone going to the concert at Impact this Saturday? Too shy to go alone'),
    tags: ['concert', 'tpop', 'kpop', 'indie', 'jpop', 'cosplay'],
  }),
  loc<TemplateDef>({
    key: 'newbie',
    label: L('มือใหม่หาเพื่อน', 'Newbie seeks buddy'),
    Icon: Sprout,
    color: 'mint',
    role: 'seek',
    mode: 'online',
    when: 'weekend',
    example: L('อยากเริ่มวิ่ง หาคนวิ่งชิลๆ ไม่เร็ว คุยไปวิ่งไป', 'Want to start running. Looking for a slow, chatty running buddy'),
    tags: ['running', 'guitar', 'hiking', 'baking', 'drawing', 'crochet', 'photography'],
    give: L('เช่น วิ่งมา 3 ปี ให้คำแนะนำได้', 'e.g. 3 years of running, happy to give tips'),
    want: L('เช่น เพื่อนวิ่งชิลๆ', 'e.g. a chill running buddy'),
  }),
  loc<TemplateDef>({
    key: 'study',
    label: L('ทำงาน / ติวด้วยกัน', 'Work / study together'),
    Icon: NotebookPen,
    color: 'mint',
    role: 'peer',
    mode: 'online',
    when: 'tonight',
    example: L('หาก๊วนติว TOEIC ทุกเช้าวันเสาร์ เปิดกล้องเงียบๆ', 'Looking for a Saturday-morning TOEIC study group, cameras on, nice and quiet'),
    tags: ['cowork', 'toeic', 'coding', 'design', 'firstjob'],
  }),
  loc<TemplateDef>({
    key: 'moved',
    label: L('เพิ่งย้ายมา', 'Just moved here'),
    Icon: Luggage,
    color: 'butter',
    role: 'peer',
    mode: 'online',
    when: 'anytime',
    example: L('เพิ่งย้ายมาทำงานกรุงเทพฯ อยากมีเพื่อนกินข้าวเย็น', 'Just moved to Bangkok for work. Looking for dinner buddies'),
    tags: ['movedbkk', 'firstjob', 'streetfood', 'cafe', 'mookata'],
  }),
  loc<TemplateDef>({
    key: 'listen',
    label: L('อยากมีคนคุยด้วย', 'Want someone to talk to'),
    Icon: Ear,
    color: 'peach',
    role: 'peer',
    mode: 'online',
    when: 'tonight',
    example: L('อยากมีเพื่อนคุยก่อนนอน เล่าเรื่องวันนี้ให้กันฟัง', 'Want a bedtime chat buddy to swap stories about our day'),
    tags: ['listening', 'journaling', 'nightowl', 'selfhelp'],
    give: L('เช่น รับฟังได้ ไม่ตัดสิน', "e.g. I'll listen, no judgment"),
    want: L('เช่น คนรับฟังเรื่องงาน', 'e.g. someone to hear me out about work'),
  }),
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
  loc<RoleDef>({ key: 'peer', label: L('ทำด้วยกัน', 'Do it together'), hint: L('หาเพื่อนมาทำเรื่องเดียวกัน สนุกไปด้วยกัน', 'Find friends into the same thing and have fun together'), Icon: Users, color: 'mint' }),
  loc<RoleDef>({ key: 'seek', label: L('อยากหาคนช่วย', 'Looking for help'), hint: L('อยากเริ่มหรืออยากเก่งขึ้น หาคนที่แนะนำได้', 'Starting out or leveling up? Find someone with tips'), Icon: HandHelping, color: 'sky' }),
  loc<RoleDef>({ key: 'offer', label: L('ช่วยคนอื่นได้', 'Happy to help'), hint: L('มีเรื่องที่ถนัด ยินดีแบ่งปันหรือพามือใหม่', 'Good at something? Share it or show a newbie the ropes'), Icon: Lightbulb, color: 'butter' }),
  loc<RoleDef>({ key: 'swap', label: L('แลกกัน', 'Swap'), hint: L('เราให้อย่างหนึ่ง แลกกับอีกอย่างที่อยากได้', 'Give one thing, get something you want in return'), Icon: Repeat2, color: 'lavender' }),
  loc<RoleDef>({ key: 'host', label: L('มีที่ว่าง', 'Spots open'), hint: L('เปิดตี้หรือวงไว้แล้ว ยังขาดเพื่อนอีกไม่กี่คน', 'Your squad is set, just a few spots left'), Icon: UserPlus, color: 'pink' }),
]

export const ROLE_BY_KEY = Object.fromEntries(ROLES.map((r) => [r.key, r])) as Record<IntentRole, RoleDef>

export interface WhenDef {
  key: IntentWhen
  label: string
  Icon: LucideIcon
}

export const WHENS: WhenDef[] = [
  loc<WhenDef>({ key: 'tonight', label: L('คืนนี้', 'Tonight'), Icon: MoonStar }),
  loc<WhenDef>({ key: 'weekend', label: L('สุดสัปดาห์', 'Weekend'), Icon: CalendarDays }),
  loc<WhenDef>({ key: 'anytime', label: L('เมื่อไหร่ก็ได้', 'Anytime'), Icon: InfinityIcon }),
  loc<WhenDef>({ key: 'dated', label: L('ระบุวัน', 'Pick a date'), Icon: CalendarClock }),
]

/** stored values: keep Thai, show with known() */
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
  if (whenLabel) return known(whenLabel)
  return WHENS.find((w) => w.key === when)?.label ?? ''
}
