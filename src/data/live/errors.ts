import { L, dateLocale, getLang, t, tx, type Txt } from '@/lib/i18n'

// Friendly lines for writes that didn't go through. The database raises
// short keys as messages (see supabase/migrations: "Errors are raised with a short key").

interface ErrLike {
  code?: string
  message?: string
  status?: number
}

const asErr = (e: unknown): ErrLike => (e && typeof e === 'object' ? (e as ErrLike) : {})

const NOT_ALLOWED = L('อันนี้ยังทำไม่ได้นะ', "You can't do that just yet")
const SIGNED_OUT = L('หมดเวลาเข้าสู่ระบบแล้ว ลองรีเฟรชหน้าอีกทีนะ', 'Your sign-in expired. Try refreshing the page')
const POST_CLOSED = L('โพสต์นี้ปิดไปแล้ว ลองดูโพสต์อื่นในห้องนะ', 'This post is closed. Check out the others in the room')

const KEYS: Record<string, Txt> = {
  intent_limit: L('โพสต์กำลังหาได้ทีละ 3 อันนะ ลบอันเก่าก่อนแล้วค่อยโพสต์ใหม่', 'You can have 3 posts at a time. Remove an old one first, then post again'),
  intent_full: L('ตี้นี้เต็มแล้ว ไว้รอบหน้ามาด้วยกันนะ', "This group's full. Catch the next one!"),
  intent_closed: POST_CLOSED,
  intent_not_found: POST_CLOSED,
  own_intent: L('อันนี้โพสต์ของเราเองนะ', "That's your own post"),
  blocked: L('ตอนนี้ติดต่อคนนี้ไม่ได้นะ', "You can't reach this person right now"),
  moshi_not_allowed: L(
    'ตอนนี้เขาเปิดรับโมชิเฉพาะบางคนอยู่ ลองเข้าห้องเดียวกับเขาแล้วทักกันในห้องก่อนนะ',
    "They're only taking moshis from some people right now. Try joining one of their rooms and saying hi there first",
  ),
  moshi_declined: L('เขายังไม่สะดวกคุยตอนนี้ ไม่เป็นไรนะ ยังมีเพื่อนอีกเยอะในห้อง', "They can't chat right now, and that's okay. There are plenty more friends in the rooms"),
  moshi_rate_limited: L('วันนี้ส่งโมชิไปเยอะแล้ว พักก่อน พรุ่งนี้ค่อยทักใหม่นะ', "You've sent lots of moshis today. Take a break and say hi again tomorrow"),
  cannot_moshi_self: L('ส่งโมชิหาตัวเองไม่ได้น้า', "You can't send a moshi to yourself, silly"),
  opener_invalid: L('ข้อความแรกยาวไปหรือว่างอยู่ ลองพิมพ์ใหม่อีกทีนะ', 'Your first message is empty or too long. Try again'),
  target_not_found: L('ไม่เจอคนนี้แล้ว อาจปิดบัญชีไปแล้วนะ', "We can't find this person. They may have closed their account"),
  chat_not_found: L('ไม่เจอแชทนี้แล้วนะ', "We can't find this chat anymore"),
  chat_not_pending: L('โมชินี้ตอบไปแล้วนะ', 'This moshi has already been answered'),
  not_allowed: NOT_ALLOWED,
  chat_full: NOT_ALLOWED,
  not_authenticated: SIGNED_OUT,
  too_young: L(
    'ตอนนี้ moshimoshi เปิดให้เพื่อนที่อายุ 20 ปีขึ้นไปก่อนนะ ไว้ถึงวันนั้นแล้วกลับมาหากันใหม่',
    "moshimoshi is for people aged 20 and up for now. Come find us again once you turn 20",
  ),
  age_required: L('บอกเดือนและปีเกิดก่อนนะ ใช้เช็กอายุ 20 ปีขึ้นไปเท่านั้น', "Tell us your birth month and year first. It's only used to check you're 20 or older"),
  message_not_found: L('ไม่เจอข้อความนี้แล้ว อาจถูกลบไปก่อนหน้านี้นะ', "We can't find this message. It may have been deleted"),
  report_rate_limited: L(
    'ชั่วโมงนี้ส่งรายงานไปหลายเรื่องแล้ว ทีมงานได้รับแล้วนะ พักสักครู่แล้วค่อยส่งเพิ่ม ถ้ามีอันตรายเร่งด่วน โทร 191 ก่อนเลย',
    "You've sent several reports this hour and the team has them. Please wait a bit before sending more. If you're in urgent danger, call 191 first",
  ),
}

/** The friendly line for a key the database raised, if it's one we know. */
export const knownError = (e: unknown): string | undefined => {
  const line = KEYS[asErr(e).message?.trim() ?? '']
  return line && tx(line)
}

/** "…พักอยู่ชั่วคราวถึง 2 พ.ย. …" when we know until when. */
function suspendedText(until?: string | null): string {
  const ms = until ? Date.parse(until) : NaN
  const day = Number.isFinite(ms) ? new Date(ms).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' }) : ''
  if (getLang() === 'en') {
    return `Your account is on a break${day ? ` until ${day}` : ''}, so you can't post or send messages yet. If you think this is a mistake, contact the team`
  }
  return `ตอนนี้บัญชีพักอยู่ชั่วคราว${day ? `ถึง ${day}` : ''} ยังโพสต์หรือส่งข้อความไม่ได้นะ ถ้าคิดว่าเป็นความเข้าใจผิด ทักทีมงานได้เลย`
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
  if (isNetworkError(e) || (typeof navigator !== 'undefined' && !navigator.onLine)) return t('เน็ตหลุดนิดนึง ยังบันทึกไม่ได้ ลองใหม่อีกทีนะ', "The connection dropped, so it didn't save. Try again")
  const key = message.trim()
  if (key === 'suspended') return suspendedText(suspendedUntil)
  if (KEYS[key]) return tx(KEYS[key])
  if (code === '23514' || /check constraint|too long/i.test(message)) return t('ข้อความยาวไปนิด ลองสั้นลงหน่อยนะ', "That's a little long. Try making it shorter")
  if (isRlsDenied(e)) return isSuspendedNow(suspendedUntil) ? suspendedText(suspendedUntil) : tx(NOT_ALLOWED)
  if (code === 'PGRST301' || /jwt/i.test(message)) return tx(SIGNED_OUT)
  return t('บันทึกไม่สำเร็จ ลองใหม่อีกทีนะ', "Couldn't save. Try again")
}
