/*
 * English for Thai values that live in data (database rows, seed, demo data)
 * rather than in the UI code. Used by known() in './index'. Keys are the exact
 * Thai text; anything not listed here passes through unchanged.
 */

const PROVINCES: Record<string, string> = {
  กรุงเทพฯ: 'Bangkok',
  กรุงเทพมหานคร: 'Bangkok',
  นนทบุรี: 'Nonthaburi',
  ปทุมธานี: 'Pathum Thani',
  สมุทรปราการ: 'Samut Prakan',
  นครปฐม: 'Nakhon Pathom',
  ชลบุรี: 'Chonburi',
  ระยอง: 'Rayong',
  เชียงใหม่: 'Chiang Mai',
  เชียงราย: 'Chiang Rai',
  ขอนแก่น: 'Khon Kaen',
  อุดรธานี: 'Udon Thani',
  นครราชสีมา: 'Nakhon Ratchasima',
  อุบลราชธานี: 'Ubon Ratchathani',
  พิษณุโลก: 'Phitsanulok',
  ภูเก็ต: 'Phuket',
  สงขลา: 'Songkhla',
  สุราษฎร์ธานี: 'Surat Thani',
}

/** profiles.chat_style values (CHAT_STYLES in data/tags) */
const CHAT_STYLES: Record<string, string> = {
  คุยเก่ง: 'Chatty',
  ฟังเก่ง: 'Good listener',
  ตอบไว: 'Quick replies',
  ตอบช้าแต่ตอบนะ: 'Slow replies, but I do reply',
  พิมพ์ยาว: 'Long texts',
  สายสติกเกอร์: 'Sticker lover',
  คุยเสียงได้: 'Up for voice chat',
}

/** rooms' weekly sessions (supabase/seed.sql + demo data) */
const SESSIONS: Record<string, string> = {
  'Pomodoro คืนวันธรรมดา': 'Weeknight Pomodoro',
  'ซีซันนี้ดูอะไร ทิ้งอะไร': 'This season: what we kept, what we dropped',
  'วันนี้เหนื่อยไหม เล่าให้ฟังหน่อย': 'Long day? Tell us about it',
  'Valo ดึกชิลๆ ไม่ toxic': 'Late-night chill Valo, no toxicity',
  'ร้านลับใกล้ที่ทำงาน': 'Hidden food spots near the office',
  'คุยเสียง ไทย ⇄ ญี่ปุ่น': 'Voice chat: Thai ⇄ Japanese',
  'แชร์เพลย์ลิสต์ประจำสัปดาห์': "This week's playlist swap",
}

