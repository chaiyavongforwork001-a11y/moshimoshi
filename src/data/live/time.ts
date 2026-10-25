// Thailand has no daylight saving: Asia/Bangkok is always UTC+7.
const BKK = 7 * 3600_000
const DAY = 86_400_000
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN)
/** a Date whose UTC fields read as Bangkok wall-clock time */
const wall = (t: number) => new Date(t + BKK)
const dayIndex = (t: number) => Math.floor((t + BKK) / DAY)
const pad = (n: number) => String(n).padStart(2, '0')

/** "21:04" in Bangkok time. */
export function hhmm(iso: string): string {
  const t = ms(iso)
  if (Number.isNaN(t)) return ''
  const d = wall(t)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

/** Message stamp: "21:04" today, "เมื่อวาน" yesterday, "12 ต.ค." before that. */
export function messageTime(iso: string, now = Date.now()): string {
  const t = ms(iso)
  if (Number.isNaN(t)) return ''
  const days = dayIndex(now) - dayIndex(t)
  if (days <= 0) return hhmm(iso)
  if (days === 1) return 'เมื่อวาน'
  const d = wall(t)
  return `${d.getUTCDate()} ${TH_MONTHS[d.getUTCMonth()]}`
}

/** 0 = today, 1 = tomorrow … in Bangkok days (negative = past). */
export function dayOffset(iso: string, now = Date.now()): number {
  const t = ms(iso)
  return Number.isNaN(t) ? 0 : dayIndex(t) - dayIndex(now)
}

export function minutesAgo(iso: string | null | undefined, now = Date.now()): number {
  const t = ms(iso)
  return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((now - t) / 60_000))
}

/** "YYYY-MM-DD" of today in Bangkok (for `day` columns). */
export function bangkokDate(now = Date.now()): string {
  const d = wall(now)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function bangkokYear(now = Date.now()): number {
  return wall(now).getUTCFullYear()
}

/** "เมื่อกี้", "15 นาทีที่แล้ว", "3 ชั่วโมงที่แล้ว", "เมื่อวาน", "4 วันที่แล้ว" … */
export function lastActiveLabel(iso: string | null | undefined, now = Date.now()): string {
  const t = ms(iso)
  if (Number.isNaN(t)) return 'สักพักแล้ว'
  const min = Math.max(0, Math.floor((now - t) / 60_000))
  if (min < 2) return 'เมื่อกี้'
  if (min < 60) return `${min} นาทีที่แล้ว`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`
  const days = dayIndex(now) - dayIndex(t)
  if (days <= 1) return 'เมื่อวาน'
  if (days < 7) return `${days} วันที่แล้ว`
  if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`
  return 'นานแล้ว'
}
