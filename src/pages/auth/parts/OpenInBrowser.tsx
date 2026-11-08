import { Check, Compass, Copy, Ellipsis, EllipsisVertical, ExternalLink, Share } from 'lucide-react'
import { motion, useAnimate, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Button, Zone } from '@/components/ui'
import { t } from '@/lib/i18n'
import { copyText, wayOut, withoutMark, type InAppBrowser, type PhoneOs } from '@/lib/inAppBrowser'
import { spring } from '@/lib/motion'
import { Divider } from '../AuthShell'

/** "in Safari" on iPhone, "in Chrome" on Android: the browser people will recognise. */
const inBrowserOf = (os: PhoneOs) => (os === 'ios' ? t('ใน Safari', 'in Safari') : os === 'android' ? t('ใน Chrome', 'in Chrome') : t('ในเบราว์เซอร์', 'in your browser'))

interface OpenInBrowserProps {
  browser: InAppBrowser
  /** the page came back with our mark while still inside the app: the jump didn't happen */
  tried: boolean
  /** bumps each time Google is pressed in here: the card bounces and takes focus */
  nudge: number
  /** id for the "why" line, so the Google button can point to it */
  whyId: string
}

/**
 * The login page inside LINE, Facebook, Instagram, TikTok…: why Google won't work in here, the
 * best way out for this app and phone, the app-menu steps, and "copy link" as the last resort.
 */
export function OpenInBrowser({ browser, tried, nudge, whyId }: OpenInBrowserProps) {
  const reduce = useReducedMotion()
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const actionRef = useRef<HTMLButtonElement>(null)
  const copyRef = useRef<HTMLButtonElement>(null)
  const [stuck, setStuck] = useState(false)
  const stopWatch = useRef<(() => void) | null>(null)
  useEffect(() => () => stopWatch.current?.(), [])

  const way = wayOut(browser, window.location.href)
  const target = way.kind === 'menu' ? null : way.href
  const inBrowser = inBrowserOf(browser.os)
  const fromApp = browser.name ? t(`จาก ${browser.name}`, browser.name) : t('จากในแอป', 'this app')

  // Google pressed in here: bring the card into view and put focus on the way out
  const seen = useRef(0)
  useEffect(() => {
    const el = scope.current
    if (nudge === seen.current || !el) return
    seen.current = nudge
    el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
    const focusTo = actionRef.current ?? copyRef.current
    focusTo?.focus({ preventScroll: true })
    if (!reduce) animate(el, { scale: [1, 1.03, 0.99, 1] }, { duration: 0.5, ease: 'easeOut' })
  }, [nudge, reduce, animate, scope])

  // after a tap on the way out: still on screen a moment later means nothing opened
  const watch = () => {
    stopWatch.current?.()
    const stop = () => {
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', stop)
      window.removeEventListener('blur', stop)
      document.removeEventListener('visibilitychange', onHide)
      stopWatch.current = null
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') stop()
    }
    const timer = window.setTimeout(() => {
      stop()
      setStuck(true)
    }, 2500)
    window.addEventListener('pagehide', stop)
    window.addEventListener('blur', stop)
    document.addEventListener('visibilitychange', onHide)
    stopWatch.current = stop
  }

  const open = () => {
    if (!target) return
    watch()
    window.location.assign(target)
  }

  return (
    <div ref={scope} className="relative">
      {nudge > 0 && (
        <motion.span
          key={nudge}
          aria-hidden
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
          className="pointer-events-none absolute -inset-1.5 rounded-[2.1rem] ring-4 ring-butter"
        />
      )}
      <Zone tone="lavender" icon={<Compass size={18} strokeWidth={2.4} />} title={t('เปิดในเบราว์เซอร์ก่อนนะ', 'Open in your browser first')}>
        <p id={whyId} className="text-sm text-ink">
          {t(
            `Google ไม่ให้ล็อกอินในหน้าที่เปิด${fromApp} เปิดหน้านี้${inBrowser} แล้วเข้าได้เลย`,
            `Google doesn't allow sign-in inside ${fromApp}. Open this page ${inBrowser} and you're in`,
          )}
        </p>
        <div aria-live="polite">
          {(stuck || tried) && (
            <p className="mt-3 rounded-2xl bg-butter/45 px-3 py-2 text-sm font-semibold text-ink">
              {t('ยังไม่เปิดเหรอ? ลองทำตามขั้นตอนข้างล่าง หรือคัดลอกลิงก์ไปวางเองนะ', "Didn't open? Try the steps below, or copy the link and paste it yourself")}
            </p>
          )}
        </div>

        {target ? (
          <>
            <Button ref={actionRef} block icon={<ExternalLink size={18} aria-hidden />} onClick={open} className="mt-3">
              {way.kind === 'line' ? t('เปิดในเบราว์เซอร์', 'Open in browser') : t('เปิดใน Chrome', 'Open in Chrome')}
            </Button>
            <Divider label={t('หรือ', 'or')} />
          </>
        ) : (
          <div className="h-3" aria-hidden />
        )}

        <MenuSteps os={browser.os} />
        <CopyLink href={withoutMark(window.location.href)} inBrowser={inBrowser} buttonRef={copyRef} />
      </Zone>
    </div>
  )
}

/** A little picture of the button to look for (the words around it say what it is). */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden className="mx-0.5 inline-flex size-6 items-center justify-center rounded-full bg-white align-middle text-ink ring-1 ring-line">
      {children}
    </span>
  )
}

