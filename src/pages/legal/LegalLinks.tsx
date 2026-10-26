import { Link } from 'react-router'
import { getLang, t } from '@/lib/i18n'
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
  const look = TONE[tone]
  const target = newTab ? { target: '_blank', rel: 'noopener' } : {}
  const link = (to: string, label: string, cls = '') => (
    <Link to={to} className={`${look.link} ${cls}`} {...target}>
      {label}
      {newTab && <span className="sr-only">{t(' (เปิดแท็บใหม่)', ' (opens in a new tab)')}</span>}
    </Link>
  )
  const privacy = t('นโยบายความเป็นส่วนตัว', 'Privacy Policy')
  const terms = t('ข้อตกลงการใช้งาน', 'Terms of Use')
  const en = getLang() === 'en'

  // a draft isn't in force yet, so nobody is asked to accept it
  if (consent) {
    const termsLink = link('/terms', terms)
    const privacyLink = link('/privacy', privacy)
    let line
    if (IS_DRAFT) {
      line = en ? (
        <>You can read the {termsLink} and {privacyLink} (drafts) before you start.</>
      ) : (
        <>อ่าน {termsLink} และ {privacyLink} (ฉบับร่าง) ได้ก่อนเข้าใช้งาน</>
      )
    } else {
      line = en ? (
        <>By continuing, you agree to the {termsLink} and acknowledge the {privacyLink}.</>
      ) : (
        <>เมื่อดำเนินการต่อ ถือว่าคุณยอมรับ {termsLink} และรับทราบ {privacyLink}</>
      )
    }
    return <p className={`text-xs leading-relaxed ${look.text} ${className}`}>{line}</p>
  }

  return (
    <nav aria-label={t('เอกสารทางกฎหมาย', 'Legal documents')} className={`flex flex-wrap items-center gap-x-2 text-sm ${look.text} ${className}`}>
      {link('/privacy', privacy, 'inline-flex min-h-11 items-center')}
      <span aria-hidden>·</span>
      {link('/terms', terms, 'inline-flex min-h-11 items-center')}
    </nav>
  )
}
