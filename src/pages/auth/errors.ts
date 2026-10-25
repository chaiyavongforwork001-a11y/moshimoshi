// Supabase auth errors → friendly Thai. Codes first, then message patterns
// (older servers send only a message).

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
    return 'เน็ตหลุดนิดนึง ลองเช็กสัญญาณแล้วลองใหม่อีกทีนะ'
  if (code === 'provider_disabled' || /provider is not enabled|unsupported provider/i.test(msg)) return 'ยังไม่ได้เปิดล็อกอินด้วย Google ใช้อีเมลไปก่อนนะ'
  if (code === 'email_provider_disabled' || code === 'otp_disabled' || /email logins are disabled|signups not allowed for otp/i.test(msg))
    return 'ตอนนี้ยังเข้าด้วยอีเมลไม่ได้ ลองใหม่ทีหลังนะ'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || err.status === 429 || /rate limit|only request this after/i.test(msg))
    return 'ขอรหัสถี่ไปนิด พักสักครู่แล้วค่อยลองใหม่นะ'
  if (code === 'otp_expired' || /token has expired|is invalid|invalid otp|otp.*expired/i.test(msg))
    return 'รหัสไม่ถูกหรือหมดอายุแล้ว ลองเช็กอีกที หรือขอรหัสใหม่ได้เลย'
  if (code === 'email_address_invalid' || code === 'validation_failed' || /invalid.*email|unable to validate email/i.test(msg))
    return 'อีเมลนี้ดูแปลกๆ ลองพิมพ์ใหม่อีกทีนะ'
  if (code === 'email_address_not_authorized') return 'อีเมลนี้ยังรับรหัสไม่ได้ ลองใช้อีเมลอื่นนะ'
  if (code === 'signup_disabled') return 'ตอนนี้ยังปิดรับเพื่อนใหม่อยู่ ไว้กลับมาใหม่นะ'
  if (code === 'user_banned') return 'บัญชีนี้ถูกพักการใช้งานอยู่'
  if (code === 'bad_code_verifier' || code === 'flow_state_not_found' || code === 'flow_state_expired' || /code verifier|flow state/i.test(msg))
    return 'ลิงก์นี้ต้องเปิดในเบราว์เซอร์เดียวกับที่ขอรหัสไว้ ลองพิมพ์รหัส 6 หลักแทนก็ได้นะ'
  if (code === 'no_session') return 'ลิงก์นี้ใช้ไปแล้วหรือหมดอายุ ขอรหัสใหม่ได้เลยนะ'
  if (code === 'bad_oauth_callback' || code === 'bad_oauth_state' || /access_denied/i.test(code + msg)) return 'การเข้าด้วย Google ไม่สำเร็จ ลองใหม่อีกครั้งนะ'
  return 'มีอะไรสะดุดนิดหน่อย ลองใหม่อีกทีนะ'
}
