import { motion, useReducedMotion } from 'motion/react'
import { House, PhoneCall, Plus, Radio, Sparkle } from 'lucide-react'
import { useMemo } from 'react'
import { MochiStage, View3D } from '@/components/three'
import { Button, ButtonLink } from '@/components/ui'
import { MOCHI } from '@/lib/colors'
import { signalMeta } from '@/lib/matching'
import { fadeUp, pop, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { Intent } from '@/lib/types'
import { useMatchesFor } from '@/pages/home/matches'
import { IntentCard } from './IntentCard'

const SPARKS = [
  { left: '6%', top: '18%', size: 22, color: MOCHI.butter.shade, delay: 0.2 },
  { left: '14%', top: '68%', size: 14, color: MOCHI.pink.shade, delay: 0.35 },
  { left: '86%', top: '22%', size: 18, color: MOCHI.mint.shade, delay: 0.28 },
  { left: '92%', top: '62%', size: 24, color: MOCHI.lavender.shade, delay: 0.45 },
]

/** After posting: the mascot cheers, the "signal" goes out, and the next step is one tap away. */
export function PostSuccess({ intent, onAgain }: { intent: Intent; onAgain: () => void }) {
  const me = useMoshi((s) => s.me)
  const reduce = useReducedMotion()
  const mine = useMemo(() => [intent], [intent])
  const strong = useMatchesFor(mine).filter((r) => r.level >= 3).length

  return (
    <motion.div variants={stagger(0.09)} initial="hidden" animate="show" className="mx-auto flex max-w-xl flex-col items-center pt-2 text-center">
      <div className="relative w-full">
        <View3D className="mx-auto h-56 w-full max-w-sm sm:h-64" label="น้องโมชิดีใจที่โพสต์สำเร็จ">
          <MochiStage color="peach" expression="happy" accessory="bow" zoom={0.95} />
        </View3D>
        {/* sparkles sit at the sides so they never cover the mascot */}
        {SPARKS.map((s, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute"
            style={{ left: s.left, top: s.top, color: s.color }}
            initial={{ scale: 0, rotate: -90, opacity: 0 }}
            animate={reduce ? { scale: 1, rotate: 0, opacity: 1 } : { scale: [0, 1.3, 1], rotate: 0, opacity: 1, y: [0, -6, 0] }}
            transition={reduce ? { duration: 0 } : { duration: 0.9, delay: s.delay, ease: 'easeOut' }}
          >
            <Sparkle size={s.size} fill="currentColor" strokeWidth={1.5} />
          </motion.span>
        ))}
      </div>

      {/* ringing phone badge = the signal going out */}
      <motion.span variants={pop} className="relative -mt-2 inline-flex size-14 items-center justify-center rounded-full bg-coral text-ink shadow-[var(--shadow-puffy)]" aria-hidden>
        {!reduce &&
          [0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border-2 border-coral"
              animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
            />
          ))}
        <motion.span animate={reduce ? undefined : { rotate: [0, -14, 14, -10, 10, 0] }} transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 1.4 }}>
          <PhoneCall size={24} strokeWidth={2.4} />
        </motion.span>
      </motion.span>

      <motion.h2 variants={pop} className="mt-4 font-display text-3xl font-semibold sm:text-4xl" role="status">
        โพสต์แล้ว! ส่งสัญญาณออกไปแล้วนะ
      </motion.h2>
      <motion.p variants={fadeUp} className="mt-2 max-w-md text-ink-soft">
        เพื่อนๆ ที่คลื่นตรงกันจะเห็นโพสต์นี้
        {strong > 0 ? ` ตอนนี้มี ${strong} คนที่สัญญาณ "${signalMeta(3).label}" ขึ้นไปรออยู่` : ' เดี๋ยวโมชิคอยดูให้นะ ถ้ามีใครตรงจะบอกทันที'}
      </motion.p>

      <motion.div variants={fadeUp} className="mt-5 w-full text-left">
        <IntentCard intent={intent} me={me} className="shadow-[var(--shadow-lift)]" />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <ButtonLink to="/app/people" size="lg" icon={<Radio size={20} />} className="sm:min-w-52">
          ดูคนที่ตรงกัน
        </ButtonLink>
        <ButtonLink to="/app" size="lg" variant="secondary" icon={<House size={20} />} className="sm:min-w-44">
          กลับหน้าแรก
        </ButtonLink>
      </motion.div>
      <motion.div variants={fadeUp} className="mt-2">
        <Button variant="ghost" icon={<Plus size={18} />} onClick={onAgain}>
          โพสต์อีกใบ
        </Button>
      </motion.div>
    </motion.div>
  )
}
