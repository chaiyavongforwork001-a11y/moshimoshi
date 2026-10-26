import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { ArrowDown, PhoneCall } from 'lucide-react'
import { Fragment, useRef } from 'react'
import { Avatar } from '@/components/ui'
import { useIsDesktop } from '@/lib/hooks'
import { getLang, L, t, tx, type Lang, type Txt } from '@/lib/i18n'
import { thaiWords } from './kinetic'
import { Twinkle } from './shared'

type Sticker = 'mochi' | 'tags' | 'call'
type Word = { word: string; unit: number }
// a phrase (text between spaces) never breaks inside, so lines end on natural pauses
type Token = { phrase: Word[] } | { sticker: Sticker; unit: number }

const PARTS: ({ text: Txt } | { sticker: Sticker })[] = [
  { text: L('ที่นี่ไม่ต้องรีบ ไม่ต้องเก่ง', 'No rush here. No need to be cool.') },
  { sticker: 'mochi' },
  { text: L('ไม่ต้องใช้รูปจริง แค่มีเรื่องที่ชอบสักเรื่อง', 'No real photo needed. Just one thing you love') },
  { sticker: 'tags' },
  { text: L('ก็มีเพื่อนคุยด้วยแล้ว', "and you've got someone to talk to.") },
  { sticker: 'call' },
]

interface Script {
  tokens: Token[]
  units: number
  full: string
}

// every word and sticker is one "unit" that lights up in reading order (built once per language)
const SCRIPTS: Partial<Record<Lang, Script>> = {}
function script(): Script {
  const lang = getLang()
  const cached = SCRIPTS[lang]
  if (cached) return cached
  const tokens: Token[] = []
  let units = 0
  for (const p of PARTS) {
    if ('sticker' in p) tokens.push({ sticker: p.sticker, unit: units++ })
    else for (const phrase of tx(p.text).split(' ')) tokens.push({ phrase: thaiWords(phrase).map((w) => ({ word: w, unit: units++ })) })
  }
  const full = PARTS.flatMap((p) => ('text' in p ? [tx(p.text)] : [])).join(' ')
  return (SCRIPTS[lang] = { tokens, units, full })
}

const END = 0.82
const range = (u: number, units: number): [number, number] => [(u / units) * END, ((u + 1.6) / units) * END]

function ScrubWord({ word, unit, units, progress }: { word: string; unit: number; units: number; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, range(unit, units), [0.14, 1])
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
        <span className="rounded-full bg-lavender/60 px-2.5 py-1">{t('เกมดึก', 'Night gaming')}</span>
        <span className="ml-3 rounded-full bg-pink/60 px-2.5 py-1">{t('อนิเมะ', 'Anime')}</span>
        <span className="rounded-full bg-mint/70 px-2.5 py-1">{t('คาเฟ่', 'Cafés')}</span>
      </span>
    )
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-coral shadow-[var(--shadow-puffy)]" style={{ width: size * 1.1, height: size * 1.1 }}>
      <PhoneCall size={size * 0.5} strokeWidth={2.4} className="animate-wiggle text-ink" />
    </span>
  )
}

function ScrubSticker({ kind, unit, units, progress, size }: { kind: Sticker; unit: number; units: number; progress: MotionValue<number>; size: number }) {
  const [a, b] = range(unit, units)
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
  const { tokens, units, full } = script()

  const text = (
    <p style={{ textWrap: 'wrap' }} className="mx-auto max-w-5xl text-center font-display text-[1.9rem] leading-[1.55] font-bold tracking-tight text-ink sm:text-5xl sm:leading-[1.45] lg:text-[clamp(2.9rem,4.5vw,4.5rem)] lg:leading-[1.4]">
      <span className="sr-only">{full}</span>
      <span aria-hidden>
        {tokens.map((tk, i) =>
          'sticker' in tk ? (
            reduce ? (
              <span key={i} className="mx-2 inline-block align-middle">
                <StickerArt kind={tk.sticker} size={size} />
              </span>
            ) : (
              <ScrubSticker key={i} kind={tk.sticker} unit={tk.unit} units={units} progress={scrollYProgress} size={size} />
            )
          ) : (
            <Fragment key={i}>
              <span className="whitespace-nowrap">
                {tk.phrase.map((w) => (reduce ? w.word : <ScrubWord key={w.unit} word={w.word} unit={w.unit} units={units} progress={scrollYProgress} />))}
              </span>{' '}
            </Fragment>
          ),
        )}
      </span>
    </p>
  )

  return (
    <section id="manifesto" ref={ref} aria-label={t('ที่นี่เป็นแบบไหน', "What it's like here")} className={`relative outline-none ${reduce ? 'flex min-h-[110lvh] items-center py-24' : 'h-[190vh]'}`}>
      <div className={reduce ? 'w-full px-5' : 'sticky top-0 flex h-[100svh] flex-col items-center justify-center px-5 sm:px-8'}>
        <p className="mb-6 flex items-center justify-center gap-2 font-display text-sm font-semibold text-ink-soft sm:text-base">
          <Twinkle className="size-4" color="var(--color-coral)" />
          {t('โมชิโมชิ~ ที่นี่เป็นแบบนี้นะ', "Moshi moshi~ here's the vibe")}
          <Twinkle className="size-4" />
        </p>
        {text}
        <motion.p style={{ opacity: reduce ? 1 : hintOpacity }} className="mt-10 flex items-center justify-center gap-2 text-sm font-semibold text-ink-soft sm:text-base">
          {t('เลื่อนต่อ เดี๋ยวพาไปดูว่าเจอเพื่อนกันยังไง', 'Keep scrolling to see how friends find each other')}
          <ArrowDown size={16} className={reduce ? '' : 'animate-bounce'} aria-hidden />
        </motion.p>
      </div>
    </section>
  )
}
