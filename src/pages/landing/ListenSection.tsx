import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Ban, CameraOff, Check, EyeOff, Flag, Hand, MessagesSquare, Send, ShieldCheck, UserRoundPlus, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { Avatar, Chip, RoomIcon, type MochiFace } from '@/components/ui'
import { ROOM_BY_ID, USER_BY_ID } from '@/data/mock'
import { MOCHI } from '@/lib/colors'
import { fadeUp, pop, spring, stagger } from '@/lib/motion'
import type { MochiColor, Mood } from '@/lib/types'
import { Drifter, TiltCard } from './fx'
import { KineticTitle } from './kinetic'
import { SectionIntro, Squiggle, Tape, Twinkle, softGradient } from './shared'

export function ListenSection() {
  return (
    <section id="safe" aria-labelledby="safe-title" className="relative scroll-mt-24 px-4 py-20 outline-none sm:px-6 lg:py-32">
      <div className="relative mx-auto max-w-6xl">
        <Drifter distance={90} rotate={-16} className="absolute -top-2 right-[4%] hidden md:block">
          <Twinkle className="size-12" color="var(--color-pink)" />
        </Drifter>
        <Drifter distance={60} rotate={10} className="absolute top-28 right-[18%] hidden lg:block">
          <Squiggle className="w-20" color="var(--color-mint)" />
        </Drifter>
        <SectionIntro id="safe-title" eyebrow="อุ่นใจ" icon={<MessagesSquare size={15} />} tone="bg-pink/60" title="มีคนรับฟังเสมอ">
          บางวันก็แค่อยากเล่าให้ใครสักคนฟัง ที่นี่มีมุมให้เล่า มีเพื่อนที่พร้อมฟัง และมีพี่โมชิคอยดูแลให้ทุกคนรู้สึกปลอดภัย
        </SectionIntro>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
          <ListenCorner />
          <div className="grid gap-6 lg:gap-8">
            <MoodCheckIn />
            <HostCard />
          </div>
        </div>

        <div className="mt-20 text-center">
          <KineticTitle as="h3" text="สัญญาเล็กๆ เพื่อความอุ่นใจ" className="text-[1.75rem] font-bold sm:text-4xl" />
          <p className="mt-2 text-ink-soft">ปลอดภัยตั้งแต่วิธีเจอกัน ไม่ต้องรอให้มีเรื่องก่อน</p>
        </div>
        <motion.ul
          variants={stagger(0.12)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6"
        >
          {PROMISES.map((p) => (
            <motion.li key={p.title} variants={fadeUp}>
              <PromiseCard promise={p} />
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- listening corner
function ChatLine({ color, name, text, host, face = 'smile' }: { color: MochiColor; name: string; text: string; host?: boolean; face?: MochiFace }) {
  return (
    <motion.li variants={fadeUp} className="flex items-end gap-2.5">
      <Avatar color={color} size={36} face={face} ring={host} />
      <span className="max-w-[82%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm shadow-[0_4px_14px_-8px_rgb(201_92_64/0.35)]">
        <span className="mb-0.5 block text-[11px] font-semibold text-ink-soft">{name}</span>
        {text}
      </span>
    </motion.li>
  )
}

function ListenCorner() {
  const room = ROOM_BY_ID['listen']
  const host = USER_BY_ID[room?.hostIds[0] ?? '']
  if (!room) return null
  return (
    <TiltCard rotate={-0.8} className="h-full" radius="rounded-[2rem]">
      <Tape color="pink" className="-top-3 left-12 -rotate-6" />
      <article className="h-full rounded-[2rem] border border-white p-6 shadow-[var(--shadow-lift)] sm:p-8" style={{ backgroundImage: softGradient('peach', 165) }}>
        <div className="flex items-center gap-3">
          <RoomIcon room={room} size={58} />
          <div>
            <h3 className="text-2xl font-semibold">{room.name}</h3>
            <p className="flex items-center gap-1.5 text-sm text-ink-soft">
              <span className="size-2 rounded-full bg-success" aria-hidden />
              {room.onlineCount} คนนั่งฟังกันอยู่
            </p>
          </div>
        </div>
        <p className="mt-3 text-ink-soft">{room.vibe}</p>

        <motion.ul
          variants={stagger(0.45, 0.2)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="mt-6 space-y-3"
          aria-label="ตัวอย่างบทสนทนาในมุมเล่าให้ฟัง"
        >
          <ChatLine color="sky" name="ไอซ์" face="sleepy" text="วันนี้งานหนักมาก แต่ไม่รู้จะเล่าให้ใครฟังดี" />
          <ChatLine color={host?.color ?? 'peach'} host name={`พี่${host?.name ?? 'โมชิ'} · พี่โมชิ`} text="เล่าให้ฟังได้เลยนะ ไม่ต้องรีบ เราอยู่ตรงนี้" />
          <ChatLine color="mint" name="แพรวา" face="happy" text="เหมือนกันเลย วันนี้เราก็เหนื่อย มานั่งพักด้วยกันนะ" />
          <motion.li variants={pop} className="flex pl-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-[var(--shadow-soft)]">
              เหมือนกัน!
              <span className="flex -space-x-1.5" aria-hidden>
                <Avatar color="pink" size={16} />
                <Avatar color="butter" size={16} />
                <Avatar color="lavender" size={16} />
              </span>
              <span className="text-ink-soft">5 คน</span>
            </span>
          </motion.li>
        </motion.ul>
      </article>
    </TiltCard>
  )
}

// ---------------------------------------------------------------- "how was your day?"
const MOODS: { key: Mood; label: string; color: MochiColor; reply: string; face: MochiFace }[] = [
  { key: 'happy', label: 'สดใส', color: 'butter', face: 'happy', reply: 'ดีใจด้วยน้า~ วันนี้มีเรื่องอะไรดีๆ เล่าให้ฟังหน่อยสิ' },
  { key: 'chill', label: 'ชิลๆ', color: 'mint', face: 'smile', reply: 'ชิลแบบนี้แหละดีที่สุด แวะไปนั่งเล่นในห้องนั่งเล่นกันไหม' },
  { key: 'tired', label: 'เหนื่อยหน่อย', color: 'sky', face: 'smile', reply: 'เหนื่อยมาทั้งวันเลยเนอะ พักก่อนนะ มุมเล่าให้ฟังเปิดรออยู่เสมอ' },
  { key: 'lonely', label: 'เหงานิดๆ', color: 'lavender', face: 'happy', reply: 'ไม่เป็นไรเลยนะ คืนนี้มีเพื่อนออนไลน์อยู่หลายคน ไปทักกันไหม' },
  { key: 'excited', label: 'ตื่นเต้น', color: 'pink', face: 'wow', reply: 'อะไรน้า~ อยากรู้ด้วย! เล่าให้ฟังทีสิ' },
]

function TypingDots() {
  const reduce = useReducedMotion()
  return (
    <span className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md bg-white px-3.5 py-3 shadow-[var(--shadow-soft)]" aria-label="น้องโมชิกำลังพิมพ์">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-ink-soft"
          animate={reduce ? undefined : { y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

function MoodCheckIn() {
  const reduce = useReducedMotion()
  const [mood, setMood] = useState<Mood | null>(null)
  const [typing, setTyping] = useState(false)
  const m = MOODS.find((x) => x.key === mood)

  // a short "typing…" pause so the reply feels like someone answering
  useEffect(() => {
    if (!mood) return
    setTyping(true)
    const t = setTimeout(() => setTyping(false), reduce ? 0 : 850)
    return () => clearTimeout(t)
  }, [mood, reduce])

  return (
    <article className="relative rounded-[2rem] border border-white p-5 shadow-[var(--shadow-soft)] sm:p-6" style={{ backgroundImage: softGradient('butter', 170) }}>
      <div className="flex items-start gap-3">
        <motion.span key={typing ? 'talk' : (m?.face ?? 'smile')} initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={spring.bouncy}>
          <Avatar color="peach" size={52} face={typing ? 'talk' : (m?.face ?? 'smile')} ring label="น้องโมชิ" />
        </motion.span>
        <div className="rounded-2xl rounded-tl-md bg-white px-4 py-2.5 shadow-[var(--shadow-soft)]">
          <p className="text-[11px] font-semibold text-ink-soft">น้องโมชิ</p>
          <h3 className="text-lg font-semibold">โมชิโมชิ~ วันนี้เป็นไงบ้าง?</h3>
        </div>
      </div>
      <div role="group" aria-label="เลือกความรู้สึกวันนี้" className="mt-4 flex flex-wrap gap-2">
        {MOODS.map((x) => (
          <Chip key={x.key} size="lg" color={x.color} selected={mood === x.key} onClick={() => setMood(x.key)}>
            {x.label}
          </Chip>
        ))}
      </div>
      <div className="mt-4 min-h-[4.75rem]" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {!m ? (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-ink-soft">
              <Hand size={16} aria-hidden />
              แตะเลือกได้เลย ไม่มีคำตอบไหนผิด
            </motion.p>
          ) : typing ? (
            <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pl-1">
              <TypingDots />
            </motion.div>
          ) : (
            <motion.p
              key={m.key}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={spring.bouncy}
              className="inline-block rounded-2xl rounded-tl-md bg-white px-4 py-3 text-[15px] text-ink shadow-[var(--shadow-soft)]"
            >
              {m.reply}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------- hosts
function HostCard() {
  const hosts = ['u-plaifon', 'u-tonkhao', 'u-boss', 'u-mint'].map((id) => USER_BY_ID[id]).filter(Boolean)
  const points: [LucideIcon, string][] = [
    [UserRoundPlus, 'ทักคนมาใหม่ ไม่ปล่อยให้ใครเคว้ง'],
    [MessagesSquare, 'จัดรอบคุยประจำทุกสัปดาห์'],
    [EyeOff, 'ไม่เห็นแชทส่วนตัวของใคร'],
  ]
  return (
    <article className="card relative p-5 sm:p-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <span className="flex -space-x-3">
          {hosts.map((h, i) => (
            <motion.span
              key={h.id}
              className="rounded-full bg-white ring-2 ring-white"
              initial={{ y: 12, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ ...spring.bouncy, delay: i * 0.08 }}
            >
              <Avatar color={h.color} size={46} ring face={i % 2 ? 'happy' : 'smile'} />
            </motion.span>
          ))}
        </span>
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">พี่โมชิ คอยดูแลทุกห้อง</h3>
          <p className="text-sm text-ink-soft">อาสาที่ทีมเลือกมา ใจดีและพร้อมช่วย</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {points.map(([Icon, text]) => (
          <li key={text} className="flex items-center gap-3 rounded-2xl bg-cream px-3 py-2.5 text-[15px]">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-butter/60" aria-hidden>
              <Icon size={16} strokeWidth={2.4} />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </article>
  )
}

// ---------------------------------------------------------------- safety promises
function AvatarIllo() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <span className="absolute top-1/2 left-1/2 flex h-16 w-14 translate-x-1 -translate-y-[60%] rotate-12 items-center justify-center rounded-xl border-2 border-dashed border-ink/20 bg-white/70">
        <CameraOff size={22} className="text-ink-soft" aria-hidden />
      </span>
      <span className="relative -translate-x-6">
        <Avatar color="pink" size={70} face="wink" />
      </span>
    </div>
  )
}

function ConsentIllo() {
  return (
    <div className="flex h-full items-center justify-center gap-2">
      <Avatar color="peach" size={44} face="happy" />
      <span className="flex flex-col items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold shadow-[var(--shadow-soft)]">
          <Send size={11} aria-hidden /> ส่งโมชิ
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-[11px] font-semibold text-ink shadow-[var(--shadow-soft)]">
          <Check size={11} strokeWidth={3} aria-hidden /> ตอบรับแล้ว
        </span>
      </span>
      <Avatar color="sky" size={44} face="smile" />
    </div>
  )
}

function BlockIllo() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <span className="w-40 rounded-2xl bg-white p-1.5 text-[13px] shadow-[var(--shadow-soft)]">
        <span className="flex items-center gap-2 rounded-xl px-2.5 py-1.5">
          <Ban size={15} aria-hidden /> บล็อก
        </span>
        <span className="flex items-center gap-2 rounded-xl bg-lavender/30 px-2.5 py-1.5">
          <Flag size={15} aria-hidden /> รายงาน
        </span>
      </span>
      <span className="absolute top-2 right-[calc(50%-5.5rem)] inline-flex size-10 rotate-12 items-center justify-center rounded-full bg-lavender shadow-[var(--shadow-puffy)]">
        <ShieldCheck size={20} className="text-ink" aria-hidden />
      </span>
    </div>
  )
}

interface SafetyPromise {
  title: string
  body: string
  color: MochiColor
  rotate: number
  Illo: ComponentType
}

const PROMISES: SafetyPromise[] = [
  {
    title: 'อวาตาร์แทนรูปจริง',
    body: 'ไม่ต้องโชว์หน้า ใช้น้องโมชิเป็นตัวแทนเรา รูปจริงค่อยแชร์เมื่อสนิทใจกันแล้ว',
    color: 'pink',
    rotate: -2,
    Illo: AvatarIllo,
  },
  {
    title: 'ยินยอมทั้งสองฝ่ายก่อนแชท',
    body: 'ส่งโมชิไปทักก่อน อีกฝ่ายตอบรับเมื่อไหร่ถึงเริ่มแชทกันได้ ไม่มีใครทักเข้ามาเองได้',
    color: 'mint',
    rotate: 1.5,
    Illo: ConsentIllo,
  },
  {
    title: 'บล็อก/รายงานได้ทุกที่',
    body: 'ไม่สบายใจตรงไหน กดบล็อกหรือรายงานได้ทันที ทุกห้อง ทุกแชท ทุกโปรไฟล์',
    color: 'lavender',
    rotate: -1,
    Illo: BlockIllo,
  },
]

function PromiseCard({ promise }: { promise: SafetyPromise }) {
  const p = MOCHI[promise.color]
  return (
    <TiltCard rotate={promise.rotate} className="h-full">
      <Tape color={promise.color} className="-top-3 left-1/2 -translate-x-1/2 -rotate-3" />
      <article className="h-full rounded-[1.75rem] border border-white bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="h-36 rounded-[1.25rem]" style={{ background: `radial-gradient(circle at 30% 25%, white, ${p.light} 55%, ${p.base})` }}>
          <promise.Illo />
        </div>
        <h4 className="mt-4 px-1 text-xl font-semibold">{promise.title}</h4>
        <p className="mt-1 px-1 pb-1 text-[15px] text-ink-soft">{promise.body}</p>
      </article>
    </TiltCard>
  )
}
