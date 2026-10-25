import { ArrowLeft, LogIn, MailCheck, RotateCw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import { emailHasCode } from '@/lib/supabase'
import { ErrorNote } from '../AuthShell'
import { CODE_LENGTH, CodeInput } from './CodeInput'

interface CodeStepProps {
  email: string
  code: string
  onCode: (v: string) => void
  error: string | null
  /** bump to shake the boxes */
  shake: number
  busy: 'email' | 'google' | 'code' | null
  verified: boolean
  /** epoch ms when "ส่งอีกครั้ง" unlocks */
  resendAt: number
  /** a new code just went out ("ส่งรหัสอีกครั้ง" worked) */
  resent: boolean
  onVerify: (code: string) => void
  onResend: () => void
  onBack: () => void
}

export function useSecondsLeft(until: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    if (until <= Date.now()) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [until])
  return Math.max(0, Math.ceil((until - now) / 1000))
}

export function CodeStep({ email, code, onCode, error, shake, busy, verified, resendAt, resent, onVerify, onResend, onBack }: CodeStepProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const left = useSecondsLeft(resendAt)

  useEffect(() => {
    input.current?.focus({ preventScroll: true })
  }, [])
  // a wrong code clears the boxes: put the cursor back for another try
  useEffect(() => {
    if (shake) input.current?.focus({ preventScroll: true })
  }, [shake])

  return (
    <>
      <h1 className="text-center font-display text-[1.65rem] font-semibold text-ink">
        {emailHasCode ? 'ใส่รหัสจากอีเมลนะ' : 'เช็กอีเมลแล้วกดลิงก์นะ'}
      </h1>
      <p className="mx-auto mt-1 max-w-xs text-center text-[15px] text-ink-soft">
        {emailHasCode ? `ส่งรหัส ${CODE_LENGTH} หลักไปที่ ` : 'ส่งลิงก์เข้าแอปไปที่ '}
        <b className="font-semibold break-all text-ink">{email}</b> แล้ว
      </p>

      {emailHasCode && (
      <form
        noValidate
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (code.length === CODE_LENGTH) onVerify(code)
        }}
      >
        <CodeInput
          ref={input}
          value={code}
          onChange={onCode}
          onComplete={onVerify}
          disabled={busy === 'code' || verified}
          invalid={!!error}
          describedBy={`${id}-err ${id}-hint`}
          shake={shake}
        />
        <div className="mt-2">
          {resent && !error ? (
            <p role="status" className="min-h-6 text-sm text-ink-soft">
              ส่งใหม่ให้แล้ว เช็กอีเมลอีกทีนะ
            </p>
          ) : (
            <ErrorNote id={`${id}-err`} text={error} />
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          block
          className="mt-2"
          disabled={code.length < CODE_LENGTH || busy !== null || verified}
          icon={<LogIn size={19} aria-hidden />}
          aria-busy={busy === 'code' || undefined}
        >
          {verified ? 'เข้าแล้ว! กำลังพาไป…' : busy === 'code' ? 'กำลังเช็กรหัส…' : 'เข้าเลย'}
        </Button>
      </form>
      )}

      <p id={`${id}-hint`} className="mt-4 flex items-start gap-2.5 rounded-2xl bg-butter/35 px-4 py-3 text-sm text-ink">
        <MailCheck size={18} aria-hidden className="mt-0.5 shrink-0" />
        <span>
          {emailHasCode ? 'หรือกดลิงก์ในอีเมลก็เข้าได้เหมือนกัน' : 'กดปุ่ม Sign in ในอีเมล แล้วจะพากลับมาที่แอปเอง'} เปิดในเบราว์เซอร์นี้นะ
          ไม่เจอเมลลองดูในสแปมหรือโปรโมชันก่อน
        </span>
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} aria-hidden />} onClick={onBack} disabled={busy !== null}>
          เปลี่ยนอีเมล
        </Button>
        <Button variant="soft" size="sm" icon={<RotateCw size={16} aria-hidden />} onClick={onResend} disabled={left > 0 || busy !== null}>
          {left > 0 ? `ส่งใหม่ได้ใน ${left} วิ` : busy === 'email' ? 'กำลังส่ง…' : emailHasCode ? 'ส่งรหัสอีกครั้ง' : 'ส่งลิงก์อีกครั้ง'}
        </Button>
      </div>
    </>
  )
}
