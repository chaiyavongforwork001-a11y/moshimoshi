// "สัญญาณถูกคอ" — a 5-level signal scale (like phone bars) instead of a % score.
// Simplified client-side version of the scoring in docs/…-design-draft.md §5.6:
// interests (IDF-weighted tags) + intent (similar or complementary roles)
// + story (prompt answers) + rhythm (online hours) + context (shared rooms).

import { useCatalog } from '@/data/catalog'
import { CATEGORY_LABEL, ONLINE_LABEL, PROMPT_BY_ID, TAG_BY_ID, tagsInText } from '@/data/tags'
import { L, loc, t, texts } from './i18n'
import { roomInLang } from './i18n/catalog'
import type {
  Intent,
  IntentRole,
  MatchBreakdown,
  MatchReason,
  MatchResult,
  SharedTag,
  SignalLevel,
  User,
} from './types'

export interface SignalMeta {
  level: SignalLevel
  label: string
  short: string
  hint: string
}

export const SIGNAL_LEVELS: SignalMeta[] = [
  loc<SignalMeta>({
    level: 1,
    label: L('เพิ่งจูนคลื่น', 'Tuning in'),
    short: L('จูนคลื่น', 'Tuning in'),
    hint: L('มีเรื่องให้เริ่มคุยอยู่นิดหน่อย', 'A little something to start a chat'),
  }),
  loc<SignalMeta>({
    level: 2,
    label: L('พอคุยกันได้', 'Could click'),
    short: L('พอคุยได้', 'Could click'),
    hint: L('มีเรื่องที่ชอบตรงกันบ้าง', 'You share a few interests'),
  }),
  loc<SignalMeta>({
    level: 3,
    label: L('ถูกคอ', 'Good vibes'),
    short: L('ถูกคอ', 'Good vibes'),
    hint: L('ชอบหลายอย่างคล้ายกัน คุยกันไม่เงียบแน่', 'Lots in common, so no awkward silences'),
  }),
  loc<SignalMeta>({
    level: 4,
    label: L('คอเดียวกัน', 'Kindred spirits'),
    short: L('คอเดียวกัน', 'Kindred'),
    hint: L('ทั้งเรื่องที่ชอบและสิ่งที่กำลังหาไปทางเดียวกัน', "Same interests, and you're looking for the same things"),
  }),
  loc<SignalMeta>({
    level: 5,
    label: L('คลื่นเดียวกันเป๊ะ', 'Totally on your wavelength'),
    short: L('คลื่นเดียวกัน', 'Same wavelength'),
    hint: L('เหมือนเจอเพื่อนที่รู้จักกันมานาน', 'Like meeting an old friend'),
  }),
]

export function signalMeta(level: SignalLevel): SignalMeta {
  return SIGNAL_LEVELS[level - 1]
}

// role compatibility (row = A, column = B) from the design doc §5.4
const ROLE_COMPAT: Record<IntentRole, Record<IntentRole, number>> = {
  peer: { peer: 1, seek: 0.3, offer: 0.3, swap: 0.2, host: 0.9 },
  seek: { peer: 0.3, seek: 0.5, offer: 1, swap: 0.6, host: 0.8 },
  offer: { peer: 0.3, seek: 1, offer: 0, swap: 0.4, host: 0.2 },
  swap: { peer: 0.2, seek: 0.6, offer: 0.4, swap: 1, host: 0.1 },
  host: { peer: 0.9, seek: 0.8, offer: 0.2, swap: 0.1, host: 0.1 },
}

const WEIGHTS = { interests: 0.34, intent: 0.26, story: 0.16, rhythm: 0.12, context: 0.12 }
const LEVEL_CUTS: [number, SignalLevel][] = [
  [0.5, 5],
  [0.38, 4],
  [0.27, 3],
  [0.16, 2],
]

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

