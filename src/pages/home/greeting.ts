import { MoonStar, Sun, Sunrise, Sunset, type LucideIcon } from 'lucide-react'
import { dateLocale, t } from '@/lib/i18n'

export interface Greeting {
  hello: string
  sub: string
  Icon: LucideIcon
}

/** Time-aware, warm greeting. */
export function greeting(date = new Date()): Greeting {
  const h = date.getHours()
  if (h >= 5 && h < 11)
    return { hello: t('สวัสดีตอนเช้านะ', 'Good morning'), sub: t('เริ่มวันใหม่แบบสบายๆ กันนะ', "Let's ease into a brand-new day"), Icon: Sunrise }
  if (h >= 11 && h < 13)
    return { hello: t('สวัสดีตอนเที่ยงนะ', 'Happy lunchtime'), sub: t('กินข้าวหรือยัง อย่าลืมพักบ้างนะ', "Eaten yet? Don't forget to take a break"), Icon: Sun }
  if (h >= 13 && h < 17)
    return { hello: t('สวัสดีตอนบ่ายนะ', 'Good afternoon'), sub: t('บ่ายนี้เหนื่อยไหม แวะมานั่งพักกันได้', 'Tired this afternoon? Come take a breather'), Icon: Sun }
  if (h >= 17 && h < 22)
    return { hello: t('สวัสดีตอนค่ำนะ', 'Good evening'), sub: t('คืนนี้มีเพื่อนๆ รอคุยอยู่หลายวงเลย', 'Lots of friends are hanging out tonight'), Icon: Sunset }
  return { hello: t('ดึกแล้วนะ', "It's getting late"), sub: t('นอนไม่หลับก็มานั่งคุยกันได้นะ', "Can't sleep? Come hang out and chat"), Icon: MoonStar }
}

/** "คืนนี้" / "พรุ่งนี้" / "วันเสาร์" for a (evening) session day offset. */
export function dayLabel(dayOffset: number): string {
  if (dayOffset === 0) return t('คืนนี้', 'Tonight')
  if (dayOffset === 1) return t('พรุ่งนี้', 'Tomorrow')
  const d = new Date(Date.now() + dayOffset * 86_400_000)
  return d.toLocaleDateString(dateLocale(), { weekday: 'long' })
}

/** Relative age label from the design doc (real age shows only after chatting). */
export function ageLabel(myAge: number, theirAge: number): string {
  const diff = theirAge - myAge
  if (Math.abs(diff) <= 2) return t('รุ่นเดียวกัน', 'Around your age')
  return diff > 0 ? t('รุ่นพี่', 'A bit older') : t('รุ่นน้อง', 'A bit younger')
}

/** "ห้องเกมดึก" without doubling names that already start with "ห้อง" (English names stand alone). */
export function roomLabel(name: string): string {
  return t(name.startsWith('ห้อง') ? name : `ห้อง${name}`, name)
}
