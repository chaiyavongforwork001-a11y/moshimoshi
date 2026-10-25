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
