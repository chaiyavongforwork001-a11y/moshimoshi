import { motion, type Variants } from 'motion/react'
import { Fragment } from 'react'

// Thai vowels and tone marks must stay glued to their consonant, so split by grapheme.
const graphemeSeg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null
export const graphemes = (s: string) => (graphemeSeg ? Array.from(graphemeSeg.segment(s), (g) => g.segment) : Array.from(s))

// Thai has no spaces between words: split by dictionary words for line breaks,
// then by graphemes so vowels and tone marks stay on their consonant.
const wordSeg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'word' }) : null
export function thaiWords(s: string) {
  if (!wordSeg) return s.split(/(\s+)/).filter((w) => w.length > 0)
  const out: string[] = []
  for (const w of wordSeg.segment(s)) {
    const space = /^\s+$/.test(w.segment)
    // punctuation such as "~" "!" "…" stays glued to the word before it
    if (!w.isWordLike && !space && out.length && !/^\s+$/.test(out[out.length - 1])) out[out.length - 1] += w.segment
    else out.push(w.segment)
  }
  return out
}

/** Jelly landing: each grapheme drops in stretched and settles with a wobble. */
export const jellyChar: Variants = {
  hidden: { opacity: 0, y: '0.6em', scaleY: 1.4, scaleX: 0.7, rotate: -10 },
  show: {
    opacity: 1,
    y: 0,
    scaleY: 1,
    scaleX: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 430, damping: 13, mass: 0.75 },
  },
}

export function Graphemes({ text, variants = jellyChar }: { text: string; variants?: Variants }) {
  return graphemes(text).map((g, i) =>
    // a space stays a real space (an inline-block holding only a space collapses to nothing)
    /^\s+$/.test(g) ? (
      <Fragment key={i}>{' '}</Fragment>
    ) : (
      // no permanent will-change: hundreds of tiny layers would outlive the ~1 s entrance
      <motion.span key={i} variants={variants} className="inline-block origin-bottom">
        {g}
      </motion.span>
    ),
  )
}

/** One word that never breaks inside; spaces stay real spaces. */
export function KineticWord({ text, className = '' }: { text: string; className?: string }) {
  if (/^\s+$/.test(text)) return <> </>
  return (
    <span className={`inline-block whitespace-nowrap ${className}`}>
      <Graphemes text={text} />
    </span>
  )
}

const TAGS = { h1: motion.h1, h2: motion.h2, h3: motion.h3, p: motion.p }

/**
 * Big title whose graphemes jelly in, word-wrapped the Thai way.
 * Plays when it scrolls into view, or follows a parent's hidden/show
 * variants when `inherit` is set (e.g. inside SectionIntro or a keyed chapter).
 */
export function KineticTitle({
  text,
  as = 'h2',
  id,
  className = '',
  gap = 0.028,
  delay = 0,
  inherit = false,
}: {
  text: string
  as?: keyof typeof TAGS
  id?: string
  className?: string
  gap?: number
  delay?: number
  inherit?: boolean
}) {
  const Tag = TAGS[as]
  const phrases = text.split(' ')
  const play = inherit ? {} : { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-40px' } }
  return (
    <Tag
      id={id}
      // per-grapheme inline-blocks + text-wrap: balance can stall Chrome's line breaker
      style={{ textWrap: 'wrap' }}
      className={className}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
      {...play}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {phrases.map((ph, pi) => {
          // short phrases stay on one line (breaks fall on the spaces); long ones may break between words
          const keep = graphemes(ph).length <= 14
          const words = thaiWords(ph)
          return (
            <Fragment key={pi}>
              <span className={keep ? 'whitespace-nowrap' : undefined}>
                {words.map((w, i) => (
                  <Fragment key={i}>
                    <KineticWord text={w} />
                    {!keep && i < words.length - 1 && <wbr />}
                  </Fragment>
                ))}
              </span>
              {pi < phrases.length - 1 && ' '}
            </Fragment>
          )
        })}
      </span>
    </Tag>
  )
}
