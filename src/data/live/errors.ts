// Friendly Thai lines for writes that didn't go through. The database raises
// short keys as messages (see supabase/migrations: "Errors are raised with a short key").

interface ErrLike {
  code?: string
  message?: string
  status?: number
}

const asErr = (e: unknown): ErrLike => (e && typeof e === 'object' ? (e as ErrLike) : {})

const KEYS: Record<string, string> = {
  intent_limit: 'โพสต์กำลังหาได้ทีละ 3 อันนะ ลบอันเก่าก่อนแล้วค่อยโพสต์ใหม่',
  intent_full: 'ตี้นี้เต็มแล้ว ไว้รอบหน้ามาด้วยกันนะ',
  intent_closed: 'โพสต์นี้ปิดไปแล้ว ลองดูโพสต์อื่นในห้องนะ',
  intent_not_found: 'โพสต์นี้ปิดไปแล้ว ลองดูโพสต์อื่นในห้องนะ',
  own_intent: 'อันนี้โพสต์ของเราเองนะ',
  blocked: 'ตอนนี้ติดต่อคนนี้ไม่ได้นะ',
  moshi_not_allowed: 'ตอนนี้เขาเปิดรับโมชิเฉพาะบางคนอยู่ ลองเข้าห้องเดียวกับเขาแล้วทักกันในห้องก่อนนะ',
  moshi_declined: 'เขายังไม่สะดวกคุยตอนนี้ ไม่เป็นไรนะ ยังมีเพื่อนอีกเยอะในห้อง',
  moshi_rate_limited: 'วันนี้ส่งโมชิไปเยอะแล้ว พักก่อน พรุ่งนี้ค่อยทักใหม่นะ',
  cannot_moshi_self: 'ส่งโมชิหาตัวเองไม่ได้น้า',
  opener_invalid: 'ข้อความแรกยาวไปหรือว่างอยู่ ลองพิมพ์ใหม่อีกทีนะ',
  target_not_found: 'ไม่เจอคนนี้แล้ว อาจปิดบัญชีไปแล้วนะ',
  chat_not_found: 'ไม่เจอแชทนี้แล้วนะ',
  chat_not_pending: 'โมชินี้ตอบไปแล้วนะ',
  not_allowed: 'อันนี้ยังทำไม่ได้นะ',
  chat_full: 'อันนี้ยังทำไม่ได้นะ',
  not_authenticated: 'หมดเวลาเข้าสู่ระบบแล้ว ลองรีเฟรชหน้าอีกทีนะ',
  too_young: 'ตอนนี้ moshimoshi เปิดให้เพื่อนที่อายุ 20 ปีขึ้นไปก่อนนะ ไว้ถึงวันนั้นแล้วกลับมาหากันใหม่',
  age_required: 'บอกเดือนและปีเกิดก่อนนะ ใช้เช็กอายุ 20 ปีขึ้นไปเท่านั้น',
}

export function isNetworkError(e: unknown): boolean {
  const { message = '', status } = asErr(e)
  return status === 0 || /failed to fetch|networkerror|network request failed|load failed/i.test(message)
}

export function writeError(e: unknown): string {
  const { code = '', message = '' } = asErr(e)
  if (isNetworkError(e) || (typeof navigator !== 'undefined' && !navigator.onLine)) return 'เน็ตหลุดนิดนึง ยังบันทึกไม่ได้ ลองใหม่อีกทีนะ'
  const key = message.trim()
  if (KEYS[key]) return KEYS[key]
  if (code === '23514' || /check constraint|too long/i.test(message)) return 'ข้อความยาวไปนิด ลองสั้นลงหน่อยนะ'
  if (code === '42501' || /row-level security|permission denied/i.test(message)) return 'อันนี้ยังทำไม่ได้นะ'
  if (code === 'PGRST301' || /jwt/i.test(message)) return 'หมดเวลาเข้าสู่ระบบแล้ว ลองรีเฟรชหน้าอีกทีนะ'
  return 'บันทึกไม่สำเร็จ ลองใหม่อีกทีนะ'
}
