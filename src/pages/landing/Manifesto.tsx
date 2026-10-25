import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { ArrowDown, PhoneCall } from 'lucide-react'
import { Fragment, useRef } from 'react'
import { Avatar } from '@/components/ui'
import { useIsDesktop } from '@/lib/hooks'
import { thaiWords } from './kinetic'
import { Twinkle } from './shared'

type Sticker = 'mochi' | 'tags' | 'call'
type Word = { word: string; unit: number }
// a phrase (text between spaces) never breaks inside, so lines end on natural pauses
type Token = { phrase: Word[] } | { sticker: Sticker; unit: number }

const PARTS: ({ text: string } | { sticker: Sticker })[] = [
  { text: 'ที่นี่ไม่ต้องรีบ ไม่ต้องเก่ง' },
  { sticker: 'mochi' },
  { text: 'ไม่ต้องใช้รูปจริง แค่มีเรื่องที่ชอบสักเรื่อง' },
  { sticker: 'tags' },
  { text: 'ก็มีเพื่อนคุยด้วยแล้ว' },
  { sticker: 'call' },
]
const FULL_TEXT = 'ที่นี่ไม่ต้องรีบ ไม่ต้องเก่ง ไม่ต้องใช้รูปจริง แค่มีเรื่องที่ชอบสักเรื่อง ก็มีเพื่อนคุยด้วยแล้ว'

// every word and sticker is one "unit" that lights up in reading order
const TOKENS: Token[] = []
let units = 0
for (const p of PARTS) {
  if ('sticker' in p) TOKENS.push({ sticker: p.sticker, unit: units++ })
  else for (const phrase of p.text.split(' ')) TOKENS.push({ phrase: thaiWords(phrase).map((w) => ({ word: w, unit: units++ })) })
}
const END = 0.82
const range = (u: number): [number, number] => [(u / units) * END, ((u + 1.6) / units) * END]

function ScrubWord({ word, unit, progress }: { word: string; unit: number; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, range(unit), [0.14, 1])
  return <motion.span style={{ opacity }}>{word}</motion.span>
}

function StickerArt({ kind, size }: { kind: Sticker; size: number }) {
  if (kind === 'mochi')
    return (
      <span className="inline-flex items-center rounded-full bg-peach/45 p-1 pr-3 shadow-[var(--shadow-soft)]">
        <Avatar color="peach" size={size} face="happy" />
        <Avatar color="lavender" size={size * 0.8} face="wink" className="-ml-3" />
      </span>
    )
  if (kind === 'tags')
    return (
      <span className="inline-flex -rotate-3 flex-col gap-1 rounded-[1.1rem] bg-white p-1.5 text-[0.32em] leading-none font-semibold shadow-[var(--shadow-soft)]">
        <span className="rounded-full bg-lavender/60 px-2.5 py-1">เกมดึก</span>
        <span className="ml-3 rounded-full bg-pink/60 px-2.5 py-1">อนิเมะ</span>
        <span className="rounded-full bg-mint/70 px-2.5 py-1">คาเฟ่</span>
      </span>
    )
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-coral shadow-[var(--shadow-puffy)]" style={{ width: size * 1.1, height: size * 1.1 }}>
      <PhoneCall size={size * 0.5} strokeWidth={2.4} className="animate-wiggle text-ink" />
    </span>
  )
}

function ScrubSticker({ kind, unit, progress, size }: { kind: Sticker; unit: number; progress: MotionValue<number>; size: number }) {
  const [a, b] = range(unit)
  const scale = useTransform(progress, [a, b], [0.3, 1])
  const opacity = useTransform(progress, [a, a + (b - a) * 0.4], [0, 1])
  const rotate = useTransform(progress, [a, b], [-24, kind === 'tags' ? 4 : -6])
  return (
    <motion.span aria-hidden style={{ scale, opacity, rotate }} className="mx-2 inline-block align-middle">
      <StickerArt kind={kind} size={size} />
    </motion.span>
  )
}

/**
 * A calm, DOM-only breather between the hero and the 3D story. The words
 * light up as you scroll. It is taller than any screen, so the hero's and
 * the story's 3D views are never on screen at the same time.
 */
export function Manifesto() {
  const reduce = !!useReducedMotion()
  const desktop = useIsDesktop()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.6', 'end end'] })
  const hintOpacity = useTransform(scrollYProgress, [END - 0.05, END + 0.08], [0, 1])
  const size = desktop ? 58 : 40

  const text = (
    <p style={{ textWrap: 'wrap' }} className="mx-auto max-w-5xl text-center font-display text-[1.9rem] leading-[1.55] font-bold tracking-tight text-ink sm:text-5xl sm:leading-[1.45] lg:text-[clamp(2.9rem,4.5vw,4.5rem)] lg:leading-[1.4]">
      <span className="sr-only">{FULL_TEXT}</span>
      <span aria-hidden>
        {TOKENS.map((t, i) =>
          'sticker' in t ? (
            reduce ? (
              <span key={i} className="mx-2 inline-block align-middle">
                <StickerArt kind={t.sticker} size={size} />
              </span>
            ) : (
              <ScrubSticker key={i} kind={t.sticker} unit={t.unit} progress={scrollYProgress} size={size} />
            )
          ) : (
            <Fragment key={i}>
              <span className="whitespace-nowrap">
                {t.phrase.map((w) => (reduce ? w.word : <ScrubWord key={w.unit} word={w.word} unit={w.unit} progress={scrollYProgress} />))}
              </span>{' '}
            </Fragment>
          ),
        )}
      </span>
    </p>
  )

  return (
    <section id="manifesto" ref={ref} aria-label="ที่นี่เป็นแบบไหน" className={`relative outline-none ${reduce ? 'flex min-h-[110lvh] items-center py-24' : 'h-[190vh]'}`}>
      <div className={reduce ? 'w-full px-5' : 'sticky top-0 flex h-[100svh] flex-col items-center justify-center px-5 sm:px-8'}>
        <p className="mb-6 flex items-center justify-center gap-2 font-display text-sm font-semibold text-ink-soft sm:text-base">
          <Twinkle className="size-4" color="var(--color-coral)" />
          โมชิโมชิ~ ที่นี่เป็นแบบนี้นะ
          <Twinkle className="size-4" />
        </p>
        {text}
        <motion.p style={{ opacity: reduce ? 1 : hintOpacity }} className="mt-10 flex items-center justify-center gap-2 text-sm font-semibold text-ink-soft sm:text-base">
          เลื่อนต่อ เดี๋ยวพาไปดูว่าเจอเพื่อนกันยังไง
          <ArrowDown size={16} className={reduce ? '' : 'animate-bounce'} aria-hidden />
        </motion.p>
      </div>
    </section>
  )
}
