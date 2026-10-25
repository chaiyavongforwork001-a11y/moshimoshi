import {
  Ban,
  Ear,
  Gamepad2,
  GraduationCap,
  Headphones,
  Languages,
  Laptop,
  Leaf,
  Luggage,
  MessagesSquare,
  Moon,
  Ribbon,
  Sprout,
  Sun,
  Sunrise,
  Sunset,
  Ticket,
  type LucideIcon,
} from 'lucide-react'
import type { MochiAccessory, MochiExpression } from '@/components/three'
import { TAG_BY_ID } from '@/data/tags'
import type { IntentTemplate, MochiColor, OnlineSlot } from '@/lib/types'
import { MIN_TAGS, STORY_MIN, textLength, type Draft } from './model'

export const STEPS = [
  { key: 'hello', label: 'ทักทาย' },
  { key: 'mochi', label: 'เลือกโมชิ' },
  { key: 'likes', label: 'เรื่องที่ชอบ' },
  { key: 'story', label: 'เล่าให้ฟัง' },
  { key: 'looking', label: 'อยากหาเพื่อนแบบไหน' },
  { key: 'rooms', label: 'เลือกห้อง' },
  { key: 'done', label: 'พร้อมแล้ว' },
] as const

export const LAST_STEP = STEPS.length - 1

export const COLOR_LABEL: Record<MochiColor, string> = {
  peach: 'พีชฉ่ำ',
  butter: 'เนยสด',
  mint: 'มินต์ชิล',
  lavender: 'ลาเวนเดอร์',
  sky: 'ฟ้าใส',
  pink: 'ชมพูซากุระ',
  cream: 'ข้าวเหนียวนุ่ม',
}

export const FACE_OPTIONS: { id: MochiExpression; label: string }[] = [
  { id: 'smile', label: 'ยิ้มหวาน' },
  { id: 'happy', label: 'แฮปปี้' },
  { id: 'wink', label: 'ขยิบตา' },
  { id: 'talk', label: 'ช่างคุย' },
  { id: 'wow', label: 'ตื่นเต้น' },
  { id: 'sleepy', label: 'ง่วงนิดๆ' },
]

export const ACCESSORY_OPTIONS: { id: MochiAccessory; label: string; Icon: LucideIcon }[] = [
  { id: 'none', label: 'ตัวเปล่า', Icon: Ban },
  { id: 'headset', label: 'หูฟัง', Icon: Headphones },
  { id: 'leaf', label: 'ใบไม้', Icon: Leaf },
  { id: 'bow', label: 'โบว์', Icon: Ribbon },
  { id: 'cap', label: 'หมวก', Icon: GraduationCap },
]

export const FACE_LABEL = Object.fromEntries(FACE_OPTIONS.map((f) => [f.id, f.label])) as Record<MochiExpression, string>
export const ACCESSORY_LABEL = Object.fromEntries(ACCESSORY_OPTIONS.map((a) => [a.id, a.label])) as Record<MochiAccessory, string>

export const SLOT_OPTIONS: { id: OnlineSlot; Icon: LucideIcon; time: string }[] = [
  { id: 'morning', Icon: Sunrise, time: '6–11 โมง' },
  { id: 'afternoon', Icon: Sun, time: '11–17 น.' },
  { id: 'evening', Icon: Sunset, time: '17–21 น.' },
  { id: 'late', Icon: Moon, time: '3 ทุ่มเป็นต้นไป' },
]

export interface TemplateOption {
  id: IntentTemplate
  label: string
  hint: string
  Icon: LucideIcon
  color: MochiColor
  /** what น้องโมชิ says when this is picked */
  reaction: string
}

export const INTENT_TEMPLATES: TemplateOption[] = [
  { id: 'play', label: 'เล่นเกมด้วยกัน', hint: 'หาตี้ หาดูโอ้', Icon: Gamepad2, color: 'lavender', reaction: 'เดี๋ยวหาเพื่อนร่วมตี้ใจดีให้นะ ไม่ toxic แน่นอน' },
  { id: 'talk', label: 'คุยเรื่อง…', hint: 'เรื่องที่ชอบแบบลึกๆ', Icon: MessagesSquare, color: 'pink', reaction: 'เรื่องที่ชอบ คุยกับคนที่ชอบเหมือนกันสนุกที่สุด' },
  { id: 'lang', label: 'ฝึกภาษา', hint: 'ผิดได้ ขำได้', Icon: Languages, color: 'sky', reaction: 'ผิดได้ ขำได้ ที่นี่ไม่มีใครตัดสินนะ' },
  { id: 'event', label: 'ไปงาน/คอนเสิร์ต', hint: 'ไปเป็นแก๊งไม่เขิน', Icon: Ticket, color: 'peach', reaction: 'ไปเป็นแก๊งอุ่นใจกว่าเยอะเลย' },
  { id: 'newbie', label: 'มือใหม่หาเพื่อน', hint: 'เพิ่งมา ยังไม่รู้จักใคร', Icon: Sprout, color: 'mint', reaction: 'ไม่ต้องเขินนะ ทุกคนก็เคยเป็นคนใหม่' },
  { id: 'study', label: 'ทำงาน/ติวด้วยกัน', hint: 'มีเพื่อนนั่งข้างๆ', Icon: Laptop, color: 'butter', reaction: 'มีเพื่อนนั่งข้างๆ งานเสร็จไวขึ้นแน่' },
  { id: 'moved', label: 'เพิ่งย้ายมา', hint: 'เมืองใหม่ เพื่อนใหม่', Icon: Luggage, color: 'butter', reaction: 'ยินดีต้อนรับสู่เมืองใหม่ เดี๋ยวพาไปรู้จักเพื่อนแถวนี้' },
  { id: 'listen', label: 'อยากมีคนรับฟัง', hint: 'แค่อยากเล่าให้ใครฟัง', Icon: Ear, color: 'peach', reaction: 'เราอยู่ตรงนี้นะ จะหาคนใจดีมารับฟังให้' },
]

