import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { t } from '@/lib/i18n'
import type { MochiColor } from '@/lib/types'
import { Zone } from './Zone'

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
        <h1 className="overflow-x-clip font-display text-2xl font-semibold lg:text-3xl">{title}</h1>
        {subtitle && <p className="truncate text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

/** A framed zone of a page (see Zone): a title band with an optional action, then the content. */
export function Section({
  title,
  action,
  icon,
  note,
  tone,
  children,
  className = '',
}: {
  title?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  note?: ReactNode
  tone?: MochiColor
  children: ReactNode
  className?: string
}) {
  return (
    <Zone title={title} action={action} icon={icon} note={note} tone={tone} className={`mt-5 ${className}`}>
      {children}
    </Zone>
  )
}
