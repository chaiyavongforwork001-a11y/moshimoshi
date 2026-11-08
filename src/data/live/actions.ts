import { useCatalog } from '@/data/catalog'
import { chatImagePath, forgetLocalImage, rememberLocalImage } from '@/data/chatImages'
import { L, t, tx } from '@/lib/i18n'
import type { MoshiActions, MoshiGet, MoshiSet } from '@/lib/store'
import type { ChatMessage, Intent, User } from '@/lib/types'
import { aliasId, emitChange, isTmp, pendingConsent, requestReload, resolveId, tmpId, unblocking, unsending } from './bus'
import { features } from './features'
import { intentColumns, profilePatch, type LiveChat } from './map'
import type { ChatRow, IntentRow } from './rows'
import { isSample, isServerId } from './sample'
import { isRefusal, isSuspendedNow, knownError, mayBeSuspended, writeError } from './errors'
import { messageTime } from './time'
import * as w from './writes'

/*
 * Live versions of the store actions: optimistic local update first, then the
 * Supabase write. Success → the returned row goes through the change bus so
 * sync's copy matches; failure → roll back and show a small toast.
 * Sample people (VITE_DEMO_PEOPLE) and other non-server records stay local.
 */
const PHOTOS_LOCKED = L('ยังส่งรูปไม่ได้นะ ต้องกดยินยอมทั้งคู่ก่อน', 'Photos are still locked: you both need to agree first')
const NOT_IN_ROOM = L('เข้าห้องก่อนถึงจะคุยในห้องได้นะ', 'Join the room to chat here')
const REPORT_SENT = L('ส่งรายงานแล้ว ทีมงานจะดูให้เร็วที่สุดนะ', 'Report sent. The team will look at it soon')
const REPORT_FAILED = L('ส่งรายงานไม่สำเร็จ ลองใหม่อีกครั้งนะ', "Couldn't send the report. Try again")

const noop = () => {}

type StorageErr = { statusCode?: string | number; status?: number; message?: string }
const storageErr = (err: unknown) => (err && typeof err === 'object' ? err : {}) as StorageErr

/** Why a photo didn't go out, when the error itself says so. */
function photoProblem(err: unknown): string | undefined {
  const known = knownError(err)
  if (known) return known
  const e = storageErr(err)
  const status = Number(e.statusCode ?? e.status ?? 0)
  // the server side of photos (supabase/migrations/20261108000004_chat_images.sql) isn't there yet
  if (/bucket not found/i.test(e.message ?? '')) return t('ระบบส่งรูปบนเซิร์ฟเวอร์ยังไม่เปิดใช้งาน รอแป๊บนะ', "Photos aren't switched on on the server yet. Hang on a little")
  if (status === 413 || /payload too large|exceeded the maximum/i.test(e.message ?? '')) return t('รูปนี้ใหญ่เกินไป ลองรูปอื่นนะ', 'That photo is too big. Try another one')
  return undefined
}

/** Storage's "no" to an upload: a 403 (row-level security), not a sign-in problem. */
function storageRefused(err: unknown): boolean {
  const e = storageErr(err)
  return Number(e.statusCode ?? e.status ?? 0) === 403 && !/jwt/i.test(e.message ?? '')
}

