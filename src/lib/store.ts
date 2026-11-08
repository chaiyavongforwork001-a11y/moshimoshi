import { create, type StoreApi } from 'zustand'
import { persist } from 'zustand/middleware'
import { keepLocalUrl, releaseLocalUrl } from '@/data/chatImages'
import { liveActions } from '@/data/live/actions'
import { DEMO_CHATS, DEMO_ME } from '@/data/mock'
import { t, useLangStore } from '@/lib/i18n'
import type { PreparedImage } from './image'
import { isLive } from './supabase'
import type { Chat, ChatMessage, Intent, Mood, User } from './types'

const now = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`

export type MoshiPolicy = 'everyone' | 'rooms' | 'chatted'
export type IntentDraft = Omit<Intent, 'id' | 'userId' | 'postedMinutesAgo' | 'joinedBy'>

export interface MoshiState {
  onboarded: boolean
  /** demo: id 'me' · live: my auth user id */
  me: User
  myIntents: Intent[]
  /** intents I pressed "ฉันด้วย" on */
  joinedIntentIds: string[]
  /** session ids I RSVP'd "ไปด้วย" */
  going: string[]
  /** user ids I sent a moshi (chat request) to */
  sentMoshi: string[]
  /** live chats also carry `status` + `requestedBy` (see pages/chats/lib.ts) */
  chats: Chat[]
  /** demo: my messages + simulated replies per room · live: my messages still on their way */
  roomMessages: Record<string, ChatMessage[]>
  /** question id -> my answer */
  answers: Record<string, string>
  /** message / answer ids I reacted "เหมือนกัน!" to */
  sames: string[]
  /** user ids I blocked (hidden everywhere) */
  blocked: string[]
  /** who may send me a moshi */
  moshiPolicy: MoshiPolicy
  mood?: Mood
  /** a small message for the toast (e.g. a write that didn't go through) */
  notice: { id: number; text: string } | null

  completeOnboarding: (me: Partial<User>) => void
  updateMe: (patch: Partial<User>) => void
  resetDemo: () => void
  joinRoom: (roomId: string) => void
  leaveRoom: (roomId: string) => void
  postIntent: (intent: IntentDraft) => Intent
  removeIntent: (id: string) => void
  /** change one of my posts (it keeps its id and who said "ฉันด้วย") */
  updateIntent: (id: string, intent: IntentDraft) => void
  toggleJoinIntent: (id: string) => void
  toggleGoing: (sessionId: string) => void
  /** returns the chat id (live: may be a temporary id until the server answers; useChat resolves it) */
  sendMoshi: (userId: string, opener: string) => string
  /** answer a moshi someone sent me (live only; demo chats have no status) */
  respondMoshi: (chatId: string, accept: boolean) => void
  sendChatMessage: (chatId: string, text: string) => void
  sendRoomMessage: (roomId: string, text: string) => void
  /** prototype: a message from someone else (or a system line) lands in a chat */
  receiveChatMessage: (chatId: string, userId: string, text: string, kind?: ChatMessage['kind']) => void
  markChatRead: (chatId: string) => void
  /** บันไดความไว้ใจ ขั้น 2: my yes/no to photos in a chat (photos unlock when both say yes) */
  setMediaConsent: (chatId: string, on: boolean) => void
  /** prototype: the other person's yes/no to photos (simulated chats) */
  receiveMediaConsent: (chatId: string, on: boolean) => void
  /** send a photo made by prepareImage (lib/image) */
  sendChatImage: (chatId: string, image: PreparedImage) => void
  /** take back one of my messages (a photo) */
  deleteChatMessage: (chatId: string, messageId: string) => void
  /** report one message in a chat (a photo) to the team */
  reportChatMessage: (chatId: string, messageId: string, reason: string, details?: string) => void
  /** report one line in a room's chat to the team (shows its own toast) */
  reportRoomMessage: (roomId: string, messageId: string, reason: string, details?: string) => void
  /** prototype: `userId` reacts "เหมือนกัน!" to a message in a chat */
  reactToChatMessage: (chatId: string, messageId: string, userId: string) => void
  /** prototype: a room member's reply, kept in roomMessages next to mine */
  receiveRoomMessage: (roomId: string, userId: string, text: string) => void
  answerQuestion: (questionId: string, text: string) => void
  toggleSame: (id: string) => void
  blockUser: (userId: string) => void
  /** off my blocked list at once (Me → ตั้งค่า → คนที่บล็อกไว้); no toast of its own unless it fails */
  unblockUser: (userId: string) => void
  reportUser: (userId: string, reason: string, details?: string) => void
  setMoshiPolicy: (policy: MoshiPolicy) => void
  setMood: (mood: Mood) => void
  notify: (text: string) => void
  clearNotice: () => void
}

type ActionKeys = { [K in keyof MoshiState]-?: MoshiState[K] extends (...a: never[]) => unknown ? K : never }[keyof MoshiState]
export type MoshiData = Omit<MoshiState, ActionKeys>
export type MoshiActions = Pick<MoshiState, ActionKeys>
export type MoshiSet = StoreApi<MoshiState>['setState']
export type MoshiGet = StoreApi<MoshiState>['getState']

/** Live mode before my profile has loaded (and after signing out). */
export const BLANK_ME: User = {
  id: '',
  name: '',
  age: 0,
  color: 'peach',
  province: 'กรุงเทพฯ',
  bio: '',
  tags: [],
  loves: [],
  prompts: [],
  chatStyle: [],
  online: [],
  rooms: [],
  languages: ['ไทย'],
  lastActive: 'ออนไลน์อยู่',
  isOnline: true,
}

const DEMO_DATA: MoshiData = {
  onboarded: false,
  me: DEMO_ME,
  myIntents: [],
  joinedIntentIds: [],
  going: [],
  sentMoshi: [],
  chats: DEMO_CHATS,
  roomMessages: {},
  answers: {},
  sames: [],
  blocked: [],
  moshiPolicy: 'everyone',
  mood: undefined,
  notice: null,
}

const LIVE_DATA: MoshiData = { ...DEMO_DATA, me: BLANK_ME, chats: [] }

/** A chat as it's saved on this device: no photo still "on its way" (after a reload it never arrives). */
function settled(chat: Chat): Chat {
  if (!chat.messages.some((m) => m.image?.sending)) return chat
  return {
    ...chat,
    messages: chat.messages.map((m) => {
      if (!m.image?.sending) return m
      const { sending: _sending, ...image } = m.image
      return { ...m, image }
    }),
  }
}

let noticeId = 0

/** Local-only behaviour: the whole prototype in demo mode, sample people in live mode. */
export function demoActions(set: MoshiSet, get: MoshiGet): MoshiActions {
  return {
    completeOnboarding: (patch) => set((s) => ({ onboarded: true, me: { ...s.me, ...patch, id: s.me.id } })),
    updateMe: (patch) => set((s) => ({ me: { ...s.me, ...patch, id: s.me.id } })),
    resetDemo: () => set({ ...DEMO_DATA }),
    joinRoom: (roomId) => set((s) => (s.me.rooms.includes(roomId) ? s : { me: { ...s.me, rooms: [...s.me.rooms, roomId] } })),
    leaveRoom: (roomId) => set((s) => ({ me: { ...s.me, rooms: s.me.rooms.filter((r) => r !== roomId) } })),
    postIntent: (draft) => {
      const intent: Intent = { ...draft, id: uid('i'), userId: get().me.id, postedMinutesAgo: 0, joinedBy: [] }
      set((s) => ({ myIntents: [intent, ...s.myIntents].slice(0, 3) }))
      return intent
    },
    removeIntent: (id) => set((s) => ({ myIntents: s.myIntents.filter((i) => i.id !== id) })),
    updateIntent: (id, intent) => set((s) => ({ myIntents: s.myIntents.map((i) => (i.id === id ? { ...i, ...intent } : i)) })),
    toggleJoinIntent: (id) =>
      set((s) => ({
        joinedIntentIds: s.joinedIntentIds.includes(id) ? s.joinedIntentIds.filter((x) => x !== id) : [...s.joinedIntentIds, id],
      })),
    toggleGoing: (sessionId) =>
      set((s) => ({ going: s.going.includes(sessionId) ? s.going.filter((x) => x !== sessionId) : [...s.going, sessionId] })),
    sendMoshi: (userId, opener) => {
      const existing = get().chats.find((c) => c.withUserId === userId)
      if (existing) {
        // the same opener twice in a row (a double tap) only goes out once
        const last = existing.messages.at(-1)
        if (!(last?.userId === get().me.id && last.text === opener)) get().sendChatMessage(existing.id, opener)
        return existing.id
      }
      const mid = uid('m')
      const chat: Chat = {
        id: uid('c'),
        withUserId: userId,
        unread: 0,
        messages: [
          { id: uid('m'), userId: 'system', text: 'ส่งข้อความทักแล้ว! รอเขาตอบรับนะ', at: now(), kind: 'system' },
          { id: mid, localId: mid, userId: get().me.id, text: opener, at: now() },
        ],
      }
      set((s) => ({ chats: [chat, ...s.chats], sentMoshi: [...s.sentMoshi, userId] }))
      return chat.id
    },
    respondMoshi: () => {},
    // my messages carry localId like live ones do (here it never changes)
    sendChatMessage: (chatId, text) => {
      const id = uid('m')
      set((s) => ({
        chats: s.chats.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, { id, localId: id, userId: s.me.id, text, at: now() }] } : c)),
      }))
    },
    sendRoomMessage: (roomId, text) =>
      set((s) => ({
        roomMessages: {
          ...s.roomMessages,
          [roomId]: [...(s.roomMessages[roomId] ?? []), { id: uid('m'), userId: s.me.id, text, at: now() }],
        },
      })),
    receiveChatMessage: (chatId, userId, text, kind) =>
      set((s) => ({
        chats: s.chats.map((c) =>
          c.id === chatId ? { ...c, messages: [...c.messages, { id: uid('m'), userId, text, at: now(), kind }] } : c,
        ),
      })),
    markChatRead: (chatId) =>
      set((s) =>
        s.chats.some((c) => c.id === chatId && c.unread > 0)
          ? { chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)) }
          : s,
      ),
    setMediaConsent: (chatId, on) =>
      set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, consent: { me: on, them: c.consent?.them ?? false } } : c)) })),
    receiveMediaConsent: (chatId, on) =>
      set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, consent: { me: c.consent?.me ?? false, them: on } } : c)) })),
    // demo photos stay on this device: an object URL, gone after a reload (the bubble then says it
    // can't be opened, and the photo can still be deleted from the viewer)
    sendChatImage: (chatId, image) => {
      const id = uid('m')
      keepLocalUrl(image.url)
      set((s) => ({
        chats: s.chats.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  { id, localId: id, userId: s.me.id, text: '', at: now(), kind: 'image', image: { url: image.url, width: image.width, height: image.height } },
                ],
              }
            : c,
        ),
      }))
    },
    deleteChatMessage: (chatId, messageId) => {
      const gone = (m: ChatMessage) => m.id === messageId || m.localId === messageId
      const url = get().chats.find((c) => c.id === chatId)?.messages.find(gone)?.image?.url
      set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, messages: c.messages.filter((m) => !gone(m)) } : c)) }))
      // let the photo's memory go
      if (url) releaseLocalUrl(url)
    },
    reportChatMessage: () => get().notify(t('ส่งรายงานแล้ว ทีมงานจะดูให้เร็วที่สุดนะ', 'Report sent. The team will look at it soon')),
    reportRoomMessage: () => get().notify(t('ส่งรายงานแล้ว ทีมงานจะดูให้เร็วที่สุดนะ', 'Report sent. The team will look at it soon')),
    reactToChatMessage: (chatId, messageId, userId) =>
      set((s) => ({
        chats: s.chats.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId && !m.sameBy?.includes(userId) ? { ...m, sameBy: [...(m.sameBy ?? []), userId] } : m,
                ),
              }
            : c,
        ),
      })),
    receiveRoomMessage: (roomId, userId, text) =>
      set((s) => ({
        roomMessages: {
          ...s.roomMessages,
          [roomId]: [...(s.roomMessages[roomId] ?? []), { id: uid('m'), userId, text, at: now() }],
        },
      })),
    answerQuestion: (questionId, text) => set((s) => ({ answers: { ...s.answers, [questionId]: text } })),
    toggleSame: (id) => set((s) => ({ sames: s.sames.includes(id) ? s.sames.filter((x) => x !== id) : [...s.sames, id] })),
    blockUser: (userId) =>
      set((s) => ({
        blocked: s.blocked.includes(userId) ? s.blocked : [...s.blocked, userId],
        chats: s.chats.filter((c) => c.withUserId !== userId),
      })),
    // demo: their profile and posts show again (chats that went with the block stay gone)
    unblockUser: (userId) => set((s) => (s.blocked.includes(userId) ? { blocked: s.blocked.filter((x) => x !== userId) } : s)),
    reportUser: () => {},
    setMoshiPolicy: (moshiPolicy) => set({ moshiPolicy }),
    setMood: (mood) => set({ mood }),
    notify: (text) => set({ notice: { id: ++noticeId, text } }),
    clearNotice: () => set({ notice: null }),
  }
}

export const useMoshi = create<MoshiState>()(
  persist(
    (set, get) => {
      const demo = demoActions(set, get)
      return { ...(isLive ? LIVE_DATA : DEMO_DATA), ...demo, ...(isLive ? liveActions(set, get, demo) : {}) }
    },
    {
      // live data comes from the server: only per-device conveniences are kept locally
      name: isLive ? 'moshimoshi-live' : 'moshimoshi-demo',
      version: 1,
      partialize: (s): Partial<MoshiState> => {
        if (isLive) return { mood: s.mood }
        const { notice: _notice, ...data } = s
        return { ...data, chats: data.chats.map(settled) }
      },
    },
  ),
)

// a toast was written in the old language: drop it before the remounted page shows it again
useLangStore.subscribe((s, prev) => {
  if (s.lang !== prev.lang) useMoshi.getState().clearNotice()
})

/** Back to a clean slate (sign-out in live mode). */
export function resetPersonalState() {
  useMoshi.setState(isLive ? { ...LIVE_DATA } : { ...DEMO_DATA })
}

// Dev only (Vite hot reload): swapping this file in place leaves two stores, the live sync still
// filling the old one, and the guards bounce to /onboarding. Reload the page in place instead.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())