function jaccard<T>(a: Iterable<T>, b: Iterable<T>): number {
  const A = new Set(a)
  const B = new Set(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

// ---------- tag rarity (IDF over the community) ----------
interface TagStats {
  idf: Record<string, number>
  share: Record<string, number>
}

function tagStats(population: User[]): TagStats {
  const n = population.length
  const df: Record<string, number> = {}
  for (const u of population) for (const t of new Set(u.tags)) df[t] = (df[t] ?? 0) + 1
  const idf: Record<string, number> = {}
  const share: Record<string, number> = {}
  for (const t of Object.keys(TAG_BY_ID)) {
    const d = df[t] ?? 0
    idf[t] = Math.max(0.1, Math.log((n + 4) / (d + 1)))
    share[t] = n ? d / n : 0
  }
  return { idf, share }
}

function interestScore(a: User, b: User, stats: TagStats): { score: number; shared: SharedTag[] } {
  const w = (u: User, t: string) => (stats.idf[t] ?? 0.1) * (u.loves.includes(t) ? 1.5 : 1)
  const norm = (u: User) => Math.sqrt(u.tags.reduce((s, t) => s + w(u, t) ** 2, 0)) || 1
  const sharedIds = a.tags.filter((t) => b.tags.includes(t))
  const dot = sharedIds.reduce((s, t) => s + w(a, t) * w(b, t), 0)
  const shared: SharedTag[] = sharedIds
    .map((t) => ({ tag: TAG_BY_ID[t], share: stats.share[t] ?? 0, rare: (stats.share[t] ?? 0) <= 0.2 }))
    .filter((s) => s.tag)
    .sort((x, y) => x.share - y.share)
  // cosine of sparse vectors; a gentle sqrt lifts small overlaps so 1–2 rare tags still register
  return { score: clamp01(Math.sqrt(dot / (norm(a) * norm(b)))), shared }
}

// ---------- intent (similar or complementary) ----------
interface IntentHit {
  score: number
  mine?: Intent
  theirs: Intent
  kind: 'similar' | 'host' | 'teach' | 'swap' | 'bio'
}

function activitySim(a: Intent, b: Intent): number {
  if (a.tagId === b.tagId) return 1
  const ta = TAG_BY_ID[a.tagId]
  const tb = TAG_BY_ID[b.tagId]
  if (ta && tb && ta.category === tb.category) return 0.4
  return 0
}

function timeFit(a: Intent, b: Intent): number {
  if (a.when === b.when) return 1
  if (a.when === 'anytime' || b.when === 'anytime') return 0.8
  return 0.55
}

function swapFit(a: Intent, b: Intent): number {
  const give = (x?: string) => (x ? tagsInText(x) : [])
  const aGive = give(a.give)
  const aWant = give(a.want)
  const bGive = give(b.give)
  const bWant = give(b.want)
  const forward = aWant.some((t) => bGive.includes(t)) || (a.role === 'seek' && b.role === 'offer')
  const backward = bWant.some((t) => aGive.includes(t)) || (a.role === 'offer' && b.role === 'seek')
  if (a.role === 'swap' && b.role === 'swap') return forward && backward ? 1 : forward || backward ? 0.5 : 0
  return forward || backward ? 1 : 0
}

function intentScore(mine: Intent[], theirs: Intent[], me: User, them: User): IntentHit | null {
  let best: IntentHit | null = null
  for (const t of theirs) {
    for (const m of mine) {
      const act = activitySim(m, t)
      if (!act) continue
      let role = ROLE_COMPAT[m.role][t.role]
      const complementary = ['seek', 'offer', 'swap'].includes(m.role) && ['seek', 'offer', 'swap'].includes(t.role)
      if (complementary && !(m.role === 'seek' && t.role === 'seek')) role *= swapFit(m, t)
      const score = act * role * timeFit(m, t)
      if (!best || score > best.score) {
        const kind: IntentHit['kind'] =
          m.role === 'swap' && t.role === 'swap'
            ? 'swap'
            : complementary && role > 0
              ? 'teach'
              : t.role === 'host' || m.role === 'host'
                ? 'host'
                : 'similar'
        best = { score, mine: m, theirs: t, kind }
      }
    }
    // their intent vs my profile (I' in the doc): softer, used when I haven't posted a matching intent
    if (me.tags.includes(t.tagId)) {
      const score = 0.55 * (me.loves.includes(t.tagId) ? 1 : 0.8)
      if (!best || score > best.score) best = { score, theirs: t, kind: 'bio' }
    }
  }
  // my intents vs their profile
  for (const m of mine) {
    if (them.tags.includes(m.tagId)) {
      const score = 0.5
      if (!best || score > best.score) best = { score, mine: m, theirs: m, kind: 'bio' }
    }
  }
  return best
}

// ---------- story (prompt answers, Thai-aware) ----------
const STOP = new Set(['และ', 'กับ', 'ที่', 'ก็', 'แล้ว', 'จน', 'ได้', 'ไป', 'มา', 'เป็น', 'ของ', 'ให้', 'แต่', 'ยัง', 'ทุก', 'คืน', 'มาก', 'เลย', 'นะ', 'ครับ', 'ค่ะ', 'อยาก', 'ชอบ',
  'and', 'the', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'my', 'me', 'is', 'it', 'an', 'or', 'but', 'so', 'up', 'too', 'just', 'really',
  'very', 'all', 'every', 'am', 'are', 'be', "i'm", 'im', 'you', 'your', 'that', 'this', 'like', 'love', 'want', 'into', 'from', 'about',
  'then', 'also', 'some', 'get', 'go',
])
const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'word' }) : null

