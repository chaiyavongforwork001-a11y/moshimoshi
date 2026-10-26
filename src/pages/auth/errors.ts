// Supabase auth errors → friendly Thai. Codes first, then message patterns
// (older servers send only a message).

import { t } from '@/lib/i18n'

interface AuthErrLike {
  code?: string
  error_code?: string
  status?: number
  message?: string
  name?: string
}

export function authErrorText(e: unknown): string {
  const err = (e && typeof e === 'object' ? e : {}) as AuthErrLike
  const code = err.code ?? err.error_code ?? ''
  const msg = err.message ?? ''

  if (err.name === 'AuthRetryableFetchError' || err.status === 0 || /failed to fetch|network/i.test(msg))
    return t('เน็ตหลุดนิดนึง ลองเช็กสัญญาณแล้วลองใหม่อีกทีนะ', 'The connection dropped. Check your signal and try again')
  if (code === 'provider_disabled' || /provider is not enabled|unsupported provider/i.test(msg)) return t('ยังไม่ได้เปิดล็อกอินด้วย Google ใช้อีเมลไปก่อนนะ', "Google sign-in isn't switched on yet. Use email for now")
  if (code === 'email_provider_disabled' || code === 'otp_disabled' || /email logins are disabled|signups not allowed for otp/i.test(msg))
    return t('ตอนนี้ยังเข้าด้วยอีเมลไม่ได้ ลองใหม่ทีหลังนะ', "Email sign-in isn't available right now. Try again later")
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || err.status === 429 || /rate limit|only request this after/i.test(msg))
    return t('ขอรหัสถี่ไปนิด พักสักครู่แล้วค่อยลองใหม่นะ', 'Too many tries in a row. Take a short break, then try again')
  if (code === 'otp_expired' || /token has expired|is invalid|invalid otp|otp.*expired/i.test(msg))
    return t('รหัสไม่ถูกหรือหมดอายุแล้ว ลองเช็กอีกที หรือขอรหัสใหม่ได้เลย', "That code is wrong or has expired. Double-check it, or ask for a new one")
  if (code === 'email_address_invalid' || code === 'validation_failed' || /invalid.*email|unable to validate email/i.test(msg))
    return t('อีเมลนี้ดูแปลกๆ ลองพิมพ์ใหม่อีกทีนะ', "That email looks a bit off. Try typing it again")
  if (code === 'email_address_not_authorized') return t('อีเมลนี้ยังรับรหัสไม่ได้ ลองใช้อีเมลอื่นนะ', "This email can't get codes yet. Try another one")
  if (code === 'signup_disabled') return t('ตอนนี้ยังปิดรับเพื่อนใหม่อยู่ ไว้กลับมาใหม่นะ', "We're not taking new friends just yet. Come back soon")
  if (code === 'user_banned') return t('บัญชีนี้ถูกพักการใช้งานอยู่', 'This account is suspended')
  if (code === 'bad_code_verifier' || code === 'flow_state_not_found' || code === 'flow_state_expired' || /code verifier|flow state/i.test(msg))
    return t('ลิงก์นี้ต้องเปิดในเบราว์เซอร์เดียวกับที่ขอรหัสไว้ ลองพิมพ์รหัส 6 หลักแทนก็ได้นะ', 'Open this link in the same browser you asked for the code in, or type the 6-digit code instead')
  if (code === 'no_session') return t('ลิงก์นี้ใช้ไปแล้วหรือหมดอายุ ขอรหัสใหม่ได้เลยนะ', 'This link was already used or has expired. Go ahead and ask for a new code')
  if (code === 'bad_oauth_callback' || code === 'bad_oauth_state' || /access_denied/i.test(code + msg)) return t('การเข้าด้วย Google ไม่สำเร็จ ลองใหม่อีกครั้งนะ', "Google sign-in didn't work. Try again")
  return t('มีอะไรสะดุดนิดหน่อย ลองใหม่อีกทีนะ', 'Something tripped up. Try again')
}
