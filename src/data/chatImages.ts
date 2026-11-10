import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChatImage } from '@/lib/types'

/*
 * Photos in 1:1 chats live in the private "chat-images" bucket, one folder per chat:
 *   <chat id>/<random uuid>-<width>x<height>.jpg
 * The size in the name lets a bubble keep its shape before the photo arrives. The database
 * checks this exact shape (supabase/migrations/20261108000004_chat_images.sql).
 */

export const CHAT_IMAGES = 'chat-images'
/** photos in rooms: r/<room id>/<uuid>-<w>x<h>.jpg (supabase/migrations/20261110000001_room_admin_photos_open_age.sql) */
export const ROOM_IMAGES = 'room-images'

const PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}-([1-9]\d{0,3})x([1-9]\d{0,3})\.jpg$/
const ROOM_PATH = /^r\/[a-z0-9-]{1,40}\/[0-9a-f-]{36}-([1-9]\d{0,3})x([1-9]\d{0,3})\.jpg$/

export function roomImagePath(roomId: string, width: number, height: number) {
  return `r/${roomId}/${crypto.randomUUID()}-${width}x${height}.jpg`
}

/** which bucket a stored photo path lives in */
export const bucketOf = (path: string) => (path.startsWith('r/') ? ROOM_IMAGES : CHAT_IMAGES)

export function chatImagePath(chatId: string, width: number, height: number) {
  return `${chatId}/${crypto.randomUUID()}-${width}x${height}.jpg`
}

/** A stored photo path back into a ChatImage (undefined: not a photo path). */
export function imageFromPath(path: string): ChatImage | undefined {
  const m = PATH.exec(path) ?? ROOM_PATH.exec(path)
  return m ? { path, width: Number(m[1]), height: Number(m[2]) } : undefined
}

export const isChatImagePath = (text: string) => PATH.test(text)

// ------------------------------------------------------------------ links to open a photo
// The bucket is private: each photo opens through a signed link that works for an hour.
// Uploads ask browsers and the CDN to keep a copy no longer than that (writes.ts).

export const LINK_SECONDS = 3600
const links = new Map<string, { url: string; until: number }>()
const pending = new Map<string, Promise<string>>()
/** photos I sent from this device: shown from memory, no download */
const local = new Map<string, string>()
/** object URLs made on this page: a blob: URL saved before a reload (demo) opens nothing */
const madeHere = new Set<string>()

export function rememberLocalImage(path: string, url: string) {
  local.set(path, url)
  madeHere.add(url)
}

export function forgetLocalImage(path: string) {
  const url = local.get(path)
  if (url) releaseLocalUrl(url)
  local.delete(path)
}

/** A local copy that has no path (demo photos): good until releaseLocalUrl or a reload. */
export function keepLocalUrl(url: string) {
  madeHere.add(url)
}

export function releaseLocalUrl(url: string) {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  madeHere.delete(url)
}

/** After the file is gone (staff removed it): the next look asks the server again. */
export function forgetImageLink(path: string) {
  links.delete(path)
}

/**
 * Photos were switched off in this chat (by one of us, or by a block): every photo of it asks the
 * server for a fresh link next time, so one already handed out stops being reused (the server
 * refuses a new link once there's a block).
 */
export function forgetChatLinks(chatId: string) {
  for (const path of links.keys()) if (path.startsWith(`${chatId}/`)) links.delete(path)
}

/** A copy that still opens: not a blob: URL left from before a reload. */
const usable = (url: string | undefined) => (url && (!url.startsWith('blob:') || madeHere.has(url)) ? url : undefined)

export function signedImageUrl(path: string): Promise<string> {
  const known = usable(local.get(path))
  if (known) return Promise.resolve(known)
  const cached = links.get(path)
  // a minute of margin so a link never runs out while the photo is loading
  if (cached && cached.until - 60_000 > Date.now()) return Promise.resolve(cached.url)
  const running = pending.get(path)
  if (running) return running
  if (!supabase) return Promise.reject(new Error('no storage in demo mode'))
  const job = supabase.storage
    .from(bucketOf(path))
    .createSignedUrl(path, LINK_SECONDS)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) throw error ?? new Error('no link')
      links.set(path, { url: data.signedUrl, until: Date.now() + LINK_SECONDS * 1000 })
      return data.signedUrl
    })
    .finally(() => pending.delete(path))
  pending.set(path, job)
  return job
}

const noRetry = () => {}

/**
 * Where to load a chat photo from: a local copy if there is one (just sent, or demo),
 * otherwise a signed link. `failed` once it can't be had (deleted, removed by staff, no access,
 * a demo copy from before a reload). `local`: nothing on the server to ask for again, so
 * retry does nothing (open the photo instead: its sender can still delete it from there).
 */
export function useChatImage(image: ChatImage | undefined): { src: string | null; failed: boolean; local: boolean; retry: () => void } {
  const path = image?.path
  // a dead copy with a path falls back to the signed link
  const direct = usable(image?.url) ?? usable(path ? local.get(path) : undefined)
  const [state, setState] = useState<{ path?: string; src: string | null; failed: boolean }>({ src: null, failed: false })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (direct || !path) return
    let alive = true
    signedImageUrl(path).then(
      (src) => alive && setState({ path, src, failed: false }),
      () => alive && setState({ path, src: null, failed: true }),
    )
    return () => {
      alive = false
    }
  }, [path, direct, attempt])

  if (direct) return { src: direct, failed: false, local: true, retry: noRetry }
  if (!path) return { src: null, failed: true, local: true, retry: noRetry }
  const mine = state.path === path
  return {
    src: mine ? state.src : null,
    failed: mine && state.failed,
    local: false,
    retry: () => {
      links.delete(path)
      setState({ src: null, failed: false })
      setAttempt((n) => n + 1)
    },
  }
}
