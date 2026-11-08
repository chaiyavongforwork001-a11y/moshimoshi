import { known, L, loc, texts } from '@/lib/i18n'
import { knownEnglish } from '@/lib/i18n/known'
import type { Prompt, PromptAnswer, Tag, TagCategory } from '@/lib/types'

export const CATEGORY_LABEL: Readonly<Record<TagCategory, string>> = texts({
  game: L('เกม', 'Games'),
  anime: L('อนิเมะ & การ์ตูน', 'Anime & Comics'),
  music: L('ดนตรี', 'Music'),
  film: L('หนัง & ซีรีส์', 'Movies & Series'),
  food: L('ของกิน & คาเฟ่', 'Food & Cafés'),
  outdoor: L('ออกไปข้างนอก', 'Out & About'),
  lang: L('ภาษา', 'Languages'),
  study: L('เรียน & ทำงาน', 'Study & Work'),
  pet: L('สัตว์เลี้ยง', 'Pets'),
  art: L('ศิลปะ & งานทำมือ', 'Art & Crafts'),
  book: L('หนังสือ', 'Books'),
  life: L('ชีวิตประจำวัน', 'Everyday Life'),
  other: L('อื่นๆ', 'Other'),
})

const TAG_LABEL_TH: Record<string, string> = {}

/** The Thai label, for Thai-only text such as the demo people's replies. */
export const tagLabelTh = (id: string): string => TAG_LABEL_TH[id] ?? tagOf(id)?.label ?? id

/** `label` reads in the current language; both spellings also count as aliases for search. */
function tag(id: string, th: string, en: string, category: TagCategory, aliases: string[]): Tag {
  TAG_LABEL_TH[id] = th
  return loc<Tag>({ id, label: th === en ? th : L(th, en), category, aliases: th === en ? aliases : [...aliases, th, en.toLowerCase()] })
}

