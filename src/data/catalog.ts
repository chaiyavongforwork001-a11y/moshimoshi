import { create } from 'zustand'
import { isLive } from '@/lib/supabase'
import type { ChatMessage, DailyQuestion, Intent, Room, Session, User } from '@/lib/types'
import { DAILY_QUESTIONS, INTENTS, ROOM_MESSAGES, ROOMS, SESSIONS, USERS } from './mock'

/**
 * Shared, read-mostly data that comes from the server in live mode
 * (rooms, other people, their intents, sessions, daily questions, room chat).
 * Demo mode (no Supabase env) starts from the mock data and never syncs.
 * Pages never import '@/data/mock' directly — they use the hooks in
 * '@/data/hooks', which read this store plus the personal store (useMoshi).
 */
export type DataMode = 'demo' | 'live'

export interface CatalogData {
  mode: DataMode
  /** live mode: first sync finished (pages show skeletons until then) */
  ready: boolean
  /** live mode: the first sync failed (shown with a retry): no connection, or the load itself failed */
  error: 'network' | 'load' | null
  rooms: Room[]
  /** everyone except me */
  people: User[]
  /** intents posted by other people (mine live in useMoshi.myIntents) */
  intents: Intent[]
  sessions: Session[]
  questions: DailyQuestion[]
  /** room chat history per room (server rows in live mode, seeded lines in demo) */
  roomMessages: Record<string, ChatMessage[]>
  /** member counts per room, maintained by sync in live mode */
  roomStats: Record<string, { members: number; online: number }>
}

export interface CatalogState extends CatalogData {
  set: (patch: Partial<CatalogData>) => void
}

const DEMO: CatalogData = {
  mode: 'demo',
  ready: true,
  error: null,
  rooms: ROOMS,
  people: USERS,
  intents: INTENTS,
  sessions: SESSIONS,
  questions: DAILY_QUESTIONS,
  roomMessages: ROOM_MESSAGES,
  roomStats: Object.fromEntries(ROOMS.map((r) => [r.id, { members: r.memberCount, online: r.onlineCount }])),
}

/** live mode starts empty and fills in after sign-in */
export const LIVE_EMPTY: CatalogData = {
  mode: 'live',
  ready: false,
  error: null,
  rooms: [],
  people: [],
  intents: [],
  sessions: [],
  questions: [],
  roomMessages: {},
  roomStats: {},
}

export const useCatalog = create<CatalogState>()((set) => ({
  ...(isLive ? LIVE_EMPTY : DEMO),
  set: (patch) => set(patch),
}))

/** Forget everything synced (sign-out). */
export function resetCatalog() {
  useCatalog.getState().set(isLive ? LIVE_EMPTY : DEMO)
}
