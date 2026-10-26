import { AnimatePresence, motion } from 'motion/react'
import { LogOut, RotateCcw } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Avatar, Button } from '@/components/ui'
import { useDataError, useDataReady } from '@/data/hooks'
import { retrySync, startSync, stopSync } from '@/data/live/sync'
import { signOut, useAuth } from '@/lib/auth'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'

/** Starts the live sync for whoever is signed in, and tears it down on sign-out. */
export function LiveBoot() {
  const { status, userId } = useAuth()
  useEffect(() => {
    if (status === 'signedIn' && userId) startSync(userId)
    else if (status === 'signedOut') stopSync({ clear: true })
  }, [status, userId])
  return null
}

/**
 * Live mode: signed out → /login?next=…, signed in but new → /onboarding,
 * and nothing renders until the first sync has my profile. Demo: pass-through.
 * "New" = never finished onboarding and never passed its 20+ step: someone who
 * passed it and tapped "ข้ามไปก่อน" (birth year saved) may use the app.
 */
export function RequireAuth({ children, onboarding = false }: { children: ReactNode; onboarding?: boolean }) {
  const { status } = useAuth()
  const ready = useDataReady()
  const error = useDataError()
  const onboarded = useMoshi((s) => s.onboarded)
  const birthYear = useMoshi((s) => s.me.birthYear)
  const location = useLocation()

  if (status === 'demo') return children
  if (status === 'signedOut') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (error) return <BootScreen error={error} />
  if (status === 'loading' || !ready) return <BootScreen />
  if (!onboarding && !onboarded && !birthYear) return <Navigate to="/onboarding" replace />
  return children
}

function BootScreen({ error }: { error?: 'network' | 'load' }) {
  return (
    <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
      {error ? (
        <div className="card flex w-full max-w-md flex-col items-center gap-3 rounded-[2rem] px-6 py-10 text-center" role="alert">
          <Avatar color="sky" size={96} face="sleepy" />
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">{t('สัญญาณยังไม่มา', 'No signal yet')}</h1>
          <p className="max-w-xs text-ink-soft">
            {error === 'network'
              ? t('ต่อเน็ตไม่ติด ลองเช็กสัญญาณแล้วกดลองใหม่นะ', "Can't connect. Check your signal and tap try again")
              : t('ดึงข้อมูลไม่สำเร็จ ลองใหม่อีกครั้งนะ', "Couldn't load. Try again")}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button icon={<RotateCcw size={18} aria-hidden />} onClick={retrySync}>
              {t('ลองใหม่', 'Try again')}
            </Button>
            <Button variant="ghost" icon={<LogOut size={18} aria-hidden />} onClick={() => void signOut()}>
              {t('ออกจากระบบ', 'Sign out')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center" role="status">
          <span className="animate-bounce">
            <Avatar color="peach" size={88} face="happy" />
          </span>
          <p className="font-display text-lg font-semibold text-ink">{t('กำลังเตรียมห้องให้…', 'Getting your rooms ready…')}</p>
        </div>
      )}
    </main>
  )
}

/**
 * Small toast for things that didn't go through (live writes). Phones: at the top,
 * clear of the composers and sticky action bars at the bottom. Desktop: bottom.
 */
export function LiveToast() {
  const notice = useMoshi((s) => s.notice)
  const clear = useMoshi((s) => s.clearNotice)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(clear, 4500)
    return () => window.clearTimeout(timer)
  }, [notice, clear])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] flex justify-center px-4 lg:top-auto lg:bottom-8"
    >
      <AnimatePresence>
        {notice && (
          <motion.button
            key={notice.id}
            type="button"
            onClick={clear}
            initial={{ opacity: 0, y: -16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.16 } }}
            transition={spring.bouncy}
            className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full bg-ink py-2 pr-4 pl-2 text-left text-sm font-semibold text-cream shadow-[var(--shadow-lift)]"
          >
            <Avatar color="peach" size={30} face="wow" />
            <span>{notice.text}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