/** the daily question pool (supabase/seed.sql + demo data) */
const QUESTIONS: Record<string, string> = {
  'ของที่คิดถึงจากบ้านเกิดที่สุดคืออะไร?': 'What do you miss most from your hometown?',
  'คอนเสิร์ตที่อยากไปที่สุดในชีวิตคือของใคร?': 'Whose concert would you most love to see in your lifetime?',
  'คำญี่ปุ่นคำแรกที่จำได้คือคำว่าอะไร?': "What's the first Japanese word you ever learned?",
  'คำไทยคำไหนที่อยากสอนเพื่อนต่างชาติที่สุด?': 'Which Thai word would you most like to teach a friend from abroad?',
  'ฉากไหนในอนิเมะที่ดูกี่รอบก็ยังน้ำตาซึม?': 'Which anime scene still makes you teary, however many times you watch it?',
  'ช่วงนี้กำลังตั้งตารออะไรอยู่?': 'What are you looking forward to these days?',
  'ช่วงนี้มีเรื่องไหนที่อยากให้มีคนบอกว่า "เก่งแล้วนะ"?': 'Is there something lately you wish someone would say "you did great" about?',
  'ช่วงพักห้านาทีชอบทำอะไร?': 'What do you like to do on a five-minute break?',
  'ตอนย้ายมาใหม่ๆ อะไรที่ทำให้งงที่สุด?': 'When you first moved here, what confused you the most?',
  'ตัวละครที่ถ้ามีจริงอยากเป็นเพื่อนด้วยที่สุดคือใคร?': 'Which character would you most want as a real-life friend?',
  'ตำแหน่งหรือสายที่ชอบเล่นที่สุดคืออะไร?': "What's your favorite role or playstyle?",
  'ถ้าต้องขายเรื่องที่ชอบให้เพื่อนที่ไม่ดูอนิเมะใน 1 ประโยค จะพูดว่าอะไร?': "Pitch your favorite series to a friend who doesn't watch anime, in one sentence.",
  'ถ้าต้องเลือกเพลงประจำตัวหนึ่งเพลง จะเลือกเพลงไหน?': 'If you had one theme song, which would it be?',
  'ถ้าต้องเล่นเกมเดียวไปตลอดปี จะเลือกเกมอะไร?': 'If you could only play one game for a whole year, which would it be?',
  'ถ้าพรุ่งนี้ได้หยุดหนึ่งวันแบบไม่มีใครตามงาน จะทำอะไรเป็นอย่างแรก?': 'A day off tomorrow and nobody chasing you about work: what do you do first?',
  'ถ้าเขียนจดหมายถึงตัวเองเมื่อปีที่แล้วได้ จะบอกว่าอะไร?': 'If you could write to yourself from a year ago, what would you say?',
  'ถ้าให้เลือกไปทะเลหรือภูเขาตอนนี้ จะเลือกอะไร เพราะอะไร?': 'Beach or mountains right now? Why?',
  'ฝึกภาษาวันละนิดด้วยวิธีไหนอยู่บ้าง?': 'How do you practice a little language every day?',
  'มังงะเรื่องไหนที่อยากให้ทำเป็นอนิเมะที่สุด?': 'Which manga do you most want to see as an anime?',
  'มีคำชมไหนที่ได้ยินแล้วจำได้จนถึงวันนี้บ้าง?': 'Is there a compliment you still remember to this day?',
  'มุมสงบในเมืองที่ชอบไปนั่งพักใจอยู่ที่ไหน?': 'Where is your quiet corner of the city to unwind?',
  'ร้านข้าวร้านแรกที่ทำให้รู้สึกว่า "อยู่ที่นี่ได้"?': 'What was the first place to eat that made you feel "I can live here"?',
  'วันนี้มีเรื่องไหนที่อยากเล่าให้ใครสักคนฟังไหม?': "Is there anything from today you'd like to tell someone?",
  'วันนี้อยากทำอะไรให้เสร็จสักหนึ่งอย่าง?': "What's one thing you'd like to get done today?",
  'อะไรเล็กๆ ที่ทำให้วันนี้ดีขึ้นนิดนึง?': "What's one small thing that made today a little better?",
  'เกมที่อยากให้เพื่อนลองเล่นที่สุดตอนนี้คือเกมไหน?': 'Which game do you most want your friends to try right now?',
  'เกมแรกที่ทำให้ติดเกมคือเกมอะไร?': 'What was the first game that got you hooked?',
  'เคยพูดผิดแล้วขำจนลืมไม่ลงบ้างไหม เล่าหน่อย': 'Ever mixed up a word and laughed so hard you never forgot it? Tell us!',
  'เคล็ดลับเริ่มงานตอนขี้เกียจของเราคืออะไร?': "What's your trick for getting started when you feel lazy?",
  'เพลงที่ฟังแล้วนึกถึงช่วงมัธยมคือเพลงอะไร?': 'Which song takes you straight back to high school?',
  'เพลงที่เปิดฟังบ่อยที่สุดช่วงนี้คือเพลงอะไร?': 'Which song have you played the most lately?',
  'เพลงที่เพิ่งค้นพบแล้ววนฟังทั้งสัปดาห์คือเพลงอะไร?': 'Which song did you just discover and loop all week?',
  'เพลงประกอบเกมที่ฟังแล้วขนลุกทุกครั้งคือเพลงไหน?': 'Which game soundtrack gives you goosebumps every time?',
  'เพลงหรือเสียงแบบไหนที่ช่วยให้โฟกัสได้ดีที่สุด?': 'What music or sounds help you focus best?',
  'เพลงเปิดอนิเมะที่ไม่เคยกดข้ามเลยคือเพลงไหน?': 'Which anime opening do you never skip?',
  'เมนูที่กินกี่ครั้งก็ไม่เบื่อคืออะไร?': 'Which dish could you eat again and again without getting bored?',
  'เรื่องเล็กๆ ที่ภูมิใจในตัวเองสัปดาห์นี้คืออะไร?': "What's a small thing you're proud of this week?",
  'เวลาเหนื่อยๆ อะไรช่วยให้ใจฟูขึ้นได้บ้าง?': "When you're worn out, what lifts your spirits?",
  'เส้นทางกลับบ้านที่ชอบที่สุดเป็นแบบไหน?': "What's your favorite way home like?",
}

