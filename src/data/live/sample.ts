import { INTENTS, USERS } from '@/data/mock'
import { isLive } from '@/lib/supabase'
import type { Intent, User } from '@/lib/types'

/*
 * VITE_DEMO_PEOPLE=true keeps the mock people (and their posts) around in
 * live mode so a brand-new community doesn't look empty. They are samples:
 * chats with them stay on this device and their replies are simulated.
 */
export const DEMO_PEOPLE = isLive && import.meta.env.VITE_DEMO_PEOPLE === 'true'

export const SAMPLE_PEOPLE: User[] = DEMO_PEOPLE ? USERS : []
export const SAMPLE_INTENTS: Intent[] = DEMO_PEOPLE ? INTENTS : []

/** ids of the sample people (empty unless VITE_DEMO_PEOPLE is on) */
export const SAMPLE_IDS: ReadonlySet<string> = new Set(SAMPLE_PEOPLE.map((u) => u.id))

export const isSample = (userId: string | undefined) => !!userId && SAMPLE_IDS.has(userId)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Server rows have uuid ids; mock, sample and not-yet-saved records don't. */
export const isServerId = (id: string | undefined) => !!id && UUID.test(id)
