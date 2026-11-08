import type { Change } from './rows'

/*
 * Our own successful writes and realtime events travel the same road: the
 * store emits the row a write returned, sync applies it to its local copy.
 * Kept import-free so the store and sync can both use it without a cycle.
 */
type Listener = (change: Change) => void

const listeners = new Set<Listener>()

export function emitChange(change: Change) {
  listeners.forEach((fn) => fn(change))
}

export function onChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// Optimistic records get a temporary id ("tmp-…") that pages may already hold
// (e.g. the chat a moshi just opened). Once the server answers, the temporary
// id keeps resolving to the real one.
const aliases = new Map<string, string>()

export const TMP = 'tmp-'
export const tmpId = () => `${TMP}${Math.random().toString(36).slice(2, 10)}`
export const isTmp = (id: string) => id.startsWith(TMP)

export function aliasId(tmp: string, real: string) {
  aliases.set(tmp, real)
}

export function resolveId(id: string): string {
  return aliases.get(id) ?? id
}

export function clearAliases() {
  aliases.clear()
}

// Optimistic edits that sync's copy doesn't hold yet (it gets the row when the write answers):
// a rebuild of the chats from that copy keeps showing them meanwhile.
/** my photo switch per chat while its write is out (the object tells taps apart) */
export const pendingConsent = new Map<string, { on: boolean }>()
/** messages I'm taking back, while the delete is out */
export const unsending = new Set<string>()
/** people I'm unblocking, while the delete is out (a reload that read the old list keeps them unblocked) */
export const unblocking = new Set<string>()

export function clearPending() {
  pendingConsent.clear()
  unsending.clear()
  unblocking.clear()
}

// A full reload, the same one a reconnect runs. Sync registers it while a session is live; e.g. an
// unblock asks for it so what the block hid (their profile, posts and chats) comes back.
// `profiles`: people to fetch even if the newest-first profile load doesn't reach them.
type Reload = (profiles?: string[]) => Promise<void>
let reloader: Reload | null = null

export function onReload(fn: Reload): () => void {
  reloader = fn
  return () => {
    if (reloader === fn) reloader = null
  }
}

export const requestReload: Reload = (profiles) => reloader?.(profiles) ?? Promise.resolve()
