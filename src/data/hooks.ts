import { useEffect, useMemo } from 'react'
import { matchAll, matchUser } from '@/lib/matching'
import { useMoshi } from '@/lib/store'
import type { Chat, ChatMessage, DailyQuestion, Intent, MatchResult, Room, Session, User } from '@/lib/types'
import { useCatalog } from './catalog'
import { resolveId } from './live/bus'
import type { LiveChat } from './live/map'
import { isSample } from './live/sample'
import { ensureRoomHistory } from './live/sync'

/*
 * The ONLY way pages read app data. Same shapes in demo and live mode, so a
 * page never needs to know where data comes from. Writes go through the
 * actions on useMoshi (which call Supabase in live mode).
 */

export const useDataMode = () => useCatalog((s) => s.mode)
export const useDataReady = () => useCatalog((s) => s.ready)
/** live mode: why the first sync failed (null when fine) */
export const useDataError = () => useCatalog((s) => s.error)

/** My user id: 'me' in demo mode, my auth id in live mode. */
export const useMyId = () => useMoshi((s) => s.me.id)

/** Mock people merged in live mode by VITE_DEMO_PEOPLE (their chats stay on this device). */
export { isSample }

export const useRooms = (): Room[] => useCatalog((s) => s.rooms)

export function useRoom(id: string | undefined): Room | undefined {
  const rooms = useRooms()
  return useMemo(() => rooms.find((r) => r.id === id), [rooms, id])
}

export const useRoomStats = (id: string) => useCatalog((s) => s.roomStats[id])

const useBlocked = () => useMoshi((s) => s.blocked)

/** Everyone except me (and anyone I blocked). */
export function usePeople(): User[] {
  const people = useCatalog((s) => s.people)
  const blocked = useBlocked()
  return useMemo(() => (blocked.length ? people.filter((u) => !blocked.includes(u.id)) : people), [people, blocked])
}

/** Direct lookup (still finds someone I just blocked, so an open sheet doesn't vanish). */
export function usePerson(id: string | undefined): User | undefined {
  const people = useCatalog((s) => s.people)
  return useMemo(() => people.find((u) => u.id === id), [people, id])
}

/** Other people's intents plus mine, newest first; optional filters. */
export function useIntents(filter?: { roomId?: string; userId?: string }): Intent[] {
  const others = useCatalog((s) => s.intents)
  const mine = useMoshi((s) => s.myIntents)
  const blocked = useBlocked()
  const roomId = filter?.roomId
  const userId = filter?.userId
  return useMemo(() => {
    let all = [...mine, ...others]
    if (blocked.length) all = all.filter((i) => !blocked.includes(i.userId))
    if (roomId) all = all.filter((i) => i.roomId === roomId)
    if (userId) all = all.filter((i) => i.userId === userId)
    return all.sort((a, b) => a.postedMinutesAgo - b.postedMinutesAgo)
  }, [mine, others, blocked, roomId, userId])
}

/** One of my own posts; a temporary id from a post still being saved follows the real one. */
export function useMyIntent(id: string | undefined): Intent | undefined {
  const mine = useMoshi((s) => s.myIntents)
  return useMemo(() => (id ? mine.find((i) => i.id === id || i.id === resolveId(id)) : undefined), [mine, id])
}

export const useSessions = (): Session[] => useCatalog((s) => s.sessions)

/** Today's question for a room, falling back to the lobby question. */
export function useDailyQuestion(roomId: string): DailyQuestion | undefined {
  const questions = useCatalog((s) => s.questions)
  return useMemo(
    () => questions.find((q) => q.roomId === roomId) ?? questions.find((q) => q.roomId === 'lobby'),
    [questions, roomId],
  )
}

/**
 * Room chat: server/seeded history plus my local additions, in time order
 * (lines from people I blocked are left out).
 * In live mode, opening a room loads its last 50 messages on first use.
 */
export function useRoomMessages(roomId: string): ChatMessage[] {
  const history = useCatalog((s) => s.roomMessages[roomId])
  const local = useMoshi((s) => s.roomMessages[roomId])
  const blocked = useBlocked()
  const mode = useDataMode()
  const ready = useDataReady()
  useEffect(() => {
    if (mode === 'live' && ready) void ensureRoomHistory(roomId)
  }, [mode, ready, roomId])
  return useMemo(() => {
    const all = [...(history ?? []), ...(local ?? [])]
    return blocked.length ? all.filter((m) => !blocked.includes(m.userId)) : all
  }, [history, local, blocked])
}

/** live mode: has this room's history arrived yet? (demo: always) */
export const useRoomHistoryReady = (roomId: string) => useCatalog((s) => s.mode === 'demo' || roomId in s.roomMessages)

export function useChats(): Chat[] {
  const chats = useMoshi((s) => s.chats)
  const blocked = useBlocked()
  return useMemo(() => (blocked.length ? chats.filter((c) => !blocked.includes(c.withUserId)) : chats), [chats, blocked])
}

/** A chat by id; a temporary id from a moshi still being sent resolves to the real chat. */
export function useChat(id: string | undefined): Chat | undefined {
  const chats = useChats()
  return useMemo(() => {
    if (!id) return undefined
    const real = resolveId(id)
    return chats.find((c) => c.id === real) ?? chats.find((c) => c.id === id)
  }, [chats, id])
}

/** live mode: 'pending' | 'active' | 'ended' + who rang; demo chats have no status. */
export function useChatStatus(id: string | undefined): Pick<LiveChat, 'status' | 'requestedBy'> | undefined {
  const chat = useChat(id)
  const status = chat?.status
  const requestedBy = chat?.requestedBy
  return useMemo(() => (status && requestedBy ? { status, requestedBy } : undefined), [status, requestedBy])
}

/** Everyone ranked by "สัญญาณถูกคอ" against me (uses my intents too). */
export function useMatches(): MatchResult[] {
  const me = useMoshi((s) => s.me)
  const myIntents = useMoshi((s) => s.myIntents)
  const people = usePeople()
  const intents = useCatalog((s) => s.intents)
  return useMemo(() => matchAll(me, myIntents, people, intents), [me, myIntents, people, intents])
}

export function useMatch(userId: string | undefined): MatchResult | undefined {
  const me = useMoshi((s) => s.me)
  const myIntents = useMoshi((s) => s.myIntents)
  const people = useCatalog((s) => s.people)
  const intents = useCatalog((s) => s.intents)
  return useMemo(() => {
    const them = people.find((u) => u.id === userId)
    return them ? matchUser(me, them, myIntents, people, intents) : undefined
  }, [me, myIntents, people, intents, userId])
}
