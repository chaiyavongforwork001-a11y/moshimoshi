import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import type { MochiFace } from '@/components/ui'
import { clearNext, pathAfterSignIn, peekNext, rememberNext, safeNext, signInWithEmailOtp, signInWithGoogle, useAuth, verifyEmailOtp } from '@/lib/auth'
import { spring } from '@/lib/motion'
import { AuthShell } from './AuthShell'
import { authErrorText } from './errors'
import { CodeStep } from './parts/CodeStep'
import { EmailStep } from './parts/EmailStep'

type Busy = 'email' | 'google' | 'code' | null

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const RESEND_S = 60

/** "you can only request this after 37 seconds" → 37 */
function waitSeconds(err: unknown): number | null {
  const msg = err && typeof err === 'object' ? String((err as { message?: string }).message ?? '') : ''
  const m = msg.match(/after (\d+) seconds?/i)
  return m ? Number(m[1]) : null
}

/** '/login' — email code (or magic link) and Google, in the mochi's voice. */
export default function LoginPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const { status } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [resendAt, setResendAt] = useState(0)
  /** the server asked us to wait before sending another code (rate limit) */
  const [waitUntil, setWaitUntil] = useState(0)
  const [resent, setResent] = useState(false)
  const [verified, setVerified] = useState(false)

  // back from Google with the browser's Back button (bfcache): unfreeze the page
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(null)
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  // signed in (here, by the magic link in another tab, or already): move on
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
  // already signed in (or still finding out): don't flash the form before moving on
  if (status === 'loading' || (status === 'signedIn' && !verified))
    return (
      <AuthShell face="talk" color="mint" bubble="แป๊บนึงนะ">
        <p role="status" className="py-6 text-center font-display text-lg font-semibold text-ink">
          กำลังเช็กว่าเข้าอยู่แล้วหรือยัง…
        </p>
      </AuthShell>
    )

  const sendCode = async () => {
    const value = email.trim()
    if (!EMAIL.test(value)) {
      setError('ลองพิมพ์อีเมลให้ครบอีกทีนะ เช่น name@gmail.com')
      return
    }
    setBusy('email')
    setError(null)
    try {
      rememberNext(next)
      await signInWithEmailOtp(value)
      setEmail(value)
      setCode('')
      setResent(step === 'code')
      setStep('code')
      setResendAt(Date.now() + RESEND_S * 1000)
    } catch (err) {
      const wait = waitSeconds(err)
      if (wait) {
        setResendAt(Date.now() + wait * 1000)
        setWaitUntil(Date.now() + wait * 1000)
      }
      setResent(false)
      setError(authErrorText(err))
    } finally {
      setBusy(null)
    }
  }

  const verify = async (token: string) => {
    if (busy || verified) return
    setBusy('code')
    setError(null)
    try {
      await verifyEmailOtp(email, token)
      setVerified(true) // the auth listener flips to signedIn and the effect above routes us
    } catch (err) {
      setError(authErrorText(err))
      setCode('')
      setShake((n) => n + 1)
    } finally {
      setBusy(null)
    }
  }

  const google = async () => {
    setBusy('google')
    setError(null)
    try {
      rememberNext(next)
      await signInWithGoogle() // leaves the page on success
    } catch (err) {
      setError(authErrorText(err))
      setBusy(null)
    }
  }

  const face: MochiFace = verified ? 'happy' : error ? 'wow' : busy ? 'talk' : step === 'code' ? 'wink' : 'smile'
  const bubble = verified ? 'เย้! เข้าแล้ว' : error ? 'อุ๊ย นิดนึง' : step === 'code' ? 'เช็กอีเมลแป๊บนะ' : 'หวัดดี! มาคุยกัน'

  return (
    <AuthShell face={face} bubble={bubble} color={step === 'code' ? 'butter' : 'peach'}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: step === 'code' ? 32 : -32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: step === 'code' ? -32 : 32, transition: { duration: 0.16 } }}
          transition={spring.soft}
        >
          {step === 'email' ? (
            <EmailStep
              email={email}
              onEmail={(v) => {
                setEmail(v)
                if (error) setError(null)
              }}
              error={error}
              busy={busy}
              waitUntil={waitUntil}
              onSubmit={sendCode}
              onGoogle={google}
            />
          ) : (
            <CodeStep
              email={email}
              code={code}
              onCode={(v) => {
                setCode(v)
                if (error) setError(null)
              }}
              error={error}
              shake={shake}
              busy={busy}
              verified={verified}
              resendAt={resendAt}
              resent={resent}
              onVerify={verify}
              onResend={sendCode}
              onBack={() => {
                setStep('email')
                setError(null)
                setCode('')
                setResent(false)
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  )
}