export const TAGS: Tag[] = [
  // game
  tag('valorant', 'Valorant', 'Valorant', 'game', ['วาโล', 'valo', 'วาโลแรนท์']),
  tag('rov', 'ROV', 'ROV', 'game', ['โรฟ', 'rov']),
  tag('genshin', 'Genshin Impact', 'Genshin Impact', 'game', ['เก็นชิน', 'genshin']),
  tag('minecraft', 'Minecraft', 'Minecraft', 'game', ['มายคราฟ', 'มายคราฟต์']),
  tag('hollowknight', 'Hollow Knight', 'Hollow Knight', 'game', ['hollow knight', 'ฮอลโลว์ไนท์']),
  tag('cozygame', 'เกมชิลๆ', 'Cozy games', 'game', ['stardew', 'animal crossing', 'เกมชิล']),
  tag('boardgame', 'บอร์ดเกม', 'Board games', 'game', ['บอร์ดเกม', 'board game']),
  tag('pokemon', 'Pokémon', 'Pokémon', 'game', ['โปเกมอน', 'pokemon']),
  // anime
  tag('frieren', 'Frieren', 'Frieren', 'anime', ['ฟรีเรน', 'frieren']),
  tag('onepiece', 'One Piece', 'One Piece', 'anime', ['วันพีช', 'one piece']),
  tag('ghibli', 'Ghibli', 'Ghibli', 'anime', ['จิบลิ', 'ghibli']),
  tag('jjk', 'Jujutsu Kaisen', 'Jujutsu Kaisen', 'anime', ['มหาเวทย์ผนึกมาร', 'jjk']),
  tag('manga', 'มังงะ', 'Manga', 'anime', ['มังงะ', 'manga']),
  tag('lightnovel', 'ไลท์โนเวล', 'Light novels', 'anime', ['ไลท์โนเวล', 'light novel']),
  tag('cosplay', 'คอสเพลย์', 'Cosplay', 'anime', ['คอส', 'cosplay']),
  tag('vtuber', 'VTuber', 'VTuber', 'anime', ['วีทูปเบอร์', 'vtuber']),
  // music
  tag('tpop', 'T-pop', 'T-pop', 'music', ['ทีป็อป', 't-pop']),
  tag('kpop', 'K-pop', 'K-pop', 'music', ['เคป็อป', 'k-pop', 'ติ่งเกา']),
  tag('indie', 'เพลงอินดี้', 'Indie music', 'music', ['อินดี้', 'indie']),
  tag('jpop', 'J-pop', 'J-pop', 'music', ['เจป็อป', 'j-pop']),
  tag('concert', 'ไปคอนเสิร์ต', 'Concerts', 'music', ['คอน', 'คอนเสิร์ต', 'เฟส']),
  tag('guitar', 'กีตาร์', 'Guitar', 'music', ['กีตาร์', 'guitar']),
  // film
  tag('kdrama', 'ซีรีส์เกาหลี', 'K-dramas', 'film', ['ซีรีส์เกา', 'k-drama']),
  tag('thaiseries', 'ซีรีส์ไทย', 'Thai series', 'film', ['ซีรีส์ไทย', 'ละคร']),
  tag('horror', 'หนังผี', 'Horror movies', 'film', ['หนังผี', 'horror']),
  tag('marvel', 'Marvel', 'Marvel', 'film', ['มาร์เวล', 'marvel']),
  tag('netflix', 'Netflix', 'Netflix', 'film', ['เน็ตฟลิกซ์', 'netflix']),
  // food
  tag('cafe', 'คาเฟ่', 'Cafés', 'food', ['คาเฟ่', 'cafe', 'สายคาเฟ่']),
  tag('streetfood', 'สตรีทฟู้ด', 'Street food', 'food', ['ของกินข้างทาง', 'สตรีทฟู้ด']),
  tag('baking', 'ทำขนม', 'Baking', 'food', ['ทำขนม', 'อบขนม', 'baking']),
  tag('cooking', 'ทำอาหาร', 'Cooking', 'food', ['ทำอาหาร', 'cooking']),
  tag('mookata', 'หมูกระทะ', 'Mookata', 'food', ['หมูกระทะ']),
  // outdoor
  tag('hiking', 'เดินป่า ขึ้นดอย', 'Hiking', 'outdoor', ['เดินป่า', 'ขึ้นดอย', 'hiking']),
  tag('running', 'วิ่ง', 'Running', 'outdoor', ['วิ่ง', 'running']),
  tag('camping', 'แคมป์ปิ้ง', 'Camping', 'outdoor', ['แคมป์', 'camping']),
  tag('photography', 'ถ่ายรูป', 'Photography', 'outdoor', ['ถ่ายรูป', 'กล้องฟิล์ม', 'photo']),
  tag('travel', 'เที่ยว', 'Travel', 'outdoor', ['เที่ยว', 'travel']),
  // lang
  tag('japanese', 'ภาษาญี่ปุ่น', 'Japanese', 'lang', ['ญี่ปุ่น', 'ญุ่น', 'japanese', '日本語']),
  tag('english', 'ภาษาอังกฤษ', 'English', 'lang', ['อังกฤษ', 'english']),
  tag('korean', 'ภาษาเกาหลี', 'Korean', 'lang', ['เกาหลี', 'korean']),
  tag('thai', 'ภาษาไทย', 'Thai', 'lang', ['ภาษาไทย', 'タイ語']),
  // study / work
  tag('cowork', 'นั่งทำงานด้วยกัน', 'Coworking', 'study', ['นั่งทำงาน', 'co-working', 'pomodoro']),
  tag('toeic', 'ติว TOEIC', 'TOEIC prep', 'study', ['toeic', 'โทอิค']),
  tag('coding', 'เขียนโค้ด', 'Coding', 'study', ['โค้ด', 'coding', 'dev']),
  tag('design', 'งานดีไซน์', 'Design', 'study', ['ดีไซน์', 'design', 'figma']),
  tag('firstjob', 'มนุษย์เงินเดือนมือใหม่', 'First jobbers', 'study', ['first jobber', 'เด็กจบใหม่']),
  // pet
  tag('cat', 'ทาสแมว', 'Cat person', 'pet', ['แมว', 'ทาสแมว', 'cat']),
  tag('dog', 'ทาสหมา', 'Dog person', 'pet', ['หมา', 'น้องหมา', 'dog']),
  // art
  tag('drawing', 'วาดรูป', 'Drawing', 'art', ['วาดรูป', 'drawing', 'digital art']),
  tag('crochet', 'ถักไหมพรม', 'Crochet', 'art', ['ถักไหมพรม', 'crochet']),
  tag('journaling', 'จดบันทึก', 'Journaling', 'art', ['journal', 'จดบันทึก', 'bullet journal']),
  // book
  tag('mystery', 'นิยายสืบสวน', 'Mystery novels', 'book', ['นิยายสืบสวน', 'ฮิงาชิโนะ', 'mystery']),
  tag('selfhelp', 'หนังสือพัฒนาตัวเอง', 'Self-help books', 'book', ['how to', 'พัฒนาตัวเอง']),
  tag('fantasy', 'แฟนตาซี', 'Fantasy', 'book', ['แฟนตาซี', 'fantasy']),
  // life
  tag('movedbkk', 'เพิ่งย้ายมากรุงเทพฯ', 'New to Bangkok', 'life', ['ย้ายมากรุงเทพ', 'ย้ายเมือง']),
  tag('nightowl', 'นอนดึก', 'Night owl', 'life', ['นอนดึก', 'night owl']),
  tag('astrology', 'สายมู', 'Astrology & tarot', 'life', ['สายมู', 'ดูดวง', 'ไพ่ทาโรต์']),
  tag('plants', 'ปลูกต้นไม้', 'Plant parent', 'life', ['ต้นไม้', 'plant']),
  tag('listening', 'ชอบรับฟัง', 'Good listener', 'life', ['รับฟัง', 'ปรึกษา', 'listener']),
]

