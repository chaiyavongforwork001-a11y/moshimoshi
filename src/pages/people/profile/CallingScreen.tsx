import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, MessageCircle, PhoneCall } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Avatar, Button, ButtonLink, SignalMeter } from '@/components/ui'
import { CallScene, View3D } from '@/components/three'
import { MOCHI } from '@/lib/colors'
import { L, loc, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { SignalLevel, User } from '@/lib/types'
import { Rings } from './Rings'

// kept to the top band: the canvas draws behind the DOM, so these pills would hide the mochi
interface Floater {
  text: string
  x: string
  y: string
  delay: number
}

const FLOATERS: Floater[] = [
  loc<Floater>({ text: L('โมชิ~', 'Moshi~'), x: '4%', y: '7%', delay: 0.3 }),
  loc<Floater>({ text: L('โมชิโมชิ!', 'Moshi moshi!'), x: '27%', y: '0%', delay: 1.1 }),
  loc<Floater>({ text: L('ริ๊งๆ', 'Ring ring!'), x: '55%', y: '8%', delay: 1.9 }),
]

/** Success moment after sending a moshi: their mochi picks up a ringing call. */
export function CallingScreen({ user, chatId, opener, onBack }: { user: User; chatId: string; opener: string; onBack: () => void }) {
  const reduce = useReducedMotion()
  const meColor = useMoshi((s) => s.me.color)
  const heading = useRef<HTMLHeadingElement>(null)
  const [bars, setBars] = useState<SignalLevel>(5)
  const p = MOCHI[user.color]

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])

  // "dialling" — signal bars sweep up while we wait
  useEffect(() => {
    if (reduce) return
    const timer = setInterval(() => setBars((b) => ((b % 5) + 1) as SignalLevel), 420)
    return () => clearInterval(timer)
  }, [reduce])

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={spring.soft}
      className="flex flex-col items-center pt-2 pb-6 text-center"
    >
      <div className="relative w-full max-w-md">
        <Rings color={p.shade} size={230} speed={1.8} count={3} />
        <View3D className="h-72 w-full sm:h-80" label={t(`น้องโมชิของเรากำลังโทรหา${user.name}`, `Your little Mochi is calling ${user.name}`)}>
          <CallScene fromColor={meColor} toColor={user.color} toText="..." />
        </View3D>
        {!reduce &&
          FLOATERS.map((f) => (
            <motion.span
              key={f.text}
              aria-hidden
              className="absolute rounded-full bg-white/90 px-3 py-1 font-display text-sm font-semibold text-ink shadow-[var(--shadow-soft)]"
              style={{ left: f.x, top: f.y }}
              initial={{ opacity: 0, y: 10, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: [10, 0, -8, -18], scale: [0.6, 1, 1, 0.9] }}
              transition={{ duration: 2.6, delay: f.delay, repeat: Infinity, repeatDelay: 1.2 }}
            >
              {f.text}
            </motion.span>
          ))}
        <span className="absolute top-6 right-[14%] flex size-14 animate-wiggle items-center justify-center rounded-full bg-coral text-ink shadow-[var(--shadow-puffy)] ring-4 ring-cream">
          <PhoneCall size={24} strokeWidth={2.4} aria-hidden />
        </span>
      </div>

      <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-sm font-semibold text-ink shadow-[var(--shadow-soft)]" aria-hidden>
        <SignalMeter level={bars} size="sm" showLabel={false} />
        {t(`กำลังต่อสายหา${user.name}…`, `Ringing ${user.name}…`)}
      </p>

      <h2 ref={heading} tabIndex={-1} className="mt-4 font-display text-[1.75rem] font-semibold outline-none sm:text-3xl">
        {t('ส่งโมชิแล้ว! รอเขารับสายนะ', 'Moshi sent! Waiting for them to pick up')}
      </h2>
      <p className="mt-2 max-w-sm text-ink-soft">
        {t(
          `${user.name}จะเห็นโปรไฟล์กับประโยคเปิดของเรา ถ้าเขากดรับเมื่อไหร่ ก็คุยกันต่อในแชทได้เลย`,
          `${user.name} will see your profile and opener. The moment they pick up, you two can keep talking in the chat.`,
        )}
      </p>

      <motion.figure
        initial={{ opacity: 0, y: 14, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...spring.bouncy, delay: 0.25 }}
        className="mt-5 flex max-w-sm items-end gap-2 self-center"
      >
        <blockquote className="rounded-3xl rounded-br-md bg-peach/70 px-4 py-2.5 text-left text-[15px] text-ink shadow-[var(--shadow-soft)]">{opener}</blockquote>
        <Avatar color={meColor} size={34} face="happy" />
        <figcaption className="sr-only">{t('ประโยคเปิดที่เราส่ง', 'The opener you sent')}</figcaption>
      </motion.figure>

      <div className="mt-7 flex w-full max-w-xs flex-col gap-2">
        <ButtonLink to={`/app/chats/${chatId}`} size="lg" block icon={<MessageCircle size={20} aria-hidden />}>
          {t('เปิดแชท', 'Open chat')}
        </ButtonLink>
        <Button variant="ghost" block onClick={onBack} icon={<ArrowLeft size={18} aria-hidden />}>
          {t('กลับไปที่โปรไฟล์', 'Back to profile')}
        </Button>
      </div>
    </motion.section>
  )
}