/** fixed labels written by the app itself (time, defaults, system lines) */
const LABELS: Record<string, string> = {
  ออนไลน์อยู่: 'Online now',
  เมื่อกี้: 'Just now',
  เมื่อวาน: 'Yesterday',
  สักพักแล้ว: 'A while ago',
  นานแล้ว: 'Ages ago',
  คืนนี้: 'Tonight',
  สุดสัปดาห์นี้: 'This weekend',
  'เสาร์–อาทิตย์ เช้า': 'Weekend mornings',
  เพื่อนใหม่: 'New friend',
  'ส่งโมชิแล้ว! รอเขาตอบรับนะ': 'Moshi sent! Waiting for them to pick up',
  // chat lines the database writes (respond_moshi, staff removal) and report context
  'ตอบรับโมชิแล้ว เริ่มคุยกันได้เลย!': 'Moshi accepted! Start chatting',
  'แชทนี้ปิดแล้ว ไม่เป็นไรนะ ยังมีเพื่อนอีกหลายคนในห้องให้ทักทาย': "This chat is closed. That's okay, there are lots more friends in the rooms to say hi to",
  '[ข้อความนี้ถูกลบโดยทีมงาน]': '[This message was removed by the team]',
  แชทส่วนตัว: 'Private chat',
}

/** reports.reason values (SafetyMenu REPORT_REASONS) */
const REPORT_REASONS: Record<string, string> = {
  'สแปม หรือโฆษณา': 'Spam or ads',
  'หลอกลวง หรือชวนลงทุน': 'Scam or investment pitch',
  'คุกคาม หรือพูดไม่สุภาพ': 'Harassment or rude talk',
  'ปลอมตัวเป็นคนอื่น': 'Pretending to be someone else',
  อย่างอื่น: 'Something else',
}

/** Own keys only: these maps are looked up with text people typed ('__proto__' must not find Object.prototype). */
const own = (map: Record<string, string>, key: string): string | undefined => (Object.hasOwn(map, key) ? map[key] : undefined)

const EXACT: Record<string, string> = { ...PROVINCES, ...CHAT_STYLES, ...SESSIONS, ...QUESTIONS, ...LABELS, ...REPORT_REASONS }

const MONTHS: Record<string, string> = {
  'ม.ค.': 'Jan',
  'ก.พ.': 'Feb',
  'มี.ค.': 'Mar',
  'เม.ย.': 'Apr',
  'พ.ค.': 'May',
  'มิ.ย.': 'Jun',
  'ก.ค.': 'Jul',
  'ส.ค.': 'Aug',
  'ก.ย.': 'Sep',
  'ต.ค.': 'Oct',
  'พ.ย.': 'Nov',
  'ธ.ค.': 'Dec',
}

/** short (th-TH weekday: 'short') and long weekday names */
const WEEKDAYS: Record<string, string> = {
  'อา.': 'Sun',
  'จ.': 'Mon',
  'อ.': 'Tue',
  'พ.': 'Wed',
  'พฤ.': 'Thu',
  'ศ.': 'Fri',
  'ส.': 'Sat',
  อาทิตย์: 'Sunday',
  จันทร์: 'Monday',
  อังคาร: 'Tuesday',
  พุธ: 'Wednesday',
  พฤหัส: 'Thursday',
  พฤหัสบดี: 'Thursday',
  ศุกร์: 'Friday',
  เสาร์: 'Saturday',
}

