import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { stopSync } from '@/data/live/sync'
import { resetPersonalState } from './store'
import { db, isLive, supabase, supabaseKey, supabaseUrl } from './supabase'

export type AuthStatus = 'demo' | 'loading' | 'signedOut' | 'signedIn'

interface AuthState {
  status: AuthStatus
  session: Session | null
}

const useAuthStore = create<AuthState>()(() => ({ status: isLive ? 'loading' : 'demo', session: null }))

// INITIAL_SESSION fires once the client has read storage and handled any
// ?code= in the URL, so 'loading' always resolves through this listener.
let lastUid: string | null = null
supabase?.auth.onAuthStateChange((_event, session) => {
  const uid = session?.user.id ?? null
  // another tab signed in as someone else: drop the previous person's data before anything renders it
  if (lastUid && uid !== lastUid) stopSync({ clear: true })
  lastUid = uid
  useAuthStore.setState({ status: session ? 'signedIn' : 'signedOut', session })
})

export function useAuth() {
  const status = useAuthStore((s) => s.status)
  const session = useAuthStore((s) => s.session)
  return { status, session, userId: session?.user.id ?? null }
}

export const getAuthState = () => useAuthStore.getState()

const callbackUrl = () => `${window.location.origin}/auth/callback`

interface AuthSettings {
  external?: Record<string, boolean>
}

let settings: Promise<AuthSettings | null> | null = null

/** Public auth settings (which providers are on). null when unreachable. */
function authSettings(): Promise<AuthSettings | null> {
  settings ??= fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseKey } })
    .then((r) => (r.ok ? (r.json() as Promise<AuthSettings>) : null))
    .catch(() => null)
  return settings
}

/** Redirects to Google. Throws `provider_disabled` up front instead of landing on a raw error page. */
export async function signInWithGoogle() {
  const s = await authSettings()
  if (s?.external && s.external.google === false) throw Object.assign(new Error('Google provider is not enabled'), { code: 'provider_disabled' })
  const { error } = await db().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl() } })
  if (error) throw error
}

/** Signs out of this device and clears everything personal back to a clean state. */
export async function signOut() {
  try {
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) console.warn('[moshi] sign-out', error)
    }
  } finally {
    stopSync({ clear: true })
    resetPersonalState()
  }
}

// ------------------------------------------------------------------ where to go after signing in

const NEXT_KEY = 'moshi-next'

/** Only same-site app paths; never bounce back into the auth pages. */
export function safeNext(next: string | null | undefined): string | null {
  // backslashes and control characters can turn "/\evil.com" into "//evil.com" in a browser
  if (!next || !next.startsWith('/') || /[\\\u0000-\u001f\u007f]/.test(next)) return null
  let u: URL
  try {
    u = new URL(next, window.location.origin)
  } catch {
    return null
  }
  if (u.origin !== window.location.origin || /^\/(login|auth)(\/|$)/.test(u.pathname)) return null
  return u.pathname + u.search + u.hash
}

/** Remember ?next= across the email / Google round trip (the link may open in a new tab). */
export function rememberNext(next: string | null) {
  try {
    const safe = safeNext(next)
    if (safe) localStorage.setItem(NEXT_KEY, safe)
    else localStorage.removeItem(NEXT_KEY)
  } catch {
    /* storage blocked: we just land on /app */
  }
}

export function peekNext(): string | null {
  try {
    return safeNext(localStorage.getItem(NEXT_KEY))
  } catch {
    return null
  }
}

export function clearNext() {
  try {
    localStorage.removeItem(NEXT_KEY)
  } catch {
    /* nothing to clear */
  }
}

/** '/onboarding' for new people (same rule as the route guard), otherwise `next` (or '/app'). */
export async function pathAfterSignIn(next: string | null): Promise<string> {
  const { data } = await db().auth.getSession()
  const uid = data.session?.user.id
  if (!uid) return '/login'
  const res = await db().from('profiles').select('onboarded,birth_year').eq('id', uid).maybeSingle()
  const row = res.data as { onboarded?: boolean | null; birth_year?: number | null } | null
  if (!row?.onboarded && !row?.birth_year) return '/onboarding'
  // "เริ่มเลย" on the landing page asks for /onboarding: someone who already finished it goes home
  const target = safeNext(next) ?? '/app'
  return row?.onboarded && target.startsWith('/onboarding') ? '/app' : target
}