function words(text: string): string[] {
  const t = text.toLowerCase()
  if (!segmenter) return t.split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w))
  const out: string[] = []
  for (const s of segmenter.segment(t)) {
    if (s.isWordLike && s.segment.length > 1 && !STOP.has(s.segment)) out.push(s.segment)
  }
  return out
}

function storyScore(a: User, b: User): { score: number; promptId?: string } {
  let best = 0
  let promptId: string | undefined
  for (const pa of a.prompts) {
    for (const pb of b.prompts) {
      const tagSim = jaccard(tagsInText(pa.text), tagsInText(pb.text))
      const wordSim = jaccard(words(pa.text), words(pb.text))
      const samePrompt = pa.promptId === pb.promptId ? 0.15 : 0
      const s = clamp01(0.6 * tagSim + 0.9 * wordSim + samePrompt * (tagSim + wordSim > 0 ? 1 : 0))
      if (s > best) {
        best = s
        promptId = pb.promptId
      }
    }
  }
  return { score: clamp01(best * 1.6), promptId }
}

// ---------- icebreakers ----------
const ICEBREAKER_BY_CATEGORY: Record<string, (label: string, name: string) => string> = {
  game: (l, n) => t(`ชวน${n}เข้าตี้ ${l} คืนนี้ดูไหม?`, `Invite ${n} to a round of ${l} tonight?`),
  anime: (l) => t(`ฉากไหนใน ${l} ที่ลืมไม่ลงที่สุด?`, `What got you into ${l}?`),
  music: (l) => t(`ถ้าต้องเลือก 1 เพลงสาย ${l} ให้คนไม่เคยฟัง จะเลือกเพลงไหน?`, `${l}: which song would you play for someone new to it?`),
  film: (l) => t(`${l} เรื่องไหนที่ดูซ้ำได้ไม่เบื่อ?`, `${l}: which one could you rewatch forever?`),
  food: (l) => t(`ร้าน${l}ที่ชอบที่สุดอยู่แถวไหน ขอพิกัดหน่อย`, `${l}: where's your favorite spot? Drop a pin!`),
  outdoor: (l) => t(`ทริป${l}ครั้งที่ประทับใจที่สุดคือที่ไหน?`, `${l}: what's your best story so far?`),
  lang: (l) => t(`เริ่มเรียน${l}เพราะอะไรเหรอ?`, `What got you into learning ${l}?`),
  study: (l) => t(`ปกติ${l}ช่วงไหน ชวนกันมานั่งด้วยกันได้นะ`, `${l}: when are you usually at it? We could keep each other company!`),
  pet: (l) => t(`ขอดูรูปน้องหน่อย! (${l} ตัวจริงต้องอวด)`, `Pet pics, please! (A true ${l.toLowerCase()} has to show off)`),
  art: (l) => t(`ช่วงนี้${l}อะไรอยู่ อยากเห็นผลงานจัง`, `${l}: what are you working on lately? I'd love to see it`),
  book: (l) => t(`ถ้าให้ป้ายยา${l} 1 เล่ม จะเลือกเล่มไหน?`, `${l}: if you could recommend just one book, which would it be?`),
  life: (l) => t(`เรื่อง "${l}" มีเรื่องเล่าเยอะแน่ๆ เล่าให้ฟังหน่อย`, `I bet you have stories about "${l}". Tell me one!`),
}

