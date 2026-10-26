import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { resetCatalog, useCatalog } from '@/data/catalog'
import { resetPersonalState, useMoshi } from '@/lib/store'
import { db, supabase } from '@/lib/supabase'
import { applyToCache } from './apply'
import { clearAliases, onChange, resolveId } from './bus'
import { createCache, putChatMember, type Cache } from './cache'
import { isNetworkError } from './errors'
import { ensureProfiles, loadAll, loadChat, loadRecentlySeen, loadRoomHistory } from './load'
import {
  apply,
  chatsPatch,
  intentsPatch,
  myIntentsPatch,
  mySamesPatch,
  peoplePatch,
  publishAll,
  questionsPatch,
  roomMessagesPatch,
  roomsPatch,
  sessionsPatch,
} from './publish'
import type { Change, LiveTable } from './rows'
import { markChatRead, touchLastSeen } from './writes'

/*
 * One live session per signed-in user: realtime → first load → heartbeat.
 * Realtime events and our own writes (via the change bus) update the cache,
 * then only the affected slices are re-published.
 * No realtime presence on purpose: a presence channel ignores blocks (anyone
 * could watch who's online). Online dots come from last_seen_at, which the
 * heartbeat writes and profiles RLS hides across a block.
 */

const REALTIME: LiveTable[] = [
  'room_messages',
  'room_message_sames',
  'chat_messages',
  'chats',
  'chat_members',
  'intents',
  'intent_joins',
  'daily_answers',
]
const HEARTBEAT_MS = 2 * 60_000
const TICK_MS = 60_000
/** how long the first load waits for realtime before going ahead (a later SUBSCRIBED catches up) */
const SUBSCRIBE_WAIT_MS = 4000
/** a tab hidden longer than this reloads everything when it comes back */
const STALE_MS = 3 * 60_000

interface LiveSession {
  cache: Cache
  channels: RealtimeChannel[]
  stops: (() => void)[]
  /** changes that arrive while a full reload is running */
  buffer: Change[] | null
  /** a reload was asked for while one was running: run another when it ends */
  again: boolean
  roomLoads: Map<string, Promise<void>>
  chatLoads: Map<string, Promise<void>>
  connected: boolean
  dropped: boolean
  attempts: number
  hiddenAt: number
}

let current: LiveSession | null = null
const alive = (s: LiveSession) => current === s

export function startSync(userId: string) {
  if (current?.cache.me === userId) return
  // someone else was signed in on this tab: start from a clean slate
  if (current) stopSync({ clear: true })
  const s: LiveSession = {
    cache: createCache(userId),
    channels: [],
    stops: [],
    buffer: null,
    again: false,
    roomLoads: new Map(),
    chatLoads: new Map(),
    connected: false,
    dropped: false,
    attempts: 0,
    hiddenAt: 0,
  }
  current = s
  s.stops.push(onChange((ch) => applyChange(s, ch)))
  useCatalog.getState().set({ mode: 'live', ready: false, error: null })
  void firstLoad(s)
}

export function stopSync(opts: { clear?: boolean } = {}) {
  const s = current
  current = null
  if (s) {
    s.stops.forEach((stop) => stop())
    s.channels.forEach((ch) => void supabase?.removeChannel(ch))
  }
  if (opts.clear) {
    clearAliases()
    resetCatalog()
    resetPersonalState()
  }
}

/** After the first load failed for good: the retry button. */
export function retrySync() {
  const s = current
  if (!s) return
  s.attempts = 0
  useCatalog.getState().set({ error: null })
  void firstLoad(s)
}

async function firstLoad(s: LiveSession) {
  try {
    // listen first, then load: changes committed while loading are buffered and replayed
    if (!s.channels.length) await subscribe(s)
    if (!alive(s)) return
    await refresh(s)
    if (!alive(s) || s.connected) return
    s.connected = true
    startTimers(s)
  } catch (err) {
    if (!alive(s)) return
    console.warn('[moshi] first sync failed', err)
    if (++s.attempts < 3) window.setTimeout(() => alive(s) && void firstLoad(s), 1500 * s.attempts)
    else
      useCatalog.getState().set({
        error: isNetworkError(err) ? 'network' : 'load',
      })
  }
}

