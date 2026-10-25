// Shared domain types for the moshimoshi prototype.
// Every page reads from these; keep them stable.

export type MochiColor = 'peach' | 'butter' | 'mint' | 'lavender' | 'sky' | 'pink' | 'cream'

export type TagCategory =
  | 'game'
  | 'anime'
  | 'music'
  | 'film'
  | 'food'
  | 'outdoor'
  | 'lang'
  | 'study'
  | 'pet'
  | 'art'
  | 'book'
  | 'life'

export interface Tag {
  id: string
  label: string
  category: TagCategory
  /** Thai / English / slang spellings that should resolve to this tag */
  aliases?: string[]
}

export type OnlineSlot = 'morning' | 'afternoon' | 'evening' | 'late'

export interface Prompt {
  id: string
  label: string
  /** placeholder / example answer shown in the composer */
  example: string
}

export interface PromptAnswer {
  promptId: string
  text: string
}

/** peer = do X together · seek = wants someone who can give X · offer = can give X · swap = trade A for B · host = has N open spots */
export type IntentRole = 'peer' | 'seek' | 'offer' | 'swap' | 'host'

export type IntentTemplate = 'play' | 'talk' | 'lang' | 'event' | 'newbie' | 'study' | 'moved' | 'listen'

export type IntentWhen = 'tonight' | 'weekend' | 'anytime' | 'dated'

export interface Intent {
  id: string
  userId: string
  template: IntentTemplate
  role: IntentRole
  /** main activity tag id */
  tagId: string
  text: string
  when: IntentWhen
  /** human label for dated / recurring intents, e.g. "เสาร์นี้ 14:00" */
  whenLabel?: string
  mode: 'online' | 'offline'
  /** province shown publicly (never finer than province) */
  province?: string
  /** open spots for host intents */
  slots?: number
  /** for swap / seek / offer: what the poster can give and wants */
  give?: string
  want?: string
  roomId?: string
  /** minutes since posted (mock clock) */
  postedMinutesAgo: number
  /** user ids who pressed "ฉันด้วย" */
  joinedBy: string[]
}

export interface User {
  id: string
  name: string
  age: number
  /** ค.ศ.; collected in onboarding for the 20+ check (profiles.birth_year) */
  birthYear?: number
  color: MochiColor
  /** mochi look picked in onboarding (3D mascot + avatar) */
  face?: 'smile' | 'happy' | 'wink' | 'sleepy' | 'talk' | 'wow'
  accessory?: 'none' | 'headset' | 'leaf' | 'bow' | 'cap'
  province: string
  /** one-line self intro */
  bio: string
  tags: string[]
  /** up to 3 starred tags ("รักมาก") */
  loves: string[]
  prompts: PromptAnswer[]
  chatStyle: string[]
  online: OnlineSlot[]
  rooms: string[]
  languages: string[]
  isHost?: boolean
  /** e.g. "ออนไลน์อยู่", "15 นาทีที่แล้ว" */
  lastActive: string
  isOnline: boolean
}

export interface Room {
  id: string
  name: string
  /** lucide icon name rendered by <RoomIcon /> */
  icon: string
  color: MochiColor
  tagline: string
  /** longer welcoming description */
  vibe: string
  tags: string[]
  memberCount: number
  onlineCount: number
  primeTime: string
  hostIds: string[]
  /** lobby is special: not counted as a shared room for matching */
  isLobby?: boolean
}

export interface Session {
  id: string
  roomId: string
  title: string
  /** 0 = today, 1 = tomorrow ... */
  dayOffset: number
  time: string
  durationMin: number
  going: number
  /** '' when the team hosts it (no host profile) */
  hostId: string
  /** host label from sessions.host_name, for hosts without a profile */
  hostName?: string
  live?: boolean
}

export interface DailyAnswer {
  userId: string
  text: string
  sameCount: number
}

export interface DailyQuestion {
  id: string
  roomId: string
  text: string
  answers: DailyAnswer[]
}

export interface ChatMessage {
  id: string
  userId: string
  text: string
  /** display time, e.g. "21:04" */
  at: string
  kind?: 'text' | 'system' | 'welcome'
  sameBy?: string[]
  replyTo?: string
}

/** live chats only: pending = a moshi still ringing · active = talking · ended = closed */
export type ChatStatus = 'pending' | 'active' | 'ended'

export interface Chat {
  id: string
  withUserId: string
  messages: ChatMessage[]
  /** suggested opener / topic card pinned at the top */
  icebreaker?: string
  unread: number
  /** live mode: server status (demo chats have none) */
  status?: ChatStatus
  /** live mode: who sent the moshi that opened this chat */
  requestedBy?: string
}

export type SignalLevel = 1 | 2 | 3 | 4 | 5

export type MatchReasonKind = 'rareTag' | 'tag' | 'intent' | 'swap' | 'prompt' | 'time' | 'room' | 'style'

export interface MatchReason {
  kind: MatchReasonKind
  text: string
  /** contribution 0..1 used for ordering */
  weight: number
}

export interface SharedTag {
  tag: Tag
  /** share of the community that has this tag, 0..1 */
  share: number
  rare: boolean
}

export interface MatchBreakdown {
  /** each part 0..1 — shown as mini bars, never as a percentage */
  interests: number
  intent: number
  story: number
  rhythm: number
  context: number
}

export interface MatchResult {
  userId: string
  level: SignalLevel
  /** internal 0..1 score; never render it as a number */
  score: number
  label: string
  shortLabel: string
  reasons: MatchReason[]
  sharedTags: SharedTag[]
  breakdown: MatchBreakdown
  icebreakers: string[]
}

export type Mood = 'happy' | 'chill' | 'tired' | 'lonely' | 'excited'
