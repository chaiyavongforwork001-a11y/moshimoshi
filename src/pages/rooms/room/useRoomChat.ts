// Room chat = history (server rows live, seeded lines in demo) + what happened
// here since. Demo mode also fakes friendly replies from members; live mode
// just sends, and real replies arrive through realtime.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDataMode, usePeople, useRoomMessages } from '@/data/hooks'
import { TAG_BY_ID, tagsInText } from '@/data/tags'
import { useMoshi } from '@/lib/store'
import type { ChatMessage, Room, User } from '@/lib/types'
import { useIsMine } from '@/pages/people/lib'
import { roomMembers } from '../roomData'

const EMPTY: ChatMessage[] = []

const GREETING_REPLIES = [
  'สวัสดีจ้า! ดีใจที่ทักมานะ วันนี้เป็นยังไงบ้าง',
  'หวัดดี~ ยินดีที่ได้รู้จักนะ นั่งคุยด้วยกันได้เลย',
  'สวัสดีๆ มาพอดีเลย กำลังคุยกันสนุกอยู่',
]
const THANKS_REPLIES = ['ขอบคุณน้า ดีใจที่มีคนทักเลย ตอนแรกแอบเขิน', 'ขอบคุณที่ต้อนรับนะ รู้สึกอุ่นใจขึ้นเยอะเลย']
const GENERIC_REPLIES = ['เห็นด้วยเลย! เล่าต่ออีกนิดสิ', 'ฮ่าๆ เข้าใจเลย เคยเป็นเหมือนกัน', 'ชอบที่เล่าให้ฟังนะ แวะมาคุยบ่อยๆ ได้เลย']
const ROOM_REPLIES: Record<string, string[]> = {
  lobby: ['ยินดีต้อนรับนะ ทำตัวตามสบายเลย', 'วันนี้มีเรื่องดีๆ เล็กๆ เกิดขึ้นบ้างไหม'],
  'game-night': ['คืนนี้ว่างไหม มาเข้าตี้ด้วยกันสิ', 'ปกติเล่นตำแหน่งไหน เดี๋ยวช่วยหาตี้ให้'],
  anime: ['ซีซันนี้ดูเรื่องไหนอยู่บ้าง ป้ายยาหน่อย', 'เรื่องนี้ดีมาก! ฉากไหนชอบที่สุด'],
  'moved-bkk': ['ย้ายมาอยู่แถวไหนเอ่ย เดี๋ยวแนะนำร้านอร่อยให้', 'ช่วงแรกเหงาหน่อย เดี๋ยวก็ชิน มีพวกเราอยู่ตรงนี้นะ'],
  listen: ['ขอบคุณที่เล่าให้ฟังนะ ตรงนี้ปลอดภัย พิมพ์ได้เต็มที่เลย', 'ฟังอยู่นะ ไม่ต้องรีบ ค่อยๆ เล่าก็ได้'],
  cowork: ['วันนี้ทำอะไรอยู่ เป็นกำลังใจให้นะ', 'รอบหน้ามานั่งทำงานด้วยกันนะ จะได้ไม่เหงา'],
  lang: ['いいね! ฝึกด้วยกันนะ', 'พิมพ์ผิดไม่เป็นไรเลย ค่อยๆ ไปด้วยกัน'],
  music: ['ช่วงนี้ฟังเพลงอะไรอยู่ แชร์หน่อยสิ', 'ไปคอนด้วยกันไหม ไปเป็นแก๊งสนุกกว่า'],
}

const pick = <T,>(list: T[], n: number) => list[n % list.length]

function pickReplier(room: Room, people: User[], text: string, n: number, prefer?: string): User | undefined {
  const byId = (id: string) => people.find((u) => u.id === id)
  const preferred = prefer ? byId(prefer) : undefined
  if (preferred) return preferred
  const mention = text.match(/@(\S+)/)?.[1]
  const members = roomMembers(room.id, people)
  const named = mention ? (members.find((u) => u.name === mention) ?? people.find((u) => u.name === mention)) : undefined
  if (named) return named
  const online = members.filter((u) => u.isOnline)
  const pool = online.length ? online : members.length ? members : room.hostIds.map(byId).filter((u): u is User => !!u)
  return pool.length ? pick(pool, n) : undefined
}

function replyText(room: Room, text: string, replier: User, n: number, isThanks: boolean): string {
  if (isThanks) return pick(THANKS_REPLIES, n)
  if (/สวัสดี|หวัดดี|ดีจ้า|ฝากตัว|hello|\bhi\b/i.test(text)) return pick(GREETING_REPLIES, n)
  const tag = tagsInText(text).find((t) => replier.tags.includes(t))
  if (tag && TAG_BY_ID[tag]) return `ชอบ ${TAG_BY_ID[tag].label} เหมือนกันเลย! เดี๋ยวมาคุยกันยาวๆ นะ`
  return n % 3 === 2 ? pick(GENERIC_REPLIES, n) : pick(ROOM_REPLIES[room.id] ?? GENERIC_REPLIES, n)
}

export function useRoomChat(room: Room) {
  const demo = useDataMode() === 'demo'
  const people = usePeople()
  const isMine = useIsMine()
  const sendRoomMessage = useMoshi((s) => s.sendRoomMessage)
  const receiveRoomMessage = useMoshi((s) => s.receiveRoomMessage)
  const added = useMoshi((s) => s.roomMessages[room.id]) ?? EMPTY
  const messages = useRoomMessages(room.id)
  // my own lines only: a welcome card about me (live) isn't something I said
  const mine = useMemo(() => messages.filter((m) => m.kind !== 'welcome' && m.kind !== 'system' && isMine(m.userId)), [messages, isMine])
  const [typing, setTyping] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  const pending = useRef(0)
  const counter = useRef(0)

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    },
    [],
  )

  /** Send as me; `replyFrom` forces who answers (e.g. the newcomer I greeted). */
  const send = useCallback(
    (text: string, replyFrom?: string, isThanks = false) => {
      sendRoomMessage(room.id, text)
      if (!demo) return
      const n = counter.current++
      const replier = pickReplier(room, people, text, n, replyFrom)
      if (!replier) return
      const typeAt = 500 + Math.random() * 500
      const replyAt = 1500 + Math.random() * 1500
      pending.current++
      timers.current.push(
        window.setTimeout(() => setTyping(replier.id), typeAt),
        window.setTimeout(() => {
          pending.current--
          receiveRoomMessage(room.id, replier.id, replyText(room, text, replier, n, isThanks))
          if (pending.current === 0) setTyping(null)
        }, replyAt),
      )
    },
    [room, people, demo, sendRoomMessage, receiveRoomMessage],
  )

  // "seeded" = the room already had a conversation before anything happened here
  return { messages, mine, typing, send, seeded: messages.length > added.length }
}
