import { EyeOff, ShieldCheck } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import { LegalLinks } from '@/pages/legal/LegalLinks'
import { ErrorNote } from '../AuthShell'
import { GoogleButton } from './GoogleButton'

/** Sign-in is Google only: one friendly button, no passwords, no codes. */
export function GoogleStep({ busy, error, onGoogle }: { busy: boolean; error: string | null; onGoogle: () => void }) {
  const id = useId()
  return (
    <>
      <h1 className="text-center font-display text-[1.65rem] font-semibold text-ink">มาเข้าโมชิกัน</h1>
      <p className="mx-auto mt-1 max-w-xs text-center text-[15px] text-ink-soft">
        เข้าด้วยบัญชี Google ได้ในคลิกเดียว ไม่ต้องจำรหัสผ่าน มาครั้งแรกก็สมัครให้เลย
      </p>

      <div className="mt-7">
        <GoogleButton busy={busy} disabled={busy} onClick={onGoogle} />
      </div>
      <div className="mt-2">
        <ErrorNote id={`${id}-err`} text={error} />
      </div>

      <ul className="mt-3 space-y-2 rounded-2xl bg-butter/35 px-4 py-3 text-sm text-ink">
        <li className="flex items-start gap-2.5">
          <ShieldCheck size={18} aria-hidden className="mt-0.5 shrink-0" />
          <span>เราใช้แค่ชื่อกับอีเมลจาก Google เพื่อสร้างบัญชี และไม่โพสต์อะไรแทนเธอแน่นอน</span>
        </li>
        <li className="flex items-start gap-2.5">
          <EyeOff size={18} aria-hidden className="mt-0.5 shrink-0" />
          <span>อีเมลไม่โชว์ให้ใครเห็น ในแอปเธอคือโมจิกับชื่อเล่นที่ตั้งเอง</span>
        </li>
      </ul>

      <LegalLinks consent className="mt-4 text-center" />
      <p className="mt-3 text-center text-xs leading-relaxed text-ink-soft">
        <Link to="/" className="font-semibold text-ink underline decoration-peach decoration-2 underline-offset-4">
          ยังไม่พร้อม? กลับไปดูหน้าแรกก่อนก็ได้
        </Link>
      </p>
    </>
  )
}