/** Reload everything into a fresh cache, then swap it in (changes meanwhile are replayed). */
async function refresh(s: LiveSession) {
  if (s.buffer) {
    s.again = true
    return
  }
  s.buffer = []
  try {
    const fresh = createCache(s.cache.me)
    await loadAll(fresh)
    // keep the history of rooms opened earlier in this session
    await Promise.all([...s.cache.roomMsgs.keys()].filter((r) => !fresh.roomMsgs.has(r)).map((r) => loadRoomHistory(fresh, r)))
    if (!alive(s)) return
    s.cache = fresh
    publishAll(fresh)
  } finally {
    const buffered = s.buffer ?? []
    s.buffer = null
    if (alive(s)) buffered.forEach((ch) => applyChange(s, ch))
    if (s.again && alive(s)) {
      s.again = false
      void refresh(s).catch((err) => console.warn('[moshi] refresh failed', err))
    }
  }
}

// ------------------------------------------------------------------ lazy loads

/** Load a room's last messages the first time it is opened (no-op in demo mode). */
export function ensureRoomHistory(roomId: string): Promise<void> {
  const s = current
  if (!s || !roomId || s.cache.roomMsgs.has(roomId)) return Promise.resolve()
  let p = s.roomLoads.get(roomId)
  if (!p) {
    const cache = s.cache
    p = loadRoomHistory(cache, roomId)
      .then(() => {
        if (!alive(s)) return
        // a full reload swapped the cache meanwhile: load into the new one
        if (s.cache !== cache) return void window.setTimeout(() => void ensureRoomHistory(roomId))
        const r = roomMessagesPatch(s.cache, [roomId])
        apply({ ...r.cat, ...peoplePatch(s.cache) }, { ...r.mine, ...mySamesPatch(s.cache) })
      })
      .catch((err) => console.warn('[moshi] room history failed', err))
      .finally(() => s.roomLoads.delete(roomId))
    s.roomLoads.set(roomId, p)
  }
  return p
}

function needChat(s: LiveSession, chatId: string) {
  if (s.chatLoads.has(chatId)) return
  const cache = s.cache
  const p = loadChat(cache, chatId)
    .then((ok) => {
      if (!alive(s) || !ok) return
      if (s.cache !== cache) return void window.setTimeout(() => alive(s) && needChat(s, chatId))
      apply(peoplePatch(s.cache), { ...chatsPatch(s.cache), ...mySamesPatch(s.cache) })
    })
    .catch((err) => console.warn('[moshi] chat load failed', err))
    .finally(() => s.chatLoads.delete(chatId))
  s.chatLoads.set(chatId, p)
}

function needProfiles(s: LiveSession, ids: string[]) {
  ensureProfiles(s.cache, ids)
    .then((changed) => {
      if (!changed || !alive(s)) return
      // someone hidden (a block) may have just written, posted or answered: drop it
      const c = s.cache
      const r = roomMessagesPatch(c, c.roomMsgs.keys())
      apply({ ...peoplePatch(c), ...intentsPatch(c), ...questionsPatch(c), ...r.cat }, { ...r.mine, ...myIntentsPatch(c) })
    })
    .catch((err) => console.warn('[moshi] profile load failed', err))
}

/** A message landed in the chat that's open on screen: it's read already. */
function readIfOpen(s: LiveSession, chatId: string, createdAt: string) {
  const m = window.location.pathname.match(/^\/app\/chats\/([^/]+)/)
  if (!m || resolveId(decodeURIComponent(m[1])) !== chatId || document.visibilityState !== 'visible') return
  const at = new Date(Math.max(Date.now(), Date.parse(createdAt) || 0)).toISOString()
  putChatMember(s.cache, { chat_id: chatId, user_id: s.cache.me, last_read_at: at }, true)
  markChatRead(chatId).catch(() => {})
}

// ------------------------------------------------------------------ changes

