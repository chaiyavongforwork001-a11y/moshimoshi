import { Link } from 'react-router'
import { IS_DRAFT } from './placeholders'

type Tone = 'light' | 'dark'

const TONE: Record<Tone, { text: string; link: string }> = {
  light: {
    text: 'text-ink-soft',
    link: 'font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink',
  },
  dark: {
    text: 'text-cream/75',
    link: 'font-semibold text-cream/90 underline decoration-cream/30 underline-offset-4 hover:text-cream hover:decoration-cream',
  },
}

/**
 * Links to /privacy and /terms. Default is a small footer row
 * ("นโยบายความเป็นส่วนตัว · ข้อตกลงการใช้งาน"); `consent` turns it into the
 * line under the sign-in buttons. `tone="dark"` for the ink landing footer,
 * `newTab` where leaving the page would lose what the person typed.
 */
export function LegalLinks({
  consent,
  tone = 'light',
  newTab,
  className = '',
}: {
  consent?: boolean
  tone?: Tone
  newTab?: boolean
  className?: string
}) {
  const t = TONE[tone]
  const target = newTab ? { target: '_blank', rel: 'noopener' } : {}
  const link = (to: string, label: string, cls = '') => (
    <Link to={to} className={`${t.link} ${cls}`} {...target}>
      {label}
      {newTab && <span className="sr-only"> (เปิดแท็บใหม่)</span>}
    </Link>
  )

  // a draft isn't in force yet, so nobody is asked to accept it
  if (consent) {
    return (
      <p className={`text-xs leading-relaxed ${t.text} ${className}`}>
        {IS_DRAFT ? (
          <>
            อ่าน {link('/terms', 'ข้อตกลงการใช้งาน')} และ {link('/privacy', 'นโยบายความเป็นส่วนตัว')} (ฉบับร่าง) ได้ก่อนเข้าใช้งาน
          </>
        ) : (
          <>
            เมื่อดำเนินการต่อ ถือว่าคุณยอมรับ {link('/terms', 'ข้อตกลงการใช้งาน')} และรับทราบ {link('/privacy', 'นโยบายความเป็นส่วนตัว')}
          </>
        )}
      </p>
    )
  }

  return (
    <nav aria-label="เอกสารทางกฎหมาย" className={`flex flex-wrap items-center gap-x-2 text-sm ${t.text} ${className}`}>
      {link('/privacy', 'นโยบายความเป็นส่วนตัว', 'inline-flex min-h-11 items-center')}
      <span aria-hidden>·</span>
      {link('/terms', 'ข้อตกลงการใช้งาน', 'inline-flex min-h-11 items-center')}
    </nav>
  )
}
