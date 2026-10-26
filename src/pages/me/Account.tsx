import { LogOut, Mail } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Section } from '@/components/ui'
import { signOut, useAuth } from '@/lib/auth'
import { t } from '@/lib/i18n'

/** Live mode only: which account this is, and a way out. */
export function Account() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const email = session?.user.email
  const viaGoogle = session?.user.app_metadata?.provider === 'google'

  const leave = async () => {
    setLeaving(true)
    try {
      await signOut()
      navigate('/', { replace: true })
    } finally {
      setLeaving(false)
    }
  }

  return (
    <Section title={t('บัญชีของเรา', 'My account')}>
      <div className="card flex flex-wrap items-center gap-3 rounded-3xl p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sky/50">
          <Mail size={19} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink-soft">{viaGoogle ? t('เข้าสู่ระบบด้วย Google', 'Signed in with Google') : t('เข้าสู่ระบบด้วยอีเมล', 'Signed in with email')}</span>
          <span className="block truncate font-semibold text-ink">{email ?? t('บัญชีนี้', 'This account')}</span>
        </span>
        <Button variant="soft" icon={<LogOut size={17} aria-hidden />} disabled={leaving} onClick={leave}>
          {leaving ? t('กำลังออก…', 'Signing out…') : t('ออกจากระบบ', 'Sign out')}
        </Button>
      </div>
      <p className="mt-2 px-1 text-xs text-ink-soft">
        {t('ออกจากระบบแล้ว แชทและโปรไฟล์ยังอยู่ครบ กลับมาเข้าด้วยบัญชีเดิมได้ทุกเมื่อ', 'Your chats and profile stay safe when you sign out. Come back with the same account any time')}
      </p>
    </Section>
  )
}
