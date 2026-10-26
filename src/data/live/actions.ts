import { useCatalog } from '@/data/catalog'
import { t } from '@/lib/i18n'
import type { MoshiActions, MoshiGet, MoshiSet } from '@/lib/store'
import type { ChatMessage, Intent, User } from '@/lib/types'
import { aliasId, emitChange, isTmp, resolveId, tmpId } from './bus'
import { intentColumns, profilePatch, type LiveChat } from './map'
import type { ChatRow, IntentRow } from './rows'
import { isSample, isServerId } from './sample'
import { knownError, mayBeSuspended, writeError } from './errors'
import { messageTime } from './time'
import * as w from './writes'

/*
 * Live versions of the store actions: optimistic local update first, then the
 * Supabase write. Success → the returned row goes through the change bus so
 * sync's copy matches; failure → roll back and show a small toast.
 * Sample people (VITE_DEMO_PEOPLE) and other non-server records stay local.
 */
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

  /**
   * Apply room membership changes one by one (each emits its own change). Joins or
   * leaves that fail are undone in the store (only those); then it throws.
   */
  const syncRooms = async (before: string[], after: string[]) => {
    const me = myId()
    const add = after.filter((r) => !before.includes(r))
    const drop = before.filter((r) => !after.includes(r))
    const res = await Promise.allSettled([
      ...add.map((r) => w.joinRoom(r, me).then((row) => emitChange({ table: 'room_members', type: 'INSERT', row }))),
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

  /** Which table a "เหมือนกัน!" id belongs to; null = local only (prompts, samples). */
  const sameTarget = (id: string): w.SameTarget | null => {
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
      const first: ChatMessage = { id: tmpId(), userId: me, text, at: stamp() }
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
      patchChat(chat.id, (c) => ({ ...c, messages: [...c.messages, { id: mid, userId: me, text, at: stamp() }] }))
      w.insertChatMessage(chat.id, me, text.slice(0, 2000))
        .then((row) => {
          patchChat(chat.id, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === mid ? { ...m, id: row.id } : m)) }))
          emitChange({ table: 'chat_messages', type: 'INSERT', row })
        })
        .catch((err) => {
          patchChat(chat.id, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== mid) }))
          fail(err, chat.status === 'active' ? undefined : t('รอเขารับโมชิก่อนนะ แล้วค่อยคุยกันต่อ', 'Wait for them to pick up your moshi, then keep chatting'))
        })
    },

    sendRoomMessage: (roomId, text) => {
      const me = myId()
      const mid = tmpId()
      const edit = (fn: (list: ChatMessage[]) => ChatMessage[]) =>
        set((s) => ({ roomMessages: { ...s.roomMessages, [roomId]: fn(s.roomMessages[roomId] ?? []) } }))
      edit((list) => [...list, { id: mid, userId: me, text, at: stamp() }])
      w.insertRoomMessage(roomId, me, text.slice(0, 1000))
        .then((row) => {
          // keep the local copy under its real id; sync drops it once the room history holds it
          edit((list) => list.map((m) => (m.id === mid ? { ...m, id: row.id } : m)))
          emitChange({ table: 'room_messages', type: 'INSERT', row })
        })
        .catch((err) => {
          edit((list) => list.filter((m) => m.id !== mid))
          fail(err)
        })
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
        .then(() => {
          const type = on ? 'INSERT' : 'DELETE'
          if (target.kind === 'answer')
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
      w.blockUser(myId(), userId).catch((err) => {
        set((s) => ({
          blocked: wasBlocked ? s.blocked : s.blocked.filter((x) => x !== userId),
          chats: [...theirChats.filter((c) => !s.chats.some((x) => x.id === c.id)), ...s.chats],
        }))
        fail(err)
      })
    },

    reportUser: (userId, reason, details) => {
      if (!isServerId(userId)) return
      w.reportUser(userId, reason, details).catch((err) => fail(err, knownError(err) ?? t('ส่งรายงานไม่สำเร็จ ลองใหม่อีกครั้งนะ', "Couldn't send the report. Try again")))
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

