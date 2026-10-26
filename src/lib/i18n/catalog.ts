import type { DailyQuestion, Room, Session } from '@/lib/types'
import { getLang, known } from './index'

/*
 * English for server catalog rows (rooms, sessions, daily questions). The
 * database keeps one Thai copy; the app swaps in English by room id or by the
 * exact seeded text. Rooms or questions added later without an entry stay Thai.
 */

const ROOMS_EN: Record<string, Pick<Room, 'name' | 'tagline' | 'vibe'>> = {
  lobby: {
    name: 'The Lounge',
    tagline: 'Drop in, hang out, say hi to someone new',
    vibe: "Everyone's room. You don't need to know anyone to pull up a seat, and there's a fresh question to answer every day.",
  },
  'game-night': {
    name: 'Late-Night Gaming',
    tagline: 'Find a squad or a duo. Chill games, no toxicity',
    vibe: "Can't sleep? Come play. Valorant, ROV, Genshin or something cozy, there's always someone around.",
  },
  anime: {
    name: 'Anime & Manga',
    tagline: 'What are you watching this season? Recommend away',
    vibe: 'Anime, manga, light novels and cosplay. Spoiler warnings first, please!',
  },
  'moved-bkk': {
    name: 'New to Bangkok',
    tagline: 'New city, new friends, new places to eat',
    vibe: 'For anyone who just moved here to study or work. Share hidden spots, the way home, and a little encouragement.',
  },
  listen: {
    name: 'The Listening Corner',
    tagline: 'Talk about your day, ask for advice, or just be heard',
    vibe: "No need to have it all together or have the answers. Wanting to share is enough, and our Mochi hosts keep it warm and safe.",
  },
  cowork: {
    name: 'Cowork Together',
    tagline: 'Start the timer. Work quietly, never alone',
    vibe: '25-minute Pomodoros, chatting only on breaks. Perfect if you like company but not a lot of talking.',
  },
  lang: {
    name: 'Language Swap: Thai ⇄ 日本語',
    tagline: 'Teach Thai, learn Japanese. Mistakes welcome, laughs too',
    vibe: 'Practice with native speakers, no judgment. Voice chat once a week.',
  },
  music: {
    name: 'Music & Concerts',
    tagline: 'Find concert buddies, swap playlists',
    vibe: 'T-pop, K-pop, indie or festivals. No more going to gigs alone.',
  },
}

export function roomInLang(room: Room): Room {
  const en = getLang() === 'en' && Object.hasOwn(ROOMS_EN, room.id) ? ROOMS_EN[room.id] : undefined
  return en ? { ...room, ...en } : room
}

export function sessionInLang(session: Session): Session {
  return getLang() === 'en' ? { ...session, title: known(session.title) } : session
}

export function questionInLang(question: DailyQuestion): DailyQuestion {
  return getLang() === 'en' ? { ...question, text: known(question.text) } : question
}
