import { MoonStar, Sun, Sunrise, Sunset, type LucideIcon } from 'lucide-react'

export interface Greeting {
  hello: string
  sub: string
  Icon: LucideIcon
}

/** Time-aware, warm greeting. */
export function greeting(date = new Date()): Greeting {
  const h = date.getHours()
  if (h >= 5 && h < 11) return { hello: 'สวัสดีตอนเช้านะ', sub: 'เริ่มวันใหม่แบบสบายๆ กันนะ', Icon: Sunrise }
  if (h >= 11 && h < 13) return { hello: 'สวัสดีตอนเที่ยงนะ', sub: 'กินข้าวหรือยัง อย่าลืมพักบ้างนะ', Icon: Sun }
  if (h >= 13 && h < 17) return { hello: 'สวัสดีตอนบ่ายนะ', sub: 'บ่ายนี้เหนื่อยไหม แวะมานั่งพักกันได้', Icon: Sun }
  if (h >= 17 && h < 22) return { hello: 'สวัสดีตอนค่ำนะ', sub: 'คืนนี้มีเพื่อนๆ รอคุยอยู่หลายวงเลย', Icon: Sunset }
  return { hello: 'ดึกแล้วนะ', sub: 'นอนไม่หลับก็มานั่งคุยกันได้นะ', Icon: MoonStar }
}

/** "คืนนี้" / "พรุ่งนี้" / "วันเสาร์" for a (evening) session day offset. */
export function dayLabel(dayOffset: number): string {
  if (dayOffset === 0) return 'คืนนี้'
  if (dayOffset === 1) return 'พรุ่งนี้'
  const d = new Date(Date.now() + dayOffset * 86_400_000)
  return d.toLocaleDateString('th-TH', { weekday: 'long' })
}

/** Relative age label from the design doc (real age shows only after chatting). */
export function ageLabel(myAge: number, theirAge: number): string {
  const diff = theirAge - myAge
  if (Math.abs(diff) <= 2) return 'รุ่นเดียวกัน'
  return diff > 0 ? 'รุ่นพี่' : 'รุ่นน้อง'
}

/** "ห้องเกมดึก" without doubling names that already start with "ห้อง". */
export function roomLabel(name: string): string {
  return name.startsWith('ห้อง') ? name : `ห้อง${name}`
}
