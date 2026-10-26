import { motion } from 'motion/react'
import { Home, LogIn, RotateCcw } from 'lucide-react'
import { Avatar, Button, ButtonLink, type MochiFace } from '@/components/ui'
import { L, loc, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'

export type GateReason = 'demo' | 'signedOut' | 'denied' | 'error'

type Copy = { face: MochiFace; text: string }

const COPY: Record<GateReason, Copy> = {
  demo: loc<Copy>({
    face: 'sleepy',
    text: L('ตอนนี้แอปอยู่ในโหมดตัวอย่าง หน้านี้เปิดได้เฉพาะตอนเชื่อมต่อระบบจริงนะ', "The app is running on sample data. This page only opens when it's connected to the real backend"),
  }),
  signedOut: loc<Copy>({ face: 'wink', text: L('เข้าสู่ระบบด้วยบัญชีทีมงานก่อนนะ แล้วเดี๋ยวพากลับมาที่นี่', "Sign in with a staff account first, and we'll bring you right back here") }),
  denied: loc<Copy>({ face: 'smile', text: L('บัญชีนี้ยังไม่มีสิทธิ์ดูหน้านี้ ถ้าคิดว่าควรมี ทักทีมงานได้เลย', "This account doesn't have access to this page. If you think it should, contact the team") }),
  error: loc<Copy>({ face: 'sleepy', text: L('เช็กสิทธิ์ไม่สำเร็จ สัญญาณอาจหลุดไปนิด ลองใหม่อีกทีนะ', "Couldn't check your access. The connection may have dropped. Try again") }),
}

/** Friendly wall for anyone who isn't on the team (or when the app runs on sample data). */
export function StaffOnly({ reason, onRetry }: { reason: GateReason; onRetry?: () => void }) {
  const { face, text } = COPY[reason]
  return (
    <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.soft}
        className="card flex w-full max-w-md flex-col items-center gap-3 rounded-[2rem] px-6 py-10 text-center"
        role={reason === 'error' ? 'alert' : undefined}
      >
        <Avatar color="lavender" size={96} face={face} />
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">{t('หน้านี้สำหรับทีมงาน', 'Staff only')}</h1>
        <p className="max-w-xs text-ink-soft">{text}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {reason === 'signedOut' && (
            <ButtonLink to="/login?next=%2Fadmin" variant="dark" icon={<LogIn size={18} aria-hidden />}>
              {t('เข้าสู่ระบบ', 'Sign in')}
            </ButtonLink>
          )}
          {reason === 'error' && onRetry && (
            <Button icon={<RotateCcw size={18} aria-hidden />} onClick={onRetry}>
              {t('ลองใหม่', 'Try again')}
            </Button>
          )}
          <ButtonLink to={reason === 'demo' ? '/' : '/app'} variant={reason === 'denied' ? 'primary' : 'ghost'} icon={<Home size={18} aria-hidden />}>
            {t('กลับหน้าหลัก', 'Back to home')}
          </ButtonLink>
        </div>
      </motion.div>
    </main>
  )
}

export function StaffLoading() {
  return (
    <main className="relative z-10 flex min-h-dvh items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <span className="animate-bounce">
          <Avatar color="lavender" size={80} face="happy" />
        </span>
        <p className="font-display text-lg font-semibold text-ink">{t('กำลังเช็กสิทธิ์…', 'Checking access…')}</p>
      </div>
    </main>
  )
}
