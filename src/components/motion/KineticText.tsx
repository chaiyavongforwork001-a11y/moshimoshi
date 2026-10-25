import { motion, useReducedMotion, type Variants } from 'motion/react'
import { useMemo } from 'react'
import { stagger as staggerVariants } from '@/lib/motion'

type Tag = 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3'
type Token = { space: string } | { glyphs: string[] }

// Thai has no spaces and stacks vowels/tone marks on a base letter: split into
// dictionary words (line breaks stay between words) and grapheme clusters
// (marks never get separated from their letter).
const seg =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? { word: new Intl.Segmenter('th', { granularity: 'word' }), glyph: new Intl.Segmenter('th', { granularity: 'grapheme' }) }
    : null

function tokenize(text: string): Token[] {
  if (!seg) return [{ glyphs: [text] }]
  const out: Token[] = []
  for (const s of seg.word.segment(text)) {
    if (!s.segment.trim()) {
      out.push({ space: s.segment })
      continue
    }
    const glyphs = Array.from(seg.glyph.segment(s.segment), (g) => g.segment)
    const prev = out[out.length - 1]
    // punctuation hugs the word before it, so a line never starts with "!" or "~"
    if (!s.isWordLike && prev && 'glyphs' in prev) prev.glyphs.push(...glyphs)
    else out.push({ glyphs })
  }
  return out
}

const GLYPH: Variants = {
  hidden: { opacity: 0, y: '0.5em', scale: 0.6, rotate: -8, filter: 'blur(5px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 420, damping: 17, mass: 0.7, opacity: { duration: 0.2 }, filter: { duration: 0.3 } },
    transitionEnd: { filter: 'none' },
  },
}

/**
 * Text that pops in letter by letter (jelly spring) when it scrolls into view.
 * Grapheme-safe for Thai. The animated letters are aria-hidden; the text is
 * read once from a visually hidden copy (and from aria-label on headings).
 * Reduced motion: plain text.
 */
export function KineticText({
  text,
  as: Tag = 'span',
  className = '',
  delay = 0.05,
  stagger = 0.03,
  once = true,
}: {
  text: string
  as?: Tag
  className?: string
  delay?: number
  stagger?: number
  once?: boolean
}) {
  const reduce = useReducedMotion()
  const tokens = useMemo(() => tokenize(text), [text])
  const parent = useMemo(() => staggerVariants(stagger, delay), [stagger, delay])
  if (reduce) return <Tag className={className}>{text}</Tag>

  return (
    <Tag className={className} aria-label={Tag[0] === 'h' ? text : undefined}>
      <span className="sr-only">{text}</span>
      <motion.span aria-hidden inherit={false} variants={parent} initial="hidden" whileInView="show" viewport={{ once }}>
        {tokens.map((t, i) =>
          'space' in t ? (
            t.space
          ) : (
            <span key={i} className="inline-block whitespace-nowrap">
              {t.glyphs.map((g, j) => (
                <motion.span key={j} className="inline-block" variants={GLYPH}>
                  {g}
                </motion.span>
              ))}
            </span>
          ),
        )}
      </motion.span>
    </Tag>
  )
}
