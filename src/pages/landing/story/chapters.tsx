import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Ear, HeartHandshake, PhoneCall, PhoneIncoming, Play, Radio, DoorOpen, UsersRound, type LucideIcon } from 'lucide-react'
import { Avatar, ButtonLink, ReasonIcon, RoomIcon, SignalMeter } from '@/components/ui'
import { ROOM_BY_ID } from '@/data/mock'
import { L, loc, t } from '@/lib/i18n'
import { roomInLang } from '@/lib/i18n/catalog'
import type { StoryChapter } from '@/lib/scrollStory'
import type { MochiColor } from '@/lib/types'
import { Magnetic } from '../fx'
import { useTryCta } from '../shared'

export interface Chapter {
  key: StoryChapter
  /** short name for the progress cord */
  label: string
  eyebrow: string
  title: string
  line: string
  color: MochiColor
  Icon: LucideIcon
}

// English titles glue words with \u00A0 where a line break would leave an orphan (KineticTitle breaks only at plain spaces)
export const CHAPTERS: Chapter[] = [
  loc<Chapter>({
    key: 'hero',
    label: L('สวัสดี', 'Hello'),
    eyebrow: L('กริ๊งงง~ สายเข้า', 'Ring ring~ incoming call'),
    title: L('โมชิโมชิ~ ได้ยินไหม', 'Moshi\u00A0moshi~ you\u00A0there?'),
    line: L('ทุกมิตรภาพเริ่มจากคำทักเล็กๆ มาดูกันว่าที่นี่เจอเพื่อนกันยังไง', "Every friendship starts with a tiny hello. Let's see how friends find each other here."),
    color: 'peach',
    Icon: PhoneIncoming,
  }),
  loc<Chapter>({
    key: 'rooms',
    label: L('ห้องที่ชอบ', 'Rooms'),
    eyebrow: L('ขั้นแรก', 'Step one'),
    title: L('เข้าห้องที่ชอบ', 'Find your room'),
    line: L(
      'เกมดึก อนิเมะ คาเฟ่ หรือแค่อยากนั่งเล่น มีห้องรออยู่ทุกคืน ไม่ต้องรู้จักใครก่อน',
      "Late-night games, anime, cafés or just hanging out. There's a room waiting every night, no intros needed.",
    ),
    color: 'butter',
    Icon: DoorOpen,
  }),
  loc<Chapter>({
    key: 'signal',
    label: L('สัญญาณ', 'Signal'),
    eyebrow: L('เจอคนคลื่นเดียวกัน', 'Find your wavelength'),
    title: L('สัญญาณถูกคอ', 'Vibe signal'),
    line: L('ยิ่งขีดเยอะ ยิ่งน่าจะคุยกันถูกคอ บอกเหตุผลทุกครั้ง ไม่มีใครถูกตัดสิน', "More bars, better odds you'll click. We always show you why, and nobody gets judged."),
    color: 'lavender',
    Icon: Radio,
  }),
  loc<Chapter>({
    key: 'circle',
    label: L('วงเล็กๆ', 'Circles'),
    eyebrow: L('ค่อยๆ สนิทกัน', 'Getting closer'),
    title: L('วงเล็กๆ ที่อุ่นใจ', 'Small, cozy circles'),
    line: L('คุยกันสามถึงห้าคน มีพี่โมชิคอยดูแล คนเงียบๆ ก็มีที่ยืน', 'Three to five people, with a Mochi host looking out for everyone. Quiet folks belong here too.'),
    color: 'mint',
    Icon: UsersRound,
  }),
  loc<Chapter>({
    key: 'listen',
    label: L('รับฟัง', 'Listen'),
    eyebrow: L('วันที่เหนื่อยๆ', 'On rough days'),
    title: L('มีคนรับฟังเสมอ', 'Always all ears'),
    line: L('บางวันแค่อยากเล่า ไม่ต้องเก่ง ไม่ต้องมีคำตอบ ที่นี่มีคนพร้อมฟัง', 'Some days you just need to vent. No need to be strong or have answers. Someone here will listen.'),
    color: 'pink',
    Icon: Ear,
  }),
  loc<Chapter>({
    key: 'call',
    label: L('มาคุยกัน', "Let's talk"),
    eyebrow: L('ถึงตาเราแล้ว', 'Your turn'),
    title: L('โมชิโมชิ~ มาคุยกัน', "Moshi\u00A0moshi~ let's\u00A0talk"),
    line: L('เริ่มจากเรื่องที่ชอบสักเรื่อง ที่เหลือค่อยๆ เป็นไปเอง', 'Start with one thing you love. The rest will follow.'),
    color: 'sky',
    Icon: HeartHandshake,
  }),
]

const card = 'glass rounded-[1.5rem] p-3 text-left'