/** The app's own menu: works in every app, and the only way out on iPhone. */
function MenuSteps({ os }: { os: PhoneOs }) {
  const first =
    os === 'ios' ? (
      <>
        {t('แตะปุ่มจุดสามจุด', 'Tap the three-dot button')}{' '}
        <Glyph>
          <Ellipsis size={15} strokeWidth={2.6} />
        </Glyph>{' '}
        {t('หรือปุ่มแชร์', 'or the share button')}{' '}
        <Glyph>
          <Share size={13} strokeWidth={2.4} />
        </Glyph>{' '}
        {t('ที่มุมจอ', 'in a corner of the screen')}
      </>
    ) : os === 'android' ? (
      <>
        {t('แตะปุ่มจุดสามจุด', 'Tap the three-dot button')}{' '}
        <Glyph>
          <EllipsisVertical size={15} strokeWidth={2.6} />
        </Glyph>{' '}
        {t('ที่มุมขวาบน', 'at the top right')}
      </>
    ) : (
      t('เปิดเมนูของแอป', 'Open the app menu')
    )
  const second =
    os === 'ios'
      ? t('เลือก “เปิดใน Safari” หรือ “เปิดในเบราว์เซอร์”', 'Choose “Open in Safari” or “Open in browser”')
      : os === 'android'
        ? t('เลือก “เปิดใน Chrome” หรือ “เปิดในเบราว์เซอร์”', 'Choose “Open in Chrome” or “Open in browser”')
        : t('เลือก “เปิดในเบราว์เซอร์”', 'Choose “Open in browser”')
  return (
    // 24px lines: room for Thai tone marks, and the little button pictures sit right in the line
    <ol role="list" aria-label={t('เปิดจากเมนูของแอป', 'Open it from the app menu')} className="space-y-2 text-sm leading-6 text-ink">
      {[first, second].map((step, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-lavender/60 font-display text-xs font-bold text-ink">
            {i + 1}
          </span>
          <span className="min-w-0">{step}</span>
        </li>
      ))}
    </ol>
  )
}

/** "Copy link" to paste into a real browser. When the clipboard is blocked too, the link shows up selected, to copy by hand. */
function CopyLink({ href, inBrowser, buttonRef }: { href: string; inBrowser: string; buttonRef: RefObject<HTMLButtonElement | null> }) {
  const [copies, setCopies] = useState(0)
  const [manual, setManual] = useState(false)
  const fieldRef = useRef<HTMLInputElement>(null)
  const fieldId = useId()

  useEffect(() => {
    if (!manual) return
    fieldRef.current?.focus()
    fieldRef.current?.select()
  }, [manual])

  const copy = async () => {
    if (await copyText(href)) setCopies((n) => n + 1)
    else setManual(true)
  }

  return (
    <div className="mt-4">
      <Button
        ref={buttonRef}
        variant="secondary"
        block
        icon={copies ? <Check size={18} strokeWidth={2.8} aria-hidden /> : <Copy size={18} aria-hidden />}
        onClick={() => void copy()}
      >
        {copies ? t('คัดลอกลิงก์แล้ว', 'Link copied') : t('คัดลอกลิงก์', 'Copy link')}
      </Button>
      <p aria-live="polite" className="mt-1.5 text-center text-xs text-ink-soft">
        {copies > 0 && <span key={copies}>{t(`ไปวาง${inBrowser} ได้เลย`, `Now paste it ${inBrowser}`)}</span>}
      </p>
      {manual && (
        <div className="mt-2">
          <label htmlFor={fieldId} className="block text-xs font-semibold text-ink">
            {t('กดค้างที่ลิงก์ แล้วเลือก “คัดลอก”', 'Press and hold the link, then choose “Copy”')}
          </label>
          {/* 16px text: iPhone zooms in on anything smaller */}
          <input
            id={fieldId}
            ref={fieldRef}
            readOnly
            value={href}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 h-11 w-full rounded-2xl border border-line bg-white px-3 text-base text-ink"
          />
        </div>
      )}
    </div>
  )
}

/** Under the Google button inside an app: why that press stayed here, and a way on in case we guessed the browser wrong. */
export function InAppNudge({ browser, nudge, onAnyway }: { browser: InAppBrowser; nudge: number; onAnyway: () => void }) {
  const reduce = useReducedMotion()
  const inBrowser = inBrowserOf(browser.os)
  return (
    <div aria-live="polite">
      {nudge > 0 && (
        <motion.div
          key={nudge}
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.soft}
          className="mt-3 rounded-2xl bg-lavender/25 px-4 pt-3 pb-1 text-sm text-ink"
        >
          <p className="font-semibold">
            {t(`ยังกด Google ในนี้ไม่ได้ เปิดหน้านี้${inBrowser} ตามกล่องข้างบนก่อนนะ`, `Google won't work in here. Open this page ${inBrowser} first, using the box above`)}
          </p>
          <button
            type="button"
            onClick={onAnyway}
            className="inline-flex min-h-11 items-center text-left font-semibold text-ink-soft underline decoration-peach decoration-2 underline-offset-4 hover:text-ink"
          >
            {t(`ตอนนี้อยู่${inBrowser} แล้ว? กดเข้าต่อได้เลย`, `Already ${inBrowser}? Continue with Google`)}
          </button>
        </motion.div>
      )}
    </div>
  )
}
