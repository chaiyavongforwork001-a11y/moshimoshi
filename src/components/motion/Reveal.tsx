import { motion, useReducedMotion, type Variants } from 'motion/react'
import { useMemo, type ReactNode } from 'react'
import { spring } from '@/lib/motion'

const TAGS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  aside: motion.aside,
  ul: motion.ul,
  li: motion.li,
} as const

/**
 * Fades, lifts and un-blurs its content the first time it scrolls into view.
 * Children with `hidden`/`show` variants follow along (e.g. stagger lists).
 * Ends on `filter: none` / `transform: none`, so nothing inside gets a new
 * containing block once revealed. Reduced motion: a plain fade.
 */
export function Reveal({
  as = 'div',
  children,
  className,
  delay = 0,
  y = 26,
  blur = 8,
  margin = '0px 0px -10% 0px',
  id,
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: {
  as?: keyof typeof TAGS
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  blur?: number
  /** IntersectionObserver rootMargin */
  margin?: string
  id?: string
  role?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}) {
  const reduce = useReducedMotion()
  const variants = useMemo<Variants>(
    () =>
      reduce
        ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3, delay } } }
        : {
            hidden: { opacity: 0, y, scale: 0.985, filter: `blur(${blur}px)` },
            show: {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: 'blur(0px)',
              transition: { ...spring.gentle, delay, opacity: { duration: 0.45, delay }, filter: { duration: 0.5, delay } },
              transitionEnd: { filter: 'none' },
            },
          },
    [reduce, delay, y, blur],
  )
  const Comp = TAGS[as] as typeof motion.div
  return (
    <Comp
      id={id}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      className={className}
      inherit={false}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin }}
    >
      {children}
    </Comp>
  )
}
