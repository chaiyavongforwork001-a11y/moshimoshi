import type { EmailOtpType } from '@supabase/supabase-js'
import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { ButtonLink } from '@/components/ui'
import { clearNext, pathAfterSignIn, peekNext } from '@/lib/auth'
import { db, isLive } from '@/lib/supabase'
import { AuthShell } from './AuthShell'
import { authErrorText } from './errors'

let handling: { href: string; result: Promise<string> } | null = null

/**
 * Finishes any sign-in that lands here: PKCE `?code=` (Google, magic link —
 * usually already exchanged by the client on start-up), `?token_hash=` links,
 * or an error from the provider. Resolves to where we should go next.
 */
function finishSignIn(href: string): Promise<string> {
  if (handling?.href === href) return handling.result
  const result = (async () => {
    const url = new URL(href)
    const hash = new URLSearchParams(url.hash.slice(1))
    const pick = (k: string) => url.searchParams.get(k) ?? hash.get(k)
    const failed = pick('error_code') ?? pick('error')
    if (failed) throw { code: failed, message: pick('error_description') ?? '' }

    const auth = db().auth
    let session = (await auth.getSession()).data.session
    if (!session) {
      const tokenHash = url.searchParams.get('token_hash')
      const code = url.searchParams.get('code')
      if (tokenHash) {
        const type = (url.searchParams.get('type') ?? 'email') as EmailOtpType
        const { data, error } = await auth.verifyOtp({ token_hash: tokenHash, type })
        if (error) throw error
        session = data.session
      } else if (code) {
        const { data, error } = await auth.exchangeCodeForSession(code)
        if (error) throw error
        session = data.session
      }
    }
    if (!session) throw { code: 'no_session' }
    return pathAfterSignIn(url.searchParams.get('next') ?? peekNext())
  })()
  handling = { href, result }
  return result
}

/** '/auth/callback' — a quick "opening the door" moment, then on to the app. */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLive) return
    let gone = false
    finishSignIn(window.location.href)
      .then((path) => {
        if (gone) return
        clearNext()
        navigate(path, { replace: true })
      })
      .catch((err) => {
        console.warn('[moshi] sign-in callback', err)
        if (!gone) setError(authErrorText(err))
      })
    return () => {
      gone = true
    }
  }, [navigate])

  if (!isLive) return <Navigate to="/" replace />

  if (error) {
    return (
      <AuthShell face="sleepy" color="sky" bubble="ประตูติดนิดนึง">
        <div className="text-center">
          <h1 className="font-display text-[1.6rem] font-semibold text-ink">เข้าไม่สำเร็จ</h1>
          <p className="mx-auto mt-2 max-w-xs text-ink-soft" role="alert">
            {error}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <ButtonLink to="/login" replace size="lg" block icon={<RotateCcw size={18} aria-hidden />}>
              ลองเข้าอีกครั้ง
            </ButtonLink>
            <ButtonLink to="/" replace variant="ghost" block>
              กลับหน้าแรก
            </ButtonLink>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell face="talk" color="mint" bubble="แป๊บนึงนะ">
      <div className="flex flex-col items-center py-2 text-center" role="status">
        <h1 className="font-display text-[1.6rem] font-semibold text-ink">กำลังเปิดประตูให้…</h1>
        <p className="mt-1 text-ink-soft">เช็กว่าเป็นเธอจริงๆ แล้วจะพาเข้าบ้านโมชิเลย</p>
        <span className="mt-5 flex gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-3 animate-bounce rounded-full bg-coral" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </span>
      </div>
    </AuthShell>
  )
}