function applyChange(s: LiveSession, ch: Change) {
  if (s.buffer) {
    s.buffer.push(ch)
    return
  }
  applyToCache(s.cache, ch, {
    needChat: (id) => needChat(s, id),
    needProfiles: (ids) => needProfiles(s, ids),
    readIfOpen: (id, at) => readIfOpen(s, id, at),
  })
}

// ------------------------------------------------------------------ realtime

/** Resolves once realtime is listening (or failed, or SUBSCRIBE_WAIT_MS passed — then a later SUBSCRIBED reloads). */
function subscribe(s: LiveSession): Promise<void> {
  // a fresh topic per session: an old channel that never got its unsubscribe ack can't be handed back
  const channel = db().channel(`db:${s.cache.me}:${Math.random().toString(36).slice(2, 10)}`)
  for (const table of REALTIME) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      // a channel that outlived its session (no unsubscribe ack) must not write into the stores
      if (!alive(s)) return
      const row = payload.eventType === 'DELETE' ? payload.old : payload.new
      applyChange(s, { table, type: payload.eventType, row } as unknown as Change)
    })
  }
  s.channels.push(channel)
  return new Promise((resolve) => {
    let waiting = true
    const done = () => {
      if (!waiting) return
      waiting = false
      window.clearTimeout(timer)
      resolve()
    }
    const timer = window.setTimeout(() => {
      s.dropped = true
      done()
    }, SUBSCRIBE_WAIT_MS)
    s.stops.push(done)
    try {
      channel.subscribe((status) => {
        if (!alive(s)) return done()
        if (status === 'SUBSCRIBED') {
          // back after a drop (or later than the first load went ahead): we may have missed changes
          if (s.dropped && !waiting) void refresh(s).catch((err) => console.warn('[moshi] refresh failed', err))
          s.dropped = false
          done()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          s.dropped = true
          done()
        }
      })
    } catch (err) {
      console.warn('[moshi] realtime failed', err)
      s.dropped = true
      done()
    }
  })
}

function startTimers(s: LiveSession) {
  const me = s.cache.me
  /** fresh online dots (nobody streams other people's last_seen_at to us) */
  const seen = () => {
    const cache = s.cache
    loadRecentlySeen(cache)
      .then((changed) => {
        if (changed && alive(s) && s.cache === cache) apply({ ...peoplePatch(cache), ...roomsPatch(cache) }, {})
      })
      .catch((err) => console.warn('[moshi] online refresh failed', err))
  }
  const beat = () => {
    if (document.visibilityState !== 'visible') return
    touchLastSeen(me).catch(() => {})
    seen()
  }
  beat()
  let ticks = 0
  const hb = window.setInterval(beat, HEARTBEAT_MS)
  // relative labels ("5 นาทีที่แล้ว"), the 5-minute online window, expiring posts
  const tick = window.setInterval(() => {
    const c = s.cache
    const slow = ++ticks % 5 === 0
    apply(
      { ...peoplePatch(c), ...roomsPatch(c), ...(slow ? { ...intentsPatch(c), ...sessionsPatch(c) } : {}) },
      slow ? myIntentsPatch(c) : {},
    )
  }, TICK_MS)

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      s.hiddenAt = Date.now()
      return
    }
    beat()
    if (s.hiddenAt && Date.now() - s.hiddenAt > STALE_MS) void refresh(s).catch((err) => console.warn('[moshi] refresh failed', err))
    s.hiddenAt = 0
  }
  const onOnline = () => void refresh(s).catch((err) => console.warn('[moshi] refresh failed', err))
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('online', onOnline)

  // my own joins/leaves change room counts right away (and the new room's chat should stay in sync)
  const unsub = useMoshi.subscribe((st, prev) => {
    if (st.me.rooms === prev.me.rooms || !alive(s)) return
    apply(roomsPatch(s.cache), {})
    st.me.rooms.filter((r) => !prev.me.rooms.includes(r)).forEach((r) => void ensureRoomHistory(r))
  })

  s.stops.push(() => {
    window.clearInterval(hb)
    window.clearInterval(tick)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('online', onOnline)
    unsub()
  })
}
