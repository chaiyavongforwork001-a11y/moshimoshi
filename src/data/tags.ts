import type { Prompt, Tag, TagCategory } from '@/lib/types'

export const CATEGORY_LABEL: Record<TagCategory, string> = {
  game: 'เกม',
  anime: 'อนิเมะ & การ์ตูน',
  music: 'ดนตรี',
  film: 'หนัง & ซีรีส์',
  food: 'ของกิน & คาเฟ่',
  outdoor: 'ออกไปข้างนอก',
  lang: 'ภาษา',
  study: 'เรียน & ทำงาน',
  pet: 'สัตว์เลี้ยง',
  art: 'ศิลปะ & งานทำมือ',
  book: 'หนังสือ',
  life: 'ชีวิตประจำวัน',
}

export const TAGS: Tag[] = [
  // game
  { id: 'valorant', label: 'Valorant', category: 'game', aliases: ['วาโล', 'valo', 'วาโลแรนท์'] },
  { id: 'rov', label: 'ROV', category: 'game', aliases: ['โรฟ', 'rov'] },
  { id: 'genshin', label: 'Genshin Impact', category: 'game', aliases: ['เก็นชิน', 'genshin'] },
  { id: 'minecraft', label: 'Minecraft', category: 'game', aliases: ['มายคราฟ', 'มายคราฟต์'] },
  { id: 'hollowknight', label: 'Hollow Knight', category: 'game', aliases: ['hollow knight', 'ฮอลโลว์ไนท์'] },
  { id: 'cozygame', label: 'เกมชิลๆ', category: 'game', aliases: ['stardew', 'animal crossing', 'เกมชิล'] },
  { id: 'boardgame', label: 'บอร์ดเกม', category: 'game', aliases: ['บอร์ดเกม', 'board game'] },
  { id: 'pokemon', label: 'Pokémon', category: 'game', aliases: ['โปเกมอน', 'pokemon'] },
  // anime
  { id: 'frieren', label: 'Frieren', category: 'anime', aliases: ['ฟรีเรน', 'frieren'] },
  { id: 'onepiece', label: 'One Piece', category: 'anime', aliases: ['วันพีช', 'one piece'] },
  { id: 'ghibli', label: 'Ghibli', category: 'anime', aliases: ['จิบลิ', 'ghibli'] },
  { id: 'jjk', label: 'Jujutsu Kaisen', category: 'anime', aliases: ['มหาเวทย์ผนึกมาร', 'jjk'] },
  { id: 'manga', label: 'มังงะ', category: 'anime', aliases: ['มังงะ', 'manga'] },
  { id: 'lightnovel', label: 'ไลท์โนเวล', category: 'anime', aliases: ['ไลท์โนเวล', 'light novel'] },
  { id: 'cosplay', label: 'คอสเพลย์', category: 'anime', aliases: ['คอส', 'cosplay'] },
  { id: 'vtuber', label: 'VTuber', category: 'anime', aliases: ['วีทูปเบอร์', 'vtuber'] },
  // music
  { id: 'tpop', label: 'T-pop', category: 'music', aliases: ['ทีป็อป', 't-pop'] },
  { id: 'kpop', label: 'K-pop', category: 'music', aliases: ['เคป็อป', 'k-pop', 'ติ่งเกา'] },
  { id: 'indie', label: 'เพลงอินดี้', category: 'music', aliases: ['อินดี้', 'indie'] },
  { id: 'jpop', label: 'J-pop', category: 'music', aliases: ['เจป็อป', 'j-pop'] },
  { id: 'concert', label: 'ไปคอนเสิร์ต', category: 'music', aliases: ['คอน', 'คอนเสิร์ต', 'เฟส'] },
  { id: 'guitar', label: 'กีตาร์', category: 'music', aliases: ['กีตาร์', 'guitar'] },
  // film
  { id: 'kdrama', label: 'ซีรีส์เกาหลี', category: 'film', aliases: ['ซีรีส์เกา', 'k-drama'] },
  { id: 'thaiseries', label: 'ซีรีส์ไทย', category: 'film', aliases: ['ซีรีส์ไทย', 'ละคร'] },
  { id: 'horror', label: 'หนังผี', category: 'film', aliases: ['หนังผี', 'horror'] },
  { id: 'marvel', label: 'Marvel', category: 'film', aliases: ['มาร์เวล', 'marvel'] },
  { id: 'netflix', label: 'Netflix', category: 'film', aliases: ['เน็ตฟลิกซ์', 'netflix'] },
  // food
  { id: 'cafe', label: 'คาเฟ่', category: 'food', aliases: ['คาเฟ่', 'cafe', 'สายคาเฟ่'] },
  { id: 'streetfood', label: 'สตรีทฟู้ด', category: 'food', aliases: ['ของกินข้างทาง', 'สตรีทฟู้ด'] },
  { id: 'baking', label: 'ทำขนม', category: 'food', aliases: ['ทำขนม', 'อบขนม', 'baking'] },
  { id: 'cooking', label: 'ทำอาหาร', category: 'food', aliases: ['ทำอาหาร', 'cooking'] },
  { id: 'mookata', label: 'หมูกระทะ', category: 'food', aliases: ['หมูกระทะ'] },
  // outdoor
  { id: 'hiking', label: 'เดินป่า ขึ้นดอย', category: 'outdoor', aliases: ['เดินป่า', 'ขึ้นดอย', 'hiking'] },
  { id: 'running', label: 'วิ่ง', category: 'outdoor', aliases: ['วิ่ง', 'running'] },
  { id: 'camping', label: 'แคมป์ปิ้ง', category: 'outdoor', aliases: ['แคมป์', 'camping'] },
  { id: 'photography', label: 'ถ่ายรูป', category: 'outdoor', aliases: ['ถ่ายรูป', 'กล้องฟิล์ม', 'photo'] },
  { id: 'travel', label: 'เที่ยว', category: 'outdoor', aliases: ['เที่ยว', 'travel'] },
  // lang
  { id: 'japanese', label: 'ภาษาญี่ปุ่น', category: 'lang', aliases: ['ญี่ปุ่น', 'ญุ่น', 'japanese', '日本語'] },
  { id: 'english', label: 'ภาษาอังกฤษ', category: 'lang', aliases: ['อังกฤษ', 'english'] },
  { id: 'korean', label: 'ภาษาเกาหลี', category: 'lang', aliases: ['เกาหลี', 'korean'] },
  { id: 'thai', label: 'ภาษาไทย', category: 'lang', aliases: ['ภาษาไทย', 'タイ語'] },
  // study / work
  { id: 'cowork', label: 'นั่งทำงานด้วยกัน', category: 'study', aliases: ['นั่งทำงาน', 'co-working', 'pomodoro'] },
  { id: 'toeic', label: 'ติว TOEIC', category: 'study', aliases: ['toeic', 'โทอิค'] },
  { id: 'coding', label: 'เขียนโค้ด', category: 'study', aliases: ['โค้ด', 'coding', 'dev'] },
  { id: 'design', label: 'งานดีไซน์', category: 'study', aliases: ['ดีไซน์', 'design', 'figma'] },
  { id: 'firstjob', label: 'มนุษย์เงินเดือนมือใหม่', category: 'study', aliases: ['first jobber', 'เด็กจบใหม่'] },
  // pet
  { id: 'cat', label: 'ทาสแมว', category: 'pet', aliases: ['แมว', 'ทาสแมว', 'cat'] },
  { id: 'dog', label: 'ทาสหมา', category: 'pet', aliases: ['หมา', 'น้องหมา', 'dog'] },
  // art
  { id: 'drawing', label: 'วาดรูป', category: 'art', aliases: ['วาดรูป', 'drawing', 'digital art'] },
  { id: 'crochet', label: 'ถักไหมพรม', category: 'art', aliases: ['ถักไหมพรม', 'crochet'] },
  { id: 'journaling', label: 'จดบันทึก', category: 'art', aliases: ['journal', 'จดบันทึก', 'bullet journal'] },
  // book
  { id: 'mystery', label: 'นิยายสืบสวน', category: 'book', aliases: ['นิยายสืบสวน', 'ฮิงาชิโนะ', 'mystery'] },
  { id: 'selfhelp', label: 'หนังสือพัฒนาตัวเอง', category: 'book', aliases: ['how to', 'พัฒนาตัวเอง'] },
  { id: 'fantasy', label: 'แฟนตาซี', category: 'book', aliases: ['แฟนตาซี', 'fantasy'] },
  // life
  { id: 'movedbkk', label: 'เพิ่งย้ายมากรุงเทพฯ', category: 'life', aliases: ['ย้ายมากรุงเทพ', 'ย้ายเมือง'] },
  { id: 'nightowl', label: 'นอนดึก', category: 'life', aliases: ['นอนดึก', 'night owl'] },
  { id: 'astrology', label: 'สายมู', category: 'life', aliases: ['สายมู', 'ดูดวง', 'ไพ่ทาโรต์'] },
  { id: 'plants', label: 'ปลูกต้นไม้', category: 'life', aliases: ['ต้นไม้', 'plant'] },
  { id: 'listening', label: 'ชอบรับฟัง', category: 'life', aliases: ['รับฟัง', 'ปรึกษา', 'listener'] },
]

