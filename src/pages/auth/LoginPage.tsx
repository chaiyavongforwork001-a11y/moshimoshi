import { useEffect, useId, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import type { MochiFace } from '@/components/ui'
import { clearNext, pathAfterSignIn, peekNext, rememberNext, safeNext, signInWithGoogle, useAuth } from '@/lib/auth'
import { t } from '@/lib/i18n'
import { currentInAppBrowser, OUTSIDE_MARK } from '@/lib/inAppBrowser'
import { AuthShell } from './AuthShell'
import { authErrorText } from './errors'
import { GoogleStep } from './parts/GoogleStep'
import { InAppNudge, OpenInBrowser } from './parts/OpenInBrowser'

/** '/login' — Google sign-in only, in the mochi's voice. */
export default function LoginPage() {
  const [params, setParams] = useSearchParams()
  const next = safeNext(params.get('next'))
  const { status } = useAuth()
  const navigate = useNavigate()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // opened from LINE, Facebook, Instagram, TikTok…: Google won't sign anyone in inside an app's own browser
  const [inApp] = useState(currentInAppBrowser)
  // Google pressed in there (each press points at the way out again), or "already in Safari? go on" chosen
  const [nudge, setNudge] = useState(0)
  const [anyway, setAnyway] = useState(false)
  const whyId = useId()
  const googleId = useId()
  const marked = params.has(OUTSIDE_MARK)

  // made it out into a real browser: take LINE's mark back out of the address
  useEffect(() => {
    if (inApp || !marked || status === 'demo') return
    setParams(
      (p) => {
        const clean = new URLSearchParams(p)
        clean.delete(OUTSIDE_MARK)
        return clean
      },
      { replace: true },
    )
  }, [inApp, marked, status, setParams])

  // back from Google with the browser's Back button (bfcache): unfreeze the page
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false)
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  // already signed in (or just came back signed in): move on
  useEffect(() => {
    if (status !== 'signedIn') return
    let gone = false
    const target = next ?? peekNext()
    pathAfterSignIn(target)
      .catch(() => target ?? '/app')
      .then((path) => {
        if (gone) return
        clearNext()
        navigate(path, { replace: true })
      })
    return () => {
      gone = true
    }
  }, [status, next, navigate])

  if (status === 'demo') return <Navigate to={next ?? '/app'} replace />
  // don't flash the button while we find out whether they're signed in
  if (status === 'loading' || status === 'signedIn')
    return (
      <AuthShell face="talk" color="mint" bubble={t('แป๊บนึงนะ', 'One sec!')}>
        <p role="status" className="py-6 text-center font-display text-lg font-semibold text-ink">
          {t('กำลังเช็กว่าเข้าอยู่แล้วหรือยัง…', "Checking if you're already signed in…")}
        </p>
      </AuthShell>
    )

  const signIn = async () => {
    setBusy(true)
    setError(null)
    try {
      rememberNext(next)
      await signInWithGoogle() // leaves the page on success
    } catch (err) {
      setError(authErrorText(err))
      setBusy(false)
    }
  }

  // inside an app's browser Google only shows its "403 disallowed_useragent" dead end: point at the way out instead
  const blocked = !!inApp && !anyway
  const google = () => {
    if (blocked) setNudge((n) => n + 1)
    else void signIn()
  }
  const goAnyway = () => {
    // the note holding this button goes away: focus lands on the Google button, as after a normal press
    document.getElementById(googleId)?.focus()
    setAnyway(true)
    void signIn()
  }

  const face: MochiFace = error ? 'wow' : busy ? 'happy' : blocked ? 'talk' : 'smile'
  const bubble = error
    ? t('อุ๊ย นิดนึง', 'Oops, tiny hiccup')
    : busy
      ? t('ไปกันเลย~', 'Off we go~')
      : blocked
        ? t('ไปเปิดในเบราว์เซอร์กัน~', "Let's hop to your browser~")
        : t('หวัดดี! มาคุยกัน', "Hi! Let's chat")

  return (
    <AuthShell face={face} bubble={bubble} color="peach">
      <GoogleStep
        busy={busy}
        error={error}
        onGoogle={google}
        googleId={googleId}
        blocked={blocked}
        describedBy={blocked ? whyId : undefined}
        notice={inApp ? <OpenInBrowser browser={inApp} tried={marked} nudge={nudge} whyId={whyId} /> : undefined}
        hint={blocked && inApp ? <InAppNudge browser={inApp} nudge={nudge} onAnyway={goAnyway} /> : undefined}
      />
    </AuthShell>
  )
}