export const TAG_BY_ID: Record<string, Tag> = Object.fromEntries(TAGS.map((t) => [t.id, t]))

// ------------------------------------------------------------------ "อื่นๆ": in people's own words
// Interests they typed live next to the catalog ids as `custom:<what they typed>`,
// in profiles.tags, profiles.loves and intents.tag_id (all plain text, so no schema change).
// What people write is never translated.
const OWN_TAG = 'custom:'
export const OWN_TAG_MAX = 30
export const MAX_OWN_TAGS = 5
export const OWN_STYLE_MAX = 24
export const OWN_QUESTION_MAX = 60
/** promptId of an answer to a question they wrote themselves (PromptAnswer.question). */
export const OWN_PROMPT_ID = 'own'

export const isOwnTag = (id: string) => id.startsWith(OWN_TAG)

/** Cut to `max` without leaving half an emoji behind: the database refuses a lone surrogate, and the whole save with it. */
export const cutText = (text: string, max: number) => text.slice(0, max).replace(/[\uD800-\uDBFF]$/, '')

/** One line, no stray spaces or leading hash signs, cut to `max`. */
export const cleanOwnText = (text: string, max: number) =>
  cutText(
    text
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .replace(/^[#\s]+/, '')
      .trim(),
    max,
  ).trim()

const OWN_TAGS = new Map<string, Tag>()

/** A tag by id: from the catalog, or built from the words in a `custom:` id. Use this whenever the id comes from a person. */
export function tagOf(id: string): Tag | undefined {
  if (Object.hasOwn(TAG_BY_ID, id)) return TAG_BY_ID[id]
  if (!isOwnTag(id)) return undefined
  let tag = OWN_TAGS.get(id)
  if (!tag) {
    const label = id.slice(OWN_TAG.length).trim()
    if (!label) return undefined
    tag = { id, label, category: 'other' }
    OWN_TAGS.set(id, tag)
  }
  return tag
}

/** Compare tags with this: "Taylor Swift" and "taylor swift" typed by two people are the same interest. */
export const tagKey = (id: string) => (isOwnTag(id) ? id.toLowerCase() : id)

export const sameTag = (a: string, b: string) => tagKey(a) === tagKey(b)

/** Spaces and hyphens don't count when comparing names: "kpop" is K-pop, "one piece" is onepiece. */
const squash = (s: string) => s.toLowerCase().replace(/[\s-]/g, '')
const namesOf = (t: Tag) => [t.id, t.label, ...(t.aliases ?? [])]

/** Does this listed tag answer a search? */
export function tagMatches(tag: Tag, query: string): boolean {
  const q = squash(query)
  return !!q && namesOf(tag).some((name) => squash(name).includes(q))
}

/** Typed words → a tag id: the catalog tag if it already exists under that name, else a `custom:` id. */
export function ownTagId(text: string): string | null {
  const label = cleanOwnText(text, OWN_TAG_MAX)
  if (!label) return null
  const q = squash(label)
  const listed = q ? TAGS.find((t) => namesOf(t).some((name) => squash(name) === q)) : undefined
  return listed ? listed.id : OWN_TAG + label
}

export const PROMPTS: Prompt[] = [
  loc<Prompt>({
    id: 'hooked',
    label: L('ช่วงนี้ฉันกำลังติด…', "Lately I'm hooked on…"),
    example: L('Frieren กับเกม Stardew จนนอนดึกทุกคืน', 'Frieren and Stardew, up way too late every night'),
  }),
  loc<Prompt>({
    id: 'weekend',
    label: L('วันหยุดในอุดมคติของฉันคือ…', 'My ideal day off is…'),
    example: L('ตื่นสาย ไปคาเฟ่ใหม่ แล้วกลับมาเล่นเกมกับเพื่อน', 'Sleeping in, a new café, then gaming with friends'),
  }),
  loc<Prompt>({
    id: 'allnight',
    label: L('เรื่องที่ฉันคุยได้ทั้งคืนคือ…', 'I could talk all night about…'),
    example: L('ทฤษฎีวันพีช กับหนังผีญี่ปุ่น', 'One Piece theories and Japanese horror films'),
  }),
  loc<Prompt>({
    id: 'recommend',
    label: L('ของที่อยากป้ายยาให้ทุกคนคือ…', 'Something I recommend to everyone…'),
    example: L('ร้านข้าวมันไก่หลังออฟฟิศ อร่อยมาก', 'The chicken rice place behind my office. So good'),
  }),
  loc<Prompt>({
    id: 'queue',
    label: L('ของกินที่ฉันยอมต่อคิวคือ…', "Food I'd happily queue for…"),
    example: L('โทสต์เนยโสดร้านดังย่านอารีย์', 'Butter toast at that famous spot in Ari'),
  }),
  loc<Prompt>({
    id: 'invite',
    label: L('ชวนฉันไป… แล้วฉันไปแน่นอน', "Invite me to… and I'm there"),
    example: L('บอร์ดเกมคาเฟ่ หรือคอนเสิร์ตอินดี้', 'A board game café or an indie gig'),
  }),
]

export const PROMPT_BY_ID: Record<string, Prompt> = Object.fromEntries(PROMPTS.map((p) => [p.id, p]))

/** The question an answer belongs to: theirs if they wrote one, else from the list. */
/** FNV-1a: a short, steady fingerprint of some text (an id, not a secret). */
function fingerprint(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/**
 * Which story on a profile a "เหมือนกัน!" belongs to: the prompt (its id, or for a question they
 * wrote themselves a fingerprint of that question), then "~" and a fingerprint of the answer, so a
 * rewritten or re-added story starts fresh. The database checks this exact format
 * (supabase/migrations/20261108000003_live_reactions.sql): a new prompt id must be added there too.
 */
export function promptKey(answer: PromptAnswer): string {
  const prompt = answer.promptId === OWN_PROMPT_ID ? `own-${fingerprint(squash(answer.question ?? ''))}` : answer.promptId
  return `${prompt}~${fingerprint(squash(answer.text))}`
}

export function promptLabel(answer: PromptAnswer): string | undefined {
  if (answer.promptId === OWN_PROMPT_ID) return answer.question?.trim() || undefined
  return Object.hasOwn(PROMPT_BY_ID, answer.promptId) ? PROMPT_BY_ID[answer.promptId].label : undefined
}

/** Stored as these Thai values (profiles.chat_style); show them with known(). */
export const CHAT_STYLES = ['คุยเก่ง', 'ฟังเก่ง', 'ตอบไว', 'ตอบช้าแต่ตอบนะ', 'พิมพ์ยาว', 'สายสติกเกอร์', 'คุยเสียงได้']

/** Typed words → a chat style: the listed one if they typed its name in either language, else their words as they are. */
export function ownChatStyle(text: string): string | null {
  const value = cleanOwnText(text, OWN_STYLE_MAX)
  if (!value) return null
  const lower = value.toLowerCase()
  return CHAT_STYLES.find((s) => s.toLowerCase() === lower || knownEnglish(s)?.toLowerCase() === lower) ?? value
}

export const hasChatStyle = (list: string[], style: string) => list.some((s) => s.toLowerCase() === style.toLowerCase())

/** A chat style for display: the listed ones read in the current language, what people typed stays as they wrote it. */
export const chatStyleLabel = (style: string) => (CHAT_STYLES.includes(style) ? known(style) : style)

/** Every time of day there is to pick. */
export const ALL_SLOTS = ['morning', 'afternoon', 'evening', 'late'] as const

/** Online at every time of day: shown as one rainbow "24 ชั่วโมง" (AllDayChip) instead of four time chips. */
export const isAllDay = (slots: readonly string[]) => ALL_SLOTS.every((s) => slots.includes(s))

export const ONLINE_LABEL: Readonly<Record<string, string>> = texts({
  morning: L('ช่วงเช้า', 'Mornings'),
  afternoon: L('ช่วงบ่าย', 'Afternoons'),
  evening: L('หัวค่ำ', 'Evenings'),
  late: L('ดึกๆ', 'Late nights'),
})

const NON_LATIN = /[\u0E00-\u0E7F\u3040-\u30FF\u4E00-\u9FFF]/
const NEEDLE_RE = new Map<string, RegExp>()
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Thai / Japanese needles match anywhere; Latin ones need word edges ('cat' is not in 'vacation'), a plural -s/-es is fine. */
function hasNeedle(lower: string, needle: string): boolean {
  if (NON_LATIN.test(needle)) return lower.includes(needle)
  let re = NEEDLE_RE.get(needle)
  if (!re) NEEDLE_RE.set(needle, (re = new RegExp(`(?:^|[^a-z0-9])${escapeRe(needle)}(?:e?s)?(?![a-z0-9])`)))
  return re.test(lower)
}

/** Resolve free text to known tag ids by alias / label substring (longest first). */
export function tagsInText(text: string): string[] {
  const lower = text.toLowerCase()
  const found = new Set<string>()
  const entries: [string, string][] = []
  for (const t of TAGS) {
    entries.push([t.label.toLowerCase(), t.id])
    for (const a of t.aliases ?? []) entries.push([a.toLowerCase(), t.id])
  }
  entries.sort((a, b) => b[0].length - a[0].length)
  for (const [needle, id] of entries) {
    if (needle.length >= 2 && hasNeedle(lower, needle)) found.add(id)
  }
  return [...found]
}