function IncomingCall() {
  const reduce = useReducedMotion()
  return (
    <div className={`${card} flex items-center gap-3 pr-4`}>
      <span className="relative">
        <Avatar color="lavender" size={46} face="wink" />
        {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-lavender/40" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-xs font-semibold text-ink-soft">{t('สายเข้าจาก', 'Incoming call from')}</span>
        <span className="block font-display text-base font-semibold">{t('เพื่อนใหม่ที่ชอบเรื่องเดียวกัน', 'A new friend who loves the same stuff')}</span>
      </span>
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-mint shadow-[var(--shadow-puffy)]" aria-hidden>
        <PhoneCall size={19} strokeWidth={2.5} className={reduce ? '' : 'animate-wiggle'} />
      </span>
    </div>
  )
}

function RoomList() {
  const rooms = ['game-night', 'anime', 'lobby']
    .map((id) => ROOM_BY_ID[id])
    .filter(Boolean)
    .map(roomInLang)
  return (
    <ul className={`${card} space-y-1.5`}>
      {rooms.map((r, i) => (
        <motion.li
          key={r.id}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.25 + i * 0.08 }}
          // phones keep the card short so it never climbs onto the 3D subjects
          className={`flex items-center gap-2.5 rounded-2xl bg-white/80 p-1.5 pr-3 ${i > 1 ? 'max-sm:hidden' : ''}`}
        >
          <RoomIcon room={r} size={34} />
          <span className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold">{r.name}</span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            {t(`${r.onlineCount} คน`, `${r.onlineCount} online`)}
          </span>
        </motion.li>
      ))}
    </ul>
  )
}

function SignalCard() {
  return (
    <div className={`${card} space-y-2 p-3.5`}>
      <div className="flex items-center gap-2">
        <Avatar color="peach" size={34} face="happy" />
        <Avatar color="lavender" size={34} face="happy" className="-ml-3" />
        <SignalMeter level={4} size="md" className="ml-1" />
      </div>
      <p className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-sm">
        <ReasonIcon kind="tag" />
        {t('ชอบ Frieren กับเกมชิลๆ เหมือนกัน', 'You both love Frieren and chill games')}
      </p>
    </div>
  )
}

const CIRCLE: MochiColor[] = ['mint', 'butter', 'pink', 'sky']
function CircleCard() {
  return (
    <div className={`${card} flex items-center gap-3 pr-4`}>
      <span className="flex -space-x-3">
        {CIRCLE.map((c, i) => (
          <span key={c} className="rounded-full ring-2 ring-white">
            <Avatar color={c} size={40} face={i === 0 ? 'happy' : i === 3 ? 'sleepy' : 'smile'} ring={i === 0} />
          </span>
        ))}
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-semibold">{t('วงเกมชิลๆ คืนนี้', 'Chill gaming circle tonight')}</span>
        <span className="block text-xs text-ink-soft">{t('4 คน · พี่มิ้นท์คอยดูแล', '4 people · a Mochi host on hand')}</span>
      </span>
    </div>
  )
}

function ListenCard() {
  const reduce = useReducedMotion()
  return (
    <div className={`${card} space-y-2`}>
      <p className="flex items-end gap-2">
        <Avatar color="sky" size={30} face="sleepy" />
        <span className="rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm">{t('วันนี้เหนื่อยจัง…', 'So tired today…')}</span>
      </p>
      <p className="flex items-end justify-end gap-2">
        <span className="rounded-2xl rounded-br-md bg-pink/60 px-3 py-2 text-sm">{t('เล่าให้ฟังได้เลยนะ เราอยู่ตรงนี้', "Tell me all about it, I'm right here")}</span>
        <Avatar color="peach" size={30} face="happy" ring />
      </p>
      <span className="ml-10 inline-flex gap-1 rounded-full bg-white px-3 py-2" aria-label={t('มีคนกำลังพิมพ์', 'Someone is typing')}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-ink-soft"
            animate={reduce ? undefined : { y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
    </div>
  )
}

function CallCta() {
  const tryCta = useTryCta()
  return (
    <div className="flex flex-wrap gap-3">
      <Magnetic>
        <ButtonLink to="/onboarding" size="lg" iconRight={<ArrowRight size={20} strokeWidth={2.6} />}>
          {t('เริ่มเลย', 'Jump in')}
        </ButtonLink>
      </Magnetic>
      <Magnetic>
        <ButtonLink to={tryCta.to} size="lg" variant="secondary" icon={<Play size={18} strokeWidth={2.6} />}>
          {tryCta.label}
        </ButtonLink>
      </Magnetic>
    </div>
  )
}

export function ChapterCard({ chapter }: { chapter: StoryChapter }) {
  switch (chapter) {
    case 'hero':
      return <IncomingCall />
    case 'rooms':
      return <RoomList />
    case 'signal':
      return <SignalCard />
    case 'circle':
      return <CircleCard />
    case 'listen':
      return <ListenCard />
    case 'call':
      return <CallCta />
  }
}
