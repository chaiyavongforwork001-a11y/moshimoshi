import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/*
 * Live mode = both env vars present. Without them the app stays in demo mode
 * (mock data, simulated replies, no login) and `supabase` is null.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isLive = !!(url && key)

/**
 * The sign-in email shows a 6-digit code only once the project has custom
 * SMTP and a template with {{ .Token }}; until then it carries just a link.
 * Set VITE_AUTH_EMAIL_CODE=true after that change.
 */
export const emailHasCode = import.meta.env.VITE_AUTH_EMAIL_CODE === 'true'

export type Db = SupabaseClient<Database>

export const supabase: Db | null = isLive
  ? createClient<Database>(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  : null

/** The client, for code that only runs in live mode. */
export function db(): Db {
  if (!supabase) throw new Error('Supabase is not configured (demo mode)')
  return supabase
}

export const supabaseUrl = url ?? ''
export const supabaseKey = key ?? ''
