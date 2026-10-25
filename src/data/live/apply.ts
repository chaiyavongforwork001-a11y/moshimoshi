import { useMoshi } from '@/lib/store'
import {
  dropChat,
  dropChatMessage,
  dropRoomMessage,
  pairKey,
  putAnswerSame,
  putChatMember,
  putChatMessage,
  putJoin,
  putMember,
  putMessageSame,
  putRoomMessage,
  putRsvp,
  type Cache,
} from './cache'
import {
  apply,
  chatsPatch,
  intentsPatch,
  mePatch,
  myAnswersPatch,
  myGoingPatch,
  myIntentsPatch,
  myJoinsPatch,
  mySamesPatch,
  peoplePatch,
  questionsPatch,
  roomMessagesPatch,
  roomsPatch,
  sessionsPatch,
} from './publish'
import type { Change, ChatRow } from './rows'

/** Follow-up work a change may need (fetching what we haven't seen yet). */
export interface ApplyEffects {
  needChat: (chatId: string) => void
  needProfiles: (ids: string[]) => void
  /** a message landed in a chat: mark it read if that chat is on screen */
  readIfOpen: (chatId: string, createdAt: string) => void
}

/**
 * One row change (realtime or our own write) → the cache → only the slices
 * it touches get re-published.
 */
export function applyToCache(c: Cache, ch: Change, fx: ApplyEffects) {
  const me = c.me
  const del = ch.type === 'DELETE'
  switch (ch.table) {
    case 'profiles': {
      if (del) c.profiles.delete(ch.row.id)
      else c.profiles.set(ch.row.id, { ...c.profiles.get(ch.row.id), ...ch.row })
      if (ch.row.id === me) useMoshi.setState(mePatch(c, false))
      else apply({ ...peoplePatch(c), ...roomsPatch(c) }, {})
      return
    }
    case 'room_members':
      putMember(c, ch.row, !del)
      apply({ ...roomsPatch(c), ...peoplePatch(c) }, {})
      return
    case 'room_messages': {
      const roomId = del ? dropRoomMessage(c, ch.row.id) : putRoomMessage(c, ch.row) ? ch.row.room_id : undefined
      if (!roomId) return
      const r = roomMessagesPatch(c, [roomId])
      apply(r.cat, r.mine)
      if (!del && ch.row.user_id) fx.needProfiles([ch.row.user_id])
      return
    }
    case 'room_message_sames': {
      const roomId = c.msgRoom.get(ch.row.message_id)
      if (!roomId) return
      putMessageSame(c.roomSames, ch.row, !del)
      const r = roomMessagesPatch(c, [roomId])
      apply(r.cat, { ...r.mine, ...(ch.row.user_id === me ? mySamesPatch(c) : {}) })
      return
    }
    case 'session_rsvps':
      putRsvp(c, ch.row, !del)
      apply(sessionsPatch(c), ch.row.user_id === me ? myGoingPatch(c) : {})
      return
    case 'daily_answers': {
      if (![...c.questions.values()].some((q) => q.id === ch.row.question_id)) return
      const key = pairKey(ch.row.question_id, ch.row.user_id)
      if (del) c.answers.delete(key)
      else c.answers.set(key, { ...c.answers.get(key), ...ch.row })
      apply(questionsPatch(c), ch.row.user_id === me ? myAnswersPatch(c) : {})
      if (!del) fx.needProfiles([ch.row.user_id])
      return
    }
    case 'daily_answer_sames':
      putAnswerSame(c, ch.row, !del)
      apply(questionsPatch(c), ch.row.user_id === me ? mySamesPatch(c) : {})
      return
    case 'intents': {
      const prev = c.intents.get(ch.row.id)
      if (del) {
        c.intents.delete(ch.row.id)
        c.joins.delete(ch.row.id)
      } else c.intents.set(ch.row.id, { ...prev, ...ch.row })
      const mine = (prev ?? ch.row).user_id === me
      apply(intentsPatch(c), mine ? myIntentsPatch(c) : {})
      if (!del && ch.row.user_id) fx.needProfiles([ch.row.user_id])
      return
    }
    case 'intent_joins': {
      const owner = c.intents.get(ch.row.intent_id)?.user_id
      if (!owner) return
      putJoin(c, ch.row, !del)
      apply(intentsPatch(c), { ...(owner === me ? myIntentsPatch(c) : {}), ...(ch.row.user_id === me ? myJoinsPatch(c) : {}) })
      // someone new pressed "ฉันด้วย" on my post: make sure we know who (or that they're hidden)
      if (!del && owner === me) fx.needProfiles([ch.row.user_id])
      return
    }
    case 'chats': {
      if (del) {
        dropChat(c, ch.row.id)
        apply({}, chatsPatch(c))
        return
      }
      // new to us: fetch it whole (members + messages) before it shows up
      if (!c.chats.has(ch.row.id)) {
        fx.needChat(ch.row.id)
        return
      }
      c.chats.set(ch.row.id, { ...c.chats.get(ch.row.id), ...ch.row } as ChatRow)
      // a moshi we just sent again: fetch the new opener too
      if (ch.type === 'INSERT') fx.needChat(ch.row.id)
      else apply({}, chatsPatch(c))
      return
    }
    case 'chat_members': {
      if (!c.chats.has(ch.row.chat_id)) {
        if (!del && ch.row.user_id === me) fx.needChat(ch.row.chat_id)
        return
      }
      putChatMember(c, ch.row, !del)
      apply({}, chatsPatch(c))
      return
    }
    case 'chat_messages': {
      if (del) {
        if (dropChatMessage(c, ch.row.id)) apply({}, chatsPatch(c))
        return
      }
      putChatMessage(c, ch.row)
      if (!c.chats.has(ch.row.chat_id)) {
        // keep it: the chat may be loading right now and miss this line
        fx.needChat(ch.row.chat_id)
        return
      }
      if (ch.row.user_id && ch.row.user_id !== me) fx.readIfOpen(ch.row.chat_id, ch.row.created_at)
      apply({}, chatsPatch(c))
      return
    }
    case 'chat_message_sames': {
      if (!c.msgChat.has(ch.row.message_id)) return
      putMessageSame(c.chatSames, ch.row, !del)
      apply({}, { ...chatsPatch(c), ...(ch.row.user_id === me ? mySamesPatch(c) : {}) })
      return
    }
  }
}