function buildIcebreakers(them: User, shared: SharedTag[], hit: IntentHit | null, promptId?: string): string[] {
  const out: string[] = []
  if (hit && hit.kind !== 'bio') out.push(t(`ทักเรื่อง "${hit.theirs.text}" ได้เลย เขากำลังหาอยู่พอดี`, `Say hi about "${hit.theirs.text}". They're looking for exactly that`))
  for (const s of shared.slice(0, 2)) {
    const f = ICEBREAKER_BY_CATEGORY[s.tag.category]
    if (f) out.push(f(s.tag.label, them.name))
  }
  const answer = them.prompts.find((p) => p.promptId === promptId) ?? them.prompts[0]
  if (answer) out.push(t(`${them.name}บอกว่า "${answer.text}" ลองถามต่อดูสิ`, `${them.name} said "${answer.text}". Ask them more!`))
  return out.slice(0, 3)
}

// ---------- main ----------
export function matchUser(
  me: User,
  them: User,
  myIntents: Intent[] = [],
  population: User[] = [],
  intents: Intent[] = [],
): MatchResult {
  const roomOf = (id: string) => {
    const room = useCatalog.getState().rooms.find((r) => r.id === id)
    return room && roomInLang(room)
  }
  const pop = population.some((u) => u.id === me.id) ? population : [...population, me]
  const stats = tagStats(pop)
  const theirIntents = intents.filter((i) => i.userId === them.id)

  const interests = interestScore(me, them, stats)
  const hit = intentScore(myIntents, theirIntents, me, them)
  const story = storyScore(me, them)
  const rhythm = jaccard(me.online, them.online)
  const sharedRooms = me.rooms.filter((r) => {
    const room = them.rooms.includes(r) ? roomOf(r) : undefined
    return !!room && !room.isLobby
  })
  const context = clamp01(sharedRooms.length * 0.5)

  const breakdown: MatchBreakdown = {
    interests: interests.score,
    intent: hit?.score ?? 0,
    story: story.score,
    rhythm,
    context,
  }

  // intent only counts when either side actually has one (missing ≠ negative)
  const hasIntent = myIntents.length > 0 || theirIntents.length > 0
  const w = { ...WEIGHTS, intent: hasIntent ? WEIGHTS.intent : 0 }
  const wSum = w.interests + w.intent + w.story + w.rhythm + w.context
  const score =
    (w.interests * breakdown.interests +
      w.intent * breakdown.intent +
      w.story * breakdown.story +
      w.rhythm * breakdown.rhythm +
      w.context * breakdown.context) /
    wSum

  const level: SignalLevel = LEVEL_CUTS.find(([cut]) => score >= cut)?.[1] ?? 1
  const meta = signalMeta(level)

  // reasons — concrete, human, never numeric
  const reasons: MatchReason[] = []
  const rare = interests.shared.filter((s) => s.rare)
  const common = interests.shared.filter((s) => !s.rare)
  if (rare.length) {
    reasons.push({
      kind: 'rareTag',
      text: t(
        `ชอบ ${rare.slice(0, 2).map((s) => s.tag.label).join(' และ ')} เหมือนกัน (หายากนะ!)`,
        `You both picked ${rare.slice(0, 2).map((s) => s.tag.label).join(' and ')} (that's rare!)`,
      ),
      weight: 0.9,
    })
  }
  if (common.length) {
    reasons.push({
      kind: 'tag',
      text: t(`ชอบ ${common.slice(0, 3).map((s) => s.tag.label).join(', ')} เหมือนกัน`, `You both picked ${common.slice(0, 3).map((s) => s.tag.label).join(', ')}`),
      weight: 0.5 + 0.1 * common.length,
    })
  }
  if (hit) {
    const tag = TAG_BY_ID[hit.theirs.tagId]?.label ?? ''
    const text =
      hit.kind === 'swap'
        ? t(
            `แลกกันพอดี: เขาให้ ${hit.theirs.give ?? tag} ได้ และอยากได้ ${hit.theirs.want ?? 'สิ่งที่เรามี'}`,
            `A perfect swap: they can offer ${hit.theirs.give ?? tag} and want ${hit.theirs.want ?? 'what you have'}`,
          )
        : hit.kind === 'teach'
          ? hit.theirs.role === 'offer'
            ? t(`เราอยากเริ่ม ${tag} และเขายินดีช่วยมือใหม่`, `You want to get into ${tag}, and they're happy to help beginners`)
            : t(`เขาอยากเริ่ม ${tag} ซึ่งเราช่วยได้พอดี`, `They want to get into ${tag}, and you can help`)
          : hit.kind === 'host'
            ? t(`เขามีที่ว่างใน "${hit.theirs.text}"`, `They have a spot open in "${hit.theirs.text}"`)
            : hit.kind === 'bio'
              ? t(`เขากำลังหาเพื่อนเรื่อง ${tag} ซึ่งเราก็ชอบ`, `They're looking for friends for ${tag}, and you're into it too`)
              : t(`กำลังหาเพื่อน ${tag} เหมือนกัน`, `You're both looking for friends for ${tag}`)
    reasons.push({ kind: hit.kind === 'swap' || hit.kind === 'teach' ? 'swap' : 'intent', text, weight: hit.score })
  }
  if (story.score > 0.25 && story.promptId) {
    reasons.push({
      kind: 'prompt',
      text: t(
        `ตอบคล้ายกันเรื่อง "${PROMPT_BY_ID[story.promptId]?.label.replace('…', '')}"`,
        `Similar answers to "${PROMPT_BY_ID[story.promptId]?.label.replace('…', '')}"`,
      ),
      weight: story.score,
    })
  }
  const sharedSlots = me.online.filter((s) => them.online.includes(s))
  if (sharedSlots.length) {
    const slots = sharedSlots.map((s) => ONLINE_LABEL[s])
    reasons.push({
      kind: 'time',
      text: t(`ออนไลน์${slots.join('และ')}เหมือนกัน`, `You're both online ${slots.join(' and ').toLowerCase()}`),
      weight: 0.3 + rhythm * 0.3,
    })
  }
  if (sharedRooms.length) {
    const names = sharedRooms.map((r) => roomOf(r)?.name)
    reasons.push({
      kind: 'room',
      text: t(`อยู่ห้อง${names.join(' และ ')}ด้วยกัน`, `You're both in ${names.join(' and ')}`),
      weight: 0.3 + context * 0.3,
    })
  }
  const talker = (u: User) => u.chatStyle.includes('คุยเก่ง')
  const listener = (u: User) => u.chatStyle.includes('ฟังเก่ง')
  if ((talker(me) && listener(them)) || (listener(me) && talker(them))) {
    reasons.push({ kind: 'style', text: t('คนหนึ่งคุยเก่ง อีกคนฟังเก่ง ลงตัวพอดี', 'One loves to talk, the other loves to listen. A perfect fit'), weight: 0.35 })
  }
  reasons.sort((x, y) => y.weight - x.weight)

  return {
    userId: them.id,
    level,
    score,
    label: meta.label,
    shortLabel: meta.short,
    reasons,
    sharedTags: interests.shared,
    breakdown,
    icebreakers: buildIcebreakers(them, interests.shared, hit, story.promptId),
  }
}

export function matchAll(me: User, myIntents: Intent[] = [], population: User[] = [], intents: Intent[] = []): MatchResult[] {
  return population
    .filter((u) => u.id !== me.id)
    .map((u) => matchUser(me, u, myIntents, population, intents))
    .sort((a, b) => b.score - a.score)
}

export const BREAKDOWN_LABEL: Readonly<Record<keyof MatchBreakdown, string>> = texts({
  interests: L('เรื่องที่ชอบ', 'Interests'),
  intent: L('สิ่งที่กำลังหา', 'Looking for'),
  story: L('เรื่องเล่า', 'Stories'),
  rhythm: L('ช่วงเวลา', 'Online times'),
  context: L('ห้องที่อยู่', 'Rooms'),
})

export { CATEGORY_LABEL }