export const TAG_BY_ID: Record<string, Tag> = Object.fromEntries(TAGS.map((t) => [t.id, t]))

export const PROMPTS: Prompt[] = [
  { id: 'hooked', label: 'ช่วงนี้ฉันกำลังติด…', example: 'Frieren กับเกม Stardew จนนอนดึกทุกคืน' },
  { id: 'weekend', label: 'วันหยุดในอุดมคติของฉันคือ…', example: 'ตื่นสาย ไปคาเฟ่ใหม่ แล้วกลับมาเล่นเกมกับเพื่อน' },
  { id: 'allnight', label: 'เรื่องที่ฉันคุยได้ทั้งคืนคือ…', example: 'ทฤษฎีวันพีช กับหนังผีญี่ปุ่น' },
  { id: 'recommend', label: 'ของที่อยากป้ายยาให้ทุกคนคือ…', example: 'ร้านข้าวมันไก่หลังออฟฟิศ อร่อยมาก' },
  { id: 'queue', label: 'ของกินที่ฉันยอมต่อคิวคือ…', example: 'โทสต์เนยโสดร้านดังย่านอารีย์' },
  { id: 'invite', label: 'ชวนฉันไป… แล้วฉันไปแน่นอน', example: 'บอร์ดเกมคาเฟ่ หรือคอนเสิร์ตอินดี้' },
]

export const PROMPT_BY_ID: Record<string, Prompt> = Object.fromEntries(PROMPTS.map((p) => [p.id, p]))

export const CHAT_STYLES = ['คุยเก่ง', 'ฟังเก่ง', 'ตอบไว', 'ตอบช้าแต่ตอบนะ', 'พิมพ์ยาว', 'สายสติกเกอร์', 'คุยเสียงได้']

export const ONLINE_LABEL: Record<string, string> = {
  morning: 'ช่วงเช้า',
  afternoon: 'ช่วงบ่าย',
  evening: 'หัวค่ำ',
  late: 'ดึกๆ',
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
    if (needle.length >= 2 && lower.includes(needle)) found.add(id)
  }
  return [...found]
}