export function liveActions(set: MoshiSet, get: MoshiGet, demo: MoshiActions): Partial<MoshiActions> {
  const myId = () => get().me.id
  const fail = (err: unknown, text?: string) => {
    console.warn('[moshi] write failed', err)
    const me = myId()
    if (text || !me || !mayBeSuspended(err)) return get().notify(text ?? writeError(err))
    // refused: if it's because my account is paused, say so (with the date)
    void w
      .mySuspendedUntil()
      .catch(() => null)
      .then((until) => get().notify(writeError(err, until)))
  }
  const stamp = () => messageTime(new Date().toISOString())
  const removedTmpIntents = new Set<string>()
  /** room joins still on their way: a line sent right after joining waits for its join */
  const joining = new Map<string, Promise<unknown>>()
  const trackJoin = (roomId: string, p: Promise<unknown>) => {
    joining.set(roomId, p)
    const done = () => {
      if (joining.get(roomId) === p) joining.delete(roomId)
    }
    p.then(done, done)
    return p
  }

  /**
   * Apply room membership changes one by one (each emits its own change). Joins or
   * leaves that fail are undone in the store (only those); then it throws.
   */
  const syncRooms = async (before: string[], after: string[]) => {
    const me = myId()
    const add = after.filter((r) => !before.includes(r))
    const drop = before.filter((r) => !after.includes(r))
    const res = await Promise.allSettled([
      ...add.map((r) => trackJoin(r, w.joinRoom(r, me).then((row) => emitChange({ table: 'room_members', type: 'INSERT', row })))),
      ...drop.map((r) =>
        w.leaveRoom(r, me).then(() => emitChange({ table: 'room_members', type: 'DELETE', row: { room_id: r, user_id: me, role: null } })),
      ),
    ])
    const failedAdd = add.filter((_, i) => res[i].status === 'rejected')
    const failedDrop = drop.filter((_, i) => res[add.length + i].status === 'rejected')
    if (!failedAdd.length && !failedDrop.length) return
    set((s) => {
      const kept = s.me.rooms.filter((r) => !failedAdd.includes(r))
      return { me: { ...s.me, rooms: [...kept, ...failedDrop.filter((r) => !kept.includes(r))] } }
    })
    throw (res.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason
  }

  const saveMe = (patch: Partial<User>, onboarded?: boolean) => {
    const prev = { me: get().me, onboarded: get().onboarded }
    const me = myId()
    if (!me) return fail(null, t('กำลังเชื่อมต่ออยู่ รอแป๊บนึงแล้วลองใหม่นะ', 'Still connecting. Wait a moment and try again'))
    const next = { ...prev.me, ...patch, id: me }
    set(onboarded ? { me: next, onboarded: true } : { me: next })
    const cols = { ...profilePatch(patch), ...(onboarded ? { onboarded: true } : {}) }
    // profile first: joining a room after onboarding is what posts my welcome card there.
    // Each stage rolls back only itself: a saved profile stays saved if a room join fails.
    ;(async () => {
      if (Object.keys(cols).length) {
        try {
          emitChange({ table: 'profiles', type: 'UPDATE', row: await w.saveProfile(me, cols) })
        } catch (err) {
          set(prev)
          throw err
        }
      }
      if (patch.rooms) await syncRooms(prev.me.rooms, next.rooms)
    })().catch((err) => fail(err))
  }

  const patchChat = (chatId: string, fn: (c: LiveChat) => LiveChat) =>
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? fn(c as LiveChat) : c)) }))

  const findChat = (chatId: string) => {
    const id = resolveId(chatId)
    return get().chats.find((c) => c.id === id || c.id === chatId) as LiveChat | undefined
  }

  /** A message by its id, or by the temporary id it was sent under (a page may still hold that one). */
  const findMessage = (chat: LiveChat, messageId: string) => {
    const id = resolveId(messageId)
    return chat.messages.find((m) => m.id === id || m.id === messageId || m.localId === messageId)
  }

  /**
   * Why a photo didn't go out. The storage policy and the photo message rules refuse with the
   * same plain row-level security "no" whatever the reason, so ask the server which one it was.
   */
  const photoFailed = async (err: unknown, chat: LiveChat, uploaded = true): Promise<string> => {
    const plain = photoProblem(err)
    if (plain) return plain
    if (!mayBeSuspended(err) && !storageRefused(err)) return writeError(err)
    const [until, visible, now] = await Promise.all([
      w.mySuspendedUntil().catch(() => null),
      w.canSeeProfile(chat.withUserId).catch(() => true),
      w.chatPhotoState(chat.id).catch(() => null),
    ])
    if (isSuspendedNow(until) || storageErr(err).message?.trim() === 'suspended') return writeError({ message: 'suspended' }, until)
    // a block either way (blocking also switches photos off for both)
    if (!visible || get().blocked.includes(chat.withUserId)) return knownError({ message: 'blocked' }) ?? writeError(err)
    const here = findChat(chat.id)
    if (!(now ? now.bothSaidYes : !!here?.consent?.me && !!here.consent.them)) return tx(PHOTOS_LOCKED)
    if (now ? !now.active : here?.status !== 'active') return writeError(err)
    // both said yes and nothing else stands in the way: a photo limit. Storage refusing the file
    // itself means the upload caps (40 an hour, 200 a day), which can take hours to free up
    if (!uploaded) {
      return t(
        'ตอนนี้ส่งรูปครบโควตาแล้ว ลองใหม่ภายหลังนะ ถ้าวันนี้ส่งไปเยอะ อาจต้องรอหลายชั่วโมง',
        "You've reached the photo limit for now. Try again later: after a busy day it can take a few hours",
      )
    }
    return knownError({ message: 'image_rate_limited' }) ?? writeError(err)
  }

  /**
   * Why a room line didn't go in, when row-level security said no: the database takes lines from
   * the room's members only (20261108000006_rooms_and_blocks.sql), and a suspended account is
   * refused the same way. undefined: not that kind of "no", the usual line will do.
   */
  const roomLineFailed = async (err: unknown, roomId: string): Promise<string | undefined> => {
    if (!mayBeSuspended(err) || knownError(err)) return undefined
    const [until, member] = await Promise.all([
      w.mySuspendedUntil().catch(() => null),
      w.isRoomMember(roomId, myId()).catch(() => null),
    ])
    if (isSuspendedNow(until)) return writeError(err, until)
    // the server's answer first; without one, what this device knows
    if (member === false || (member === null && !get().me.rooms.includes(roomId))) return tx(NOT_IN_ROOM)
    return writeError(err, until)
  }

  /** Which table a "เหมือนกัน!" id belongs to; null = local only (samples; stories until prompt_sames exists). */
  const sameTarget = (id: string): w.SameTarget | null => {
    if (id.startsWith('prompt:')) {
      const [, profileId, ...key] = id.split(':')
      return features.promptSames && isServerId(profileId) && profileId !== myId() ? { kind: 'prompt', profileId, promptKey: key.join(':') } : null
    }
    const parts = id.split(':')
    if (parts.length === 2 && isServerId(parts[0]) && isServerId(parts[1])) return { kind: 'answer', questionId: parts[0], answerUserId: parts[1] }
    if (!isServerId(id)) return null
    const inRoom = Object.values(useCatalog.getState().roomMessages).some((list) => list.some((m) => m.id === id))
    if (inRoom) return { kind: 'room', messageId: id }
    const inChat = get().chats.some((c) => !isSample(c.withUserId) && c.messages.some((m) => m.id === id))
    return inChat ? { kind: 'chat', messageId: id } : null
  }

  /** `id` in or out of a list (an explicit value, so a late rollback can't flip a newer tap) */
  const setIn = (list: string[], id: string, on: boolean) => (on ? (list.includes(id) ? list : [...list, id]) : list.filter((x) => x !== id))

  return {
    completeOnboarding: (patch) => saveMe(patch, true),
    updateMe: (patch) => saveMe(patch),

    // live data lives on the server: only clear what this device keeps on its own
    resetDemo: () =>
      set((s) => ({
        mood: undefined,
        sames: s.sames.filter((id) => sameTarget(id) !== null),
        chats: s.chats.filter((c) => !isSample(c.withUserId)),
      })),

    joinRoom: (roomId) => {
      if (get().me.rooms.includes(roomId)) return
      saveMe({ rooms: [...get().me.rooms, roomId] })
    },
    leaveRoom: (roomId) => {
      if (!get().me.rooms.includes(roomId)) return
      saveMe({ rooms: get().me.rooms.filter((r) => r !== roomId) })
    },

    postIntent: (draft) => {
      const me = myId()
      const id = tmpId()
      const intent: Intent = { ...draft, id, userId: me, postedMinutesAgo: 0, joinedBy: [] }
      const before = get().myIntents
      // at most 3 active posts (also enforced by the database): the oldest steps aside
      const overflow = before.slice(2)
      set({ myIntents: [intent, ...before].slice(0, 3) })
      const expired: string[] = []
      ;(async () => {
        for (const old of overflow) {
          if (!isServerId(old.id)) continue
          const row = await w.setIntentStatus(old.id, 'expired')
          emitChange({ table: 'intents', type: 'UPDATE', row })
          expired.push(old.id)
        }
        // expiry comes from the database (next 06:00 for tonight, after the weekend…)
        const row = await w.insertIntent({ ...intentColumns(draft), status: 'active' }, me)
        aliasId(id, row.id)
        if (removedTmpIntents.delete(id)) {
          await w.deleteIntent(row.id)
          return
        }
        set((s) => ({ myIntents: s.myIntents.map((i) => (i.id === id ? { ...i, id: row.id } : i)) }))
        emitChange({ table: 'intents', type: 'INSERT', row })
      })().catch(async (err) => {
        // posts we already stepped aside on the server come back; the rest never left it
        for (const oid of expired) {
          try {
            emitChange({ table: 'intents', type: 'UPDATE', row: await w.setIntentStatus(oid, 'active') })
          } catch {
            /* stays expired */
          }
        }
        const untouched = overflow.filter((o) => !expired.includes(o.id))
        set((s) => ({ myIntents: [...s.myIntents.filter((i) => i.id !== id), ...untouched.filter((o) => !s.myIntents.some((i) => i.id === o.id))] }))
        fail(err)
      })
      return intent
    },

    updateIntent: (rawId, draft) => {
      const id = resolveId(rawId)
      const before = get().myIntents.find((i) => i.id === id || i.id === rawId)
      if (!before) return
      set((s) => ({ myIntents: s.myIntents.map((i) => (i.id === before.id ? { ...i, ...draft } : i)) }))
      // still on its way to the server (or a sample): nothing more to save
      if (!isServerId(before.id)) return
      w.updateIntent(before.id, { ...intentColumns(draft), expires_at: null })
        .then((row) => emitChange({ table: 'intents', type: 'UPDATE', row }))
        .catch((err) => {
          set((s) => ({ myIntents: s.myIntents.map((i) => (i.id === before.id ? before : i)) }))
          fail(err)
        })
    },

    removeIntent: (rawId) => {
      const id = resolveId(rawId)
      const before = get().myIntents
      set((s) => ({ myIntents: s.myIntents.filter((i) => i.id !== id && i.id !== rawId) }))
      if (isTmp(id)) {
        removedTmpIntents.add(id) // still being saved: delete it as soon as it lands
        return
      }
      if (!isServerId(id)) return
      w.deleteIntent(id)
        .then(() => emitChange({ table: 'intents', type: 'DELETE', row: { id } as IntentRow }))
        .catch((err) => {
          set({ myIntents: before })
          fail(err)
        })
    },

    toggleJoinIntent: (id) => {
      if (!isServerId(id)) return demo.toggleJoinIntent(id)
      const me = myId()
      const on = !get().joinedIntentIds.includes(id)
      set((s) => ({ joinedIntentIds: setIn(s.joinedIntentIds, id, on) }))
      ;(on ? w.joinIntent(id, me) : w.leaveIntent(id, me))
        .then(() => emitChange({ table: 'intent_joins', type: on ? 'INSERT' : 'DELETE', row: { intent_id: id, user_id: me } }))
        .catch((err) => {
          set((s) => ({ joinedIntentIds: setIn(s.joinedIntentIds, id, !on) }))
          fail(err)
        })
    },

    toggleGoing: (sessionId) => {
      if (!isServerId(sessionId)) return demo.toggleGoing(sessionId)
      const me = myId()
      const on = !get().going.includes(sessionId)
      set((s) => ({ going: setIn(s.going, sessionId, on) }))
      ;(on ? w.rsvp(sessionId, me) : w.unrsvp(sessionId, me))
        .then(() => emitChange({ table: 'session_rsvps', type: on ? 'INSERT' : 'DELETE', row: { session_id: sessionId, user_id: me } }))
        .catch((err) => {
          set((s) => ({ going: setIn(s.going, sessionId, !on) }))
          fail(err)
        })
    },

    sendMoshi: (userId, opener) => {
      if (isSample(userId) || !isServerId(userId)) return demo.sendMoshi(userId, opener)
      const me = myId()
      const existing = get().chats.find((c) => c.withUserId === userId) as LiveChat | undefined
      if (existing?.status === 'active') {
        get().sendChatMessage(existing.id, opener)
        return existing.id
      }
      // still ringing: the rpc wouldn't stack another opener either
      if (existing?.status === 'pending' && existing.requestedBy === me) return existing.id
      // they turned my moshi down: the rpc refuses to ring again, so don't pretend it went out
      if (existing?.status === 'ended' && existing.requestedBy === me) {
        fail(null, writeError({ message: 'moshi_declined' }))
        return existing.id
      }

      // everything else goes through the rpc: a new chat, answering their moshi with mine
      // (that accepts it), or ringing again after I had closed theirs
      const id = existing?.id ?? tmpId()
      const text = opener.trim().slice(0, 2000)
      const fid = tmpId()
      const first: ChatMessage = { id: fid, localId: fid, userId: me, text, at: stamp() }
      const hadSent = get().sentMoshi.includes(userId)
      const theyRang = existing?.status === 'pending'
      if (existing)
        patchChat(id, (c) => ({ ...c, ...(theyRang ? { status: 'active' } : { status: 'pending', requestedBy: me }), messages: [...c.messages, first] }))
      else {
        const chat: LiveChat = { id, withUserId: userId, messages: [first], unread: 0, status: 'pending', requestedBy: me }
        set((s) => ({ chats: [chat, ...s.chats] }))
      }
      if (!theyRang) set((s) => ({ sentMoshi: s.sentMoshi.includes(userId) ? s.sentMoshi : [...s.sentMoshi, userId] }))
      w.sendMoshi(userId, text)
        .then((chatId) => {
          if (chatId !== id) aliasId(id, chatId)
          // sync (re)loads this chat — members, status, the opener — when it sees the change
          emitChange({ table: 'chats', type: 'INSERT', row: { id: chatId } as ChatRow })
        })
        .catch((err) => {
          // undo only this chat (other chats may have moved on meanwhile)
          set((s) => ({
            chats: existing ? s.chats.map((c) => (c.id === id ? existing : c)) : s.chats.filter((c) => c.id !== id),
            sentMoshi: hadSent ? s.sentMoshi : s.sentMoshi.filter((x) => x !== userId),
          }))
          fail(err)
        })
      return id
    },

    respondMoshi: (chatId, accept) => {
      const chat = findChat(chatId)
      if (!chat || !isServerId(chat.id)) return
      const prev = chat.status
      const status = accept ? 'active' : 'ended'
      patchChat(chat.id, (c) => ({ ...c, status }))
      w.respondMoshi(chat.id, accept)
        .then(() => emitChange({ table: 'chats', type: 'UPDATE', row: { id: chat.id, status } as ChatRow }))
        .catch((err) => {
          patchChat(chat.id, (c) => ({ ...c, status: prev }))
          fail(err)
        })
    },

    sendChatMessage: (chatId, text) => {
      const chat = findChat(chatId)
      if (!chat) return
      if (isSample(chat.withUserId) || !isServerId(chat.id)) return demo.sendChatMessage(chat.id, text)
      const me = myId()
      const mid = tmpId()
      const body = text.slice(0, 2000)
      patchChat(chat.id, (c) => ({ ...c, messages: [...c.messages, { id: mid, localId: mid, userId: me, text: body, at: stamp() }] }))
      w.insertChatMessage(chat.id, me, body)
        .then((row) => {
          // the server's id from now on; localId stays (keys, a page that follows this message)
          aliasId(mid, row.id)
          patchChat(chat.id, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === mid ? { ...m, id: row.id } : m)) }))
          emitChange({ table: 'chat_messages', type: 'INSERT', row })
        })
        .catch((err) => {
          patchChat(chat.id, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== mid) }))
          fail(err, chat.status === 'active' ? undefined : t('รอเขาตอบรับคำทักก่อนนะ แล้วค่อยแชทกันต่อ', 'Wait for them to accept your hello, then keep chatting'))
        })
    },

    sendRoomMessage: (roomId, text) => {
      const me = myId()
      const mid = tmpId()
      const edit = (fn: (list: ChatMessage[]) => ChatMessage[]) =>
        set((s) => ({ roomMessages: { ...s.roomMessages, [roomId]: fn(s.roomMessages[roomId] ?? []) } }))
      edit((list) => [...list, { id: mid, userId: me, text, at: stamp() }])
      // only members can post: a join still on its way goes first (if it fails, so does this line)
      const joined = joining.get(roomId)
      ;(joined ? joined.then(noop, noop) : Promise.resolve())
        .then(() => w.insertRoomMessage(roomId, me, text.slice(0, 1000)))
        .then((row) => {
          // keep the local copy under its real id; sync drops it once the room history holds it
          edit((list) => list.map((m) => (m.id === mid ? { ...m, id: row.id } : m)))
          emitChange({ table: 'room_messages', type: 'INSERT', row })
        })
        .catch((err) => {
          edit((list) => list.filter((m) => m.id !== mid))
          roomLineFailed(err, roomId)
            .catch(() => undefined)
            .then((why) => fail(err, why))
        })
    },

    setMediaConsent: (chatId, on) => {
      const chat = findChat(chatId)
      if (!chat) return
      if (isSample(chat.withUserId) || !isServerId(chat.id)) return demo.setMediaConsent(chat.id, on)
      const was = chat.consent?.me ?? false
      const mine = (value: boolean) => patchChat(chat.id, (c) => ({ ...c, consent: { me: value, them: c.consent?.them ?? false } }))
      // sync's copy keeps the old value until the write answers: rebuilds from it show this tap meanwhile
      const tap = { on }
      const latest = () => pendingConsent.get(chat.id) === tap
      pendingConsent.set(chat.id, tap)
      mine(on)
      w.setMediaConsent(chat.id, myId(), on)
        .then((row) => {
          if (latest()) pendingConsent.delete(chat.id)
          emitChange({ table: 'chat_members', type: 'UPDATE', row })
        })
        .catch((err) => {
          // a newer tap is on its way: that one decides
          if (latest()) {
            pendingConsent.delete(chat.id)
            mine(was)
          }
          fail(err)
        })
    },

    // the other person's yes comes from the server; only sample people are simulated
    receiveMediaConsent: (chatId, on) => {
      const chat = findChat(chatId)
      if (chat && isSample(chat.withUserId)) demo.receiveMediaConsent(chat.id, on)
    },

    sendChatImage: (chatId, image) => {
      const chat = findChat(chatId)
      if (!chat) return
      if (isSample(chat.withUserId) || !isServerId(chat.id)) return demo.sendChatImage(chat.id, image)
      const me = myId()
      const mid = tmpId()
      const path = chatImagePath(chat.id, image.width, image.height)
      // shown from memory meanwhile, and after it lands (no second download of my own photo)
      rememberLocalImage(path, image.url)
      const photo = { path, url: image.url, width: image.width, height: image.height }
      patchChat(chat.id, (c) => ({
        ...c,
        messages: [...c.messages, { id: mid, localId: mid, userId: me, text: path, at: stamp(), kind: 'image', image: { ...photo, sending: true } }],
      }))
      let uploaded = false
      w.uploadChatImage(path, image.blob)
        .then(() => {
          uploaded = true
          return w.insertChatImage(chat.id, me, path)
        })
        .then((row) => {
          // the server's id from now on; localId stays (keys, an open viewer follows it)
          aliasId(mid, row.id)
          patchChat(chat.id, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === mid ? { ...m, id: row.id, image: photo } : m)) }))
          emitChange({ table: 'chat_messages', type: 'INSERT', row })
        })
        .catch((err) => {
          // it got there after all (the realtime echo already put the server's copy in its place):
          // leave it as it is, file and all
          if (findChat(chat.id)?.messages.some((m) => m.localId === mid && isServerId(m.id))) {
            console.warn('[moshi] photo posted, but its answer got lost', err)
            return
          }
          patchChat(chat.id, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== mid) }))
          // the file goes only when the server said no to the message. An answer lost on the way may
          // hide a message that's there all the same: the echo or a refresh shows it (from its link)
          const refused = isRefusal(err)
          if (uploaded && refused) void w.removeChatImageFile(path)
          forgetLocalImage(path)
          if (uploaded && !refused) {
            return fail(err, t('เน็ตหลุดตอนส่งรูป ถ้ารูปไม่ขึ้นในแชท ลองส่งใหม่อีกทีนะ', "The connection dropped while sending. If the photo doesn't show up in the chat, send it again"))
          }
          photoFailed(err, chat, uploaded)
            .catch(() => writeError(err))
            .then((text) => fail(err, text))
        })
    },

    deleteChatMessage: (chatId, messageId) => {
      const chat = findChat(chatId)
      if (!chat) return
      if (isSample(chat.withUserId) || !isServerId(chat.id)) return demo.deleteChatMessage(chat.id, messageId)
      const msg = findMessage(chat, messageId)
      if (!msg || !isServerId(msg.id)) return
      const id = msg.id
      const at = chat.messages.indexOf(msg)
      // sync's copy still has the row until the delete answers: rebuilds from it leave it out meanwhile
      unsending.add(id)
      patchChat(chat.id, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== id) }))
      w.deleteChatMessage(id)
        .then(() => {
          unsending.delete(id)
          emitChange({
            table: 'chat_messages',
            type: 'DELETE',
            row: { id, chat_id: chat.id, user_id: msg.userId, body: msg.text, kind: msg.kind ?? 'text', created_at: new Date().toISOString() },
          })
          // the message first (nobody sees a broken photo), then the file itself. While a report about
          // the photo is open the server keeps the file for the team: remove() then deletes nothing
          if (msg.image?.path) {
            void w.removeChatImageFile(msg.image.path)
            forgetLocalImage(msg.image.path)
          }
        })
        .catch((err) => {
          unsending.delete(id)
          patchChat(chat.id, (c) => (c.messages.some((m) => m.id === id) ? c : { ...c, messages: [...c.messages.slice(0, at), msg, ...c.messages.slice(at)] }))
          fail(err, t('ลบไม่สำเร็จ ลองใหม่อีกทีนะ', "Couldn't delete it. Try again"))
        })
    },

    reportChatMessage: (chatId, messageId, reason, details) => {
      const chat = findChat(chatId)
      const id = (chat && findMessage(chat, messageId)?.id) ?? resolveId(messageId)
      if (!chat || isSample(chat.withUserId) || !isServerId(id)) return demo.reportChatMessage(chatId, id, reason, details)
      w.reportChatMessage(id, reason, details)
        .then(() => get().notify(tx(REPORT_SENT)))
        .catch((err) => fail(err, knownError(err) ?? tx(REPORT_FAILED)))
    },

    reportRoomMessage: (roomId, messageId, reason, details) => {
      const id = resolveId(messageId)
      const line = [...(useCatalog.getState().roomMessages[roomId] ?? []), ...(get().roomMessages[roomId] ?? [])].find(
        (m) => m.id === id || m.id === messageId,
      )
      // a line still on its way, or a sample person's: nothing on the server to point at
      if (!isServerId(id) || isSample(line?.userId)) return demo.reportRoomMessage(roomId, id, reason, details)
      w.reportRoomMessage(myId(), id, reason, details)
        .then(() => get().notify(tx(REPORT_SENT)))
        .catch((err) => fail(err, knownError(err) ?? tx(REPORT_FAILED)))
    },

    // simulated replies only ever come from sample people
    receiveChatMessage: (chatId, userId, text, kind) => {
      const chat = findChat(chatId)
      if (chat && isSample(chat.withUserId)) demo.receiveChatMessage(chat.id, userId, text, kind)
    },
    reactToChatMessage: (chatId, messageId, userId) => {
      const chat = findChat(chatId)
      if (chat && isSample(chat.withUserId)) demo.reactToChatMessage(chat.id, messageId, userId)
    },
    receiveRoomMessage: (roomId, userId, text) => {
      if (isSample(userId)) demo.receiveRoomMessage(roomId, userId, text)
    },

    markChatRead: (chatId) => {
      const chat = findChat(chatId)
      if (!chat || chat.unread === 0) return
      demo.markChatRead(chat.id)
      if (isSample(chat.withUserId) || !isServerId(chat.id)) return
      const me = myId()
      w.markChatRead(chat.id)
        .then(() =>
          emitChange({ table: 'chat_members', type: 'UPDATE', row: { chat_id: chat.id, user_id: me, last_read_at: new Date().toISOString() } }),
        )
        .catch((err) => console.warn('[moshi] mark read failed', err))
    },

    answerQuestion: (questionId, text) => {
      if (!isServerId(questionId)) return demo.answerQuestion(questionId, text)
      const me = myId()
      const before = get().answers[questionId]
      demo.answerQuestion(questionId, text)
      w.upsertAnswer(questionId, me, text.trim().slice(0, 300))
        .then((row) => emitChange({ table: 'daily_answers', type: 'INSERT', row }))
        .catch((err) => {
          set((s) => {
            const answers = { ...s.answers }
            if (before === undefined) delete answers[questionId]
            else answers[questionId] = before
            return { answers }
          })
          fail(err)
        })
    },

    toggleSame: (id) => {
      const target = sameTarget(id)
      if (!target) return demo.toggleSame(id)
      const me = myId()
      const on = !get().sames.includes(id)
      set((s) => ({ sames: setIn(s.sames, id, on) }))
      w.setSame(target, me, on)
        .then((saved) => {
          const type = on ? 'INSERT' : 'DELETE'
          if (saved) emitChange({ table: 'prompt_sames', type, row: saved })
          else if (target.kind === 'prompt') return
          else if (target.kind === 'answer')
            emitChange({ table: 'daily_answer_sames', type, row: { question_id: target.questionId, answer_user_id: target.answerUserId, user_id: me } })
          else emitChange({ table: target.kind === 'room' ? 'room_message_sames' : 'chat_message_sames', type, row: { message_id: target.messageId, user_id: me } })
        })
        .catch((err) => {
          set((s) => ({ sames: setIn(s.sames, id, !on) }))
          fail(err)
        })
    },

    blockUser: (userId) => {
      const theirChats = get().chats.filter((c) => c.withUserId === userId)
      const wasBlocked = get().blocked.includes(userId)
      demo.blockUser(userId)
      if (!isServerId(userId)) return
      // blocked again while an unblock is out: a reload in between keeps this block
      unblocking.delete(userId)
      w.blockUser(myId(), userId).catch((err) => {
        set((s) => ({
          blocked: wasBlocked ? s.blocked : s.blocked.filter((x) => x !== userId),
          chats: [...theirChats.filter((c) => !s.chats.some((x) => x.id === c.id)), ...s.chats],
        }))
        fail(err)
      })
    },

    unblockUser: (userId) => {
      // sample people (and anything else that never reached the server) stay on this device
      if (isSample(userId) || !isServerId(userId)) return demo.unblockUser(userId)
      // a repeat tap while the first one is out
      if (unblocking.has(userId)) return
      const me = myId()
      if (!me) return fail(null, t('กำลังเชื่อมต่ออยู่ รอแป๊บนึงแล้วลองใหม่นะ', 'Still connecting. Wait a moment and try again'))
      const was = get().blocked.includes(userId)
      // off the list at once; full reloads meanwhile leave them off too (publishAll)
      unblocking.add(userId)
      demo.unblockUser(userId)
      w.unblockUser(me, userId)
        .then(() => {
          unblocking.delete(userId)
          // blocked again meanwhile: that block stands
          if (get().blocked.includes(userId)) return
          // a full reload already running read the old list: this change is replayed after it
          emitChange({ table: 'blocks', type: 'DELETE', row: { blocker: me, blocked: userId } })
          // what the block hid comes back (their profile, posts and chats), like after a reconnect
          void requestReload([userId])
        })
        .catch((err) => {
          unblocking.delete(userId)
          if (was) set((s) => ({ blocked: s.blocked.includes(userId) ? s.blocked : [...s.blocked, userId] }))
          fail(err, knownError(err) ?? t('ปลดบล็อกไม่สำเร็จ ลองใหม่อีกทีนะ', "Couldn't unblock them. Try again"))
        })
    },

    reportUser: (userId, reason, details) => {
      if (!isServerId(userId)) return
      w.reportUser(userId, reason, details).catch((err) => fail(err, knownError(err) ?? tx(REPORT_FAILED)))
    },

    setMoshiPolicy: (policy) => {
      const prev = get().moshiPolicy
      set({ moshiPolicy: policy })
      w.setMoshiPolicy(myId(), policy).catch((err) => {
        set({ moshiPolicy: prev })
        fail(err)
      })
    },
  }
}

