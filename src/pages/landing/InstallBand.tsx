import { motion, useReducedMotion, type MotionStyle } from 'motion/react'
import {
  BatteryFull,
  BellRing,
  DoorOpen,
  Download,
  Feather,
  MessageCircle,
  MoonStar,
  Plus,
  SignalHigh,
  Smartphone,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, Button, ButtonLink, RoomIcon, SignalMeter } from '@/components/ui'
import { ROOM_BY_ID } from '@/data/mock'
import { MOCHI } from '@/lib/colors'
import { spring } from '@/lib/motion'
import { Magnetic, useTilt } from './fx'
import { KineticTitle } from './kinetic'
import { Eyebrow, Squiggle, Twinkle } from './shared'

const BENEFITS: [LucideIcon, string, string][] = [
  [Zap, 'เปิดไว เต็มจอ', 'เหมือนแอปทั่วไป ไม่มีแถบเบราว์เซอร์'],
  [BellRing, 'ไม่พลาดรอบคุย', 'แจ้งเตือนเมื่อมีคนตอบหรือรอบคุยเริ่ม'],
  [Feather, 'เบาเครื่อง', 'ไม่ต้องโหลดจากสโตร์ ไม่กินพื้นที่'],
]

export function InstallBand({ onInstall }: { onInstall: () => void }) {
  const tilt = useTilt(6)
  return (
    <section id="install" aria-labelledby="install-title" className="relative scroll-mt-24 px-4 py-16 outline-none sm:px-6 lg:py-24">
      <div
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.onPointerLeave}
        className="grain relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/80 shadow-[var(--shadow-lift)]"
        style={{ backgroundImage: `linear-gradient(135deg, ${MOCHI.peach.light} 0%, ${MOCHI.butter.light} 52%, ${MOCHI.pink.light} 100%)` }}
      >
        {/* soft shapes for depth */}
        <span aria-hidden className="absolute -top-24 -right-16 size-80 rounded-full bg-white/50 blur-2xl" />
        <span aria-hidden className="absolute -bottom-28 left-1/3 size-72 rounded-full bg-peach/30 blur-3xl" />
        <Squiggle className="absolute top-8 right-[42%] hidden w-28 rotate-6 opacity-70 lg:block" />
        <Twinkle className="absolute top-12 left-[46%] hidden size-6 animate-float lg:block" />

        <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:p-14">
          <div>
            <Eyebrow icon={<Smartphone size={15} />} tone="bg-coral/50">
              แอปบนมือถือ
            </Eyebrow>
            <KineticTitle
              id="install-title"
              text="เก็บโมชิไว้บนหน้าจอโฮม"
              className="mt-4 text-[2.15rem] leading-[1.35] font-bold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.25]"
            />
            <p className="mt-3 text-base text-ink-soft sm:text-lg">ติดตั้งได้ในไม่กี่วินาที เปิดปุ๊บก็เจอเพื่อนๆ ทันที เหมือนมีเพื่อนอยู่ในกระเป๋า</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {BENEFITS.map(([Icon, title, body], i) => (
                <motion.li
                  key={title}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...spring.soft, delay: i * 0.08 }}
                  className="flex items-start gap-3 rounded-2xl bg-white/70 p-3"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[var(--shadow-soft)]" aria-hidden>
                    <Icon size={19} strokeWidth={2.3} />
                  </span>
                  <span className="leading-snug">
                    <span className="block font-display font-semibold">{title}</span>
                    <span className="text-sm text-ink-soft">{body}</span>
                  </span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic>
                <Button size="lg" icon={<Download size={20} />} onClick={onInstall}>
                  ติดตั้งแอป
                </Button>
              </Magnetic>
              <Magnetic>
                <ButtonLink to="/app" size="lg" variant="secondary">
                  เปิดในเบราว์เซอร์
                </ButtonLink>
              </Magnetic>
            </div>
          </div>

          <div className="relative flex justify-center py-2 lg:py-6">
            <PhoneMockup style={tilt.style} />
            <AppIconSticker />
          </div>
        </div>
      </div>
    </section>
  )
}

function AppIconSticker() {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.4, rotate: -30 }}
      whileInView={{ opacity: 1, scale: 1, rotate: -8 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ ...spring.bouncy, delay: 0.4 }}
      className="absolute bottom-6 left-0 z-10 sm:left-[8%] lg:-left-2"
      aria-hidden
    >
      <div className={`flex flex-col items-center gap-1 rounded-[1.4rem] bg-white/90 p-2.5 shadow-[var(--shadow-lift)] ${reduce ? '' : 'animate-float'}`}>
        <img src="/logo.svg" alt="" width={56} height={56} className="size-14 rounded-[1.1rem]" />
        <span className="text-[11px] font-semibold">moshimoshi</span>
      </div>
    </motion.div>
  )
}

