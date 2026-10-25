import { Mail, Send } from 'lucide-react'
import { useId, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui'
import { emailHasCode } from '@/lib/supabase'
import { Divider, ErrorNote } from '../AuthShell'
import { useSecondsLeft } from './CodeStep'
import { GoogleButton } from './GoogleButton'

interface EmailStepProps {
  email: string
  onEmail: (v: string) => void
  error: string | null
  busy: 'email' | 'google' | 'code' | null
  /** epoch ms until the server lets us send another code */
  waitUntil: number
  onSubmit: () => void
  onGoogle: () => void
}

export function EmailStep({ email, onEmail, error, busy, waitUntil, onSubmit, onGoogle }: EmailStepProps) {
  const id = useId()
  const left = useSecondsLeft(waitUntil)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }
  return (
    <>
      <h1 className="text-center font-display text-[1.65rem] font-semibold text-ink">มาเข้าโมชิกัน</h1>
      <p className="mx-auto mt-1 max-w-xs text-center text-[15px] text-ink-soft">
        {emailHasCode ? 'ใส่อีเมลแล้วเราจะส่งรหัส 6 หลักไปให้' : 'ใส่อีเมลแล้วเราจะส่งลิงก์เข้าแอปไปให้'} ไม่ต้องจำรหัสผ่าน มาครั้งแรกก็สมัครให้เลย
      </p>

      <form onSubmit={submit} noValidate className="mt-6">
        <label htmlFor={`${id}-email`} className="mb-1.5 block text-sm font-semibold text-ink">
          อีเมล
        </label>
        <div className="relative">
          <Mail size={19} aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint" />
          <input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            aria-invalid={!!error || undefined}
            aria-describedby={`${id}-err`}
            disabled={busy !== null}
            className="h-14 w-full rounded-2xl border-2 border-line bg-white pr-4 pl-11 text-base text-ink transition-colors outline-none placeholder:text-ink-faint/70 focus:border-coral focus-visible:outline-none disabled:opacity-60"
          />
        </div>
        <div className="mt-1.5">
          <ErrorNote id={`${id}-err`} text={error} />
        </div>
        <Button
          type="submit"
          size="lg"
          block
          className="mt-2"
          disabled={busy !== null || left > 0}
          icon={<Send size={19} aria-hidden />}
          aria-busy={busy === 'email' || undefined}
        >
          {busy === 'email' ? 'กำลังส่ง…' : left > 0 ? `ส่งได้อีกครั้งใน ${left} วิ` : emailHasCode ? 'ส่งรหัสให้หน่อย' : 'ส่งลิงก์ให้หน่อย'}
        </Button>
      </form>

      <Divider label="หรือ" />
      <GoogleButton busy={busy === 'google'} disabled={busy !== null} onClick={onGoogle} />

      <p className="mt-5 text-center text-xs leading-relaxed text-ink-soft">
        เราไม่โชว์อีเมลให้ใครเห็น และไม่โพสต์อะไรแทนเธอแน่นอน
        <br />
        <Link to="/" className="font-semibold text-ink underline decoration-peach decoration-2 underline-offset-4">
          ยังไม่พร้อม? กลับไปดูหน้าแรกก่อนก็ได้
        </Link>
      </p>
    </>
  )
}
