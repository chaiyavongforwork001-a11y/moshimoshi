// Tiny canned "other side" for the prototype: warm, short Thai replies that
// pick up on what we wrote and on the interests we share.
import { TAG_BY_ID, tagLabelTh, tagsInText } from '@/data/tags'
import type { SharedTag, Tag, TagCategory, User } from '@/lib/types'

const BY_CATEGORY: Record<TagCategory, (label: string) => string> = {
  game: (l) => `${l}เหรอ! ช่วงนี้เล่นบ่อยเลย ว่างๆ ตี้กันไหม`,
  anime: (l) => `โอ๊ย ${l} คือดีมาก คุยเรื่องนี้ได้ทั้งคืนเลยนะ`,
  music: (l) => `${l} ช่วงนี้ฟังวนอยู่เลย เดี๋ยวส่งเพลงที่ชอบให้ฟังนะ`,
  film: (l) => `${l} เรื่องไหนดีบอกหน่อย กำลังหาอะไรดูพอดี`,
  food: (l) => `${l}! พูดแล้วหิวเลย ร้านไหนเด็ดบอกหน่อยนะ`,
  outdoor: (l) => `${l}สนุกมาก ไว้ชวนกันไปบ้างนะ`,
  lang: (l) => `ฝึก${l}ด้วยกันไหม ช่วยกันคนละนิดก็ได้`,
  study: (l) => `${l}ด้วยกันคืนนี้ไหม มีเพื่อนนั่งด้วยแล้วไม่ขี้เกียจ`,
  pet: () => `ทาสเหมือนกันเลย! ขอดูรูปน้องหน่อยสิ`,
  art: (l) => `${l}เหรอ อยากเห็นผลงานจัง ส่งมาอวดได้นะ`,
  book: (l) => `${l}เล่มไหนดี ป้ายยาหน่อย กำลังหาเล่มใหม่อยู่`,
  life: (l) => `เรื่อง${l}นี่เข้าใจเลย เล่าต่อสิ`,
}

const RULES: [RegExp, string[]][] = [
  [/เหนื่อย|เครียด|เศร้า|ท้อ|ไม่ไหว|แย่|tired|stress|sad|exhausted/i, ['กอดๆ นะ วันนี้เหนื่อยมาเยอะเลยสินะ อยากเล่าให้ฟังไหม ฟังอยู่ตรงนี้นะ', 'ไม่เป็นไรเลยนะที่รู้สึกแบบนี้ พักก่อนได้ เราคุยกันช้าๆ ก็ได้']],
  [/สวัสดี|หวัดดี|ดีจ้า|ดีค่ะ|ดีครับ|โมชิ|hello|hi\b/i, ['หวัดดีๆ ดีใจที่ทักมานะ วันนี้เป็นไงบ้าง', 'โมชิโมชิ~ รับสายแล้วจ้า วันนี้ทำอะไรมาบ้าง']],
  [/555|ฮา|ขำ|lol|haha/i, ['555 ขำตามเลย', 'ฮ่าๆ เข้าใจฟีลมาก']],
  [/ขอบคุณ|ขอบใจ|thank/i, ['ยินดีเสมอนะ', 'ไม่เป็นไรเลย คุยด้วยแล้วสบายใจดี']],
  [/ไว้คุย|ไปก่อน|ฝันดี|นอน|talk again|good ?night|bye/i, ['ได้เลย ไว้คุยกันใหม่นะ ฝันดี~', 'โอเค พักผ่อนเยอะๆ นะ พรุ่งนี้มาเล่าต่อ']],
  [/ไหม|มั้ย|\?/, ['ได้สิ! ว่างช่วงหัวค่ำเลย', 'ไปๆ น่าสนุก ตกลงตามนี้เลย', 'อืมม ขอคิดแป๊บ แต่ฟังดูดีมากเลยนะ']],
]

const FALLBACK = [
  'จริงด้วย เห็นด้วยมากเลย',
  'เล่าต่ออีกสิ อยากฟัง',
  'ฮ่าๆ คลื่นตรงกันจริงด้วย',
  'ชอบที่เล่าแบบนี้นะ ฟังแล้วอบอุ่นดี',
]

function tagReply(tags: Tag[]): string | undefined {
  const t = tags[0]
  return t ? BY_CATEGORY[t.category](tagLabelTh(t.id)) : undefined
}

/** Choose a reply to what we just sent. `turn` rotates the pools so replies don't repeat. */
export function pickReply(text: string, them: User, shared: SharedTag[], turn: number): string {
  // something we both like came up → talk about it
  const mentioned = tagsInText(text)
    .filter((id) => them.tags.includes(id))
    .map((id) => TAG_BY_ID[id])
    .filter(Boolean)
  const fromTag = tagReply(mentioned)
  if (fromTag) return fromTag
  for (const [re, pool] of RULES) if (re.test(text)) return pool[turn % pool.length]
  if (shared.length && turn % 2 === 1) {
    const s = shared[Math.floor(turn / 2) % shared.length].tag
    return `ว่าแต่ชอบ ${tagLabelTh(s.id)} ตั้งแต่ตอนไหนเหรอ อยากรู้`
  }
  return FALLBACK[turn % FALLBACK.length]
}

/** First line after they "pick up" a moshi. */
export function pickupLine(them: User, shared: SharedTag[]): string {
  const s = shared[0]?.tag
  return s ? `โมชิโมชิ~ ขอบคุณที่ทักมานะ เห็นว่าชอบ ${tagLabelTh(s.id)} เหมือนกัน ดีใจจัง` : `โมชิโมชิ~ ขอบคุณที่ทักมานะ ${them.name}เองจ้า`
}

/** Did we write about something we both like? (they'll react "เหมือนกัน!") */
export function mentionsShared(text: string, shared: SharedTag[]): boolean {
  const ids = new Set(shared.map((s) => s.tag.id))
  return tagsInText(text).some((id) => ids.has(id))
}