const LANGUAGES: Record<string, string> = {
  ไทย: 'Thai',
  ภาษาไทย: 'Thai',
  อังกฤษ: 'English',
  ภาษาอังกฤษ: 'English',
  ญี่ปุ่น: 'Japanese',
  ภาษาญี่ปุ่น: 'Japanese',
  เกาหลี: 'Korean',
  ภาษาเกาหลี: 'Korean',
  จีน: 'Chinese',
  ภาษาจีน: 'Chinese',
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const AGO: [RegExp, (n: number) => string][] = [
  [/^(\d+) นาทีที่แล้ว$/, (n) => `${plural(n, 'min', 'mins')} ago`],
  [/^(\d+) ชั่วโมงที่แล้ว$/, (n) => `${plural(n, 'hour', 'hours')} ago`],
  [/^(\d+) วันที่แล้ว$/, (n) => `${plural(n, 'day', 'days')} ago`],
  [/^(\d+) สัปดาห์ที่แล้ว$/, (n) => `${plural(n, 'week', 'weeks')} ago`],
]

const TIME = String.raw`(\d{1,2}[:.]\d{2})`
const MONTH = Object.keys(MONTHS)
  .map((m) => m.replaceAll('.', '\\.'))
  .join('|')
const WEEKDAY = Object.keys(WEEKDAYS)
  .sort((a, b) => b.length - a.length)
  .map((w) => w.replaceAll('.', '\\.'))
  .join('|')

/** "ส. 2 พ.ย.", "2 พ.ย.", "ส. 2 พ.ย. 14:00" (whenLabelOf / messageTime) */
const DATE = new RegExp(`^(?:(${WEEKDAY}) )?(\\d{1,2}) (${MONTH})(?: (\\d{4}))?(?: ${TIME})?$`)
/** "คืนนี้ 21:30", "เสาร์นี้ 18:00" */
const THIS = new RegExp(`^(?:คืนนี้|(${WEEKDAY})นี้) ?${TIME}?$`)

/**
 * Room welcome lines (private.post_welcome in the migrations, demo data):
 * "ยินดีต้อนรับ ไอซ์ (มาครั้งแรก) มาทักทายกันหน่อยนะ" or "… ไอซ์บอกว่า "…" ใครอยากทักทายบ้าง?"
 */
const WELCOME = /^ยินดีต้อนรับ (.+?) \(มาครั้ง(?:แรก|ที่ (\d+))\) (?:มาทักทายกันหน่อยนะ|(.+?)บอกว่า "([\s\S]*)" (.+))$/
const WELCOME_ASK: Record<string, string> = {
  'ใครอยากทักทายบ้าง?': 'Who wants to say hi?',
  'ใครดูอยู่บ้าง?': 'Who else is watching?',
}

function welcome(value: string): string | undefined {
  const m = WELCOME.exec(value)
  if (!m) return undefined
  const [, who, visit, , hook, ask] = m
  const head = `Welcome, ${who}! (${visit ? `visit #${visit}` : 'first visit'})`
  if (hook === undefined) return `${head} Come say hi`
  return `${head} ${who} says "${hook}" ${own(WELCOME_ASK, ask) ?? ask}`
}

function language(value: string): string | undefined {
  const m = /^(\S+?)(?: ?(นิดหน่อย|N\d))?$/.exec(value)
  const name = m && own(LANGUAGES, m[1])
  if (!name) return undefined
  if (!m[2]) return name
  return m[2] === 'นิดหน่อย' ? `${name} (a little)` : `${name} ${m[2]}`
}

export function knownEnglish(value: string): string | undefined {
  const text = value.trim()
  const exact = own(EXACT, text)
  if (exact) return exact
  for (const [re, fmt] of AGO) {
    const m = re.exec(text)
    if (m) return fmt(Number(m[1]))
  }
  const d = DATE.exec(text)
  if (d) {
    const [, wd, day, month, year, time] = d
    return [wd && WEEKDAYS[wd], day, MONTHS[month], year, time].filter(Boolean).join(' ')
  }
  const th = THIS.exec(text)
  if (th) {
    const [, weekday, time] = th
    const when = weekday ? `This ${WEEKDAYS[weekday]}` : 'Tonight'
    return time ? `${when} ${time}` : when
  }
  return welcome(text) ?? language(text)
}
