import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { t } from '@/lib/i18n'

/** Page title row. On phones it's sticky with a soft blur; `back` shows a back button. */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
  className = '',
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: boolean | string
  action?: ReactNode
  className?: string
}) {
  const navigate = useNavigate()
  return (
    <header className={`safe-top sticky top-0 z-30 -mx-4 mb-2 flex items-center gap-3 bg-cream/75 px-4 pb-3 backdrop-blur-xl lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pt-8 lg:backdrop-blur-none ${className}`}>
      {back && (
        <button
          type="button"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          aria-label={t('ย้อนกลับ', 'Back')}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-[var(--shadow-soft)]"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-2xl font-semibold lg:text-3xl">{title}</h1>
        {subtitle && <p className="truncate text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

/** Content section with an optional title row and trailing link/action. */
export function Section({
  title,
  action,
  children,
  className = '',
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`mt-7 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-end justify-between gap-3">
          {title && <h2 className="font-display text-xl font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
