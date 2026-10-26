import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import type { MochiFace } from '@/components/ui'
import { clearNext, pathAfterSignIn, peekNext, rememberNext, safeNext, signInWithGoogle, useAuth } from '@/lib/auth'
import { t } from '@/lib/i18n'
import { AuthShell } from './AuthShell'
import { authErrorText } from './errors'
import { GoogleStep } from './parts/GoogleStep'

/** '/login' — Google sign-in only, in the mochi's voice. */
export default function LoginPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const { status } = useAuth()
  const navigate = useNavigate()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const google = async () => {
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

  const face: MochiFace = error ? 'wow' : busy ? 'happy' : 'smile'
  const bubble = error ? t('อุ๊ย นิดนึง', 'Oops, tiny hiccup') : busy ? t('ไปกันเลย~', 'Off we go~') : t('หวัดดี! มาคุยกัน', "Hi! Let's chat")

  return (
    <AuthShell face={face} bubble={bubble} color="peach">
      <GoogleStep busy={busy} error={error} onGoogle={google} />
    </AuthShell>
  )
}
