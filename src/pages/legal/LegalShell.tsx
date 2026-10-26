import { useReducedMotion } from 'motion/react'
import { ArrowUp, ChevronLeft, ListOrdered, TriangleAlert } from 'lucide-react'
import { useEffect, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Avatar, LangToggle } from '@/components/ui'
import { appTitle, getLang, t } from '@/lib/i18n'
import { useReviewNotes } from './bits'
import { LegalLinks } from './LegalLinks'
import { IS_DRAFT, LAST_UPDATED_ISO, lastUpdated } from './placeholders'

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

interface LegalShellProps {
  title: string
  /** opening paragraph under the title */
  lead: ReactNode
  /** plain-language bullets for "อ่านสั้นๆ ก่อน" */
  summary: ReactNode[]
  sections: LegalSection[]
  /** the closing "questions? write to us" line */
  contact: ReactNode
}

/** Back to wherever the person came from; straight to the landing page on a direct visit. */
function BackLink() {
  const navigate = useNavigate()
  const { key } = useLocation()
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (key === 'default' || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(-1)
  }
  return (
    <Link
      to="/"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-1 rounded-full bg-white pr-4 pl-2.5 font-display font-semibold text-ink shadow-[var(--shadow-soft)]"
    >
      <ChevronLeft size={20} aria-hidden />
      {t('ย้อนกลับ', 'Back')}
    </Link>
  )
}

function DraftBanner() {
  const review = useReviewNotes()
  return (
    <div role="note" className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-coral-deep/45 bg-butter/45 p-4">
      <TriangleAlert size={22} className="mt-0.5 shrink-0 text-coral-deep" aria-hidden />
      <div>
        <p className="font-display font-semibold leading-snug text-ink">
          {t('ฉบับร่าง · อยู่ระหว่างให้ทนายตรวจ ยังไม่มีผลใช้บังคับ', 'Draft · Under legal review and not yet in force')}
        </p>
        {review && (
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {t(
              'ข้อความใน [วงเล็บสีเหลือง] คือข้อมูลที่ยังต้องเติม ส่วนกล่องสีม่วงคือประเด็นที่ฝากทนายพิจารณา',
              'Text in [yellow brackets] is still to be filled in. Purple boxes are points for the lawyer to consider.',
            )}
          </p>
        )}
      </div>
    </div>
  )
}

/** Shared frame for /privacy and /terms: back link, draft banner, summary, contents, numbered sections. */
export function LegalShell({ title, lead, summary, sections, contact }: LegalShellProps) {
  const reduce = useReducedMotion()
  const { hash } = useLocation()

  useEffect(() => {
    document.title = `${title} · moshimoshi`
    // keep draft wording out of search results
    const robots = IS_DRAFT ? document.createElement('meta') : null
    if (robots) {
      robots.name = 'robots'
      robots.content = 'noindex'
      document.head.append(robots)
    }
    return () => {
      // the default title, in whatever language is current by then (a language switch remounts this page)
      document.title = appTitle()
      robots?.remove()
    }
  }, [title])

  // a shared link like /privacy#rights lands on that section (the page chunk loads after the router's own scroll)
  useEffect(() => {
    if (!hash) return
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [hash])

  const jump = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(id)
    if (!el) return
    e.preventDefault()
    // the address shows the section so it can be shared; history.state is react-router's, keep it
    history.replaceState(history.state, '', `#${id}`)
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
  }

  return (
    <div className="relative z-10 min-h-dvh">
      <header className="safe-top mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 sm:px-6">
        <BackLink />
        <div className="flex items-center gap-2 sm:gap-3">
          <LangToggle size="sm" />
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full pr-1 font-display text-lg font-semibold text-ink"
            aria-label={t('moshimoshi หน้าแรก', 'moshimoshi home')}
          >
            <Avatar color="cream" size={34} face="happy" />
            {/* just the mochi on narrow phones, so back link + toggle + logo fit one row */}
            <span className="max-[420px]:sr-only">moshimoshi</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-5 pb-16 sm:px-6">
        <article className="rounded-[2rem] bg-white/95 px-5 py-7 shadow-[var(--shadow-soft)] ring-1 ring-line sm:px-10 sm:py-10">
          {IS_DRAFT && <DraftBanner />}

          <h1 id="legal-top" tabIndex={-1} className="mt-7 scroll-mt-6 font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {t('แก้ไขล่าสุด', 'Last updated')} <time dateTime={LAST_UPDATED_ISO}>{lastUpdated()}</time>
          </p>
          {getLang() === 'en' && (
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              This English version is a translation for convenience. If the two versions differ, the Thai version applies.
            </p>
          )}
          <p className="mt-5 leading-[1.9] text-ink">{lead}</p>

          <section aria-labelledby="legal-summary" className="mt-6 rounded-3xl bg-cream-2 p-5">
            <h2 id="legal-summary" className="font-display text-lg font-semibold text-ink">
              {t('อ่านสั้นๆ ก่อน', 'The short version')}
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-6 leading-[1.85] text-ink marker:text-coral-deep">
              {summary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {t(
                'สรุปนี้ช่วยให้อ่านง่ายขึ้นเท่านั้น ถ้าไม่ตรงกัน ให้ยึดรายละเอียดในหัวข้อด้านล่าง',
                'This summary is only here to make things easier to read. If it differs from the sections below, the sections below apply.',
              )}
            </p>
          </section>

          <nav aria-labelledby="legal-toc" className="mt-6 rounded-3xl border border-line p-5">
            <h2 id="legal-toc" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <ListOrdered size={20} aria-hidden />
              {t('สารบัญ', 'Contents')}
            </h2>
            <ol className="mt-2 grid gap-x-6 sm:grid-cols-2">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={jump(s.id)}
                    className="flex min-h-11 items-baseline gap-2 py-2 leading-snug text-ink underline-offset-4 hover:underline"
                  >
                    <span className="w-6 shrink-0 text-right text-sm text-ink-soft tabular-nums">{i + 1}.</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {sections.map((s, i) => (
            <section key={s.id} aria-labelledby={s.id} className="mt-10 border-t border-line pt-8">
              <h2 id={s.id} tabIndex={-1} className="scroll-mt-6 font-display text-xl font-semibold text-ink sm:text-2xl">
                <span className="mr-2 text-ink-soft tabular-nums">{i + 1}.</span>
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}

          <footer className="mt-12 rounded-3xl bg-cream-2 p-5">
            <p className="leading-[1.85] text-ink">{contact}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4">
              <LegalLinks />
              <a
                href="#legal-top"
                onClick={jump('legal-top')}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
              >
                <ArrowUp size={16} aria-hidden />
                {t('กลับขึ้นด้านบน', 'Back to top')}
              </a>
            </div>
          </footer>
        </article>
      </main>
    </div>
  )
}