function PhoneMockup({ style }: { style: MotionStyle }) {
  const reduce = useReducedMotion()
  const game = ROOM_BY_ID['game-night']
  const anime = ROOM_BY_ID['anime']
  return (
    <motion.div style={style} className="relative w-[244px] sm:w-[268px]" role="img" aria-label="ตัวอย่างหน้าแอป moshimoshi บนมือถือ มีคนคลื่นเดียวกันและห้องที่คุยกันอยู่">
      <motion.div animate={reduce ? undefined : { y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
        <div className="relative rounded-[2.6rem] bg-ink p-[9px] shadow-[0_40px_70px_-28px_rgb(59_38_34/0.55)]">
          <span className="absolute top-24 -left-[3px] h-10 w-[3px] rounded-l bg-ink" aria-hidden />
          <span className="absolute top-36 -left-[3px] h-14 w-[3px] rounded-l bg-ink" aria-hidden />
          <span className="absolute top-28 -right-[3px] h-16 w-[3px] rounded-r bg-ink" aria-hidden />
          <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.1rem] bg-cream text-ink" aria-hidden>
            <span className="absolute top-2 left-1/2 z-20 h-[22px] w-[82px] -translate-x-1/2 rounded-full bg-ink" />
            {/* slide-in notification */}
            <motion.div
              className="absolute inset-x-2.5 top-9 z-20 flex items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-[var(--shadow-soft)]"
              initial={reduce ? false : { y: -70, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ ...spring.bouncy, delay: 1 }}
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl bg-mint/60">
                <BellRing size={14} className="animate-wiggle" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[10px] font-semibold">รอบคุยห้องเกมดึกเริ่มแล้ว~</span>
                <span className="block truncate text-[9px] text-ink-soft">พี่บอสรออยู่นะ แวะมาเลย</span>
              </span>
            </motion.div>

            <div className="flex h-full flex-col px-3.5 pt-3">
              <div className="flex items-center justify-between px-2 text-[10px] font-semibold">
                <span>21:04</span>
                <span className="flex items-center gap-1">
                  <SignalHigh size={11} />
                  <Wifi size={11} />
                  <BatteryFull size={13} />
                </span>
              </div>

              <div className="mt-14 flex items-center gap-2">
                <Avatar color="peach" size={34} face="happy" />
                <span className="leading-tight">
                  <span className="block text-[10px] text-ink-soft">โมชิโมชิ~</span>
                  <span className="block font-display text-[15px] font-semibold">คืนนี้เป็นไงบ้าง?</span>
                </span>
              </div>
              <div className="mt-2 flex gap-1">
                {['สดใส', 'ชิลๆ', 'เหนื่อยหน่อย'].map((m, i) => (
                  <span key={m} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${i === 0 ? 'bg-butter' : 'bg-white'}`}>
                    {m}
                  </span>
                ))}
              </div>

              <p className="mt-3 text-[10px] font-semibold text-ink-soft">คนคลื่นเดียวกัน</p>
              <div className="mt-1 rounded-2xl bg-white p-2.5 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-2">
                  <Avatar color="lavender" size={30} online />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block font-display text-[12px] font-semibold">เจได</span>
                    <SignalMeter level={4} size="xs" short />
                  </span>
                </div>
                <div className="mt-1.5 flex gap-1">
                  <span className="rounded-full bg-lavender/35 px-1.5 text-[9px] font-semibold">Hollow Knight</span>
                  <span className="rounded-full bg-pink/35 px-1.5 text-[9px] font-semibold">Frieren</span>
                </div>
              </div>

              <p className="mt-3 text-[10px] font-semibold text-ink-soft">ห้องที่คุยกันอยู่</p>
              <div className="mt-1 space-y-1.5">
                {[game, anime].filter(Boolean).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-xl bg-white/80 p-1.5">
                    <RoomIcon room={r} size={26} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[11px] font-semibold">{r.name}</span>
                      <span className="block text-[9px] text-ink-soft">{r.onlineCount} คนกำลังคุย</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto mb-3 flex h-11 items-center justify-around rounded-2xl bg-white/95 shadow-[var(--shadow-soft)]">
                <MoonStar size={16} />
                <DoorOpen size={16} />
                <span className="-mt-5 inline-flex size-9 items-center justify-center rounded-full bg-coral shadow-[var(--shadow-puffy)] ring-2 ring-cream">
                  <Plus size={18} strokeWidth={2.8} />
                </span>
                <MessageCircle size={16} />
                <Avatar color="peach" size={18} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
