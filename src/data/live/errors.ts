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
  message_not_found: 'ไม่เจอข้อความนี้แล้ว อาจถูกลบไปก่อนหน้านี้นะ',
  report_rate_limited: 'ชั่วโมงนี้ส่งรายงานไปหลายเรื่องแล้ว ทีมงานได้รับแล้วนะ พักสักครู่แล้วค่อยส่งเพิ่ม ถ้ามีอันตรายเร่งด่วน โทร 191 ก่อนเลย',
}

/** The friendly line for a key the database raised, if it's one we know. */
export const knownError = (e: unknown): string | undefined => KEYS[asErr(e).message?.trim() ?? '']

const SUSPENDED = 'ตอนนี้บัญชีพักอยู่ชั่วคราว ยังโพสต์หรือส่งข้อความไม่ได้นะ ถ้าคิดว่าเป็นความเข้าใจผิด ทักทีมงานได้เลย'

/** "…พักอยู่ชั่วคราวถึง 2 พ.ย. …" when we know until when. */
function suspendedText(until?: string | null): string {
  const t = until ? Date.parse(until) : NaN
  if (!Number.isFinite(t)) return SUSPENDED
  const day = new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  return SUSPENDED.replace('ชั่วคราว', `ชั่วคราวถึง ${day}`)
}

const isSuspendedNow = (until?: string | null) => !!until && Date.parse(until) > Date.now()

function isRlsDenied(e: unknown): boolean {
  const { code = '', message = '' } = asErr(e)
  return code === '42501' || /row-level security|permission denied/i.test(message)
}

/** Worth checking my suspended_until before picking the line (see writeError). */
export const mayBeSuspended = (e: unknown) => asErr(e).message?.trim() === 'suspended' || isRlsDenied(e)

export function isNetworkError(e: unknown): boolean {
  const { message = '', status } = asErr(e)
  return status === 0 || /failed to fetch|networkerror|network request failed|load failed/i.test(message)
}

/**
 * `suspendedUntil`: my profile's suspended_until, if the caller knows it. Rooms,
 * intents and daily answers refuse a suspended user with a plain RLS error, so
 * that's how we tell it apart from any other "not allowed".
 */
export function writeError(e: unknown, suspendedUntil?: string | null): string {
  const { code = '', message = '' } = asErr(e)
  if (isNetworkError(e) || (typeof navigator !== 'undefined' && !navigator.onLine)) return 'เน็ตหลุดนิดนึง ยังบันทึกไม่ได้ ลองใหม่อีกทีนะ'
  const key = message.trim()
  if (key === 'suspended') return suspendedText(suspendedUntil)
  if (KEYS[key]) return KEYS[key]
  if (code === '23514' || /check constraint|too long/i.test(message)) return 'ข้อความยาวไปนิด ลองสั้นลงหน่อยนะ'
  if (isRlsDenied(e)) return isSuspendedNow(suspendedUntil) ? suspendedText(suspendedUntil) : 'อันนี้ยังทำไม่ได้นะ'
  if (code === 'PGRST301' || /jwt/i.test(message)) return 'หมดเวลาเข้าสู่ระบบแล้ว ลองรีเฟรชหน้าอีกทีนะ'
  return 'บันทึกไม่สำเร็จ ลองใหม่อีกทีนะ'
}