export const TEMPLATE_BY_ID = Object.fromEntries(INTENT_TEMPLATES.map((t) => [t.id, t])) as Record<IntentTemplate, TemplateOption>

// ------------------------------------------------------------------ น้องโมชิ's lines
export interface MascotLine {
  line: string
  sub?: string
  face: MochiExpression
}

/** The question for each step (also the page heading). */
export function mascotLine(step: number, d: Draft): MascotLine {
  const name = d.name.trim()
  switch (step) {
    case 0:
      return { line: 'สวัสดี! เราชื่อน้องโมชิ แล้วเธอล่ะ?', sub: 'ชื่อเล่นก็พอนะ เปลี่ยนทีหลังได้เสมอ', face: 'smile' }
    case 1:
      return { line: name ? `${name} มาเลือกโมชิที่เป็นตัวเธอกัน` : 'มาเลือกโมชิที่เป็นตัวเธอกัน', sub: 'สี หน้าตา ของแต่งตัว เปลี่ยนได้ตลอดเลย', face: 'wow' }
    case 2:
      return { line: 'ช่วงนี้ชอบอะไรอยู่บ้าง?', sub: 'เลือกอย่างน้อย 3 อย่าง ยิ่งเฉพาะ ยิ่งเจอคนใช่ (#Frieren ดีกว่า #อนิเมะ)', face: 'happy' }
    case 3:
      return { line: 'เล่าเรื่องตัวเองให้ฟังหน่อยสิ', sub: 'สั้นๆ ก็ได้ เราตั้งใจฟังอยู่นะ', face: 'smile' }
    case 4:
      return { line: 'อยากหาเพื่อนแบบไหนบ้าง?', sub: 'ไม่ตอบก็ได้นะ ไว้ค่อยบอกทีหลังก็ได้', face: 'wink' }
    case 5:
      return { line: 'เราเลือกห้องที่น่าจะถูกใจไว้ให้แล้ว', sub: 'แตะเพื่อเลือกหรือเอาออก เข้าออกห้องได้ตลอด', face: 'happy' }
    default:
      return { line: name ? `เย้! ยินดีต้อนรับนะ ${name}` : 'เย้! ยินดีต้อนรับนะ', sub: 'สายเชื่อมต่อแล้ว คืนนี้มีเพื่อนรออยู่', face: 'happy' }
  }
}

/** A follow-up chat bubble that reacts to what the visitor just did. */
export function mascotReaction(step: number, d: Draft, ctx: { settledName: string; settledStory: string; lookChanged: boolean }): string | null {
  switch (step) {
    case 0: {
      const n = ctx.settledName.trim()
      return n ? `ชื่อ ${n} น่ารักจังเลย ยินดีที่ได้รู้จักนะ` : null
    }
    case 1:
      if (!ctx.lookChanged) return null
      return `โมชิสี${COLOR_LABEL[d.color]}${d.accessory !== 'none' ? `กับ${ACCESSORY_LABEL[d.accessory]}` : ''} น่ากอดสุดๆ`
    case 2: {
      const n = d.tags.length
      if (!n) return null
      if (n < MIN_TAGS) return `อีก ${MIN_TAGS - n} อย่างก็ครบแล้ว สู้ๆ`
      if (!d.loves.length) return 'เยี่ยมเลย! แตะค้างที่แท็ก หรือกดดาวในกล่อง เพื่อบอกว่าอันไหน "รักมาก" นะ'
      const fav = TAG_BY_ID[d.loves[d.loves.length - 1]]
      return fav ? `${fav.label} ด้วยเหรอ! เราก็ชอบเหมือนกัน` : null
    }
    case 3: {
      const n = textLength(ctx.settledStory)
      if (!n) return null
      return n < STORY_MIN ? 'ค่อยๆ พิมพ์ได้เลย ไม่ต้องรีบนะ' : 'อ่านแล้วอยากคุยด้วยเลย!'
    }
    case 4:
      if (d.intent) return TEMPLATE_BY_ID[d.intent].reaction
      return d.online.length || d.chatStyle.length ? 'จดไว้แล้ว เดี๋ยวหาเพื่อนที่จังหวะเดียวกันให้นะ' : null
    case 5:
      if (!d.rooms.length) return null
      return d.rooms.includes('lobby') ? 'ห้องนั่งเล่นเปิดไฟรอแล้ว แวะไปทักทายได้เลยนะ' : `เลือกไว้ ${d.rooms.length} ห้อง เข้าออกได้ตลอดนะ`
    default:
      return null
  }
}
